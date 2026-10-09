import { describe, expect, it } from "vitest";
import { CONDIZIONI_AVVERSE, ORDINE_MEZZI, type Elemento, type SorgenteDatiContesto } from "../src/index.js";

describe("modello", () => {
  it("esporta l'ordine dei mezzi e le condizioni meteo avverse", () => {
    expect(ORDINE_MEZZI).toEqual(["piedi", "mezzi_pubblici", "treno", "auto", "volo"]);
    expect(CONDIZIONI_AVVERSE).toEqual(["pioggia", "temporale", "neve"]);
  });

  it("esporta i tipi di elemento e la sorgente dei dati di contesto", () => {
    const elemento: Elemento = { id: "X", tipo: "attivita", inizio: "10:00", fine: "11:00", attivitaId: "A-MAG" };
    const sorgente: SorgenteDatiContesto = {
      tempoPercorrenza: () => null,
      percorsoPiuVeloce: () => null,
      previsioni: () => [],
      chiusure: () => [],
    };
    expect(elemento.tipo).toBe("attivita");
    expect(sorgente.percorsoPiuVeloce("HOTEL", "MAG")).toBeNull();
  });
});
