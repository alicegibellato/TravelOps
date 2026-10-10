/**
 * Il punto di collegamento unico del monitoraggio (REQ-MONITOR-001): qui, e solo qui, si sceglie da dove arrivano
 * meteo ed eventi. Il resto del monitoraggio (motore, servizio, scheduler, UI) conosce solo `SorgenteCondizioni`.
 *
 * Con `MONITOR_FINTO` valorizzato (JSON, vedi `leggiScenarioFinto`) la sorgente è lo scenario finto del motore: serve a
 * test ed e2e. Altrimenti si usano le porte Meteo ed Eventi di `@travelops/sources` (ST-INTEG-001), finte o reali a
 * seconda di `TRAVELOPS_METEO` e `TRAVELOPS_EVENTI`.
 */
import {
  creaSorgenteCondizioniFinta,
  leggiConfigMonitoraggio,
  leggiScenarioFinto,
  type ConfigMonitoraggioLetta,
  type SorgenteCondizioni,
} from "@travelops/engine";
import { sorgenteDaAmbiente } from "./da-servizi";
import type { ContestoMonitoraggio } from "./servizio";

type Ambiente = Readonly<Record<string, string | undefined>>;

/** Da dove arrivano meteo ed eventi. Un `MONITOR_FINTO` non valido non blocca l'app: nessuna condizione e un avviso. Senza `MONITOR_FINTO`: le porte dei servizi. */
export function creaSorgenteMonitoraggio(env: Ambiente = process.env): { sorgente: SorgenteCondizioni; avvisi: string[] } {
  const testo = env.MONITOR_FINTO?.trim();
  if (testo === undefined || testo === "") return { sorgente: sorgenteDaAmbiente(env), avvisi: [] };
  const letto = leggiScenarioFinto(testo);
  if (!letto.ok) return { sorgente: creaSorgenteCondizioniFinta(), avvisi: [`MONITOR_FINTO non è valido (${letto.motivo}): nessuna condizione.`] };
  return { sorgente: creaSorgenteCondizioniFinta(letto.scenario), avvisi: [] };
}

export function leggiConfigurazione(env: Ambiente = process.env): ConfigMonitoraggioLetta {
  return leggiConfigMonitoraggio(env);
}

/** Contesto completo per il servizio: sorgente e configurazione dall'ambiente. */
export function contestoDaAmbiente(env: Ambiente = process.env): ContestoMonitoraggio {
  return { sorgente: creaSorgenteMonitoraggio(env).sorgente, config: leggiConfigurazione(env) };
}

/** Tempo massimo, in millisecondi, che l'apertura di Oggi attende il controllo prima di mostrare ciò che già c'è. */
export function attesaMassimaApertura(env: Ambiente = process.env): number {
  const n = Number(env.MONITOR_ATTESA_APERTURA_MS);
  return Number.isInteger(n) && n >= 0 ? n : 4000;
}
