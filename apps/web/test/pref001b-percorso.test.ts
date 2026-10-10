/**
 * ST-PREF-001B: la logica pura del percorso guidato (modifiche alla bozza e riepilogo) e il salvataggio nelle
 * impostazioni con la chiave `profilo-preferenze`, che altre parti dell'app leggono con `leggiProfilo`.
 */
import { describe, expect, it } from "vitest";
import { conMese, conModoDate, conNumeroBambini, DURATA_INIZIALE, riepilogo, senzaPasso } from "../src/preferenze/percorso";
import { opzioniPercorso } from "../src/preferenze/opzioni";
import { CHIAVE_PROFILO, leggiProfilo, salvaProfilo } from "../src/preferenze/profilo";
import { leggiImpostazione } from "../src/basedati";
import { MESI_PREFERENZE } from "./supporto-preferenze";
import { nuovaCartella, sullaBaseDati } from "./supporto-stato";

describe("bozza del percorso", () => {
  it("con il mese serve la durata, con le date precise la ricava il motore", () => {
    expect(conModoDate({}, "mese")).toEqual({ durata: DURATA_INIZIALE });
    expect(conMese(conModoDate({}, "mese"), "2026-05")).toEqual({ durata: DURATA_INIZIALE, date: { tipo: "mese", mese: "2026-05" } });
    expect(conModoDate({ date: { tipo: "mese", mese: "2026-05" }, durata: 5 }, "precise")).toEqual({});
  });

  it("i bambini mantengono le età già scelte", () => {
    const due = conNumeroBambini({ viaggiatori: { bambini: [6, 9] } }, 3, 2);
    expect(due.viaggiatori?.bambini?.slice(0, 2)).toEqual([6, 9]);
    expect(conNumeroBambini(due, 1, 2).viaggiatori?.bambini).toEqual([6]);
  });

  it("«Salta» toglie solo i campi del passo", () => {
    expect(senzaPasso({ destinazione: { tipo: "sorprendimi" }, ritmo: "lento", budget: "€" }, 4)).toEqual({ destinazione: { tipo: "sorprendimi" } });
  });
});

describe("riepilogo", () => {
  const opzioni = opzioniPercorso();
  it("senza scelte i dati obbligatori sono da scegliere e il resto è predefinito", () => {
    const voci = riepilogo({}, opzioni, MESI_PREFERENZE);
    expect(voci.filter((v) => v.mancante).map((v) => v.campo)).toEqual(["destinazione", "date", "durata"]);
    expect(voci.find((v) => v.campo === "ritmo")?.valore).toBe("Bilanciato (predefinito)");
    expect(voci.map((v) => v.passo)).toEqual([1, 2, 2, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5]);
  });

  it("scrive le scelte in parole", () => {
    const voci = riepilogo(
      { destinazione: { tipo: "luogo", nome: "Roma" }, date: { tipo: "precise", inizio: "2026-06-12", fine: "2026-06-14" }, viaggiatori: { adulti: 2, bambini: [6, 9] }, stili: ["natura", "relax"] },
      opzioni,
      MESI_PREFERENZE,
    );
    const valore = (c: string) => voci.find((v) => v.campo === c)?.valore;
    expect(valore("destinazione")).toBe("Roma");
    expect(valore("date")).toBe("12–14 giugno 2026");
    expect(valore("viaggiatori")).toBe("2 adulti, 2 bambini (età: 6, 9)");
    expect(valore("stili")).toBe("Natura, Relax");
  });
});

describe("profilo salvato", () => {
  it("si salva con la chiave profilo-preferenze e si rilegge", () => {
    const cartella = nuovaCartella();
    expect(sullaBaseDati(cartella, leggiProfilo)).toBeNull();
    const bozza = { destinazione: { tipo: "sorprendimi" as const }, date: { tipo: "mese" as const, mese: "2026-05" }, durata: 3 };
    sullaBaseDati(cartella, (db) => salvaProfilo(db, bozza));
    expect(CHIAVE_PROFILO).toBe("profilo-preferenze");
    expect(sullaBaseDati(cartella, (db) => leggiImpostazione(db, "profilo-preferenze"))).toEqual(bozza);
    expect(sullaBaseDati(cartella, leggiProfilo)).toEqual(bozza);
  });
});
