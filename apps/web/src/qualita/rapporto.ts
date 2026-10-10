/**
 * Il report dei test letto dall'app (ST-OBS-001A, REQ-OBS-001): un file JSON scritto dagli script di test
 * (`scripts/rapporto-test.ts`, formato versione 1). Qui lo si legge e lo si valida senza fidarsi del contenuto: un file
 * mancante o rotto non fa cadere la pagina, la porta a uno stato vuoto che dice cosa fare.
 *
 * Percorso: variabile `TRAVELOPS_RAPPORTO_TEST` (assoluto, o relativo alla cartella da cui parte la web app); se manca,
 * `reports/test-report.json` nella radice del repository (la web app parte da `apps/web`). Solo lato server.
 */
import { readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

export const VARIABILE_RAPPORTO = "TRAVELOPS_RAPPORTO_TEST";
export const VARIABILE_FUSO = "TRAVELOPS_FUSO_ORARIO";
export const FUSO_PREDEFINITO = "Europe/Rome";
const VERSIONE_SUPPORTATA = 1;

export type TipoSuite = "unit" | "e2e";
export type EsitoSuite = "superata" | "fallita" | "errore";

export interface Conteggi {
  totali: number;
  superati: number;
  falliti: number;
  saltati: number;
}

export interface SuiteTest extends Conteggi {
  id: string;
  nome: string;
  tipo: TipoSuite;
  esito: EsitoSuite;
  durataMs: number;
  /** Quando è partita la suite (ISO 8601). */
  avviata: string;
  /** Il file di log, relativo alla cartella del report. */
  log: string | null;
  errore: string | null;
}

export interface RapportoTest {
  /** L'ultimo aggiornamento del report (ISO 8601). */
  generato: string;
  durataMs: number;
  totali: Conteggi;
  suite: SuiteTest[];
}

export type EsitoLetturaRapporto =
  | { stato: "ok"; percorso: string; rapporto: RapportoTest }
  | { stato: "assente"; percorso: string }
  | { stato: "non_valido"; percorso: string; motivo: string };

type Ambiente = Readonly<Record<string, string | undefined>>;

/** Il percorso assoluto del report, dall'ambiente o predefinito. */
export function percorsoRapportoTest(ambiente: Ambiente = process.env, cartellaCorrente: string = process.cwd()): string {
  const scelto = ambiente[VARIABILE_RAPPORTO]?.trim();
  if (scelto !== undefined && scelto !== "") return isAbsolute(scelto) ? scelto : resolve(cartellaCorrente, scelto);
  return resolve(cartellaCorrente, "..", "..", "reports", "test-report.json");
}

/** Il fuso orario con cui mostrare le date (variabile `TRAVELOPS_FUSO_ORARIO`); se non è valido, quello predefinito. */
export function fusoOrario(ambiente: Ambiente = process.env): string {
  const scelto = ambiente[VARIABILE_FUSO]?.trim();
  if (scelto === undefined || scelto === "") return FUSO_PREDEFINITO;
  try {
    new Intl.DateTimeFormat("it-IT", { timeZone: scelto });
    return scelto;
  } catch {
    return FUSO_PREDEFINITO;
  }
}

function oggetto(valore: unknown, dove: string): Record<string, unknown> {
  if (typeof valore !== "object" || valore === null || Array.isArray(valore)) throw new Error(`${dove} non è un oggetto`);
  return valore as Record<string, unknown>;
}

function conteggio(o: Record<string, unknown>, campo: string, dove: string): number {
  const v = o[campo];
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0) throw new Error(`${dove}: «${campo}» deve essere un intero non negativo`);
  return v;
}

function testo(o: Record<string, unknown>, campo: string, dove: string): string {
  const v = o[campo];
  if (typeof v !== "string" || v === "") throw new Error(`${dove}: «${campo}» manca`);
  return v;
}

function data(o: Record<string, unknown>, campo: string, dove: string): string {
  const v = testo(o, campo, dove);
  if (Number.isNaN(Date.parse(v))) throw new Error(`${dove}: «${campo}» non è una data`);
  return v;
}

function suiteValida(grezza: unknown, indice: number): SuiteTest {
  const dove = `suite ${indice + 1}`;
  const o = oggetto(grezza, dove);
  const tipo = o.tipo;
  if (tipo !== "unit" && tipo !== "e2e") throw new Error(`${dove}: «tipo» deve essere unit o e2e`);
  const esito = o.esito;
  if (esito !== "superata" && esito !== "fallita" && esito !== "errore") throw new Error(`${dove}: «esito» non riconosciuto`);
  const log = o.log;
  if (log !== null && log !== undefined && typeof log !== "string") throw new Error(`${dove}: «log» deve essere un testo`);
  const errore = o.errore;
  return {
    id: testo(o, "id", dove),
    nome: testo(o, "nome", dove),
    tipo,
    esito,
    totali: conteggio(o, "totali", dove),
    superati: conteggio(o, "superati", dove),
    falliti: conteggio(o, "falliti", dove),
    saltati: conteggio(o, "saltati", dove),
    durataMs: conteggio(o, "durataMs", dove),
    avviata: data(o, "avviata", dove),
    log: typeof log === "string" && log !== "" ? log : null,
    errore: typeof errore === "string" && errore !== "" ? errore : null,
  };
}

/** Convalida il contenuto del file; i totali si ricalcolano dalle suite, così non possono contraddirle. */
export function interpretaRapporto(grezzo: unknown): RapportoTest {
  const o = oggetto(grezzo, "il report");
  if (o.versione !== VERSIONE_SUPPORTATA) throw new Error(`versione ${String(o.versione)} non supportata (serve la ${VERSIONE_SUPPORTATA})`);
  if (!Array.isArray(o.suite)) throw new Error("manca l'elenco «suite»");
  const suite = o.suite.map(suiteValida);
  const totali = suite.reduce<Conteggi>(
    (somma, s) => ({ totali: somma.totali + s.totali, superati: somma.superati + s.superati, falliti: somma.falliti + s.falliti, saltati: somma.saltati + s.saltati }),
    { totali: 0, superati: 0, falliti: 0, saltati: 0 },
  );
  return { generato: data(o, "generato", "il report"), durataMs: suite.reduce((somma, s) => somma + s.durataMs, 0), totali, suite };
}

/** Legge il report: mancante, illeggibile o non valido sono esiti distinti, mai eccezioni. */
export function leggiRapportoTest(percorso: string): EsitoLetturaRapporto {
  let contenuto: string;
  try {
    contenuto = readFileSync(percorso, "utf8");
  } catch (errore) {
    if ((errore as NodeJS.ErrnoException).code === "ENOENT") return { stato: "assente", percorso };
    return { stato: "non_valido", percorso, motivo: "il file non si può leggere" };
  }
  let grezzo: unknown;
  try {
    grezzo = JSON.parse(contenuto);
  } catch {
    return { stato: "non_valido", percorso, motivo: "non è un JSON valido" };
  }
  try {
    return { stato: "ok", percorso, rapporto: interpretaRapporto(grezzo) };
  } catch (errore) {
    return { stato: "non_valido", percorso, motivo: errore instanceof Error ? errore.message : "contenuto non riconosciuto" };
  }
}

/**
 * Il file di log di una suite, solo se sta dentro la cartella del report: il nome nel file non permette di uscirne
 * (`../`, percorsi assoluti). Restituisce `null` se la suite o il log non ci sono.
 */
export function percorsoLog(percorsoRapporto: string, suite: SuiteTest): string | null {
  if (suite.log === null || isAbsolute(suite.log)) return null;
  const cartella = dirname(percorsoRapporto);
  const percorso = resolve(join(cartella, suite.log));
  const dentro = relative(cartella, percorso);
  return dentro !== "" && !dentro.startsWith(`..${sep}`) && dentro !== ".." && !isAbsolute(dentro) ? percorso : null;
}

/** Il log in testo semplice, o `null` se non c'è. */
export function leggiLog(percorso: string): string | null {
  try {
    return readFileSync(percorso, "utf8");
  } catch {
    return null;
  }
}

/** Durata breve: «820 ms», «4,2 s», «3 min 5 s». */
export function formattaDurata(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  const secondi = ms / 1000;
  if (secondi < 60) return `${secondi.toLocaleString("it-IT", { maximumFractionDigits: 1 })} s`;
  const intero = Math.round(secondi);
  return `${Math.floor(intero / 60)} min ${intero % 60} s`;
}

/** Data e ora per esteso nel fuso scelto: «10 ottobre 2026, 10:58». */
export function formattaDataOra(iso: string, fuso: string): string {
  const istante = new Date(iso);
  const giorno = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: fuso }).format(istante);
  const ora = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: fuso }).format(istante);
  return `${giorno}, ${ora}`;
}
