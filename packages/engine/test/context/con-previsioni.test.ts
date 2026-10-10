/** `conPrevisioni` (REQ-INTEG-001, CA-4): previsioni di un servizio esterno aggiunte a una sorgente, senza toccare tempi e chiusure. */
import { describe, expect, it } from "vitest";
import { ErroreDatiContesto, conPrevisioni, creaSorgenteDaDati } from "../../src/context/index.js";
import type { PrevisioneMeteo } from "../../src/model/index.js";

const esistente: PrevisioneMeteo = { zonaId: "Z", data: "2026-06-13", inizio: "09:00", fine: "10:00", condizione: "nuvoloso" };
const base = creaSorgenteDaDati({
  tempiPercorrenza: [{ da: "A", a: "B", mezzo: "piedi", minuti: 10 }],
  previsioni: [esistente],
  chiusure: [{ luogoId: "A", data: "2026-06-13", inizio: "12:00", fine: "13:00" }],
});

describe("conPrevisioni", () => {
  it("aggiunge le nuove previsioni a quelle esistenti, in ordine stabile", () => {
    const nuova: PrevisioneMeteo = { zonaId: "Z", data: "2026-06-13", inizio: "08:00", fine: "09:00", condizione: "pioggia" };
    const s = conPrevisioni(base, [nuova]);
    expect(s.previsioni("Z", "2026-06-13")).toEqual([nuova, esistente]);
    expect(s.previsioni("Z", "2026-06-14")).toEqual([]);
    expect(s.previsioni("ALTRA", "2026-06-13")).toEqual([]);
  });
  it("lascia invariati tempi, percorsi e chiusure; la sorgente di base non cambia", () => {
    const s = conPrevisioni(base, [{ zonaId: "Z", data: "2026-06-13", inizio: "00:00", fine: "24:00", condizione: "pioggia" }]);
    expect(s.tempoPercorrenza("B", "A", "piedi")).toBe(10);
    expect(s.percorsoPiuVeloce("A", "B")).toEqual({ mezzo: "piedi", minuti: 10 });
    expect(s.chiusure("A", "2026-06-13")).toHaveLength(1);
    expect(base.previsioni("Z", "2026-06-13")).toEqual([esistente]);
  });
  it("rifiuta previsioni non valide", () => {
    expect(() => conPrevisioni(base, [{ zonaId: "Z", data: "2026-06-13", inizio: "9", fine: "10:00", condizione: "pioggia" }])).toThrow(ErroreDatiContesto);
  });
});
