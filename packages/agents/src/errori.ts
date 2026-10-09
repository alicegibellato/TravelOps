/**
 * Errori del pacchetto. Nessun errore porta con sé la chiave, le intestazioni HTTP o il messaggio originale
 * del fornitore (che può citare parti della chiave, per esempio "Incorrect API key provided: sk-…").
 */

/** Il messaggio per il viaggiatore quando l'AI non c'è (REQ-ORCH-001, CA-3): la chat lo mostra così com'è. */
export const MESSAGGIO_AI_NON_DISPONIBILE = "La chat non è disponibile in questo momento: puoi continuare con i pulsanti";

/** Perché l'AI non è disponibile. */
export type CausaAiNonDisponibile =
  /** `OPENAI_API_KEY` assente o vuota. */
  | "chiave_mancante"
  /** Chiave rifiutata o senza permessi (401, 403). */
  | "autenticazione"
  /** Troppe richieste o credito esaurito (429). */
  | "limite"
  /** Rete assente, tempo scaduto, connessione interrotta. */
  | "rete"
  /** Errore del servizio (5xx, risposta fallita, evento di errore nello streaming). */
  | "servizio"
  /** Richiesta rifiutata (400, 404, 422: per esempio modello inesistente o schema di uno strumento non valido). */
  | "richiesta"
  /** Richiesta interrotta da chi l'ha fatta (`segnale`). */
  | "annullata";

/** Dettagli di un errore "AI non disponibile", senza segreti. */
export interface DettagliAiNonDisponibile {
  /** Stato HTTP, se c'è. */
  readonly stato?: number;
  /** Codice d'errore del fornitore (per esempio `invalid_api_key`), se c'è: mai il suo messaggio. */
  readonly codice?: string;
}

/**
 * L'AI non è disponibile: chiave mancante o errore dell'API. La chat mostra `messaggioUtente`; il resto dell'app
 * continua a funzionare. `message` è per i log, in italiano e senza segreti.
 */
export class ErroreAiNonDisponibile extends Error {
  override readonly name = "ErroreAiNonDisponibile";
  readonly causa: CausaAiNonDisponibile;
  readonly stato: number | undefined;
  readonly codice: string | undefined;
  /** Il testo da mostrare al viaggiatore: sempre `MESSAGGIO_AI_NON_DISPONIBILE`. */
  readonly messaggioUtente = MESSAGGIO_AI_NON_DISPONIBILE;

  constructor(causa: CausaAiNonDisponibile, dettagli: DettagliAiNonDisponibile = {}) {
    const parti = [`AI non disponibile (${causa})`];
    if (dettagli.stato !== undefined) parti.push(`stato HTTP ${dettagli.stato}`);
    if (dettagli.codice !== undefined) parti.push(`codice ${dettagli.codice}`);
    super(parti.join(", "));
    this.causa = causa;
    this.stato = dettagli.stato;
    this.codice = dettagli.codice;
  }
}

/** Il client finto ha ricevuto una richiesta che la conversazione registrata non prevede: è un errore del test. */
export class ErroreConversazioneNonRegistrata extends Error {
  override readonly name = "ErroreConversazioneNonRegistrata";
}

/** Una conversazione registrata non è valida (file JSON scritto male). */
export class ErroreConversazioneNonValida extends Error {
  override readonly name = "ErroreConversazioneNonValida";
}
