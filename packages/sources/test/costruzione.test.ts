/**
 * Le regole della costruzione reale (REQ-CAT-002), una per una: query limitata all'area, scelta per stile fino a
 * 120 attività, fascia degli alloggi, stima dei mezzi pubblici, frase breve dalle descrizioni. Nessuna rete.
 */
import { describe, expect, it } from "vitest";
import {
  fasciaAlloggio,
  fraseBreve,
  MASSIMO_ATTIVITA,
  queryOverpass,
  RAGGIO_KM,
  stimaMezziPubblici,
  type StileViaggio,
} from "../src/index.js";
import { scegliPerStile } from "../src/costruzione.js";

describe("costruzione reale: regole", () => {
  it("la query Overpass è limitata all'area (riquadri attorno al centro) e ogni gruppo ha un massimo di risultati", () => {
    const query = queryOverpass({ lat: 41.89332, lon: 12.48293 });
    const righe = query.split("\n").slice(1);
    expect(righe.length).toBeGreaterThan(10);
    for (const riga of righe) expect(riga).toMatch(/\((\d+\.\d{4},){3}\d+\.\d{4}\);out tags center \d+;$/);
    // Il riquadro delle attività: circa RAGGIO_KM chilometri dal centro in ogni direzione.
    const museo = /museum\|gallery.*\["wikidata"\]\(([^)]*)\)/.exec(query)?.[1]?.split(",").map(Number) ?? [];
    expect(((museo[2] ?? 0) - (museo[0] ?? 0)) * 111.32).toBeCloseTo(2 * RAGGIO_KM, 0);
  });

  it("le attività si scelgono a turno tra gli stili, nell'ordine di preferenza, fino al massimo", () => {
    const voci = [
      { id: "A", stili: ["cultura"] as StileViaggio[] },
      { id: "B", stili: ["cultura"] as StileViaggio[] },
      { id: "C", stili: ["natura", "avventura"] as StileViaggio[] },
      { id: "D", stili: ["relax"] as StileViaggio[] },
      { id: "E", stili: ["cultura"] as StileViaggio[] },
    ];
    expect(scegliPerStile(voci, 10).map((v) => v.id)).toEqual(["D", "A", "C", "B", "E"]);
    expect(scegliPerStile(voci, 3).map((v) => v.id)).toEqual(["D", "A", "C"]);
    const tante = Array.from({ length: 300 }, (_, i) => ({ id: `X${String(i).padStart(3, "0")}`, stili: ["natura"] as StileViaggio[] }));
    expect(scegliPerStile(tante, MASSIMO_ATTIVITA)).toHaveLength(120);
  });

  it("la fascia di un alloggio viene dalle stelle o dal tipo", () => {
    expect(fasciaAlloggio({ tourism: "hostel" })).toBe("€");
    expect(fasciaAlloggio({ tourism: "guest_house" })).toBe("€");
    expect(fasciaAlloggio({ tourism: "hotel", stars: "2" })).toBe("€");
    expect(fasciaAlloggio({ tourism: "hotel", stars: "3S" })).toBe("€€");
    expect(fasciaAlloggio({ tourism: "hotel", stars: "4" })).toBe("€€€");
    expect(fasciaAlloggio({ tourism: "hotel" })).toBe("€€");
  });

  it("i mezzi pubblici sono una stima: tempo in auto × 1,5 + 10 minuti", () => {
    expect(stimaMezziPubblici(20)).toBe(40);
    expect(stimaMezziPubblici(7)).toBe(21);
  });

  it("la descrizione breve è la prima frase della fonte, senza parentesi, al massimo 300 caratteri", () => {
    expect(fraseBreve("Il Colosseo (in latino Amphitheatrum Flavium) è un anfiteatro di Roma. È il più grande del mondo.")).toBe(
      "Il Colosseo è un anfiteatro di Roma. È il più grande del mondo.",
    );
    expect(fraseBreve("Corto.")).toBeNull();
    expect(fraseBreve(`${"parola ".repeat(80)}fine.`)?.length).toBeLessThanOrEqual(300);
  });
});
