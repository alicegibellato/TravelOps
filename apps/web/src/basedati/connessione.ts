/**
 * Il file della base dati e la connessione (REQ-DATA-001).
 *
 * SQLite con `better-sqlite3`, come chiede il requisito: API sincrona, transazioni, istruzioni preparate con parametri.
 * Ogni operazione apre il database, lavora e lo chiude: nessuna connessione resta aperta tra una richiesta e
 * l'altra, quindi il file si può copiare o cancellare a web app ferma e i test lavorano su cartelle temporanee.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";

export type BaseDati = Database.Database;

/** Una riga letta dal database: colonna → valore. */
export type Riga = Record<string, unknown>;

/** Il nome del file: `apps/web/.data/travelops.db`, escluso da Git. */
export const NOME_FILE_BASE_DATI = "travelops.db";

/** Attesa massima (in millisecondi) se un altro processo sta scrivendo. */
const ATTESA_MASSIMA_MS = 5000;

export function fileBaseDati(cartella: string): string {
  return join(cartella, NOME_FILE_BASE_DATI);
}

/** Apre (o crea) il file nella cartella, con le chiavi esterne attive. Non applica migrazioni. */
export function apriFile(cartella: string): BaseDati {
  mkdirSync(cartella, { recursive: true });
  const db = new Database(fileBaseDati(cartella), { timeout: ATTESA_MASSIMA_MS });
  try {
    db.exec("PRAGMA foreign_keys = ON");
  } catch (errore) {
    db.close();
    throw errore;
  }
  return db;
}

/** Esegue `lavoro` in una transazione: tutto o niente. Le transazioni annidate riusano quella esterna. */
export function inTransazione<T>(db: BaseDati, lavoro: () => T): T {
  if (db.inTransaction) return lavoro();
  db.exec("BEGIN IMMEDIATE");
  try {
    const risultato = lavoro();
    db.exec("COMMIT");
    return risultato;
  } catch (errore) {
    if (db.inTransaction) db.exec("ROLLBACK");
    throw errore;
  }
}
