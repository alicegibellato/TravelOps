/**
 * Tipi dello storico delle versioni (REQ-ITIN-002): versione, voce dell'elenco, differenza tra versioni,
 * segnalazioni (errori e avvisi) ed esiti delle operazioni.
 */
import type { Data, Elemento, Orario, OrigineProposta, Prenotazione, Problema, Viaggio } from "../model/index.js";

/** Momento (data e ora) in cui una proposta viene accettata. È sempre un input: il motore non legge l'orologio. */
export interface Momento {
  /** Data `AAAA-MM-GG`. */
  data: Data;
  /** Ora `HH:mm`, da `00:00` a `23:59`. */
  ora: Orario;
}

/** Causa della versione 1 (R-1). */
export const CAUSA_ITINERARIO_INIZIALE = "Itinerario iniziale";

/** Un elemento con la data del giorno in cui si trova. */
export interface ElementoDatato {
  data: Data;
  elemento: Elemento;
}

/** Campi confrontati tra due versioni di uno stesso elemento, in quest'ordine. `data` è la data del giorno. */
export const CAMPI_ELEMENTO = [
  "data",
  "tipo",
  "inizio",
  "fine",
  "orarioFisso",
  "prenotazione",
  "attivitaId",
  "priorita",
  "da",
  "a",
  "mezzo",
] as const;

export type CampoElemento = (typeof CAMPI_ELEMENTO)[number];

/** Valore di un campo; `null` se il campo non c'è (per esempio `mezzo` in un'attività o una prenotazione assente). */
export type ValoreCampo = string | boolean | Prenotazione | null;

export interface CampoCambiato {
  campo: CampoElemento;
  prima: ValoreCampo;
  dopo: ValoreCampo;
}

/** Elemento presente in entrambe le versioni (stesso `id`) con almeno un campo diverso (R-4). */
export interface ElementoCambiato {
  id: string;
  prima: ElementoDatato;
  dopo: ElementoDatato;
  /** Solo i campi diversi, nell'ordine di `CAMPI_ELEMENTO`. */
  campi: CampoCambiato[];
}

/**
 * Differenze tra due itinerari, per `id` degli elementi (R-4).
 * Aggiunti e modificati sono nell'ordine dell'itinerario più recente, rimossi in quello del più vecchio.
 */
export interface DifferenzaItinerari {
  aggiunti: ElementoDatato[];
  rimossi: ElementoDatato[];
  modificati: ElementoCambiato[];
}

/** Risultato del confronto tra la versione A e la versione B. */
export interface ConfrontoVersioni extends DifferenzaItinerari {
  versioneA: number;
  versioneB: number;
}

/** Una versione dell'itinerario. Una volta creata non cambia più (R-2): l'oggetto è congelato. */
export interface Versione {
  readonly numero: number;
  /** Momento dell'accettazione; `null` nella versione 1. */
  readonly momento: Momento | null;
  readonly causa: string;
  /** Imprevisto o modifica richiesta da cui nasce la proposta; `null` nella versione 1. */
  readonly origine: OrigineProposta | null;
  /** Chi ha accettato la proposta; `null` nella versione 1. */
  readonly autore: string | null;
  /** Se la proposta accettata era fattibile (R-8); `null` nella versione 1, che non nasce da una proposta. */
  readonly propostaFattibile: boolean | null;
  /** Problemi di fattibilità della proposta accettata; vuoto nella versione 1. */
  readonly problemi: readonly Problema[];
  /** Modifiche rispetto alla versione precedente; vuote nella versione 1. */
  readonly modifiche: DifferenzaItinerari;
  /** Il viaggio di questa versione. */
  readonly viaggio: Viaggio;
}

/** Storico delle versioni di un viaggio: numeri consecutivi da 1, l'ultima è la corrente. Congelato. */
export interface Storico {
  readonly versioni: readonly Versione[];
}

/** Riga dell'elenco delle versioni. */
export interface VoceStorico {
  numero: number;
  momento: Momento | null;
  causa: string;
  autore: string | null;
}

/** Codici di errore e di avviso del modulo history. */
export const CODICI_STORICO = [
  "PROPOSTA_SUPERATA",
  "NESSUNA_MODIFICA",
  "PROPOSTA_NON_VALIDA",
  "ACCETTAZIONE_NON_VALIDA",
  "VIAGGIO_NON_VALIDO",
  "VERSIONE_INESISTENTE",
  "STORICO_NON_VALIDO",
] as const;

export type CodiceStorico = (typeof CODICI_STORICO)[number];

/** Errore o avviso del modulo history, con messaggio in italiano. */
export interface SegnalazioneStorico {
  codice: CodiceStorico;
  /** Messaggio completo: `[CODICE] motivo`. */
  messaggio: string;
  /** Dettagli, per esempio gli errori di validazione di un itinerario o di un file importato. */
  dettagli: string[];
}

/** Esito di un'operazione che restituisce uno storico (creazione, importazione). */
export type EsitoStorico = { ok: true; storico: Storico } | { ok: false; errore: SegnalazioneStorico };

/** Esito dell'accettazione di una proposta. Se non si crea una versione, lo storico restituito è quello ricevuto. */
export type EsitoApplicazione =
  | { esito: "versione_creata"; storico: Storico; versione: Versione }
  /** `NESSUNA_MODIFICA` (R-7). */
  | { esito: "avviso"; storico: Storico; avviso: SegnalazioneStorico }
  /** `PROPOSTA_SUPERATA` (R-5), `ACCETTAZIONE_NON_VALIDA`, `PROPOSTA_NON_VALIDA`. */
  | { esito: "errore"; storico: Storico; errore: SegnalazioneStorico };

/** Esito del rifiuto di una proposta: nessuna versione, lo storico è quello ricevuto (R-6). */
export interface EsitoRifiuto {
  esito: "rifiutata";
  storico: Storico;
}

export type EsitoLettura = { ok: true; viaggio: Viaggio } | { ok: false; errore: SegnalazioneStorico };

export type EsitoConfronto = { ok: true; confronto: ConfrontoVersioni } | { ok: false; errore: SegnalazioneStorico };
