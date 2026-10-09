/**
 * REQ-CAT-001 CA-5: le 8 attività dell'ondata 1 hanno i valori di `modello-dominio-estensioni.md` §7.3,
 * nei dati di riferimento aggiunti (`data/reference/estensioni/catalogo-esteso.json`).
 */
import { describe, expect, it } from "vitest";
import { caricaCatalogo } from "../../src/itinerary/index.js";
import type { Costo, Intensita, StileViaggio } from "../../src/model/index.js";
import { catalogoEsteso, leggiDati, type Grezzo } from "./supporto.js";

interface ValoriAttesi {
  stili: StileViaggio[];
  intensita: Intensita;
  costo: Costo;
  adattaAiBambini: boolean;
  accessibile: boolean;
}

/** Trascrizione della §7.3, attività per attività. */
const ATTESI: Record<string, ValoriAttesi> = {
  // `A-LUNGOLAGO` e `A-PONALE` stili natura, `A-PONALE` anche avventura; lungolago e Ponale gratis.
  "A-LUNGOLAGO": { stili: ["natura"], intensita: "facile", costo: "gratis", adattaAiBambini: true, accessibile: true },
  // `A-PONALE` impegnativa; accessibili tutte tranne `A-PONALE`.
  "A-PONALE": { stili: ["natura", "avventura"], intensita: "impegnativa", costo: "gratis", adattaAiBambini: true, accessibile: false },
  // `A-MAG`, `A-BUONCONSIGLIO`, `A-MUSE` stile cultura, `A-MUSE` anche famiglia; musei e castello €.
  "A-MAG": { stili: ["cultura"], intensita: "facile", costo: "€", adattaAiBambini: true, accessibile: true },
  "A-BUONCONSIGLIO": { stili: ["cultura"], intensita: "facile", costo: "€", adattaAiBambini: true, accessibile: true },
  "A-MUSE": { stili: ["cultura", "famiglia"], intensita: "facile", costo: "€", adattaAiBambini: true, accessibile: true },
  // `A-CANTINA` stili gastronomia e romantico, €€; adatte ai bambini tutte tranne `A-CANTINA`.
  "A-CANTINA": { stili: ["gastronomia", "romantico"], intensita: "facile", costo: "€€", adattaAiBambini: false, accessibile: true },
  // I pranzi stile gastronomia, €€.
  "A-PRANZO-RIVA": { stili: ["gastronomia"], intensita: "facile", costo: "€€", adattaAiBambini: true, accessibile: true },
  "A-PRANZO-TRENTO": { stili: ["gastronomia"], intensita: "facile", costo: "€€", adattaAiBambini: true, accessibile: true },
};

const CAMPI_7_3_ATTIVITA = ["stili", "intensita", "costo", "adattaAiBambini", "accessibile", "mesiConsigliati", "descrizioneBreve", "immagine"];
const CAMPI_7_3_LUOGO = [
  "costoIndicativo",
  "opzioniAlimentari",
  "origine",
  "osmId",
  "orariVerificati",
  "fonteDescrizione",
  "attribuzioneImmagine",
];

const senza = (voce: Grezzo, campi: readonly string[]): Grezzo =>
  Object.fromEntries(Object.entries(voce).filter(([chiave]) => !campi.includes(chiave)));

describe("CA-5 — i valori della §7.3 sulle 8 attività dell'ondata 1", () => {
  const catalogo = catalogoEsteso();

  it("CA-5 il catalogo esteso ha le stesse 8 attività dell'ondata 1, nello stesso ordine", () => {
    expect(catalogo.attivita.map((a) => a.id)).toEqual(leggiDati("catalogo.json").attivita.map((a: Grezzo) => a.id));
    expect(Object.keys(ATTESI).sort()).toEqual(catalogo.attivita.map((a) => a.id).sort());
  });

  it.each(Object.entries(ATTESI))("CA-5 %s ha i valori indicati", (id, attesi) => {
    const attivita = catalogo.attivita.find((a) => a.id === id);
    expect(attivita).toMatchObject(attesi);
    expect(attivita?.descrizioneBreve).toMatch(/^[A-ZÀ-Ú].+\.$/);
  });

  it("CA-5 riepilogo della §7.3: solo il Ponale è impegnativo, solo la cantina non è per bambini, solo il Ponale non è accessibile", () => {
    expect(catalogo.attivita.filter((a) => a.intensita !== "facile").map((a) => a.id)).toEqual(["A-PONALE"]);
    expect(catalogo.attivita.filter((a) => a.adattaAiBambini === false).map((a) => a.id)).toEqual(["A-CANTINA"]);
    expect(catalogo.attivita.filter((a) => a.accessibile === false).map((a) => a.id)).toEqual(["A-PONALE"]);
  });

  it("CA-5 i luoghi dell'ondata 1 hanno origine riferimento e orari verificati; i ristoranti costo indicativo €€", () => {
    for (const luogo of catalogo.luoghi) {
      expect(luogo).toMatchObject({ origine: "riferimento", orariVerificati: true });
      expect(luogo).not.toHaveProperty("osmId");
    }
    expect(catalogo.luoghi.filter((l) => l.costoIndicativo !== undefined).map((l) => [l.id, l.costoIndicativo])).toEqual([
      ["RIST-RIVA", "€€"],
      ["RIST-TRENTO", "€€"],
    ]);
  });

  it("CA-5 tolti i campi della §7.3, il catalogo esteso è identico al catalogo dell'ondata 1 (stessi id e stessi dati)", () => {
    const esteso = leggiDati("estensioni/catalogo-esteso.json");
    const ridotto = {
      zone: esteso.zone,
      luoghi: esteso.luoghi.map((l: Grezzo) => senza(l, CAMPI_7_3_LUOGO)),
      attivita: esteso.attivita.map((a: Grezzo) => senza(a, CAMPI_7_3_ATTIVITA)),
    };
    expect(ridotto).toStrictEqual(leggiDati("catalogo.json"));
  });

  it("CA-5 il catalogo esteso usa solo tipi e categorie dell'ondata 1: si carica anche con caricaCatalogo", () => {
    expect(caricaCatalogo(leggiDati("estensioni/catalogo-esteso.json"))).toStrictEqual({ ok: true, valore: catalogo });
  });
});
