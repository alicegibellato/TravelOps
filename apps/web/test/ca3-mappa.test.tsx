import { describe, expect, it } from "vitest";
import { ContenutoGiorno } from "../src/componenti/Contenuti";
import { datiMappa } from "../src/viste/mappa";
import { datiValidi, datiVariante, html, jsonCatalogo, jsonViaggio, valoriAttributo, type Grezzo } from "./supporto";

/** Coordinate dei luoghi del 2026-06-14 (dati-di-riferimento.md §2.2). */
const COORDINATE = {
  HOTEL: { lat: 45.8846, lon: 10.8445 },
  BUONCONSIGLIO: { lat: 46.0716, lon: 11.1271 },
  "RIST-TRENTO": { lat: 46.0674, lon: 11.1213 },
  MUSE: { lat: 46.0627, lon: 11.1132 },
};

describe("CA-3 mappa del 2026-06-14", () => {
  it("CA-3 riceve 3 indicatori numerati, nell'ordine castello, pranzo, MUSE, con le coordinate dei dati di riferimento", () => {
    const { viaggio, catalogo } = datiValidi("versione-1");
    const dati = datiMappa(viaggio, catalogo, "2026-06-14");
    expect(dati?.indicatori.map(({ numero, elementoId, luogoId, lat, lon }) => ({ numero, elementoId, luogoId, lat, lon }))).toEqual([
      { numero: 1, elementoId: "D3-E2", luogoId: "BUONCONSIGLIO", ...COORDINATE.BUONCONSIGLIO },
      { numero: 2, elementoId: "D3-E4", luogoId: "RIST-TRENTO", ...COORDINATE["RIST-TRENTO"] },
      { numero: 3, elementoId: "D3-E6", luogoId: "MUSE", ...COORDINATE.MUSE },
    ]);
    expect(dati?.indicatori.map((indicatore) => indicatore.attivita)).toEqual([
      "Visita al Castello del Buonconsiglio",
      "Pranzo in centro",
      "Visita al MUSE",
    ]);
  });

  it("CA-3 riceve una linea per ogni spostamento, tra le coordinate dei due luoghi", () => {
    const { viaggio, catalogo } = datiValidi("versione-1");
    const dati = datiMappa(viaggio, catalogo, "2026-06-14");
    expect(dati?.linee.map(({ elementoId, mezzo, da, a }) => ({ elementoId, mezzo, da: [da.luogoId, da.lat, da.lon], a: [a.luogoId, a.lat, a.lon] }))).toEqual([
      { elementoId: "D3-E1", mezzo: "Auto", da: ["HOTEL", 45.8846, 10.8445], a: ["BUONCONSIGLIO", 46.0716, 11.1271] },
      { elementoId: "D3-E3", mezzo: "A piedi", da: ["BUONCONSIGLIO", 46.0716, 11.1271], a: ["RIST-TRENTO", 46.0674, 11.1213] },
      { elementoId: "D3-E5", mezzo: "A piedi", da: ["RIST-TRENTO", 46.0674, 11.1213], a: ["MUSE", 46.0627, 11.1132] },
      { elementoId: "D3-E7", mezzo: "Auto", da: ["MUSE", 46.0627, 11.1132], a: ["HOTEL", 45.8846, 10.8445] },
    ]);
    expect(dati?.luoghiSenzaCoordinate).toEqual([]);
  });

  it("CA-3 la pagina del giorno passa alla mappa 3 indicatori e 4 linee e li elenca nella legenda nello stesso ordine", () => {
    const markup = html(<ContenutoGiorno chiave="versione-1" esito={datiValidi("versione-1")} data="2026-06-14" />);
    expect(markup).toContain('data-indicatori="3"');
    expect(markup).toContain('data-linee="4"');
    const legenda = markup.slice(markup.indexOf('class="legenda"'));
    expect(valoriAttributo(legenda, "data-elemento")).toEqual(["D3-E2", "D3-E4", "D3-E6"]);
    expect(markup).not.toContain("Luoghi senza coordinate");
  });

  it("i luoghi senza coordinate sono elencati sotto la mappa e non ricevono indicatori né linee (variante: MUSE senza coordinate)", () => {
    const catalogo: Grezzo = jsonCatalogo();
    delete catalogo.luoghi.find((luogo: Grezzo) => luogo.id === "MUSE").coordinate;
    const esito = datiVariante(jsonViaggio("versione-1"), catalogo);
    if (!esito.ok) throw new Error("la variante deve essere valida");

    const dati = datiMappa(esito.viaggio, esito.catalogo, "2026-06-14");
    expect(dati?.indicatori.map(({ numero, elementoId }) => [numero, elementoId])).toEqual([
      [1, "D3-E2"],
      [2, "D3-E4"],
    ]);
    expect(dati?.linee.map((linea) => linea.elementoId)).toEqual(["D3-E1", "D3-E3"]);
    expect(dati?.luoghiSenzaCoordinate).toEqual([
      {
        luogoId: "MUSE",
        nome: "MUSE Museo delle Scienze",
        elementi: ["D3-E5", "3. D3-E6", "D3-E7"],
        // REQ-UX-001 CA-6: sotto la mappa gli elementi si leggono in parole, senza id.
        usatoDa: [
          "Trattoria in centro a Trento → MUSE Museo delle Scienze (A piedi)",
          "3. Visita al MUSE",
          "MUSE Museo delle Scienze → Hotel sul lago, Riva del Garda (Auto)",
        ],
      },
    ]);

    const markup = html(<ContenutoGiorno chiave="versione-1" esito={esito} data="2026-06-14" />);
    const posizioneMappa = markup.indexOf('class="mappa"');
    const posizioneElenco = markup.indexOf("Luoghi senza coordinate");
    expect(posizioneMappa).toBeGreaterThan(-1);
    expect(posizioneElenco).toBeGreaterThan(posizioneMappa);
    expect(markup).toContain('data-luogo="MUSE"');
  });

  it("con V-VOLO la mappa del 2026-06-14 ha anche le linee verso l'aeroporto e il volo", () => {
    const { viaggio, catalogo } = datiValidi("v-volo");
    const dati = datiMappa(viaggio, catalogo, "2026-06-14");
    expect(dati?.indicatori).toHaveLength(3);
    expect(dati?.linee.map((linea) => [linea.elementoId, linea.mezzo])).toEqual([
      ["D3-E1", "Auto"],
      ["D3-E3", "A piedi"],
      ["D3-E5", "A piedi"],
      ["D3-E7", "Auto"],
      ["D3-E8", "Auto"],
      ["D3-E9", "Volo"],
    ]);
  });
});
