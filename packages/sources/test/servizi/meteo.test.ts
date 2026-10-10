/** Porta Meteo (REQ-INTEG-001, CA-1/CA-3/CA-5): Open-Meteo con risposta registrata e fetch finto, codici WMO, timeout, errori, cache. Nessuna rete. */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { conCache, condizioneDaCodiceWmo, creaMeteoFinto, creaMeteoOpenMeteo, leggiRispostaOpenMeteo, previsioniDelMotore, type FetchServizio, type RisultatoServizio } from "../../src/index.js";

const registrata: unknown = JSON.parse(readFileSync(fileURLToPath(new URL("./dati/open-meteo-garda.json", import.meta.url)), "utf8"));
const RICHIESTA = { coordinate: { lat: 45.89, lon: 10.84 }, dataInizio: "2026-07-14", dataFine: "2026-07-15" };

const rispondi = (corpo: unknown, stato = 200): FetchServizio =>
  vi.fn(async () => ({ ok: stato >= 200 && stato < 300, status: stato, json: async () => corpo }));

describe("codici WMO", () => {
  it("mappa i codici sulle condizioni del dominio", () => {
    const attese: [number, string][] = [
      [0, "sereno"], [1, "sereno"], [2, "nuvoloso"], [3, "nuvoloso"], [45, "nuvoloso"],
      [51, "pioggia"], [55, "pioggia"], [61, "pioggia"], [65, "pioggia"], [66, "pioggia"], [80, "pioggia"], [82, "pioggia"],
      [71, "neve"], [75, "neve"], [77, "neve"], [85, "neve"], [86, "neve"],
      [95, "temporale"], [96, "temporale"], [99, "temporale"],
    ];
    for (const [codice, condizione] of attese) expect(condizioneDaCodiceWmo(codice), `WMO ${codice}`).toBe(condizione);
  });
  it("un codice sconosciuto non diventa una condizione", () => {
    expect(condizioneDaCodiceWmo(42)).toBeNull();
    expect(condizioneDaCodiceWmo(1.5)).toBeNull();
    expect(condizioneDaCodiceWmo(-1)).toBeNull();
  });
});

describe("adattatore Open-Meteo", () => {
  it("legge la risposta registrata: giorno, temperature, probabilità e fasce orarie", async () => {
    const fetch = rispondi(registrata);
    const meteo = creaMeteoOpenMeteo({ url: "https://meteo.test/v1/forecast", timeoutMs: 1000, fetch });
    const r = await meteo.previsione(RICHIESTA);
    expect(r.disponibile).toBe(true);
    if (!r.disponibile) return;
    expect(r.origine).toBe("reale");
    const [primo, secondo] = r.dati;
    expect(primo).toMatchObject({ data: "2026-07-14", condizione: "pioggia", temperaturaMin: 16.2, temperaturaMax: 24.3, probabilitaPrecipitazioni: 85 });
    expect(primo?.fasce).toEqual([
      { inizio: "00:00", fine: "09:00", condizione: "sereno" },
      { inizio: "09:00", fine: "14:00", condizione: "nuvoloso" },
      { inizio: "14:00", fine: "18:00", condizione: "pioggia" },
      { inizio: "18:00", fine: "24:00", condizione: "nuvoloso" },
    ]);
    expect(secondo).toMatchObject({ data: "2026-07-15", condizione: "sereno" });
  });

  it("chiede solo coordinate e date, in forma canonica e senza chiavi", async () => {
    const fetch = rispondi(registrata);
    await creaMeteoOpenMeteo({ url: "https://meteo.test/v1/forecast", timeoutMs: 1000, fetch }).previsione(RICHIESTA);
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, { headers: Record<string, string> }];
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe("https://meteo.test/v1/forecast");
    expect(Object.fromEntries(u.searchParams)).toMatchObject({ latitude: "45.8900", longitude: "10.8400", start_date: "2026-07-14", end_date: "2026-07-15", timezone: "auto" });
    expect(url).not.toMatch(/key|token|apikey/i);
    expect(init.headers["User-Agent"]).toMatch(/TravelOps/);
  });

  it("le fasce non serene diventano previsioni del motore per la zona", async () => {
    const r = await creaMeteoOpenMeteo({ url: "https://meteo.test/f", timeoutMs: 1000, fetch: rispondi(registrata) }).previsione(RICHIESTA);
    if (!r.disponibile) throw new Error("atteso disponibile");
    const p = previsioniDelMotore("ZONA", r.dati);
    expect(p).toContainEqual({ zonaId: "ZONA", data: "2026-07-14", inizio: "14:00", fine: "18:00", condizione: "pioggia" });
    expect(p.every((x) => x.condizione !== "sereno")).toBe(true);
  });

  it("un errore di rete degrada in modo esplicito, senza eccezioni", async () => {
    const fetch: FetchServizio = async () => {
      throw new TypeError("fetch failed");
    };
    const r = await creaMeteoOpenMeteo({ url: "https://meteo.test/f", timeoutMs: 1000, fetch }).previsione(RICHIESTA);
    expect(r).toMatchObject({ disponibile: false, origine: "reale", motivo: "rete" });
    expect(r.disponibile ? "" : r.messaggio).toMatch(/^Meteo non disponibile/);
  });

  it("uno stato 5xx degrada come rete; uno 4xx (date fuori dall'orizzonte) come richiesta rifiutata", async () => {
    const cinque = await creaMeteoOpenMeteo({ url: "https://meteo.test/f", timeoutMs: 1000, fetch: rispondi({}, 503) }).previsione(RICHIESTA);
    expect(cinque).toMatchObject({ disponibile: false, motivo: "rete" });
    const quattro = await creaMeteoOpenMeteo({ url: "https://meteo.test/f", timeoutMs: 1000, fetch: rispondi({ error: true, reason: "out of range" }, 400) }).previsione(RICHIESTA);
    expect(quattro).toMatchObject({ disponibile: false, motivo: "richiesta_rifiutata" });
  });

  it("una risposta con forma inattesa è non valida", async () => {
    for (const corpo of [null, "x", {}, { daily: {} }, { daily: { time: ["2026-07-14"], weather_code: [] } }]) {
      const r = await creaMeteoOpenMeteo({ url: "https://meteo.test/f", timeoutMs: 1000, fetch: rispondi(corpo) }).previsione(RICHIESTA);
      expect(r, JSON.stringify(corpo)).toMatchObject({ disponibile: false, motivo: "risposta_non_valida" });
    }
    expect(() => leggiRispostaOpenMeteo(42)).toThrow();
  });

  it("giorni senza codice (troppo lontani) restano fuori e, se non c'è nessun giorno, il risultato non è disponibile", async () => {
    const corpo = { daily: { time: ["2026-07-14", "2026-07-15"], weather_code: [0, null] } };
    const r = await creaMeteoOpenMeteo({ url: "https://meteo.test/f", timeoutMs: 1000, fetch: rispondi(corpo) }).previsione(RICHIESTA);
    expect(r.disponibile && r.dati.map((g) => g.data)).toEqual(["2026-07-14"]);
    const vuoto = await creaMeteoOpenMeteo({ url: "https://meteo.test/f", timeoutMs: 1000, fetch: rispondi({ daily: { time: ["2026-07-14"], weather_code: [null] } }) }).previsione(RICHIESTA);
    expect(vuoto).toMatchObject({ disponibile: false, motivo: "richiesta_rifiutata" });
  });

  it("scaduto il tempo massimo (AbortSignal) il risultato è non disponibile per timeout", async () => {
    const fetch: FetchServizio = (_url, { signal }) =>
      new Promise((_ok, ko) => signal.addEventListener("abort", () => ko(signal.reason)));
    const r = await creaMeteoOpenMeteo({ url: "https://meteo.test/f", timeoutMs: 20, fetch }).previsione(RICHIESTA);
    expect(r).toMatchObject({ disponibile: false, motivo: "timeout" });
    expect(r.disponibile ? "" : r.messaggio).toMatch(/non risponde in tempo/);
  });

  it("una richiesta annullata dal chiamante non parte e non è un errore", async () => {
    const fetch = rispondi(registrata);
    const r = await creaMeteoOpenMeteo({ url: "https://meteo.test/f", timeoutMs: 1000, fetch }).previsione({ ...RICHIESTA, segnale: AbortSignal.abort() });
    expect(r).toMatchObject({ disponibile: false, motivo: "annullato" });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("adattatore finto", () => {
  it("è deterministico e copre ogni giorno richiesto, senza rete", async () => {
    const a = await creaMeteoFinto().previsione({ ...RICHIESTA, dataFine: "2026-07-20" });
    const b = await creaMeteoFinto().previsione({ ...RICHIESTA, dataFine: "2026-07-20" });
    expect(a).toEqual(b);
    expect(a.disponibile && a.dati).toHaveLength(7);
    expect(a.disponibile && a.origine).toBe("finto");
  });
  it("di predefinito non produce meteo avverso; con una condizione scelta dal test sì", async () => {
    const mite = await creaMeteoFinto().previsione({ ...RICHIESTA, dataFine: "2026-12-31" });
    expect(mite.disponibile && mite.dati.every((g) => g.condizione === "sereno" || g.condizione === "nuvoloso")).toBe(true);
    const pioggia = await creaMeteoFinto({ condizione: () => "pioggia" }).previsione(RICHIESTA);
    expect(pioggia.disponibile && pioggia.dati[0]?.fasce).toEqual([{ inizio: "00:00", fine: "24:00", condizione: "pioggia" }]);
  });
});

describe("cache con scadenza", () => {
  const conta = () => {
    let chiamate = 0;
    const chiama = async (n: number): Promise<RisultatoServizio<number>> => ({ disponibile: true, dati: n * 2 + chiamate++, origine: "finto", dallaCache: false });
    return { chiama, chiamate: () => chiamate };
  };
  it("entro il TTL non rifà la chiamata e lo segnala; scaduto il TTL la rifà", async () => {
    let ora = 1000;
    const { chiama, chiamate } = conta();
    const c = conCache({ ttlMs: 100, adesso: () => ora }, (n: number) => String(n), chiama);
    const primo = await c(1);
    ora += 99;
    const secondo = await c(1);
    expect(chiamate()).toBe(1);
    expect(primo).toMatchObject({ dallaCache: false });
    expect(secondo).toMatchObject({ dallaCache: true, dati: primo.disponibile ? primo.dati : -1 });
    ora += 2;
    await c(1);
    expect(chiamate()).toBe(2);
    await c(2);
    expect(chiamate()).toBe(3);
  });
  it("TTL 0 disattiva la cache", async () => {
    const { chiama, chiamate } = conta();
    const c = conCache({ ttlMs: 0 }, (n: number) => String(n), chiama);
    await c(1);
    await c(1);
    expect(chiamate()).toBe(2);
  });
  it("un errore non resta in cache: la richiesta successiva riprova", async () => {
    let n = 0;
    const c = conCache({ ttlMs: 1000, adesso: () => 0 }, () => "k", async (): Promise<RisultatoServizio<string>> =>
      n++ === 0 ? { disponibile: false, origine: "reale", motivo: "rete", messaggio: "x" } : { disponibile: true, dati: "ok", origine: "reale", dallaCache: false },
    );
    expect((await c()).disponibile).toBe(false);
    expect((await c()).disponibile).toBe(true);
    expect(n).toBe(2);
  });
  it("richieste uguali contemporanee condividono la stessa chiamata", async () => {
    const { chiama, chiamate } = conta();
    const c = conCache({ ttlMs: 1000, adesso: () => 0 }, (n: number) => String(n), chiama);
    await Promise.all([c(1), c(1), c(1)]);
    expect(chiamate()).toBe(1);
  });
  it("tiene al massimo il numero di voci indicato", async () => {
    const { chiama, chiamate } = conta();
    const c = conCache({ ttlMs: 1000, adesso: () => 0, massimoVoci: 2 }, (n: number) => String(n), chiama);
    await c(1); await c(2); await c(3);
    await c(1);
    expect(chiamate()).toBe(4);
  });
});
