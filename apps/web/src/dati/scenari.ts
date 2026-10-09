/**
 * Scenari di imprevisto S1–S8 e dati di contesto di riferimento (dati-di-riferimento.md §3 e §6).
 * I file JSON sono quelli del motore (`@travelops/engine/data/reference/*`): entrano nella build, la web app non
 * li scarica. La sorgente dei dati di contesto è quella del motore (`creaSorgenteDaDati`), che li valida.
 */
import contesto from "@travelops/engine/data/reference/contesto.json";
import scenari from "@travelops/engine/data/reference/scenari-imprevisti.json";
import {
  arricchisciSorgente,
  caricaCatalogo,
  creaSorgenteDaDati,
  type Catalogo,
  type DatiContesto,
  type Imprevisto,
  type SorgenteDatiContesto,
} from "@travelops/engine";
import { CATALOGO_DI_RIFERIMENTO, trovaVoceViaggio, type VoceViaggio } from "./viaggi";

export interface Scenario {
  /** `S1`…`S8`. */
  id: string;
  titolo: string;
  /** Il viaggio di partenza dello scenario (versione 1 o variante), come chiave della web app. */
  chiaveViaggio: string;
  imprevisto: Imprevisto;
}

interface ScenarioGrezzo {
  id: string;
  titolo: string;
  /** `versione-1`, `V-IRR`, `V-FISSO`, `V-VOLO`. */
  itinerario: string;
  imprevisto: unknown;
}

/** Gli scenari, nell'ordine dei dati di riferimento. Le chiavi dei viaggi della web app sono i nomi in minuscolo. */
export const SCENARI: readonly Scenario[] = (scenari as readonly ScenarioGrezzo[]).map((s) => ({
  id: s.id,
  titolo: s.titolo,
  chiaveViaggio: s.itinerario.toLowerCase(),
  imprevisto: s.imprevisto as Imprevisto,
}));

export function trovaScenario(id: string): Scenario | null {
  return SCENARI.find((s) => s.id === id) ?? null;
}

/** Il viaggio di partenza di uno scenario. */
export function viaggioDelloScenario(scenario: Scenario): VoceViaggio {
  const voce = trovaVoceViaggio(scenario.chiaveViaggio);
  if (voce === null) throw new Error(`Lo scenario ${scenario.id} usa un viaggio sconosciuto: ${scenario.chiaveViaggio}`);
  return voce;
}

let sorgente: SorgenteDatiContesto | null = null;

/** La sorgente dei dati di contesto di riferimento (tempi di percorrenza; nessuna previsione, nessuna chiusura). */
export function sorgenteDiRiferimento(): SorgenteDatiContesto {
  sorgente ??= creaSorgenteDaDati(contesto as DatiContesto);
  return sorgente;
}

/**
 * La sorgente con cui controllare un itinerario mentre l'imprevisto di uno scenario è in corso: quella di
 * riferimento arricchita dal motore (`arricchisciSorgente`: il meteo avverso vale come previsione, la chiusura come
 * chiusura straordinaria). Senza imprevisto è quella di riferimento.
 */
export function sorgenteConImprevisto(imprevisto: Imprevisto | null): SorgenteDatiContesto {
  return imprevisto === null ? sorgenteDiRiferimento() : arricchisciSorgente(sorgenteDiRiferimento(), imprevisto);
}

let catalogo: Catalogo | null = null;

/** Il catalogo di riferimento, caricato e validato dal motore (`caricaCatalogo`). */
export function catalogoDiRiferimento(): Catalogo {
  if (catalogo === null) {
    const caricato = caricaCatalogo(CATALOGO_DI_RIFERIMENTO);
    if (!caricato.ok) throw new Error(`Catalogo di riferimento non valido: ${caricato.errori.map((e) => e.messaggio).join("; ")}`);
    catalogo = caricato.valore;
  }
  return catalogo;
}
