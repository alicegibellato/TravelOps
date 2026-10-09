/**
 * REQ-WEB-004 CA-1: i criteri di REQ-WEB-002 restano soddisfatti (li verificano i test web002-*, adattati solo al nuovo
 * markup) e CA-8 vale con lo stato salvato nella base dati di REQ-DATA-001.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ripristinaViaggiDemoAzione } from "../app/demo/azioni";
import { ContenutoProposta } from "../src/componenti/ContenutiStato";
import { fileBaseDati, leggiStato } from "../src/stato/archivio";
import { accettaProposta, avviaScenario, impostaOrologio } from "../src/stato/operazioni";
import { html } from "./supporto";
import { AZIONI_PROPOSTA, nuovaCartella, RIPRISTINA, statoSalvato, storicoNelDatabase } from "./supporto-stato";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((indirizzo: string) => {
    throw new Error(`REDIRECT ${indirizzo}`);
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CA-1 i criteri di REQ-WEB-002 restano soddisfatti, con lo stato nel database", () => {
  it("CA-1 accettare S1 come Alice salva la versione 2 nel database, non in un file JSON", () => {
    const cartella = nuovaCartella();
    avviaScenario(cartella, "S1");
    impostaOrologio(cartella, "2026-06-13", "07:30");
    expect(accettaProposta(cartella, 1, "Alice").ok).toBe(true);
    expect(existsSync(fileBaseDati(cartella))).toBe(true);
    expect(readdirSync(cartella).filter((nome) => nome.endsWith(".json"))).toEqual([]);
    const stato = statoSalvato(cartella);
    expect(stato.storico.versioni.map((v) => [v.numero, v.autore])).toEqual([[1, null], [2, "Alice"]]);
    expect(storicoNelDatabase(cartella)).toContain('"autore": "Alice"');
  });

  it("CA-1 dopo il riavvio la pagina della proposta mostra ancora la decisione presa", async () => {
    const cartella = nuovaCartella();
    avviaScenario(cartella, "S1");
    accettaProposta(cartella, 1, "Alice");
    vi.resetModules();
    const archivio = await import("../src/stato/archivio");
    const markup = html(<ContenutoProposta esito={archivio.leggiStato(cartella)} id={1} azioni={AZIONI_PROPOSTA} ripristina={RIPRISTINA} />);
    expect(markup).toContain("Accettata da Alice");
    expect(markup).not.toContain(">Accetta</button>");
  });

  it("CA-1 \"Ripristina i viaggi demo\" riporta lo stato salvato all'itinerario di partenza", async () => {
    const cartella = nuovaCartella();
    vi.spyOn(process, "cwd").mockReturnValue(cartella);
    const dati = join(cartella, ".data");
    avviaScenario(dati, "S1");
    accettaProposta(dati, 1, "Alice");
    expect(statoSalvato(dati).storico.versioni).toHaveLength(2);
    await expect(ripristinaViaggiDemoAzione()).rejects.toThrow("REDIRECT /demo");
    const dopo = leggiStato(dati);
    expect(dopo.ok && [dopo.stato.storico.versioni.length, dopo.stato.proposte]).toEqual([1, []]);
  });
});
