/**
 * CA-7: nessuna chiamata di rete nei test automatici. Con ogni accesso alla rete di Node.js bloccato, la lettura,
 * il controllo dei minimi e la sorgente registrata funzionano lo stesso; e il codice del pacchetto non contiene
 * chiamate di rete (le aggiungerà solo la sorgente reale di ST-CAT-002, dietro `ClienteFonti`).
 */
import dns from "node:dns";
import { copyFileSync, readdirSync, readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  controllaMinimi,
  creaClienteRegistrato,
  creaSorgenteRegistrataDaFile,
  leggiCartellaIstantanee,
  leggiIstantanea,
} from "../src/index.js";
import { FILE_ISTANTANEA_DI_PROVA, ID_ISTANTANEA_DI_PROVA, istantaneaDiProva, nuovaCartella } from "./supporto.js";

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

describe("CA-7 nessuna chiamata di rete", () => {
  it("CA-7 il blocco funziona: chi prova a usare la rete fallisce e viene registrato", async () => {
    await expect(Promise.resolve().then(() => fetch("https://nominatim.openstreetmap.org/"))).rejects.toThrow("rete bloccata");
    expect(tentativi).toEqual(["fetch"]);
  });

  it("CA-7 lettura, minimi, cartella e sorgente registrata funzionano con la rete bloccata", async () => {
    const letta = leggiIstantanea(istantaneaDiProva());
    expect(letta.ok).toBe(true);
    if (letta.ok) expect(controllaMinimi(letta.istantanea).rispettati).toBe(true);

    const cartella = nuovaCartella();
    copyFileSync(FILE_ISTANTANEA_DI_PROVA, join(cartella, `${ID_ISTANTANEA_DI_PROVA}.json`));
    expect(leggiCartellaIstantanee(cartella)).toHaveLength(1);

    const sorgente = creaSorgenteRegistrataDaFile(cartella, fileURLToPath(new URL("./dati/registrazioni-di-prova.json", import.meta.url)));
    const [area] = await sorgente.cercaDestinazioni("borgo");
    expect(area).toBeDefined();
    if (area !== undefined) expect((await sorgente.costruisciIstantanea(area)).ok).toBe(true);
    await expect(creaClienteRegistrato([]).richiedi({ servizio: "osrm", url: "https://router.project-osrm.org/" })).rejects.toThrow(
      "la sorgente registrata non usa la rete",
    );

    expect(tentativi).toEqual([]);
  });

  it("CA-7 il codice del pacchetto non contiene chiamate di rete né moduli di rete", () => {
    const file = readdirSync(SORGENTI).filter((nome) => nome.endsWith(".ts"));
    expect(file.length).toBeGreaterThan(0);
    for (const nome of file) {
      const codice = readFileSync(join(SORGENTI, nome), "utf8");
      expect(codice, nome).not.toMatch(/\bfetch\s*\(/);
      expect(codice, nome).not.toMatch(/from\s+["']node:(http|https|net|dns|tls|dgram)["']/);
      expect(codice, nome).not.toMatch(/XMLHttpRequest|WebSocket/);
    }
  });
});
