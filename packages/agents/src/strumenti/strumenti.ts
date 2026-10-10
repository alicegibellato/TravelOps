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
  ATTIVITA_PER_RITMO,
  BUDGET,
  caricaViaggio,
  classificaAttivita,
  controllaFattibilita,
  cosaManca,
  creaSorgenteDaDati,
  creaStorico,
  eFattibile,
  ErroreBozza,
  ESIGENZE,
  FORME_FISICHE,
  generaAlternativa,
  generaBozza,
  elencaVersioni,
  leggiVersione,
  MEZZI_PROFILO,
  ORARI_PROFILO,
  proponiModifica,
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
  type Imprevisto,
  type IstantaneaCatalogo,
  type ModificaRichiesta,
  type Priorita,
  type ProfiloPreferenze,
  type SorgenteDatiContesto,
  type StileViaggio,
  type Viaggio,
} from "@travelops/engine";
import type { AreaDestinazione, SorgenteDestinazioni } from "@travelops/sources";
import { ErroreStrumento, type ContestoStrumento, type RegistroStrumenti, type Strumento } from "../ciclo.js";
import type { ArchivioViaggio, RevisioneBozza, SchedaViaggio } from "./archivio.js";
import { giorniDi, nomiDi, problemiInBreve, riassuntoBozza, riassuntoProposta, riassuntoViaggio } from "./riassunti.js";
import { comeSchemaJson, schemaOggetto, validaArgomenti, type SchemaArgomenti, type SchemaValore } from "./schema.js";

/** I nomi degli strumenti, nell'ordine in cui sono offerti al modello. */
export const NOMI_STRUMENTI = [
  "cerca_destinazione",
  "prepara_destinazione",
  "proponi_destinazioni",
  "aggiorna_profilo",
  "genera_bozza",
  "genera_alternativa",
  "modifica_bozza",
  "rigenera_giornata",
  "conferma_viaggio",
  "proponi_modifica",
  "proponi_ripianificazione",
  "cerca_catalogo",
  "leggi_viaggio",
] as const;

export type NomeStrumento = (typeof NOMI_STRUMENTI)[number];

/** Gli strumenti che possono scrivere nell'archivio; gli altri leggono soltanto. */
export const STRUMENTI_CHE_SCRIVONO: readonly NomeStrumento[] = [
  "prepara_destinazione",
  "aggiorna_profilo",
  "genera_bozza",
  "genera_alternativa",
  "modifica_bozza",
  "rigenera_giornata",
  "conferma_viaggio",
  "proponi_modifica",
  "proponi_ripianificazione",
];

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
}

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

const PROPRIETA_MODIFICA = {
  operazione: scelta(["aggiungi", "rimuovi", "sposta", "cambia_priorita", "imposta_orario_fisso"], "che cosa fare"),
  elementoId: nullabile(testo("id dell'elemento del programma (rimuovi, sposta, cambia_priorita, imposta_orario_fisso)")),
  attivitaId: nullabile(testo("id dell'attività del catalogo da aggiungere (aggiungi)")),
  data: nullabile(DATA),
  inizio: nullabile(ORARIO),
  priorita: nullabile(scelta(PRIORITA, "priorità (aggiungi, facoltativa; cambia_priorita)")),
  orarioFisso: { type: ["boolean", "null"], description: "imposta_orario_fisso: vero per bloccare l'orario" } as SchemaValore,
};

interface ArgomentiModifica {
  operazione: ModificaRichiesta["operazione"];
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
    if (ultima.viaggio.id !== idBozza(istantanea)) {
      throw new ErroreStrumento("La bozza è di un'altra destinazione: generane una nuova con genera_bozza.");
    }
    return ultima;
  }

  const idBozza = (istantanea: IstantaneaCatalogo): string => `BOZZA-${istantanea.id}`;

  async function salvaScheda(modifica: Partial<SchedaViaggio>): Promise<void> {
    const attuale = (await scheda()) ?? { titolo: "Nuovo viaggio", stato: "bozza" as const, destinazione: null, istantaneaId: null };
    await archivio.salvaScheda({ ...attuale, ...modifica });
  }

  function genera(profilo: ProfiloPreferenze, istantanea: IstantaneaCatalogo, corrente?: Viaggio, escludi?: readonly string[]) {
    const opzioniBozza = { idViaggio: idBozza(istantanea), sorgente: contestoDi(istantanea), ...(escludi === undefined ? {} : { escludi }) };
    try {
      return corrente === undefined ? generaBozza(profilo, istantanea, opzioniBozza) : generaAlternativa(profilo, istantanea, corrente, opzioniBozza);
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

  function proponiModificaSu(viaggio: Viaggio, versioneBase: number, istantanea: IstantaneaCatalogo, modifica: ModificaRichiesta) {
    const esito = proponiModifica(viaggio, versioneBase, istantanea as unknown as Catalogo, contestoDi(istantanea), modifica);
    if (!esito.ok) throw new ErroreStrumento(`La modifica non si può fare: ${esito.errore.motivo}`);
    return esito.proposta;
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
    async (argomenti) => {
      const attuale = (await archivio.leggiProfilo()) ?? {};
      const nuova = unisciProfilo(attuale, argomenti);
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

  const generaAlternativaStrumento = strumento<Record<string, never>>(
    "genera_alternativa",
    "Genera un'alternativa alla bozza corrente con altre attività adatte al profilo (gli irrinunciabili restano).",
    schemaOggetto({}),
    async () => {
      await nonConfermato();
      const { istantanea } = await istantaneaDelViaggio();
      const profilo = await profiloCompleto(istantanea);
      const corrente = await bozzaCorrente(istantanea);
      const bozza = genera(profilo, istantanea, corrente.viaggio);
      const prima = attivitaDi(corrente.viaggio, istantanea);
      const dopo = attivitaDi(bozza.viaggio, istantanea);
      const nomi = nomiDi(istantanea);
      const nome = (id: string): string => nomi.attivita(id)?.nome ?? id;
      if (prima.join() === dopo.join()) {
        return { nuovaRevisione: false, messaggio: "Non ci sono altre attività adatte al profilo: l'alternativa sarebbe uguale alla bozza." };
      }
      const revisione = await archivio.aggiungiRevisioneBozza("Alternativa", bozza.viaggio);
      return {
        revisione,
        tolte: prima.filter((id) => !dopo.includes(id)).map(nome),
        nuove: dopo.filter((id) => !prima.includes(id)).map(nome),
        ...riassuntoBozza(bozza, istantanea),
      };
    },
  );

  const modificaBozza = strumento<ArgomentiModifica>(
    "modifica_bozza",
    "Cambia la bozza prima della conferma: aggiungi un'attività del catalogo, rimuovi, sposta, cambia priorità o blocca l'orario di un elemento. " +
      "La modifica si applica solo se resta fattibile.",
    schemaOggetto(PROPRIETA_MODIFICA),
    async (argomenti) => {
      await nonConfermato();
      const { istantanea } = await istantaneaDelViaggio();
      const corrente = await bozzaCorrente(istantanea);
      const proposta = proponiModificaSu(corrente.viaggio, 0, istantanea, modificaDa(argomenti));
      const riassunto = riassuntoProposta(0, proposta, istantanea);
      if (!proposta.fattibile) {
        return { applicata: false, fattibile: false, spiegazione: proposta.spiegazione, problemi: riassunto.problemi ?? [] };
      }
      const revisione = await archivio.aggiungiRevisioneBozza(`Modifica: ${proposta.origine.descrizione}`, proposta.itinerario);
      return { applicata: true, revisione, spiegazione: proposta.spiegazione, cambiamenti: riassunto.cambiamenti };
    },
  );

  const rigeneraGiornata = strumento<{ data: string }>(
    "rigenera_giornata",
    "Rifà un solo giorno della bozza (prima della conferma) con attività diverse da quelle già nel viaggio; gli altri giorni restano uguali.",
    schemaOggetto({ data: DATA }),
    async ({ data }) => {
      await nonConfermato();
      const { istantanea } = await istantaneaDelViaggio();
      const profilo = await profiloCompleto(istantanea);
      const corrente = await bozzaCorrente(istantanea);
      const indice = corrente.viaggio.giorni.findIndex((g) => g.data === data);
      if (indice < 0) throw new ErroreStrumento(`Il ${data} non è un giorno del viaggio (dal ${corrente.viaggio.dataInizio} al ${corrente.viaggio.dataFine}).`);

      // Si escludono le attività di tutti i giorni (pasti esclusi) tranne gli irrinunciabili del giorno scelto.
      const catalogo = new Map(istantanea.attivita.map((a) => [a.id, a]));
      const irrinunciabili = new Set(classificaAttivita(istantanea, profilo).candidate.filter((v) => v.irrinunciabile).map((v) => v.attivitaId));
      const escludi = new Set<string>();
      corrente.viaggio.giorni.forEach((giorno, i) => {
        for (const e of giorno.elementi) {
          if (e.tipo !== "attivita" || !eAttivitaVera(catalogo.get(e.attivitaId)?.categoria ?? "pasto")) continue;
          if (i === indice && irrinunciabili.has(e.attivitaId)) continue;
          escludi.add(e.attivitaId);
        }
      });
      const nuova = genera(profilo, istantanea, undefined, [...escludi]);
      const giornoNuovo = nuova.viaggio.giorni[indice];
      const giornoVecchio = corrente.viaggio.giorni[indice];
      if (giornoNuovo === undefined || giornoVecchio === undefined || giornoNuovo.alloggio !== giornoVecchio.alloggio || giornoNuovo.luogoPartenza !== giornoVecchio.luogoPartenza) {
        throw new ErroreStrumento("Non riesco a rifare questo giorno senza cambiare l'alloggio: prova con genera_alternativa.");
      }
      const attivitaDelGiorno = (elementi: readonly Elemento[]): string =>
        elementi.flatMap((e) => (e.tipo === "attivita" && eAttivitaVera(catalogo.get(e.attivitaId)?.categoria ?? "pasto") ? [e.attivitaId] : [])).sort().join();
      if (attivitaDelGiorno(giornoNuovo.elementi) === attivitaDelGiorno(giornoVecchio.elementi)) {
        return { rigenerata: false, messaggio: "Non ci sono altre attività adatte per questo giorno." };
      }

      const viaggio = sostituisciGiorno(corrente.viaggio, indice, giornoNuovo.elementi);
      const caricato = caricaViaggio(viaggio, istantanea);
      if (!caricato.ok) throw new ErroreStrumento("Il giorno rifatto non è compatibile con il resto del viaggio: prova con genera_alternativa.");
      const problemi = controllaFattibilita(caricato.valore, istantanea, contestoDi(istantanea));
      const nomi = nomiDi(istantanea);
      const [giorno] = giorniDi({ ...caricato.valore, giorni: [caricato.valore.giorni[indice]!] }, nomi);
      if (!eFattibile(problemi)) {
        return { rigenerata: false, fattibile: false, messaggio: "Il giorno rifatto non sarebbe fattibile: la bozza resta com'era.", problemi: problemiInBreve(problemi) };
      }
      const revisione = await archivio.aggiungiRevisioneBozza(`Giornata del ${data} rifatta`, viaggio);
      return {
        rigenerata: true,
        revisione,
        giorno: { ...giorno, perche: nuova.giorni[indice]?.perche },
        ...(problemi.length === 0 ? {} : { avvisi: problemiInBreve(problemi) }),
      };
    },
  );

  const confermaViaggio = strumento<Record<string, never>>(
    "conferma_viaggio",
    "Conferma la bozza corrente: diventa la versione 1 del viaggio. Da quel momento ogni cambiamento passa da una proposta. Prima riassumi la bozza al viaggiatore.",
    schemaOggetto({}),
    async () => {
      await nonConfermato();
      const { istantanea } = await istantaneaDelViaggio();
      const corrente = await bozzaCorrente(istantanea);
      const esito = creaStorico(corrente.viaggio);
      if (!esito.ok) throw new ErroreStrumento(`Non riesco a confermare la bozza: ${esito.errore.messaggio}`);
      await archivio.salvaStorico(esito.storico);
      await salvaScheda({ stato: "confermato" });
      const versione = versioneCorrente(esito.storico);
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
    "Per un viaggio confermato: prepara la proposta di una modifica (aggiungi, rimuovi, sposta, cambia priorità, blocca l'orario). " +
      "Il viaggio cambia solo quando il viaggiatore accetta la proposta.",
    schemaOggetto(PROPRIETA_MODIFICA),
    async (argomenti) => {
      const storico = await archivio.leggiStorico();
      if (storico === null) throw new ErroreStrumento("Il viaggio non è ancora confermato: per cambiare la bozza usa modifica_bozza.");
      const { istantanea } = await istantaneaDelViaggio();
      const proposta = proponiModificaSu(viaggioCorrente(storico), versioneCorrente(storico).numero, istantanea, modificaDa(argomenti));
      const numero = await archivio.salvaProposta("modifica", proposta);
      return riassuntoProposta(numero, proposta, istantanea);
    },
  );

  const proponiRipianificazioneStrumento = strumento<ArgomentiImprevisto>(
    "proponi_ripianificazione",
    "Per un viaggio confermato: prepara la proposta di ripianificazione per un imprevisto (meteo avverso, ritardo, chiusura di un luogo, " +
      "cancellazione di uno spostamento). Il viaggio cambia solo quando il viaggiatore accetta la proposta.",
    SCHEMA_IMPREVISTO,
    async (argomenti) => {
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

  const leggiViaggio = strumento<{ versione: number | null }>(
    "leggi_viaggio",
    "Legge il viaggio: stato, profilo e cosa manca, la bozza o la versione corrente con il programma giorno per giorno, l'elenco delle versioni e le zone della destinazione.",
    schemaOggetto({ versione: { type: ["integer", "null"], minimum: 1, description: "numero della versione da leggere; null per la corrente" } }),
    async ({ versione }) => {
      const s = await scheda();
      if (s === null) return { esiste: false, messaggio: "Il viaggio non è ancora iniziato: raccogli le preferenze con aggiorna_profilo." };
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
      if (ultima === undefined || istantanea === null || ultima.viaggio.id !== idBozza(istantanea)) return base;
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
    generaAlternativaStrumento,
    modificaBozza,
    rigeneraGiornata,
    confermaViaggio,
    proponiModificaStrumento,
    proponiRipianificazioneStrumento,
    cercaCatalogo,
    leggiViaggio,
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

export interface ArgomentiImprevisto {
  tipo: Imprevisto["tipo"];
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
}

const SCHEMA_IMPREVISTO = schemaOggetto({
  tipo: scelta(["METEO_AVVERSO", "RITARDO", "CHIUSURA_LUOGO", "CANCELLAZIONE_SPOSTAMENTO"], "tipo di imprevisto"),
  data: nullabile({ ...DATA, description: "giorno dell'imprevisto AAAA-MM-GG (meteo, ritardo, chiusura)" }),
  inizio: nullabile({ ...ORARIO, description: "inizio HH:mm (meteo, chiusura)" }),
  fine: nullabile({ ...ORARIO, description: "fine HH:mm (meteo, chiusura)" }),
  zonaId: nullabile(testo("zona colpita dal meteo (zonaId da leggi_viaggio)")),
  condizione: nullabile(scelta(["pioggia", "temporale", "neve"], "condizione meteo")),
  momento: nullabile({ ...ORARIO, description: "da che ora vale il ritardo HH:mm" }),
  minuti: { type: ["integer", "null"], minimum: 1, maximum: 1440, description: "minuti di ritardo" },
  motivo: nullabile(testo("motivo del ritardo, in breve")),
  luogoId: nullabile(testo("luogo chiuso (luogoId da leggi_viaggio o cerca_catalogo)")),
  elementoId: nullabile(testo("spostamento cancellato (id dell'elemento)")),
});

function imprevistoDa(a: ArgomentiImprevisto, viaggio: Viaggio, istantanea: IstantaneaCatalogo): Imprevisto {
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
  }
}

// --- bozza -----------------------------------------------------------------------------------------------------

/** Le attività di un viaggio (pasti e servizi esclusi), in ordine di `id`. */
function attivitaDi(viaggio: Viaggio, istantanea: IstantaneaCatalogo): string[] {
  const catalogo = new Map(istantanea.attivita.map((a) => [a.id, a]));
  const ids = new Set<string>();
  for (const giorno of viaggio.giorni)
    for (const e of giorno.elementi) if (e.tipo === "attivita" && eAttivitaVera(catalogo.get(e.attivitaId)?.categoria ?? "pasto")) ids.add(e.attivitaId);
  return [...ids].sort(confronta);
}

/**
 * Il viaggio con gli elementi di un giorno sostituiti. Gli `id` nuovi che esistono già negli altri giorni (per
 * esempio dopo uno spostamento) diventano `N<numero>` con `prossimoNumeroId`, come fa il motore.
 */
function sostituisciGiorno(viaggio: Viaggio, indice: number, elementi: readonly Elemento[]): Viaggio {
  const copia = structuredClone(viaggio);
  const altri = new Set(copia.giorni.flatMap((g, i) => (i === indice ? [] : g.elementi.map((e) => e.id))));
  let prossimo = copia.prossimoNumeroId;
  const nuovi = structuredClone([...elementi]).map((e) => {
    if (!altri.has(e.id)) return e;
    const id = `N${prossimo}`;
    prossimo += 1;
    return { ...e, id };
  });
  const giorno = copia.giorni[indice];
  if (giorno !== undefined) giorno.elementi = nuovi;
  copia.prossimoNumeroId = prossimo;
  return copia;
}
