/**
 * Segnalazioni accanto agli elementi di un giorno (REQ-WEB-002): problemi di fattibilità, elementi a rischio,
 * elementi aggiunti o modificati da una proposta. Problemi ed elementi a rischio vengono dal motore
 * (`controllaFattibilita`, `proponiRipianificazione`): qui si raggruppano soltanto per elemento e si mettono in
 * parole (REQ-UX-001, CA-6) con il modulo dei testi.
 */
import type { Gravita, Problema } from "@travelops/engine";
import { inParole, TESTI_CODICI, TESTI_GRAVITA, type CodiceMotore, type ContestoTesti } from "../testi";

export interface ProblemaVista {
  /** Il codice del motore: solo per gli attributi `data-*`, mai nel testo. */
  codice: string;
  gravita: Gravita;
  gravitaEtichetta: string;
  /** Il problema in poche parole, per esempio "Fuori dagli orari di apertura". */
  titolo: string;
  /** Id degli elementi coinvolti, nell'ordine del motore. */
  elementi: string[];
  /** Il messaggio del motore in parole semplici. */
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

export function problemaVista(problema: Problema, contesto: ContestoTesti | null = null): ProblemaVista {
  const titolo = Object.hasOwn(TESTI_CODICI, problema.codice) ? TESTI_CODICI[problema.codice as CodiceMotore] : "Problema";
  return {
    codice: problema.codice,
    gravita: problema.gravita,
    gravitaEtichetta: TESTI_GRAVITA[problema.gravita],
    titolo,
    elementi: [...problema.elementi],
    messaggio: inParole(problema.messaggio, contesto),
  };
}

export interface FontiSegnali {
  problemi: readonly Problema[];
  aRischio?: readonly string[];
  aggiunti?: readonly string[];
  modificati?: readonly string[];
  /** Per mettere in parole i messaggi del motore (nomi al posto degli `id`). */
  contesto?: ContestoTesti;
}

/** Le segnalazioni per gli elementi con questi id (quelli di un giorno). */
export function segnaliGiorno(idElementi: readonly string[], fonti: FontiSegnali): SegnaliGiorno {
  const delGiorno = new Set(idElementi);
  const problemi = fonti.problemi
    .filter((p) => p.elementi.some((id) => delGiorno.has(id)))
    .map((p) => problemaVista(p, fonti.contesto ?? null));
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
