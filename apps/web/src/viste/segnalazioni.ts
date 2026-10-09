/**
 * Segnalazioni accanto agli elementi di un giorno (REQ-WEB-002): problemi di fattibilità, elementi a rischio,
 * elementi aggiunti o modificati da una proposta. Problemi ed elementi a rischio vengono dal motore
 * (`controllaFattibilita`, `proponiRipianificazione`): qui si raggruppano soltanto per elemento.
 */
import type { Gravita, Problema } from "@travelops/engine";

export const ETICHETTE_GRAVITA: Record<Gravita, string> = {
  bloccante: "Bloccante",
  avviso: "Avviso",
};

export interface ProblemaVista {
  codice: string;
  gravita: Gravita;
  gravitaEtichetta: string;
  /** Id degli elementi coinvolti, nell'ordine del motore. */
  elementi: string[];
  messaggio: string;
}

export type CambioElemento = "aggiunto" | "modificato";

export const ETICHETTE_CAMBIO: Record<CambioElemento, string> = {
  aggiunto: "Aggiunto",
  modificato: "Modificato",
};

/** Cosa segnalare accanto a un elemento. */
export interface SegnaliElemento {
  problemi: ProblemaVista[];
  aRischio: boolean;
  cambio: CambioElemento | null;
}

/** Segnalazioni di un giorno: i problemi del giorno e, per ogni elemento, cosa mostrare accanto. */
export interface SegnaliGiorno {
  /** I problemi che coinvolgono almeno un elemento del giorno, nell'ordine del motore. */
  problemi: ProblemaVista[];
  perElemento: Record<string, SegnaliElemento>;
}

export function problemaVista(problema: Problema): ProblemaVista {
  return {
    codice: problema.codice,
    gravita: problema.gravita,
    gravitaEtichetta: ETICHETTE_GRAVITA[problema.gravita],
    elementi: [...problema.elementi],
    messaggio: problema.messaggio,
  };
}

export interface FontiSegnali {
  problemi: readonly Problema[];
  aRischio?: readonly string[];
  aggiunti?: readonly string[];
  modificati?: readonly string[];
}

/** Le segnalazioni per gli elementi con questi id (quelli di un giorno). */
export function segnaliGiorno(idElementi: readonly string[], fonti: FontiSegnali): SegnaliGiorno {
  const delGiorno = new Set(idElementi);
  const problemi = fonti.problemi.filter((p) => p.elementi.some((id) => delGiorno.has(id))).map(problemaVista);
  const aRischio = new Set(fonti.aRischio ?? []);
  const aggiunti = new Set(fonti.aggiunti ?? []);
  const modificati = new Set(fonti.modificati ?? []);
  const perElemento: Record<string, SegnaliElemento> = {};
  for (const id of idElementi) {
    perElemento[id] = {
      problemi: problemi.filter((p) => p.elementi.includes(id)),
      aRischio: aRischio.has(id),
      cambio: aggiunti.has(id) ? "aggiunto" : modificati.has(id) ? "modificato" : null,
    };
  }
  return { problemi, perElemento };
}
