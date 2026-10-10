/** Il meteo dei servizi entra nel controllo di fattibilità (REQ-INTEG-001, CA-4/CA-5): integrazione porta Meteo + motore. Nessuna rete. */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { conPrevisioni, controllaFattibilita, creaSorgenteDaFile, type CatalogoEsteso, type Viaggio } from "@travelops/engine";
import { describe, expect, it } from "vitest";
import { creaMeteoFinto, creaMeteoOpenMeteo, leggiMeteoViaggio, type FetchServizio, type ServizioMeteo } from "../../src/index.js";

const dati = (nome: string): string => fileURLToPath(new URL(`../../../engine/data/reference/${nome}`, import.meta.url));
const catalogo = JSON.parse(readFileSync(dati("catalogo.json"), "utf8")) as CatalogoEsteso;
const viaggio = JSON.parse(readFileSync(dati("versione-1.json"), "utf8")) as Viaggio;
const base = creaSorgenteDaFile(fileURLToPath(new URL("../../../engine/data/reference", import.meta.url)));

/** Il sentiero A-PONALE (all'aperto) è il 2026-06-13 nella zona GARDA_NORD. */
const GIORNO_PONALE = "2026-06-13";
const meteoAvversi = (haPioggia: (data: string) => boolean): ServizioMeteo =>
  creaMeteoFinto({ condizione: (_c, data) => (haPioggia(data) ? "pioggia" : "sereno") });

describe("meteo e fattibilità", () => {
  it("senza previsioni l'itinerario di riferimento non ha avvisi di meteo", () => {
    expect(controllaFattibilita(viaggio, catalogo, base).filter((p) => p.codice === "METEO_AVVERSO")).toEqual([]);
  });

  it("pioggia prevista dal servizio sul giorno di un'attività all'aperto → avviso METEO_AVVERSO su quell'attività", async () => {
    const meteo = await leggiMeteoViaggio(meteoAvversi((d) => d === GIORNO_PONALE), viaggio, catalogo);
    expect(meteo.avviso).toBeNull();
    const problemi = controllaFattibilita(viaggio, catalogo, conPrevisioni(base, meteo.previsioni)).filter((p) => p.codice === "METEO_AVVERSO");
    expect(problemi.length).toBeGreaterThan(0);
    expect(problemi.every((p) => p.gravita === "avviso")).toBe(true);
    const ponale = viaggio.giorni.find((g) => g.data === GIORNO_PONALE)?.elementi.find((e) => e.tipo !== "spostamento" && e.attivitaId === "A-PONALE");
    expect(problemi.some((p) => p.elementi.includes(ponale?.id ?? "?"))).toBe(true);
    expect(problemi[0]?.messaggio).toContain("pioggia");
  });

  it("la stessa pioggia, ma al coperto, non genera avvisi", async () => {
    const meteo = await leggiMeteoViaggio(meteoAvversi((d) => d === GIORNO_PONALE), viaggio, catalogo);
    const problemi = controllaFattibilita(viaggio, catalogo, conPrevisioni(base, meteo.previsioni)).filter((p) => p.codice === "METEO_AVVERSO");
    const coperto = viaggio.giorni.flatMap((g) => g.elementi).filter((e) => e.tipo !== "spostamento" && e.attivitaId === "A-MAG").map((e) => e.id);
    expect(problemi.some((p) => p.elementi.some((id) => coperto.includes(id)))).toBe(false);
  });

  it("sereno ovunque: nessun avviso; è deterministico", async () => {
    const meteo = await leggiMeteoViaggio(meteoAvversi(() => false), viaggio, catalogo);
    const a = controllaFattibilita(viaggio, catalogo, conPrevisioni(base, meteo.previsioni));
    expect(a.filter((p) => p.codice === "METEO_AVVERSO")).toEqual([]);
    expect(a).toEqual(controllaFattibilita(viaggio, catalogo, conPrevisioni(base, meteo.previsioni)));
  });

  it("meteo non disponibile: nessun avviso inventato, la fattibilità funziona e il viaggiatore ne è informato", async () => {
    const fetch: FetchServizio = async () => {
      throw new TypeError("fetch failed");
    };
    const meteo = await leggiMeteoViaggio(creaMeteoOpenMeteo({ url: "https://meteo.test/f", timeoutMs: 100, fetch }), viaggio, catalogo);
    expect(meteo.previsioni).toEqual([]);
    expect(meteo.avviso).toMatch(/^Meteo non disponibile/);
    expect(Object.values(meteo.perGiorno).every((g) => !g.disponibile)).toBe(true);
    expect(controllaFattibilita(viaggio, catalogo, conPrevisioni(base, meteo.previsioni))).toEqual(controllaFattibilita(viaggio, catalogo, base));
  });

  it("previsione per giorno per le viste: zona, origine, temperature e fasce", async () => {
    const meteo = await leggiMeteoViaggio(meteoAvversi((d) => d === GIORNO_PONALE), viaggio, catalogo);
    expect(Object.keys(meteo.perGiorno)).toEqual(viaggio.giorni.map((g) => g.data));
    const giorno = meteo.perGiorno[GIORNO_PONALE];
    expect(giorno).toMatchObject({ disponibile: true, origine: "finto", previsione: { condizione: "pioggia" } });
    expect(giorno?.disponibile && giorno.zonaNome.length > 0).toBe(true);
  });

  it("le zone senza coordinate usano il centro dei loro luoghi", async () => {
    const senzaCoordinate: CatalogoEsteso = { ...catalogo, zone: catalogo.zone.map(({ coordinate: _c, ...z }) => z) };
    const richieste: unknown[] = [];
    const meteo: ServizioMeteo = {
      modalita: "finto",
      async previsione(r) {
        richieste.push(r.coordinate);
        return { disponibile: true, origine: "finto", dallaCache: false, dati: [] };
      },
    };
    await leggiMeteoViaggio(meteo, viaggio, senzaCoordinate);
    expect(richieste.length).toBeGreaterThan(0);
    for (const c of richieste) expect(c).toMatchObject({ lat: expect.any(Number), lon: expect.any(Number) });
  });
});
