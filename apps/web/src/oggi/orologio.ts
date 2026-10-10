/**
 * L'orologio di un viaggio (REQ-UX-003, CA-3): il momento che Oggi/Adesso, gli imprevisti e gli agenti usano per quel
 * viaggio, coerente con le sue date.
 *
 * - I viaggi della modalità presentazione (la versione 1 e le varianti, usati dagli scenari S1–S8) seguono sempre
 *   l'orologio simulato della pagina Demo, come prima: la Demo non cambia.
 * - Gli altri viaggi (creati dalla chat o dai filtri, e i viaggi demo del prodotto) usano l'orologio simulato
 *   **relativo all'inizio del viaggio**: lo stesso giorno del viaggio e la stessa ora dell'orologio della Demo. Con
 *   l'orologio della Demo al primo giorno alle 08:00, un viaggio dal 3 al 6 ottobre è al 3 ottobre alle 08:00; spostando
 *   l'orologio della Demo al secondo giorno, anche quel viaggio passa al suo secondo giorno.
 * - Un viaggio dell'utente (non demo) usa invece l'ora reale quando oggi cade nelle sue date (modo `automatico`, il
 *   predefinito), oppure sempre (modo `reale`). I viaggi demo restano simulati, così la presentazione è ripetibile.
 *
 * Configurazione (variabili d'ambiente, documentate in `apps/web/.env.example`):
 * - `TRAVELOPS_OROLOGIO`: `automatico` (predefinito), `simulato` (mai l'ora reale) o `reale`;
 * - `TRAVELOPS_FUSO_ORARIO`: il fuso dell'ora reale (predefinito `Europe/Rome`).
 *
 * Qui non c'è nessuna regola del motore: si sceglie solo il momento da passargli.
 */
import type { Momento } from "@travelops/engine";
import { giorniTra } from "./tempo";

export const MODI_OROLOGIO = ["automatico", "simulato", "reale"] as const;
export type ModoOrologio = (typeof MODI_OROLOGIO)[number];

/** La variabile d'ambiente che sceglie il modo dell'orologio. */
export const VARIABILE_OROLOGIO = "TRAVELOPS_OROLOGIO";
export const MODO_PREDEFINITO: ModoOrologio = "automatico";
export const FUSO_PREDEFINITO = "Europe/Rome";

export interface ConfigurazioneOrologio {
  modo: ModoOrologio;
  fuso: string;
}

type Ambiente = Readonly<Record<string, string | undefined>>;

function fusoValido(fuso: string): boolean {
  try {
    new Intl.DateTimeFormat("it-IT", { timeZone: fuso });
    return true;
  } catch {
    return false;
  }
}

/** La configurazione dell'orologio dalle variabili d'ambiente; un valore mancante o non valido dà il predefinito. */
export function configurazioneOrologio(ambiente: Ambiente = process.env): ConfigurazioneOrologio {
  const modo = ambiente[VARIABILE_OROLOGIO]?.trim().toLowerCase();
  const fuso = ambiente.TRAVELOPS_FUSO_ORARIO?.trim();
  return {
    modo: (MODI_OROLOGIO as readonly string[]).includes(modo ?? "") ? (modo as ModoOrologio) : MODO_PREDEFINITO,
    fuso: fuso !== undefined && fuso !== "" && fusoValido(fuso) ? fuso : FUSO_PREDEFINITO,
  };
}

/** L'istante `adesso` come data e ora nel fuso indicato. */
export function momentoReale(adesso: Date, fuso: string = FUSO_PREDEFINITO): Momento {
  const parti = new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(adesso);
  const parte = (tipo: string): string => parti.find((p) => p.type === tipo)?.value ?? "00";
  return { data: `${parte("year")}-${parte("month")}-${parte("day")}`, ora: `${parte("hour")}:${parte("minute")}` };
}

/** La data `AAAA-MM-GG` spostata di `giorni` giorni di calendario. */
export function aggiungiGiorni(data: string, giorni: number): string {
  const [anno, mese, giorno] = data.split("-").map(Number);
  const spostata = new Date(Date.UTC(anno ?? 0, (mese ?? 1) - 1, (giorno ?? 1) + giorni));
  return spostata.toISOString().slice(0, 10);
}

/** Da dove viene il momento scelto. */
export type OrigineMomento = "presentazione" | "simulato" | "reale";

export interface MomentoDelViaggio {
  momento: Momento;
  origine: OrigineMomento;
}

export interface DatiOrologio {
  /** Primo e ultimo giorno del viaggio (`AAAA-MM-GG`). */
  inizio: string;
  fine: string;
  /** Vero per i viaggi della modalità presentazione (versione 1 e varianti): seguono l'orologio della Demo. */
  presentazione: boolean;
  /** Vero per i viaggi demo: mai l'ora reale. */
  demo: boolean;
  /** L'orologio simulato della pagina Demo. */
  orologioDemo: Momento;
  /** Il primo giorno del viaggio della modalità presentazione: l'orologio della Demo si misura da qui. */
  inizioDemo: string;
  configurazione: ConfigurazioneOrologio;
  /** L'istante reale (iniettabile nei test). */
  adesso: Date;
}

/** Il momento del viaggio secondo le regole descritte in testa al file. */
export function momentoDelViaggio(dati: DatiOrologio): MomentoDelViaggio {
  if (dati.presentazione) return { momento: { ...dati.orologioDemo }, origine: "presentazione" };
  const { modo, fuso } = dati.configurazione;
  if (!dati.demo && modo !== "simulato") {
    const reale = momentoReale(dati.adesso, fuso);
    const nelViaggio = reale.data >= dati.inizio && reale.data <= dati.fine;
    if (modo === "reale" || nelViaggio) return { momento: reale, origine: "reale" };
  }
  const scarto = giorniTra(dati.inizioDemo, dati.orologioDemo.data);
  return { momento: { data: aggiungiGiorni(dati.inizio, scarto), ora: dati.orologioDemo.ora }, origine: "simulato" };
}
