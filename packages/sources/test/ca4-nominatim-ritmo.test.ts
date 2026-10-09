/**
 * CA-4: verso Nominatim al massimo 1 richiesta al secondo, verificato con un orologio finto; User-Agent che
 * identifica TravelOps; risultati in cache (una ricerca già fatta non torna da Nominatim). Nessuna rete: il cliente
 * è finto e `fetch` è sostituito.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  creaClienteHttp,
  creaSorgenteReale,
  INTERVALLO_NOMINATIM_MS,
  richiestaNominatim,
  type ClienteFonti,
  type Orologio,
  type RichiestaFonte,
} from "../src/index.js";

const UA = "TravelOps/0.1 (test)";

/** Un orologio finto: il tempo avanza solo quando qualcuno attende. */
function orologioFinto(): Orologio & { attese: number[] } {
  let t = 5_000;
  const attese: number[] = [];
  return {
    attese,
    adesso: () => t,
    attendi: async (ms) => {
      attese.push(ms);
      t += ms;
    },
  };
}

/** Un cliente finto che annota l'istante di ogni richiesta e risponde con un risultato di Nominatim. */
function clienteFinto(orologio: Orologio): ClienteFonti & { chiamate: { istante: number; richiesta: RichiestaFonte }[] } {
  const chiamate: { istante: number; richiesta: RichiestaFonte }[] = [];
  return {
    chiamate,
    async richiedi(richiesta) {
      chiamate.push({ istante: orologio.adesso(), richiesta });
      const q = new URL(richiesta.url).searchParams.get("q") ?? "";
      return {
        stato: 200,
        corpo: [{ osm_type: "relation", osm_id: 100 + chiamate.length, lat: "45.1", lon: "10.1", name: q, display_name: `${q}, Italia` }],
      };
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CA-4 limite di 1 richiesta al secondo verso Nominatim", () => {
  it("CA-4 ricerche ravvicinate (anche in parallelo) partono ad almeno 1000 ms l'una dall'altra", async () => {
    const orologio = orologioFinto();
    const cliente = clienteFinto(orologio);
    const sorgente = creaSorgenteReale({ cliente, userAgent: UA, orologio, dataCreazione: () => "2026-10-09" });
    await sorgente.cercaDestinazioni("Ri");
    await sorgente.cercaDestinazioni("Riv");
    await Promise.all([sorgente.cercaDestinazioni("Riva"), sorgente.cercaDestinazioni("Riva d"), sorgente.cercaDestinazioni("Riva de")]);
    expect(cliente.chiamate.map((c) => c.richiesta.servizio)).toEqual(["nominatim", "nominatim", "nominatim", "nominatim", "nominatim"]);
    const istanti = cliente.chiamate.map((c) => c.istante);
    for (let i = 1; i < istanti.length; i++) expect((istanti[i] ?? 0) - (istanti[i - 1] ?? 0)).toBeGreaterThanOrEqual(INTERVALLO_NOMINATIM_MS);
    // La prima parte subito; le altre aspettano il loro turno, senza attese inutili.
    expect(istanti[0]).toBe(5_000);
    expect(istanti[4]).toBe(5_000 + 4 * INTERVALLO_NOMINATIM_MS);
    expect(orologio.attese.every((ms) => ms > 0 && ms <= INTERVALLO_NOMINATIM_MS)).toBe(true);
  });

  it("CA-4 dopo una pausa più lunga di un secondo non si aspetta", async () => {
    const orologio = orologioFinto();
    const cliente = clienteFinto(orologio);
    const sorgente = creaSorgenteReale({ cliente, userAgent: UA, orologio, dataCreazione: () => "2026-10-09" });
    await sorgente.cercaDestinazioni("Roma");
    await orologio.attendi(1500);
    const prima = orologio.attese.length;
    await sorgente.cercaDestinazioni("Lisbona");
    expect(orologio.attese.length).toBe(prima);
  });

  it("CA-4 i risultati vanno in cache: la stessa ricerca (stesso testo normalizzato) non torna da Nominatim", async () => {
    const orologio = orologioFinto();
    const cliente = clienteFinto(orologio);
    const sorgente = creaSorgenteReale({ cliente, userAgent: UA, orologio, dataCreazione: () => "2026-10-09" });
    const prima = await sorgente.cercaDestinazioni("Città di Prova");
    const seconda = await sorgente.cercaDestinazioni("  citta   di prova ");
    expect(seconda).toEqual(prima);
    expect(cliente.chiamate).toHaveLength(1);
    expect(await sorgente.cercaDestinazioni("R")).toEqual([]);
    expect(cliente.chiamate).toHaveLength(1);
    expect(prima[0]).toMatchObject({ id: "osm:relation/101", nome: "Città di Prova", centro: { lat: 45.1, lon: 10.1 }, osmId: "relation/101" });
  });

  it("CA-4 la richiesta a Nominatim è in forma canonica, in italiano, con un numero fisso di risultati", () => {
    expect(richiestaNominatim(" Riva  del Garda ")).toEqual({
      servizio: "nominatim",
      url: "https://nominatim.openstreetmap.org/search?accept-language=it&format=jsonv2&limit=10&q=Riva%20del%20Garda",
    });
  });

  it("CA-4 lo User-Agent deve identificare TravelOps, e il cliente HTTP lo manda a ogni richiesta e tiene la cache", async () => {
    const orologio = orologioFinto();
    expect(() => creaSorgenteReale({ cliente: clienteFinto(orologio), userAgent: "Mozilla/5.0", orologio, dataCreazione: () => "2026-10-09" })).toThrow(
      "TravelOps",
    );
    expect(() => creaClienteHttp({ userAgent: "curl/8" })).toThrow("TravelOps");

    const viste: { url: string; ua: string | null }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      viste.push({ url, ua: new Headers(init.headers).get("User-Agent") });
      return new Response(JSON.stringify([]), { status: 200 });
    });
    const cliente = creaClienteHttp({ userAgent: UA });
    const richiesta = richiestaNominatim("Roma");
    expect(await cliente.richiedi(richiesta)).toEqual({ stato: 200, corpo: [] });
    expect(await cliente.richiedi(richiesta)).toEqual({ stato: 200, corpo: [] });
    expect(viste).toEqual([{ url: richiesta.url, ua: UA }]);
  });
});
