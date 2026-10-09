/**
 * Criterio 2 (formato): il lettore validato delle istantanee (§7.8). Un'istantanea valida si legge con tutti i suoi
 * campi; ogni difetto dà un problema con un messaggio chiaro, tutti in una volta e senza eccezioni.
 */
import { caricaCatalogoEsteso, validaDatiContesto } from "@travelops/engine";
import { describe, expect, it } from "vitest";
import {
  comeIstantaneaCatalogo,
  ErroreIstantanea,
  leggiIstantanea,
  leggiIstantaneaOppureErrore,
  riepilogoIstantanea,
  VERSIONE_FORMATO,
  type IstantaneaDestinazione,
} from "../src/index.js";
import { conModifica, ID_ISTANTANEA_DI_PROVA, istantaneaDiProva, trova } from "./supporto.js";

function letta(json: unknown): IstantaneaDestinazione {
  const esito = leggiIstantanea(json);
  if (!esito.ok) throw new Error(esito.errori.map((e) => e.messaggio).join("\n"));
  return esito.istantanea;
}

function messaggi(json: unknown): string[] {
  const esito = leggiIstantanea(json);
  if (esito.ok) throw new Error("l'istantanea doveva essere non valida");
  return esito.errori.map((e) => e.messaggio);
}

describe("formato dell'istantanea (§7.8): lettura di un'istantanea valida", () => {
  it("legge l'istantanea di prova dal testo e dal valore decodificato, con lo stesso risultato", () => {
    const json = istantaneaDiProva();
    const daValore = letta(json);
    const daTesto = letta(JSON.stringify(json));
    expect(daTesto).toEqual(daValore);
    expect(daValore.id).toBe(ID_ISTANTANEA_DI_PROVA);
    expect(daValore.formato).toBe(VERSIONE_FORMATO);
    expect(daValore.destinazione).toContain("DATO DI TEST");
    expect(daValore.dataCreazione).toBe("2026-10-09");
    expect(daValore.area).toEqual({
      id: "prova:borgo-di-prova",
      nome: "Borgo di Prova",
      descrizione: "Borgo di Prova, area inventata per i test automatici di @travelops/sources",
      centro: { lat: 45.5, lon: 9.5 },
    });
    expect(daValore.fonti.map((f) => f.nome)).toEqual(["OpenStreetMap", "Wikimedia Commons"]);
    expect([daValore.zone.length, daValore.luoghi.length, daValore.attivita.length, daValore.tempiPercorrenza.length]).toEqual([1, 15, 18, 124]);
  });

  it("la lettura conserva i dati: rileggere l'istantanea letta dà la stessa istantanea", () => {
    const prima = letta(istantaneaDiProva());
    expect(letta(JSON.parse(JSON.stringify(prima)))).toEqual(prima);
  });

  it("conserva autore e licenza delle immagini e la marcatura dei tempi stimati", () => {
    const istantanea = letta(istantaneaDiProva());
    const museo = istantanea.attivita.find((a) => a.id === "PROVA-A-MUSEO");
    expect(museo?.immagine).toEqual({
      percorso: "immagini/prova/museo.jpg",
      attribuzione: "Autrice di prova, CC BY-SA 4.0, via Wikimedia Commons",
      autore: "Autrice di prova",
      licenza: "CC BY-SA 4.0",
      urlLicenza: "https://creativecommons.org/licenses/by-sa/4.0/",
    });
    const pubblici = istantanea.tempiPercorrenza.filter((t) => t.mezzo === "mezzi_pubblici");
    expect(pubblici.length).toBeGreaterThan(0);
    expect(pubblici.every((t) => t.stima === true)).toBe(true);
    expect(istantanea.tempiPercorrenza.filter((t) => t.mezzo !== "mezzi_pubblici").every((t) => t.stima === undefined)).toBe(true);
  });

  it("è un catalogo esteso per il motore e i suoi tempi sono dati di contesto validi (§7.8)", () => {
    const istantanea = comeIstantaneaCatalogo(letta(istantaneaDiProva()));
    const catalogo = caricaCatalogoEsteso({ zone: istantanea.zone, luoghi: istantanea.luoghi, attivita: istantanea.attivita });
    expect(catalogo.ok).toBe(true);
    const contesto = validaDatiContesto({ tempiPercorrenza: istantanea.tempiPercorrenza, previsioni: [], chiusure: [] });
    expect(contesto.tempiPercorrenza).toHaveLength(124);
  });

  it("il riepilogo ha solo identificativo, destinazione, area e data", () => {
    const istantanea = letta(istantaneaDiProva());
    expect(riepilogoIstantanea(istantanea)).toEqual({
      id: ID_ISTANTANEA_DI_PROVA,
      destinazione: istantanea.destinazione,
      area: istantanea.area,
      dataCreazione: "2026-10-09",
    });
  });

  it("leggiIstantaneaOppureErrore restituisce l'istantanea o solleva ErroreIstantanea con tutti i problemi", () => {
    expect(leggiIstantaneaOppureErrore(istantaneaDiProva()).id).toBe(ID_ISTANTANEA_DI_PROVA);
    const sbagliata = conModifica((j) => {
      delete j["id"];
      delete j["destinazione"];
    });
    expect(() => leggiIstantaneaOppureErrore(sbagliata)).toThrow(ErroreIstantanea);
    try {
      leggiIstantaneaOppureErrore(sbagliata);
    } catch (errore) {
      expect((errore as ErroreIstantanea).problemi).toHaveLength(2);
      expect((errore as Error).message).toMatch(/^istantanea non valida: /);
    }
  });
});

describe("formato dell'istantanea (§7.8): problemi segnalati con messaggi chiari", () => {
  it("testo che non è JSON, o JSON che non è un oggetto", () => {
    expect(leggiIstantanea("{ non è json")).toMatchObject({ ok: false, errori: [{ codice: "JSON_NON_VALIDO" }] });
    expect(messaggi("[1, 2]")).toEqual(["l'istantanea deve essere un oggetto JSON (valore trovato: [1,2])"]);
  });

  it("campi propri mancanti: tutti in una volta, con il nome del campo", () => {
    const json = conModifica((j) => {
      for (const campo of ["formato", "id", "destinazione", "area", "dataCreazione", "fonti", "tempiPercorrenza"]) delete j[campo];
    });
    expect(messaggi(json)).toEqual([
      'formato: manca il campo obbligatorio "formato" (versione del formato: 1)',
      'id: manca il campo obbligatorio "id"',
      'destinazione: manca il campo obbligatorio "destinazione"',
      `area: manca il campo obbligatorio "area" (l'area della destinazione trovata dalla ricerca)`,
      'dataCreazione: manca il campo obbligatorio "dataCreazione"',
      'fonti: manca il campo obbligatorio "fonti"',
      'tempiPercorrenza: manca il campo obbligatorio "tempiPercorrenza"',
    ]);
  });

  it("valori non validi nei campi propri", () => {
    const json = conModifica((j) => {
      j["formato"] = 2;
      j["id"] = "Roma 2026";
      j["dataCreazione"] = "2026-02-30";
      j["area"] = { id: "x", nome: "X", descrizione: "X", centro: { lat: 95, lon: 0 }, osmId: "relazione/1" };
      j["fonti"] = [];
      j["stiliScarsi"] = [{ stile: "shopping", motivo: "x" }, { stile: "relax" }];
    });
    expect(messaggi(json)).toEqual([
      "formato: versione del formato non riconosciuta (2): questo lettore conosce la 1",
      'id: l\'identificativo "Roma 2026" ammette solo lettere minuscole, cifre e trattini',
      'area.centro: deve essere { "lat": -90…90, "lon": -180…180 } (valore trovato: {"lat":95,"lon":0})',
      'area.osmId: l\'identificativo OpenStreetMap "relazione/1" non è nel formato node/<numero>, way/<numero> o relation/<numero>',
      "dataCreazione: deve essere una data AAAA-MM-GG (valore trovato: \"2026-02-30\")",
      "fonti: serve almeno una fonte con la sua attribuzione",
      'stiliScarsi[0].stile: stile non ammesso "shopping" (valori ammessi: relax, cultura, natura, avventura, gastronomia, romantico, famiglia)',
      'stiliScarsi[1].motivo: manca il campo obbligatorio "motivo"',
      'fonti: tra le fonti manca l\'attribuzione "© OpenStreetMap contributors" dei dati OpenStreetMap',
    ]);
  });

  it("gli errori del catalogo sono quelli del motore (caricaCatalogoEsteso), con il loro percorso", () => {
    const json = conModifica((j) => {
      trova(j.luoghi, "PROVA-PARCO")["zonaId"] = "ZONA_CHE_NON_ESISTE";
      trova(j.attivita, "PROVA-A-KAYAK")["intensita"] = "estrema";
    });
    const esito = leggiIstantanea(json);
    expect(esito.ok).toBe(false);
    if (esito.ok) return;
    expect(esito.errori.map((e) => [e.codice, e.percorso, e.messaggio])).toEqual([
      ["CATALOGO_NON_VALIDO", "luoghi[1].zonaId", '[RIFERIMENTO_INESISTENTE] PROVA-PARCO: la zona "ZONA_CHE_NON_ESISTE" non esiste nel catalogo'],
      [
        "CATALOGO_NON_VALIDO",
        "attivita[7].intensita",
        expect.stringMatching(/^\[VALORE_NON_VALIDO\] PROVA-A-KAYAK: .*estrema/),
      ],
    ]);
  });

  it("tempi di percorrenza: luoghi inesistenti, stesso luogo, mezzo, minuti, coppie ripetute", () => {
    const json = conModifica((j) => {
      j.tempiPercorrenza.push(
        { da: "PROVA-MUSEO", a: "NON-ESISTE", mezzo: "piedi", minuti: 5 },
        { da: "PROVA-MUSEO", a: "PROVA-MUSEO", mezzo: "piedi", minuti: 0 },
        { da: "PROVA-MUSEO", a: "PROVA-OSPEDALE", mezzo: "teletrasporto", minuti: 5 },
        { da: "PROVA-MUSEO", a: "PROVA-OSPEDALE", mezzo: "auto", minuti: 2.5 },
        { da: "PROVA-PARCO", a: "PROVA-MUSEO", mezzo: "piedi", minuti: 7 },
      );
    });
    expect(messaggi(json)).toEqual([
      'tempiPercorrenza[124].a: il luogo "NON-ESISTE" non esiste nel catalogo',
      'tempiPercorrenza[125]: partenza e arrivo sono lo stesso luogo ("PROVA-MUSEO")',
      'tempiPercorrenza[126].mezzo: mezzo non ammesso "teletrasporto" (valori ammessi: piedi, mezzi_pubblici, treno, auto, volo)',
      "tempiPercorrenza[127].minuti: i minuti devono essere un intero maggiore o uguale a zero (valore trovato: 2.5)",
      'tempiPercorrenza[128]: il tempo tra "PROVA-PARCO" e "PROVA-MUSEO" con il mezzo piedi è ripetuto',
    ]);
  });

  it("i tempi con i mezzi pubblici sono sempre stime dichiarate (orari reali fuori perimetro)", () => {
    const json = conModifica((j) => {
      const pubblico = j.tempiPercorrenza.find((t) => t["mezzo"] === "mezzi_pubblici");
      if (pubblico === undefined) throw new Error("manca un tempo con i mezzi pubblici");
      delete pubblico["stima"];
      const aPiedi = j.tempiPercorrenza.find((t) => t["mezzo"] === "piedi");
      if (aPiedi !== undefined) aPiedi["stima"] = false;
    });
    const errori = messaggi(json);
    expect(errori).toHaveLength(2);
    expect(errori[0]).toMatch(/^tempiPercorrenza\[0\]\.stima: "stima" ammette solo true \(valore trovato: false\)$/);
    expect(errori[1]).toMatch(/\.stima: un tempo con i mezzi pubblici è sempre una stima dichiarata: serve "stima": true$/);
  });
});
