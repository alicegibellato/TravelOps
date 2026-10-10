/**
 * Migrazioni numerate della base dati (REQ-DATA-001). Sono ripetibili (CA-4):
 * - ogni migrazione applicata si registra nella tabella `migrazioni`, e quelle già registrate non si rieseguono;
 * - il loro SQL usa solo `CREATE ... IF NOT EXISTS`, quindi anche rieseguito non cambia nulla;
 * - ogni migrazione gira in una transazione: o è applicata tutta, o per niente.
 *
 * Una migrazione, una volta consegnata, non si modifica: un cambio allo schema è una migrazione nuova con il numero
 * successivo.
 */
import type { BaseDati, Riga } from "./connessione";

export interface Migrazione {
  /** 1, 2, 3, … senza salti. */
  numero: number;
  nome: string;
  sql: string;
}

/**
 * Schema iniziale. Il database salva il JSON del motore così come il motore lo produce (viaggi, storici, proposte):
 * le regole restano nel motore, che rilegge e valida quei JSON (`caricaViaggio`, `importaStorico`).
 * Profili, conversazioni e istantanee sono JSON definiti dai rispettivi requisiti (PREF-001, CHAT-001, CAT-002).
 */
const SCHEMA_INIZIALE = `
CREATE TABLE IF NOT EXISTS istantanee (
  id TEXT PRIMARY KEY,
  destinazione TEXT NOT NULL,
  json TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS viaggi (
  id TEXT PRIMARY KEY,
  titolo TEXT NOT NULL,
  stato TEXT NOT NULL CHECK (stato IN ('bozza', 'confermato', 'in_corso', 'concluso')),
  demo INTEGER NOT NULL DEFAULT 0 CHECK (demo IN (0, 1)),
  ordine INTEGER NOT NULL DEFAULT 0,
  destinazione TEXT,
  istantanea_id TEXT REFERENCES istantanee (id)
) STRICT;

CREATE TABLE IF NOT EXISTS profili (
  viaggio_id TEXT PRIMARY KEY REFERENCES viaggi (id) ON DELETE CASCADE,
  json TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS revisioni_bozza (
  viaggio_id TEXT NOT NULL REFERENCES viaggi (id) ON DELETE CASCADE,
  numero INTEGER NOT NULL CHECK (numero >= 1),
  causa TEXT NOT NULL,
  viaggio_json TEXT NOT NULL,
  PRIMARY KEY (viaggio_id, numero)
) STRICT;

CREATE TABLE IF NOT EXISTS storici (
  viaggio_id TEXT PRIMARY KEY REFERENCES viaggi (id) ON DELETE CASCADE,
  json TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS proposte (
  viaggio_id TEXT NOT NULL REFERENCES viaggi (id) ON DELETE CASCADE,
  id INTEGER NOT NULL CHECK (id >= 1),
  origine TEXT,
  proposta_json TEXT NOT NULL,
  decisione_json TEXT,
  esito_json TEXT,
  PRIMARY KEY (viaggio_id, id)
) STRICT;

CREATE TABLE IF NOT EXISTS conversazioni (
  id INTEGER PRIMARY KEY,
  viaggio_id TEXT REFERENCES viaggi (id) ON DELETE CASCADE
) STRICT;

CREATE INDEX IF NOT EXISTS conversazioni_per_viaggio ON conversazioni (viaggio_id);

CREATE TABLE IF NOT EXISTS messaggi (
  conversazione_id INTEGER NOT NULL REFERENCES conversazioni (id) ON DELETE CASCADE,
  numero INTEGER NOT NULL CHECK (numero >= 1),
  ruolo TEXT NOT NULL CHECK (ruolo IN ('viaggiatore', 'assistente')),
  testo TEXT NOT NULL,
  dati_json TEXT,
  PRIMARY KEY (conversazione_id, numero)
) STRICT;

CREATE TABLE IF NOT EXISTS impostazioni (
  chiave TEXT PRIMARY KEY,
  valore_json TEXT NOT NULL
) STRICT;
`;

/**
 * Le tracce degli agenti (REQ-ORCH-002 CA-4): per ogni risposta della chat la delega dell'orchestratore e ogni chiamata
 * a strumento, con agente, strumento, input riassunto, esito e durata. Il viaggio si ricava dalla conversazione.
 */
const TRACCE_AGENTI = `
CREATE TABLE IF NOT EXISTS tracce_agenti (
  conversazione_id INTEGER NOT NULL REFERENCES conversazioni (id) ON DELETE CASCADE,
  risposta INTEGER NOT NULL CHECK (risposta >= 1),
  numero INTEGER NOT NULL CHECK (numero >= 1),
  domanda TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('delega', 'strumento')),
  agente TEXT NOT NULL,
  strumento TEXT,
  input TEXT NOT NULL,
  esito TEXT NOT NULL CHECK (esito IN ('ok', 'errore')),
  dettaglio TEXT,
  durata_ms INTEGER NOT NULL CHECK (durata_ms >= 0),
  inizio TEXT NOT NULL,
  PRIMARY KEY (conversazione_id, risposta, numero)
) STRICT;
`;

export const MIGRAZIONI: readonly Migrazione[] = [
  { numero: 1, nome: "Schema iniziale", sql: SCHEMA_INIZIALE },
  { numero: 2, nome: "Tracce degli agenti", sql: TRACCE_AGENTI },
];

const TABELLA_MIGRAZIONI = `
CREATE TABLE IF NOT EXISTS migrazioni (
  numero INTEGER PRIMARY KEY,
  nome TEXT NOT NULL
) STRICT;
`;

/** I numeri delle migrazioni registrate nel database, in ordine. */
export function migrazioniApplicate(db: BaseDati): number[] {
  db.exec(TABELLA_MIGRAZIONI);
  return db
    .prepare<unknown[], Riga>("SELECT numero FROM migrazioni ORDER BY numero")
    .all()
    .map((riga) => Number(riga.numero));
}

/**
 * Applica, in ordine, le migrazioni non ancora registrate e restituisce i numeri di quelle applicate adesso
 * (nessuno se il database è già aggiornato). Un database scritto da una versione più recente della web app
 * (con migrazioni che questa non conosce) non si tocca.
 */
export function applicaMigrazioni(db: BaseDati, migrazioni: readonly Migrazione[] = MIGRAZIONI): number[] {
  const applicate = new Set(migrazioniApplicate(db));
  const conosciute = new Set(migrazioni.map((m) => m.numero));
  const sconosciute = [...applicate].filter((n) => !conosciute.has(n));
  if (sconosciute.length > 0) {
    throw new Error(`il database è stato aggiornato da una versione più recente della web app (migrazioni ${sconosciute.join(", ")})`);
  }
  const nuove: number[] = [];
  for (const migrazione of [...migrazioni].sort((a, b) => a.numero - b.numero)) {
    if (applicate.has(migrazione.numero)) continue;
    db.exec("BEGIN IMMEDIATE");
    try {
      // Rilette dentro la transazione: un altro processo potrebbe averla appena applicata.
      const giaApplicata = db.prepare<unknown[], Riga>("SELECT 1 AS si FROM migrazioni WHERE numero = ?").get(migrazione.numero) !== undefined;
      if (!giaApplicata) {
        db.exec(migrazione.sql);
        db.prepare<unknown[], Riga>("INSERT INTO migrazioni (numero, nome) VALUES (?, ?)").run(migrazione.numero, migrazione.nome);
        nuove.push(migrazione.numero);
      }
      db.exec("COMMIT");
    } catch (errore) {
      db.exec("ROLLBACK");
      throw errore;
    }
  }
  return nuove;
}
