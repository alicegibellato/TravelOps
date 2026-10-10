/**
 * Composizione dei servizi esterni: dalla configurazione agli adattatori, con la cache di ogni servizio.
 * È l'unico punto che sceglie fra finto e reale (REQ-INTEG-001, CA-2).
 */
import { creaClienteHttp } from "../cliente-http.js";
import type { IstantaneaDestinazione } from "../formato.js";
import { creaSorgenteReale } from "../reale.js";
import type { ClienteFonti, Orologio, SorgenteDestinazioni } from "../sorgente.js";
import { conCache } from "./cache.js";
import type { ConfigurazioneServizi } from "./configurazione.js";
import { creaEventiFinto, creaEventiReale, type ProviderEventi, type ServizioEventi } from "./eventi.js";
import { creaMeteoFinto, creaMeteoOpenMeteo, type FetchServizio, type ServizioMeteo } from "./meteo.js";
import {
  creaGeocodingFinto,
  creaGeocodingNominatim,
  creaPercorsiFinto,
  creaPercorsiOsrm,
  type ServizioGeocoding,
  type ServizioPercorsi,
} from "./percorsi.js";
import { creaVoliFinto, creaVoliReale, type ProviderVoli, type ServizioVoli } from "./voli.js";

export interface ServiziEsterni {
  meteo: ServizioMeteo;
  geocoding: ServizioGeocoding;
  percorsi: ServizioPercorsi;
  voli: ServizioVoli;
  eventi: ServizioEventi;
  configurazione: ConfigurazioneServizi;
}

/** Quello che si può sostituire dall'esterno (nei test, o per collegare un fornitore reale di voli ed eventi). */
export interface DipendenzeServizi {
  fetch?: FetchServizio;
  cliente?: ClienteFonti;
  orologio?: Orologio;
  /** Millisecondi correnti per la cache. */
  adesso?: () => number;
  /** Le istantanee su cui lavorano gli adattatori finti di geocoding e percorsi. */
  istantanee?: readonly IstantaneaDestinazione[];
  providerVoli?: ProviderVoli;
  providerEventi?: ProviderEventi;
}

/** L'orologio di sistema (i test ne passano uno finto). */
export const orologioDiSistema: Orologio = {
  adesso: () => Date.now(),
  attendi: (ms) => new Promise((risolvi) => setTimeout(risolvi, ms)),
};

const chiaveCoordinate = (c: { lat: number; lon: number }): string => `${c.lat.toFixed(4)},${c.lon.toFixed(4)}`;

export function creaServizi(configurazione: ConfigurazioneServizi, dipendenze: DipendenzeServizi = {}): ServiziEsterni {
  const { modalita, timeoutMs, ttlMs } = configurazione;
  const adesso = dipendenze.adesso;
  const cache = (ttl: number) => ({ ttlMs: ttl, ...(adesso === undefined ? {} : { adesso }) });
  const istantanee = dipendenze.istantanee ?? [];
  let clienteCreato: ClienteFonti | undefined = dipendenze.cliente;
  const cliente = (): ClienteFonti => (clienteCreato ??= creaClienteHttp({ userAgent: configurazione.userAgent, timeoutMs }));
  const orologio = dipendenze.orologio ?? orologioDiSistema;

  const meteoBase: ServizioMeteo =
    modalita.meteo === "reale"
      ? creaMeteoOpenMeteo({ url: configurazione.urlMeteo, timeoutMs, fetch: dipendenze.fetch ?? (globalThis.fetch as FetchServizio), userAgent: configurazione.userAgent })
      : creaMeteoFinto();
  const previsioneConCache = conCache(
    cache(ttlMs.meteo),
    (r: Parameters<ServizioMeteo["previsione"]>[0]) => `${chiaveCoordinate(r.coordinate)}|${r.dataInizio}|${r.dataFine}`,
    (r) => meteoBase.previsione(r),
  );
  const meteo: ServizioMeteo = { modalita: meteoBase.modalita, previsione: previsioneConCache };

  const geocodingBase: ServizioGeocoding =
    modalita.geocoding === "reale"
      ? creaGeocodingNominatim({ cliente: cliente(), userAgent: configurazione.userAgent, orologio, timeoutMs })
      : creaGeocodingFinto({ istantanee, timeoutMs });
  const cercaConCache = conCache(
    cache(ttlMs.geocoding),
    (testo: string, o?: { limite?: number }) => `${testo.trim().toLowerCase()}|${o?.limite ?? ""}`,
    (testo, o) => geocodingBase.cerca(testo, o),
  );
  const geocoding: ServizioGeocoding = { modalita: geocodingBase.modalita, cerca: (testo, o) => cercaConCache(testo, o) };

  const percorsiBase: ServizioPercorsi =
    modalita.percorsi === "reale"
      ? creaPercorsiOsrm({ cliente: cliente(), urlAuto: configurazione.urlOsrmAuto, urlPiedi: configurazione.urlOsrmPiedi, timeoutMs })
      : creaPercorsiFinto({ istantanee });
  const percorsi: ServizioPercorsi = {
    modalita: percorsiBase.modalita,
    calcola: conCache(
      cache(ttlMs.percorsi),
      (r: Parameters<ServizioPercorsi["calcola"]>[0]) => `${chiaveCoordinate(r.da)}|${chiaveCoordinate(r.a)}|${r.mezzo}`,
      (r) => percorsiBase.calcola(r),
    ),
  };

  const voliBase: ServizioVoli =
    modalita.voli === "reale" ? creaVoliReale({ provider: dipendenze.providerVoli, timeoutMs }) : creaVoliFinto({ timeoutMs });
  const voli: ServizioVoli = {
    modalita: voliBase.modalita,
    cerca: conCache(
      cache(ttlMs.voli),
      (r: Parameters<ServizioVoli["cerca"]>[0]) => `${r.origine}|${r.destinazione}|${r.data}|${r.passeggeri ?? 1}`,
      (r) => voliBase.cerca(r),
    ),
  };

  const eventiBase: ServizioEventi =
    modalita.eventi === "reale" ? creaEventiReale({ provider: dipendenze.providerEventi, timeoutMs }) : creaEventiFinto({ timeoutMs });
  const eventi: ServizioEventi = {
    modalita: eventiBase.modalita,
    cerca: conCache(
      cache(ttlMs.eventi),
      (r: Parameters<ServizioEventi["cerca"]>[0]) => `${chiaveCoordinate(r.coordinate)}|${r.dataInizio}|${r.dataFine}|${r.raggioKm ?? ""}`,
      (r) => eventiBase.cerca(r),
    ),
  };

  return { meteo, geocoding, percorsi, voli, eventi, configurazione };
}

/**
 * La sorgente di destinazioni reale (Nominatim, Overpass, Wikipedia, Commons, OSRM) con il cliente HTTP, l'orologio e la data
 * di sistema: la scelta della web app quando `TRAVELOPS_GEOCODING=reale`. Una per processo: tiene il ritmo verso Nominatim.
 */
export function creaSorgenteDestinazioniReale(opzioni: {
  userAgent: string;
  istantaneeNote?: (areaId: string) => IstantaneaDestinazione | null;
}): SorgenteDestinazioni {
  return creaSorgenteReale({
    cliente: creaClienteHttp({ userAgent: opzioni.userAgent }),
    userAgent: opzioni.userAgent,
    orologio: orologioDiSistema,
    dataCreazione: () => new Date().toISOString().slice(0, 10),
    ...(opzioni.istantaneeNote === undefined ? {} : { istantaneeNote: opzioni.istantaneeNote }),
  });
}
