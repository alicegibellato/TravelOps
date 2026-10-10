/**
 * Lo stato del monitoraggio nella base dati (REQ-MONITOR-001): l'impostazione `monitoraggio` con le chiavi di
 * idempotenza già segnalate e le notifiche create. Nessuna migrazione: usa la tabella delle impostazioni (REQ-DATA-001).
 */
import { leggiImpostazione, scriviImpostazione, type BaseDati } from "../basedati";

export const CHIAVE_MONITORAGGIO = "monitoraggio";

/** Una notifica per il viaggiatore: l'imprevisto trovato e la proposta da decidere. */
export interface NotificaMonitoraggio {
  /** Numero progressivo della notifica. */
  id: number;
  viaggio: string;
  /** La proposta di ripianificazione (numero della proposta salvata nello stato). */
  proposta: number;
  testo: string;
  condizione: string;
  /** Il momento dell'orologio in cui è stata creata. */
  creata: { data: string; ora: string };
}

export interface StatoMonitoraggio {
  chiavi: Set<string>;
  notifiche: NotificaMonitoraggio[];
}

function oggetto(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function notifica(v: unknown): v is NotificaMonitoraggio {
  return (
    oggetto(v) &&
    Number.isInteger(v.id) &&
    typeof v.viaggio === "string" &&
    Number.isInteger(v.proposta) &&
    typeof v.testo === "string" &&
    typeof v.condizione === "string" &&
    oggetto(v.creata)
  );
}

/** Lo stato salvato; un'impostazione assente o rovinata vale «niente segnalato» (il controllo ricomincia da capo). */
export function leggiStatoMonitoraggio(db: BaseDati): StatoMonitoraggio {
  let salvato: unknown;
  try {
    salvato = leggiImpostazione(db, CHIAVE_MONITORAGGIO);
  } catch {
    salvato = undefined;
  }
  if (!oggetto(salvato)) return { chiavi: new Set(), notifiche: [] };
  const chiavi = Array.isArray(salvato.chiavi) ? salvato.chiavi.filter((c): c is string => typeof c === "string") : [];
  const notifiche = Array.isArray(salvato.notifiche) ? salvato.notifiche.filter(notifica) : [];
  return { chiavi: new Set(chiavi), notifiche };
}

export function salvaStatoMonitoraggio(db: BaseDati, stato: StatoMonitoraggio): void {
  scriviImpostazione(db, CHIAVE_MONITORAGGIO, { chiavi: [...stato.chiavi], notifiche: stato.notifiche });
}
