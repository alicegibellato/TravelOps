import { describe, expect, it } from "vitest";
import { testoDemo } from "../../src/demo/scenari.js";

describe("demo a terminale (REQ-REPLAN-002 CA-14)", () => {
  const testo = testoDemo();
  const sezioni = testo.split(/^=== /m).slice(1);

  it("mostra gli scenari S1–S8 in ordine", () => {
    expect(sezioni.map((s) => s.slice(0, 2))).toEqual(["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"]);
  });

  it("per ogni scenario mostra imprevisto, impatto, modifiche, spiegazione, esito, elementi a rischio e alternative", () => {
    for (const sezione of sezioni) {
      for (const voce of [
        "Imprevisto:",
        "Impatto:",
        "Modifiche proposte:",
        "Spiegazione:",
        "Esito:",
        "Elementi a rischio:",
        "Alternative:",
      ]) {
        expect(sezione, `${sezione.slice(0, 2)}: manca "${voce}"`).toContain(voce);
      }
    }
  });

  it("mostra esiti, elementi a rischio e alternative attesi", () => {
    const di = (id: string): string => sezioni.find((s) => s.startsWith(id)) ?? "";
    expect(di("S1")).toContain("+ aggiunto   N1 10:00–12:00 A-MAG");
    expect(di("S6")).toContain("Esito: non fattibile");
    expect(di("S6")).toContain("Elementi a rischio: D3-E2, D3-E4");
    expect(di("S7")).toContain("Elementi a rischio: D3-E9");
    expect(di("S7")).toContain("https://example.com/prenotazioni/XY123");
    expect(di("S8")).toContain("Elementi a rischio: D3-E8, D3-E9");
  });

  it("per S1 mostra la versione 2 creata dopo l'accettazione", () => {
    const s1 = sezioni[0] ?? "";
    expect(s1).toContain("Creata la versione 2");
    expect(s1).toContain('causa "Meteo avverso: pioggia in GARDA_NORD il 2026-06-13 08:00–13:00"');
    expect(s1).toContain("accettata da Alice il 2026-06-13 alle 07:30");
    expect(s1).toContain("N1 10:00–12:00 A-MAG");
  });

  it("è deterministica", () => {
    expect(testoDemo()).toBe(testo);
  });
});
