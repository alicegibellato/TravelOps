/**
 * Confronto tra versioni per `id` degli elementi (REQ-ITIN-002 R-4, CA-3).
 */
import { describe, expect, it } from "vitest";
import { applicaProposta, confrontaItinerari, confrontaVersioni, type ConfrontoVersioni } from "../../src/history/index.js";
import type { Viaggio } from "../../src/model/index.js";
import { elemento, MOMENTO_CA2, propostaCon, storicoDopoCA2, versione1 } from "./dati.js";

function confronto(a: number, b: number): ConfrontoVersioni {
  const esito = confrontaVersioni(storicoDopoCA2(), a, b);
  if (!esito.ok) throw new Error(esito.errore.messaggio);
  return esito.confronto;
}

describe("CA-3 confronto tra la versione 1 e la versione 2", () => {
  it("CA-3: modificati D2-E1 (arrivo e orario) e D2-E3 (partenza e orario), rimosso D2-E2, aggiunto N1 con A-MAG; nient'altro", () => {
    const c = confronto(1, 2);
    expect(c.versioneA).toBe(1);
    expect(c.versioneB).toBe(2);

    expect(c.aggiunti).toEqual([
      {
        data: "2026-06-13",
        elemento: {
          id: "N1",
          tipo: "attivita",
          inizio: "10:00",
          fine: "12:00",
          orarioFisso: false,
          attivitaId: "A-MAG",
          priorita: "desiderata",
        },
      },
    ]);
    expect(c.rimossi).toEqual([
      {
        data: "2026-06-13",
        elemento: {
          id: "D2-E2",
          tipo: "attivita",
          inizio: "09:00",
          fine: "13:00",
          orarioFisso: false,
          attivitaId: "A-PONALE",
          priorita: "desiderata",
        },
      },
    ]);
    expect(c.modificati.map((m) => m.id)).toEqual(["D2-E1", "D2-E3"]);

    const [d2e1, d2e3] = c.modificati;
    expect(d2e1!.campi).toEqual([
      { campo: "inizio", prima: "08:40", dopo: "09:50" },
      { campo: "fine", prima: "09:00", dopo: "10:00" },
      { campo: "a", prima: "PONALE", dopo: "MAG" },
    ]);
    expect(d2e1!.prima).toEqual({ data: "2026-06-13", elemento: elemento(versione1(), "D2-E1") });
    expect(d2e1!.dopo.elemento).toMatchObject({ da: "HOTEL", a: "MAG", inizio: "09:50", fine: "10:00" });

    expect(d2e3!.campi).toEqual([
      { campo: "inizio", prima: "13:00", dopo: "12:00" },
      { campo: "fine", prima: "13:20", dopo: "12:05" },
      { campo: "da", prima: "PONALE", dopo: "MAG" },
    ]);
    expect(d2e3!.prima).toEqual({ data: "2026-06-13", elemento: elemento(versione1(), "D2-E3") });
    expect(d2e3!.dopo.elemento).toMatchObject({ da: "MAG", a: "RIST-RIVA", inizio: "12:00", fine: "12:05" });
  });

  it("coincide con le modifiche registrate nella versione 2", () => {
    const { versioneA, versioneB, ...differenza } = confronto(1, 2);
    expect(differenza).toEqual(storicoDopoCA2().versioni[1]!.modifiche);
  });

  it("al contrario (2 → 1) N1 risulta rimosso e D2-E2 aggiunto", () => {
    const c = confronto(2, 1);
    expect(c.aggiunti.map((v) => v.elemento.id)).toEqual(["D2-E2"]);
    expect(c.rimossi.map((v) => v.elemento.id)).toEqual(["N1"]);
    expect(c.modificati.map((m) => m.id)).toEqual(["D2-E1", "D2-E3"]);
    expect(c.modificati[0]!.campi[0]).toEqual({ campo: "inizio", prima: "09:50", dopo: "08:40" });
  });

  it("una versione confrontata con sé stessa non ha differenze", () => {
    expect(confronto(2, 2)).toEqual({ versioneA: 2, versioneB: 2, aggiunti: [], rimossi: [], modificati: [] });
  });

  it("una versione che non esiste dà VERSIONE_INESISTENTE", () => {
    for (const [a, b] of [
      [1, 3],
      [0, 2],
    ] as const) {
      const esito = confrontaVersioni(storicoDopoCA2(), a, b);
      expect(esito.ok).toBe(false);
      if (!esito.ok) expect(esito.errore.codice).toBe("VERSIONE_INESISTENTE");
    }
  });
});

describe("R-4 regole del confronto", () => {
  function variante(modifica: (v: Viaggio) => void): Viaggio {
    const v = versione1();
    modifica(v);
    return v;
  }

  it("un elemento spostato in un altro giorno con lo stesso orario risulta modificato nel campo data", () => {
    const b = variante((v) => {
      const d1e2 = v.giorni[0]!.elementi.splice(1, 1)[0]!;
      v.giorni[1]!.elementi.push({ ...d1e2, inizio: "16:10", fine: "18:10" });
    });
    const d = confrontaItinerari(versione1(), b);
    expect(d.aggiunti).toEqual([]);
    expect(d.rimossi).toEqual([]);
    expect(d.modificati.map((m) => [m.id, m.campi])).toEqual([
      ["D1-E2", [{ campo: "data", prima: "2026-06-12", dopo: "2026-06-13" }]],
    ]);
  });

  it("priorità, orario fisso e prenotazione sono campi confrontati, con i valori predefiniti del modello", () => {
    const prenotazione = { fornitore: "Ristorante sul lago", codice: "T-12" };
    const b = variante((v) => {
      const pranzo = elemento(v, "D2-E4");
      pranzo.orarioFisso = true;
      pranzo.prenotazione = prenotazione;
      const castello = elemento(v, "D3-E2");
      if (castello.tipo === "attivita") castello.priorita = "irrinunciabile";
    });
    const d = confrontaItinerari(versione1(), b);
    expect(d.modificati.map((m) => [m.id, m.campi])).toEqual([
      [
        "D2-E4",
        [
          { campo: "orarioFisso", prima: false, dopo: true },
          { campo: "prenotazione", prima: null, dopo: prenotazione },
        ],
      ],
      ["D3-E2", [{ campo: "priorita", prima: "desiderata", dopo: "irrinunciabile" }]],
    ]);
  });

  it("un campo assente vale come il suo valore predefinito: nessuna differenza", () => {
    const b = variante((v) => {
      const e = elemento(v, "D2-E2");
      delete e.orarioFisso;
      if (e.tipo === "attivita") delete e.priorita;
    });
    expect(confrontaItinerari(versione1(), b)).toEqual({ aggiunti: [], rimossi: [], modificati: [] });
  });

  it("confronta versioni non consecutive di uno storico", () => {
    const storico = storicoDopoCA2();
    const itinerario = structuredClone(storico.versioni[1]!.viaggio) as Viaggio;
    itinerario.giorni[0]!.elementi = [];
    const esito = applicaProposta(storico, propostaCon(2, itinerario), "Alice", MOMENTO_CA2);
    if (esito.esito !== "versione_creata") throw new Error(esito.esito);
    const c = confrontaVersioni(esito.storico, 1, 3);
    expect(c.ok && c.confronto.rimossi.map((v) => v.elemento.id)).toEqual(["D1-E1", "D1-E2", "D1-E3", "D2-E2"]);
    expect(c.ok && c.confronto.aggiunti.map((v) => v.elemento.id)).toEqual(["N1"]);
  });
});
