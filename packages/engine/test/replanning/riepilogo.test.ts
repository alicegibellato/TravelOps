/**
 * Spiegazione breve e nota informativa (ST-UX-004A CA-4, CA-5): riepilogo di al massimo tre frasi senza codici
 * interni; un ritardo che non cambia nessuna attività è solo un'informazione, non una proposta da accettare.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { creaSorgenteDaDati } from "../../src/context/index.js";
import type { Catalogo, DatiContesto, Imprevisto, Viaggio } from "../../src/model/index.js";
import { proponiRipianificazione } from "../../src/replanning/index.js";

const leggi = <T>(file: string): T =>
  JSON.parse(readFileSync(new URL(`../../data/reference/${file}`, import.meta.url), "utf8")) as T;

const catalogo = leggi<Catalogo>("catalogo.json");
const sorgente = creaSorgenteDaDati(leggi<DatiContesto>("contesto.json"));
const scenari = leggi<{ id: string; itinerario: string; imprevisto: Imprevisto }[]>("scenari-imprevisti.json");

const viaggio = (): Viaggio => leggi<Viaggio>("versione-1.json");
const imprevistoDi = (id: string): Imprevisto => {
  const trovato = scenari.find((s) => s.id === id);
  if (!trovato) throw new Error(`scenario ${id} assente`);
  return trovato.imprevisto;
};

const frasi = (testo: string): string[] => testo.split(/(?<=[.!?])\s+/).filter((f) => f !== "");
const CODICI_INTERNI = /\b(D\d+-E\d+|N\d+|[A-Z]+_[A-Z_]+)\b/;

describe("CA-4 — riepilogo breve", () => {
  for (const id of ["S1", "S2", "S3", "S4", "S5"]) {
    it(`${id}: al massimo 3 frasi e nessun codice interno`, () => {
      const p = proponiRipianificazione(viaggio(), 1, catalogo, sorgente, imprevistoDi(id));
      expect(p.riepilogo).toBeDefined();
      const riepilogo = p.riepilogo ?? "";
      expect(frasi(riepilogo).length).toBeLessThanOrEqual(3);
      expect(riepilogo).not.toMatch(CODICI_INTERNI);
      // I dettagli restano: la spiegazione completa è più lunga del riepilogo.
      expect(p.spiegazione.length).toBeGreaterThan(riepilogo.length);
    });
  }

  it("l'elenco dei problemi nei dettagli non mostra i codici del motore", () => {
    const p = proponiRipianificazione(viaggio(), 1, catalogo, sorgente, imprevistoDi("S3"));
    expect(p.spiegazione).not.toMatch(/\b[A-Z]+_[A-Z_]+ \((bloccante|avviso)\)/);
  });

  it("il riepilogo dice cosa cambia e che serve accettare", () => {
    const p = proponiRipianificazione(viaggio(), 1, catalogo, sorgente, imprevistoDi("S3"));
    expect(p.riepilogo).toMatch(/solo se la accetti|non è fattibile/);
    expect(p.informativa).toBeUndefined();
  });
});

describe("CA-5 — ritardo senza effetto", () => {
  const ritardoLieve: Imprevisto = { tipo: "RITARDO", data: "2026-06-13", momento: "23:00", minuti: 15, motivo: "" };

  it("non cambia nessuna attività: nota informativa, nessuna modifica da accettare", () => {
    const p = proponiRipianificazione(viaggio(), 1, catalogo, sorgente, ritardoLieve);
    expect(p.modifiche).toEqual({ aggiunti: [], rimossi: [], modificati: [] });
    expect(p.informativa).toBe(true);
    expect(p.riepilogo).toMatch(/Nessuna attività cambia/);
    expect(p.riepilogo).toMatch(/nessuna modifica da accettare/);
    expect(p.spiegazione).not.toMatch(/solo se la accetti/);
    expect(frasi(p.riepilogo ?? "").length).toBeLessThanOrEqual(3);
  });

  it("un ritardo che sposta qualcosa resta una proposta da accettare", () => {
    const p = proponiRipianificazione(viaggio(), 1, catalogo, sorgente, imprevistoDi("S2"));
    expect(p.modifiche.modificati.length + p.modifiche.rimossi.length + p.modifiche.aggiunti.length).toBeGreaterThan(0);
    expect(p.informativa).toBeUndefined();
  });

  it("gli altri imprevisti senza modifiche non sono note informative", () => {
    const meteo: Imprevisto = { tipo: "METEO_AVVERSO", zonaId: "Z-RIVA", data: "2026-06-20", inizio: "10:00", fine: "11:00", condizione: "pioggia" };
    const p = proponiRipianificazione(viaggio(), 1, catalogo, sorgente, meteo);
    expect(p.informativa).toBeUndefined();
  });
});
