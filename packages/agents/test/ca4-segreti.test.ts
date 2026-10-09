/**
 * CA-4: nessuna chiave nel codice o nei log.
 *
 * - Con una chiave finta, anche chiedendo all'SDK il log più dettagliato (`OPENAI_LOG=debug`), niente di quello che
 *   finisce su console, stdout o stderr contiene la chiave; né gli errori (anche quando il fornitore cita la chiave
 *   nel suo messaggio), né il client, né lo stato restituito.
 * - Nessun file del repository contiene qualcosa che sembri una chiave OpenAI; `.env.local` è escluso da Git.
 * - Il codice del pacchetto non scrive log.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { inspect } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creaClienteDaAmbiente, eseguiCicloCompleto, type ClienteModello } from "../src/index.js";
import { chiaveFinta, creaFetchFinto, eventiRisposta, strumentiDiProva } from "./supporto.js";

const RADICE = fileURLToPath(new URL("../../../", import.meta.url));
const SORGENTI = fileURLToPath(new URL("../src", import.meta.url));

const scritto: string[] = [];

beforeEach(() => {
  scritto.length = 0;
  for (const metodo of ["log", "info", "warn", "error", "debug", "trace"] as const) {
    vi.spyOn(console, metodo).mockImplementation((...argomenti: unknown[]) => {
      scritto.push(argomenti.map((a) => (typeof a === "string" ? a : inspect(a, { depth: 10 }))).join(" "));
    });
  }
  for (const flusso of [process.stdout, process.stderr]) {
    const originale = flusso.write.bind(flusso);
    vi.spyOn(flusso, "write").mockImplementation(((pezzo: unknown, ...resto: unknown[]) => {
      scritto.push(String(pezzo));
      return (originale as (...a: unknown[]) => boolean)(pezzo, ...resto);
    }) as typeof flusso.write);
  }
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function cliente(ambiente: Record<string, string>, fetch: ReturnType<typeof creaFetchFinto>["fetch"]): ClienteModello {
  const stato = creaClienteDaAmbiente(ambiente, { fetch, maxTentativi: 0 });
  if (!stato.disponibile) throw new Error("serve il client");
  expect(inspect(stato, { depth: 10, showHidden: true })).not.toContain(chiaveFinta());
  expect(JSON.stringify(stato)).not.toContain(chiaveFinta());
  return stato.cliente;
}

describe("CA-4 nessuna chiave nei log", () => {
  it("CA-4 la cattura dei log funziona (controllo del test)", () => {
    console.warn("marcatore-di-prova");
    expect(scritto.join("\n")).toContain("marcatore-di-prova");
  });

  it("CA-4 risposte, errori dell'API che citano la chiave e ciclo degli strumenti: la chiave non compare mai", async () => {
    const chiave = chiaveFinta();
    vi.stubEnv("OPENAI_LOG", "debug");
    vi.stubEnv("DEBUG", "*");
    const ambiente = { OPENAI_API_KEY: chiave };
    const finto = creaFetchFinto(
      { eventi: eventiRisposta([], [{ id: "c1", nome: "somma_di_prova", argomenti: "{\"a\":1,\"b\":2}" }]) },
      { eventi: eventiRisposta(["Fa 3."]) },
      { stato: 401, corpo: { error: { message: `Incorrect API key provided: ${chiave}`, type: "invalid_request_error", code: "invalid_api_key" } } },
      { eventi: [{ type: "error", code: "x", message: `chiave ${chiave}`, param: null, sequence_number: 0 }] },
    );
    const modello = cliente(ambiente, finto.fetch);

    const esito = await eseguiCicloCompleto({ cliente: modello, messaggi: [{ ruolo: "utente", testo: "1+2?" }], strumenti: strumentiDiProva() });
    expect(esito.testo).toBe("Fa 3.");

    const errori: unknown[] = [];
    for (let i = 0; i < 2; i += 1) {
      try {
        for await (const _ of modello.rispondi({ messaggi: [{ ruolo: "utente", testo: "ciao" }] })) void _;
      } catch (errore) {
        errori.push(errore);
      }
    }
    expect(errori).toHaveLength(2);
    for (const errore of errori) {
      const e = errore as Error;
      for (const testo of [e.message, String(e.stack), String(e), JSON.stringify(e), inspect(e, { depth: 10, showHidden: true })]) {
        expect(testo).not.toContain(chiave);
        expect(testo).not.toContain("Incorrect API key");
      }
    }
    // La chiave è stata usata, ma solo nell'intestazione di autenticazione verso l'API.
    expect(finto.richieste.every((r) => r.intestazioni.get("authorization") === `Bearer ${chiave}`)).toBe(true);
    expect(finto.richieste.some((r) => JSON.stringify(r.corpo).includes(chiave))).toBe(false);

    expect(scritto.join("\n")).not.toContain(chiave);
    expect(scritto.join("\n")).not.toContain(chiave.slice(-12));
  });
});

/** I file di testo del repository (senza dipendenze, compilati e dati locali). */
function fileDelRepository(): { file: string; testo: string }[] {
  const esclusi = new Set(["node_modules", ".git", "dist", ".next", ".data", "coverage"]);
  const trovati: { file: string; testo: string }[] = [];
  const visita = (cartella: string): void => {
    for (const nome of readdirSync(cartella)) {
      if (esclusi.has(nome)) continue;
      const percorso = join(cartella, nome);
      const info = statSync(percorso);
      if (info.isDirectory()) visita(percorso);
      else if (/\.(ts|tsx|mts|js|mjs|cjs|json|md|ya?ml|txt|css|html)$|^\.env/.test(nome) && info.size < 5_000_000) {
        trovati.push({ file: relative(RADICE, percorso).replaceAll("\\", "/"), testo: readFileSync(percorso, "utf8") });
      }
    }
  };
  visita(RADICE);
  return trovati;
}

describe("CA-4 nessuna chiave nel codice", () => {
  it("CA-4 nessun file del repository contiene una chiave OpenAI o un'assegnazione di OPENAI_API_KEY con un valore", () => {
    const file = fileDelRepository();
    expect(file.length).toBeGreaterThan(50);
    const chiave = /\bsk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{20,}/;
    const assegnazione = /OPENAI_API_KEY\s*=\s*["']?(?!\.\.\.|<|["'`\s]|$)[^\s"'`]{8,}/m;
    const trovati = file.filter(({ testo }) => chiave.test(testo) || assegnazione.test(testo)).map(({ file }) => file);
    expect(trovati).toEqual([]);
  }, 60_000);

  it("CA-4 apps/web/.env.local (dove sta la chiave) è escluso da Git", () => {
    const regole = readFileSync(join(RADICE, ".gitignore"), "utf8")
      .split(/\r?\n/)
      .map((riga) => riga.trim());
    expect(regole.some((r) => r === ".env*.local" || r === ".env.local" || r === "*.local")).toBe(true);
  });

  it("CA-4 il codice del pacchetto non scrive log e legge la chiave solo in ambiente.ts", () => {
    const file = readdirSync(SORGENTI).filter((nome) => nome.endsWith(".ts"));
    expect(file.length).toBeGreaterThan(0);
    for (const nome of file) {
      const codice = readFileSync(join(SORGENTI, nome), "utf8");
      expect(codice, nome).not.toMatch(/\bconsole\.|process\.(stdout|stderr)/);
      // Nei commenti se ne può parlare; nel codice la variabile si legge solo in ambiente.ts.
      const senzaCommenti = codice.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
      if (nome !== "ambiente.ts") expect(senzaCommenti, nome).not.toMatch(/process\.env|OPENAI_API_KEY/);
    }
  });
});
