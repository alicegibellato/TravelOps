import { describe, expect, it } from "vitest";
import { testoModifiche } from "../../src/demo/modifiche.js";
import { testoDemo } from "../../src/demo/scenari.js";

describe("demo a terminale: modifiche richieste (REQ-EDIT-001 CA-11)", () => {
  const demo = testoDemo();
  const testo = testoModifiche();
  const sezioni = testo.split(/^--- /m).slice(1);
  const di = (id: string): string => sezioni.find((s) => s.startsWith(id)) ?? "";

  it("npm run demo (testoDemo) mostra anche gli scenari M1–M6, dopo S1–S8", () => {
    expect(demo).toContain(testo);
    expect(demo.indexOf("=== S8")).toBeLessThan(demo.indexOf("--- M1"));
    expect(sezioni.map((s) => s.slice(0, 2))).toEqual(["M1", "M2", "M3", "M4", "M5", "M6", "Ri"]);
  });

  it("per ogni scenario mostra richiesta, modifiche proposte, spiegazione, esito ed elementi a rischio", () => {
    for (const sezione of sezioni.slice(0, 6)) {
      for (const voce of ["Modifica richiesta:", "Modifiche proposte:", "Spiegazione:", "Esito:", "Elementi a rischio:"]) {
        expect(sezione, `${sezione.slice(0, 2)}: manca "${voce}"`).toContain(voce);
      }
    }
  });

  it("mostra le modifiche e gli esiti attesi", () => {
    expect(di("M1")).toContain("+ aggiunto   N2 16:00–17:30 A-CANTINA (opzionale)");
    expect(di("M1")).toContain("Esito: fattibile");
    expect(di("M2")).toContain("~ modificato D2-E3 13:00–13:20 piedi PONALE → RIST-RIVA  =>  D2-E3 13:00–13:20 piedi PONALE → HOTEL");
    expect(di("M3")).toContain("~ modificato D1-E2 16:10–18:10 A-LUNGOLAGO (desiderata)  =>  D1-E2 17:00–19:00 A-LUNGOLAGO (desiderata)");
    expect(di("M4")).toContain("Esito: non fattibile");
    expect(di("M4")).toContain("SOVRAPPOSIZIONE (bloccante) su D2-E4, N2");
    expect(di("M5")).toContain("=>  D3-E2 10:00–12:00 A-BUONCONSIGLIO (irrinunciabile)");
    expect(di("M6")).toContain("=>  D2-E4 13:20–14:30 A-PRANZO-RIVA (desiderata) [orario fisso]");
  });

  it("per M1 mostra la versione 2 creata dopo l'accettazione, con la causa della modifica richiesta", () => {
    expect(di("M1")).toContain('Creata la versione 2: causa "Modifica richiesta: aggiungi A-CANTINA il 2026-06-13 alle 16:00"');
  });

  it("mostra gli errori di CA-7, senza proposta", () => {
    const errori = di("Richieste");
    for (const codice of [
      "NON_ATTIVITA",
      "PERCORSO_SCONOSCIUTO",
      "GIORNO_INESISTENTE",
      "ORARIO_FISSO",
      "ATTIVITA_INESISTENTE",
      "ELEMENTO_INESISTENTE",
      "FUORI_GIORNATA",
    ]) {
      expect(errori).toContain(`[${codice}]`);
    }
    expect(errori).not.toContain("nessun errore");
  });

  it("è deterministica", () => {
    expect(testoModifiche()).toBe(testo);
    expect(testoDemo()).toBe(demo);
  });
});
