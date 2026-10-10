import { describe, expect, it } from "vitest";
import { testoDemo } from "../../src/demo/scenari.js";

describe("demo a terminale (REQ-REPLAN-002 CA-14, REQ-REPLAN-004 CA-9)", () => {
  const testo = testoDemo();
  const sezioni = testo.split(/^=== /m).slice(1);

  const id = (sezione: string): string => sezione.split(" ")[0] ?? "";

  it("mostra gli scenari S1–S14 in ordine", () => {
    expect(sezioni.map(id)).toEqual(["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10", "S11", "S12", "S13", "S14"]);
  });

  it("per ogni scenario mostra imprevisto, impatto, modifiche, spiegazione, esito, elementi a rischio e alternative", () => {
    for (const sezione of sezioni) {
      for (const voce of [
        "Imprevisto:",
        "Impatto:",
        "Modifiche proposte:",
        "Spiegazione:",
        "Esito:",
        "Livello:",
        "Elementi a rischio:",
        "Alternative:",
      ]) {
        expect(sezione, `${id(sezione)}: manca "${voce}"`).toContain(voce);
      }
    }
  });

  it("mostra esiti, elementi a rischio e alternative attesi", () => {
    const di = (x: string): string => sezioni.find((s) => id(s) === x) ?? "";
    expect(di("S1")).toContain("+ aggiunto   N1 10:00–12:00 A-MAG");
    expect(di("S6")).toContain("Esito: non fattibile");
    expect(di("S6")).toContain("Elementi a rischio: D3-E2, D3-E4");
    expect(di("S7")).toContain("Elementi a rischio: D3-E9");
    expect(di("S7")).toContain("https://example.com/prenotazioni/XY123");
    expect(di("S8")).toContain("Elementi a rischio: D3-E8, D3-E9");
  });

  it("CA-9 mostra anche S9–S14 con i risultati attesi", () => {
    const di = (x: string): string => sezioni.find((s) => id(s) === x) ?? "";
    expect(di("S9")).toContain("+ aggiunto   N1 10:00–12:00 A-MAG");
    expect(di("S9")).toContain("caviglia slogata");
    expect(di("S9")).toContain("[farmacie_vicine]: Farmacie vicine");
    expect(di("S10")).toContain("Elementi a rischio: D3-E9");
    expect(di("S11")).toContain("D3-E1 08:40–09:30 auto HOTEL → BUONCONSIGLIO");
    expect(di("S12")).toContain("+ aggiunto   N1 09:00–10:30 A-ACQUISTI (irrinunciabile)");
    expect(di("S13")).toContain("Esito: non fattibile");
    expect(di("S13")).toContain("Rigenera questa giornata");
    expect(di("S13")).toContain("[denuncia_polizia]: Polizia di Stato — denuncia -> https://www.poliziadistato.it");
    expect(di("S14")).toContain("nessuna: l'itinerario resta com'è");
    for (const sezione of sezioni) expect(sezione, id(sezione)).toContain("Livello: minimo");
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
