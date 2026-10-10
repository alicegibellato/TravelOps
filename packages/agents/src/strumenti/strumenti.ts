/**
 * Gli strumenti del motore esposti agli agenti (REQ-ORCH-001 revisione 2, ST-ORCH-001B).
 *
 * Ogni strumento è uno `Strumento` del ciclo (`eseguiCiclo`): definizione con lo schema JSON rigoroso degli argomenti
 * (modalità `strict` di OpenAI) e funzione che valida gli argomenti con lo stesso schema, chiama il motore
 * (`@travelops/engine`) o la sorgente delle destinazioni (`@travelops/sources`) e restituisce un JSON compatto.
 *
 * Regole:
 * - lo stato del viaggio arriva da fuori (`ArchivioViaggio`): gli strumenti non hanno altri modi di cambiarlo, e un
 *   agente non ha altri modi di cambiare un viaggio (CA-2);
 * - nessuna chiamata di rete diretta: la rete, se c'è, passa solo dalla `SorgenteDestinazioni` iniettata (CA-5);
 * - ciò che arriva al modello viene solo dal motore e dalle istantanee: nessun luogo inventato (CA-2);
 * - un errore che il modello può correggere è un `ErroreStrumento` con un messaggio in italiano semplice.
 */
import {
  alternativeSostituzione,
  ATTIVITA_PER_RITMO,
  BUDGET,
  classificaAttivita,
  confrontaRevisioni,
  cosaManca,
  creaSorgenteDaDati,
  creaStorico,
  ErroreBozza,
  ESIGENZE,
  FORME_FISICHE,
  generaBozza,
  elencaVersioni,
  leggiVersione,
  MEZZI_PROFILO,
  OPERAZIONI_BOZZA,
  ORARI_PROFILO,
  proponiModifica,
  proponiModificaOndata2,
  proponiRipianificazione,
  RITMI,
  TESTO_ESCLUSIONE,
  TIPI_GRUPPO,
  VALORI_AMMESSI,
  validaProfilo,
  versioneCorrente,
  viaggioCorrente,
  type BozzaProfilo,
  type Catalogo,
  type CategoriaEstesa,
  type Elemento,
  type ImprevistoEsteso,
  type IstantaneaCatalogo,
  type Mezzo,
  type ModificaRichiesta,
  type OperazioneBozza,
  type Priorita,
  type ProfiloPreferenze,
  type SorgenteDatiContesto,
  type StileViaggio,
  type TipoOperazioneBozza,
  type Viaggio,
} from "@travelops/engine";
import type { AreaDestinazione, SorgenteDestinazioni } from "@travelops/sources";
import { ErroreStrumento, type ContestoStrumento, type RegistroStrumenti, type Strumento } from "../ciclo.js";
import type { ArchivioViaggio, RevisioneBozza, SchedaViaggio } from "./archivio.js";
import { creaOperatoreDaArchivio, leggiStatoBozza, type EsitoOperatoreBozza, type OperatoreBozza } from "./bozza.js";
import { TESTO_MEZZO, nomiDi, riassuntoBozza, riassuntoProposta, riassuntoViaggio, voce } from "./riassunti.js";
import { comeSchemaJson, schemaOggetto, validaArgomenti, type SchemaArgomenti, type SchemaValore } from "./schema.js";

/** I nomi degli strumenti, nell'ordine in cui sono offerti al modello. */
export const NOMI_STRUMENTI = [
  "cerca_destinazione",
  "prepara_destinazione",
  "proponi_destinazioni",
  "aggiorna_profilo",
  "genera_bozza",
  "opera_bozza",
  "cambia_preferenze_bozza",
  "conferma_viaggio",
  "proponi_modifica",
  "proponi_ripianificazione",
  "proponi_cambio_durata",
  "cerca_catalogo",
  "leggi_viaggio",
  "alternative_bozza",
  "confronta_bozza",
  "stima_spostamento",
] as const;

export type NomeStrumento = (typeof NOMI_STRUMENTI)[number];

/** Gli strumenti che possono scrivere nell'archivio; gli altri leggono soltanto. */
export const STRUMENTI_CHE_SCRIVONO: readonly NomeStrumento[] = [
  "prepara_destinazione",
  "aggiorna_profilo",
  "genera_bozza",
  "opera_bozza",
  "cambia_preferenze_bozza",
  "conferma_viaggio",
  "proponi_modifica",
  "proponi_ripianificazione",
  "proponi_cambio_durata",
];

/** Gli strumenti che preparano una proposta per il viaggio confermato. */
export const STRUMENTI_DI_PROPOSTA: readonly NomeStrumento[] = ["proponi_modifica", "proponi_ripianificazione", "proponi_cambio_durata"];

/** Dati di contesto del motore (tempi, meteo, chiusure) per un'istantanea. */
export type ContestoMotore = (istantanea: IstantaneaCatalogo) => SorgenteDatiContesto;

/** I dati di contesto predefiniti: i tempi di percorrenza dell'istantanea, senza previsioni né chiusure. */
export const contestoDaIstantanea: ContestoMotore = (istantanea) =>
  creaSorgenteDaDati({
    tempiPercorrenza: istantanea.tempiPercorrenza.map(({ da, a, mezzo, minuti }) => ({ da, a, mezzo, minuti })),
    previsioni: [],
    chiusure: [],
  });

export interface OpzioniStrumenti {
  /** Il viaggio della conversazione. */
  readonly archivio: ArchivioViaggio;
  /** La sorgente delle destinazioni: registrata nei test, reale nella web app. È l'unica strada verso la rete. */
  readonly sorgente: SorgenteDestinazioni;
  /**
   * Dati di contesto (tempi, meteo, chiusure) per un'istantanea. Predefiniti: i tempi di percorrenza dell'istantanea,
   * senza previsioni né chiusure straordinarie (come il generatore della bozza).
   */
  readonly contesto?: ContestoMotore;
  /**
   * REQ-ORCH-002 CA-2: il servizio dei percorsi di REQ-INTEG-001 (`ServiziEsterni.percorsi`, finto o reale, OSRM) per
   * tempi e distanze reali a piedi e in auto della Logistica. Senza, valgono i tempi dei dati di contesto.
   */
  readonly percorsi?: PortaPercorsi;
  /**
   * REQ-IMPR-001 CA-3: se c'è, le proposte partono solo quando restituisce vero (il viaggiatore ha confermato il
   * riepilogo dell'imprevisto). Altrimenti lo strumento risponde con l'errore che chiede di riassumere e aspettare.
   */
  readonly propostaConfermata?: () => boolean;
  /**
   * Le operazioni sulla bozza (`opera_bozza`, `cambia_preferenze_bozza`, `conferma_viaggio`). La web app passa il proprio
   * servizio della bozza, lo stesso dei pulsanti (REQ-PLAN-003 CA-3); predefinito: le funzioni del motore sull'archivio.
   */
  readonly bozza?: OperatoreBozza;
}

/** Il messaggio per il modello quando prova a preparare una proposta prima della conferma del viaggiatore. */
export const SERVE_CONFERMA =
  "Prima di preparare la proposta riassumi l'imprevisto in una frase che finisce con \"Procedo?\" e aspetta il sì del viaggiatore.";

/** Quante destinazioni e attività restituire al massimo, se il modello non lo dice. */
export const LIMITE_RISULTATI_PREDEFINITO = 5;
export const LIMITE_CATALOGO_PREDEFINITO = 10;

// --- schemi comuni ---------------------------------------------------------------------------------------------

const nullabile = (schema: SchemaValore): SchemaValore => ({
  ...schema,
  type: [...(typeof schema.type === "string" ? [schema.type] : schema.type), "null"],
  ...(schema.enum === undefined ? {} : { enum: [...schema.enum, null] }),
});

const testo = (description: string): SchemaValore => ({ type: "string", description });
const DATA: SchemaValore = { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "data AAAA-MM-GG" };
const ORARIO: SchemaValore = { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$", description: "orario HH:mm" };
const scelta = (valori: readonly string[], description: string): SchemaValore => ({ type: "string", enum: valori, description });
const elencoDi = (valori: readonly string[], description: string, minItems?: number): SchemaValore => ({
  type: "array",
  items: { type: "string", enum: valori },
  description,
  ...(minItems === undefined ? {} : { minItems }),
});
const elencoTesti = (description: string): SchemaValore => ({ type: "array", items: { type: "string" }, description });
const limite = (massimo: number): SchemaValore => ({ type: ["integer", "null"], minimum: 1, maximum: massimo, description: `quanti risultati, da 1 a ${massimo}` });

const STILI = VALORI_AMMESSI.stile;
const CATEGORIE = VALORI_AMMESSI.categoriaEstesa;
const PRIORITA = VALORI_AMMESSI.priorita;

const OPERAZIONI_CHAT = OPERAZIONI_BOZZA.filter((t) => t !== "cambia_preferenze");

const PROPRIETA_OPERA_BOZZA = {
  operazione: scelta(OPERAZIONI_CHAT, "che cosa fare sulla bozza"),
  elementoId: nullabile(testo("id dell'elemento del programma (sostituisci, rimuovi, sposta, blocca, sblocca)")),
  attivitaId: nullabile(testo("id dell'attività del catalogo (sostituisci: quella nuova; aggiungi)")),
  data: nullabile(DATA),
  conData: nullabile({ ...DATA, description: "scambia_giorni: l'altro giorno, data AAAA-MM-GG" }),
  inizio: nullabile(ORARIO),
  numero: { type: ["integer", "null"], minimum: 1, description: "torna_alla_revisione: numero della revisione (B3 = 3)" } as SchemaValore,
};

interface ArgomentiOperaBozza {
  operazione: Exclude<TipoOperazioneBozza, "cambia_preferenze">;
  elementoId: string | null;
  attivitaId: string | null;
  data: string | null;
  conData: string | null;
  inizio: string | null;
  numero: number | null;
}

const PROPRIETA_MODIFICA = {
  operazione: scelta(["aggiungi", "rimuovi", "sostituisci", "sposta", "cambia_priorita", "imposta_orario_fisso"], "che cosa fare"),
  elementoId: nullabile(testo("id dell'elemento del programma (rimuovi, sostituisci, sposta, cambia_priorita, imposta_orario_fisso)")),
  attivitaId: nullabile(testo("id dell'attività del catalogo da aggiungere (aggiungi; sostituisci: quella nuova)")),
  data: nullabile(DATA),
  inizio: nullabile(ORARIO),
  priorita: nullabile(scelta(PRIORITA, "priorità (aggiungi, facoltativa; cambia_priorita)")),
  orarioFisso: { type: ["boolean", "null"], description: "imposta_orario_fisso: vero per bloccare l'orario" } as SchemaValore,
};

interface ArgomentiModifica {
  operazione: ModificaRichiesta["operazione"] | "sostituisci";
  elementoId: string | null;
  attivitaId: string | null;
  data: string | null;
  inizio: string | null;
  priorita: Priorita | null;
  orarioFisso: boolean | null;
}

// --- supporto --------------------------------------------------------------------------------------------------

/** Uno strumento con argomenti tipizzati e validati con lo schema. */
function strumento<A>(
  nome: NomeStrumento,
  descrizione: string,
  schema: SchemaArgomenti,
  esegui: (argomenti: A, contesto: ContestoStrumento) => Promise<unknown>,
): Strumento {
  return {
    definizione: { nome, descrizione, parametri: comeSchemaJson(schema), rigoroso: true },
    esegui: (argomenti, contesto) => esegui(validaArgomenti<A>(schema, argomenti), contesto),
  };
}

const confronta = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * La porta dei percorsi che la Logistica usa: la stessa forma di `ServizioPercorsi` di `@travelops/sources`
 * (REQ-INTEG-001), così la web app passa il suo servizio così com'è.
 */
export interface PortaPercorsi {
  calcola(richiesta: {
    da: { lat: number; lon: number };
    a: { lat: number; lon: number };
    mezzo: "piedi" | "auto";
    segnale?: AbortSignal;
  }): Promise<
    | { disponibile: true; dati: { minuti: number; km: number; stimato: boolean }; origine: "finto" | "reale" }
    | { disponibile: false; messaggio: string }
  >;
}

/** Distanza in linea d'aria in km tra due coordinate (formula dell'emisenoverso). */
function distanzaKm(p: { lat: number; lon: number }, q: { lat: number; lon: number }): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(q.lat - p.lat);
  const dLon = rad(q.lon - p.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(p.lat)) * Math.cos(rad(q.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Testo normalizzato per le ricerche: minuscole, senza accenti, spazi singoli. */
function normalizza(valore: string): string {
  return valore.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

function areaInBreve(area: AreaDestinazione) {
  return { areaId: area.id, nome: area.nome, descrizione: area.descrizione };
}

const eAttivitaVera = (categoria: CategoriaEstesa): boolean => categoria !== "pasto" && categoria !== "servizio";

/**
 * Crea gli strumenti del motore per un viaggio. Il registro va passato a `eseguiCiclo` (`strumenti`).
 */
export function creaStrumentiMotore(opzioni: OpzioniStrumenti): RegistroStrumenti {
  const { archivio, sorgente } = opzioni;
  const contesti = new Map<string, SorgenteDatiContesto>();
  const contestoDi = (istantanea: IstantaneaCatalogo): SorgenteDatiContesto => {
    let trovato = contesti.get(istantanea.id);
    if (trovato === undefined) {
      trovato = (opzioni.contesto ?? contestoDaIstantanea)(istantanea);
      contesti.set(istantanea.id, trovato);
    }
    return trovato;
  };

  const operatore: OperatoreBozza =
    opzioni.bozza ??
    creaOperatoreDaArchivio({
      archivio,
      contestoDi,
      istantanea: async () => {
        try {
          return (await istantaneaDelViaggio()).istantanea;
        } catch (errore) {
          if (errore instanceof ErroreStrumento) return errore.message;
          throw errore;
        }
      },
    });

  /** REQ-IMPR-001 CA-3: nessuna proposta senza la conferma del viaggiatore, quando chi crea gli strumenti la richiede. */
  function richiediConferma(): void {
    if (opzioni.propostaConfermata !== undefined && !opzioni.propostaConfermata()) throw new ErroreStrumento(SERVE_CONFERMA);
  }

  // --- letture comuni ---

  async function scheda(): Promise<SchedaViaggio | null> {
    return await archivio.leggiScheda();
  }

  async function istantaneaDelViaggio(): Promise<{ scheda: SchedaViaggio; istantanea: IstantaneaCatalogo }> {
    const s = await scheda();
    if (s === null || s.istantaneaId === null) {
      throw new ErroreStrumento("La destinazione non è ancora pronta: prima cercala e preparala (cerca_destinazione, prepara_destinazione).");
    }
    const istantanea = await archivio.leggiIstantanea(s.istantaneaId);
    if (istantanea === null) throw new ErroreStrumento("I dati della destinazione non ci sono più: preparala di nuovo con prepara_destinazione.");
    return { scheda: s, istantanea };
  }

  async function nonConfermato(): Promise<void> {
    if ((await archivio.leggiStorico()) !== null) {
      throw new ErroreStrumento("Il viaggio è già confermato: ogni cambiamento passa da una proposta (proponi_modifica, proponi_ripianificazione).");
    }
  }

  async function profiloCompleto(istantanea: IstantaneaCatalogo): Promise<ProfiloPreferenze> {
    const bozza = (await archivio.leggiProfilo()) ?? {};
    const esito = validaProfilo(bozza, { catalogo: istantanea });
    if (!esito.ok) {
      throw new ErroreStrumento(`Il profilo non è completo: ${esito.problemi.map((p) => p.testo).join(" ")} Usa aggiorna_profilo.`);
    }
    const destinazione = esito.profilo.destinazione;
    if (destinazione.tipo === "luogo" && destinazione.riferimento !== istantanea.id) {
      throw new ErroreStrumento(
        `La destinazione del profilo (${destinazione.nome}) non è quella preparata (${istantanea.destinazione}): preparala con prepara_destinazione.`,
      );
    }
    return esito.profilo;
  }

  async function bozzaCorrente(istantanea: IstantaneaCatalogo): Promise<RevisioneBozza> {
    const revisioni = await archivio.leggiRevisioniBozza();
    const ultima = revisioni.at(-1);
    if (ultima === undefined) throw new ErroreStrumento("Non c'è ancora una bozza: generala con genera_bozza.");
    if (!eBozzaDi(ultima.viaggio, istantanea)) {
      throw new ErroreStrumento("La bozza è di un'altra destinazione: generane una nuova con genera_bozza.");
    }
    return ultima;
  }

  const idBozza = (istantanea: IstantaneaCatalogo): string => `BOZZA-${istantanea.id}`;

  /**
   * La bozza è della destinazione preparata se tutte le sue attività sono nell'istantanea. Non conta l'id del viaggio:
   * la bozza creata dai pulsanti («Crea la mia bozza») ha un altro id di quella generata dagli strumenti, ed è la stessa.
   */
  const eBozzaDi = (viaggio: Viaggio, istantanea: IstantaneaCatalogo): boolean => {
    const note = new Set(istantanea.attivita.map((a) => a.id));
    return viaggio.giorni.every((g) => g.elementi.every((e) => e.tipo !== "attivita" || note.has(e.attivitaId)));
  };

  async function salvaScheda(modifica: Partial<SchedaViaggio>): Promise<void> {
    const attuale = (await scheda()) ?? { titolo: "Nuovo viaggio", stato: "bozza" as const, destinazione: null, istantaneaId: null };
    await archivio.salvaScheda({ ...attuale, ...modifica });
  }

  function genera(profilo: ProfiloPreferenze, istantanea: IstantaneaCatalogo) {
    try {
      return generaBozza(profilo, istantanea, { idViaggio: idBozza(istantanea), sorgente: contestoDi(istantanea) });
    } catch (errore) {
      if (errore instanceof ErroreBozza) throw new ErroreStrumento(`Non riesco a costruire la bozza: ${errore.message}`);
      throw errore;
    }
  }

  function modificaDa(argomenti: ArgomentiModifica): ModificaRichiesta {
    const serve = <T>(valore: T | null, campo: string): T => {
      if (valore === null) throw new ErroreStrumento(`Per l'operazione "${argomenti.operazione}" serve "${campo}".`);
      return valore;
    };
    switch (argomenti.operazione) {
      case "sostituisci":
        throw new ErroreStrumento("«sostituisci» si prepara con proponiSostituzione.");
      case "aggiungi":
        return {
          operazione: "aggiungi",
          data: serve(argomenti.data, "data"),
          attivitaId: serve(argomenti.attivitaId, "attivitaId"),
          inizio: serve(argomenti.inizio, "inizio"),
          ...(argomenti.priorita === null ? {} : { priorita: argomenti.priorita }),
        };
      case "rimuovi":
        return { operazione: "rimuovi", elementoId: serve(argomenti.elementoId, "elementoId") };
      case "sposta":
        return {
          operazione: "sposta",
          elementoId: serve(argomenti.elementoId, "elementoId"),
          data: serve(argomenti.data, "data"),
          inizio: serve(argomenti.inizio, "inizio"),
        };
      case "cambia_priorita":
        return { operazione: "cambia_priorita", elementoId: serve(argomenti.elementoId, "elementoId"), priorita: serve(argomenti.priorita, "priorita") };
      case "imposta_orario_fisso":
        return {
          operazione: "imposta_orario_fisso",
          elementoId: serve(argomenti.elementoId, "elementoId"),
          orarioFisso: serve(argomenti.orarioFisso, "orarioFisso"),
        };
    }
  }

  function operazioneBozzaDa(argomenti: ArgomentiOperaBozza): OperazioneBozza {
    const serve = <T>(valore: T | null, campo: string): T => {
      if (valore === null) throw new ErroreStrumento(`Per l'operazione "${argomenti.operazione}" serve "${campo}".`);
      return valore;
    };
    switch (argomenti.operazione) {
      case "sostituisci":
        return { tipo: "sostituisci", elementoId: serve(argomenti.elementoId, "elementoId"), attivitaId: serve(argomenti.attivitaId, "attivitaId") };
      case "rimuovi":
      case "blocca":
      case "sblocca":
        return { tipo: argomenti.operazione, elementoId: serve(argomenti.elementoId, "elementoId") };
      case "sposta":
        return { tipo: "sposta", elementoId: serve(argomenti.elementoId, "elementoId"), data: serve(argomenti.data, "data"), inizio: serve(argomenti.inizio, "inizio") };
      case "aggiungi":
        return {
          tipo: "aggiungi",
          attivitaId: serve(argomenti.attivitaId, "attivitaId"),
          data: serve(argomenti.data, "data"),
          ...(argomenti.inizio === null ? {} : { inizio: argomenti.inizio }),
        };
      case "giornata_piu_leggera":
      case "giornata_piu_piena":
      case "rigenera_giorno":
        return { tipo: argomenti.operazione, data: serve(argomenti.data, "data") };
      case "scambia_giorni":
        return { tipo: "scambia_giorni", data: serve(argomenti.data, "data"), conData: serve(argomenti.conData, "conData") };
      case "torna_alla_revisione":
        return { tipo: "torna_alla_revisione", numero: serve(argomenti.numero, "numero") };
      case "alternativa":
      case "annulla":
        return { tipo: argomenti.operazione };
    }
  }

  function proponiModificaSu(viaggio: Viaggio, versioneBase: number, istantanea: IstantaneaCatalogo, modifica: ModificaRichiesta) {
    const esito = proponiModifica(viaggio, versioneBase, istantanea as unknown as Catalogo, contestoDi(istantanea), modifica);
    if (!esito.ok) throw new ErroreStrumento(`La modifica non si può fare: ${esito.errore.motivo}`);
    return esito.proposta;
  }

  /**
   * «Sostituisci» su un viaggio confermato (REQ-CHAT-002 CA-3): una sola proposta che toglie l'attività e mette la
   * nuova alla stessa ora dello stesso giorno. Le due modifiche le calcola il motore (prima `rimuovi`, poi `aggiungi`
   * sull'itinerario risultante); la proposta unisce i cambiamenti e porta l'itinerario finale, che il motore applica
   * all'accettazione come ogni altra proposta.
   */
  function proponiSostituzione(viaggio: Viaggio, versioneBase: number, istantanea: IstantaneaCatalogo, elementoId: string, attivitaId: string) {
    const giorno = viaggio.giorni.find((g) => g.elementi.some((e) => e.id === elementoId));
    const elemento = giorno?.elementi.find((e) => e.id === elementoId);
    if (giorno === undefined || elemento === undefined || elemento.tipo !== "attivita") {
      throw new ErroreStrumento(`"${elementoId}" non è un'attività del viaggio: usa gli id di leggi_viaggio.`);
    }
    const tolta = proponiModificaSu(viaggio, versioneBase, istantanea, { operazione: "rimuovi", elementoId });
    const messa = proponiModificaSu(tolta.itinerario, versioneBase, istantanea, { operazione: "aggiungi", data: giorno.data, attivitaId, inizio: elemento.inizio });
    return {
      ...messa,
      modifiche: {
        aggiunti: messa.modifiche.aggiunti,
        rimossi: [...tolta.modifiche.rimossi, ...messa.modifiche.rimossi],
        modificati: [...tolta.modifiche.modificati, ...messa.modifiche.modificati],
      },
      spiegazione: `${tolta.spiegazione}\n${messa.spiegazione}`,
    };
  }

  // --- gli strumenti ---

  const cercaDestinazione = strumento<{ testo: string }>(
    "cerca_destinazione",
    "Cerca una destinazione (città, lago, valle) per nome. Restituisce le aree trovate con il loro areaId, da passare a prepara_destinazione.",
    schemaOggetto({ testo: testo("il nome cercato, per esempio \"Riva del Garda\"") }),
    async ({ testo: cercato }, { segnale }) => {
      if (cercato.trim().length < 2) throw new ErroreStrumento("Scrivi almeno 2 lettere del nome della destinazione.");
      const risultati = await sorgente.cercaDestinazioni(cercato, { limite: LIMITE_RISULTATI_PREDEFINITO, ...(segnale === undefined ? {} : { segnale }) });
      const pronte = new Set((await sorgente.elencaIstantanee()).map((r) => r.area.id));
      if (risultati.length === 0) return { risultati: [], messaggio: "Non ho trovato destinazioni con questo nome." };
      return { risultati: risultati.map((a) => ({ ...areaInBreve(a), giaPronta: pronte.has(a.id) })) };
    },
  );

  const preparaDestinazione = strumento<{ areaId: string; testo: string | null }>(
    "prepara_destinazione",
    "Prepara i dati della destinazione scelta (luoghi, attività, ristoranti, tempi) e la collega al viaggio. " +
      "areaId viene da cerca_destinazione o proponi_destinazioni; testo è il nome cercato con cerca_destinazione.",
    schemaOggetto({ areaId: testo("areaId restituito da cerca_destinazione o proponi_destinazioni"), testo: nullabile(testo("il testo usato con cerca_destinazione")) }),
    async ({ areaId, testo: cercato }, { segnale }) => {
      await nonConfermato();
      const conSegnale = segnale === undefined ? {} : { segnale };
      let area = (await sorgente.elencaIstantanee()).find((r) => r.area.id === areaId)?.area;
      if (area === undefined && cercato !== null && cercato.trim().length >= 2) {
        area = (await sorgente.cercaDestinazioni(cercato, conSegnale)).find((a) => a.id === areaId);
      }
      if (area === undefined) throw new ErroreStrumento("Non trovo questa destinazione: cercala prima con cerca_destinazione e usa uno degli areaId restituiti.");

      const esito = await sorgente.costruisciIstantanea(area, conSegnale);
      if (!esito.ok) {
        return esito.motivo === "minimi_non_rispettati"
          ? { pronta: false, messaggio: esito.messaggio, alternative: esito.alternative.map(areaInBreve) }
          : { pronta: false, messaggio: esito.messaggio };
      }
      const istantanea = esito.istantanea;
      await archivio.salvaIstantanea(istantanea);
      const profilo: BozzaProfilo = { ...((await archivio.leggiProfilo()) ?? {}), destinazione: { tipo: "luogo", nome: istantanea.destinazione, riferimento: istantanea.id } };
      await archivio.salvaProfilo(profilo);
      await salvaScheda({ titolo: `Viaggio: ${istantanea.destinazione}`, destinazione: istantanea.destinazione, istantaneaId: istantanea.id });
      return {
        pronta: true,
        istantaneaId: istantanea.id,
        destinazione: istantanea.destinazione,
        attivita: istantanea.attivita.filter((a) => eAttivitaVera(a.categoria)).length,
        ristoranti: istantanea.attivita.filter((a) => a.categoria === "pasto").length,
        ...(istantanea.stiliScarsi === undefined || istantanea.stiliScarsi.length === 0 ? {} : { stiliScarsi: istantanea.stiliScarsi.map((s) => s.motivo) }),
        cosaManca: cosaManca(profilo, { catalogo: istantanea as unknown as IstantaneaCatalogo }),
      };
    },
  );

  const proponiDestinazioni = strumento<{ limite: number | null }>(
    "proponi_destinazioni",
    "Per \"sorprendimi\": propone le destinazioni disponibili ordinate da quella più adatta al profilo. Non cambia il viaggio.",
    schemaOggetto({ limite: limite(10) }),
    async ({ limite: quante }) => {
      const profilo = profiloPerPunteggio((await archivio.leggiProfilo()) ?? {});
      const perArea = new Map<string, { id: string; area: AreaDestinazione; data: string }>();
      for (const r of await sorgente.elencaIstantanee()) {
        const presente = perArea.get(r.area.id);
        if (presente === undefined || r.dataCreazione > presente.data || (r.dataCreazione === presente.data && r.id > presente.id)) {
          perArea.set(r.area.id, { id: r.id, area: r.area, data: r.dataCreazione });
        }
      }
      const posti = profilo.durata * ATTIVITA_PER_RITMO[profilo.ritmo];
      const proposte = [];
      for (const { id, area } of perArea.values()) {
        const istantanea = await sorgente.leggiIstantanea(id);
        if (istantanea === null) continue;
        const catalogo = istantanea as unknown as IstantaneaCatalogo;
        const categoria = new Map(catalogo.attivita.map((a) => [a.id, a]));
        const adatte = classificaAttivita(catalogo, profilo).candidate.filter(
          (v) => (v.punteggio ?? 0) > 0 && eAttivitaVera(categoria.get(v.attivitaId)?.categoria ?? "servizio"),
        );
        const migliori = adatte.slice(0, posti);
        proposte.push({
          areaId: area.id,
          istantaneaId: istantanea.id,
          destinazione: istantanea.destinazione,
          descrizione: area.descrizione,
          punteggio: migliori.reduce((somma, v) => somma + (v.punteggio ?? 0), 0),
          attivitaAdatte: adatte.length,
          esempi: migliori.slice(0, 3).map((v) => categoria.get(v.attivitaId)?.nome ?? v.attivitaId),
        });
      }
      proposte.sort((a, b) => b.punteggio - a.punteggio || b.attivitaAdatte - a.attivitaAdatte || confronta(a.istantaneaId, b.istantaneaId));
      return {
        destinazioni: proposte.slice(0, quante ?? LIMITE_RISULTATI_PREDEFINITO),
        nota: "Sono le destinazioni già pronte, ordinate per quanto si adattano agli stili e ai limiti del profilo. Per sceglierne una usa prepara_destinazione con il suo areaId.",
      };
    },
  );

  const aggiornaProfilo = strumento<ArgomentiProfilo>(
    "aggiorna_profilo",
    "Aggiorna le preferenze del viaggio. Ogni campo a null resta com'è; un elenco vuoto svuota il campo. " +
      "Restituisce che cosa manca ancora per generare la bozza.",
    SCHEMA_PROFILO,
    async (argomenti, { segnale }) => {
      const attuale = (await archivio.leggiProfilo()) ?? {};
      const nuova = unisciProfilo(attuale, argomenti);
      // REQ-CHAT-003 CA-1: nel profilo entra solo un luogo che la sorgente delle destinazioni conosce. Un nome che
      // non trova nulla non si salva e non crea un viaggio: il modello chiede di precisarlo.
      const luogo = nuova.destinazione;
      if (luogo?.tipo === "luogo" && luogo !== attuale.destinazione && luogo.riferimento === undefined) {
        const trovati = await sorgente.cercaDestinazioni(luogo.nome, { limite: 1, ...(segnale === undefined ? {} : { segnale }) });
        if (trovati.length === 0) {
          throw new ErroreStrumento(
            `Non trovo «${luogo.nome}» tra i luoghi che posso cercare: profilo non salvato. ` +
              "Chiedi al viaggiatore di precisare il posto (città, isola o zona) senza dire che il viaggio è pronto.",
          );
        }
      }
      const s = await scheda();
      const istantanea = s?.istantaneaId == null ? null : await archivio.leggiIstantanea(s.istantaneaId);
      const opzioniValidazione = istantanea === null ? {} : { catalogo: istantanea };
      const esito = validaProfilo(nuova, opzioniValidazione);
      const nonValidi = esito.ok ? [] : esito.problemi.filter((p) => p.tipo === "non_valido");
      if (nonValidi.length > 0) throw new ErroreStrumento(`Profilo non salvato: ${nonValidi.map((p) => p.testo).join(" ")}`);
      await archivio.salvaProfilo(nuova);
      if (s === null) await salvaScheda({ destinazione: nuova.destinazione?.tipo === "luogo" ? nuova.destinazione.nome : null });
      return {
        salvato: true,
        completo: esito.ok,
        cosaManca: esito.ok ? [] : esito.problemi.map((p) => p.testo),
        profilo: nuova,
      };
    },
  );

  const generaBozzaStrumento = strumento<Record<string, never>>(
    "genera_bozza",
    "Genera la bozza dell'itinerario dal profilo e dalla destinazione preparata. Serve un profilo completo.",
    schemaOggetto({}),
    async () => {
      await nonConfermato();
      const { istantanea } = await istantaneaDelViaggio();
      const profilo = await profiloCompleto(istantanea);
      const bozza = genera(profilo, istantanea);
      const gia = (await archivio.leggiRevisioniBozza()).length > 0;
      const revisione = await archivio.aggiungiRevisioneBozza(gia ? "Nuova bozza" : "Prima bozza", bozza.viaggio);
      await salvaScheda({ stato: "bozza" });
      return { revisione, ...riassuntoBozza(bozza, istantanea) };
    },
  );

  /** La bozza non confermata su cui lavorano le operazioni; solleva se non c'è o se il viaggio è già confermato. */
  async function bozzaDaCambiare(): Promise<{ istantanea: IstantaneaCatalogo; corrente: RevisioneBozza }> {
    await nonConfermato();
    const { istantanea } = await istantaneaDelViaggio();
    return { istantanea, corrente: await bozzaCorrente(istantanea) };
  }

  /** L'esito di un'operazione sulla bozza: la revisione nata (con la sua causa) e il programma aggiornato. */
  async function esitoOperazione(esito: EsitoOperatoreBozza, istantanea: IstantaneaCatalogo) {
    if (!esito.ok) throw new ErroreStrumento(`L'operazione non si può fare: ${esito.messaggio}`);
    const ultima = (await archivio.leggiRevisioniBozza()).at(-1);
    if (ultima === undefined) throw new ErroreStrumento("La bozza non è stata aggiornata: riprova.");
    return {
      applicata: true,
      revisione: ultima.numero,
      causa: ultima.causa,
      ...(esito.messaggio === null ? {} : { messaggio: esito.messaggio }),
      ...riassuntoViaggio(ultima.viaggio, istantanea),
    };
  }

  const operaBozza = strumento<ArgomentiOperaBozza>(
    "opera_bozza",
    "Cambia la bozza prima della conferma, con le stesse operazioni dei pulsanti: sostituisci un'attività, rimuovi, sposta, aggiungi, " +
      "blocca o sblocca (lucchetto), rendi più leggera o più piena una giornata, rigenera un giorno, scambia due giorni, " +
      "proponi un'alternativa per tutto il viaggio, annulla l'ultima modifica o torna a una revisione (Bn). Ogni operazione crea una revisione.",
    schemaOggetto(PROPRIETA_OPERA_BOZZA),
    async (argomenti) => {
      const { istantanea } = await bozzaDaCambiare();
      return await esitoOperazione(await operatore.opera(operazioneBozzaDa(argomenti)), istantanea);
    },
  );

  const cambiaPreferenzeBozza = strumento<{ ritmo: NonNullable<BozzaProfilo["ritmo"]> | null; stili: StileViaggio[] | null }>(
    "cambia_preferenze_bozza",
    "Cambia ritmo e stili del viaggio e rifà la bozza tenendo le attività bloccate (come «Cambia preferenze»). Ogni campo a null resta com'è.",
    schemaOggetto({ ritmo: nullabile(scelta(RITMI, "ritmo del viaggio")), stili: nullabile(elencoDi(STILI, "stili di viaggio")) }),
    async ({ ritmo, stili }) => {
      if (ritmo === null && (stili === null || stili.length === 0)) throw new ErroreStrumento("Indica almeno il ritmo o gli stili da cambiare.");
      const { istantanea } = await bozzaDaCambiare();
      const cambio = { ...(ritmo === null ? {} : { ritmo }), ...(stili === null ? {} : { stili }) };
      return await esitoOperazione(await operatore.cambiaPreferenze(cambio), istantanea);
    },
  );

  const alternativeBozza = strumento<{ elementoId: string }>(
    "alternative_bozza",
    "Per «sostituisci»: le migliori alternative che entrano nello stesso giorno al posto di un'attività della bozza. Non cambia nulla.",
    schemaOggetto({ elementoId: testo("id dell'elemento del programma da sostituire") }),
    async ({ elementoId }) => {
      const { istantanea } = await bozzaDaCambiare();
      const letta = await leggiStatoBozza(archivio, istantanea, contestoDi);
      if (typeof letta === "string") throw new ErroreStrumento(letta);
      const alternative = alternativeSostituzione(letta.stato, letta.contesto, elementoId).map(({ attivitaId, nome }) => ({ attivitaId, nome }));
      if (alternative.length === 0) return { alternative, messaggio: "Per questa attività non ci sono alternative adatte nello stesso giorno." };
      return { alternative };
    },
  );

  const confrontaBozza = strumento<{ da: number; a: number }>(
    "confronta_bozza",
    "Confronta due revisioni della bozza (B1, B2, …) e dice che cosa è stato aggiunto, tolto o cambiato. Non cambia nulla.",
    schemaOggetto({ da: { type: "integer", minimum: 1, description: "numero della prima revisione" }, a: { type: "integer", minimum: 1, description: "numero della seconda revisione" } }),
    async ({ da, a }) => {
      const { istantanea } = await istantaneaDelViaggio();
      const letta = await leggiStatoBozza(archivio, istantanea, contestoDi);
      if (typeof letta === "string") throw new ErroreStrumento(letta);
      const differenza = confrontaRevisioni(letta.stato, da, a);
      if (differenza === null) {
        throw new ErroreStrumento(`Le revisioni vanno da B1 a B${letta.stato.revisioni.length}: B${da} o B${a} non esiste.`);
      }
      const nomi = nomiDi(istantanea);
      const conData = (v: { data: string; elemento: Elemento }) => ({ data: v.data, ...voce(v.elemento, nomi) });
      return {
        da,
        a,
        aggiunti: differenza.aggiunti.map(conData),
        rimossi: differenza.rimossi.map(conData),
        modificati: differenza.modificati.map((m) => ({ prima: conData(m.prima), dopo: conData(m.dopo) })),
      };
    },
  );

  const confermaViaggio = strumento<Record<string, never>>(
    "conferma_viaggio",
    "Conferma la bozza corrente: diventa la versione 1 del viaggio. Da quel momento ogni cambiamento passa da una proposta. Prima riassumi la bozza al viaggiatore.",
    schemaOggetto({}),
    async () => {
      const { corrente } = await bozzaDaCambiare();
      const esito = await operatore.conferma();
      if (!esito.ok) throw new ErroreStrumento(`Non riesco a confermare la bozza: ${esito.messaggio}`);
      const storico = await archivio.leggiStorico();
      if (storico === null) throw new ErroreStrumento("La conferma non è stata salvata: riprova.");
      const versione = versioneCorrente(storico);
      return {
        confermato: true,
        versione: versione.numero,
        causa: versione.causa,
        daRevisione: corrente.numero,
        messaggio: "Il viaggio è confermato. TravelOps non prenota nulla: le prenotazioni restano al viaggiatore.",
      };
    },
  );

  const proponiModificaStrumento = strumento<ArgomentiModifica>(
    "proponi_modifica",
    "Per un viaggio confermato: prepara la proposta di una modifica (aggiungi, rimuovi, sostituisci un'attività con un'altra, sposta, cambia priorità, blocca l'orario). " +
      "Il viaggio cambia solo quando il viaggiatore accetta la proposta.",
    schemaOggetto(PROPRIETA_MODIFICA),
    async (argomenti) => {
      richiediConferma();
      const storico = await archivio.leggiStorico();
      if (storico === null) throw new ErroreStrumento("Il viaggio non è ancora confermato: per cambiare la bozza usa opera_bozza.");
      const { istantanea } = await istantaneaDelViaggio();
      const viaggio = viaggioCorrente(storico);
      const numeroVersione = versioneCorrente(storico).numero;
      const proposta =
        argomenti.operazione === "sostituisci"
          ? proponiSostituzione(
              viaggio,
              numeroVersione,
              istantanea,
              argomenti.elementoId ?? (() => { throw new ErroreStrumento("Per «sostituisci» serve \"elementoId\"."); })(),
              argomenti.attivitaId ?? (() => { throw new ErroreStrumento("Per «sostituisci» serve \"attivitaId\"."); })(),
            )
          : proponiModificaSu(viaggio, numeroVersione, istantanea, modificaDa(argomenti));
      const numero = await archivio.salvaProposta("modifica", proposta);
      return riassuntoProposta(numero, proposta, istantanea);
    },
  );

  const proponiRipianificazioneStrumento = strumento<ArgomentiImprevisto>(
    "proponi_ripianificazione",
    "Per un viaggio confermato: prepara la proposta di ripianificazione per un imprevisto (meteo avverso, ritardo, chiusura di un luogo, " +
      "cancellazione di uno spostamento, volo o treno perso, salute, sciopero, bagaglio o documenti smarriti, stanchezza). " +
      "Il viaggio cambia solo quando il viaggiatore accetta la proposta.",
    SCHEMA_IMPREVISTO,
    async (argomenti) => {
      richiediConferma();
      const storico = await archivio.leggiStorico();
      if (storico === null) throw new ErroreStrumento("Il viaggio non è ancora confermato: non c'è nulla da ripianificare.");
      const { istantanea } = await istantaneaDelViaggio();
      const viaggio = viaggioCorrente(storico);
      const imprevisto = imprevistoDa(argomenti, viaggio, istantanea);
      const proposta = proponiRipianificazione(viaggio, versioneCorrente(storico).numero, istantanea as unknown as Catalogo, contestoDi(istantanea), imprevisto);
      const numero = await archivio.salvaProposta("ripianificazione", proposta);
      return riassuntoProposta(numero, proposta, istantanea);
    },
  );

  const proponiCambioDurata = strumento<ArgomentiCambioDurata>(
    "proponi_cambio_durata",
    "Per un viaggio confermato: prepara la proposta di restare più giorni (prolunga) o di tornare prima (accorcia). " +
      "Il viaggio cambia solo quando il viaggiatore accetta la proposta.",
    SCHEMA_CAMBIO_DURATA,
    async (argomenti) => {
      richiediConferma();
      const storico = await archivio.leggiStorico();
      if (storico === null) throw new ErroreStrumento("Il viaggio non è ancora confermato: per cambiare le date usa aggiorna_profilo e genera_bozza.");
      const { istantanea } = await istantaneaDelViaggio();
      const viaggio = viaggioCorrente(storico);
      const modifica =
        argomenti.operazione === "prolunga"
          ? { operazione: "prolunga" as const, dopo: argomenti.dopo ?? viaggio.dataFine, giorni: argomenti.giorni }
          : { operazione: "accorcia" as const, giorni: argomenti.giorni };
      const esito = proponiModificaOndata2(viaggio, versioneCorrente(storico).numero, istantanea as unknown as Catalogo, contestoDi(istantanea), modifica);
      if (!esito.ok) throw new ErroreStrumento(`Non si può: ${esito.errore.motivo}.`);
      const numero = await archivio.salvaProposta("modifica", esito.proposta);
      return riassuntoProposta(numero, esito.proposta, istantanea);
    },
  );

  const cercaCatalogo = strumento<{ testo: string | null; stile: StileViaggio | null; categoria: CategoriaEstesa | null; limite: number | null }>(
    "cerca_catalogo",
    "Cerca tra le attività e i ristoranti della destinazione del viaggio, per nome, stile o categoria. Con il profilo dice quali sono adatte e perché.",
    schemaOggetto({
      testo: nullabile(testo("parte del nome o della descrizione")),
      stile: nullabile(scelta(STILI, "stile di viaggio")),
      categoria: nullabile(scelta(CATEGORIE, "categoria (pasto = ristoranti)")),
      limite: limite(25),
    }),
    async ({ testo: cercato, stile, categoria, limite: quante }) => {
      const { istantanea } = await istantaneaDelViaggio();
      const esitoProfilo = validaProfilo((await archivio.leggiProfilo()) ?? {}, { catalogo: istantanea });
      const valutazioni = esitoProfilo.ok
        ? new Map([...classificaAttivita(istantanea, esitoProfilo.profilo).candidate, ...classificaAttivita(istantanea, esitoProfilo.profilo).escluse].map((v) => [v.attivitaId, v]))
        : null;
      const luoghi = new Map(istantanea.luoghi.map((l) => [l.id, l]));
      const filtro = cercato === null ? "" : normalizza(cercato);
      const trovate = istantanea.attivita
        .filter((a) => categoria === null ? a.categoria !== "servizio" : a.categoria === categoria)
        .filter((a) => stile === null || (a.stili ?? []).includes(stile))
        .filter((a) => filtro === "" || normalizza(`${a.nome} ${a.descrizioneBreve ?? ""}`).includes(filtro))
        .map((a) => ({ a, v: valutazioni?.get(a.id) }))
        .sort((x, y) => {
          const px = x.v === undefined || x.v.esclusa ? -Infinity : (x.v.punteggio ?? 0);
          const py = y.v === undefined || y.v.esclusa ? -Infinity : (y.v.punteggio ?? 0);
          return py - px || confronta(x.a.nome, y.a.nome) || confronta(x.a.id, y.a.id);
        });
      const massimo = quante ?? LIMITE_CATALOGO_PREDEFINITO;
      return {
        trovate: trovate.length,
        attivita: trovate.slice(0, massimo).map(({ a, v }) => {
          const luogo = luoghi.get(a.luogoId);
          return {
            attivitaId: a.id,
            nome: a.nome,
            categoria: a.categoria,
            ...(a.stili === undefined ? {} : { stili: a.stili }),
            durataMinuti: a.durataTipica,
            ...(a.costo === undefined ? {} : { costo: a.costo }),
            ...(a.descrizioneBreve === undefined ? {} : { descrizione: a.descrizioneBreve }),
            luogo: luogo?.nome ?? a.luogoId,
            luogoId: a.luogoId,
            zonaId: luogo?.zonaId ?? null,
            ...(v === undefined ? {} : v.esclusa ? { adatta: false, perche: v.esclusioni.map((m) => TESTO_ESCLUSIONE[m]) } : { adatta: true, punteggio: v.punteggio }),
          };
        }),
      };
    },
  );

  /**
   * Logistica (REQ-ORCH-002 CA-2): tempi, mezzi e distanze tra due luoghi della destinazione. I tempi vengono dai dati
   * di contesto del motore (`ContestoMotore`: i tempi dell'istantanea o gli adattatori reali di REQ-INTEG-001), la
   * distanza in linea d'aria dalle coordinate dei luoghi. Non cambia nulla.
   */
  const stimaSpostamento = strumento<{ da: string; a: string; mezzo: Mezzo | null }>(
    "stima_spostamento",
    "Stima tempi, mezzi e distanza tra due luoghi della destinazione (nome o id del luogo, da leggi_viaggio o cerca_catalogo). " +
      "Con un mezzo indicato dà il tempo con quel mezzo; senza, il mezzo più veloce e i tempi con gli altri mezzi. Non cambia nulla.",
    schemaOggetto({
      da: testo("luogo di partenza: nome o id"),
      a: testo("luogo di arrivo: nome o id"),
      mezzo: nullabile(scelta(["piedi", "mezzi_pubblici", "treno", "auto"], "mezzo, se il viaggiatore lo indica")),
    }),
    async ({ da, a, mezzo }) => {
      const { istantanea } = await istantaneaDelViaggio();
      const trova = (cercato: string) => {
        const n = normalizza(cercato);
        const luogo =
          istantanea.luoghi.find((l) => l.id === cercato) ??
          istantanea.luoghi.find((l) => normalizza(l.nome) === n) ??
          istantanea.luoghi.find((l) => normalizza(l.nome).includes(n) || n.includes(normalizza(l.nome)));
        if (luogo === undefined) throw new ErroreStrumento(`Il luogo "${cercato}" non è nella destinazione: usa i nomi di leggi_viaggio o cerca_catalogo.`);
        return luogo;
      };
      const partenza = trova(da);
      const arrivo = trova(a);
      const contesto = contestoDi(istantanea);
      const tempi = (["piedi", "mezzi_pubblici", "treno", "auto"] as const).flatMap((m) => {
        const minuti = contesto.tempoPercorrenza(partenza.id, arrivo.id, m);
        return minuti === null ? [] : [{ mezzo: TESTO_MEZZO[m], minuti }];
      });
      const migliore = mezzo === null ? contesto.percorsoPiuVeloce(partenza.id, arrivo.id) : null;
      const scelto = mezzo === null ? null : contesto.tempoPercorrenza(partenza.id, arrivo.id, mezzo);
      const c1 = partenza.coordinate;
      const c2 = arrivo.coordinate;
      const km = c1 === undefined || c2 === undefined ? null : Math.round(distanzaKm(c1, c2) * 10) / 10;
      // REQ-INTEG-001: con il servizio dei percorsi, tempi e chilometri su strada a piedi e in auto.
      const suStrada =
        opzioni.percorsi === undefined || c1 === undefined || c2 === undefined
          ? []
          : (
              await Promise.all(
                (["piedi", "auto"] as const)
                  .filter((m) => mezzo === null || mezzo === m)
                  .map(async (m) => {
                    const esito = await opzioni.percorsi!.calcola({ da: c1, a: c2, mezzo: m });
                    return esito.disponibile
                      ? [{ mezzo: TESTO_MEZZO[m], minuti: esito.dati.minuti, km: esito.dati.km, ...(esito.dati.stimato ? { stima: true } : {}) }]
                      : [];
                  }),
              )
            ).flat();
      return {
        da: partenza.nome,
        a: arrivo.nome,
        ...(km === null ? {} : { distanzaKmLineaDAria: km }),
        ...(suStrada.length === 0 ? {} : { suStrada }),
        ...(mezzo === null
          ? { piuVeloce: migliore === null ? null : { mezzo: TESTO_MEZZO[migliore.mezzo], minuti: migliore.minuti } }
          : { mezzo: TESTO_MEZZO[mezzo], minuti: scelto }),
        tempi,
        ...(tempi.length === 0 && suStrada.length === 0 ? { nota: "Nessun tempo di percorrenza noto tra questi due luoghi: dillo al viaggiatore, non inventarlo." } : {}),
      };
    },
  );

  const leggiViaggio = strumento<{ versione: number | null }>(
    "leggi_viaggio",
    "Legge il viaggio: stato, profilo e cosa manca, la bozza o la versione corrente con il programma giorno per giorno, l'elenco delle versioni e le zone della destinazione.",
    schemaOggetto({ versione: { type: ["integer", "null"], minimum: 1, description: "numero della versione da leggere; null per la corrente" } }),
    async ({ versione }) => {
      const s = await scheda();
      if (s === null) {
        // REQ-CHAT-002 CA-1: le preferenze raccolte con i filtri (profilo condiviso) ci sono anche prima del viaggio.
        const raccolto = await archivio.leggiProfilo();
        if (raccolto !== null && Object.keys(raccolto).length > 0) {
          return {
            esiste: false,
            profilo: raccolto,
            cosaManca: cosaManca(raccolto, {}),
            messaggio:
              "Il viaggio non è ancora iniziato, ma le preferenze sono già raccolte (filtri o chat): non chiederle di nuovo. " +
              "Cerca e prepara la destinazione del profilo, poi crea la bozza con genera_bozza.",
          };
        }
        return { esiste: false, messaggio: "Il viaggio non è ancora iniziato: raccogli le preferenze con aggiorna_profilo." };
      }
      const profilo = (await archivio.leggiProfilo()) ?? {};
      const istantanea = s.istantaneaId === null ? null : await archivio.leggiIstantanea(s.istantaneaId);
      const base = {
        esiste: true,
        stato: s.stato,
        destinazione: s.destinazione,
        profilo,
        cosaManca: cosaManca(profilo, istantanea === null ? {} : { catalogo: istantanea }),
        ...(istantanea === null ? {} : { zone: istantanea.zone.map((z) => ({ zonaId: z.id, nome: z.nome })) }),
      };
      const storico = await archivio.leggiStorico();
      if (storico !== null && istantanea !== null) {
        const numero = versione ?? versioneCorrente(storico).numero;
        const letta = leggiVersione(storico, numero);
        if (!letta.ok) throw new ErroreStrumento(`La versione ${numero} non esiste: le versioni vanno da 1 a ${storico.versioni.length}.`);
        return {
          ...base,
          versioni: elencaVersioni(storico).map((v) => ({ numero: v.numero, causa: v.causa, ...(v.momento === null ? {} : { momento: `${v.momento.data} ${v.momento.ora}` }), ...(v.autore === null ? {} : { autore: v.autore }) })),
          versioneMostrata: numero,
          viaggio: riassuntoViaggio(letta.viaggio, istantanea),
        };
      }
      if (versione !== null) throw new ErroreStrumento("Il viaggio non è ancora confermato: non ha versioni.");
      const revisioni = await archivio.leggiRevisioniBozza();
      const ultima = revisioni.at(-1);
      if (ultima === undefined || istantanea === null || !eBozzaDi(ultima.viaggio, istantanea)) return base;
      return {
        ...base,
        revisioniBozza: revisioni.map((r) => ({ revisione: r.numero, causa: r.causa })),
        bozza: { revisione: ultima.numero, ...riassuntoViaggio(ultima.viaggio, istantanea) },
      };
    },
  );

  return [
    cercaDestinazione,
    preparaDestinazione,
    proponiDestinazioni,
    aggiornaProfilo,
    generaBozzaStrumento,
    operaBozza,
    cambiaPreferenzeBozza,
    confermaViaggio,
    proponiModificaStrumento,
    proponiRipianificazioneStrumento,
    proponiCambioDurata,
    cercaCatalogo,
    leggiViaggio,
    alternativeBozza,
    confrontaBozza,
    stimaSpostamento,
  ];
}

// --- profilo ---------------------------------------------------------------------------------------------------

export interface ArgomentiProfilo {
  destinazione: { tipo: "luogo" | "sorprendimi"; nome: string | null } | null;
  date: { tipo: "precise" | "mese"; inizio: string | null; fine: string | null; mese: string | null } | null;
  durata: number | null;
  adulti: number | null;
  bambini: number[] | null;
  tipoGruppo: NonNullable<BozzaProfilo["tipoGruppo"]> | null;
  stili: StileViaggio[] | null;
  ritmo: NonNullable<BozzaProfilo["ritmo"]> | null;
  formaFisica: NonNullable<BozzaProfilo["formaFisica"]> | null;
  budget: NonNullable<BozzaProfilo["budget"]> | null;
  orari: NonNullable<BozzaProfilo["orari"]> | null;
  pranzo: boolean | null;
  cena: boolean | null;
  mezzi: NonNullable<BozzaProfilo["mezzi"]> | null;
  irrinunciabiliAttivita: string[] | null;
  irrinunciabiliStili: StileViaggio[] | null;
  daEvitareAttivita: string[] | null;
  daEvitareCategorie: CategoriaEstesa[] | null;
  daEvitareStili: StileViaggio[] | null;
  esigenze: NonNullable<BozzaProfilo["esigenze"]> | null;
}

const SCHEMA_PROFILO = schemaOggetto({
  destinazione: {
    type: ["object", "null"],
    description: "dove: un luogo per nome, oppure sorprendimi",
    properties: { tipo: scelta(["luogo", "sorprendimi"], "luogo o sorprendimi"), nome: nullabile(testo("nome del luogo (con tipo luogo)")) },
    required: ["tipo", "nome"],
    additionalProperties: false,
  },
  date: {
    type: ["object", "null"],
    description: "quando: date precise (inizio e fine compresi) oppure un mese",
    properties: {
      tipo: scelta(["precise", "mese"], "precise o mese"),
      inizio: nullabile(DATA),
      fine: nullabile(DATA),
      mese: nullabile({ type: "string", pattern: "^\\d{4}-\\d{2}$", description: "mese AAAA-MM" }),
    },
    required: ["tipo", "inizio", "fine", "mese"],
    additionalProperties: false,
  },
  durata: { type: ["integer", "null"], minimum: 2, maximum: 14, description: "giorni, da 2 a 14 (con le date precise si ricava dalle date)" },
  adulti: { type: ["integer", "null"], minimum: 1, maximum: 20, description: "numero di adulti" },
  bambini: { type: ["array", "null"], items: { type: "integer", minimum: 0, maximum: 17 }, description: "età di ogni bambino; [] se nessuno" },
  tipoGruppo: nullabile(scelta(TIPI_GRUPPO, "tipo di gruppo")),
  stili: nullabile(elencoDi(STILI, "stili di viaggio preferiti", 1)),
  ritmo: nullabile(scelta(RITMI, "lento 2, bilanciato 3, intenso 4 attività al giorno")),
  formaFisica: nullabile(scelta(FORME_FISICHE, "fatica massima accettata")),
  budget: nullabile(scelta(BUDGET, "fascia di spesa")),
  orari: nullabile(scelta(ORARI_PROFILO, "mattiniero, normale o nottambulo")),
  pranzo: { type: ["boolean", "null"], description: "pranzo nel programma" },
  cena: { type: ["boolean", "null"], description: "cena nel programma" },
  mezzi: nullabile(elencoDi(MEZZI_PROFILO, "mezzi accettati", 1)),
  irrinunciabiliAttivita: nullabile(elencoTesti("id di attività del catalogo da non perdere")),
  irrinunciabiliStili: nullabile(elencoDi(STILI, "stili da non perdere")),
  daEvitareAttivita: nullabile(elencoTesti("id di attività del catalogo da evitare")),
  daEvitareCategorie: nullabile(elencoDi(CATEGORIE, "categorie da evitare")),
  daEvitareStili: nullabile(elencoDi(STILI, "stili da evitare")),
  esigenze: nullabile(elencoDi(ESIGENZE, "esigenze particolari")),
});

/** Unisce gli argomenti di `aggiorna_profilo` al profilo salvato: i campi `null` restano com'erano. */
export function unisciProfilo(attuale: BozzaProfilo, a: ArgomentiProfilo): BozzaProfilo {
  const nuova: BozzaProfilo = structuredClone(attuale);
  if (a.destinazione !== null) {
    if (a.destinazione.tipo === "sorprendimi") nuova.destinazione = { tipo: "sorprendimi" };
    else {
      const nome = a.destinazione.nome?.trim() ?? "";
      if (nome === "") throw new ErroreStrumento("Per una destinazione di tipo \"luogo\" serve il nome.");
      const prima = attuale.destinazione;
      // Lo stesso luogo tiene l'istantanea preparata; un luogo diverso va preparato di nuovo.
      nuova.destinazione =
        prima?.tipo === "luogo" && prima.riferimento !== undefined && normalizza(prima.nome) === normalizza(nome)
          ? prima
          : { tipo: "luogo", nome };
    }
  }
  if (a.date !== null) {
    if (a.date.tipo === "precise") {
      if (a.date.inizio === null || a.date.fine === null) throw new ErroreStrumento("Con date precise servono inizio e fine.");
      nuova.date = { tipo: "precise", inizio: a.date.inizio, fine: a.date.fine };
    } else {
      if (a.date.mese === null) throw new ErroreStrumento("Con le date per mese serve il mese (AAAA-MM).");
      nuova.date = { tipo: "mese", mese: a.date.mese };
    }
  }
  if (a.durata !== null) nuova.durata = a.durata;
  if (a.adulti !== null || a.bambini !== null) {
    nuova.viaggiatori = {
      ...nuova.viaggiatori,
      ...(a.adulti === null ? {} : { adulti: a.adulti }),
      ...(a.bambini === null ? {} : { bambini: a.bambini }),
    };
  }
  if (a.tipoGruppo !== null) nuova.tipoGruppo = a.tipoGruppo;
  if (a.stili !== null) nuova.stili = a.stili;
  if (a.ritmo !== null) nuova.ritmo = a.ritmo;
  if (a.formaFisica !== null) nuova.formaFisica = a.formaFisica;
  if (a.budget !== null) nuova.budget = a.budget;
  if (a.orari !== null) nuova.orari = a.orari;
  if (a.pranzo !== null || a.cena !== null) {
    nuova.pasti = { ...nuova.pasti, ...(a.pranzo === null ? {} : { pranzo: a.pranzo }), ...(a.cena === null ? {} : { cena: a.cena }) };
  }
  if (a.mezzi !== null) nuova.mezzi = a.mezzi;
  if (a.irrinunciabiliAttivita !== null || a.irrinunciabiliStili !== null) {
    nuova.irrinunciabili = {
      ...nuova.irrinunciabili,
      ...(a.irrinunciabiliAttivita === null ? {} : { attivita: a.irrinunciabiliAttivita }),
      ...(a.irrinunciabiliStili === null ? {} : { stili: a.irrinunciabiliStili }),
    };
  }
  if (a.daEvitareAttivita !== null || a.daEvitareCategorie !== null || a.daEvitareStili !== null) {
    nuova.daEvitare = {
      ...nuova.daEvitare,
      ...(a.daEvitareAttivita === null ? {} : { attivita: a.daEvitareAttivita }),
      ...(a.daEvitareCategorie === null ? {} : { categorie: a.daEvitareCategorie }),
      ...(a.daEvitareStili === null ? {} : { stili: a.daEvitareStili }),
    };
  }
  if (a.esigenze !== null) nuova.esigenze = a.esigenze;
  return nuova;
}

/**
 * Il profilo con cui ordinare le destinazioni di "sorprendimi": quello raccolto, con destinazione "sorprendimi" e,
 * se mancano, date e durata segnaposto (il punteggio della §7.7 non le usa). Se il profilo non è valido, i predefiniti.
 */
function profiloPerPunteggio(bozza: BozzaProfilo): ProfiloPreferenze {
  const segnaposto: BozzaProfilo = { date: { tipo: "mese", mese: "2026-01" }, durata: 3 };
  const conDate = bozza.date === undefined ? segnaposto : bozza.date.tipo === "mese" && bozza.durata === undefined ? { date: bozza.date, durata: 3 } : {};
  const esito = validaProfilo({ ...bozza, ...conDate, destinazione: { tipo: "sorprendimi" } });
  if (esito.ok) return esito.profilo;
  const predefinito = validaProfilo({ ...segnaposto, destinazione: { tipo: "sorprendimi" } });
  if (!predefinito.ok) throw new Error("profilo predefinito non valido");
  return predefinito.profilo;
}

// --- imprevisti ------------------------------------------------------------------------------------------------

export const TIPI_IMPREVISTO = [
  "METEO_AVVERSO",
  "RITARDO",
  "CHIUSURA_LUOGO",
  "CANCELLAZIONE_SPOSTAMENTO",
  "VOLO_PERSO",
  "SALUTE",
  "SCIOPERO",
  "BAGAGLIO_SMARRITO",
  "DOCUMENTI_SMARRITI",
  "STANCHEZZA",
] as const satisfies readonly ImprevistoEsteso["tipo"][];

export interface ArgomentiImprevisto {
  tipo: ImprevistoEsteso["tipo"];
  data: string | null;
  inizio: string | null;
  fine: string | null;
  zonaId: string | null;
  condizione: "pioggia" | "temporale" | "neve" | null;
  momento: string | null;
  minuti: number | null;
  motivo: string | null;
  luogoId: string | null;
  elementoId: string | null;
  arrivoData: string | null;
  arrivoOrario: string | null;
  giorni: number | null;
  intensitaMassima: "facile" | "moderata" | "impegnativa" | "nessuna" | null;
  mobilitaRidotta: boolean | null;
  descrizione: string | null;
  mezzo: "mezzi_pubblici" | "treno" | null;
}

const SCHEMA_IMPREVISTO = schemaOggetto({
  tipo: scelta(TIPI_IMPREVISTO, "tipo di imprevisto"),
  data: nullabile({ ...DATA, description: "giorno dell'imprevisto AAAA-MM-GG (meteo, ritardo, chiusura, sciopero, bagaglio, documenti, stanchezza; salute: primo giorno)" }),
  inizio: nullabile({ ...ORARIO, description: "inizio HH:mm (meteo, chiusura)" }),
  fine: nullabile({ ...ORARIO, description: "fine HH:mm (meteo, chiusura)" }),
  zonaId: nullabile(testo("zona colpita dal meteo (zonaId da leggi_viaggio)")),
  condizione: nullabile(scelta(["pioggia", "temporale", "neve"], "condizione meteo")),
  momento: nullabile({ ...ORARIO, description: "da che ora vale il ritardo HH:mm" }),
  minuti: { type: ["integer", "null"], minimum: 1, maximum: 1440, description: "minuti di ritardo" },
  motivo: nullabile(testo("motivo del ritardo, in breve")),
  luogoId: nullabile(testo("luogo chiuso (luogoId da leggi_viaggio o cerca_catalogo)")),
  elementoId: nullabile(testo("spostamento cancellato o perso (id dell'elemento, da leggi_viaggio)")),
  arrivoData: nullabile({ ...DATA, description: "volo perso: giorno di arrivo previsto con il nuovo mezzo (facoltativo)" }),
  arrivoOrario: nullabile({ ...ORARIO, description: "volo perso: ora di arrivo prevista con il nuovo mezzo (facoltativo)" }),
  giorni: { type: ["integer", "null"], minimum: 1, maximum: 30, description: "salute: per quanti giorni (null = fino alla fine del viaggio)" },
  intensitaMassima: nullabile(scelta(["facile", "moderata", "impegnativa", "nessuna"], "salute: intensità massima consentita (nessuna = riposo)")),
  mobilitaRidotta: { type: ["boolean", "null"], description: "salute: vero se serve evitare scale e salite" } as SchemaValore,
  descrizione: nullabile(testo("salute: il problema in breve, con le parole del viaggiatore")),
  mezzo: nullabile(scelta(["mezzi_pubblici", "treno"], "sciopero: mezzo colpito")),
});

/** L'imprevisto strutturato dagli argomenti, con i controlli sul viaggio e sulla destinazione (anche per la web app). */
export function costruisciImprevisto(a: ArgomentiImprevisto, viaggio: Viaggio, istantanea: IstantaneaCatalogo): ImprevistoEsteso {
  return imprevistoDa(a, viaggio, istantanea);
}

function imprevistoDa(a: ArgomentiImprevisto, viaggio: Viaggio, istantanea: IstantaneaCatalogo): ImprevistoEsteso {
  const serve = <T>(valore: T | null, campo: string): T => {
    if (valore === null) throw new ErroreStrumento(`Per l'imprevisto ${a.tipo} serve "${campo}".`);
    return valore;
  };
  const giornoDelViaggio = (data: string): string => {
    if (!viaggio.giorni.some((g) => g.data === data)) throw new ErroreStrumento(`Il ${data} non è un giorno del viaggio (dal ${viaggio.dataInizio} al ${viaggio.dataFine}).`);
    return data;
  };
  switch (a.tipo) {
    case "METEO_AVVERSO": {
      const zonaId = serve(a.zonaId, "zonaId");
      if (!istantanea.zone.some((z) => z.id === zonaId)) throw new ErroreStrumento(`La zona "${zonaId}" non esiste: usa uno degli zonaId di leggi_viaggio.`);
      return {
        tipo: "METEO_AVVERSO",
        zonaId,
        data: giornoDelViaggio(serve(a.data, "data")),
        inizio: serve(a.inizio, "inizio"),
        fine: serve(a.fine, "fine"),
        condizione: serve(a.condizione, "condizione"),
      };
    }
    case "RITARDO":
      return {
        tipo: "RITARDO",
        data: giornoDelViaggio(serve(a.data, "data")),
        momento: serve(a.momento, "momento"),
        minuti: serve(a.minuti, "minuti"),
        motivo: a.motivo ?? "",
      };
    case "CHIUSURA_LUOGO": {
      const luogoId = serve(a.luogoId, "luogoId");
      if (!istantanea.luoghi.some((l) => l.id === luogoId)) throw new ErroreStrumento(`Il luogo "${luogoId}" non esiste nella destinazione.`);
      return {
        tipo: "CHIUSURA_LUOGO",
        luogoId,
        data: giornoDelViaggio(serve(a.data, "data")),
        inizio: serve(a.inizio, "inizio"),
        fine: serve(a.fine, "fine"),
      };
    }
    case "CANCELLAZIONE_SPOSTAMENTO": {
      const elementoId = serve(a.elementoId, "elementoId");
      const elemento = viaggio.giorni.flatMap((g) => g.elementi).find((e) => e.id === elementoId);
      if (elemento === undefined || elemento.tipo !== "spostamento") throw new ErroreStrumento(`"${elementoId}" non è uno spostamento del viaggio.`);
      return { tipo: "CANCELLAZIONE_SPOSTAMENTO", elementoId };
    }
    case "VOLO_PERSO": {
      const elementoId = serve(a.elementoId, "elementoId");
      const elemento = viaggio.giorni.flatMap((g) => g.elementi).find((e) => e.id === elementoId);
      if (elemento === undefined || elemento.tipo !== "spostamento") throw new ErroreStrumento(`"${elementoId}" non è uno spostamento del viaggio.`);
      if ((a.arrivoData === null) !== (a.arrivoOrario === null)) throw new ErroreStrumento("Per l'arrivo previsto servono sia arrivoData sia arrivoOrario, oppure nessuno dei due.");
      return a.arrivoData === null || a.arrivoOrario === null
        ? { tipo: "VOLO_PERSO", elementoId }
        : { tipo: "VOLO_PERSO", elementoId, arrivoPrevisto: { data: a.arrivoData, orario: a.arrivoOrario } };
    }
    case "SALUTE":
      return {
        tipo: "SALUTE",
        dataInizio: giornoDelViaggio(serve(a.data, "data")),
        ...(a.giorni === null ? {} : { giorni: a.giorni }),
        intensitaMassima: serve(a.intensitaMassima, "intensitaMassima"),
        mobilitaRidotta: a.mobilitaRidotta ?? false,
        descrizione: a.descrizione ?? "",
      };
    case "SCIOPERO": {
      const zonaId = a.zonaId;
      if (zonaId !== null && !istantanea.zone.some((z) => z.id === zonaId)) throw new ErroreStrumento(`La zona "${zonaId}" non esiste: usa uno degli zonaId di leggi_viaggio.`);
      return { tipo: "SCIOPERO", mezzo: serve(a.mezzo, "mezzo"), data: giornoDelViaggio(serve(a.data, "data")), ...(zonaId === null ? {} : { zonaId }) };
    }
    case "BAGAGLIO_SMARRITO":
    case "DOCUMENTI_SMARRITI":
      return { tipo: a.tipo, data: giornoDelViaggio(serve(a.data, "data")), momento: serve(a.momento, "momento") };
    case "STANCHEZZA":
      return { tipo: "STANCHEZZA", data: giornoDelViaggio(serve(a.data, "data")) };
  }
}

// --- cambio di durata (REQ-EDIT-002, per "voglio restare di più" e "voglio tornare prima") -------------------------

export interface ArgomentiCambioDurata {
  operazione: "prolunga" | "accorcia";
  giorni: number;
  dopo: string | null;
}

const SCHEMA_CAMBIO_DURATA = schemaOggetto({
  operazione: scelta(["prolunga", "accorcia"], "prolunga: restare di più; accorcia: tornare prima"),
  giorni: { type: "integer", minimum: 1, maximum: 30, description: "di quanti giorni" },
  dopo: nullabile({ ...DATA, description: "prolunga: dopo quale giorno aggiungere i giorni (di solito l'ultimo del viaggio)" }),
});

// --- bozza -----------------------------------------------------------------------------------------------------

