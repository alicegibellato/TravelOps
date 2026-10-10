/**
 * Revisione e conferma della bozza (REQ-PLAN-002, `modello-dominio-estensioni.md` §7.5).
 *
 * Ogni operazione sulla bozza (da pulsante o da chat) riceve lo stato della bozza e restituisce uno stato nuovo con
 * una revisione in più (B1, B2, …) e la sua causa in parole semplici: lo stato ricevuto non cambia mai e le revisioni
 * precedenti restano identiche. Ogni revisione passa dal controllo di fattibilità (REQ-FEAS-001): se restano problemi
 * bloccanti l'operazione è comunque applicata, ma i problemi sono riportati con un'azione suggerita.
 *
 * Le operazioni riusano il motore: il generatore (REQ-PLAN-001) per giornate, alternative e cambio di preferenze, le
 * modifiche richieste (REQ-EDIT-001) per rimuovere, spostare, aggiungere a un orario e bloccare, lo storico
 * (REQ-ITIN-002) per il confronto e la conferma. Dopo la conferma le modifiche diventano proposte (REQ-EDIT-002).
 * Deterministico: nessun orologio, nessuna casualità, nessuna rete.
 */
import { creaSorgenteDaDati } from "../context/index.js";
import {
  proponiModifica,
  proponiModificaOndata2,
  type EsitoModifica,
  type EsitoModificaOndata2,
} from "../editing/index.js";
import { controllaFattibilita, type ProblemaFattibilita } from "../feasibility/index.js";
import { caricaViaggio } from "../itinerary/index.js";
import { confrontaItinerari, creaStorico, versioneCorrente, type DifferenzaItinerari, type Storico } from "../history/index.js";
import type {
  AttivitaCatalogoEstesa,
  Catalogo,
  Data,
  Elemento,
  ElementoAttivita,
  IstantaneaCatalogo,
  ModificaRichiesta,
  Orario,
  Proposta,
  SorgenteDatiContesto,
  Viaggio,
} from "../model/index.js";
import { valutaAttivita, type ProfiloPreferenze } from "../preferences/index.js";
import {
  attivitaCandidate,
  attivitaPrevistePerGiorno,
  generaAlternativa,
  generaBozza,
  ricostruisciGiornata,
  type GiornataBozza,
} from "./generatore.js";
import type { AttivitaDaMantenere, OpzioniBozza } from "./tipi.js";

/** Causa della prima revisione. */
export const CAUSA_BOZZA_INIZIALE = "Bozza iniziale";

/** Quante alternative propone "Sostituisci". */
export const ALTERNATIVE_SOSTITUZIONE = 3;

/** Le candidate provate al massimo per trovare le alternative di "Sostituisci". */
const CANDIDATE_MASSIME_SOSTITUZIONE = 40;

/** Un problema bloccante con l'azione suggerita al viaggiatore. */
export interface SuggerimentoBozza {
  /** `id` degli elementi coinvolti (per mostrare il suggerimento sulla scheda). */
  elementi: string[];
  /** Il giorno coinvolto, se il problema riguarda un solo giorno. */
  data: Data | null;
  /** Cosa fare, in parole semplici: per esempio `Sposta "Cena in trattoria" a un altro orario`. */
  testo: string;
}

/** Una revisione della bozza (B1, B2, …). */
export interface RevisioneBozza {
  /** 1 per B1, 2 per B2, … */
  numero: number;
  /** Perché è nata, in parole semplici ("Bozza iniziale", "Sostituito … con …"). */
  causa: string;
  viaggio: Viaggio;
  /** Il profilo su cui la revisione è costruita (cambia con "Cambia preferenze"). */
  profilo: ProfiloPreferenze;
  /** La revisione a cui riporta "Annulla"; `null` per la bozza iniziale. */
  precedente: number | null;
  /** `id` degli elementi bloccati (attività irrinunciabili): le rigenerazioni non li toccano. */
  bloccate: string[];
  /** Esito del controllo di fattibilità, avvisi compresi. */
  problemi: ProblemaFattibilita[];
  /** Un'azione suggerita per ogni problema bloccante. */
  suggerimenti: SuggerimentoBozza[];
  /** Note dell'operazione per il viaggiatore (per esempio un'attività bloccata che non è più entrata). */
  avvisi: string[];
}

/** La bozza con tutte le sue revisioni: si aggiunge solo in coda. */
export interface StatoBozza {
  istantaneaId: string;
  revisioni: RevisioneBozza[];
  /** La revisione confermata (diventata versione 1); `null` finché la bozza non è confermata. */
  confermata: number | null;
}

/** Ciò che serve alle operazioni: l'istantanea della bozza e le opzioni del generatore (sorgente, arrivo, …). */
export interface ContestoBozza {
  istantanea: IstantaneaCatalogo;
  opzioni?: OpzioniBozza;
}

/** Le operazioni sulla bozza: le stesse dai pulsanti e dalla chat (CA-1). */
export type OperazioneBozza =
  | { tipo: "sostituisci"; elementoId: string; attivitaId: string }
  | { tipo: "rimuovi"; elementoId: string }
  | { tipo: "sposta"; elementoId: string; data: Data; inizio: Orario }
  /** Senza orario l'attività entra nella giornata con le regole del generatore. */
  | { tipo: "aggiungi"; attivitaId: string; data: Data; inizio?: Orario }
  | { tipo: "blocca"; elementoId: string }
  | { tipo: "sblocca"; elementoId: string }
  | { tipo: "giornata_piu_leggera"; data: Data }
  | { tipo: "giornata_piu_piena"; data: Data }
  | { tipo: "rigenera_giorno"; data: Data }
  | { tipo: "scambia_giorni"; data: Data; conData: Data }
  | { tipo: "cambia_preferenze"; profilo: ProfiloPreferenze }
  | { tipo: "alternativa" }
  | { tipo: "annulla" }
  | { tipo: "torna_alla_revisione"; numero: number };

export type TipoOperazioneBozza = OperazioneBozza["tipo"];

/** Tutti i tipi di operazione, per chi espone le operazioni (pulsanti, strumenti della chat). */
export const OPERAZIONI_BOZZA = [
  "sostituisci",
  "rimuovi",
  "sposta",
  "aggiungi",
  "blocca",
  "sblocca",
  "giornata_piu_leggera",
  "giornata_piu_piena",
  "rigenera_giorno",
  "scambia_giorni",
  "cambia_preferenze",
  "alternativa",
  "annulla",
  "torna_alla_revisione",
] as const satisfies readonly TipoOperazioneBozza[];

export type EsitoOperazioneBozza =
  | { ok: true; stato: StatoBozza; revisione: RevisioneBozza }
  | { ok: false; motivo: string };

/** Un'alternativa per "Sostituisci": collocabile nello stesso giorno al posto dell'attività. */
export interface AlternativaSostituzione {
  attivitaId: string;
  nome: string;
  /** Punteggio della §7.7 rispetto al profilo della revisione. */
  punteggio: number;
}

/** Una revisione salvata (per esempio nella base dati), da cui ricostruire lo stato. */
export interface RevisioneSalvata {
  numero: number;
  causa: string;
  viaggio: Viaggio;
  profilo: ProfiloPreferenze;
  /** Se manca: la revisione prima (`numero - 1`), oppure nessuna per B1. */
  precedente?: number | null;
}

// --- Supporto -------------------------------------------------------------------------------------------

const confronta = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const copia = <T>(valore: T): T => structuredClone(valore);
const errore = (motivo: string): EsitoOperazioneBozza => ({ ok: false, motivo });

function sorgenteDi(contesto: ContestoBozza): SorgenteDatiContesto {
  return (
    contesto.opzioni?.sorgente ??
    creaSorgenteDaDati({ tempiPercorrenza: contesto.istantanea.tempiPercorrenza, previsioni: [], chiusure: [] })
  );
}

/**
 * Le modifiche richieste ricevono il catalogo del modello: l'istantanea (§7.8) è un catalogo esteso con gli stessi
 * campi più quelli della §7.3, che le modifiche non leggono.
 */
const catalogoDi = (contesto: ContestoBozza): Catalogo => contesto.istantanea as unknown as Catalogo;

function attivitaDelCatalogo(contesto: ContestoBozza, id: string): AttivitaCatalogoEstesa | undefined {
  return contesto.istantanea.attivita.find((a) => a.id === id);
}

function nome(contesto: ContestoBozza, id: string): string {
  return attivitaDelCatalogo(contesto, id)?.nome ?? id;
}

/** Pasti e servizi non sono attività da scegliere, bloccare o sostituire. */
function eDaScegliere(contesto: ContestoBozza, id: string): boolean {
  const attivita = attivitaDelCatalogo(contesto, id);
  return attivita !== undefined && attivita.categoria !== "pasto" && attivita.categoria !== "servizio";
}

/** Le attività di un giorno (pasti e servizi esclusi), nell'ordine dell'itinerario. */
function attivitaDelGiorno(contesto: ContestoBozza, elementi: readonly Elemento[]): ElementoAttivita[] {
  return elementi.filter((e): e is ElementoAttivita => e.tipo === "attivita" && eDaScegliere(contesto, e.attivitaId));
}

/** Le attività bloccate: quelle irrinunciabili (il lucchetto le rende tali). */
export function bloccateDelViaggio(viaggio: Viaggio): string[] {
  return viaggio.giorni.flatMap((g) => g.elementi.flatMap((e) => (e.tipo === "attivita" && e.priorita === "irrinunciabile" ? [e.id] : [])));
}

function mantieniDi(viaggio: Viaggio): AttivitaDaMantenere[] {
  return viaggio.giorni.flatMap((g) =>
    g.elementi.flatMap((e) => (e.tipo === "attivita" && e.priorita === "irrinunciabile" ? [{ data: g.data, attivitaId: e.attivitaId }] : [])),
  );
}

function trovaAttivita(viaggio: Viaggio, elementoId: string): { data: Data; elemento: ElementoAttivita } | null {
  for (const giorno of viaggio.giorni)
    for (const e of giorno.elementi) if (e.id === elementoId && e.tipo === "attivita") return { data: giorno.data, elemento: e };
  return null;
}

/** L'azione suggerita per un problema bloccante, costruita dai dati (nessun codice tecnico). */
function suggerimento(contesto: ContestoBozza, viaggio: Viaggio, problema: ProblemaFattibilita): SuggerimentoBozza {
  const date = new Set<Data>();
  let attivita: ElementoAttivita | null = null;
  for (const id of problema.elementi) {
    for (const giorno of viaggio.giorni) {
      const e = giorno.elementi.find((x) => x.id === id);
      if (!e) continue;
      date.add(giorno.data);
      if (e.tipo === "attivita" && attivita === null) attivita = e;
    }
  }
  const data = date.size === 1 ? ([...date][0] ?? null) : null;
  let testo: string;
  if (attivita !== null) {
    const chi = `"${nome(contesto, attivita.attivitaId)}"`;
    testo =
      problema.codice === "LUOGO_CHIUSO"
        ? `Sposta ${chi} in un altro giorno, oppure sostituiscila`
        : problema.codice === "DURATA_INSUFFICIENTE"
          ? `Sposta ${chi} a un orario con più tempo, oppure rimuovila`
          : `Sposta ${chi} a un altro orario, oppure rigenera la giornata`;
  } else {
    testo = data === null ? "Rigenera le giornate coinvolte" : `Rigenera la giornata del ${data}`;
  }
  return { elementi: [...problema.elementi], data, testo };
}

/** Una revisione completa: controllo di fattibilità, attività bloccate e suggerimenti. */
function revisione(
  contesto: ContestoBozza,
  dati: { numero: number; causa: string; viaggio: Viaggio; profilo: ProfiloPreferenze; precedente: number | null; avvisi?: string[] },
): RevisioneBozza {
  // Il viaggio nella forma normalizzata di REQ-ITIN-001 (valori predefiniti espliciti): la stessa che si rilegge
  // dalla base dati e che diventa la versione 1 alla conferma.
  const caricato = caricaViaggio(dati.viaggio, contesto.istantanea);
  const viaggio = caricato.ok ? caricato.valore : dati.viaggio;
  const problemi = controllaFattibilita(viaggio, contesto.istantanea, sorgenteDi(contesto));
  return {
    numero: dati.numero,
    causa: dati.causa,
    viaggio,
    profilo: dati.profilo,
    precedente: dati.precedente,
    bloccate: bloccateDelViaggio(viaggio),
    problemi,
    suggerimenti: problemi.filter((p) => p.gravita === "bloccante").map((p) => suggerimento(contesto, viaggio, p)),
    avvisi: dati.avvisi ?? [],
  };
}

/** Lo stato con una revisione in più (sempre una copia: lo stato ricevuto non cambia). */
function conRevisione(
  stato: StatoBozza,
  contesto: ContestoBozza,
  causa: string,
  viaggio: Viaggio,
  profilo: ProfiloPreferenze,
  avvisi: string[] = [],
  precedente: number | null = revisioneCorrente(stato).numero,
): EsitoOperazioneBozza {
  const nuova = revisione(contesto, { numero: stato.revisioni.length + 1, causa, viaggio: copia(viaggio), profilo: copia(profilo), precedente, avvisi });
  const nuovo: StatoBozza = { ...stato, revisioni: [...stato.revisioni, nuova] };
  return { ok: true, stato: nuovo, revisione: nuova };
}

/** Il viaggio di una modifica di REQ-EDIT-001 (la proposta non viene accettata: serve solo il suo itinerario). */
function conModifica(contesto: ContestoBozza, viaggio: Viaggio, modifica: ModificaRichiesta): Viaggio | string {
  const esito = proponiModifica(viaggio, 1, catalogoDi(contesto), sorgenteDi(contesto), modifica);
  return esito.ok ? esito.proposta.itinerario : esito.errore.messaggio;
}

function giornata(
  contesto: ContestoBozza,
  revisioneCorr: RevisioneBozza,
  viaggio: Viaggio,
  data: Data,
  attivita: readonly string[],
  extra: { aggiungi?: number; escludi?: readonly string[] } = {},
): GiornataBozza | null {
  const bloccate = new Set(mantieniDi(viaggio).map((m) => m.attivitaId));
  return ricostruisciGiornata(
    revisioneCorr.profilo,
    contesto.istantanea,
    { viaggio, data, attivita, bloccate: attivita.filter((id) => bloccate.has(id)), ...extra },
    contesto.opzioni,
  );
}

function avvisiGiornata(contesto: ContestoBozza, esito: GiornataBozza, data: Data): string[] {
  const avvisi = esito.fuori.map((id) => `Il ${data} "${nome(contesto, id)}" non entra più nella giornata: l'ho tolta.`);
  for (const pasto of esito.pastiMancanti) {
    avvisi.push(`Il ${data} non ho inserito ${pasto === "pranzo" ? "il pranzo" : "la cena"}: non c'è un ristorante adatto aperto in quella fascia.`);
  }
  return avvisi;
}

const NON_TROVATA = "Non trovo questa attività nella bozza: forse è già stata tolta.";
const GIORNO_SCONOSCIUTO = (data: Data): string => `Il ${data} non è un giorno di questo viaggio.`;

// --- API pubblica -----------------------------------------------------------------------------------------

/** L'ultima revisione: quella che il viaggiatore vede e modifica. */
export function revisioneCorrente(stato: StatoBozza): RevisioneBozza {
  const ultima = stato.revisioni.at(-1);
  if (ultima === undefined) throw new Error("bozza senza revisioni: va creata con avviaBozza o ricostruita con ricostruisciStatoBozza");
  return ultima;
}

/**
 * Crea la bozza con la revisione B1 ("Bozza iniziale") dal generatore (REQ-PLAN-001).
 *
 * @throws ErroreBozza se il generatore non può partire (per esempio l'istantanea non ha alloggi).
 */
export function avviaBozza(profilo: ProfiloPreferenze, contesto: ContestoBozza): StatoBozza {
  const bozza = generaBozza(profilo, contesto.istantanea, contesto.opzioni);
  const prima = revisione(contesto, {
    numero: 1,
    causa: CAUSA_BOZZA_INIZIALE,
    viaggio: bozza.viaggio,
    profilo: copia(profilo),
    precedente: null,
    avvisi: bozza.avvisi,
  });
  return { istantaneaId: contesto.istantanea.id, revisioni: [prima], confermata: null };
}

/** Ricostruisce lo stato da revisioni salvate (problemi, bloccate e suggerimenti si ricalcolano). */
export function ricostruisciStatoBozza(
  contesto: ContestoBozza,
  revisioni: readonly RevisioneSalvata[],
  confermata: number | null = null,
): StatoBozza {
  const ordinate = [...revisioni].sort((a, b) => a.numero - b.numero);
  return {
    istantaneaId: contesto.istantanea.id,
    revisioni: ordinate.map((r) =>
      revisione(contesto, {
        numero: r.numero,
        causa: r.causa,
        viaggio: copia(r.viaggio),
        profilo: copia(r.profilo),
        precedente: r.precedente === undefined ? (r.numero > 1 ? r.numero - 1 : null) : r.precedente,
      }),
    ),
    confermata,
  };
}

/**
 * "Sostituisci": le 3 migliori alternative per punteggio (§7.7) che entrano nello stesso giorno al posto
 * dell'attività, senza far uscire le altre. Vuoto se l'elemento non è un'attività sostituibile.
 */
export function alternativeSostituzione(stato: StatoBozza, contesto: ContestoBozza, elementoId: string): AlternativaSostituzione[] {
  const corrente = revisioneCorrente(stato);
  const trovata = trovaAttivita(corrente.viaggio, elementoId);
  if (trovata === null || !eDaScegliere(contesto, trovata.elemento.attivitaId)) return [];
  const giorno = corrente.viaggio.giorni.find((g) => g.data === trovata.data);
  const delGiorno = attivitaDelGiorno(contesto, giorno?.elementi ?? []).map((e) => e.attivitaId);
  const trovate: AlternativaSostituzione[] = [];
  for (const candidata of attivitaCandidate(corrente.profilo, contesto.istantanea, corrente.viaggio).slice(0, CANDIDATE_MASSIME_SOSTITUZIONE)) {
    if (trovate.length >= ALTERNATIVE_SOSTITUZIONE) break;
    const attivita = delGiorno.map((id) => (id === trovata.elemento.attivitaId ? candidata.attivitaId : id));
    const esito = giornata(contesto, corrente, corrente.viaggio, trovata.data, attivita);
    if (esito === null || esito.fuori.length > 0) continue;
    trovate.push({ attivitaId: candidata.attivitaId, nome: nome(contesto, candidata.attivitaId), punteggio: candidata.punteggio ?? 0 });
  }
  return trovate;
}

/** Le attività che si possono aggiungere alla bozza, in ordine di punteggio (§7.7): per "Aggiungi". */
export function attivitaSuggerite(stato: StatoBozza, contesto: ContestoBozza): AlternativaSostituzione[] {
  const corrente = revisioneCorrente(stato);
  return attivitaCandidate(corrente.profilo, contesto.istantanea, corrente.viaggio).map((v) => ({
    attivitaId: v.attivitaId,
    nome: nome(contesto, v.attivitaId),
    punteggio: v.punteggio ?? 0,
  }));
}

/**
 * Applica un'operazione alla bozza (CA-1: la stessa funzione per pulsanti e chat) e restituisce lo stato con la
 * nuova revisione, oppure il motivo per cui non si può fare. Dopo la conferma nessuna operazione modifica la bozza:
 * le modifiche diventano proposte (`propostaDopoConferma`, CA-5).
 */
export function applicaOperazioneBozza(stato: StatoBozza, contesto: ContestoBozza, operazione: OperazioneBozza): EsitoOperazioneBozza {
  if (stato.confermata !== null) {
    return errore("L'itinerario è già confermato: ora ogni modifica diventa una proposta da accettare o rifiutare.");
  }
  const corrente = revisioneCorrente(stato);
  const viaggio = corrente.viaggio;
  const profilo = corrente.profilo;
  const giorno = (data: Data) => viaggio.giorni.find((g) => g.data === data);

  switch (operazione.tipo) {
    case "sostituisci": {
      const trovata = trovaAttivita(viaggio, operazione.elementoId);
      if (trovata === null || !eDaScegliere(contesto, trovata.elemento.attivitaId)) return errore(NON_TROVATA);
      if (!eDaScegliere(contesto, operazione.attivitaId)) return errore("Questa attività non si trova tra quelle della destinazione.");
      const delGiorno = attivitaDelGiorno(contesto, giorno(trovata.data)?.elementi ?? []).map((e) => e.attivitaId);
      if (delGiorno.includes(operazione.attivitaId)) return errore(`"${nome(contesto, operazione.attivitaId)}" è già in questa giornata.`);
      const attivita = delGiorno.map((id) => (id === trovata.elemento.attivitaId ? operazione.attivitaId : id));
      const esito = giornata(contesto, corrente, viaggio, trovata.data, attivita);
      if (esito === null || esito.fuori.length > 0) {
        return errore(`"${nome(contesto, operazione.attivitaId)}" non entra in questa giornata al posto di "${nome(contesto, trovata.elemento.attivitaId)}".`);
      }
      const causa = `Sostituito "${nome(contesto, trovata.elemento.attivitaId)}" con "${nome(contesto, operazione.attivitaId)}" il ${trovata.data}`;
      return conRevisione(stato, contesto, causa, esito.viaggio, profilo, avvisiGiornata(contesto, esito, trovata.data));
    }
    case "rimuovi": {
      const trovata = trovaAttivita(viaggio, operazione.elementoId);
      if (trovata === null) return errore(NON_TROVATA);
      const nuovo = conModifica(contesto, viaggio, { operazione: "rimuovi", elementoId: operazione.elementoId });
      if (typeof nuovo === "string") return errore(nuovo);
      return conRevisione(stato, contesto, `Tolto "${nome(contesto, trovata.elemento.attivitaId)}" dal ${trovata.data}`, nuovo, profilo);
    }
    case "sposta": {
      const trovata = trovaAttivita(viaggio, operazione.elementoId);
      if (trovata === null) return errore(NON_TROVATA);
      if (!giorno(operazione.data)) return errore(GIORNO_SCONOSCIUTO(operazione.data));
      const nuovo = conModifica(contesto, viaggio, {
        operazione: "sposta",
        elementoId: operazione.elementoId,
        data: operazione.data,
        inizio: operazione.inizio,
      });
      if (typeof nuovo === "string") return errore(nuovo);
      const causa = `Spostato "${nome(contesto, trovata.elemento.attivitaId)}" al ${operazione.data} alle ${operazione.inizio}`;
      return conRevisione(stato, contesto, causa, nuovo, profilo);
    }
    case "aggiungi": {
      const g = giorno(operazione.data);
      if (!g) return errore(GIORNO_SCONOSCIUTO(operazione.data));
      if (!attivitaDelCatalogo(contesto, operazione.attivitaId)) return errore("Questa attività non si trova tra quelle della destinazione.");
      const causa = `Aggiunto "${nome(contesto, operazione.attivitaId)}" il ${operazione.data}`;
      if (operazione.inizio !== undefined) {
        const nuovo = conModifica(contesto, viaggio, {
          operazione: "aggiungi",
          data: operazione.data,
          attivitaId: operazione.attivitaId,
          inizio: operazione.inizio,
        });
        if (typeof nuovo === "string") return errore(nuovo);
        return conRevisione(stato, contesto, `${causa} alle ${operazione.inizio}`, nuovo, profilo);
      }
      if (!eDaScegliere(contesto, operazione.attivitaId)) return errore("Per aggiungere un pasto indica anche l'orario.");
      const delGiorno = attivitaDelGiorno(contesto, g.elementi).map((e) => e.attivitaId);
      if (delGiorno.includes(operazione.attivitaId)) return errore(`"${nome(contesto, operazione.attivitaId)}" è già in questa giornata.`);
      const esito = giornata(contesto, corrente, viaggio, operazione.data, [...delGiorno, operazione.attivitaId]);
      if (esito === null || esito.fuori.length > 0) {
        return errore(`"${nome(contesto, operazione.attivitaId)}" non entra in questa giornata: prova un altro giorno o indica un orario.`);
      }
      return conRevisione(stato, contesto, causa, esito.viaggio, profilo, avvisiGiornata(contesto, esito, operazione.data));
    }
    case "blocca":
    case "sblocca": {
      const trovata = trovaAttivita(viaggio, operazione.elementoId);
      if (trovata === null || !eDaScegliere(contesto, trovata.elemento.attivitaId)) {
        return errore("Si possono bloccare solo le attività della bozza (non i pasti né gli spostamenti).");
      }
      const blocca = operazione.tipo === "blocca";
      const giaBloccata = trovata.elemento.priorita === "irrinunciabile";
      if (blocca === giaBloccata) return errore(blocca ? "Questa attività è già bloccata." : "Questa attività non è bloccata.");
      const nuovo = conModifica(contesto, viaggio, {
        operazione: "cambia_priorita",
        elementoId: operazione.elementoId,
        priorita: blocca ? "irrinunciabile" : "desiderata",
      });
      if (typeof nuovo === "string") return errore(nuovo);
      const chi = `"${nome(contesto, trovata.elemento.attivitaId)}"`;
      return conRevisione(stato, contesto, blocca ? `Bloccato ${chi}` : `Sbloccato ${chi}`, nuovo, profilo);
    }
    case "giornata_piu_leggera": {
      const g = giorno(operazione.data);
      if (!g) return errore(GIORNO_SCONOSCIUTO(operazione.data));
      const punteggio = (id: string): number => {
        const attivita = attivitaDelCatalogo(contesto, id);
        return attivita ? (valutaAttivita(attivita, profilo).punteggio ?? 0) : 0;
      };
      const candidata = attivitaDelGiorno(contesto, g.elementi)
        .filter((e) => e.priorita !== "irrinunciabile" && e.orarioFisso !== true)
        .sort((a, b) => punteggio(a.attivitaId) - punteggio(b.attivitaId) || confronta(a.attivitaId, b.attivitaId))[0];
      if (!candidata) return errore(`Il ${operazione.data} non c'è un'attività da togliere: quelle rimaste sono bloccate.`);
      const nuovo = conModifica(contesto, viaggio, { operazione: "rimuovi", elementoId: candidata.id });
      if (typeof nuovo === "string") return errore(nuovo);
      const causa = `Giornata del ${operazione.data} più leggera: tolto "${nome(contesto, candidata.attivitaId)}"`;
      return conRevisione(stato, contesto, causa, nuovo, profilo);
    }
    case "giornata_piu_piena": {
      const g = giorno(operazione.data);
      if (!g) return errore(GIORNO_SCONOSCIUTO(operazione.data));
      const delGiorno = attivitaDelGiorno(contesto, g.elementi).map((e) => e.attivitaId);
      const esito = giornata(contesto, corrente, viaggio, operazione.data, delGiorno, { aggiungi: 1 });
      const aggiunta = esito?.aggiunte[0];
      if (esito === null || aggiunta === undefined || esito.fuori.length > 0) {
        return errore(`Il ${operazione.data} non trovo un'altra attività adatta a te che entri nella giornata.`);
      }
      const causa = `Giornata del ${operazione.data} più piena: aggiunto "${nome(contesto, aggiunta)}"`;
      return conRevisione(stato, contesto, causa, esito.viaggio, profilo, avvisiGiornata(contesto, esito, operazione.data));
    }
    case "rigenera_giorno": {
      const indice = viaggio.giorni.findIndex((x) => x.data === operazione.data);
      const g = viaggio.giorni[indice];
      if (!g) return errore(GIORNO_SCONOSCIUTO(operazione.data));
      const attuali = attivitaDelGiorno(contesto, g.elementi);
      const bloccate = attuali.filter((e) => e.priorita === "irrinunciabile").map((e) => e.attivitaId);
      const altre = attuali.filter((e) => e.priorita !== "irrinunciabile").map((e) => e.attivitaId);
      const primo = viaggio.giorni[0];
      const conArrivo = primo !== undefined && primo.alloggio !== undefined && primo.luogoPartenza !== primo.alloggio;
      const previste = attivitaPrevistePerGiorno(profilo, conArrivo)[indice] ?? attuali.length;
      const aggiungi = Math.max(0, previste - bloccate.length);
      // Prima senza le attività di adesso (così la giornata cambia davvero); se ne entrano meno, anche con quelle.
      const nuova = giornata(contesto, corrente, viaggio, operazione.data, bloccate, { aggiungi, escludi: altre });
      const conAttuali = giornata(contesto, corrente, viaggio, operazione.data, bloccate, { aggiungi });
      const conta = (e: GiornataBozza | null): number => (e === null ? -1 : bloccate.length - e.fuori.length + e.aggiunte.length);
      const esito = conta(nuova) >= Math.min(previste, conta(conAttuali)) ? nuova : conAttuali;
      if (esito === null) return errore(GIORNO_SCONOSCIUTO(operazione.data));
      return conRevisione(stato, contesto, `Rigenerata la giornata del ${operazione.data}`, esito.viaggio, profilo, avvisiGiornata(contesto, esito, operazione.data));
    }
    case "scambia_giorni": {
      const a = giorno(operazione.data);
      const b = giorno(operazione.conData);
      if (!a) return errore(GIORNO_SCONOSCIUTO(operazione.data));
      if (!b) return errore(GIORNO_SCONOSCIUTO(operazione.conData));
      if (a.data === b.data) return errore("Scegli due giorni diversi da scambiare.");
      const diA = attivitaDelGiorno(contesto, a.elementi).map((e) => e.attivitaId);
      const diB = attivitaDelGiorno(contesto, b.elementi).map((e) => e.attivitaId);
      const bloccateA = attivitaDelGiorno(contesto, a.elementi).filter((e) => e.priorita === "irrinunciabile").map((e) => e.attivitaId);
      const bloccateB = attivitaDelGiorno(contesto, b.elementi).filter((e) => e.priorita === "irrinunciabile").map((e) => e.attivitaId);
      const profiloCorrente = corrente.profilo;
      const primo = ricostruisciGiornata(profiloCorrente, contesto.istantanea, { viaggio, data: a.data, attivita: diB, bloccate: bloccateB }, contesto.opzioni);
      if (primo === null) return errore(GIORNO_SCONOSCIUTO(a.data));
      const secondo = ricostruisciGiornata(
        profiloCorrente,
        contesto.istantanea,
        { viaggio: primo.viaggio, data: b.data, attivita: diA, bloccate: bloccateA },
        contesto.opzioni,
      );
      if (secondo === null) return errore(GIORNO_SCONOSCIUTO(b.data));
      const avvisi = [...avvisiGiornata(contesto, primo, a.data), ...avvisiGiornata(contesto, secondo, b.data)];
      return conRevisione(stato, contesto, `Scambiati i giorni ${a.data} e ${b.data}`, secondo.viaggio, profilo, avvisi);
    }
    case "cambia_preferenze": {
      const bozza = generaBozza(operazione.profilo, contesto.istantanea, {
        ...contesto.opzioni,
        idViaggio: viaggio.id,
        titolo: viaggio.titolo,
        mantieni: mantieniDi(viaggio),
      });
      const causa = "Cambiate le preferenze: rigenerato il viaggio tenendo le attività bloccate";
      return conRevisione(stato, contesto, causa, bozza.viaggio, operazione.profilo, bozza.avvisi);
    }
    case "alternativa": {
      const bozza = generaAlternativa(profilo, contesto.istantanea, viaggio, {
        ...contesto.opzioni,
        idViaggio: viaggio.id,
        titolo: viaggio.titolo,
        mantieni: mantieniDi(viaggio),
      });
      return conRevisione(stato, contesto, "Un'alternativa con attività diverse, tenendo quelle bloccate", bozza.viaggio, profilo, bozza.avvisi);
    }
    case "annulla": {
      if (corrente.precedente === null) return errore("Non c'è nessuna modifica da annullare: questa è la bozza iniziale.");
      const bersaglio = stato.revisioni.find((r) => r.numero === corrente.precedente);
      if (!bersaglio) return errore("Non trovo la revisione a cui tornare.");
      const causa = `Annullata la modifica "${corrente.causa}": tornato alla revisione B${bersaglio.numero}`;
      return conRevisione(stato, contesto, causa, bersaglio.viaggio, bersaglio.profilo, [], bersaglio.precedente);
    }
    case "torna_alla_revisione": {
      const bersaglio = stato.revisioni.find((r) => r.numero === operazione.numero);
      if (!bersaglio) return errore(`La revisione B${operazione.numero} non esiste.`);
      if (bersaglio.numero === corrente.numero) return errore(`Sei già sulla revisione B${bersaglio.numero}.`);
      return conRevisione(stato, contesto, `Tornato alla revisione B${bersaglio.numero}`, bersaglio.viaggio, bersaglio.profilo);
    }
  }
}

/** Confronta due revisioni con lo stesso confronto delle versioni (REQ-ITIN-002); `null` se una non esiste. */
export function confrontaRevisioni(stato: StatoBozza, da: number, a: number): DifferenzaItinerari | null {
  const prima = stato.revisioni.find((r) => r.numero === da);
  const dopo = stato.revisioni.find((r) => r.numero === a);
  return prima && dopo ? confrontaItinerari(prima.viaggio, dopo.viaggio) : null;
}

export type EsitoConfermaBozza = { ok: true; stato: StatoBozza; storico: Storico } | { ok: false; motivo: string };

/**
 * "Conferma l'itinerario": l'ultima revisione diventa la versione 1 dello storico (REQ-ITIN-002, CA-4). Le revisioni
 * restano consultabili; da qui in poi le modifiche sono proposte (CA-5).
 */
export function confermaBozza(stato: StatoBozza): EsitoConfermaBozza {
  if (stato.confermata !== null) return { ok: false, motivo: "L'itinerario è già confermato." };
  const corrente = revisioneCorrente(stato);
  const creato = creaStorico(corrente.viaggio);
  if (!creato.ok) return { ok: false, motivo: creato.errore.messaggio };
  return { ok: true, stato: { ...stato, confermata: corrente.numero }, storico: creato.storico };
}

export type EsitoPropostaBozza = { ok: true; proposta: Proposta } | { ok: false; motivo: string };

/**
 * Dopo la conferma (CA-5): l'operazione diventa una proposta sulla versione corrente dello storico (REQ-EDIT-001 e
 * REQ-EDIT-002), da accettare con `applicaProposta` o rifiutare con `rifiutaProposta`. Le operazioni che riscrivono
 * tutta la bozza (cambia preferenze, alternativa, annulla, torna a una revisione) non sono più disponibili.
 */
export function propostaDopoConferma(storico: Storico, contesto: ContestoBozza, operazione: OperazioneBozza): EsitoPropostaBozza {
  const corrente = versioneCorrente(storico);
  const sorgente = sorgenteDi(contesto);
  const daModifica = (esito: EsitoModifica | EsitoModificaOndata2): EsitoPropostaBozza =>
    esito.ok ? { ok: true, proposta: esito.proposta } : { ok: false, motivo: esito.errore.messaggio };
  const modifica = (m: ModificaRichiesta): EsitoPropostaBozza =>
    daModifica(proponiModifica(corrente.viaggio, corrente.numero, catalogoDi(contesto), sorgente, m));
  switch (operazione.tipo) {
    case "rimuovi":
      return modifica({ operazione: "rimuovi", elementoId: operazione.elementoId });
    case "sposta":
      return modifica({ operazione: "sposta", elementoId: operazione.elementoId, data: operazione.data, inizio: operazione.inizio });
    case "aggiungi":
      if (operazione.inizio === undefined) return { ok: false, motivo: "Indica l'orario a cui aggiungere l'attività." };
      return modifica({ operazione: "aggiungi", data: operazione.data, attivitaId: operazione.attivitaId, inizio: operazione.inizio });
    case "blocca":
    case "sblocca":
      return modifica({
        operazione: "cambia_priorita",
        elementoId: operazione.elementoId,
        priorita: operazione.tipo === "blocca" ? "irrinunciabile" : "desiderata",
      });
    case "giornata_piu_leggera":
    case "giornata_piu_piena":
      return daModifica(
        proponiModificaOndata2(corrente.viaggio, corrente.numero, catalogoDi(contesto), sorgente, {
          operazione: "cambia_ritmo",
          data: operazione.data,
          ritmo: operazione.tipo === "giornata_piu_leggera" ? "piu_leggero" : "piu_pieno",
        }),
      );
    case "rigenera_giorno":
      return daModifica(
        proponiModificaOndata2(corrente.viaggio, corrente.numero, catalogoDi(contesto), sorgente, {
          operazione: "rigenera_giorno",
          data: operazione.data,
        }),
      );
    default:
      return { ok: false, motivo: "Ora che l'itinerario è confermato questa operazione non è più disponibile: chiedi una modifica puntuale." };
  }
}
