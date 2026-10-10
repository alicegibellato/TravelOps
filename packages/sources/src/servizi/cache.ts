/**
 * Cache in memoria con scadenza (TTL) per i servizi esterni (REQ-INTEG-001, CA-3). Si mettono in cache solo i
 * risultati disponibili: un errore non resta in memoria e la richiesta successiva riprova. Due richieste uguali
 * contemporanee condividono la stessa chiamata.
 */
import type { RisultatoServizio } from "./risultato.js";

export interface OpzioniCache {
  /** Durata di validità in millisecondi; 0 o meno disattiva la cache. */
  ttlMs: number;
  /** Millisecondi correnti; predefinito `Date.now`. Nei test è un orologio finto. */
  adesso?: () => number;
  /** Quante voci tenere al massimo (predefinito 500): oltre, si scartano le più vecchie. */
  massimoVoci?: number;
}

export const MASSIMO_VOCI_CACHE = 500;

interface Voce<T> {
  scade: number;
  risultato: Promise<RisultatoServizio<T>>;
}

/** Avvolge `chiama`: la stessa `chiave` entro il TTL non rifà la chiamata. */
export function conCache<A extends unknown[], T>(
  opzioni: OpzioniCache,
  chiave: (...argomenti: A) => string,
  chiama: (...argomenti: A) => Promise<RisultatoServizio<T>>,
): (...argomenti: A) => Promise<RisultatoServizio<T>> {
  const adesso = opzioni.adesso ?? Date.now;
  const massimo = opzioni.massimoVoci ?? MASSIMO_VOCI_CACHE;
  const voci = new Map<string, Voce<T>>();
  return async (...argomenti: A) => {
    if (opzioni.ttlMs <= 0) return chiama(...argomenti);
    const k = chiave(...argomenti);
    const ora = adesso();
    const presente = voci.get(k);
    if (presente !== undefined && presente.scade > ora) {
      const risultato = await presente.risultato;
      return risultato.disponibile ? { ...risultato, dallaCache: true } : risultato;
    }
    voci.delete(k);
    const nuova: Voce<T> = { scade: ora + opzioni.ttlMs, risultato: chiama(...argomenti) };
    voci.set(k, nuova);
    while (voci.size > massimo) voci.delete(voci.keys().next().value as string);
    const risultato = await nuova.risultato;
    if (!risultato.disponibile && voci.get(k) === nuova) voci.delete(k);
    return risultato;
  };
}
