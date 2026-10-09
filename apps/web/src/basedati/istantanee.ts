/**
 * Istantanee del catalogo di una destinazione (REQ-DATA-001, per REQ-CAT-002). Un'istantanea non cambia mai:
 * aggiornare una destinazione crea un'istantanea nuova, e i viaggi già creati restano sulla loro.
 * Il contenuto è il JSON definito da REQ-CAT-002, salvato così com'è.
 */
import type { BaseDati, Riga } from "./connessione";

export interface Istantanea {
  id: string;
  destinazione: string;
  contenuto: unknown;
}

/**
 * Salva un'istantanea nuova. Salvarla di nuovo identica non cambia nulla; con lo stesso identificativo e un
 * contenuto diverso è un errore, perché un'istantanea non cambia mai.
 */
export function salvaIstantanea(db: BaseDati, istantanea: Istantanea): void {
  if (istantanea.id.trim() === "") throw new Error("l'istantanea deve avere un identificativo");
  const json = JSON.stringify(istantanea.contenuto);
  const esistente = db.prepare<unknown[], Riga>("SELECT destinazione, json FROM istantanee WHERE id = ?").get(istantanea.id);
  if (esistente !== undefined) {
    if (String(esistente.json) !== json || String(esistente.destinazione) !== istantanea.destinazione) {
      throw new Error(`l'istantanea ${istantanea.id} esiste già con un contenuto diverso: un'istantanea non cambia mai`);
    }
    return;
  }
  db.prepare<unknown[], Riga>("INSERT INTO istantanee (id, destinazione, json) VALUES (?, ?, ?)").run(istantanea.id, istantanea.destinazione, json);
}

export function leggiIstantanea(db: BaseDati, id: string): Istantanea | null {
  const riga = db.prepare<unknown[], Riga>("SELECT id, destinazione, json FROM istantanee WHERE id = ?").get(id);
  if (riga === undefined) return null;
  let contenuto: unknown;
  try {
    contenuto = JSON.parse(String(riga.json)) as unknown;
  } catch {
    throw new Error(`istantanea ${id}: il database non contiene JSON valido`);
  }
  return { id: String(riga.id), destinazione: String(riga.destinazione), contenuto };
}

/** Gli identificativi e le destinazioni delle istantanee salvate (senza il contenuto). */
export function elencaIstantanee(db: BaseDati): { id: string; destinazione: string }[] {
  return db
    .prepare<unknown[], Riga>("SELECT id, destinazione FROM istantanee ORDER BY id")
    .all()
    .map((riga) => ({ id: String(riga.id), destinazione: String(riga.destinazione) }));
}
