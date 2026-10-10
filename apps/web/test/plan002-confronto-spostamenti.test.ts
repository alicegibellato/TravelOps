/**
 * "Confronta" tra due revisioni della bozza: gli spostamenti identici nel testo non si contano (TB-PLAN-012).
 */
import { describe, expect, it } from "vitest";
import type { DifferenzaItinerari, ElementoDatato } from "@travelops/engine";
import { contaSpostamentiCambiati } from "../src/bozza/servizio";

function sp(id: string, inizio: string, fine: string, a = "Hotel"): ElementoDatato {
  return { data: "2026-06-01", elemento: { id, tipo: "spostamento", inizio, fine, da: "Piazza", a, mezzo: "piedi" } as unknown as ElementoDatato["elemento"] };
}

describe("contaSpostamentiCambiati (TB-PLAN-012)", () => {
  it("non conta gli spostamenti ricalcolati con id nuovo ma uguali nel testo", () => {
    const ora = (i: number): [string, string] => [`0${i % 10}:00`, `0${i % 10}:10`];
    const identici = Array.from({ length: 13 }, (_, i) => i);
    const differenza: DifferenzaItinerari = {
      rimossi: [...identici.map((i) => sp(`a${i}`, ...ora(i), `L${i}`)), sp("x1", "10:00", "10:10"), sp("x2", "11:00", "11:10")],
      aggiunti: [...identici.map((i) => sp(`b${i}`, ...ora(i), `L${i}`)), sp("y1", "10:05", "10:15"), sp("y2", "11:05", "11:15")],
      modificati: [],
    };
    expect(contaSpostamentiCambiati(differenza)).toBe(2);
  });

  it("senza spostamenti cambiati restituisce zero", () => {
    const v = sp("a", "09:00", "09:10");
    expect(contaSpostamentiCambiati({ rimossi: [v], aggiunti: [sp("b", "09:00", "09:10")], modificati: [] })).toBe(0);
  });
});
