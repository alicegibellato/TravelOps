/**
 * ST-OBS-001A (REQ-OBS-001, CA-2 e CA-4 parte test): lettura del report dei test da file, percorso configurabile,
 * file assente o non valido, protezione del percorso dei log e indirizzo dei log servito dall'app.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET } from "../app/qualita/log/[suite]/route";
import {
  FUSO_PREDEFINITO,
  VARIABILE_RAPPORTO,
  formattaDataOra,
  formattaDurata,
  fusoOrario,
  leggiRapportoTest,
  percorsoLog,
  percorsoRapportoTest,
  type SuiteTest,
} from "../src/qualita/rapporto";
import { rapportoDiProva, suiteDiProva } from "./supporto-qualita";

let cartella: string;
const ambienteOriginale = process.env[VARIABILE_RAPPORTO];

beforeEach(() => {
  cartella = mkdtempSync(join(tmpdir(), "travelops-qualita-"));
});
afterEach(() => {
  rmSync(cartella, { recursive: true, force: true });
  if (ambienteOriginale === undefined) delete process.env[VARIABILE_RAPPORTO];
  else process.env[VARIABILE_RAPPORTO] = ambienteOriginale;
});

function scrivi(nome: string, contenuto: unknown): string {
  const file = join(cartella, nome);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, typeof contenuto === "string" ? contenuto : JSON.stringify(contenuto), "utf8");
  return file;
}

describe("percorso del report (configurabile)", () => {
  it("la variabile d'ambiente vince, assoluta o relativa alla cartella corrente", () => {
    expect(percorsoRapportoTest({ [VARIABILE_RAPPORTO]: "/dati/report.json" }, "/qualsiasi")).toBe("/dati/report.json");
    expect(percorsoRapportoTest({ [VARIABILE_RAPPORTO]: "esiti/r.json" }, "/app/web")).toBe("/app/web/esiti/r.json");
  });

  it("senza variabile è reports/test-report.json nella radice del repository (la web app parte da apps/web)", () => {
    expect(percorsoRapportoTest({}, "/repo/apps/web")).toBe("/repo/reports/test-report.json");
    expect(percorsoRapportoTest({ [VARIABILE_RAPPORTO]: "  " }, "/repo/apps/web")).toBe("/repo/reports/test-report.json");
  });

  it("il fuso orario è configurabile e un valore sbagliato torna al predefinito", () => {
    expect(fusoOrario({ TRAVELOPS_FUSO_ORARIO: "UTC" })).toBe("UTC");
    expect(fusoOrario({ TRAVELOPS_FUSO_ORARIO: "Marte/Olympus" })).toBe(FUSO_PREDEFINITO);
    expect(fusoOrario({})).toBe(FUSO_PREDEFINITO);
  });
});

describe("lettura del report", () => {
  it("un report valido dà totali (ricalcolati dalle suite), esiti, data, durata e log di ogni suite", () => {
    const file = scrivi("r.json", rapportoDiProva());
    const esito = leggiRapportoTest(file);
    expect(esito.stato).toBe("ok");
    if (esito.stato !== "ok") return;
    expect(esito.rapporto.totali).toEqual({ totali: 15, superati: 12, falliti: 2, saltati: 1 });
    expect(esito.rapporto.durataMs).toBe(25_000);
    expect(esito.rapporto.suite.map((s) => [s.id, s.esito, s.log])).toEqual([
      ["engine", "superata", "logs/engine.log"],
      ["web", "fallita", "logs/web.log"],
      ["e2e", "errore", null],
    ]);
  });

  it("senza file il risultato è «assente», con il percorso cercato", () => {
    const file = join(cartella, "manca.json");
    expect(leggiRapportoTest(file)).toEqual({ stato: "assente", percorso: file });
  });

  it("un file che non è JSON, o ha una forma sbagliata, è «non valido» con il motivo", () => {
    expect(leggiRapportoTest(scrivi("rotto.json", "{ non json"))).toMatchObject({ stato: "non_valido", motivo: "non è un JSON valido" });
    expect(leggiRapportoTest(scrivi("lista.json", "[]"))).toMatchObject({ stato: "non_valido", motivo: "il report non è un oggetto" });
    expect(leggiRapportoTest(scrivi("v9.json", { ...rapportoDiProva(), versione: 9 }))).toMatchObject({ stato: "non_valido", motivo: expect.stringContaining("versione 9") });
    expect(leggiRapportoTest(scrivi("senza.json", { versione: 1, generato: "2026-10-10T08:00:00Z" }))).toMatchObject({ stato: "non_valido", motivo: "manca l'elenco «suite»" });
  });

  it("una suite con un conteggio negativo, un esito sconosciuto o una data sbagliata rende non valido tutto il file", () => {
    const base = rapportoDiProva();
    for (const guasto of [{ superati: -1 }, { esito: "forse" }, { avviata: "ieri" }, { tipo: "manuale" }, { falliti: 1.5 }]) {
      const file = scrivi("g.json", { ...base, suite: [{ ...base.suite[0], ...guasto }] });
      expect(leggiRapportoTest(file).stato).toBe("non_valido");
    }
  });

  it("un percorso che è una cartella non fa cadere la lettura", () => {
    expect(leggiRapportoTest(cartella).stato).toBe("non_valido");
  });
});

describe("log delle suite", () => {
  const suite = (log: string | null): SuiteTest => suiteDiProva({ log });

  it("il log si trova solo dentro la cartella del report", () => {
    const report = join(cartella, "reports", "r.json");
    expect(percorsoLog(report, suite("logs/engine.log"))).toBe(join(cartella, "reports", "logs", "engine.log"));
    expect(percorsoLog(report, suite("../segreto.txt"))).toBeNull();
    expect(percorsoLog(report, suite("logs/../../segreto.txt"))).toBeNull();
    expect(percorsoLog(report, suite("/etc/passwd"))).toBeNull();
    expect(percorsoLog(report, suite("."))).toBeNull();
    expect(percorsoLog(report, suite(null))).toBeNull();
  });

  it("l'indirizzo /qualita/log/<suite> serve il log in testo semplice; suite sconosciuta, log mancante o fuori cartella danno 404", async () => {
    const base = rapportoDiProva();
    const file = scrivi("reports/test-report.json", {
      ...base,
      suite: [
        ...base.suite.filter((s) => s.id !== "e2e"),
        { ...base.suite[2], id: "fuori", log: "../fuori.log" },
        { ...base.suite[2], id: "senzafile", log: "logs/non-esiste.log" },
      ],
    });
    scrivi("reports/logs/engine.log", "# Unit engine\n  ✓ 12 test\n");
    scrivi("fuori.log", "non deve uscire");
    process.env[VARIABILE_RAPPORTO] = file;
    const chiedi = (id: string) => GET(new Request(`http://localhost/qualita/log/${id}`), { params: Promise.resolve({ suite: id }) });

    const ok = await chiedi("engine");
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(await ok.text()).toBe("# Unit engine\n  ✓ 12 test\n");
    for (const id of ["sconosciuta", "fuori", "senzafile", "..%2F..%2Fetc%2Fpasswd"]) {
      const risposta = await chiedi(id);
      expect([id, risposta.status]).toEqual([id, 404]);
      expect(await risposta.text()).not.toContain("non deve uscire");
    }
  });

  it("senza report l'indirizzo dei log risponde 404", async () => {
    process.env[VARIABILE_RAPPORTO] = join(cartella, "manca.json");
    expect((await GET(new Request("http://localhost/x"), { params: Promise.resolve({ suite: "engine" }) })).status).toBe(404);
  });
});

describe("formati", () => {
  it("durata breve e data nel fuso scelto", () => {
    expect(formattaDurata(820)).toBe("820 ms");
    expect(formattaDurata(4_250)).toBe("4,3 s");
    expect(formattaDurata(185_000)).toBe("3 min 5 s");
    expect(formattaDataOra("2026-10-10T08:58:00Z", "UTC")).toMatch(/10 ottobre 2026.*08:58/);
    expect(formattaDataOra("2026-10-10T08:58:00Z", "Europe/Rome")).toMatch(/10 ottobre 2026.*10:58/);
  });
});
