/**
 * Sorgente di condizioni finta e deterministica (REQ-MONITOR-001, CA-5): nessuna rete, nessun orologio. Si descrive con
 * uno scenario (meteo per zona e data, eventi) e risponde sempre allo stesso modo; conta le chiamate, così i test
 * verificano cosa è stato chiesto. Serve a test, e2e e sviluppo.
 */
import type { Data } from "../model/index.js";
import type { EventoLocale, FasciaCondizione, RisultatoCondizioni, SorgenteCondizioni } from "./tipi.js";

export interface MeteoFinto {
  zonaId: string;
  data: Data;
  fasce: readonly FasciaCondizione[];
}

export interface ScenarioFinto {
  meteo?: readonly MeteoFinto[];
  eventi?: readonly EventoLocale[];
  /** Quali servizi rispondono «non disponibile». */
  nonDisponibili?: readonly ("meteo" | "eventi")[];
}

export interface SorgenteCondizioniFinta extends SorgenteCondizioni {
  readonly chiamate: { meteo: number; eventi: number };
  /** Cambia lo scenario (per esempio «adesso è arrivata la pioggia»). */
  imposta(scenario: ScenarioFinto): void;
}

export function creaSorgenteCondizioniFinta(iniziale: ScenarioFinto = {}): SorgenteCondizioniFinta {
  let scenario = iniziale;
  const chiamate = { meteo: 0, eventi: 0 };
  const manca = (servizio: "meteo" | "eventi"): RisultatoCondizioni<never> | null =>
    scenario.nonDisponibili?.includes(servizio) === true
      ? { disponibile: false, messaggio: `${servizio === "meteo" ? "Meteo" : "Eventi"} non disponibile: servizio finto spento` }
      : null;
  return {
    chiamate,
    imposta(nuovo) {
      scenario = nuovo;
    },
    async meteo(richiesta) {
      chiamate.meteo += 1;
      const spento = manca("meteo");
      if (spento !== null) return spento;
      const fasce = (scenario.meteo ?? []).filter((m) => m.zonaId === richiesta.zonaId && m.data === richiesta.data).flatMap((m) => m.fasce);
      return { disponibile: true, dati: fasce };
    },
    async eventi(richiesta) {
      chiamate.eventi += 1;
      const spento = manca("eventi");
      if (spento !== null) return spento;
      return { disponibile: true, dati: (scenario.eventi ?? []).filter((e) => e.luogoId === richiesta.luogoId && e.data === richiesta.data) };
    },
  };
}

const CONDIZIONI = ["sereno", "nuvoloso", "pioggia", "temporale", "neve"];
const ORARIO = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

function oggetto(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Legge uno scenario da JSON (per esempio da una variabile d'ambiente di sviluppo); il motivo se non è valido. */
export function leggiScenarioFinto(testo: string): { ok: true; scenario: ScenarioFinto } | { ok: false; motivo: string } {
  let json: unknown;
  try {
    json = JSON.parse(testo);
  } catch {
    return { ok: false, motivo: "non è JSON valido" };
  }
  if (!oggetto(json)) return { ok: false, motivo: "deve essere un oggetto" };
  const meteo = json.meteo ?? [];
  const eventi = json.eventi ?? [];
  if (!Array.isArray(meteo) || !Array.isArray(eventi)) return { ok: false, motivo: "«meteo» ed «eventi» devono essere elenchi" };
  for (const m of meteo) {
    if (!oggetto(m) || typeof m.zonaId !== "string" || typeof m.data !== "string" || !DATA.test(m.data) || !Array.isArray(m.fasce)) {
      return { ok: false, motivo: "ogni voce di «meteo» ha zonaId, data (AAAA-MM-GG) e fasce" };
    }
    for (const f of m.fasce) {
      if (!oggetto(f) || typeof f.inizio !== "string" || typeof f.fine !== "string" || !ORARIO.test(f.inizio) || !ORARIO.test(f.fine) || !CONDIZIONI.includes(String(f.condizione))) {
        return { ok: false, motivo: "ogni fascia ha inizio, fine (HH:mm) e una condizione nota" };
      }
    }
  }
  for (const e of eventi) {
    if (
      !oggetto(e) ||
      typeof e.id !== "string" ||
      typeof e.titolo !== "string" ||
      typeof e.luogoId !== "string" ||
      typeof e.data !== "string" ||
      !DATA.test(e.data) ||
      typeof e.inizio !== "string" ||
      typeof e.fine !== "string" ||
      !ORARIO.test(e.inizio) ||
      !ORARIO.test(e.fine) ||
      typeof e.chiudeLuogo !== "boolean"
    ) {
      return { ok: false, motivo: "ogni evento ha id, titolo, luogoId, data, inizio, fine e chiudeLuogo" };
    }
  }
  const nonDisponibili = Array.isArray(json.nonDisponibili) ? json.nonDisponibili.filter((s): s is "meteo" | "eventi" => s === "meteo" || s === "eventi") : [];
  return { ok: true, scenario: { meteo: meteo as MeteoFinto[], eventi: eventi as EventoLocale[], nonDisponibili } };
}
