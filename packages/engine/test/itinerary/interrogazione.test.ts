import { describe, expect, it } from "vitest";
import {
  attivitaDellaZona,
  caricaCatalogo,
  trovaAttivita,
  trovaLuogo,
  trovaNelCatalogo,
  trovaZona,
} from "../../src/itinerary/index.js";
import type { Catalogo } from "../../src/model/index.js";
import { catalogoDiRiferimento, leggiRiferimento } from "./dati.js";

const ids = (voci: { id: string }[]): string[] => voci.map((v) => v.id);

describe("CA-5 — interrogazione del catalogo", () => {
  const catalogo = catalogoDiRiferimento();

  it("CA-5 restituisce una zona dal suo id", () => {
    expect(trovaZona(catalogo, "GARDA_NORD")).toStrictEqual({
      id: "GARDA_NORD",
      nome: "Alto Garda",
      coordinate: { lat: 45.885, lon: 10.845 },
    });
    expect(trovaZona(catalogo, "ZONA-INESISTENTE")).toBeNull();
  });

  it("CA-5 restituisce un luogo dal suo id", () => {
    const muse = trovaLuogo(catalogo, "MUSE");
    expect(muse).toMatchObject({ id: "MUSE", nome: "MUSE Museo delle Scienze", zonaId: "TRENTO", tipo: "museo" });
    expect(muse?.apertura).toMatchObject({ settimana: { lun: [], dom: [{ apertura: "10:00", chiusura: "18:00" }] } });
    expect(trovaLuogo(catalogo, "HOTEL")?.apertura).toStrictEqual({ sempre: true });
    expect(trovaLuogo(catalogo, "LUOGO-INESISTENTE")).toBeNull();
  });

  it("CA-5 restituisce un'attività dal suo id", () => {
    expect(trovaAttivita(catalogo, "A-MAG")).toStrictEqual({
      id: "A-MAG",
      nome: "Visita al MAG",
      luogoId: "MAG",
      categoria: "cultura",
      allAperto: false,
      durataTipica: 120,
    });
    expect(trovaAttivita(catalogo, "A-INESISTENTE")).toBeNull();
  });

  it("CA-5 trova zona, luogo o attività con un solo id e dice di che voce si tratta", () => {
    expect(trovaNelCatalogo(catalogo, "TRENTO")).toMatchObject({ tipo: "zona", zona: { id: "TRENTO", nome: "Trento" } });
    expect(trovaNelCatalogo(catalogo, "PONALE")).toMatchObject({ tipo: "luogo", luogo: { id: "PONALE", tipo: "sentiero" } });
    expect(trovaNelCatalogo(catalogo, "A-PONALE")).toMatchObject({
      tipo: "attivita",
      attivita: { id: "A-PONALE", allAperto: true, durataTipica: 240 },
    });
    expect(trovaNelCatalogo(catalogo, "NIENTE")).toBeNull();
    // Ogni ricerca guarda solo il suo tipo di voce.
    expect(trovaZona(catalogo, "MUSE")).toBeNull();
    expect(trovaLuogo(catalogo, "A-MUSE")).toBeNull();
    expect(trovaAttivita(catalogo, "TRENTO")).toBeNull();
  });

  it("CA-5 elenca le attività di una zona in ordine alfabetico di id", () => {
    expect(ids(attivitaDellaZona(catalogo, "GARDA_NORD"))).toEqual([
      "A-CANTINA",
      "A-LUNGOLAGO",
      "A-MAG",
      "A-PONALE",
      "A-PRANZO-RIVA",
    ]);
    expect(ids(attivitaDellaZona(catalogo, "TRENTO"))).toEqual(["A-BUONCONSIGLIO", "A-MUSE", "A-PRANZO-TRENTO"]);
  });

  it("CA-5 una zona senza attività o sconosciuta restituisce un elenco vuoto", () => {
    expect(attivitaDellaZona(catalogo, "VERONA")).toEqual([]);
    expect(attivitaDellaZona(catalogo, "ROMA")).toEqual([]);
    expect(attivitaDellaZona(catalogo, "ZONA-INESISTENTE")).toEqual([]);
  });

  it("CA-5 l'ordine non dipende dall'ordine del catalogo e il catalogo non viene modificato", () => {
    const grezzo = leggiRiferimento("catalogo.json");
    grezzo.attivita.reverse();
    const esito = caricaCatalogo(grezzo);
    expect(esito.ok).toBe(true);
    if (!esito.ok) return;
    const rovesciato: Catalogo = esito.valore;
    const ordinePrima = ids(rovesciato.attivita);
    expect(ids(attivitaDellaZona(rovesciato, "GARDA_NORD"))).toEqual(ids(attivitaDellaZona(catalogo, "GARDA_NORD")));
    expect(ids(rovesciato.attivita)).toEqual(ordinePrima);
  });
});
