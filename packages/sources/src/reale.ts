/**
 * La sorgente di destinazioni **reale** (REQ-CAT-002, ST-CAT-002): realizza `CreaSorgenteReale`.
 *
 * - Ricerca con Nominatim: al massimo 1 richiesta al secondo (misurata con l'orologio ricevuto, CA-4), risultati
 *   in cache per testo; l'attesa di 300 ms tra una battuta e la ricerca spetta all'interfaccia.
 * - Costruzione con Overpass, Wikipedia e Wikivoyage, Wikimedia Commons e OSRM (`costruzione.ts`).
 * - Una destinazione già costruita (in questa sorgente o tra le `istantaneeNote`) è immediata.
 *
 * La rete passa solo dal `ClienteFonti` ricevuto: nei test è `creaClienteRegistrato` (CA-7).
 */
import { costruisciDaFonti, indirizzo, Ritmo, INTERVALLO_FONTI_MS, type ContestoCostruzione } from "./costruzione.js";
import { riepilogoIstantanea, type AreaDestinazione, type IstantaneaDestinazione, type RiepilogoIstantanea } from "./formato.js";
import { LUNGHEZZA_MINIMA_RICERCA, normalizzaRicerca } from "./registrata.js";
import {
  LIMITE_RICERCA_PREDEFINITO,
  MESSAGGI_AVANZAMENTO,
  PASSI_COSTRUZIONE,
  type CreaSorgenteReale,
  type EsitoCostruzione,
  type OpzioniCostruzione,
  type OpzioniRicerca,
  type OpzioniSorgenteReale,
  type ServizioFonte,
  type SorgenteDestinazioni,
} from "./sorgente.js";

export const NOMINATIM_RICERCA = "https://nominatim.openstreetmap.org/search";
/** Al massimo 1 richiesta al secondo verso Nominatim (regole d'uso). */
export const INTERVALLO_NOMINATIM_MS = 1000;
/** Quanti risultati chiedere a Nominatim: sempre gli stessi, così la cache vale per ogni `limite`. */
const RISULTATI_NOMINATIM = 10;

type Oggetto = Record<string, unknown>;
const eOggetto = (v: unknown): v is Oggetto => typeof v === "object" && v !== null && !Array.isArray(v);

/** Un risultato di Nominatim come area di destinazione; `null` se manca qualcosa. */
export function areaDaNominatim(r: unknown): AreaDestinazione | null {
  if (!eOggetto(r)) return null;
  const tipo = r["osm_type"];
  const id = r["osm_id"];
  const lat = Number(r["lat"]);
  const lon = Number(r["lon"]);
  const descrizione = typeof r["display_name"] === "string" ? r["display_name"].trim() : "";
  if ((tipo !== "node" && tipo !== "way" && tipo !== "relation") || typeof id !== "number" || !Number.isFinite(lat) || !Number.isFinite(lon) || descrizione === "") {
    return null;
  }
  const nome = typeof r["name"] === "string" && r["name"].trim() !== "" ? r["name"].trim() : (descrizione.split(",")[0] ?? descrizione).trim();
  return {
    id: `osm:${tipo}/${id}`,
    nome,
    descrizione,
    centro: { lat: Number(lat.toFixed(5)), lon: Number(lon.toFixed(5)) },
    osmId: `${tipo}/${id}`,
  };
}

/** La richiesta a Nominatim per un testo, in forma canonica. */
export function richiestaNominatim(testo: string): { servizio: "nominatim"; url: string } {
  return {
    servizio: "nominatim",
    url: indirizzo(NOMINATIM_RICERCA, {
      "accept-language": "it",
      format: "jsonv2",
      limit: String(RISULTATI_NOMINATIM),
      q: testo.replace(/\s+/g, " ").trim(),
    }),
  };
}

export const creaSorgenteReale: CreaSorgenteReale = (opzioni: OpzioniSorgenteReale): SorgenteDestinazioni => {
  if (!/travelops/i.test(opzioni.userAgent)) throw new Error("lo User-Agent della sorgente reale deve identificare TravelOps");
  const { cliente, orologio } = opzioni;
  const ritmi = new Map<ServizioFonte, Ritmo>();
  const ritmo = (servizio: ServizioFonte): Ritmo => {
    let r = ritmi.get(servizio);
    if (r === undefined) {
      r = new Ritmo(orologio, servizio === "nominatim" ? INTERVALLO_NOMINATIM_MS : INTERVALLO_FONTI_MS);
      ritmi.set(servizio, r);
    }
    return r;
  };
  const ricerche = new Map<string, AreaDestinazione[]>();
  const costruite = new Map<string, IstantaneaDestinazione>();
  const perArea = new Map<string, string>();
  const ctx: ContestoCostruzione = { cliente, ritmo, dataCreazione: opzioni.dataCreazione };

  const nota = (areaId: string): IstantaneaDestinazione | null => {
    const id = perArea.get(areaId);
    const qui = id === undefined ? undefined : costruite.get(id);
    return qui ?? opzioni.istantaneeNote?.(areaId) ?? null;
  };

  return {
    tipo: "reale",

    async cercaDestinazioni(testo: string, opzioniRicerca: OpzioniRicerca = {}): Promise<AreaDestinazione[]> {
      const { segnale } = opzioniRicerca;
      segnale?.throwIfAborted();
      const limite = opzioniRicerca.limite ?? LIMITE_RICERCA_PREDEFINITO;
      const chiave = normalizzaRicerca(testo);
      if (chiave.length < LUNGHEZZA_MINIMA_RICERCA || limite <= 0) return [];
      let risultati = ricerche.get(chiave);
      if (risultati === undefined) {
        await ritmo("nominatim").turno();
        segnale?.throwIfAborted();
        const risposta = await cliente.richiedi(richiestaNominatim(testo), segnale !== undefined ? { segnale } : {});
        if (risposta.stato !== 200 || !Array.isArray(risposta.corpo)) return [];
        const visti = new Set<string>();
        risultati = risposta.corpo
          .map(areaDaNominatim)
          .filter((a): a is AreaDestinazione => a !== null)
          .filter((a) => !visti.has(a.id) && visti.add(a.id) !== undefined);
        ricerche.set(chiave, risultati);
      }
      return structuredClone(risultati.slice(0, limite));
    },

    async costruisciIstantanea(area: AreaDestinazione, opzioniCostruzione: OpzioniCostruzione = {}): Promise<EsitoCostruzione> {
      opzioniCostruzione.segnale?.throwIfAborted();
      const gia = nota(area.id);
      if (gia !== null) {
        // Dopo la prima volta la destinazione è immediata: i passi si segnalano tutti, subito.
        PASSI_COSTRUZIONE.forEach((passo, i) =>
          opzioniCostruzione.avanzamento?.({ passo, messaggio: MESSAGGI_AVANZAMENTO[passo], numero: i + 1, totale: PASSI_COSTRUZIONE.length }),
        );
        return { ok: true, istantanea: structuredClone(gia) };
      }
      const esito = await costruisciDaFonti(ctx, area, opzioniCostruzione);
      if (esito.ok) {
        costruite.set(esito.istantanea.id, structuredClone(esito.istantanea));
        perArea.set(area.id, esito.istantanea.id);
      }
      return esito;
    },

    async leggiIstantanea(id: string): Promise<IstantaneaDestinazione | null> {
      const trovata = costruite.get(id);
      return trovata === undefined ? null : structuredClone(trovata);
    },

    async elencaIstantanee(): Promise<RiepilogoIstantanea[]> {
      return [...costruite.values()]
        .map((i) => structuredClone(riepilogoIstantanea(i)))
        .sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
    },
  };
};
