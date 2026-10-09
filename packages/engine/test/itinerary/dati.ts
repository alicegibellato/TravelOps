/**
 * Dati di riferimento per i test del modulo itinerary. Ogni chiamata restituisce una copia nuova,
 * così ogni test può costruire la sua variante senza toccare le altre.
 */
import { readFileSync } from "node:fs";
import { caricaCatalogo } from "../../src/itinerary/index.js";
import type { Catalogo } from "../../src/model/index.js";

/** JSON grezzo, da modificare liberamente per costruire le varianti dei test. */
export type Grezzo = any;

export type FileViaggio = "versione-1.json" | "variante-v-irr.json" | "variante-v-fisso.json" | "variante-v-volo.json";

export const FILE_VIAGGI: readonly FileViaggio[] = [
  "versione-1.json",
  "variante-v-irr.json",
  "variante-v-fisso.json",
  "variante-v-volo.json",
];

export function leggiRiferimento(file: string): Grezzo {
  return JSON.parse(readFileSync(new URL(`../../data/reference/${file}`, import.meta.url), "utf8"));
}

export function testoRiferimento(file: string): string {
  return readFileSync(new URL(`../../data/reference/${file}`, import.meta.url), "utf8");
}

/** Il catalogo di riferimento già caricato (deve essere valido: lo verifica CA-1). */
export function catalogoDiRiferimento(): Catalogo {
  const esito = caricaCatalogo(leggiRiferimento("catalogo.json"));
  if (!esito.ok) throw new Error(`catalogo di riferimento non valido: ${esito.errori.map((e) => e.messaggio).join("; ")}`);
  return esito.valore;
}

/** L'elemento con quell'id in un viaggio grezzo. */
export function elemento(viaggio: Grezzo, id: string): Grezzo {
  for (const giorno of viaggio.giorni) {
    for (const voce of giorno.elementi) if (voce.id === id) return voce;
  }
  throw new Error(`elemento ${id} non trovato`);
}

/** La voce con quell'id in un elenco del catalogo grezzo (zone, luoghi o attivita). */
export function voce(catalogo: Grezzo, elenco: "zone" | "luoghi" | "attivita", id: string): Grezzo {
  const trovata = catalogo[elenco].find((v: Grezzo) => v.id === id);
  if (trovata === undefined) throw new Error(`${id} non trovato in ${elenco}`);
  return trovata;
}
