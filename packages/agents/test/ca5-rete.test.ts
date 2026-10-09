/**
 * CA-5: nessuna chiamata di rete nei test automatici. Con ogni accesso alla rete di Node.js bloccato, client finto,
 * ciclo degli strumenti, stato senza chiave e client OpenAI con il fetch finto funzionano; il client OpenAI senza
 * fetch finto prova a usare il fetch globale (bloccato) e lo traduce in "AI non disponibile". L'unica strada verso la
 * rete del pacchetto è l'SDK `openai`, usato solo in `openai.ts`.
 */
import dns from "node:dns";
import { readdirSync, readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  caricaConversazioneRegistrata,
  creaClienteDaAmbiente,
  creaClienteFinto,
  creaClienteOpenAI,
  ErroreAiNonDisponibile,
  eseguiCicloCompleto,
  raccogliRisposta,
} from "../src/index.js";
import { chiaveFinta, creaFetchFinto, eventiRisposta, strumentiDiProva } from "./supporto.js";

const SORGENTI = fileURLToPath(new URL("../src", import.meta.url));

const tentativi: string[] = [];
const blocca = (nome: string) => (): never => {
  tentativi.push(nome);
  throw new Error(`rete bloccata nei test: ${nome}`);
};

beforeEach(() => {
  tentativi.length = 0;
  vi.stubGlobal("fetch", blocca("fetch"));
  vi.spyOn(net.Socket.prototype, "connect").mockImplementation(blocca("net.Socket.connect"));
  vi.spyOn(http, "request").mockImplementation(blocca("http.request"));
  vi.spyOn(https, "request").mockImplementation(blocca("https.request"));
  vi.spyOn(dns, "lookup").mockImplementation(blocca("dns.lookup"));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("CA-5 nessuna chiamata di rete", () => {
  it("CA-5 il blocco funziona: chi prova a usare la rete fallisce e viene registrato", async () => {
    await expect(Promise.resolve().then(() => fetch("https://api.openai.com/v1/responses"))).rejects.toThrow("rete bloccata");
    expect(tentativi).toEqual(["fetch"]);
  });

  it("CA-5 client finto, ciclo, stato senza chiave e client OpenAI con fetch finto funzionano con la rete bloccata", async () => {
    const finto = creaClienteFinto(caricaConversazioneRegistrata(new URL("./dati/conversazione-di-prova.json", import.meta.url)));
    const esito = await eseguiCicloCompleto({
      cliente: finto,
      istruzioni: "Sei l'assistente di viaggio di prova.",
      messaggi: [{ ruolo: "utente", testo: "Che tempo fa a Lisbona? E quanto fa 2 più 3?" }],
      strumenti: strumentiDiProva(),
    });
    expect(esito.motivo).toBe("completata");

    expect(creaClienteDaAmbiente({}).disponibile).toBe(false);
    // Creare il client vero non chiama la rete.
    expect(creaClienteDaAmbiente({ OPENAI_API_KEY: chiaveFinta() }).disponibile).toBe(true);

    const conFetchFinto = creaClienteOpenAI({ chiaveApi: chiaveFinta(), fetch: creaFetchFinto({ eventi: eventiRisposta(["ok"]) }).fetch, maxTentativi: 0 });
    expect((await raccogliRisposta(conFetchFinto.rispondi({ messaggi: [{ ruolo: "utente", testo: "ciao" }] }))).testo).toBe("ok");

    expect(tentativi).toEqual([]);
  });

  it("CA-5 il client OpenAI senza fetch finto passa dal fetch globale (bloccato) e risponde \"AI non disponibile\"", async () => {
    const stato = creaClienteDaAmbiente({ OPENAI_API_KEY: chiaveFinta() }, { maxTentativi: 0 });
    if (!stato.disponibile) throw new Error("serve il client");
    const errore = await raccogliRisposta(stato.cliente.rispondi({ messaggi: [{ ruolo: "utente", testo: "ciao" }] })).catch((e: unknown) => e);
    expect(errore).toBeInstanceOf(ErroreAiNonDisponibile);
    expect((errore as ErroreAiNonDisponibile).causa).toBe("rete");
    expect(tentativi).toEqual(["fetch"]);
  });

  it("CA-5 nel codice del pacchetto nessuna chiamata di rete diretta; l'SDK openai solo in openai.ts", () => {
    const file = readdirSync(SORGENTI).filter((nome) => nome.endsWith(".ts"));
    expect(file.length).toBeGreaterThan(0);
    for (const nome of file) {
      const codice = readFileSync(join(SORGENTI, nome), "utf8");
      expect(codice, nome).not.toMatch(/\bfetch\s*\(/);
      expect(codice, nome).not.toMatch(/from\s+["']node:(http|https|net|dns|tls|dgram)["']/);
      expect(codice, nome).not.toMatch(/XMLHttpRequest|WebSocket/);
      if (nome !== "openai.ts") expect(codice, nome).not.toMatch(/from\s+["']openai/);
    }
  });
});
