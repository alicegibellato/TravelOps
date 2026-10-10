/**
 * Porta Meteo (REQ-INTEG-001, CA-1): previsione giornaliera e oraria per un punto e un intervallo di date.
 *
 * - `ServizioMeteo`: la porta, indipendente dal fornitore. Le condizioni sono quelle del dominio (`CondizioneMeteo`).
 * - `creaMeteoOpenMeteo`: adattatore per Open-Meteo (API pubblica, senza chiave). Mappa i codici WMO sulle condizioni
 *   del dominio; nessun dato personale viaggia verso il servizio, solo coordinate e date.
 * - `creaMeteoFinto`: adattatore deterministico, senza rete, per test, e2e e sviluppo.
 */
import type { CondizioneMeteo, Coordinate, PrevisioneMeteo } from "@travelops/engine";
import { indirizzo } from "../costruzione.js";
import { ErroreServizio, conLimiteDiTempo, disponibile, type RisultatoServizio } from "./risultato.js";

export interface RichiestaMeteo {
  coordinate: Coordinate;
  /** `AAAA-MM-GG`, inclusa. */
  dataInizio: string;
  /** `AAAA-MM-GG`, inclusa. */
  dataFine: string;
  segnale?: AbortSignal;
}

/** Una fascia della giornata con la stessa condizione (orari locali del luogo, `HH:MM`; la fine può essere `24:00`). */
export interface FasciaMeteo {
  inizio: string;
  fine: string;
  condizione: CondizioneMeteo;
}

export interface PrevisioneGiorno {
  data: string;
  /** La condizione che riassume il giorno (la più severa). */
  condizione: CondizioneMeteo;
  temperaturaMin: number | null;
  temperaturaMax: number | null;
  /** Probabilità massima di precipitazioni nel giorno, 0–100. */
  probabilitaPrecipitazioni: number | null;
  fasce: FasciaMeteo[];
}

export interface ServizioMeteo {
  readonly modalita: "finto" | "reale";
  previsione(richiesta: RichiestaMeteo): Promise<RisultatoServizio<PrevisioneGiorno[]>>;
}

const GRAVITA: Readonly<Record<CondizioneMeteo, number>> = { sereno: 0, nuvoloso: 1, pioggia: 2, neve: 3, temporale: 4 };

/** La più severa tra le condizioni; `sereno` se non ce ne sono. */
export function condizionePiuSevera(condizioni: readonly CondizioneMeteo[]): CondizioneMeteo {
  return condizioni.reduce<CondizioneMeteo>((m, c) => (GRAVITA[c] > GRAVITA[m] ? c : m), "sereno");
}

/**
 * Codice WMO (come lo usa Open-Meteo) → condizione del dominio; `null` se il codice non è noto.
 * 0–1 sereno · 2–3 e nebbia (45, 48) nuvoloso · 51–67 e 80–82 pioggia (anche pioviggine e pioggia gelata) ·
 * 71–77 e 85–86 neve · 95–99 temporale.
 */
export function condizioneDaCodiceWmo(codice: number): CondizioneMeteo | null {
  if (!Number.isInteger(codice)) return null;
  if (codice === 0 || codice === 1) return "sereno";
  if (codice === 2 || codice === 3 || codice === 45 || codice === 48) return "nuvoloso";
  if ((codice >= 51 && codice <= 57) || (codice >= 61 && codice <= 67) || (codice >= 80 && codice <= 82)) return "pioggia";
  if ((codice >= 71 && codice <= 77) || codice === 85 || codice === 86) return "neve";
  if (codice === 95 || codice === 96 || codice === 99) return "temporale";
  return null;
}

/** Le previsioni di un giorno come `PrevisioneMeteo` del motore, per una zona (solo le fasce non serene). */
export function previsioniDelMotore(zonaId: string, giorni: readonly PrevisioneGiorno[]): PrevisioneMeteo[] {
  return giorni.flatMap((g) =>
    g.fasce.filter((f) => f.condizione !== "sereno").map((f) => ({ zonaId, data: g.data, inizio: f.inizio, fine: f.fine, condizione: f.condizione })),
  );
}

// --- Open-Meteo ---------------------------------------------------------------------------------------

/** La parte di `fetch` che serve agli adattatori: si sostituisce nei test con una funzione che risponde con dati registrati. */
export type FetchServizio = (
  url: string,
  init: { signal: AbortSignal; headers: Record<string, string> },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export interface OpzioniMeteoOpenMeteo {
  url: string;
  timeoutMs: number;
  fetch: FetchServizio;
  userAgent?: string;
}

type Oggetto = Record<string, unknown>;
const eOggetto = (v: unknown): v is Oggetto => typeof v === "object" && v !== null && !Array.isArray(v);
const elencoDi = (v: unknown): unknown[] | null => (Array.isArray(v) ? v : null);
const numeroOppureNull = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const FORMATO_ORA = /^(\d{4}-\d{2}-\d{2})T(\d{2}):\d{2}$/;
const orario = (ora: number): string => `${String(ora).padStart(2, "0")}:00`;

/** Unisce le ore consecutive con la stessa condizione in fasce. */
function fasceDaOre(ore: readonly { ora: number; condizione: CondizioneMeteo }[]): FasciaMeteo[] {
  const fasce: FasciaMeteo[] = [];
  for (const { ora, condizione } of [...ore].sort((a, b) => a.ora - b.ora)) {
    const ultima = fasce.at(-1);
    if (ultima !== undefined && ultima.condizione === condizione && ultima.fine === orario(ora)) ultima.fine = orario(ora + 1);
    else fasce.push({ inizio: orario(ora), fine: orario(ora + 1), condizione });
  }
  return fasce;
}

/** Legge la risposta di Open-Meteo; solleva `ErroreServizio` se non ha la forma attesa. */
export function leggiRispostaOpenMeteo(corpo: unknown): PrevisioneGiorno[] {
  const invalida = (): never => {
    throw new ErroreServizio("risposta_non_valida", "risposta del servizio non riconosciuta");
  };
  if (!eOggetto(corpo)) return invalida();
  const giornaliero = corpo["daily"];
  if (!eOggetto(giornaliero)) return invalida();
  const date = elencoDi(giornaliero["time"]);
  const codici = elencoDi(giornaliero["weather_code"]);
  if (date === null || codici === null || date.length !== codici.length) return invalida();
  const massime = elencoDi(giornaliero["temperature_2m_max"]) ?? [];
  const minime = elencoDi(giornaliero["temperature_2m_min"]) ?? [];
  const probabilita = elencoDi(giornaliero["precipitation_probability_max"]) ?? [];

  const orario_ = eOggetto(corpo["hourly"]) ? corpo["hourly"] : {};
  const tempi = elencoDi(orario_["time"]) ?? [];
  const codiciOrari = elencoDi(orario_["weather_code"]) ?? [];
  const orePerGiorno = new Map<string, { ora: number; condizione: CondizioneMeteo }[]>();
  tempi.forEach((t, i) => {
    const m = typeof t === "string" ? FORMATO_ORA.exec(t) : null;
    const codice = codiciOrari[i];
    const condizione = typeof codice === "number" ? condizioneDaCodiceWmo(codice) : null;
    if (m === null || condizione === null) return;
    const data = m[1] as string;
    const elenco = orePerGiorno.get(data) ?? [];
    elenco.push({ ora: Number(m[2]), condizione });
    orePerGiorno.set(data, elenco);
  });

  const giorni: PrevisioneGiorno[] = [];
  date.forEach((data, i) => {
    const codice = codici[i];
    // Un giorno senza codice (data troppo lontana) non ha previsione: non si inventa.
    if (typeof data !== "string" || typeof codice !== "number") return;
    const condizione = condizioneDaCodiceWmo(codice);
    if (condizione === null) return;
    giorni.push({
      data,
      condizione,
      temperaturaMin: numeroOppureNull(minime[i]),
      temperaturaMax: numeroOppureNull(massime[i]),
      probabilitaPrecipitazioni: numeroOppureNull(probabilita[i]),
      fasce: fasceDaOre(orePerGiorno.get(data) ?? []),
    });
  });
  return giorni;
}

export function creaMeteoOpenMeteo(opzioni: OpzioniMeteoOpenMeteo): ServizioMeteo {
  return {
    modalita: "reale",
    previsione(richiesta) {
      const url = indirizzo(opzioni.url, {
        daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
        end_date: richiesta.dataFine,
        hourly: "weather_code",
        latitude: richiesta.coordinate.lat.toFixed(4),
        longitude: richiesta.coordinate.lon.toFixed(4),
        start_date: richiesta.dataInizio,
        timezone: "auto",
      });
      return conLimiteDiTempo({ origine: "reale", soggetto: "Meteo", timeoutMs: opzioni.timeoutMs, segnale: richiesta.segnale }, async (segnale) => {
        const risposta = await opzioni.fetch(url, {
          signal: segnale,
          headers: { Accept: "application/json", "User-Agent": opzioni.userAgent ?? "TravelOps/0.1" },
        });
        if (risposta.status >= 400 && risposta.status < 500) {
          throw new ErroreServizio("richiesta_rifiutata", "previsione non disponibile per queste date");
        }
        if (!risposta.ok) throw new ErroreServizio("rete", "il servizio non risponde");
        const giorni = leggiRispostaOpenMeteo(await risposta.json());
        if (giorni.length === 0) throw new ErroreServizio("richiesta_rifiutata", "previsione non disponibile per queste date");
        return giorni;
      });
    },
  };
}

// --- Finto -----------------------------------------------------------------------------------------------

export interface OpzioniMeteoFinto {
  /**
   * Condizione di un giorno in un punto; predefinita: una sequenza deterministica fatta solo di sereno e nuvoloso,
   * così i dati finti non fanno scattare avvisi di meteo avverso nei flussi che non li chiedono.
   */
  condizione?: (coordinate: Coordinate, data: string) => CondizioneMeteo;
}

/** Hash 32 bit deterministico (FNV-1a). */
export function hashTesto(testo: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < testo.length; i++) {
    h ^= testo.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const SEQUENZA_FINTA: readonly CondizioneMeteo[] = ["sereno", "sereno", "nuvoloso", "sereno", "nuvoloso"];

const giorniDa = (inizio: string, fine: string): string[] => {
  const data = new Date(`${inizio}T00:00:00Z`);
  const ultima = new Date(`${fine}T00:00:00Z`);
  const elenco: string[] = [];
  while (data <= ultima && elenco.length < 400) {
    elenco.push(data.toISOString().slice(0, 10));
    data.setUTCDate(data.getUTCDate() + 1);
  }
  return elenco;
};

export function creaMeteoFinto(opzioni: OpzioniMeteoFinto = {}): ServizioMeteo {
  const condizioneDi =
    opzioni.condizione ??
    ((c: Coordinate, data: string): CondizioneMeteo => SEQUENZA_FINTA[hashTesto(`${c.lat.toFixed(1)},${c.lon.toFixed(1)},${data}`) % SEQUENZA_FINTA.length] ?? "sereno");
  return {
    modalita: "finto",
    async previsione(richiesta) {
      if (richiesta.segnale?.aborted) {
        return { disponibile: false, origine: "finto", motivo: "annullato", messaggio: "Meteo non disponibile: richiesta annullata" };
      }
      const giorni = giorniDa(richiesta.dataInizio, richiesta.dataFine).map((data): PrevisioneGiorno => {
        const condizione = condizioneDi(richiesta.coordinate, data);
        const base = 14 + (hashTesto(`${richiesta.coordinate.lat.toFixed(1)}${data}`) % 10);
        return {
          data,
          condizione,
          temperaturaMin: base - 6,
          temperaturaMax: base + 4,
          probabilitaPrecipitazioni: GRAVITA[condizione] >= GRAVITA.pioggia ? 80 : condizione === "nuvoloso" ? 20 : 0,
          fasce: [{ inizio: "00:00", fine: "24:00", condizione }],
        };
      });
      return disponibile(giorni, "finto");
    },
  };
}
