/**
 * Il report dei test (ST-OBS-001A, REQ-OBS-001): un file JSON che gli script di test aggiornano a ogni esecuzione di una
 * suite e che la pagina «Qualità» dell'app legge. Il file è l'unico contratto tra le due parti: nessun servizio esterno.
 *
 * Percorso: variabile `TRAVELOPS_RAPPORTO_TEST` (assoluto, o relativo alla cartella da cui parte il processo); se manca,
 * `reports/test-report.json` nella radice del repository. Le suite sono elencate in `scripts/suite-test.json`.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

export const VERSIONE_RAPPORTO = 1;
export const VARIABILE_PERCORSO = "TRAVELOPS_RAPPORTO_TEST";
export const VARIABILE_SUITE = "TRAVELOPS_RAPPORTO_SUITE";
export const PERCORSO_PREDEFINITO = "reports/test-report.json";

export type TipoSuite = "unit" | "e2e";
export type EsitoSuite = "superata" | "fallita" | "errore";

export interface Conteggi {
  totali: number;
  superati: number;
  falliti: number;
  saltati: number;
}

/** L'identità di una suite, com'è nella configurazione: arriva al reporter tramite `TRAVELOPS_RAPPORTO_SUITE`. */
export interface DescrizioneSuite {
  id: string;
  nome: string;
  tipo: TipoSuite;
  /** Il file di log della suite, relativo alla cartella del report (per esempio `logs/engine.log`). */
  log: string | null;
}

export interface SuiteRapporto extends DescrizioneSuite, Conteggi {
  durataMs: number;
  /** Quando è partita l'esecuzione (ISO 8601). */
  avviata: string;
  esito: EsitoSuite;
  errore?: string;
}

export interface Rapporto {
  versione: typeof VERSIONE_RAPPORTO;
  /** L'istante dell'ultimo aggiornamento (ISO 8601). */
  generato: string;
  durataMs: number;
  totali: Conteggi;
  suite: SuiteRapporto[];
}

/** Il percorso assoluto del report: variabile d'ambiente, altrimenti il predefinito nella radice indicata. */
export function percorsoRapporto(radice: string, ambiente: Readonly<Record<string, string | undefined>> = process.env): string {
  const scelto = ambiente[VARIABILE_PERCORSO]?.trim();
  if (scelto !== undefined && scelto !== "") return isAbsolute(scelto) ? scelto : resolve(scelto);
  return join(radice, PERCORSO_PREDEFINITO);
}

export function sommaConteggi(suite: readonly Conteggi[]): Conteggi {
  const somma: Conteggi = { totali: 0, superati: 0, falliti: 0, saltati: 0 };
  for (const s of suite) {
    somma.totali += s.totali;
    somma.superati += s.superati;
    somma.falliti += s.falliti;
    somma.saltati += s.saltati;
  }
  return somma;
}

/** Inserisce o sostituisce una suite (stesso `id`) e ricalcola totali e durata; le altre suite restano come sono. */
export function unisciSuite(esistente: Rapporto | null, suite: SuiteRapporto, adesso: Date): Rapporto {
  const elenco = esistente === null ? [] : [...esistente.suite];
  const posizione = elenco.findIndex((s) => s.id === suite.id);
  if (posizione >= 0) elenco[posizione] = suite;
  else elenco.push(suite);
  return {
    versione: VERSIONE_RAPPORTO,
    generato: adesso.toISOString(),
    durataMs: elenco.reduce((somma, s) => somma + s.durataMs, 0),
    totali: sommaConteggi(elenco),
    suite: elenco,
  };
}

/** Il report già scritto, o `null` se manca o non è leggibile: in quel caso si riparte da zero. */
export function leggiRapportoScritto(percorso: string): Rapporto | null {
  try {
    const letto: unknown = JSON.parse(readFileSync(percorso, "utf8"));
    if (typeof letto === "object" && letto !== null && (letto as { versione?: unknown }).versione === VERSIONE_RAPPORTO && Array.isArray((letto as { suite?: unknown }).suite)) {
      return letto as Rapporto;
    }
  } catch {
    // Assente o rotto: si riparte da zero.
  }
  return null;
}

/** Scrive il report in modo atomico; la cartella è ignorata da Git (contiene solo esiti locali). */
export function scriviRapporto(percorso: string, rapporto: Rapporto): void {
  const cartella = dirname(percorso);
  mkdirSync(cartella, { recursive: true });
  try {
    writeFileSync(join(cartella, ".gitignore"), "*\n", { flag: "wx" });
  } catch {
    // Esiste già.
  }
  const provvisorio = `${percorso}.${process.pid}.tmp`;
  writeFileSync(provvisorio, `${JSON.stringify(rapporto, null, 2)}\n`, "utf8");
  renameSync(provvisorio, percorso);
}

/** Aggiorna il report con l'esito di una suite e lo restituisce. */
export function registraSuite(percorso: string, suite: SuiteRapporto, adesso: Date = new Date()): Rapporto {
  const rapporto = unisciSuite(leggiRapportoScritto(percorso), suite, adesso);
  scriviRapporto(percorso, rapporto);
  return rapporto;
}
