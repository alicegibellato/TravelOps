/**
 * Supporto ai test end-to-end (REQ-E2E-001): avvia la web app già compilata su una porta libera con una cartella dati
 * temporanea nuova, pilota il browser di sistema come farebbe un viaggiatore e, se un passo fallisce, salva
 * lo screenshot con il nome del passo. Nessuna chiave OpenAI: la chat risponde con l'assistente finto.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser, type Page } from "playwright-core";

export const CARTELLA_APP = fileURLToPath(new URL("..", import.meta.url));
export const CARTELLA_ERRORI = join(CARTELLA_APP, "test-results", "e2e");

/** Le due larghezze su cui gira ogni flusso: telefono e computer. */
export const VISTE = [
  { nome: "375px", larghezza: 375, altezza: 812 },
  { nome: "1280px", larghezza: 1280, altezza: 900 },
] as const;
export type Vista = (typeof VISTE)[number];

const PAUSA_AVVIO_MS = 30_000;

async function portaLibera(): Promise<number> {
  return new Promise((risolvi, rifiuta) => {
    const server = createServer();
    server.once("error", rifiuta);
    server.listen(0, "127.0.0.1", () => {
      const indirizzo = server.address();
      const porta = typeof indirizzo === "object" && indirizzo !== null ? indirizzo.port : 0;
      server.close(() => risolvi(porta));
    });
  });
}

export interface AppAvviata {
  url: string;
  ferma(): Promise<void>;
}

/** Avvia `next start` con dati nuovi e assistente finto; torna quando la home risponde. */
export async function avviaApp(): Promise<AppAvviata> {
  const dati = mkdtempSync(join(tmpdir(), "travelops-e2e-"));
  const porta = await portaLibera();
  const figlio: ChildProcess = spawn(process.execPath, ["scripts/next.mjs", "start", "-p", String(porta), "-H", "127.0.0.1"], {
    cwd: CARTELLA_APP,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, TRAVELOPS_DATI: dati, TRAVELOPS_ASSISTENTE: "finto", OPENAI_API_KEY: "", NODE_ENV: "production" },
  });
  let uscita = "";
  figlio.stdout?.on("data", (d: Buffer) => (uscita += d.toString()));
  figlio.stderr?.on("data", (d: Buffer) => (uscita += d.toString()));
  const url = `http://127.0.0.1:${porta}`;
  const inizio = Date.now();
  for (;;) {
    try {
      const risposta = await fetch(url);
      if (risposta.ok) break;
    } catch {
      // Non è ancora pronta.
    }
    if (Date.now() - inizio > PAUSA_AVVIO_MS || figlio.exitCode !== null) {
      figlio.kill();
      throw new Error(`la web app non parte:\n${uscita.slice(-1500)}`);
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  return {
    url,
    async ferma() {
      if (figlio.exitCode === null) {
        figlio.kill("SIGTERM");
        await new Promise((r) => figlio.once("exit", r));
      }
      rmSync(dati, { recursive: true, force: true });
    },
  };
}

export interface Flusso {
  pagina: Page;
  url: string;
  vista: Vista;
  /** Un passo del flusso: se fallisce, screenshot e nome del passo. */
  passo<T>(nome: string, azione: () => Promise<T>): Promise<T>;
}

const nomeFile = (testo: string): string =>
  testo
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 60);

/** Esegue un flusso su una vista, con una web app nuova e una pagina nuova del browser. */
export async function eseguiFlusso(browser: Browser, nomeFlusso: string, vista: Vista, corpo: (f: Flusso) => Promise<void>): Promise<void> {
  const app = await avviaApp();
  const contesto = await browser.newContext({ viewport: { width: vista.larghezza, height: vista.altezza }, hasTouch: vista.larghezza < 768, locale: "it-IT" });
  contesto.setDefaultTimeout(10_000);
  const pagina = await contesto.newPage();
  const flusso: Flusso = {
    pagina,
    url: app.url,
    vista,
    async passo(nome, azione) {
      try {
        return await azione();
      } catch (errore) {
        mkdirSync(CARTELLA_ERRORI, { recursive: true });
        const file = join(CARTELLA_ERRORI, `${nomeFile(nomeFlusso)}--${vista.nome}--${nomeFile(nome)}.png`);
        await pagina.screenshot({ path: file, fullPage: true }).catch(() => undefined);
        const messaggio = errore instanceof Error ? errore.message : String(errore);
        throw new Error(`Passo non riuscito: «${nome}» (${nomeFlusso}, ${vista.nome}). Screenshot: ${file}\n${messaggio}`);
      }
    },
  };
  try {
    await corpo(flusso);
  } finally {
    await contesto.close();
    await app.ferma();
  }
}

export async function apriBrowser(percorso: string): Promise<Browser> {
  return chromium.launch({ executablePath: percorso, headless: true });
}

/** Il testo visibile della pagina, per le verifiche su ciò che vede l'utente. */
export async function testo(pagina: Page): Promise<string> {
  return pagina.evaluate(() => document.body.innerText);
}

/** La mia bozza di prova: Garda dal 10 al 13 luglio 2026 (l'orologio dell'app parte a giugno 2026), creata dal percorso guidato. */
export async function creaBozzaDalPercorso(f: Flusso): Promise<void> {
  const { pagina } = f;
  await f.passo("Apro le preferenze", async () => {
    await pagina.goto(`${f.url}/preferenze`);
    await pagina.getByText("Passo 1 di 5").waitFor();
  });
  await f.passo("Passo 1: scelgo il Lago di Garda", async () => {
    await pagina.getByRole("button", { name: "Lago di Garda (Riva del Garda e dintorni)" }).click();
    await pagina.getByText("Hai scelto: Lago di Garda").waitFor();
    await pagina.getByRole("button", { name: "Avanti" }).click();
  });
  await f.passo("Passo 2: scelgo le date", async () => {
    await pagina.getByText("Passo 2 di 5").waitFor();
    await pagina.getByLabel("Dal", { exact: true }).fill("2026-07-10");
    await pagina.getByLabel("Al", { exact: true }).fill("2026-07-13");
    await pagina.getByRole("button", { name: "Avanti" }).click();
  });
  for (const numero of [3, 4]) {
    await f.passo(`Passo ${numero}: vado avanti`, async () => {
      await pagina.getByText(`Passo ${numero} di 5`).waitFor();
      await pagina.getByRole("button", { name: "Avanti" }).click();
    });
  }
  await f.passo("Passo 5: creo la mia bozza", async () => {
    await pagina.getByText("Passo 5 di 5").waitFor();
    await pagina.getByRole("button", { name: "Crea la mia bozza" }).click();
    await pagina.waitForURL(/\/bozza\//);
    await pagina.getByRole("button", { name: "Conferma l'itinerario" }).waitFor();
  });
}
