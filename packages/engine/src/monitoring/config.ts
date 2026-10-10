/**
 * Configurazione del monitoraggio (REQ-MONITOR-001), tutta da variabili d'ambiente con predefiniti sicuri.
 *
 * | Variabile                  | Predefinito | Significato                                              |
 * | -------------------------- | ----------- | -------------------------------------------------------- |
 * | MONITOR_ATTIVO             | true        | `false` spegne il controllo periodico (resta su richiesta)|
 * | MONITOR_INTERVALLO_S       | 900         | secondi tra due controlli periodici (intero ≥ 1)         |
 * | MONITOR_ORIZZONTE_GIORNI   | 7           | giorni, da oggi, in cui cercare condizioni (intero 1–60) |
 *
 * Un valore non valido non blocca l'app: si usa il predefinito e il motivo finisce in `avvisi`.
 */
import type { ConfigMonitoraggio } from "./tipi.js";

export const PREDEFINITI_MONITORAGGIO: ConfigMonitoraggio = { attivo: true, intervalloSecondi: 900, orizzonteGiorni: 7 };

export interface ConfigMonitoraggioLetta extends ConfigMonitoraggio {
  avvisi: readonly string[];
}

export function leggiConfigMonitoraggio(env: Readonly<Record<string, string | undefined>> = {}): ConfigMonitoraggioLetta {
  const avvisi: string[] = [];
  const testo = (nome: string): string | undefined => {
    const v = env[nome]?.trim();
    return v === undefined || v === "" ? undefined : v;
  };
  const intero = (nome: string, predefinito: number, minimo: number, massimo: number): number => {
    const v = testo(nome);
    if (v === undefined) return predefinito;
    const n = Number(v);
    if (Number.isInteger(n) && n >= minimo && n <= massimo) return n;
    avvisi.push(`${nome}="${v}" non è valido (intero tra ${minimo} e ${massimo}): uso ${predefinito}.`);
    return predefinito;
  };
  let attivo = PREDEFINITI_MONITORAGGIO.attivo;
  const a = testo("MONITOR_ATTIVO")?.toLowerCase();
  if (a !== undefined) {
    if (a === "true" || a === "false") attivo = a === "true";
    else avvisi.push(`MONITOR_ATTIVO="${a}" non è valido (true o false): uso "${String(attivo)}".`);
  }
  return {
    attivo,
    intervalloSecondi: intero("MONITOR_INTERVALLO_S", PREDEFINITI_MONITORAGGIO.intervalloSecondi, 1, 86_400),
    orizzonteGiorni: intero("MONITOR_ORIZZONTE_GIORNI", PREDEFINITI_MONITORAGGIO.orizzonteGiorni, 1, 60),
    avvisi,
  };
}
