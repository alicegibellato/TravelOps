/**
 * Impostazioni salvate (REQ-DATA-001): coppie chiave → valore JSON, per esempio quelle della modalità
 * presentazione (orologio simulato, scenario in corso) e i segni del primo avvio.
 */
import type { BaseDati, Riga } from "./connessione";

/** Il valore salvato con quella chiave (già decodificato), oppure `undefined` se non c'è. */
export function leggiImpostazione(db: BaseDati, chiave: string): unknown {
  const riga = db.prepare<unknown[], Riga>("SELECT valore_json FROM impostazioni WHERE chiave = ?").get(chiave);
  if (riga === undefined) return undefined;
  try {
    return JSON.parse(String(riga.valore_json)) as unknown;
  } catch {
    throw new Error(`l'impostazione "${chiave}" non contiene JSON valido`);
  }
}

/** Salva (o sostituisce) il valore con quella chiave. */
export function scriviImpostazione(db: BaseDati, chiave: string, valore: unknown): void {
  db.prepare<unknown[], Riga>("INSERT INTO impostazioni (chiave, valore_json) VALUES (?, ?) ON CONFLICT (chiave) DO UPDATE SET valore_json = excluded.valore_json").run(
    chiave,
    JSON.stringify(valore),
  );
}

export function eliminaImpostazione(db: BaseDati, chiave: string): void {
  db.prepare<unknown[], Riga>("DELETE FROM impostazioni WHERE chiave = ?").run(chiave);
}
