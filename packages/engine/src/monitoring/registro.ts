/** Registro dei controlli in memoria (REQ-MONITOR-001): di base per i test e per chi lo persiste altrove. */
import type { RegistroControlli } from "./tipi.js";

export interface RegistroInMemoria extends RegistroControlli {
  /** Le chiavi registrate, in ordine di inserimento. */
  chiavi(): string[];
}

export function creaRegistroInMemoria(iniziali: Iterable<string> = []): RegistroInMemoria {
  const insieme = new Set<string>(iniziali);
  return {
    ha: (chiave) => insieme.has(chiave),
    registra: (chiave) => void insieme.add(chiave),
    chiavi: () => [...insieme],
  };
}

/** La chiave di idempotenza: viaggio, attività, condizione e data (REQ-MONITOR-001, CA-4). */
export function chiaveControllo(viaggioId: string, attivitaId: string, condizione: string, data: string): string {
  return [viaggioId, attivitaId, condizione, data].join("|");
}
