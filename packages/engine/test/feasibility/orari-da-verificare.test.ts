/**
 * REQ-CAT-001 CA-4: un luogo con orari non verificati genera nel controllo di fattibilità solo un avviso
 * "orari da verificare", mai un problema bloccante.
 */
import { describe, expect, it } from "vitest";
import { classificaLuogoOsm, type ElementoOsm } from "../../src/catalog/index.js";
import {
  CODICI_AVVISO_CATALOGO,
  CODICI_PROBLEMA_FATTIBILITA,
  controllaFattibilita,
  eFattibile,
  GRAVITA_PROBLEMI_FATTIBILITA,
} from "../../src/feasibility/index.js";
import { caricaCatalogoEsteso } from "../../src/itinerary/index.js";
import type { CatalogoEsteso, DatiContesto, Problema, Viaggio } from "../../src/model/index.js";
import { catalogoEsteso, esempioOsm } from "../catalog/supporto.js";
import { contesto, leggiRiferimento, previsioneS1, sorgenteFinta, versione1 } from "./supporto.js";

const sintesi = (problemi: Problema[]): [string, string, string[]][] => problemi.map((p) => [p.codice, p.gravita, p.elementi]);

const controlla = (viaggio: Viaggio, catalogo: CatalogoEsteso, dati: DatiContesto = contesto()): Problema[] =>
  controllaFattibilita(viaggio, catalogo, sorgenteFinta(dati));

/** Il catalogo esteso con gli orari di alcuni luoghi marcati come non verificati. */
function conOrariNonVerificati(...luoghi: string[]): CatalogoEsteso {
  const catalogo = catalogoEsteso();
  for (const id of luoghi) {
    const luogo = catalogo.luoghi.find((l) => l.id === id);
    if (luogo === undefined) throw new Error(`${id} assente`);
    luogo.orariVerificati = false;
  }
  return catalogo;
}

/** Un catalogo con un luogo classificato da OpenStreetMap accanto all'hotel, e i tempi a piedi per raggiungerlo. */
function conLuogoOsm(elemento: ElementoOsm): { catalogo: CatalogoEsteso; dati: DatiContesto; attivitaId: string; luogoId: string } {
  const classificato = classificaLuogoOsm(elemento, "GARDA_NORD");
  if (classificato === null || classificato.attivita === null) throw new Error("luogo non classificato");
  const catalogo = catalogoEsteso();
  catalogo.luoghi.push(classificato.luogo);
  catalogo.attivita.push(classificato.attivita);
  const valido = caricaCatalogoEsteso(structuredClone(catalogo));
  if (!valido.ok) throw new Error(valido.errori.map((e) => e.messaggio).join("; "));
  const dati = contesto();
  dati.tempiPercorrenza.push({ da: "HOTEL", a: classificato.luogo.id, mezzo: "piedi", minuti: 10 });
  return { catalogo, dati, attivitaId: classificato.attivita.id, luogoId: classificato.luogo.id };
}

/** Sabato 2026-06-13: dall'hotel alla visita (inizio–fine) e ritorno, a piedi. */
function giornataDiVisita(luogoId: string, attivitaId: string, inizio: string, fine: string, data = "2026-06-13"): Viaggio {
  const minuti = (o: string): number => Number(o.slice(0, 2)) * 60 + Number(o.slice(3));
  const orario = (m: number): string => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  return {
    id: "TRIP-OSM",
    titolo: "Visita",
    dataInizio: data,
    dataFine: data,
    fusoOrario: "Europe/Rome",
    numeroViaggiatori: 2,
    prossimoNumeroId: 1,
    giorni: [
      {
        data,
        luogoPartenza: "HOTEL",
        elementi: [
          { id: "E1", tipo: "spostamento", inizio: orario(minuti(inizio) - 10), fine: inizio, da: "HOTEL", a: luogoId, mezzo: "piedi" },
          { id: "E2", tipo: "attivita", inizio, fine, attivitaId, priorita: "desiderata" },
          { id: "E3", tipo: "spostamento", inizio: fine, fine: orario(minuti(fine) + 10), da: luogoId, a: "HOTEL", mezzo: "piedi" },
        ],
      },
    ],
  };
}

describe("CA-4 — orari non verificati: solo un avviso, mai un problema bloccante", () => {
  it("CA-4 ORARI_DA_VERIFICARE è un avviso, separato dai codici R-1…R-8 di REQ-FEAS-001", () => {
    expect(CODICI_AVVISO_CATALOGO).toEqual(["ORARI_DA_VERIFICARE"]);
    expect(GRAVITA_PROBLEMI_FATTIBILITA.ORARI_DA_VERIFICARE).toBe("avviso");
    expect(CODICI_PROBLEMA_FATTIBILITA).not.toContain("ORARI_DA_VERIFICARE");
  });

  it("CA-4 il lungolago con orari non verificati: un solo avviso su D1-E2, l'itinerario resta fattibile", () => {
    const problemi = controlla(versione1(), conOrariNonVerificati("LUNGOLAGO"));
    expect(sintesi(problemi)).toEqual([["ORARI_DA_VERIFICARE", "avviso", ["D1-E2"]]]);
    expect(problemi[0]?.messaggio).toBe(
      'Gli orari di apertura di "Lungolago di Riva" non sono verificati (D1-E2 "Passeggiata sul lungolago" (16:10–18:10)): ti consiglio di controllare gli orari prima di andare.',
    );
    expect(eFattibile(problemi)).toBe(true);
  });

  it("CA-4 tutti i luoghi con orari non verificati: un avviso per ogni attività, nessun bloccante", () => {
    const catalogo = conOrariNonVerificati(...catalogoEsteso().luoghi.map((l) => l.id));
    const problemi = controlla(versione1(), catalogo);
    expect(sintesi(problemi)).toEqual(
      ["D1-E2", "D2-E2", "D2-E4", "D3-E2", "D3-E4", "D3-E6"].map((id) => ["ORARI_DA_VERIFICARE", "avviso", [id]]),
    );
    expect(eFattibile(problemi)).toBe(true);
  });

  it("CA-4 con la pioggia di S1 sul Ponale non verificato: due avvisi (meteo e orari), nessun bloccante", () => {
    const problemi = controlla(versione1(), conOrariNonVerificati("PONALE"), { ...contesto(), previsioni: [previsioneS1()] });
    expect(sintesi(problemi)).toEqual([
      ["METEO_AVVERSO", "avviso", ["D2-E2"]],
      ["ORARI_DA_VERIFICARE", "avviso", ["D2-E2"]],
    ]);
    expect(eFattibile(problemi)).toBe(true);
  });

  it("CA-4 un'attività fuori dagli orari predefiniti: l'avviso lo dice, ma non c'è FUORI_ORARIO bloccante", () => {
    // Il MUSE ha orari mar–dom 10:00–18:00: alle 18:30 di domenica sarebbe FUORI_ORARIO, se gli orari fossero verificati.
    const viaggio = versione1();
    const giorno3 = viaggio.giorni[2];
    if (giorno3 === undefined) throw new Error("giorno 3 assente");
    giorno3.elementi = giorno3.elementi.map((e) => {
      if (e.id === "D3-E6") return { ...e, inizio: "16:00", fine: "18:30" };
      if (e.id === "D3-E7") return { ...e, inizio: "18:30", fine: "19:20" };
      return e;
    });
    expect(sintesi(controlla(structuredClone(viaggio), catalogoEsteso()))).toEqual([["FUORI_ORARIO", "bloccante", ["D3-E6"]]]);

    const problemi = controlla(viaggio, conOrariNonVerificati("MUSE"));
    expect(sintesi(problemi)).toEqual([["ORARI_DA_VERIFICARE", "avviso", ["D3-E6"]]]);
    expect(problemi[0]?.messaggio).toContain("Secondo gli orari indicativi la domenica è aperto 10:00–18:00.");
    expect(eFattibile(problemi)).toBe(true);
  });

  it("CA-4 un museo OpenStreetMap senza opening_hours (orari predefiniti): solo l'avviso", () => {
    const { catalogo, dati, attivitaId, luogoId } = conLuogoOsm({
      type: "node",
      id: 7001,
      lat: 45.885,
      lon: 10.843,
      tags: { tourism: "museum", name: "Museo senza orari" },
    });
    const problemi = controlla(giornataDiVisita(luogoId, attivitaId, "10:00", "12:00"), catalogo, dati);
    expect(sintesi(problemi)).toEqual([["ORARI_DA_VERIFICARE", "avviso", ["E2"]]]);
    expect(eFattibile(problemi)).toBe(true);

    // Lunedì il museo è chiuso secondo gli orari predefiniti: resta un avviso, con l'indicazione nel messaggio.
    const lunedi = controlla(giornataDiVisita(luogoId, attivitaId, "10:00", "12:00", "2026-06-15"), catalogo, dati);
    expect(sintesi(lunedi)).toEqual([["ORARI_DA_VERIFICARE", "avviso", ["E2"]]]);
    expect(lunedi[0]?.messaggio).toContain("Secondo gli orari indicativi il lunedì è chiuso.");
  });

  it("CA-4 un luogo registrato con orari non leggibili (stagionali) diventa non verificato: solo l'avviso", () => {
    const { catalogo, dati, attivitaId, luogoId } = conLuogoOsm(esempioOsm(9100000014));
    const problemi = controlla(giornataDiVisita(luogoId, attivitaId, "10:00", "12:00"), catalogo, dati);
    expect(sintesi(problemi)).toEqual([["ORARI_DA_VERIFICARE", "avviso", ["E2"]]]);
  });

  it("CA-4 un luogo con orari verificati da opening_hours non genera l'avviso e resta soggetto a FUORI_ORARIO", () => {
    const { catalogo, dati, attivitaId, luogoId } = conLuogoOsm(esempioOsm(9100000001)); // Tu-Su 10:00-18:00
    expect(controlla(giornataDiVisita(luogoId, attivitaId, "10:00", "12:00"), catalogo, dati)).toEqual([]);
    const lunedi = controlla(giornataDiVisita(luogoId, attivitaId, "10:00", "12:00", "2026-06-15"), catalogo, dati);
    expect(sintesi(lunedi)).toEqual([["FUORI_ORARIO", "bloccante", ["E2"]]]);
  });

  it("CA-4 una chiusura straordinaria resta bloccante anche per un luogo con orari non verificati", () => {
    const chiusure = [{ luogoId: "MUSE", data: "2026-06-14", inizio: "00:00", fine: "24:00" }];
    const problemi = controlla(versione1(), conOrariNonVerificati("MUSE"), { ...contesto(), chiusure });
    expect(sintesi(problemi)).toEqual([
      ["LUOGO_CHIUSO", "bloccante", ["D3-E6"]],
      ["ORARI_DA_VERIFICARE", "avviso", ["D3-E6"]],
    ]);
  });

  it("CA-4 i luoghi senza il campo, o con orari verificati, non generano l'avviso (dati dell'ondata 1)", () => {
    const catalogo = leggiRiferimento<CatalogoEsteso>("catalogo.json");
    expect(controlla(versione1(), catalogo)).toEqual([]);
    expect(controlla(versione1(), catalogoEsteso())).toEqual([]);
  });

  it("CA-4 a parità di input gli avvisi sono identici e nello stesso ordine", () => {
    const catalogo = conOrariNonVerificati("LUNGOLAGO", "MAG", "MUSE", "RIST-TRENTO");
    expect(controlla(versione1(), catalogo)).toEqual(controlla(versione1(), structuredClone(catalogo)));
  });
});
