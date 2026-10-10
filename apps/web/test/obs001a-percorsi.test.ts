/**
 * ST-OBS-001A-FIX-TB-NEW-D5 (TB-NEW-D5): la pagina della qualità e i log non mostrano percorsi assoluti con il nome utente.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { GET } from "../app/qualita/log/[suite]/route";
import { VARIABILE_RAPPORTO, nascondiPercorsi, percorsoVisibile } from "../src/qualita/rapporto";
import { rapportoDiProva } from "./supporto-qualita";

const RADICE = "/Users/mario/progetti/TravelOps";
const CASA = "/Users/mario";

describe("percorsoVisibile", () => {
  it("dentro il repository: relativo alla radice", () => {
    expect(percorsoVisibile(`${RADICE}/reports/test-report.json`, RADICE, CASA)).toBe(join("reports", "test-report.json"));
  });
  it("dentro la cartella personale ma fuori dal repository: con la tilde", () => {
    expect(percorsoVisibile(`${CASA}/altro/rapporto.json`, RADICE, CASA)).toBe(join("~", "altro", "rapporto.json"));
  });
  it("altrove: solo il nome del file", () => {
    expect(percorsoVisibile("/var/folders/ab/xyz/T/rapporto.json", RADICE, CASA)).toBe("rapporto.json");
  });
});

describe("nascondiPercorsi", () => {
  it("toglie la radice, la cartella personale e ogni nome utente", () => {
    const testo = `FAIL ${RADICE}/apps/web/test/a.test.ts\nletto ${CASA}/.cache/x\nanche /Users/luisa/prova e /home/gianni/prova`;
    const pulito = nascondiPercorsi(testo, RADICE, CASA);
    expect(pulito).toBe("FAIL ./apps/web/test/a.test.ts\nletto ~/.cache/x\nanche ~/prova e ~/prova");
    expect(pulito).not.toMatch(/mario|luisa|gianni/);
  });
});

describe("log servito dall'app", () => {
  const originale = process.env[VARIABILE_RAPPORTO];
  let cartella = "";
  afterEach(() => {
    if (originale === undefined) delete process.env[VARIABILE_RAPPORTO];
    else process.env[VARIABILE_RAPPORTO] = originale;
    rmSync(cartella, { recursive: true, force: true });
  });

  it("non contiene la cartella personale", async () => {
    cartella = mkdtempSync(join(tmpdir(), "qualita-percorsi-"));
    mkdirSync(join(cartella, "logs"));
    writeFileSync(join(cartella, "logs", "engine.log"), "FAIL /Users/mario/progetti/x.test.ts\n");
    writeFileSync(join(cartella, "rapporto.json"), JSON.stringify(rapportoDiProva()));
    process.env[VARIABILE_RAPPORTO] = join(cartella, "rapporto.json");
    const risposta = await GET(new Request("http://localhost/x"), { params: Promise.resolve({ suite: "engine" }) });
    expect(risposta.status).toBe(200);
    expect(await risposta.text()).toBe("FAIL ~/progetti/x.test.ts\n");
  });
});
