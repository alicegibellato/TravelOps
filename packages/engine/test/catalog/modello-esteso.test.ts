/**
 * Tipi del motore estesi (§7.3, §7.8) e validazione dei campi nuovi nel caricamento del catalogo (REQ-CAT-001,
 * funzionalità "validazione dei campi nuovi in REQ-ITIN-001"), con la compatibilità con l'ondata 1 (CA-1).
 */
import { describe, expect, it } from "vitest";
import { controllaFattibilita } from "../../src/feasibility/index.js";
import {
  attivitaDellaZona,
  caricaCatalogo,
  caricaCatalogoEsteso,
  caricaViaggio,
  esportaCatalogo,
  trovaLuogo,
  trovaNelCatalogo,
  validaItinerario,
  VALORI_AMMESSI,
  type ErroreValidazione,
} from "../../src/itinerary/index.js";
import type { CatalogoEsteso, IstantaneaCatalogo } from "../../src/model/index.js";
import { contesto, sorgenteFinta } from "../feasibility/supporto.js";
import { catalogoEsteso, leggiDati, testoDati, type Grezzo } from "./supporto.js";

const coppie = (errori: ErroreValidazione[]): [string, string][] => errori.map((e) => [e.codice, e.id]);

const voce = (catalogo: Grezzo, elenco: "luoghi" | "attivita", id: string): Grezzo => {
  const trovata = catalogo[elenco].find((v: Grezzo) => v.id === id);
  if (trovata === undefined) throw new Error(`${id} assente`);
  return trovata;
};

describe("CA-1 — compatibilità con l'ondata 1", () => {
  it("CA-1 il catalogo dell'ondata 1 si carica identico con caricaCatalogo e con caricaCatalogoEsteso, senza campi aggiunti", () => {
    const grezzo = leggiDati("catalogo.json");
    expect(caricaCatalogo(grezzo)).toStrictEqual({ ok: true, valore: grezzo });
    expect(caricaCatalogoEsteso(grezzo)).toStrictEqual({ ok: true, valore: grezzo });
    expect(esportaCatalogo(catalogoEsteso())).toBe(testoDati("estensioni/catalogo-esteso.json").trimEnd());
  });

  it("CA-1 caricaCatalogo continua a rifiutare i tipi e le categorie aggiunti dalla §7.3; caricaCatalogoEsteso li accetta", () => {
    const grezzo = leggiDati("estensioni/catalogo-esteso.json");
    voce(grezzo, "luoghi", "LUNGOLAGO").tipo = "spiaggia";
    voce(grezzo, "attivita", "A-CANTINA").categoria = "servizio";
    const ondata1 = caricaCatalogo(structuredClone(grezzo));
    expect(ondata1.ok ? [] : coppie(ondata1.errori)).toEqual([
      ["VALORE_NON_VALIDO", "LUNGOLAGO"],
      ["VALORE_NON_VALIDO", "A-CANTINA"],
    ]);
    const esteso = caricaCatalogoEsteso(structuredClone(grezzo));
    expect(esteso).toStrictEqual({ ok: true, valore: grezzo });
  });

  it("CA-1 la versione 1 si valida e risulta fattibile anche con il catalogo esteso", () => {
    const catalogo = catalogoEsteso();
    const esito = caricaViaggio(leggiDati("versione-1.json"), catalogo);
    expect(esito.ok).toBe(true);
    if (!esito.ok) return;
    expect(validaItinerario(esito.valore, catalogo)).toEqual([]);
    expect(controllaFattibilita(esito.valore, catalogo, sorgenteFinta(contesto()))).toEqual([]);
  });

  it("CA-1 le interrogazioni funzionano con il catalogo esteso", () => {
    const catalogo = catalogoEsteso();
    expect(trovaLuogo(catalogo, "RIST-RIVA")?.costoIndicativo).toBe("€€");
    expect(trovaNelCatalogo(catalogo, "A-MUSE")).toMatchObject({ tipo: "attivita", attivita: { stili: ["cultura", "famiglia"] } });
    expect(attivitaDellaZona(catalogo, "TRENTO").map((a) => a.id)).toEqual(["A-BUONCONSIGLIO", "A-MUSE", "A-PRANZO-TRENTO"]);
  });
});

describe("Tipi estesi (§7.3, §7.8)", () => {
  it("valori ammessi della §7.3", () => {
    expect(VALORI_AMMESSI.stile).toEqual(["relax", "cultura", "natura", "avventura", "gastronomia", "romantico", "famiglia"]);
    expect(VALORI_AMMESSI.intensita).toEqual(["facile", "moderata", "impegnativa"]);
    expect(VALORI_AMMESSI.costo).toEqual(["gratis", "€", "€€", "€€€"]);
    expect(VALORI_AMMESSI.opzioneAlimentare).toEqual(["vegetariano", "senza_glutine"]);
    expect(VALORI_AMMESSI.origineLuogo).toEqual(["riferimento", "osm"]);
    expect(VALORI_AMMESSI.categoriaEstesa).toEqual(["natura", "cultura", "gastronomia", "pasto", "servizio"]);
    expect(VALORI_AMMESSI.tipoLuogoEsteso).toEqual([
      ...VALORI_AMMESSI.tipoLuogo,
      "spiaggia",
      "punto_panoramico",
      "parco",
      "impianto",
      "negozio",
      "farmacia",
      "ospedale",
    ]);
  });

  it("un'istantanea del catalogo è un catalogo esteso: il motore la usa come catalogo", () => {
    const catalogo = catalogoEsteso();
    const istantanea: IstantaneaCatalogo = {
      id: "IST-GARDA-1",
      destinazione: "Lago di Garda",
      dataCreazione: "2026-10-09",
      fonti: [{ nome: "OpenStreetMap", attribuzione: "© OpenStreetMap contributors" }],
      ...catalogo,
      tempiPercorrenza: contesto().tempiPercorrenza,
    };
    const comeCatalogo: CatalogoEsteso = istantanea;
    const versione1 = caricaViaggio(leggiDati("versione-1.json"), comeCatalogo);
    expect(versione1.ok).toBe(true);
    if (!versione1.ok) return;
    const sorgente = sorgenteFinta({ tempiPercorrenza: istantanea.tempiPercorrenza, previsioni: [], chiusure: [] });
    expect(controllaFattibilita(versione1.valore, istantanea, sorgente)).toEqual([]);
  });
});

describe("Validazione dei campi nuovi (R-8 VALORE_NON_VALIDO, R-1 CAMPO_MANCANTE)", () => {
  const difetti: { descrizione: string; codice: string; id: string; difetto: (c: Grezzo) => void }[] = [
    { descrizione: "stile non ammesso", codice: "VALORE_NON_VALIDO", id: "A-MAG", difetto: (c) => (voce(c, "attivita", "A-MAG").stili = ["shopping"]) },
    { descrizione: "stile ripetuto", codice: "VALORE_NON_VALIDO", id: "A-MAG", difetto: (c) => (voce(c, "attivita", "A-MAG").stili = ["cultura", "cultura"]) },
    { descrizione: "stili vuoti", codice: "VALORE_NON_VALIDO", id: "A-MAG", difetto: (c) => (voce(c, "attivita", "A-MAG").stili = []) },
    { descrizione: "stili non in un elenco", codice: "VALORE_NON_VALIDO", id: "A-MAG", difetto: (c) => (voce(c, "attivita", "A-MAG").stili = "cultura") },
    { descrizione: "intensità non ammessa", codice: "VALORE_NON_VALIDO", id: "A-PONALE", difetto: (c) => (voce(c, "attivita", "A-PONALE").intensita = "estrema") },
    { descrizione: "costo non ammesso", codice: "VALORE_NON_VALIDO", id: "A-CANTINA", difetto: (c) => (voce(c, "attivita", "A-CANTINA").costo = "€€€€") },
    { descrizione: "adatta ai bambini non booleano", codice: "VALORE_NON_VALIDO", id: "A-MUSE", difetto: (c) => (voce(c, "attivita", "A-MUSE").adattaAiBambini = "sì") },
    { descrizione: "accessibile non booleano", codice: "VALORE_NON_VALIDO", id: "A-MUSE", difetto: (c) => (voce(c, "attivita", "A-MUSE").accessibile = 1) },
    { descrizione: "mese 13", codice: "VALORE_NON_VALIDO", id: "A-LUNGOLAGO", difetto: (c) => (voce(c, "attivita", "A-LUNGOLAGO").mesiConsigliati = [6, 13]) },
    { descrizione: "mese ripetuto", codice: "VALORE_NON_VALIDO", id: "A-LUNGOLAGO", difetto: (c) => (voce(c, "attivita", "A-LUNGOLAGO").mesiConsigliati = [6, 6]) },
    { descrizione: "descrizione non testuale", codice: "VALORE_NON_VALIDO", id: "A-MAG", difetto: (c) => (voce(c, "attivita", "A-MAG").descrizioneBreve = 3) },
    { descrizione: "immagine senza attribuzione", codice: "CAMPO_MANCANTE", id: "A-MAG", difetto: (c) => (voce(c, "attivita", "A-MAG").immagine = { percorso: "img/mag.jpg" }) },
    { descrizione: "immagine non oggetto", codice: "VALORE_NON_VALIDO", id: "A-MAG", difetto: (c) => (voce(c, "attivita", "A-MAG").immagine = "img/mag.jpg") },
    { descrizione: "costo indicativo non ammesso", codice: "VALORE_NON_VALIDO", id: "RIST-RIVA", difetto: (c) => (voce(c, "luoghi", "RIST-RIVA").costoIndicativo = "caro") },
    { descrizione: "opzione alimentare non ammessa", codice: "VALORE_NON_VALIDO", id: "RIST-RIVA", difetto: (c) => (voce(c, "luoghi", "RIST-RIVA").opzioniAlimentari = ["vegano"]) },
    { descrizione: "origine non ammessa", codice: "VALORE_NON_VALIDO", id: "MAG", difetto: (c) => (voce(c, "luoghi", "MAG").origine = "google") },
    { descrizione: "origine osm senza identificativo", codice: "CAMPO_MANCANTE", id: "MAG", difetto: (c) => (voce(c, "luoghi", "MAG").origine = "osm") },
    {
      descrizione: "identificativo OSM non valido",
      codice: "VALORE_NON_VALIDO",
      id: "MAG",
      difetto: (c) => Object.assign(voce(c, "luoghi", "MAG"), { origine: "osm", osmId: "nodo/12" }),
    },
    { descrizione: "identificativo OSM con origine riferimento", codice: "VALORE_NON_VALIDO", id: "MAG", difetto: (c) => (voce(c, "luoghi", "MAG").osmId = "node/12") },
    { descrizione: "orari verificati non booleano", codice: "VALORE_NON_VALIDO", id: "MAG", difetto: (c) => (voce(c, "luoghi", "MAG").orariVerificati = "no") },
  ];

  it.each(difetti)("$codice su $id: $descrizione", ({ difetto, codice, id }) => {
    for (const carica of [caricaCatalogo, caricaCatalogoEsteso]) {
      const grezzo = leggiDati("estensioni/catalogo-esteso.json");
      difetto(grezzo);
      const esito = carica(grezzo);
      expect(esito.ok ? [] : coppie(esito.errori)).toEqual([[codice, id]]);
    }
  });

  it("più difetti nei campi nuovi restituiscono tutti gli errori in una volta, senza eccezioni", () => {
    const grezzo = leggiDati("estensioni/catalogo-esteso.json");
    voce(grezzo, "attivita", "A-MAG").stili = ["cultura", "shopping"];
    voce(grezzo, "attivita", "A-PONALE").intensita = "estrema";
    voce(grezzo, "luoghi", "MAG").origine = "osm";
    const esito = caricaCatalogoEsteso(grezzo);
    expect(esito.ok ? [] : coppie(esito.errori)).toEqual([
      ["CAMPO_MANCANTE", "MAG"],
      ["VALORE_NON_VALIDO", "A-PONALE"],
      ["VALORE_NON_VALIDO", "A-MAG"],
    ]);
  });

  it("tutti i campi nuovi validi si caricano, si esportano e si ricaricano identici", () => {
    const grezzo = leggiDati("estensioni/catalogo-esteso.json");
    Object.assign(voce(grezzo, "luoghi", "RIST-RIVA"), {
      opzioniAlimentari: ["vegetariano", "senza_glutine"],
      fonteDescrizione: "Wikivoyage",
      attribuzioneImmagine: "Foto di esempio, CC BY-SA 4.0",
    });
    Object.assign(voce(grezzo, "attivita", "A-LUNGOLAGO"), {
      mesiConsigliati: [5, 6, 9],
      immagine: { percorso: "immagini/lungolago.jpg", attribuzione: "Foto di esempio, CC BY-SA 4.0" },
    });
    grezzo.luoghi.push({
      id: "OSM-NODE-1",
      nome: "Spiaggia dei Sabbioni",
      zonaId: "GARDA_NORD",
      tipo: "spiaggia",
      apertura: { sempre: true },
      origine: "osm",
      osmId: "node/1",
      orariVerificati: false,
    });
    const esito = caricaCatalogoEsteso(grezzo);
    expect(esito).toStrictEqual({ ok: true, valore: grezzo });
    if (!esito.ok) return;
    expect(caricaCatalogoEsteso(esportaCatalogo(esito.valore))).toStrictEqual(esito);
  });
});
