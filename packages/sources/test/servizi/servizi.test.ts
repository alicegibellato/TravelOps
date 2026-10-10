/** Modalità, configurazione, cache e adattatori di geocoding, percorsi, voli ed eventi (REQ-INTEG-001, CA-1/CA-2/CA-3/CA-5). Nessuna rete. */
import { describe, expect, it, vi } from "vitest";
import {
  creaEventiReale,
  creaPercorsiFinto,
  creaPercorsiOsrm,
  creaServizi,
  creaVoliReale,
  leggiConfigurazioneServizi,
  leggiIstantanea,
  linkRicercaVoli,
  PREDEFINITI_SERVIZI,
  type ClienteFonti,
  type FetchServizio,
  type RichiestaFonte,
} from "../../src/index.js";
import { istantaneaDiProva } from "../supporto.js";

const istantanea = leggiIstantanea(istantaneaDiProva());
const istantanee = istantanea.ok ? [istantanea.istantanea] : [];

describe("configurazione da ambiente (CA-2, CA-3)", () => {
  it("senza variabili tutto è finto e valgono i predefiniti documentati", () => {
    const c = leggiConfigurazioneServizi({});
    expect(c.modalita).toEqual({ meteo: "finto", percorsi: "finto", geocoding: "finto", voli: "finto", eventi: "finto" });
    expect(c.timeoutMs).toBe(PREDEFINITI_SERVIZI.timeoutMs);
    expect(c.ttlMs.meteo).toBe(3_600_000);
    expect(c.urlMeteo).toBe("https://api.open-meteo.com/v1/forecast");
    expect(c.avvisi).toEqual([]);
  });
  it("ogni servizio si sceglie da solo; il geocoding segue i percorsi se non è indicato", () => {
    const c = leggiConfigurazioneServizi({ TRAVELOPS_METEO: "reale", TRAVELOPS_PERCORSI: "REALE", TRAVELOPS_VOLI: "finto" });
    expect(c.modalita).toMatchObject({ meteo: "reale", percorsi: "reale", geocoding: "reale", voli: "finto", eventi: "finto" });
    expect(leggiConfigurazioneServizi({ TRAVELOPS_PERCORSI: "reale", TRAVELOPS_GEOCODING: "finto" }).modalita.geocoding).toBe("finto");
  });
  it("timeout, TTL e indirizzi vengono dall'ambiente", () => {
    const c = leggiConfigurazioneServizi({
      TRAVELOPS_SERVIZI_TIMEOUT_MS: "1500",
      TRAVELOPS_METEO_TTL_S: "60",
      TRAVELOPS_PERCORSI_TTL_S: "0",
      TRAVELOPS_METEO_URL: "http://localhost:9999/previsione",
      TRAVELOPS_USER_AGENT: "TravelOps/9 (prova)",
    });
    expect(c).toMatchObject({ timeoutMs: 1500, urlMeteo: "http://localhost:9999/previsione", userAgent: "TravelOps/9 (prova)" });
    expect(c.ttlMs).toMatchObject({ meteo: 60_000, percorsi: 0 });
  });
  it("un valore non valido non rompe nulla: predefinito e avviso", () => {
    const c = leggiConfigurazioneServizi({
      TRAVELOPS_METEO: "boh",
      TRAVELOPS_SERVIZI_TIMEOUT_MS: "-3",
      TRAVELOPS_METEO_TTL_S: "x",
      TRAVELOPS_METEO_URL: "ftp://no",
      TRAVELOPS_USER_AGENT: "curl",
    });
    expect(c.modalita.meteo).toBe("finto");
    expect(c.timeoutMs).toBe(PREDEFINITI_SERVIZI.timeoutMs);
    expect(c.userAgent).toBe("TravelOps/0.1");
    expect(c.avvisi).toHaveLength(5);
  });
});

describe("composizione: finto o reale per servizio (CA-2)", () => {
  it("di predefinito nessun adattatore reale e nessuna rete", async () => {
    const fetch = vi.fn();
    const s = creaServizi(leggiConfigurazioneServizi({}), { fetch: fetch as unknown as FetchServizio, istantanee });
    expect([s.meteo.modalita, s.geocoding.modalita, s.percorsi.modalita, s.voli.modalita, s.eventi.modalita]).toEqual(["finto", "finto", "finto", "finto", "finto"]);
    await s.meteo.previsione({ coordinate: { lat: 45, lon: 10 }, dataInizio: "2026-07-01", dataFine: "2026-07-02" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("con TRAVELOPS_METEO=reale solo il meteo passa dal fetch; gli altri restano finti", async () => {
    const fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ daily: { time: ["2026-07-01"], weather_code: [0] } }) }));
    const s = creaServizi(leggiConfigurazioneServizi({ TRAVELOPS_METEO: "reale" }), { fetch, istantanee });
    expect(s.meteo.modalita).toBe("reale");
    expect(s.percorsi.modalita).toBe("finto");
    const r = await s.meteo.previsione({ coordinate: { lat: 45, lon: 10 }, dataInizio: "2026-07-01", dataFine: "2026-07-01" });
    expect(r).toMatchObject({ disponibile: true, origine: "reale" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("la cache del meteo usa il TTL configurato (CA-3)", async () => {
    let ora = 0;
    const fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ daily: { time: ["2026-07-01"], weather_code: [0] } }) }));
    const s = creaServizi(leggiConfigurazioneServizi({ TRAVELOPS_METEO: "reale", TRAVELOPS_METEO_TTL_S: "10" }), { fetch, adesso: () => ora });
    const richiesta = { coordinate: { lat: 45, lon: 10 }, dataInizio: "2026-07-01", dataFine: "2026-07-01" };
    await s.meteo.previsione(richiesta);
    ora = 9_999;
    expect(await s.meteo.previsione(richiesta)).toMatchObject({ dallaCache: true });
    expect(fetch).toHaveBeenCalledTimes(1);
    ora = 10_001;
    await s.meteo.previsione(richiesta);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("un meteo reale che non risponde non rompe l'app: risultato non disponibile con messaggio", async () => {
    const fetch: FetchServizio = async () => {
      throw new Error("ECONNREFUSED");
    };
    const s = creaServizi(leggiConfigurazioneServizi({ TRAVELOPS_METEO: "reale" }), { fetch });
    const r = await s.meteo.previsione({ coordinate: { lat: 45, lon: 10 }, dataInizio: "2026-07-01", dataFine: "2026-07-01" });
    expect(r).toMatchObject({ disponibile: false, motivo: "rete", messaggio: "Meteo non disponibile: il servizio non è raggiungibile" });
  });
});

describe("percorsi", () => {
  const DA = { lat: 45.8868, lon: 10.8458 };
  const A = { lat: 45.8921, lon: 10.8351 };
  const clienteCon = (risposta: () => Promise<{ stato: number; corpo: unknown }>) => {
    const richieste: RichiestaFonte[] = [];
    const cliente: ClienteFonti = {
      async richiedi(r) {
        richieste.push(r);
        return risposta();
      },
    };
    return { cliente, richieste };
  };
  const opzioni = { urlAuto: "https://osrm.test/auto/", urlPiedi: "https://osrm.test/piedi/", timeoutMs: 1000 };

  it("OSRM: usa il cliente di packages/sources, l'URL configurato per il mezzo e legge i minuti", async () => {
    const { cliente, richieste } = clienteCon(async () => ({ stato: 200, corpo: { code: "Ok", durations: [[754.2]] } }));
    const p = creaPercorsiOsrm({ cliente, ...opzioni });
    const r = await p.calcola({ da: DA, a: A, mezzo: "piedi" });
    expect(r).toMatchObject({ disponibile: true, origine: "reale", dati: { minuti: 13, stimato: false } });
    expect(richieste[0]).toMatchObject({ servizio: "osrm" });
    expect(richieste[0]?.url.startsWith("https://osrm.test/piedi/10.84580,45.88680;10.83510,45.89210?")).toBe(true);
    await p.calcola({ da: DA, a: A, mezzo: "auto" });
    expect(richieste[1]?.url.startsWith("https://osrm.test/auto/")).toBe(true);
  });
  it("OSRM: errore di rete, 5xx, nessun percorso e timeout degradano senza eccezioni", async () => {
    const rete = creaPercorsiOsrm({ cliente: clienteCon(async () => { throw new Error("giù"); }).cliente, ...opzioni });
    expect(await rete.calcola({ da: DA, a: A, mezzo: "auto" })).toMatchObject({ disponibile: false, motivo: "rete", messaggio: expect.stringMatching(/^Servizio percorsi non disponibile/) });
    const cinque = creaPercorsiOsrm({ cliente: clienteCon(async () => ({ stato: 503, corpo: "" })).cliente, ...opzioni });
    expect(await cinque.calcola({ da: DA, a: A, mezzo: "auto" })).toMatchObject({ disponibile: false, motivo: "rete" });
    const senza = creaPercorsiOsrm({ cliente: clienteCon(async () => ({ stato: 200, corpo: { code: "NoRoute" } })).cliente, ...opzioni });
    expect(await senza.calcola({ da: DA, a: A, mezzo: "auto" })).toMatchObject({ disponibile: false, motivo: "richiesta_rifiutata" });
    const lento = creaPercorsiOsrm({ cliente: clienteCon(() => new Promise(() => {})).cliente, ...opzioni, timeoutMs: 20 });
    expect(await lento.calcola({ da: DA, a: A, mezzo: "auto" })).toMatchObject({ disponibile: false, motivo: "timeout" });
  });
  it("finto: stima in linea d'aria deterministica, e i tempi dell'istantanea per i luoghi noti", async () => {
    const f = creaPercorsiFinto({ istantanee });
    const a = await f.calcola({ da: DA, a: A, mezzo: "piedi" });
    expect(a).toEqual(await f.calcola({ da: DA, a: A, mezzo: "piedi" }));
    expect(a).toMatchObject({ disponibile: true, origine: "finto", dati: { stimato: true } });
    const tempo = istantanea.ok ? istantanea.istantanea.tempiPercorrenza.find((t) => t.mezzo === "piedi") : undefined;
    const luoghi = istantanea.ok ? istantanea.istantanea.luoghi : [];
    const x = luoghi.find((l) => l.id === tempo?.da)?.coordinate;
    const y = luoghi.find((l) => l.id === tempo?.a)?.coordinate;
    if (tempo === undefined || x === undefined || y === undefined) throw new Error("l'istantanea di prova dovrebbe avere un tempo a piedi tra luoghi con coordinate");
    expect(await f.calcola({ da: x, a: y, mezzo: "piedi" })).toMatchObject({ disponibile: true, dati: { minuti: tempo.minuti, stimato: false } });
  });
});

describe("geocoding", () => {
  it("finto: cerca tra le aree delle istantanee", async () => {
    const s = creaServizi(leggiConfigurazioneServizi({}), { istantanee });
    const nome = istantanea.ok ? istantanea.istantanea.area.nome : "";
    const r = await s.geocoding.cerca(nome.slice(0, 5));
    expect(r).toMatchObject({ disponibile: true, origine: "finto" });
    expect(r.disponibile && r.dati.map((a) => a.nome)).toContain(nome);
  });
  it("reale: riusa la sorgente Nominatim di packages/sources (User-Agent, una ricerca per testo in cache)", async () => {
    const richieste: RichiestaFonte[] = [];
    const cliente: ClienteFonti = {
      async richiedi(r) {
        richieste.push(r);
        return { stato: 200, corpo: [{ osm_type: "relation", osm_id: 1, lat: "45.88", lon: "10.84", display_name: "Riva del Garda, Trentino, Italia", name: "Riva del Garda" }] };
      },
    };
    const orologio = { adesso: () => 0, attendi: async () => {} };
    const s = creaServizi(leggiConfigurazioneServizi({ TRAVELOPS_PERCORSI: "reale" }), { cliente, orologio });
    expect(s.geocoding.modalita).toBe("reale");
    const r = await s.geocoding.cerca("Riva del Garda");
    expect(r).toMatchObject({ disponibile: true, origine: "reale" });
    expect(r.disponibile && r.dati[0]).toMatchObject({ id: "osm:relation/1", nome: "Riva del Garda" });
    await s.geocoding.cerca("Riva del Garda");
    expect(richieste).toHaveLength(1);
    expect(richieste[0]).toMatchObject({ servizio: "nominatim" });
  });
  it("reale: se Nominatim non risponde il risultato è non disponibile", async () => {
    const cliente: ClienteFonti = { richiedi: async () => { throw new Error("giù"); } };
    const s = creaServizi(leggiConfigurazioneServizi({ TRAVELOPS_GEOCODING: "reale" }), { cliente, orologio: { adesso: () => 0, attendi: async () => {} } });
    expect(await s.geocoding.cerca("Roma")).toMatchObject({ disponibile: false, messaggio: "Ricerca luoghi non disponibile: il servizio non è raggiungibile" });
  });
});

describe("voli ed eventi", () => {
  const voli = { origine: "MXP", destinazione: "VRN", data: "2026-07-14" };
  it("voli finti: orari plausibili, deterministici, con link di ricerca e marcati come esempio", async () => {
    const s = creaServizi(leggiConfigurazioneServizi({}));
    const r = await s.voli.cerca(voli);
    expect(await s.voli.cerca(voli)).toMatchObject({ dati: r.disponibile ? r.dati : null });
    if (!r.disponibile) throw new Error("atteso disponibile");
    expect(r.dati.esempio).toBe(true);
    expect(r.dati.linkRicerca).toBe(linkRicercaVoli(voli));
    expect(r.dati.linkRicerca).toContain("https://www.google.com/travel/flights?q=");
    expect(r.dati.voli.length).toBeGreaterThan(0);
    for (const v of r.dati.voli) {
      expect(v.partenza).toMatch(/^\d\d:\d\d$/);
      expect(v.arrivo).toMatch(/^\d\d:\d\d$/);
      expect(v.durataMinuti).toBeGreaterThanOrEqual(60);
    }
  });
  it("voli reali senza provider: non disponibile, ma resta il link; con un provider iniettato passa dalla sua interfaccia", async () => {
    const senza = await creaVoliReale({ timeoutMs: 100 }).cerca(voli);
    expect(senza).toMatchObject({ disponibile: false, motivo: "non_configurato" });
    const provider = { cerca: vi.fn(async () => [{ compagnia: "X", numero: "XX1", partenza: "08:00", arrivo: "09:10", durataMinuti: 70 }]) };
    const con = await creaVoliReale({ provider, timeoutMs: 100 }).cerca(voli);
    expect(con).toMatchObject({ disponibile: true, origine: "reale", dati: { esempio: false } });
    expect(provider.cerca).toHaveBeenCalledTimes(1);
    const guasto = await creaVoliReale({ provider: { cerca: async () => { throw new Error("x"); } }, timeoutMs: 100 }).cerca(voli);
    expect(guasto).toMatchObject({ disponibile: false, motivo: "rete" });
  });
  it("eventi finti deterministici e marcati come esempio; reali senza provider non disponibili", async () => {
    const s = creaServizi(leggiConfigurazioneServizi({}));
    const richiesta = { coordinate: { lat: 45.88, lon: 10.84 }, dataInizio: "2026-07-01", dataFine: "2026-07-30" };
    const r = await s.eventi.cerca(richiesta);
    expect(await s.eventi.cerca(richiesta)).toMatchObject({ dati: r.disponibile ? r.dati : null });
    expect(r.disponibile && r.dati.esempio && r.dati.eventi.length > 0).toBe(true);
    expect(await creaEventiReale({ timeoutMs: 100 }).cerca(richiesta)).toMatchObject({ disponibile: false, motivo: "non_configurato" });
  });
});
