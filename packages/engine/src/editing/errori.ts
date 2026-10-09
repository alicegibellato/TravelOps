/**
 * Errori delle modifiche richieste (REQ-EDIT-001 R-ED-1): quando c'è un errore non nasce nessuna proposta.
 */

/** Codici di errore, nell'ordine di R-ED-1. */
export const CODICI_ERRORE_MODIFICA = [
  "GIORNO_INESISTENTE",
  "ATTIVITA_INESISTENTE",
  "ELEMENTO_INESISTENTE",
  "NON_ATTIVITA",
  "ORARIO_FISSO",
  "ORARIO_NON_VALIDO",
  "PERCORSO_SCONOSCIUTO",
  "FUORI_GIORNATA",
] as const;

export type CodiceErroreModifica = (typeof CODICI_ERRORE_MODIFICA)[number];

/** Errore di una modifica richiesta, con messaggio in italiano. */
export interface ErroreModifica {
  codice: CodiceErroreModifica;
  /** Il motivo, in linguaggio semplice. */
  motivo: string;
  /** Messaggio completo: `[CODICE] motivo`. */
  messaggio: string;
}

export function erroreModifica(codice: CodiceErroreModifica, motivo: string): ErroreModifica {
  return { codice, motivo, messaggio: `[${codice}] ${motivo}` };
}
