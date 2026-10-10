/**
 * Configurazione dei servizi esterni (REQ-INTEG-001, CA-2 e CA-3): tutto viene da variabili d'ambiente, con i
 * predefiniti qui sotto. Niente è scritto altrove: URL, tempi massimi e durate della cache si cambiano da fuori.
 *
 * | Variabile                      | Predefinito                                      | Significato                              |
 * | ------------------------------ | ------------------------------------------------ | ---------------------------------------- |
 * | TRAVELOPS_METEO                | finto                                            | `finto` o `reale` (Open-Meteo)           |
 * | TRAVELOPS_PERCORSI             | finto                                            | `finto` o `reale` (OSRM)                 |
 * | TRAVELOPS_GEOCODING            | come TRAVELOPS_PERCORSI                          | `finto` o `reale` (Nominatim)            |
 * | TRAVELOPS_VOLI                 | finto                                            | `finto` o `reale` (provider da iniettare)|
 * | TRAVELOPS_EVENTI               | finto                                            | `finto` o `reale` (provider da iniettare)|
 * | TRAVELOPS_SERVIZI_TIMEOUT_MS   | 8000                                             | tempo massimo di una chiamata            |
 * | TRAVELOPS_METEO_TTL_S          | 3600                                             | validità della cache del meteo           |
 * | TRAVELOPS_PERCORSI_TTL_S       | 86400                                            | validità della cache dei percorsi        |
 * | TRAVELOPS_GEOCODING_TTL_S      | 86400                                            | validità della cache del geocoding       |
 * | TRAVELOPS_VOLI_TTL_S           | 900                                              | validità della cache dei voli            |
 * | TRAVELOPS_EVENTI_TTL_S         | 3600                                             | validità della cache degli eventi        |
 * | TRAVELOPS_METEO_URL            | https://api.open-meteo.com/v1/forecast           | endpoint della previsione                |
 * | TRAVELOPS_OSRM_AUTO_URL        | https://router.project-osrm.org/table/v1/driving/| endpoint OSRM in auto                    |
 * | TRAVELOPS_OSRM_PIEDI_URL       | https://routing.openstreetmap.de/routed-foot/table/v1/driving/ | endpoint OSRM a piedi      |
 * | TRAVELOPS_USER_AGENT           | TravelOps/0.1                                    | User-Agent verso Nominatim e OSRM        |
 *
 * Un valore non valido non blocca l'app: si usa il predefinito e il motivo finisce in `avvisi`.
 */
import { MODALITA_SERVIZIO, type ModalitaServizio } from "./risultato.js";

export const SERVIZI_ESTERNI = ["meteo", "percorsi", "geocoding", "voli", "eventi"] as const;
export type ServizioEsterno = (typeof SERVIZI_ESTERNI)[number];

export interface ConfigurazioneServizi {
  modalita: Readonly<Record<ServizioEsterno, ModalitaServizio>>;
  /** Tempo massimo di una chiamata verso un servizio, in millisecondi. */
  timeoutMs: number;
  /** Validità della cache di ogni servizio, in millisecondi (0 la disattiva). */
  ttlMs: Readonly<Record<ServizioEsterno, number>>;
  urlMeteo: string;
  urlOsrmAuto: string;
  urlOsrmPiedi: string;
  userAgent: string;
  /** Valori d'ambiente non validi, già sostituiti dal predefinito. */
  avvisi: readonly string[];
}

export const PREDEFINITI_SERVIZI = {
  modalita: "finto",
  timeoutMs: 8_000,
  ttlSecondi: { meteo: 3_600, percorsi: 86_400, geocoding: 86_400, voli: 900, eventi: 3_600 },
  urlMeteo: "https://api.open-meteo.com/v1/forecast",
  urlOsrmAuto: "https://router.project-osrm.org/table/v1/driving/",
  urlOsrmPiedi: "https://routing.openstreetmap.de/routed-foot/table/v1/driving/",
  userAgent: "TravelOps/0.1",
} as const;

export type Ambiente = Readonly<Record<string, string | undefined>>;

/** Legge la configurazione da un ambiente (di norma `process.env`). */
export function leggiConfigurazioneServizi(env: Ambiente = {}): ConfigurazioneServizi {
  const avvisi: string[] = [];
  const testo = (nome: string): string | undefined => {
    const v = env[nome]?.trim();
    return v === undefined || v === "" ? undefined : v;
  };
  const modalita = (nome: string, predefinita: ModalitaServizio): ModalitaServizio => {
    const v = testo(nome)?.toLowerCase();
    if (v === undefined) return predefinita;
    if ((MODALITA_SERVIZIO as readonly string[]).includes(v)) return v as ModalitaServizio;
    avvisi.push(`${nome}="${v}" non è valido (finto o reale): uso "${predefinita}".`);
    return predefinita;
  };
  const intero = (nome: string, predefinito: number, moltiplicatore: number, minimo: number): number => {
    const v = testo(nome);
    if (v === undefined) return predefinito * moltiplicatore;
    const n = Number(v);
    if (Number.isInteger(n) && n >= minimo) return n * moltiplicatore;
    avvisi.push(`${nome}="${v}" non è valido (intero ≥ ${minimo}): uso ${predefinito}.`);
    return predefinito * moltiplicatore;
  };
  const url = (nome: string, predefinito: string): string => {
    const v = testo(nome);
    if (v === undefined) return predefinito;
    try {
      const u = new URL(v);
      if (u.protocol === "http:" || u.protocol === "https:") return v;
    } catch {
      // non è un indirizzo: si segnala sotto
    }
    avvisi.push(`${nome} non è un indirizzo http(s) valido: uso il predefinito.`);
    return predefinito;
  };
  const percorsi = modalita("TRAVELOPS_PERCORSI", PREDEFINITI_SERVIZI.modalita);
  const userAgent = testo("TRAVELOPS_USER_AGENT") ?? PREDEFINITI_SERVIZI.userAgent;
  const agenteValido = /travelops/i.test(userAgent);
  if (!agenteValido) avvisi.push('TRAVELOPS_USER_AGENT deve identificare TravelOps: uso il predefinito.');
  const ttl = PREDEFINITI_SERVIZI.ttlSecondi;
  return {
    modalita: {
      meteo: modalita("TRAVELOPS_METEO", PREDEFINITI_SERVIZI.modalita),
      percorsi,
      geocoding: modalita("TRAVELOPS_GEOCODING", percorsi),
      voli: modalita("TRAVELOPS_VOLI", PREDEFINITI_SERVIZI.modalita),
      eventi: modalita("TRAVELOPS_EVENTI", PREDEFINITI_SERVIZI.modalita),
    },
    timeoutMs: intero("TRAVELOPS_SERVIZI_TIMEOUT_MS", PREDEFINITI_SERVIZI.timeoutMs, 1, 1),
    ttlMs: {
      meteo: intero("TRAVELOPS_METEO_TTL_S", ttl.meteo, 1000, 0),
      percorsi: intero("TRAVELOPS_PERCORSI_TTL_S", ttl.percorsi, 1000, 0),
      geocoding: intero("TRAVELOPS_GEOCODING_TTL_S", ttl.geocoding, 1000, 0),
      voli: intero("TRAVELOPS_VOLI_TTL_S", ttl.voli, 1000, 0),
      eventi: intero("TRAVELOPS_EVENTI_TTL_S", ttl.eventi, 1000, 0),
    },
    urlMeteo: url("TRAVELOPS_METEO_URL", PREDEFINITI_SERVIZI.urlMeteo),
    urlOsrmAuto: url("TRAVELOPS_OSRM_AUTO_URL", PREDEFINITI_SERVIZI.urlOsrmAuto),
    urlOsrmPiedi: url("TRAVELOPS_OSRM_PIEDI_URL", PREDEFINITI_SERVIZI.urlOsrmPiedi),
    userAgent: agenteValido ? userAgent : PREDEFINITI_SERVIZI.userAgent,
    avvisi,
  };
}
