/**
 * Supporto ai test del catalogo esteso (REQ-CAT-001): lettura dei dati aggiunti in
 * `data/reference/estensioni/` e costruzione compatta degli orari attesi.
 */
import { readFileSync } from "node:fs";
import { caricaCatalogoEsteso } from "../../src/itinerary/index.js";
import type { CatalogoEsteso, FasciaOraria, GiornoSettimana, OrariApertura } from "../../src/model/index.js";
import type { ElementoOsm } from "../../src/catalog/index.js";

const CARTELLA = new URL("../../data/reference/", import.meta.url);

/** JSON grezzo, da modificare liberamente nelle varianti dei test. */
export type Grezzo = any;

/** Un file dei dati di riferimento (anche `estensioni/…`): ogni chiamata restituisce una copia nuova. */
export const leggiDati = (file: string): Grezzo => JSON.parse(readFileSync(new URL(file, CARTELLA), "utf8"));

export const testoDati = (file: string): string => readFileSync(new URL(file, CARTELLA), "utf8");

/** Il catalogo esteso di riferimento, caricato e validato. */
export function catalogoEsteso(): CatalogoEsteso {
  const esito = caricaCatalogoEsteso(leggiDati("estensioni/catalogo-esteso.json"));
  if (!esito.ok) throw new Error(esito.errori.map((e) => e.messaggio).join("; "));
  return esito.valore;
}

/** I luoghi OpenStreetMap registrati per CA-3. */
export const esempiOsm = (): ElementoOsm[] => leggiDati("estensioni/osm-esempi-orari.json").elements;

export function esempioOsm(id: number): ElementoOsm {
  const trovato = esempiOsm().find((e) => e.id === id);
  if (trovato === undefined) throw new Error(`esempio OSM ${id} assente`);
  return trovato;
}

const GIORNI: readonly GiornoSettimana[] = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];

/**
 * Orari settimanali in forma compatta: per ogni giorno le fasce `"10:00-12:00,15:00-19:00"`, oppure `""` per
 * chiuso. `tutti` vale per i giorni non indicati.
 */
export function settimana(giorni: Partial<Record<GiornoSettimana | "tutti", string>>): OrariApertura {
  const fasce = (testo: string): FasciaOraria[] =>
    testo === ""
      ? []
      : testo.split(",").map((f) => {
          const [apertura = "", chiusura = ""] = f.split("-");
          return { apertura, chiusura };
        });
  const voci = GIORNI.map((g) => [g, fasce(giorni[g] ?? giorni.tutti ?? "")]);
  return { settimana: Object.fromEntries(voci) as Record<GiornoSettimana, FasciaOraria[]> };
}
