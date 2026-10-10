// @vitest-environment jsdom
/**
 * ST-PREF-001A-FIX-TB-PREF-006 (REQ-PREF-001): con «Mese e durata» il riepilogo dichiara da quando parte la bozza
 * (il primo del mese) e fino a quando,  (il generatore parte dal primo del mese).
 */
import { describe, expect, it } from "vitest";
import { opzioniPercorso } from "../src/preferenze/opzioni";
import { inizioDelMese, riepilogo } from "../src/preferenze/percorso";
import { MESI_PREFERENZE } from "./supporto-preferenze";

const mesi = [...MESI_PREFERENZE, { valore: "2026-11", etichetta: "novembre 2026" }];
const testoDate = (durata: number | undefined): string | undefined =>
  riepilogo({ date: { tipo: "mese", mese: "2026-11" }, ...(durata === undefined ? {} : { durata }) }, opzioniPercorso(), mesi).find((v) => v.campo === "date")?.valore;

describe("TB-PREF-006 criterio di partenza con il solo mese", () => {
  it("il riepilogo dice dal 1 al 4 novembre 2026, dal primo del mese", () => {
    expect(testoDate(4)).toBe("1–4 novembre 2026 (dal primo del mese)");
  });

  it("senza durata dichiara comunque il primo del mese", () => {
    expect(testoDate(undefined)).toBe("novembre 2026, dal primo del mese");
  });

  it("il criterio di partenza è il primo del mese", () => {
    expect(inizioDelMese("2026-11")).toBe("2026-11-01");
  });
});
