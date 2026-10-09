/**
 * Il client dall'ambiente del server (REQ-ORCH-001 CA-3): con `OPENAI_API_KEY` c'è il client OpenAI, senza c'è lo
 * stato "non disponibile" con il messaggio per il viaggiatore, e nessun errore blocca il resto dell'app.
 *
 * Solo lato server: la web app (Next.js) carica `apps/web/.env.local` in `process.env` del server, mai nel browser
 * (le variabili non hanno il prefisso `NEXT_PUBLIC_`).
 */
import { MESSAGGIO_AI_NON_DISPONIBILE } from "./errori.js";
import type { ClienteModello } from "./modello.js";
import { creaClienteOpenAI, MODELLO_PREDEFINITO, type OpzioniClienteOpenAI } from "./openai.js";

/** Le variabili d'ambiente lette. */
export const VARIABILE_CHIAVE = "OPENAI_API_KEY";
export const VARIABILE_MODELLO = "TRAVELOPS_MODEL";

/** L'AI è disponibile: ecco il client. */
export interface ClienteDisponibile {
  readonly disponibile: true;
  readonly cliente: ClienteModello;
  readonly modello: string;
}

/** L'AI non è disponibile: la chat mostra `messaggio`, il resto dell'app funziona. */
export interface ClienteNonDisponibile {
  readonly disponibile: false;
  readonly motivo: "chiave_mancante";
  /** Sempre `MESSAGGIO_AI_NON_DISPONIBILE`. */
  readonly messaggio: string;
}

export type StatoClienteModello = ClienteDisponibile | ClienteNonDisponibile;

/** Le variabili d'ambiente, come `process.env`. */
export type Ambiente = Readonly<Record<string, string | undefined>>;

/** Opzioni in più per il client OpenAI (nei test: un fetch finto). */
export type OpzioniDaAmbiente = Omit<OpzioniClienteOpenAI, "chiaveApi" | "modello">;

/**
 * Crea il client del modello dalle variabili d'ambiente del server: `OPENAI_API_KEY` (obbligatoria per avere l'AI) e
 * `TRAVELOPS_MODEL` (facoltativa, predefinito `gpt-6-luna`). Non fa chiamate di rete e non solleva errori: senza
 * chiave (assente o vuota) restituisce lo stato "non disponibile".
 */
export function creaClienteDaAmbiente(ambiente: Ambiente = process.env, opzioni: OpzioniDaAmbiente = {}): StatoClienteModello {
  const chiave = ambiente[VARIABILE_CHIAVE]?.trim() ?? "";
  if (chiave === "") return { disponibile: false, motivo: "chiave_mancante", messaggio: MESSAGGIO_AI_NON_DISPONIBILE };
  const modello = ambiente[VARIABILE_MODELLO]?.trim() || MODELLO_PREDEFINITO;
  return { disponibile: true, cliente: creaClienteOpenAI({ ...opzioni, chiaveApi: chiave, modello }), modello };
}
