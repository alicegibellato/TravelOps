/**
 * Punteggio delle preferenze (modello-dominio-estensioni.md §7.7, REQ-PREF-001 CA-4): quanto un'attività di
 * catalogo corrisponde a un profilo, oppure perché è esclusa. Lo usano il generatore della bozza (REQ-PLAN-001),
 * la revisione della bozza (REQ-PLAN-002) e la scelta dei sostituti (REQ-REPLAN-004).
 *
 * Funzioni pure: nessun orologio, nessuna casualità, nessun ordinamento che dipende dalla lingua del sistema.
 * Senza profilo il punteggio non si applica: chi non ha un profilo non chiama queste funzioni.
 */
import type { AttivitaCatalogoEstesa, CatalogoEsteso, Costo, StileViaggio } from "../model/index.js";
import { COSTI, INTENSITA } from "../itinerary/valori.js";
import { INTENSITA_MASSIMA, type ProfiloPreferenze } from "./tipi.js";
import { daEvitareComprende } from "./validazione.js";

/** Punti della §7.7. */
export const PUNTI = {
  /** Per ogni stile in comune con il profilo. */
  stileInComune: 3,
  /** Se l'attività è tra gli irrinunciabili. */
  irrinunciabile: 5,
  /** Se il costo supera la fascia di budget di un livello (di più è esclusa). */
  unLivelloOltreIlBudget: -1,
} as const;

/** Perché un'attività è esclusa dal profilo, nell'ordine della §7.7. */
export type MotivoEsclusione =
  | "da_evitare"
  | "troppo_impegnativa"
  | "non_accessibile"
  | "non_adatta_ai_bambini"
  | "troppo_cara";

export const MOTIVI_ESCLUSIONE = [
  "da_evitare",
  "troppo_impegnativa",
  "non_accessibile",
  "non_adatta_ai_bambini",
  "troppo_cara",
] as const satisfies readonly MotivoEsclusione[];

/** Il motivo di esclusione in parole semplici, da mostrare al viaggiatore. */
export const TESTO_ESCLUSIONE: Readonly<Record<MotivoEsclusione, string>> = {
  da_evitare: "È tra le cose che vuoi evitare.",
  troppo_impegnativa: "È più faticosa di quanto hai scelto per la forma fisica.",
  non_accessibile: "Non è accessibile a chi ha mobilità ridotta.",
  non_adatta_ai_bambini: "Non è adatta ai bambini.",
  troppo_cara: "Costa troppo rispetto al budget scelto.",
};

/** La valutazione di un'attività rispetto a un profilo, con tutti i fatti che la spiegano. */
export interface ValutazioneAttivita {
  attivitaId: string;
  /** `true` se l'attività non va mai proposta con questo profilo. */
  esclusa: boolean;
  /** Tutti i motivi di esclusione, nell'ordine di `MOTIVI_ESCLUSIONE`; vuoto se non è esclusa. */
  esclusioni: MotivoEsclusione[];
  /** Punteggio della §7.7; `null` se l'attività è esclusa. Può essere negativo (−1). */
  punteggio: number | null;
  /** Stili dell'attività che sono anche nel profilo, nell'ordine canonico. */
  stiliInComune: StileViaggio[];
  /** `true` se è tra gli irrinunciabili (per `id` o per uno stile irrinunciabile). */
  irrinunciabile: boolean;
  /** Di quanti livelli il costo supera la fascia di budget (0 se è entro la fascia o se il costo non è noto). */
  livelliOltreIlBudget: number;
}

const posizioneCosto = (costo: Costo): number => COSTI.indexOf(costo);

/**
 * Valuta un'attività di catalogo rispetto a un profilo validato (§7.7).
 *
 * Esclusa se: è tra le cose da evitare (per `id`, categoria o uno dei suoi stili); la sua intensità supera la
 * forma fisica; il profilo chiede mobilità ridotta e non è accessibile; ci sono bambini (o l'esigenza "adatto
 * ai bambini") e non è adatta ai bambini; il costo supera la fascia di budget di più di un livello.
 * Un campo della §7.3 assente non si presume favorevole: senza intensità, accessibilità o adatta ai bambini
 * l'attività è esclusa quando il profilo pone quel limite. Senza costo non ha penalità.
 *
 * Altrimenti il punteggio è: +3 per ogni stile in comune con il profilo, +5 (una volta sola) se è tra gli
 * irrinunciabili, −1 se il costo supera la fascia di budget di un livello.
 */
export function valutaAttivita(attivita: AttivitaCatalogoEstesa, profilo: ProfiloPreferenze): ValutazioneAttivita {
  const stiliAttivita = attivita.stili ?? [];
  const stiliInComune = profilo.stili.filter((s) => stiliAttivita.includes(s));
  const irrinunciabile =
    profilo.irrinunciabili.attivita.includes(attivita.id) ||
    stiliAttivita.some((s) => profilo.irrinunciabili.stili.includes(s));
  const livelliOltreIlBudget =
    attivita.costo === undefined ? 0 : Math.max(0, posizioneCosto(attivita.costo) - posizioneCosto(profilo.budget));

  const esclusioni: MotivoEsclusione[] = [];
  if (daEvitareComprende(profilo.daEvitare, attivita)) esclusioni.push("da_evitare");
  const massima = INTENSITA.indexOf(INTENSITA_MASSIMA[profilo.formaFisica]);
  const limitaIntensita = massima < INTENSITA.length - 1;
  if (attivita.intensita === undefined ? limitaIntensita : INTENSITA.indexOf(attivita.intensita) > massima) {
    esclusioni.push("troppo_impegnativa");
  }
  if (profilo.esigenze.includes("mobilita_ridotta") && attivita.accessibile !== true) esclusioni.push("non_accessibile");
  const conBambini = profilo.viaggiatori.bambini.length > 0 || profilo.esigenze.includes("adatto_ai_bambini");
  if (conBambini && attivita.adattaAiBambini !== true) esclusioni.push("non_adatta_ai_bambini");
  if (livelliOltreIlBudget > 1) esclusioni.push("troppo_cara");

  const esclusa = esclusioni.length > 0;
  const punteggio = esclusa
    ? null
    : stiliInComune.length * PUNTI.stileInComune +
      (irrinunciabile ? PUNTI.irrinunciabile : 0) +
      (livelliOltreIlBudget === 1 ? PUNTI.unLivelloOltreIlBudget : 0);
  return { attivitaId: attivita.id, esclusa, esclusioni, punteggio, stiliInComune, irrinunciabile, livelliOltreIlBudget };
}

/** Il punteggio della §7.7 di un'attività, oppure `null` se il profilo la esclude. */
export function punteggioAttivita(attivita: AttivitaCatalogoEstesa, profilo: ProfiloPreferenze): number | null {
  return valutaAttivita(attivita, profilo).punteggio;
}

/** Confronto per codice, indipendente dalla lingua del sistema. */
const perId = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Ordine della §7.7: punteggio più alto prima; a parità di punteggio, ordine alfabetico dell'`id` (per codice
 * del carattere). Le valutazioni escluse vanno in fondo, in ordine di `id`.
 */
export function confrontaValutazioni(a: ValutazioneAttivita, b: ValutazioneAttivita): number {
  if (a.punteggio === null || b.punteggio === null) {
    if (a.punteggio !== b.punteggio) return a.punteggio === null ? 1 : -1;
  } else if (a.punteggio !== b.punteggio) {
    return b.punteggio - a.punteggio;
  }
  return perId(a.attivitaId, b.attivitaId);
}

/** Le attività del catalogo divise in candidate (in ordine di punteggio) ed escluse (in ordine di `id`). */
export interface ClassificaAttivita {
  /** Le attività non escluse, dalla più adatta: punteggio decrescente, poi `id` in ordine alfabetico. */
  candidate: ValutazioneAttivita[];
  /** Le attività escluse dal profilo, in ordine alfabetico di `id`, con i motivi. */
  escluse: ValutazioneAttivita[];
}

/**
 * Valuta tutte le attività di un catalogo (o di un elenco) rispetto al profilo e le ordina come vuole la §7.7.
 * Il risultato non dipende dall'ordine delle attività nel catalogo. Non filtra per categoria: chi genera la
 * bozza toglie da sé pasti e servizi, che hanno regole proprie (REQ-PLAN-001 R-5, §8.5).
 */
export function classificaAttivita(
  catalogo: CatalogoEsteso | readonly AttivitaCatalogoEstesa[],
  profilo: ProfiloPreferenze,
): ClassificaAttivita {
  const attivita = "attivita" in catalogo ? catalogo.attivita : catalogo;
  const valutazioni = attivita.map((a) => valutaAttivita(a, profilo)).sort(confrontaValutazioni);
  return {
    candidate: valutazioni.filter((v) => !v.esclusa),
    escluse: valutazioni.filter((v) => v.esclusa),
  };
}
