/**
 * Flusso 8 (ST-OBS-001A, REQ-OBS-001): dal menu si apre «Qualità dei test», che mostra totali, esiti per suite, data,
 * durata e link ai log letti dal file del report; senza file la pagina spiega come generarlo. Su 375 e 1280 px, con
 * controllo di accessibilità (contrasto compreso) e screenshot di evidenza in `evidence/ST-OBS-001A/screenshots`.
 */
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect } from "vitest";
import { rapportoDiProva } from "../test/supporto-qualita";
import { flusso } from "./flussi";
import { CARTELLA_APP, testo, type Flusso } from "./supporto";
import { scorrimentoOrizzontale, violazioniAxe } from "./ux003b-supporto";

const CARTELLA_SCATTI = join(CARTELLA_APP, "..", "..", "evidence", "ST-OBS-001A", "screenshots");

/** Un report di prova con i suoi log, in una cartella temporanea: l'app lo legge dal percorso indicato dalla variabile. */
const CARTELLA_REPORT = mkdtempSync(join(tmpdir(), "travelops-rapporto-e2e-"));
mkdirSync(join(CARTELLA_REPORT, "logs"));
writeFileSync(join(CARTELLA_REPORT, "test-report.json"), JSON.stringify(rapportoDiProva()), "utf8");
writeFileSync(join(CARTELLA_REPORT, "logs", "web.log"), "# Unit web\n FAIL test/esempio.test.ts > un test\n", "utf8");
writeFileSync(join(CARTELLA_REPORT, "logs", "engine.log"), "# Unit engine\n ✓ 10 test\n", "utf8");

async function scatta(f: Flusso, nome: string): Promise<void> {
  mkdirSync(CARTELLA_SCATTI, { recursive: true });
  await f.pagina.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))));
  await f.pagina.screenshot({ path: join(CARTELLA_SCATTI, `${nome}--${f.vista.nome}.png`), fullPage: true });
}

flusso(
  "Flusso 8: report dei test nell'app",
  async (f) => {
    const { pagina } = f;

    await f.passo("Dal menu apro «Qualità»", async () => {
      await pagina.goto(f.url);
      await pagina.getByRole("link", { name: "Qualità", exact: true }).click();
      await pagina.getByRole("heading", { name: "Qualità dei test", level: 1 }).waitFor();
      expect(new URL(pagina.url()).pathname).toBe("/qualita");
      expect(await pagina.getByRole("link", { name: "Qualità", exact: true }).getAttribute("aria-current")).toBe("page");
    });

    await f.passo("Vedo la data, i totali e l'esito di ogni suite", async () => {
      const visto = await testo(pagina);
      expect(visto).toMatch(/10 ottobre 2026/);
      const totali = await pagina.locator("[data-totale]").evaluateAll((e) => Object.fromEntries(e.map((x) => [x.getAttribute("data-totale"), x.querySelector("dd")?.textContent])));
      expect(totali).toEqual({ totali: "15", superati: "12", falliti: "2", saltati: "1" });
      expect(await pagina.locator("[data-esito='ko']").innerText()).toContain("2 test falliti");
      const web = pagina.locator("tr[data-suite='web']");
      expect(await web.innerText()).toMatch(/Unit web/);
      expect(await web.innerText()).toMatch(/Fallita/);
      expect(await pagina.locator("tr[data-suite='e2e']").innerText()).toMatch(/Non eseguita/);
      expect(await pagina.locator("tr[data-suite]").count()).toBe(3);
    });

    await f.passo("Nessuno scorrimento orizzontale e nessuna violazione di accessibilità", async () => {
      expect(await scorrimentoOrizzontale(pagina)).toBeLessThanOrEqual(0);
      expect(await violazioniAxe(pagina)).toEqual([]);
      await scatta(f, "qualita-con-report");
    });

    await f.passo("Il link «Apri il log» mostra il log della suite in testo semplice", async () => {
      await pagina.getByRole("link", { name: "Apri il log di Unit web" }).click();
      await pagina.waitForURL(/\/qualita\/log\/web$/);
      expect(await testo(pagina)).toContain("FAIL test/esempio.test.ts");
    });
  },
  { TRAVELOPS_RAPPORTO_TEST: join(CARTELLA_REPORT, "test-report.json") },
);

flusso(
  "Flusso 8b: senza report la pagina Qualità lo dice",
  async (f) => {
    const { pagina } = f;

    await f.passo("Apro «Qualità» senza il file del report", async () => {
      await pagina.goto(`${f.url}/qualita`);
      await pagina.getByRole("heading", { name: "Nessun report dei test", level: 1 }).waitFor();
    });

    await f.passo("Dice dove lo cerca e quali comandi lo generano", async () => {
      const visto = await testo(pagina);
      expect(visto).toContain(join(CARTELLA_REPORT, "non-esiste.json"));
      expect(visto).toContain("npm test");
      expect(visto).toContain("npm run e2e");
      expect(await pagina.locator("table").count()).toBe(0);
      expect(await scorrimentoOrizzontale(pagina)).toBeLessThanOrEqual(0);
      expect(await violazioniAxe(pagina)).toEqual([]);
      await scatta(f, "qualita-senza-report");
    });
  },
  { TRAVELOPS_RAPPORTO_TEST: join(CARTELLA_REPORT, "non-esiste.json") },
);
