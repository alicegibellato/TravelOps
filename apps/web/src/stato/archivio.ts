/**
 * Dove si salva lo stato della web app: la base dati SQLite `apps/web/.data/travelops.db`, esclusa da Git
 * (REQ-DATA-001, al posto del file JSON di REQ-WEB-002). Si rilegge a ogni richiesta, quindi lo stato sopravvive al
 * riavvio della web app (REQ-DATA-001 CA-2, REQ-WEB-002 CA-8).
 */
import { join } from "node:path";
import { fileBaseDati } from "../basedati";
import { usaBaseDati } from "./avvio";
import { leggiStatoDemo, salvaStatoDemo } from "./presentazione";
import type { EsitoLetturaStato, StatoDemo } from "./stato";

export { fileBaseDati };

/**
 * La cartella dei dati locali: `.data` nella cartella della web app, che è la cartella di lavoro di Next.js
 * (`scripts/next.mjs` avvia la CLI da lì). `TRAVELOPS_DATI` la sostituisce (per esempio i test nel browser usano
 * una cartella temporanea, così non toccano i dati di chi sviluppa).
 */
export function cartellaDati(): string {
  const scelta = process.env.TRAVELOPS_DATI?.trim();
  return scelta !== undefined && scelta !== "" ? scelta : join(process.cwd(), ".data");
}

/**
 * Prepara la base dati all'avvio della web app (`instrumentation.ts`): al primo avvio la crea con i viaggi demo e
 * importa il vecchio file JSON; dalle volte successive applica solo le migrazioni mancanti.
 */
export function preparaBaseDati(cartella: string): void {
  usaBaseDati(cartella, () => undefined);
}

/**
 * Lo stato salvato. Al primo avvio la base dati viene creata con i viaggi demo, quindi lo stato è quello iniziale
 * (versione 1 di riferimento). Non solleva eccezioni: dati non validi o una base dati illeggibile danno il motivo.
 */
export function leggiStato(cartella: string): EsitoLetturaStato {
  try {
    return usaBaseDati(cartella, leggiStatoDemo);
  } catch (errore) {
    return { ok: false, motivo: `la base dati non si può leggere (${(errore as Error).message})` };
  }
}

/** Salva lo stato nella base dati, tutto insieme: o è salvato per intero, o non cambia nulla. */
export function salvaStato(cartella: string, stato: StatoDemo): void {
  usaBaseDati(cartella, (db) => salvaStatoDemo(db, stato));
}
