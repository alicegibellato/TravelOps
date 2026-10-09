/**
 * Errori di validità strutturale di viaggio e catalogo (REQ-ITIN-001, regole R-1…R-8).
 */

/** Codici degli errori, nell'ordine delle regole R-1…R-8. */
export const CODICI_ERRORE = [
  "CAMPO_MANCANTE",
  "ORARIO_NON_VALIDO",
  "FUORI_GIORNATA",
  "ORDINE_NON_VALIDO",
  "ID_DUPLICATO",
  "RIFERIMENTO_INESISTENTE",
  "GIORNI_NON_VALIDI",
  "VALORE_NON_VALIDO",
] as const;

export type CodiceErrore = (typeof CODICI_ERRORE)[number];

/** Una violazione delle regole di validità: codice, chi è coinvolto e perché. */
export interface ErroreValidazione {
  codice: CodiceErrore;
  /**
   * Chi è coinvolto: `id` dell'elemento, data del giorno, `id` della zona, del luogo o
   * dell'attività del catalogo, `id` del viaggio. Se l'`id` stesso manca, la posizione nel JSON
   * (per esempio `giorni[1].elementi[2]`); per il documento intero `viaggio` o `catalogo`.
   */
  id: string;
  /** Posizione del campo nel JSON, per esempio `giorni[1].elementi[2].inizio`; vuota per il documento intero. */
  percorso: string;
  /** Il motivo, in italiano. */
  motivo: string;
  /** Messaggio completo in italiano: codice, elemento coinvolto e motivo. */
  messaggio: string;
}

/** Esito di un caricamento: il valore letto, oppure tutti gli errori trovati. Non solleva mai eccezioni. */
export type RisultatoCaricamento<T> =
  | { ok: true; valore: T }
  | { ok: false; errori: ErroreValidazione[] };

export function creaErrore(codice: CodiceErrore, id: string, percorso: string, motivo: string): ErroreValidazione {
  return { codice, id, percorso, motivo, messaggio: `[${codice}] ${id}: ${motivo}` };
}
