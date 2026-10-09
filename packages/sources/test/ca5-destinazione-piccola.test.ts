/**
 * CA-5: una destinazione con pochi luoghi dà un messaggio gentile con 2 o 3 destinazioni vicine più grandi.
 * Le risposte di Overpass sono DATI DI TEST scritti qui (un borgo inventato), servite da un cliente finto: nessuna rete.
 */
import { describe, expect, it } from "vitest";
import {
  creaSorgenteReale,
  queryLocalitaVicine,
  queryOverpass,
  SERVER_OVERPASS,
  type AreaDestinazione,
  type Avanzamento,
  type ClienteFonti,
  type Orologio,
  type RichiestaFonte,
  type RispostaFonte,
} from "../src/index.js";

const AREA: AreaDestinazione = {
  id: "osm:node/900000123",
  nome: "Borgo Piccolo",
  descrizione: "Borgo Piccolo, borgo inventato (DATO DI TEST)",
  centro: { lat: 46.0, lon: 11.0 },
  osmId: "node/900000123",
};

const orologio: Orologio = { adesso: () => 0, attendi: async () => undefined };

const LUOGHI_DEL_BORGO = {
  elements: [
    { type: "node", id: 900001, lat: 46.001, lon: 11.001, tags: { tourism: "museum", name: "Museo del borgo" } },
    { type: "node", id: 900002, lat: 46.002, lon: 11.002, tags: { tourism: "viewpoint", name: "Belvedere" } },
    { type: "node", id: 900003, lat: 46.003, lon: 11.003, tags: { amenity: "restaurant", name: "Trattoria unica" } },
    { type: "node", id: 900004, lat: 46.004, lon: 11.004, tags: { tourism: "hotel", name: "Albergo del borgo", stars: "3" } },
  ],
};

const LOCALITA_VICINE = {
  elements: [
    { type: "node", id: 910001, lat: 46.1, lon: 11.1, tags: { place: "town", name: "Cittadina Media", population: "12000" } },
    { type: "node", id: 910002, lat: 46.2, lon: 11.0, tags: { place: "city", name: "Città Grande", population: "110000" } },
    { type: "node", id: 910003, lat: 45.9, lon: 10.9, tags: { place: "town", name: "Paese Vicino", population: "5000" } },
    { type: "node", id: 910004, lat: 45.95, lon: 11.2, tags: { place: "town", name: "Altra Cittadina", population: "20000" } },
    { type: "node", id: 910005, lat: 46.0, lon: 11.0, tags: { place: "town", name: "Borgo Piccolo", population: "900" } },
  ],
};

/** Un cliente finto: risponde solo alle due query Overpass del borgo e annota tutte le richieste. */
function cliente(risposte: Map<string, RispostaFonte>): ClienteFonti & { richieste: RichiestaFonte[] } {
  const richieste: RichiestaFonte[] = [];
  return {
    richieste,
    async richiedi(richiesta) {
      richieste.push(richiesta);
      const risposta = risposte.get(`${richiesta.url}\n${richiesta.corpo ?? ""}`);
      if (risposta === undefined) throw new Error(`richiesta inattesa ${richiesta.servizio} ${richiesta.url}`);
      return structuredClone(risposta);
    },
  };
}

const chiave = (url: string, corpo: string): string => `${url}\n${corpo}`;

describe("CA-5 destinazione con pochi luoghi", () => {
  it("CA-5 messaggio gentile con 2–3 destinazioni vicine più grandi, senza chiedere descrizioni, immagini e percorsi", async () => {
    const c = cliente(
      new Map([
        [chiave(SERVER_OVERPASS[0], queryOverpass(AREA.centro)), { stato: 200, corpo: LUOGHI_DEL_BORGO }],
        [chiave(SERVER_OVERPASS[0], queryLocalitaVicine(AREA.centro)), { stato: 200, corpo: LOCALITA_VICINE }],
      ]),
    );
    const sorgente = creaSorgenteReale({ cliente: c, userAgent: "TravelOps/0.1 (test)", orologio, dataCreazione: () => "2026-10-09" });
    const passi: Avanzamento[] = [];
    const esito = await sorgente.costruisciIstantanea(AREA, { avanzamento: (a) => passi.push(a) });

    expect(esito.ok).toBe(false);
    if (esito.ok || esito.motivo !== "minimi_non_rispettati") throw new Error("atteso minimi_non_rispettati");
    // Le 3 località più grandi (non il borgo stesso), dalla più vicina.
    expect(esito.alternative.map((a) => a.nome)).toEqual(["Cittadina Media", "Altra Cittadina", "Città Grande"]);
    expect(esito.alternative.length).toBeGreaterThanOrEqual(2);
    expect(esito.alternative.length).toBeLessThanOrEqual(3);
    expect(esito.alternative[0]).toMatchObject({ id: "osm:node/910001", osmId: "node/910001", centro: { lat: 46.1, lon: 11.1 } });
    expect(esito.messaggio).toBe(
      "Mi dispiace, per Borgo Piccolo ho trovato troppo pochi luoghi per un itinerario completo (poche cose da fare, pochi ristoranti, pochi alloggi, servizi essenziali lontani, nessuna stazione o aeroporto vicino). " +
        "Ti propongo Cittadina Media, Altra Cittadina o Città Grande: sono vicine e hanno più cose da fare.",
    );
    expect(esito.mancanze.map((m) => m.codice)).toContain("ATTIVITA_INSUFFICIENTI");
    expect(esito.mancanze.map((m) => m.codice)).not.toContain("STILE_INSUFFICIENTE");
    // Solo Overpass: una destinazione troppo piccola non consuma Wikipedia, Commons e OSRM.
    expect(c.richieste.map((r) => r.servizio)).toEqual(["overpass", "overpass"]);
    expect(passi.map((p) => p.passo)).toEqual(["luoghi", "classificazione", "ristoranti", "minimi"]);
    // Una destinazione non costruita non diventa nota.
    expect(await sorgente.elencaIstantanee()).toEqual([]);
  });

  it("CA-5 se Overpass non risponde (tutti i server), la destinazione non è disponibile con un messaggio per il viaggiatore", async () => {
    const c = cliente(new Map());
    const sorgente = creaSorgenteReale({ cliente: c, userAgent: "TravelOps/0.1 (test)", orologio, dataCreazione: () => "2026-10-09" });
    const esito = await sorgente.costruisciIstantanea(AREA);
    expect(esito).toEqual({
      ok: false,
      motivo: "non_disponibile",
      messaggio: "Non riesco a raggiungere OpenStreetMap in questo momento, quindi non posso preparare Borgo Piccolo. Riprova tra qualche minuto.",
    });
    expect(c.richieste.map((r) => r.url)).toEqual([...SERVER_OVERPASS]);
  });
});
