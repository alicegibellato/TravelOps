/**
 * ST-PLAN-002-FIX-TB-PLAN-016: i testi della bozza parlano in modo coerente. L'errore di «Sposta» oltre la mezzanotte
 * dice cosa fare e non mostra orari come 24:50; la cronologia usa sempre le virgolette «…».
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { creaSorgenteDaDati } from "../../src/context/index.js";
import { proponiModifica } from "../../src/editing/index.js";
import { cronologiaBozza } from "../../src/index.js";
import type { Catalogo, DatiContesto, Viaggio } from "../../src/model/index.js";

const leggi = <T>(file: string): T => JSON.parse(readFileSync(new URL(`../../data/reference/${file}`, import.meta.url), "utf8")) as T;

describe("TB-PLAN-016 testi coerenti", () => {
  it("l'attività che passerebbe la mezzanotte: niente «elemento», niente 24:xx, dice cosa fare", () => {
    const esito = proponiModifica(leggi<Viaggio>("versione-1.json"), 1, leggi<Catalogo>("catalogo.json"), creaSorgenteDaDati(leggi<DatiContesto>("contesto.json")), {
      operazione: "aggiungi",
      data: "2026-06-12",
      attivitaId: "A-LUNGOLAGO",
      inizio: "23:50",
    });
    expect(esito.ok).toBe(false);
    if (esito.ok) return;
    expect(esito.errore.codice).toBe("FUORI_GIORNATA");
    expect(esito.errore.messaggio).not.toMatch(/elemento|24:\d\d|oltre le 24/);
    expect(esito.errore.messaggio).toMatch(/del giorno dopo/);
    expect(esito.errore.messaggio).toMatch(/scegli un orario più presto/);
  });

  it("la cronologia usa «…» e mai le virgolette dritte", () => {
    const voci = cronologiaBozza([
      { numero: 1, causa: "Bozza iniziale" },
      { numero: 2, causa: 'Sostituito "Degustazione" con "Panorama" il 2026-06-13' },
      { numero: 3, causa: 'Tolto "Museo" dal 2026-06-15' },
    ]);
    expect(voci[1]?.dettaglio).toBe("Sostituito «Degustazione» con «Panorama» il 2026-06-13");
    expect(voci[2]?.dettaglio).toBe("Tolto «Museo» dal 2026-06-15");
  });
});
