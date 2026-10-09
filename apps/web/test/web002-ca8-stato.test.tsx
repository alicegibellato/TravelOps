import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { creaStorico, esportaStorico } from "@travelops/engine";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ripristinaAzione } from "../app/demo/azioni";
import { ContenutoDemo, ContenutoVersioneGiorno } from "../src/componenti/ContenutiStato";
import { cartellaDati, fileStato, leggiStato } from "../src/stato/archivio";
import { accettaProposta, avviaScenario, impostaOrologio, ripristina } from "../src/stato/operazioni";
import { datiValidi, html } from "./supporto";
import { AZIONI_DEMO, nuovaCartella, RIPRISTINA, statoSalvato } from "./supporto-stato";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((indirizzo: string) => {
    throw new Error(`REDIRECT ${indirizzo}`);
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

afterEach(() => {
  vi.restoreAllMocks();
});

const CARTELLA_APP = fileURLToPath(new URL("..", import.meta.url));

/** Lo storico con la sola versione 1 del viaggio di riferimento con quella chiave. */
function storicoDiPartenza(chiave: string): string {
  const creato = creaStorico(datiValidi(chiave).viaggio);
  if (!creato.ok) throw new Error(creato.errore.messaggio);
  return esportaStorico(creato.storico);
}

function dopoCA2(cartella: string): void {
  avviaScenario(cartella, "S1");
  impostaOrologio(cartella, "2026-06-13", "07:30");
  accettaProposta(cartella, 1, "Alice");
}

describe("CA-8 lo stato sopravvive al riavvio della web app", () => {
  it("CA-8 lo stato è un file JSON in apps/web/.data, escluso da Git", () => {
    expect(cartellaDati()).toBe(join(process.cwd(), ".data"));
    // `scripts/next.mjs` avvia Next.js dalla cartella della web app: lì si trova `.data`.
    expect(readFileSync(join(CARTELLA_APP, "scripts/next.mjs"), "utf8")).toContain("cwd: cartellaApp");
    expect(readFileSync(join(CARTELLA_APP, ".gitignore"), "utf8").split(/\r?\n/)).toContain(".data/");
    const ignorato = execFileSync("git", ["check-ignore", "apps/web/.data/stato.json"], { cwd: join(CARTELLA_APP, "../.."), encoding: "utf8" });
    expect(ignorato.trim()).toBe("apps/web/.data/stato.json");
  });

  it("CA-8 riletto dopo il riavvio (moduli ricaricati), lo stato è identico: storico, orologio, scenario e proposte", async () => {
    const cartella = nuovaCartella();
    dopoCA2(cartella);
    const prima = statoSalvato(cartella);
    expect(existsSync(fileStato(cartella))).toBe(true);

    // Riavvio: nessun dato resta in memoria, i moduli si ricaricano e leggono solo il file.
    vi.resetModules();
    const archivio = await import("../src/stato/archivio");
    const riletto = archivio.leggiStato(cartella);
    if (!riletto.ok) throw new Error(riletto.motivo);
    expect(esportaStorico(riletto.stato.storico)).toBe(esportaStorico(prima.storico));
    expect(riletto.stato.storico.versioni.map((v) => [v.numero, v.causa, v.autore])).toEqual([
      [1, "Itinerario iniziale", null],
      [2, "Meteo avverso: pioggia in GARDA_NORD il 2026-06-13 08:00–13:00", "Alice"],
    ]);
    expect(riletto.stato.orologio).toEqual({ data: "2026-06-13", ora: "07:30" });
    expect(riletto.stato.scenario).toBe("S1");
    expect(riletto.stato.proposte).toEqual(prima.proposte);
    expect(riletto.stato.prossimaProposta).toBe(2);
  });

  it("CA-8 lo storico nel file è quello di esportaStorico e la pagina Demo lo mostra dopo il riavvio", () => {
    const cartella = nuovaCartella();
    dopoCA2(cartella);
    const documento = JSON.parse(readFileSync(fileStato(cartella), "utf8")) as Record<string, unknown>;
    expect(Object.keys(documento)).toEqual(["formato", "partenza", "scenario", "orologio", "storico", "proposte", "prossimaProposta"]);
    expect(`${JSON.stringify(documento.storico, null, 2)}`).toBe(esportaStorico(statoSalvato(cartella).storico));
    const demo = html(<ContenutoDemo esito={leggiStato(cartella)} azioni={AZIONI_DEMO} />);
    expect(demo).toContain('data-versione-corrente="2"');
    expect(demo).toContain('data-orologio="2026-06-13 07:30"');
  });

  it("senza file si parte dalla versione 1 di riferimento, senza scrivere nulla", () => {
    const cartella = nuovaCartella();
    const stato = statoSalvato(cartella);
    expect(esportaStorico(stato.storico)).toBe(storicoDiPartenza("versione-1"));
    expect([stato.partenza, stato.scenario, stato.orologio]).toEqual(["versione-1", null, { data: "2026-06-12", ora: "08:00" }]);
    expect(existsSync(fileStato(cartella))).toBe(false);
  });

  it("un file non valido non rompe la web app: la Demo mostra il motivo e Ripristina", () => {
    const cartella = nuovaCartella();
    dopoCA2(cartella);
    writeFileSync(fileStato(cartella), "{ non è json", "utf8");
    const demo = html(<ContenutoDemo esito={leggiStato(cartella)} azioni={AZIONI_DEMO} />);
    expect(demo).toContain("Lo stato salvato non è valido");
    expect(demo).toContain("il file non contiene JSON valido");
    expect(demo).toContain(">Ripristina</button>");
    ripristina(cartella);
    expect(esportaStorico(statoSalvato(cartella).storico)).toBe(storicoDiPartenza("versione-1"));
  });

  it("uno storico manomesso nel file è rifiutato dal motore (importaStorico)", () => {
    const cartella = nuovaCartella();
    dopoCA2(cartella);
    const documento = JSON.parse(readFileSync(fileStato(cartella), "utf8")) as { storico: { versioni: { causa: string }[] } };
    const v1 = documento.storico.versioni[0];
    if (v1 !== undefined) v1.causa = "Altro";
    writeFileSync(fileStato(cartella), JSON.stringify(documento), "utf8");
    const letto = leggiStato(cartella);
    expect(letto.ok).toBe(false);
    expect(letto.ok ? "" : letto.motivo).toMatch(/^\[STORICO_NON_VALIDO\]/);
  });
});

describe("CA-8 \"Ripristina\" torna all'itinerario di partenza", () => {
  it("CA-8 dopo la versione 2 di S1, Ripristina lascia la sola versione 1 della versione 1 di riferimento", () => {
    const cartella = nuovaCartella();
    dopoCA2(cartella);
    const esito = ripristina(cartella);
    expect(esito.ok).toBe(true);
    const stato = statoSalvato(cartella);
    expect(stato.storico.versioni.map((v) => v.numero)).toEqual([1]);
    expect(esportaStorico(stato.storico)).toBe(storicoDiPartenza("versione-1"));
    expect(stato.proposte).toEqual([]);
    // Restano lo scenario in corso (con il suo imprevisto) e l'orologio; i numeri delle proposte non si riusano.
    expect([stato.scenario, stato.orologio, stato.prossimaProposta]).toEqual(["S1", { data: "2026-06-13", ora: "07:30" }, 2]);
    const giorno = html(<ContenutoVersioneGiorno esito={leggiStato(cartella)} numero={1} data="2026-06-13" ripristina={RIPRISTINA} />);
    expect(giorno).toContain('data-elemento="D2-E2"');
    expect(giorno).not.toContain('data-elemento="N1"');
  });

  it("CA-8 con uno scenario su una variante (S8, V-VOLO) Ripristina torna alla variante", () => {
    const cartella = nuovaCartella();
    avviaScenario(cartella, "S8");
    accettaProposta(cartella, 1, "Alice");
    expect(statoSalvato(cartella).storico.versioni).toHaveLength(2);
    ripristina(cartella);
    expect(esportaStorico(statoSalvato(cartella).storico)).toBe(storicoDiPartenza("v-volo"));
  });

  it("CA-8 con l'azione Ripristina, anche dopo il riavvio", async () => {
    const cartella = nuovaCartella();
    vi.spyOn(process, "cwd").mockReturnValue(cartella);
    const dati = join(cartella, ".data");
    dopoCA2(dati);
    await expect(ripristinaAzione()).rejects.toThrow("REDIRECT /demo");
    vi.resetModules();
    const archivio = await import("../src/stato/archivio");
    const riletto = archivio.leggiStato(dati);
    expect(riletto.ok && esportaStorico(riletto.stato.storico)).toBe(storicoDiPartenza("versione-1"));
  });
});
