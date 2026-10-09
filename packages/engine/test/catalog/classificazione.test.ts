import { describe, expect, it } from "vitest";
import {
  classificaLuogoOsm,
  costoDaPrezzo,
  MODULO_CATALOG,
  ORARI_PREDEFINITI,
  regolaPerTag,
  TABELLA_CLASSIFICAZIONE,
  type ElementoOsm,
} from "../../src/catalog/index.js";
import { caricaCatalogoEsteso, VALORI_AMMESSI } from "../../src/itinerary/index.js";
import type { CatalogoEsteso, Costo, Intensita, StileViaggio, TipoLuogoEsteso } from "../../src/model/index.js";

const nodo = (tags: Record<string, string>, extra: Partial<ElementoOsm> = {}): ElementoOsm => ({
  type: "node",
  id: 42,
  lat: 45.88,
  lon: 10.84,
  tags,
  ...extra,
});

interface AttivitaAttesa {
  categoria: string;
  stili: StileViaggio[];
  allAperto: boolean;
  intensita: Intensita;
  durataTipica: number;
  costo: Costo;
}

interface Riga {
  riga: string;
  descrizione: string;
  elemento: ElementoOsm;
  tipoLuogo: TipoLuogoEsteso;
  attivita: AttivitaAttesa | null;
}

/** Un caso per ogni riga della tabella (CA-2), con i valori attesi scritti a mano dal requisito. */
const RIGHE: Riga[] = [
  {
    riga: "museo",
    descrizione: "tourism=museum → cultura, al coperto, facile, 120 min, €",
    elemento: nodo({ tourism: "museum", name: "Museo civico" }),
    tipoLuogo: "museo",
    attivita: { categoria: "cultura", stili: ["cultura"], allAperto: false, intensita: "facile", durataTipica: 120, costo: "€" },
  },
  {
    riga: "galleria",
    descrizione: "tourism=gallery → cultura, al coperto, facile, 90 min, €",
    elemento: nodo({ tourism: "gallery", name: "Galleria" }),
    tipoLuogo: "museo",
    attivita: { categoria: "cultura", stili: ["cultura"], allAperto: false, intensita: "facile", durataTipica: 90, costo: "€" },
  },
  {
    riga: "punto-panoramico",
    descrizione: "tourism=viewpoint → natura e romantico, all'aperto, facile, 30 min, gratis",
    elemento: nodo({ tourism: "viewpoint", name: "Belvedere" }),
    tipoLuogo: "punto_panoramico",
    attivita: {
      categoria: "natura",
      stili: ["natura", "romantico"],
      allAperto: true,
      intensita: "facile",
      durataTipica: 30,
      costo: "gratis",
    },
  },
  {
    riga: "parco",
    descrizione: "leisure=park → natura, relax e famiglia, all'aperto, facile, 60 min, gratis",
    elemento: nodo({ leisure: "park", name: "Parco" }),
    tipoLuogo: "parco",
    attivita: {
      categoria: "natura",
      stili: ["relax", "natura", "famiglia"],
      allAperto: true,
      intensita: "facile",
      durataTipica: 60,
      costo: "gratis",
    },
  },
  {
    riga: "spiaggia",
    descrizione: "natural=beach → relax e famiglia, all'aperto, facile, 120 min, gratis",
    elemento: nodo({ natural: "beach", name: "Spiaggia" }),
    tipoLuogo: "spiaggia",
    attivita: {
      categoria: "natura",
      stili: ["relax", "famiglia"],
      allAperto: true,
      intensita: "facile",
      durataTipica: 120,
      costo: "gratis",
    },
  },
  {
    riga: "percorso-escursionistico",
    descrizione: "route=hiking → natura e avventura, all'aperto, intensità e durata da lunghezza e dislivello",
    elemento: { type: "relation", id: 7, tags: { route: "hiking", name: "Sentiero", distance: "10", ascent: "500" } },
    tipoLuogo: "sentiero",
    attivita: {
      categoria: "natura",
      stili: ["natura", "avventura"],
      allAperto: true,
      intensita: "moderata",
      durataTipica: 150,
      costo: "gratis",
    },
  },
  {
    riga: "cantina",
    descrizione: "craft=winery → gastronomia e romantico, al coperto, facile, 90 min, €€",
    elemento: nodo({ craft: "winery", name: "Cantina" }),
    tipoLuogo: "cantina",
    attivita: {
      categoria: "gastronomia",
      stili: ["gastronomia", "romantico"],
      allAperto: false,
      intensita: "facile",
      durataTipica: 90,
      costo: "€€",
    },
  },
  {
    riga: "ristorante",
    descrizione: "amenity=restaurant → pasto, costo da price (price=€)",
    elemento: nodo({ amenity: "restaurant", name: "Trattoria", price: "€" }),
    tipoLuogo: "ristorante",
    attivita: { categoria: "pasto", stili: ["gastronomia"], allAperto: false, intensita: "facile", durataTipica: 75, costo: "€" },
  },
  {
    riga: "impianto",
    descrizione: "aerialway=cable_car → avventura e natura, impianto",
    elemento: nodo({ aerialway: "cable_car", name: "Funivia" }),
    tipoLuogo: "impianto",
    attivita: {
      categoria: "natura",
      stili: ["natura", "avventura"],
      allAperto: true,
      intensita: "facile",
      durataTipica: 60,
      costo: "€€",
    },
  },
  { riga: "alloggio", descrizione: "tourism=hotel → alloggio", elemento: nodo({ tourism: "hotel" }), tipoLuogo: "alloggio", attivita: null },
  { riga: "farmacia", descrizione: "amenity=pharmacy → farmacia", elemento: nodo({ amenity: "pharmacy" }), tipoLuogo: "farmacia", attivita: null },
  { riga: "ospedale", descrizione: "amenity=hospital → ospedale", elemento: nodo({ amenity: "hospital" }), tipoLuogo: "ospedale", attivita: null },
  { riga: "stazione", descrizione: "railway=station → stazione", elemento: nodo({ railway: "station" }), tipoLuogo: "stazione", attivita: null },
  { riga: "aeroporto", descrizione: "aeroway=aerodrome → aeroporto", elemento: nodo({ aeroway: "aerodrome" }), tipoLuogo: "aeroporto", attivita: null },
  { riga: "negozio", descrizione: "shop=clothes → negozio", elemento: nodo({ shop: "clothes" }), tipoLuogo: "negozio", attivita: null },
];

describe("modulo catalog", () => {
  it("è disponibile nel pacchetto del motore", () => {
    expect(MODULO_CATALOG).toBe("catalog");
  });
});

describe("CA-2 — ogni riga della tabella di classificazione ha un test", () => {
  it("CA-2 i casi di test coprono tutte e sole le righe della tabella, nello stesso ordine", () => {
    expect(RIGHE.map((r) => r.riga)).toEqual(TABELLA_CLASSIFICAZIONE.map((r) => r.id));
  });

  it.each(RIGHE)("CA-2 riga $riga: $descrizione", ({ riga, elemento, tipoLuogo, attivita }) => {
    const esito = classificaLuogoOsm(elemento, "GARDA_NORD");
    expect(esito).not.toBeNull();
    if (esito === null) return;
    expect(esito.regola).toBe(riga);
    expect(esito.luogo).toMatchObject({
      id: `OSM-${elemento.type.toUpperCase()}-${elemento.id}`,
      zonaId: "GARDA_NORD",
      tipo: tipoLuogo,
      origine: "osm",
      osmId: `${elemento.type}/${elemento.id}`,
      orariVerificati: false,
      apertura: ORARI_PREDEFINITI[tipoLuogo],
    });
    if (attivita === null) {
      expect(esito.attivita).toBeNull();
      return;
    }
    expect(esito.attivita).toMatchObject({ ...attivita, id: `A-${esito.luogo.id}`, luogoId: esito.luogo.id });
  });

  it.each(
    TABELLA_CLASSIFICAZIONE.flatMap((regola) =>
      regola.quando.flatMap(({ chiave, valori }) =>
        (valori === "qualsiasi" ? ["books"] : valori).map((valore) => ({ riga: regola.id, tag: `${chiave}=${valore}`, chiave, valore })),
      ),
    ),
  )("CA-2 riga $riga: anche il solo tag $tag la applica", ({ riga, chiave, valore }) => {
    expect(regolaPerTag({ [chiave]: valore })?.id).toBe(riga);
  });

  it("CA-2 shop=wine è una cantina, non un negozio qualsiasi (precedenza delle righe)", () => {
    const esito = classificaLuogoOsm(nodo({ shop: "wine", name: "Enoteca" }), "Z");
    expect(esito?.regola).toBe("cantina");
    expect(esito?.attivita).toMatchObject({ categoria: "gastronomia", stili: ["gastronomia", "romantico"], costo: "€€", durataTipica: 90 });
  });

  it("CA-2 un luogo senza righe applicabili, o un elemento non valido, non si classifica", () => {
    expect(classificaLuogoOsm(nodo({ amenity: "bench" }), "Z")).toBeNull();
    expect(classificaLuogoOsm(nodo({}), "Z")).toBeNull();
    expect(classificaLuogoOsm({ type: "node", id: 1 }, "Z")).toBeNull();
    expect(classificaLuogoOsm({ type: "area" as "node", id: 1, tags: { tourism: "museum" } }, "Z")).toBeNull();
    expect(classificaLuogoOsm({ type: "node", id: -3, tags: { tourism: "museum" } }, "Z")).toBeNull();
    expect(classificaLuogoOsm(null as unknown as ElementoOsm, "Z")).toBeNull();
  });

  it("CA-2 tutti i valori prodotti dalla tabella sono ammessi nel catalogo esteso", () => {
    for (const regola of TABELLA_CLASSIFICAZIONE) {
      expect(VALORI_AMMESSI.tipoLuogoEsteso).toContain(regola.tipoLuogo);
      if (regola.attivita === null) continue;
      expect(VALORI_AMMESSI.categoriaEstesa).toContain(regola.attivita.categoria);
      for (const stile of regola.attivita.stili) expect(VALORI_AMMESSI.stile).toContain(stile);
      // Stili nell'ordine canonico della §7.2, senza ripetizioni.
      const indici = regola.attivita.stili.map((s) => VALORI_AMMESSI.stile.indexOf(s));
      expect(indici).toEqual([...new Set(indici)].sort((a, b) => a - b));
    }
  });

  it("CA-2 un catalogo costruito solo con la classificazione si carica senza errori con caricaCatalogoEsteso", () => {
    const catalogo: CatalogoEsteso = { zone: [{ id: "GARDA_NORD", nome: "Alto Garda" }], luoghi: [], attivita: [] };
    RIGHE.forEach(({ elemento }, i) => {
      const esito = classificaLuogoOsm({ ...elemento, id: i + 1 }, "GARDA_NORD");
      if (esito === null) throw new Error("caso non classificato");
      catalogo.luoghi.push(esito.luogo);
      if (esito.attivita !== null) catalogo.attivita.push(esito.attivita);
    });
    expect(caricaCatalogoEsteso(structuredClone(catalogo))).toStrictEqual({ ok: true, valore: catalogo });
  });

  it("CA-2 la classificazione è deterministica e non modifica l'elemento ricevuto", () => {
    for (const { elemento } of RIGHE) {
      const copia = structuredClone(elemento);
      expect(classificaLuogoOsm(elemento, "Z")).toStrictEqual(classificaLuogoOsm(copia, "Z"));
      expect(elemento).toStrictEqual(copia);
    }
    // Gli orari predefiniti restituiti sono copie: modificarli non cambia la tabella.
    const museo = classificaLuogoOsm(nodo({ tourism: "museum" }), "Z");
    if (museo !== null && "settimana" in museo.luogo.apertura) museo.luogo.apertura.settimana.mar = [];
    expect(classificaLuogoOsm(nodo({ tourism: "museum" }), "Z")?.luogo.apertura).toStrictEqual(ORARI_PREDEFINITI.museo);
  });
});

describe("CA-2 percorsi escursionistici: intensità secondo lunghezza e dislivello, durata secondo lunghezza", () => {
  const sentiero = (tags: Record<string, string>, extra: Partial<ElementoOsm> = {}): ElementoOsm => ({
    type: "relation",
    id: 9,
    tags: { route: "hiking", name: "Sentiero", ...tags },
    ...extra,
  });

  it.each([
    { caso: "4 km, 200 m: facile, 60 min", tags: { distance: "4", ascent: "200" }, intensita: "facile", durata: 60, bambini: true },
    { caso: "10 km, 500 m: moderata, 150 min", tags: { distance: "10", ascent: "500" }, intensita: "moderata", durata: 150, bambini: true },
    { caso: "14,2 km, 300 m: impegnativa per la lunghezza, 240 min", tags: { distance: "14,2 km", ascent: "300 m" }, intensita: "impegnativa", durata: 240, bambini: false },
    { caso: "5 km, 1000 m: impegnativa per il dislivello, 90 min", tags: { distance: "5", ascent: "1000" }, intensita: "impegnativa", durata: 90, bambini: false },
    { caso: "800 m senza dislivello: facile, durata minima 60 min", tags: { distance: "800 m" }, intensita: "facile", durata: 60, bambini: true },
    { caso: "solo dislivello 900 m: impegnativa, durata senza lunghezza 120 min", tags: { ascent: "900" }, intensita: "impegnativa", durata: 120, bambini: false },
    { caso: "nessuna misura: moderata, 120 min", tags: {}, intensita: "moderata", durata: 120, bambini: true },
    { caso: "misure non leggibili: come nessuna misura", tags: { distance: "lungo", ascent: "?" }, intensita: "moderata", durata: 120, bambini: true },
    { caso: "route=foot è un percorso escursionistico", tags: { route: "foot", distance: "3" }, intensita: "facile", durata: 60, bambini: true },
  ] as const)("$caso", ({ tags, intensita, durata, bambini }) => {
    const esito = classificaLuogoOsm(sentiero(tags), "Z");
    expect(esito?.regola).toBe("percorso-escursionistico");
    expect(esito?.attivita).toMatchObject({ intensita, durataTipica: durata, adattaAiBambini: bambini, accessibile: false });
  });

  it("le misure calcolate da chi costruisce la destinazione prevalgono sui tag", () => {
    const esito = classificaLuogoOsm(sentiero({ distance: "2", ascent: "50" }, { lunghezzaKm: 13, dislivelloM: 100 }), "Z");
    expect(esito?.attivita).toMatchObject({ intensita: "impegnativa", durataTipica: 210 });
  });
});

describe("CA-2 ristoranti: costo dal tag price, opzioni alimentari, accessibilità", () => {
  it.each([
    [undefined, "€€"],
    ["€", "€"],
    ["€€", "€€"],
    ["€€€", "€€€"],
    ["€€€€", "€€€"],
    ["$$", "€€"],
    ["cheap", "€"],
    ["moderate", "€€"],
    ["expensive", "€€€"],
    ["15", "€"],
    ["25 EUR", "€€"],
    ["€ 30", "€€"],
    ["20-30 €", "€€"],
    ["60 euro", "€€€"],
    ["boh", "€€"],
  ] as const)("price=%s → %s", (prezzo, costo) => {
    expect(costoDaPrezzo(prezzo)).toBe(costo);
    const tags: Record<string, string> = { amenity: "restaurant", name: "R" };
    if (prezzo !== undefined) tags["price"] = prezzo;
    const esito = classificaLuogoOsm(nodo(tags), "Z");
    expect(esito?.attivita?.costo).toBe(costo);
    expect(esito?.luogo.costoIndicativo).toBe(costo);
  });

  it("opzioni alimentari da diet:vegetarian e diet:gluten_free; senza tag il campo non c'è", () => {
    const entrambe = classificaLuogoOsm(nodo({ amenity: "restaurant", "diet:vegetarian": "only", "diet:gluten_free": "yes" }), "Z");
    expect(entrambe?.luogo.opzioniAlimentari).toEqual(["vegetariano", "senza_glutine"]);
    const nessuna = classificaLuogoOsm(nodo({ amenity: "restaurant", "diet:vegetarian": "no" }), "Z");
    expect(nessuna?.luogo).not.toHaveProperty("opzioniAlimentari");
  });

  it("accessibilità dal tag wheelchair, altrimenti il valore della tabella", () => {
    expect(classificaLuogoOsm(nodo({ tourism: "museum", wheelchair: "no" }), "Z")?.attivita?.accessibile).toBe(false);
    expect(classificaLuogoOsm(nodo({ tourism: "museum", wheelchair: "limited" }), "Z")?.attivita?.accessibile).toBe(false);
    expect(classificaLuogoOsm(nodo({ tourism: "museum" }), "Z")?.attivita?.accessibile).toBe(true);
    expect(classificaLuogoOsm(nodo({ natural: "beach", wheelchair: "yes" }), "Z")?.attivita?.accessibile).toBe(true);
    expect(classificaLuogoOsm(nodo({ natural: "beach" }), "Z")?.attivita?.accessibile).toBe(false);
  });

  it("nome: name:it, poi name, poi il nome predefinito della riga; coordinate da lat/lon o da center", () => {
    expect(classificaLuogoOsm(nodo({ tourism: "museum", name: "Museum", "name:it": "Museo" }), "Z")?.luogo.nome).toBe("Museo");
    expect(classificaLuogoOsm(nodo({ tourism: "museum", name: "Museum" }), "Z")?.attivita?.nome).toBe("Visita a Museum");
    expect(classificaLuogoOsm(nodo({ tourism: "museum" }), "Z")?.luogo.nome).toBe("Museo");
    const via = classificaLuogoOsm({ type: "way", id: 5, center: { lat: 46.07, lon: 11.12 }, tags: { leisure: "park" } }, "Z");
    expect(via?.luogo.coordinate).toEqual({ lat: 46.07, lon: 11.12 });
    expect(classificaLuogoOsm(nodo({ leisure: "park" }, { lat: 95 }), "Z")?.luogo).not.toHaveProperty("coordinate");
  });
});
