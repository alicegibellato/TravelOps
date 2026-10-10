/**
 * Avvio del controllo periodico (REQ-MONITOR-001, CA-1) dentro il server della web app, senza processi fuori controllo:
 * - un solo pianificatore per processo (singleton su `globalThis`, perché Next può caricare il modulo più volte);
 * - un timer alla volta, che non tiene vivo il processo (vedi `creaPianificatore` del motore);
 * - `fermaMonitoraggio()` lo spegne ed è collegato ai segnali SIGINT/SIGTERM: i gestori non chiamano `process.exit`,
 *   lasciano che sia il server a chiudersi;
 * - `MONITOR_ATTIVO=false` non lo avvia: resta il controllo all'apertura di Oggi.
 */
import { creaPianificatore, type Pianificatore } from "@travelops/engine";
import { cartellaDati } from "../stato/archivio";
import { contestoDaAmbiente, creaSorgenteMonitoraggio, leggiConfigurazione } from "./collegamento";
import { controllaViaggiConfermati } from "./servizio";

interface Registro {
  pianificatore?: Pianificatore;
  segnali?: boolean;
}
const GLOBALE = globalThis as typeof globalThis & { __travelopsMonitoraggio?: Registro };

function registro(): Registro {
  return (GLOBALE.__travelopsMonitoraggio ??= {});
}

/** Avvia il controllo periodico se la configurazione lo vuole. Chiamarlo più volte non ne avvia più di uno. */
export function avviaMonitoraggio(env: Readonly<Record<string, string | undefined>> = process.env): Pianificatore | null {
  const r = registro();
  if (r.pianificatore !== undefined) return r.pianificatore;
  const config = leggiConfigurazione(env);
  for (const avviso of [...config.avvisi, ...creaSorgenteMonitoraggio(env).avvisi]) console.warn(`TravelOps: ${avviso}`);
  if (!config.attivo) return null;
  const contesto = contestoDaAmbiente(env);
  const pianificatore = creaPianificatore({
    intervalloMs: config.intervalloSecondi * 1000,
    esegui: async () => {
      await controllaViaggiConfermati(cartellaDati(), contesto);
    },
    inErrore: (errore) => console.error(`TravelOps: controllo periodico non riuscito (${(errore as Error).message})`),
  });
  r.pianificatore = pianificatore;
  pianificatore.avvia();
  if (r.segnali !== true) {
    r.segnali = true;
    for (const segnale of ["SIGINT", "SIGTERM"] as const) process.once(segnale, () => void fermaMonitoraggio());
  }
  return pianificatore;
}

/** Spegne il controllo periodico e attende il giro in corso. Si può richiamare più volte. */
export async function fermaMonitoraggio(): Promise<void> {
  const r = registro();
  const p = r.pianificatore;
  delete r.pianificatore;
  await p?.ferma();
}
