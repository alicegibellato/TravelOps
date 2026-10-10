/**
 * Tipi del generatore della prima bozza (REQ-PLAN-001): opzioni, bozza restituita e spiegazione dei giorni.
 */
import type { Data, Orario, SorgenteDatiContesto, StileViaggio, Viaggio } from "../model/index.js";
import type { ProblemaFattibilita } from "../feasibility/index.js";
import type { ConfigurazioneVarieta } from "./configurazione.js";

/** Finestre dei pasti (R-5): il pasto inizia e finisce dentro la finestra. */
export const FINESTRE_PASTI = {
  pranzo: { inizio: "12:00", fine: "14:30" },
  cena: { inizio: "19:00", fine: "21:30" },
} as const satisfies Record<"pranzo" | "cena", { inizio: Orario; fine: Orario }>;

export type Pasto = keyof typeof FINESTRE_PASTI;

/** Orari predefiniti degli spostamenti di arrivo (primo giorno) e partenza (ultimo giorno). */
export const ORARIO_ARRIVO_PREDEFINITO: Orario = "12:00";
export const ORARIO_PARTENZA_PREDEFINITO: Orario = "17:00";
/** Fuso orario predefinito del viaggio: l'istantanea non lo dice. */
export const FUSO_ORARIO_PREDEFINITO = "Europe/Rome";
/** Massimo dei nuovi tentativi della verifica (R-6). */
export const TENTATIVI_MASSIMI = 3;

export interface OpzioniBozza {
  /**
   * Data del primo giorno (`AAAA-MM-GG`). Predefinita: con date precise l'inizio del profilo, con il mese il primo
   * giorno del mese.
   */
  dataInizio?: Data;
  /**
   * Spostamenti di arrivo (stazione o aeroporto → alloggio, primo giorno) e partenza (→ stazione o aeroporto,
   * ultimo giorno), che dimezzano le attività di quei giorni (R-3). Predefinito: sì, se la destinazione ha una
   * stazione o un aeroporto raggiungibile dall'alloggio con i mezzi del profilo.
   */
  arrivoEPartenza?: boolean;
  /** Arrivo alla stazione o all'aeroporto il primo giorno; predefinito `12:00`. */
  orarioArrivo?: Orario;
  /** Partenza dalla stazione o dall'aeroporto l'ultimo giorno; predefinito `17:00`. */
  orarioPartenza?: Orario;
  /** `id` di attività (anche pasti) da non usare, oltre a quelle escluse dal profilo. Lo usa l'alternativa (R-9). */
  escludi?: readonly string[];
  /**
   * Attività bloccate dal viaggiatore (REQ-PLAN-002): restano nel loro giorno, irrinunciabili, prima di ogni altra
   * scelta, anche se il profilo non le proporrebbe; la verifica (R-6) non le toglie mai. Pasti e servizi esclusi.
   */
  mantieni?: readonly AttivitaDaMantenere[];
  /**
   * Dati di contesto per collocazione e verifica (R-5, R-6). Predefinita: i tempi di percorrenza dell'istantanea,
   * senza previsioni né chiusure straordinarie.
   */
  sorgente?: SorgenteDatiContesto;
  /** Predefinito `BOZZA-<id dell'istantanea>`. */
  idViaggio?: string;
  /** Predefinito "Bozza del viaggio: <destinazione dell'istantanea>". */
  titolo?: string;
  /** Predefinito `Europe/Rome`. */
  fusoOrario?: string;
  /** Soglie di varietà (attività dello stesso tipo di fila, tragitti lunghi); predefinite in `VARIETA_PREDEFINITA`. */
  varieta?: Partial<ConfigurazioneVarieta>;
}

/** Un'attività bloccata da tenere nel suo giorno (`OpzioniBozza.mantieni`). */
export interface AttivitaDaMantenere {
  data: Data;
  attivitaId: string;
}

/** I fatti di un giorno della bozza, con la frase "perché te lo propongo" (R-7). */
export interface GiornoBozza {
  data: Data;
  /** Attività previste dalla regola R-3 (pasti esclusi). */
  attivitaPreviste: number;
  /** `id` delle attività del giorno (pasti esclusi), nell'ordine dell'itinerario. */
  attivita: string[];
  /** `id` delle attività di pranzo e cena collocate, `null` se il pasto non è richiesto o non è stato collocato. */
  pasti: Record<Pasto, string | null>;
  /** Stili del profilo rappresentati nel giorno, nell'ordine canonico. */
  stiliInComune: StileViaggio[];
  /** `id` delle attività irrinunciabili del giorno. */
  irrinunciabili: string[];
  /** Primo giorno con lo spostamento di arrivo, ultimo con quello di partenza. */
  arrivo: boolean;
  partenza: boolean;
  /**
   * Frase "perché te lo propongo" costruita dai dati: l'agente (REQ-ORCH-001) la può riscrivere senza cambiarne i fatti.
   */
  perche: string;
}

/** Un'attività tolta dalla verifica (R-6), con il problema che l'ha coinvolta. */
export interface AttivitaTolta {
  attivitaId: string;
  /** Punteggio della §7.7 al momento della scelta. */
  punteggio: number;
  problema: ProblemaFattibilita;
}

/** La bozza generata: itinerario, verifica e spiegazioni. */
export interface BozzaItinerario {
  /** L'itinerario completo, valido secondo REQ-ITIN-001. */
  viaggio: Viaggio;
  /** Istantanea su cui la bozza è costruita (§7.1, §7.8). */
  istantaneaId: string;
  /** Alloggio di tutte le notti (R-2). */
  alloggioId: string;
  /** Stazione o aeroporto di arrivo e partenza; `null` senza spostamenti di arrivo e partenza. */
  arrivoId: string | null;
  giorni: GiornoBozza[];
  /** Esito del controllo di fattibilità (REQ-FEAS-001) sulla bozza restituita, avvisi compresi. */
  problemi: ProblemaFattibilita[];
  /** Nessun problema bloccante. */
  fattibile: boolean;
  /** Attività tolte dalla verifica, nell'ordine dei tentativi (al massimo 3). */
  tolte: AttivitaTolta[];
  /** `id` esclusi su richiesta (`OpzioniBozza.escludi`, per esempio dall'alternativa), in ordine alfabetico. */
  escluse: string[];
  /** Irrinunciabili che non è stato possibile inserire: `id` di attività e stili senza alcuna attività. */
  irrinunciabiliMancanti: { attivita: string[]; stili: StileViaggio[] };
  /** Note per il viaggiatore (pasti non collocati, giorni con meno attività, irrinunciabili mancanti). */
  avvisi: string[];
  /** Esito complessivo in parole semplici: fattibilità, attività tolte e problemi rimasti. */
  spiegazione: string;
}

/** Il generatore non può partire: per esempio l'istantanea non ha alloggi. */
export class ErroreBozza extends Error {
  override readonly name = "ErroreBozza";
}
