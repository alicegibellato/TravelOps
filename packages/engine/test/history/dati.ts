/**
 * Dati di riferimento per i test del modulo history. Ogni chiamata restituisce una copia nuova,
 * così ogni test può costruire la sua variante senza toccare le altre.
 */
import { readFileSync } from "node:fs";
import { applicaProposta, creaStorico, type Momento, type Storico } from "../../src/history/index.js";
import { caricaViaggio } from "../../src/itinerary/index.js";
import type { Proposta, Viaggio } from "../../src/model/index.js";

function leggi(file: string): unknown {
  return JSON.parse(readFileSync(new URL(`../../data/reference/${file}`, import.meta.url), "utf8"));
}

/** La versione 1 di riferimento (TRIP-GARDA), caricata con `caricaViaggio`. */
export function versione1(): Viaggio {
  const esito = caricaViaggio(leggi("versione-1.json"));
  if (!esito.ok) throw new Error(`versione 1 di riferimento non valida: ${esito.errori.map((e) => e.messaggio).join("; ")}`);
  return esito.valore;
}

/** Un viaggio di riferimento qualsiasi (varianti comprese), caricato con `caricaViaggio`. */
export function viaggio(file: string): Viaggio {
  const esito = caricaViaggio(leggi(file));
  if (!esito.ok) throw new Error(`${file} non valido`);
  return esito.valore;
}

/** La proposta di riferimento P-S1 (dati-di-riferimento.md §8), costruita sulla versione 1. */
export function propostaPS1(): Proposta {
  return leggi("proposta-p-s1.json") as Proposta;
}

/** Il momento di accettazione di CA-2: 2026-06-13 alle 07:30. */
export const MOMENTO_CA2: Momento = { data: "2026-06-13", ora: "07:30" };

/** Lo storico della versione 1 di riferimento. */
export function storicoVersione1(): Storico {
  const esito = creaStorico(versione1());
  if (!esito.ok) throw new Error(esito.errore.messaggio);
  return esito.storico;
}

/** Lo storico dopo CA-2: P-S1 accettata da "Alice" il 2026-06-13 alle 07:30. */
export function storicoDopoCA2(): Storico {
  const esito = applicaProposta(storicoVersione1(), propostaPS1(), "Alice", MOMENTO_CA2);
  if (esito.esito !== "versione_creata") throw new Error(`P-S1 non applicata: ${esito.esito}`);
  return esito.storico;
}

/** Una proposta costruita sulla versione `base` con itinerario `itinerario` e origine presa da P-S1. */
export function propostaCon(base: number, itinerario: Viaggio, varianti: Partial<Proposta> = {}): Proposta {
  return { ...propostaPS1(), versioneBase: base, itinerario, ...varianti };
}

/** L'elemento con quell'id in un viaggio. */
export function elemento(v: Viaggio, id: string) {
  for (const giorno of v.giorni) {
    for (const e of giorno.elementi) if (e.id === id) return e;
  }
  throw new Error(`elemento ${id} non trovato`);
}
