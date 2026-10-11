/**
 * Il servizio della bozza lato server (REQ-PLAN-002): crea la bozza dalle preferenze, applica le operazioni, annulla,
 * confronta e conferma. Tutte le regole sono del motore (`applicaOperazioneBozza`, `confermaBozza`,
 * `propostaDopoConferma`, `applicaProposta`): qui si legge e si salva nella base dati (REQ-DATA-001) e si prepara la
 * vista in parole semplici. Ogni funzione restituisce un esito, mai un'eccezione.
 *
 * Le revisioni si salvano nella tabella delle revisioni della bozza; il profilo di ogni revisione, la revisione a cui
 * riporta "Annulla" e la revisione confermata stanno in un'impostazione per viaggio (`CHIAVE_DATI_BOZZA`).
 */
import {
  alternativeSostituzione,
  applicaOperazioneBozza,
  applicaProposta,
  attivitaSuggerite,
  avviaBozza,
  confermaBozza,
  confrontaRevisioni,
  cronologiaBozza,
  etichettaRevisione,
  raggruppaNoteBozza,
  propostaDopoConferma,
  revisioneCorrente,
  ricostruisciStatoBozza,
  rifiutaProposta,
  validaProfilo,
  versioneCorrente,
  type BozzaProfilo,
  type Catalogo,
  type ContestoBozza,
  type DifferenzaItinerari,
  type ElementoDatato,
  type Elemento,
  type IstantaneaCatalogo,
  type OperazioneBozza,
  type ProblemaFattibilita,
  type ProfiloPreferenze,
  type Proposta,
  type RevisioneSalvata,
  type StatoBozza,
  type Storico,
  type SuggerimentoBozza,
  type Viaggio,
} from "@travelops/engine";
import {
  aggiungiRevisioneBozza,
  elencaProposteDelViaggio,
  elencaRevisioniBozza,
  elencaViaggi,
  leggiImpostazione,
  leggiIstantanea,
  leggiProfilo,
  leggiStoricoDelViaggio,
  salvaProfilo,
  salvaStoricoDelViaggio,
  salvaViaggio,
  scriviImpostazione,
  sostituisciProposteDelViaggio,
  trovaViaggio,
  type BaseDati,
  type PropostaRegistrata,
} from "../basedati";
import { salvaProfilo as salvaPreferenze } from "../preferenze/profilo";
import { momentoSulViaggio } from "../dati/viaggi-salvati";
import { NOME_PREDEFINITO } from "../stato/stato";
import { CHIAVE_DATI_BOZZA } from "./chiavi";
import { contestoTesti, inParole, type ContestoTesti } from "../testi";
import { minutiTra } from "../oggi/tempo";
import { costoInParole, dataBreve, dataEstesa, durataBreve, ETICHETTE_MEZZO, intervallo, STILE_DA_CATEGORIA } from "../viste/etichette";
import type {
  AlternativaVista,
  AttivitaBozzaVista,
  CambioPreferenze,
  ConfrontoBozzaVista,
  EsitoBozza,
  EsitoCreaBozza,
  GiornoBozzaVista,
  PropostaBozzaVista,
  VistaBozza,
} from "./tipi";

export { CHIAVE_DATI_BOZZA } from "./chiavi";

/** Da dove nasce una proposta salvata dalla pagina della bozza. */
export const ORIGINE_PROPOSTA_BOZZA = "bozza";

/** Prefisso degli identificativi dei viaggi creati dalle preferenze. */
export const PREFISSO_VIAGGIO = "viaggio-";

const MESSAGGIO_ERRORE = "Al momento non riesco a modificare la bozza. Riprova tra un attimo.";
const BOZZA_ASSENTE = "Non trovo questa bozza: creane una nuova dalle preferenze.";

interface DatiBozza {
  revisioni: Record<string, { profilo: ProfiloPreferenze; precedente: number | null }>;
  confermata: number | null;
}

/** Tutto ciò che serve per lavorare su una bozza salvata. */
interface Caricata {
  viaggioId: string;
  titolo: string;
  contesto: ContestoBozza;
  stato: StatoBozza;
  dati: DatiBozza;
  storico: Storico | null;
}

type UsaDb = <T>(lavoro: (db: BaseDati) => T) => T;

const catalogoDi = (istantanea: IstantaneaCatalogo): Catalogo => istantanea as unknown as Catalogo;

function leggiDati(db: BaseDati, viaggioId: string): DatiBozza {
  const valore = leggiImpostazione(db, CHIAVE_DATI_BOZZA(viaggioId));
  if (typeof valore !== "object" || valore === null) return { revisioni: {}, confermata: null };
  const dati = valore as Partial<DatiBozza>;
  return { revisioni: dati.revisioni ?? {}, confermata: dati.confermata ?? null };
}

function profiloDelViaggio(db: BaseDati, viaggioId: string): ProfiloPreferenze | null {
  const esito = validaProfilo((leggiProfilo(db, viaggioId) ?? {}) as BozzaProfilo);
  return esito.ok ? esito.profilo : null;
}

/** Legge viaggio, istantanea, revisioni e storico; `null` se il viaggio non ha una bozza. */
function carica(db: BaseDati, viaggioId: string): Caricata | null {
  const viaggio = trovaViaggio(db, viaggioId);
  if (viaggio === null || viaggio.istantanea === null) return null;
  const istantanea = leggiIstantanea(db, viaggio.istantanea);
  if (istantanea === null) return null;
  const elencate = elencaRevisioniBozza(db, viaggioId);
  if (!elencate.ok || elencate.revisioni.length === 0) return null;
  const dati = leggiDati(db, viaggioId);
  const profiloSalvato = profiloDelViaggio(db, viaggioId);
  const salvate: RevisioneSalvata[] = [];
  for (const r of elencate.revisioni) {
    const extra = dati.revisioni[String(r.numero)];
    const profilo = extra?.profilo ?? profiloSalvato;
    if (profilo === null) return null;
    salvate.push({ numero: r.numero, causa: r.causa, viaggio: r.viaggio, profilo, ...(extra ? { precedente: extra.precedente } : {}) });
  }
  const contesto: ContestoBozza = { istantanea: istantanea.contenuto as IstantaneaCatalogo };
  const storicoLetto = leggiStoricoDelViaggio(db, viaggioId);
  return {
    viaggioId,
    titolo: viaggio.titolo,
    contesto,
    stato: ricostruisciStatoBozza(contesto, salvate, dati.confermata),
    dati,
    storico: storicoLetto?.ok === true ? storicoLetto.storico : null,
  };
}

/** Salva le revisioni nuove dello stato (quelle oltre `giaSalvate`) con i loro dati. */
function salvaRevisioni(db: BaseDati, caricata: Caricata, stato: StatoBozza, giaSalvate: number): void {
  const dati: DatiBozza = { revisioni: { ...caricata.dati.revisioni }, confermata: stato.confermata };
  for (const r of stato.revisioni.slice(giaSalvate)) {
    aggiungiRevisioneBozza(db, caricata.viaggioId, r.causa, r.viaggio);
    dati.revisioni[String(r.numero)] = { profilo: r.profilo, precedente: r.precedente };
  }
  scriviImpostazione(db, CHIAVE_DATI_BOZZA(caricata.viaggioId), dati);
}

// --- Vista ------------------------------------------------------------------------------------------------

function nomeAttivita(istantanea: IstantaneaCatalogo, id: string): string {
  return istantanea.attivita.find((a) => a.id === id)?.nome ?? "attività";
}

function nomeLuogo(istantanea: IstantaneaCatalogo, id: string): string {
  return istantanea.luoghi.find((l) => l.id === id)?.nome ?? "luogo";
}

function vistaAttivita(istantanea: IstantaneaCatalogo, elemento: Extract<Elemento, { tipo: "attivita" }>): AttivitaBozzaVista {
  const voce = istantanea.attivita.find((a) => a.id === elemento.attivitaId);
  const categoria = voce?.categoria;
  const stileCategoria = categoria !== undefined && categoria in STILE_DA_CATEGORIA ? STILE_DA_CATEGORIA[categoria as keyof typeof STILE_DA_CATEGORIA] : null;
  return {
    tipo: "attivita",
    id: elemento.id,
    nome: voce?.nome ?? "Attività",
    orario: intervallo(elemento.inizio, elemento.fine),
    durata: voce === undefined ? null : durataBreve(voce.durataTipica),
    stile: voce?.stili?.[0] ?? stileCategoria,
    costo: voce?.costo === undefined ? null : costoInParole(voce.costo),
    allAperto: voce?.allAperto ?? null,
    descrizione: voce?.descrizioneBreve ?? null,
    pasto: categoria === "pasto" || categoria === "servizio",
    bloccata: elemento.priorita === "irrinunciabile",
    suggerimenti: [],
  };
}

function vistaGiorni(istantanea: IstantaneaCatalogo, viaggio: Viaggio, suggerimenti: readonly SuggerimentoBozza[], testi: ContestoTesti): {
  giorni: GiornoBozzaVista[];
  restanti: string[];
} {
  const giorni: GiornoBozzaVista[] = viaggio.giorni.map((giorno) => ({
    data: giorno.data,
    titolo: dataEstesa(giorno.data),
    suggerimenti: [],
    voci: giorno.elementi.map((e) =>
      e.tipo === "attivita"
        ? vistaAttivita(istantanea, e)
        : {
            tipo: "spostamento" as const,
            id: e.id,
            orario: intervallo(e.inizio, e.fine),
            minuti: minutiTra(e.inizio, e.fine),
            testo: `${ETICHETTE_MEZZO[e.mezzo]} da «${nomeLuogo(istantanea, e.da)}» a «${nomeLuogo(istantanea, e.a)}»`,
          },
    ),
  }));
  const restanti: string[] = [];
  for (const s of suggerimenti) {
    const testo = inParole(s.testo, testi);
    const scheda = giorni
      .flatMap((g) => g.voci)
      .find((v): v is AttivitaBozzaVista => v.tipo === "attivita" && s.elementi.includes(v.id));
    if (scheda) scheda.suggerimenti.push(testo);
    else {
      const giorno = giorni.find((g) => g.data === s.data);
      if (giorno) giorno.suggerimenti.push(testo);
      else restanti.push(testo);
    }
  }
  return { giorni, restanti };
}

function decisioneDi(registrata: PropostaRegistrata): PropostaBozzaVista["decisione"] {
  const decisione = registrata.decisione as { tipo?: string } | null;
  return decisione?.tipo === "accettata" ? "accettata" : decisione?.tipo === "rifiutata" ? "rifiutata" : "in_attesa";
}

function vista(db: BaseDati, caricata: Caricata): VistaBozza {
  const { contesto, stato } = caricata;
  const istantanea = contesto.istantanea;
  const corrente = revisioneCorrente(stato);
  const confermato = stato.confermata !== null && caricata.storico !== null;
  const viaggio = confermato && caricata.storico ? versioneCorrente(caricata.storico).viaggio : corrente.viaggio;
  const testi = contestoTesti(catalogoDi(istantanea), [viaggio, corrente.viaggio]);
  const suggerimenti = confermato ? [] : corrente.suggerimenti;
  const { giorni, restanti } = vistaGiorni(istantanea, viaggio, suggerimenti, testi);
  const cronologia = cronologiaBozza(stato.revisioni);
  const proposte = confermato
    ? elencaProposteDelViaggio(db, caricata.viaggioId)
        .filter((p) => p.origine === ORIGINE_PROPOSTA_BOZZA)
        .map((p): PropostaBozzaVista => {
          const proposta = p.proposta as Proposta & { origine: { descrizione?: string } };
          const contestoProposta = contestoTesti(catalogoDi(istantanea), [viaggio, proposta.itinerario]);
          return {
            id: p.id,
            titolo: inParole(proposta.origine.descrizione ?? "Modifica richiesta", contestoProposta),
            spiegazione: inParole(proposta.spiegazione, contestoProposta),
            fattibile: proposta.fattibile,
            decisione: decisioneDi(p),
          };
        })
    : [];
  return {
    viaggioId: caricata.viaggioId,
    titolo: caricata.titolo,
    stato: confermato ? "confermato" : "bozza",
    revisione: corrente.numero,
    etichettaRevisione: cronologia.find((v) => v.numero === corrente.numero)?.etichetta ?? "",
    revisioni: cronologia.map((v) => ({ numero: v.numero, etichetta: inParole(v.etichetta, testi), causa: inParole(v.dettaglio, testi) })),
    annullabile: !confermato && corrente.precedente !== null,
    giorni,
    avvisi: [
      ...new Set([
        ...raggruppaNoteBozza({
          avvisi: confermato ? [] : corrente.avvisi,
          problemi: confermato ? [] : corrente.problemi,
          viaggio: corrente.viaggio,
          istantanea,
        }).map((n) => inParole(n, testi)),
        ...restanti,
      ]),
    ],
    suggerite: confermato ? [] : attivitaSuggerite(stato, contesto).slice(0, 12).map(({ attivitaId, nome }) => ({ attivitaId, nome })),
    date: viaggio.giorni.map((g) => ({ valore: g.data, etichetta: dataEstesa(g.data) })),
    preferenze: { ritmo: corrente.profilo.ritmo, stili: [...corrente.profilo.stili] },
    versione: confermato && caricata.storico ? versioneCorrente(caricata.storico).numero : null,
    proposte,
  };
}

/**
 * Quanti spostamenti sono davvero cambiati tra due revisioni. Dopo una modifica gli spostamenti si ricalcolano con
 * identificativi nuovi: quelli con stesso giorno, tratta, orari e mezzo si considerano invariati e non si contano.
 */
export function contaSpostamentiCambiati(differenza: DifferenzaItinerari): number {
  const chiave = (v: ElementoDatato): string => {
    const e = v.elemento;
    return e.tipo === "spostamento" ? JSON.stringify([v.data, e.da, e.a, e.inizio, e.fine, e.mezzo]) : "";
  };
  const soloSpostamenti = (voci: ElementoDatato[]): ElementoDatato[] => voci.filter((v) => v.elemento.tipo === "spostamento");
  const prima = new Map<string, number>();
  for (const v of soloSpostamenti(differenza.rimossi)) prima.set(chiave(v), (prima.get(chiave(v)) ?? 0) + 1);
  let aggiuntiNuovi = 0;
  for (const v of soloSpostamenti(differenza.aggiunti)) {
    const rimasti = prima.get(chiave(v)) ?? 0;
    if (rimasti > 0) prima.set(chiave(v), rimasti - 1);
    else aggiuntiNuovi += 1;
  }
  const rimossiNuovi = [...prima.values()].reduce((somma, n) => somma + n, 0);
  return Math.max(aggiuntiNuovi, rimossiNuovi);
}

function frasiConfronto(istantanea: IstantaneaCatalogo, stato: StatoBozza, da: number, a: number): string[] | null {
  const differenza = confrontaRevisioni(stato, da, a);
  if (differenza === null) return null;
  const attivita = (e: Elemento): e is Extract<Elemento, { tipo: "attivita" }> => e.tipo === "attivita";
  const frasi: string[] = [];
  for (const v of differenza.aggiunti) if (attivita(v.elemento)) frasi.push(`Aggiunto «${nomeAttivita(istantanea, v.elemento.attivitaId)}» il ${dataBreve(v.data)}`);
  for (const v of differenza.rimossi) if (attivita(v.elemento)) frasi.push(`Tolto «${nomeAttivita(istantanea, v.elemento.attivitaId)}» dal ${dataBreve(v.data)}`);
  for (const m of differenza.modificati) {
    const dopo = m.dopo.elemento;
    if (!attivita(dopo)) continue;
    const nome = nomeAttivita(istantanea, dopo.attivitaId);
    if (m.prima.data !== m.dopo.data) frasi.push(`Spostato «${nome}» al ${dataBreve(m.dopo.data)}, ${intervallo(dopo.inizio, dopo.fine)}`);
    else if (m.campi.some((c) => c.campo === "priorita")) frasi.push(dopo.priorita === "irrinunciabile" ? `Bloccato «${nome}»` : `Sbloccato «${nome}»`);
    else frasi.push(`Nuovo orario per «${nome}»: ${intervallo(dopo.inizio, dopo.fine)}`);
  }
  const spostamenti = contaSpostamentiCambiati(differenza);
  if (spostamenti > 0) frasi.push(spostamenti === 1 ? "Aggiornato 1 spostamento" : `Aggiornati ${spostamenti} spostamenti`);
  return frasi;
}

// --- Servizio ---------------------------------------------------------------------------------------------

/** Un nuovo identificativo di viaggio: `viaggio-1`, `viaggio-2`, … */
function nuovoIdViaggio(db: BaseDati): { id: string; ordine: number } {
  const viaggi = elencaViaggi(db);
  const ordine = Math.max(0, ...viaggi.map((v) => v.ordine)) + 1;
  let n = viaggi.filter((v) => v.id.startsWith(PREFISSO_VIAGGIO)).length + 1;
  while (viaggi.some((v) => v.id === `${PREFISSO_VIAGGIO}${n}`)) n++;
  return { id: `${PREFISSO_VIAGGIO}${n}`, ordine };
}

/** `usaDb` apre la base dati, esegue il lavoro e la chiude. `indirizzo` dà la pagina della bozza di un viaggio. */
export function creaServizioBozza(usaDb: UsaDb, indirizzo: (viaggioId: string) => string, oggi?: () => string | undefined) {
  /** Esegue il lavoro su una bozza caricata e restituisce la vista aggiornata. */
  const conBozza = (viaggioId: string, lavoro: (db: BaseDati, caricata: Caricata) => string | null | { errore: string }): EsitoBozza => {
    try {
      return usaDb((db): EsitoBozza => {
        const caricata = carica(db, viaggioId);
        if (caricata === null) return { ok: false, messaggio: BOZZA_ASSENTE };
        const risultato = lavoro(db, caricata);
        if (risultato !== null && typeof risultato === "object") return { ok: false, messaggio: inParole(risultato.errore, contestoTesti(catalogoDi(caricata.contesto.istantanea), [revisioneCorrente(caricata.stato).viaggio])) };
        const aggiornata = carica(db, viaggioId);
        if (aggiornata === null) return { ok: false, messaggio: MESSAGGIO_ERRORE };
        const testi = contestoTesti(catalogoDi(aggiornata.contesto.istantanea), [revisioneCorrente(aggiornata.stato).viaggio]);
        return { ok: true, vista: vista(db, aggiornata), messaggio: risultato === null ? null : inParole(risultato, testi) };
      });
    } catch {
      return { ok: false, messaggio: MESSAGGIO_ERRORE };
    }
  };

  /** Un'operazione: sulla bozza crea una revisione; dopo la conferma diventa una proposta (CA-5). */
  const opera = (db: BaseDati, caricata: Caricata, operazione: OperazioneBozza): string | { errore: string } => {
    if (caricata.stato.confermata !== null && caricata.storico !== null) {
      const esito = propostaDopoConferma(caricata.storico, caricata.contesto, operazione);
      if (!esito.ok) return { errore: esito.motivo };
      const registrate = elencaProposteDelViaggio(db, caricata.viaggioId);
      const id = Math.max(0, ...registrate.map((p) => p.id)) + 1;
      sostituisciProposteDelViaggio(db, caricata.viaggioId, [
        ...registrate,
        { id, origine: ORIGINE_PROPOSTA_BOZZA, proposta: esito.proposta, decisione: null, esito: null },
      ]);
      return "L'itinerario è confermato: ho preparato una proposta. Accettala per creare una nuova versione.";
    }
    const esito = applicaOperazioneBozza(caricata.stato, caricata.contesto, operazione);
    if (!esito.ok) return { errore: esito.motivo };
    salvaRevisioni(db, caricata, esito.stato, caricata.stato.revisioni.length);
    return `Bozza aggiornata: ${etichettaRevisione(esito.revisione.causa)}.`;
  };

  return {
    /** «Crea la mia bozza»: profilo validato, viaggio nuovo, revisione B1 dal generatore. */
    crea(bozza: BozzaProfilo): EsitoCreaBozza {
      const giorno = oggi?.();
      const validato = validaProfilo(bozza, giorno === undefined ? {} : { oggi: giorno });
      if (!validato.ok) return { esito: "errore", messaggio: validato.problemi.map((p) => p.testo).join(" ") };
      const profilo = validato.profilo;
      const riferimento = profilo.destinazione.tipo === "luogo" ? profilo.destinazione.riferimento : undefined;
      try {
        return usaDb((db): EsitoCreaBozza => {
          const salvata = riferimento === undefined ? null : leggiIstantanea(db, riferimento);
          if (salvata === null) {
            return {
              esito: "errore",
              messaggio: "Per preparare la bozza scegli una delle destinazioni pronte (oppure cercala e attendi che sia pronta).",
            };
          }
          const { id, ordine } = nuovoIdViaggio(db);
          const titolo = `Viaggio a ${salvata.destinazione}`;
          const contesto: ContestoBozza = { istantanea: salvata.contenuto as IstantaneaCatalogo };
          const stato = avviaBozza(profilo, { ...contesto, opzioni: { idViaggio: id, titolo } });
          salvaPreferenze(db, bozza);
          salvaViaggio(db, { id, titolo, stato: "bozza", demo: false, ordine, destinazione: salvata.destinazione, istantanea: salvata.id });
          salvaProfilo(db, id, bozza);
          const caricata: Caricata = { viaggioId: id, titolo, contesto, stato, dati: { revisioni: {}, confermata: null }, storico: null };
          salvaRevisioni(db, caricata, stato, 0);
          return { esito: "creata", indirizzo: indirizzo(id) };
        });
      } catch {
        return { esito: "errore", messaggio: "Al momento non riesco a preparare la bozza. Riprova tra un attimo." };
      }
    },

    /** La vista della bozza (o dell'itinerario confermato con le sue proposte); `null` se non c'è. */
    vista(viaggioId: string): VistaBozza | null {
      try {
        return usaDb((db) => {
          const caricata = carica(db, viaggioId);
          return caricata === null ? null : vista(db, caricata);
        });
      } catch {
        return null;
      }
    },

    /** L'itinerario corrente e il catalogo della bozza, per chiedere la previsione del tempo; `null` se non c'è. */
    datiPerMeteo(viaggioId: string): { viaggio: Viaggio; catalogo: Catalogo } | null {
      try {
        return usaDb((db) => {
          const caricata = carica(db, viaggioId);
          if (caricata === null) return null;
          const confermato = caricata.stato.confermata !== null && caricata.storico !== null;
          const viaggio = confermato && caricata.storico ? versioneCorrente(caricata.storico).viaggio : revisioneCorrente(caricata.stato).viaggio;
          return { viaggio, catalogo: catalogoDi(caricata.contesto.istantanea) };
        });
      } catch {
        return null;
      }
    },

    opera(viaggioId: string, operazione: OperazioneBozza): EsitoBozza {
      return conBozza(viaggioId, (db, caricata) => opera(db, caricata, operazione));
    },

    /** «Cambia preferenze»: aggiorna ritmo e stili del profilo e rigenera tutto tenendo le attività bloccate. */
    cambiaPreferenze(viaggioId: string, cambio: CambioPreferenze): EsitoBozza {
      return conBozza(viaggioId, (db, caricata) => {
        const attuale = (leggiProfilo(db, viaggioId) ?? {}) as BozzaProfilo;
        const nuova: BozzaProfilo = {
          ...attuale,
          ...(cambio.ritmo === undefined ? {} : { ritmo: cambio.ritmo }),
          ...(cambio.stili === undefined || cambio.stili.length === 0 ? {} : { stili: cambio.stili }),
        };
        const validato = validaProfilo(nuova);
        if (!validato.ok) return { errore: validato.problemi.map((p) => p.testo).join(" ") };
        const esito = opera(db, caricata, { tipo: "cambia_preferenze", profilo: validato.profilo });
        if (typeof esito === "string") salvaProfilo(db, viaggioId, nuova);
        return esito;
      });
    },

    alternative(viaggioId: string, elementoId: string): AlternativaVista[] {
      try {
        return usaDb((db) => {
          const caricata = carica(db, viaggioId);
          if (caricata === null || caricata.stato.confermata !== null) return [];
          return alternativeSostituzione(caricata.stato, caricata.contesto, elementoId).map(({ attivitaId, nome }) => ({ attivitaId, nome }));
        });
      } catch {
        return [];
      }
    },

    confronta(viaggioId: string, da: number, a: number): ConfrontoBozzaVista | null {
      try {
        return usaDb((db) => {
          const caricata = carica(db, viaggioId);
          const cambi = caricata === null ? null : frasiConfronto(caricata.contesto.istantanea, caricata.stato, da, a);
          return cambi === null ? null : { da, a, cambi };
        });
      } catch {
        return null;
      }
    },

    /** «Conferma l'itinerario»: l'ultima revisione diventa la versione 1 (CA-4). */
    conferma(viaggioId: string): EsitoBozza {
      return conBozza(viaggioId, (db, caricata) => {
        const esito = confermaBozza(caricata.stato);
        if (!esito.ok) return { errore: esito.motivo };
        salvaStoricoDelViaggio(db, viaggioId, esito.storico);
        const viaggio = trovaViaggio(db, viaggioId);
        if (viaggio) salvaViaggio(db, { ...viaggio, stato: "confermato" });
        scriviImpostazione(db, CHIAVE_DATI_BOZZA(viaggioId), { ...caricata.dati, confermata: esito.stato.confermata });
        return "Buon viaggio!";
      });
    },

    /** Accetta una proposta nata dopo la conferma: decide il motore (`applicaProposta`). */
    accetta(viaggioId: string, propostaId: number): EsitoBozza {
      return conBozza(viaggioId, (db, caricata) => {
        const registrate = elencaProposteDelViaggio(db, viaggioId);
        const voce = registrate.find((p) => p.id === propostaId);
        if (!voce || caricata.storico === null) return { errore: "Questa proposta non è più disponibile." };
        // Il momento dell'accettazione è quello dell'orologio del viaggio (REQ-UX-003, CA-3).
        const momento = momentoSulViaggio(db, viaggioId).momento;
        const risultato = applicaProposta(caricata.storico, voce.proposta as Proposta, NOME_PREDEFINITO, momento);
        if (risultato.esito === "errore") return { errore: risultato.errore.messaggio };
        salvaStoricoDelViaggio(db, viaggioId, risultato.storico);
        const versione = risultato.esito === "versione_creata" ? risultato.versione.numero : null;
        sostituisciProposteDelViaggio(
          db,
          viaggioId,
          registrate.map((p) => (p.id === propostaId ? { ...p, decisione: { tipo: "accettata", versione, autore: NOME_PREDEFINITO, momento } } : p)),
        );
        return versione === null ? "Nessun cambiamento da salvare." : `Proposta accettata: creata la versione ${versione}.`;
      });
    },

    /** Rifiuta una proposta: il motore (`rifiutaProposta`) non crea versioni. */
    rifiuta(viaggioId: string, propostaId: number): EsitoBozza {
      return conBozza(viaggioId, (db, caricata) => {
        const registrate = elencaProposteDelViaggio(db, viaggioId);
        const voce = registrate.find((p) => p.id === propostaId);
        if (!voce || caricata.storico === null) return { errore: "Questa proposta non è più disponibile." };
        const risultato = rifiutaProposta(caricata.storico, voce.proposta as Proposta);
        salvaStoricoDelViaggio(db, viaggioId, risultato.storico);
        sostituisciProposteDelViaggio(db, viaggioId, registrate.map((p) => (p.id === propostaId ? { ...p, decisione: { tipo: "rifiutata" } } : p)));
        return "Proposta rifiutata: l'itinerario resta com'era.";
      });
    },
  };
}

export type ServizioBozza = ReturnType<typeof creaServizioBozza>;
