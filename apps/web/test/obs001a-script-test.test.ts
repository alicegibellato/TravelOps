/**
 * ST-OBS-001A (REQ-OBS-001, CA-2): gli script di test scrivono il report. Unione delle suite, scrittura atomica del
 * file, reporter di Vitest (con moduli finti) e scelta delle suite da eseguire dalla configurazione.
 */
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TestModule } from "vitest/node";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { leggiConfigurazione, scegliSuite } from "../../../scripts/esegui-test";
import { VARIABILE_PERCORSO, VARIABILE_SUITE, leggiRapportoScritto, percorsoRapporto, registraSuite, unisciSuite, type SuiteRapporto } from "../../../scripts/rapporto-test";
import ReporterRapporto, { contaModuli, suiteDaAmbiente, type ModuloContabile } from "../../../scripts/reporter-test";
import { interpretaRapporto } from "../src/qualita/rapporto";

let cartella: string;
beforeEach(() => {
  cartella = mkdtempSync(join(tmpdir(), "travelops-script-test-"));
});
afterEach(() => rmSync(cartella, { recursive: true, force: true }));

function suite(parti: Partial<SuiteRapporto> = {}): SuiteRapporto {
  return { id: "engine", nome: "Unit engine", tipo: "unit", log: "logs/engine.log", totali: 10, superati: 9, falliti: 0, saltati: 1, durataMs: 1_000, avviata: "2026-10-10T08:00:00.000Z", esito: "superata", ...parti };
}

/** Un modulo finto con l'interfaccia che il reporter usa: stato del file e stato di ogni test. */
function modulo(stati: ("passed" | "failed" | "skipped" | "pending")[], statoFile: "passed" | "failed" | "skipped" = "passed") {
  return {
    state: () => statoFile,
    children: { allTests: () => stati.map((state) => ({ result: () => ({ state }) })) },
  } as unknown as ModuloContabile & TestModule;
}

describe("unione delle suite", () => {
  it("aggiunge una suite nuova, sostituisce quella con lo stesso id e ricalcola totali e durata", () => {
    const adesso = new Date("2026-10-10T09:00:00Z");
    const uno = unisciSuite(null, suite(), adesso);
    expect(uno).toMatchObject({ versione: 1, generato: "2026-10-10T09:00:00.000Z", durataMs: 1_000, totali: { totali: 10, superati: 9, falliti: 0, saltati: 1 } });
    const due = unisciSuite(uno, suite({ id: "web", nome: "Unit web", totali: 4, superati: 2, falliti: 2, saltati: 0, durataMs: 500, esito: "fallita" }), adesso);
    expect(due.totali).toEqual({ totali: 14, superati: 11, falliti: 2, saltati: 1 });
    const sostituita = unisciSuite(due, suite({ totali: 12, superati: 12, saltati: 0, durataMs: 2_000 }), adesso);
    expect(sostituita.suite.map((s) => s.id)).toEqual(["engine", "web"]);
    expect(sostituita.totali).toEqual({ totali: 16, superati: 14, falliti: 2, saltati: 0 });
    expect(sostituita.durataMs).toBe(2_500);
  });
});

describe("scrittura del report", () => {
  it("scrive il file (creando la cartella), lo ignora per Git, non lascia file provvisori e l'app lo legge", () => {
    const file = join(cartella, "reports", "test-report.json");
    registraSuite(file, suite());
    registraSuite(file, suite({ id: "web", nome: "Unit web" }));
    expect(readFileSync(join(cartella, "reports", ".gitignore"), "utf8")).toBe("*\n");
    expect(readdirSync(join(cartella, "reports")).sort()).toEqual([".gitignore", "test-report.json"]);
    const letto = leggiRapportoScritto(file);
    expect(letto?.suite.map((s) => s.id)).toEqual(["engine", "web"]);
    // Il formato scritto dagli script è quello che l'app accetta.
    expect(interpretaRapporto(letto).totali).toEqual({ totali: 20, superati: 18, falliti: 0, saltati: 2 });
  });

  it("un report esistente illeggibile viene ricostruito da zero invece di bloccare i test", () => {
    const file = join(cartella, "r.json");
    writeFileSync(file, "{ rotto", "utf8");
    expect(leggiRapportoScritto(file)).toBeNull();
    registraSuite(file, suite());
    expect(leggiRapportoScritto(file)?.suite).toHaveLength(1);
  });

  it("il percorso viene dall'ambiente, altrimenti reports/test-report.json nella radice", () => {
    expect(percorsoRapporto("/repo", { [VARIABILE_PERCORSO]: "/altrove/r.json" })).toBe("/altrove/r.json");
    expect(percorsoRapporto("/repo", {})).toBe(join("/repo", "reports", "test-report.json"));
  });
});

describe("reporter di Vitest", () => {
  const descrizione = JSON.stringify({ id: "web", nome: "Unit web", tipo: "unit", log: "logs/web.log" });

  it("conta superati, falliti e saltati; un file che non si carica vale un test fallito", () => {
    expect(contaModuli([modulo(["passed", "passed", "skipped", "pending"]), modulo(["failed", "passed"], "failed")])).toEqual({ totali: 6, superati: 3, falliti: 1, saltati: 2 });
    expect(contaModuli([modulo([], "failed")])).toEqual({ totali: 1, superati: 0, falliti: 1, saltati: 0 });
    expect(contaModuli([])).toEqual({ totali: 0, superati: 0, falliti: 0, saltati: 0 });
  });

  it("a fine esecuzione scrive la suite nel report con conteggi, data, durata, log ed esito", () => {
    const file = join(cartella, "r.json");
    const reporter = new ReporterRapporto({ ambiente: { [VARIABILE_PERCORSO]: file, [VARIABILE_SUITE]: descrizione }, radice: cartella });
    reporter.onTestRunStart();
    reporter.onTestRunEnd([modulo(["passed", "passed", "skipped"])], []);
    const scritta = leggiRapportoScritto(file)?.suite[0];
    expect(scritta).toMatchObject({ id: "web", nome: "Unit web", tipo: "unit", log: "logs/web.log", totali: 3, superati: 2, falliti: 0, saltati: 1, esito: "superata" });
    expect(scritta?.durataMs).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(Date.parse(scritta?.avviata ?? ""))).toBe(false);
  });

  it("con un test fallito, o errori non gestiti, l'esito è «fallita»", () => {
    const file = join(cartella, "r.json");
    const ambiente = { [VARIABILE_PERCORSO]: file, [VARIABILE_SUITE]: descrizione };
    new ReporterRapporto({ ambiente, radice: cartella }).onTestRunEnd([modulo(["passed", "failed"])], []);
    expect(leggiRapportoScritto(file)?.suite[0]).toMatchObject({ esito: "fallita", falliti: 1 });
    new ReporterRapporto({ ambiente, radice: cartella }).onTestRunEnd([modulo(["passed"])], [new Error("x")]);
    expect(leggiRapportoScritto(file)?.suite[0]).toMatchObject({ esito: "fallita", errore: "1 errori non gestiti durante l'esecuzione" });
  });

  it("senza la descrizione della suite nell'ambiente non scrive nulla", () => {
    const file = join(cartella, "r.json");
    new ReporterRapporto({ ambiente: { [VARIABILE_PERCORSO]: file }, radice: cartella }).onTestRunEnd([modulo(["passed"])], []);
    expect(existsSync(file)).toBe(false);
    expect(suiteDaAmbiente({ [VARIABILE_SUITE]: "non json" })).toBeNull();
    expect(suiteDaAmbiente({ [VARIABILE_SUITE]: JSON.stringify({ id: "x", nome: "X", tipo: "manuale" }) })).toBeNull();
  });
});

describe("suite da eseguire", () => {
  const config = leggiConfigurazione();

  it("la configurazione elenca unit di engine, agents, sources e web, e l'e2e", () => {
    expect(config.suite.map((s) => [s.id, s.tipo])).toEqual([
      ["engine", "unit"],
      ["agents", "unit"],
      ["sources", "unit"],
      ["web", "unit"],
      ["e2e", "e2e"],
    ]);
  });

  it("--tipo e gli id scelgono le suite; una scelta vuota è un errore", () => {
    expect(scegliSuite(config, ["--tipo", "unit"]).map((s) => s.id)).toEqual(["engine", "agents", "sources", "web"]);
    expect(scegliSuite(config, ["--tipo", "e2e"]).map((s) => s.id)).toEqual(["e2e"]);
    expect(scegliSuite(config, ["web", "engine"]).map((s) => s.id)).toEqual(["engine", "web"]);
    expect(scegliSuite(config, []).map((s) => s.id)).toHaveLength(5);
    expect(() => scegliSuite(config, ["inesistente"])).toThrow(/Nessuna suite/);
  });
});
