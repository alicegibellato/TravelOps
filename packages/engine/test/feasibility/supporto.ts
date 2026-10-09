/**
 * Supporto ai test del controllo di fattibilità: dati di riferimento come oggetti tipizzati,
 * varianti dichiarate nei test e una sorgente dei dati di contesto finta, tutta in memoria.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  ORDINE_MEZZI,
  type Catalogo,
  type ChiusuraStraordinaria,
  type DatiContesto,
  type Elemento,
  type Imprevisto,
  type Mezzo,
  type Percorso,
  type PrevisioneMeteo,
  type SorgenteDatiContesto,
  type Viaggio,
} from "../../src/model/index.js";

const CARTELLA_RIFERIMENTO = new URL("../../data/reference/", import.meta.url);

/** Percorso della cartella `data/reference`, per la sorgente su file. */
export const cartellaRiferimento = (): string => fileURLToPath(CARTELLA_RIFERIMENTO);

/** Legge un file dei dati di riferimento: ogni chiamata restituisce una copia nuova, modificabile. */
export const leggiRiferimento = <T>(file: string): T =>
  JSON.parse(readFileSync(new URL(file, CARTELLA_RIFERIMENTO), "utf8")) as T;

export const catalogo = (): Catalogo => leggiRiferimento<Catalogo>("catalogo.json");
export const contesto = (): DatiContesto => leggiRiferimento<DatiContesto>("contesto.json");
export const versione1 = (): Viaggio => leggiRiferimento<Viaggio>("versione-1.json");

/** Itinerari di riferimento di CA-1: versione 1 e varianti. */
export const ITINERARI_DI_RIFERIMENTO: ReadonlyArray<readonly [string, string]> = [
  ["versione 1", "versione-1.json"],
  ["V-IRR", "variante-v-irr.json"],
  ["V-FISSO", "variante-v-fisso.json"],
  ["V-VOLO", "variante-v-volo.json"],
];

interface ScenarioImprevisto {
  id: string;
  itinerario: string;
  imprevisto: Imprevisto;
}

const scenario = (id: string): Imprevisto => {
  const trovato = leggiRiferimento<ScenarioImprevisto[]>("scenari-imprevisti.json").find((s) => s.id === id);
  if (!trovato) throw new Error(`Scenario ${id} assente dai dati di riferimento`);
  return trovato.imprevisto;
};

/** La previsione dello scenario S1 (pioggia in GARDA_NORD il 2026-06-13, 08:00–13:00). */
export function previsioneS1(): PrevisioneMeteo {
  const imprevisto = scenario("S1");
  if (imprevisto.tipo !== "METEO_AVVERSO") throw new Error("S1 dovrebbe essere un METEO_AVVERSO");
  const { zonaId, data, inizio, fine, condizione } = imprevisto;
  return { zonaId, data, inizio, fine, condizione };
}

/** La chiusura straordinaria dello scenario S4 (MUSE, 2026-06-14, 00:00–24:00). */
export function chiusuraS4(): ChiusuraStraordinaria {
  const imprevisto = scenario("S4");
  if (imprevisto.tipo !== "CHIUSURA_LUOGO") throw new Error("S4 dovrebbe essere una CHIUSURA_LUOGO");
  const { luogoId, data, inizio, fine } = imprevisto;
  return { luogoId, data, inizio, fine };
}

// --- Varianti dell'itinerario --------------------------------------------------------------------

export function elemento(viaggio: Viaggio, id: string): Elemento {
  for (const giorno of viaggio.giorni) {
    const trovato = giorno.elementi.find((e) => e.id === id);
    if (trovato) return trovato;
  }
  throw new Error(`Elemento ${id} assente dal viaggio`);
}

export function rimuovi(viaggio: Viaggio, id: string): Viaggio {
  elemento(viaggio, id);
  for (const giorno of viaggio.giorni) giorno.elementi = giorno.elementi.filter((e) => e.id !== id);
  return viaggio;
}

export function orario(viaggio: Viaggio, id: string, inizio: string, fine: string): Viaggio {
  const trovato = elemento(viaggio, id);
  trovato.inizio = inizio;
  trovato.fine = fine;
  return viaggio;
}

export function mezzo(viaggio: Viaggio, id: string, nuovo: Mezzo): Viaggio {
  const trovato = elemento(viaggio, id);
  if (trovato.tipo !== "spostamento") throw new Error(`${id} non è uno spostamento`);
  trovato.mezzo = nuovo;
  return viaggio;
}

// --- Sorgente finta ------------------------------------------------------------------------------

export interface SorgenteFinta extends SorgenteDatiContesto {
  /** Le interrogazioni ricevute, nell'ordine. */
  readonly chiamate: string[];
}

/**
 * Sorgente dei dati di contesto finta, scritta qui e non in `src/context`: dimostra che il controllo
 * dipende solo dall'interfaccia `SorgenteDatiContesto` (CA-5). Tiene i dati in memoria e registra le chiamate.
 */
export function sorgenteFinta(dati: DatiContesto): SorgenteFinta {
  const chiamate: string[] = [];
  const stessaCoppia = (x: { da: string; a: string }, da: string, a: string): boolean =>
    (x.da === da && x.a === a) || (x.da === a && x.a === da);
  return {
    chiamate,
    tempoPercorrenza(da, a, m) {
      chiamate.push(`tempoPercorrenza ${da} ${a} ${m}`);
      return dati.tempiPercorrenza.find((t) => stessaCoppia(t, da, a) && t.mezzo === m)?.minuti ?? null;
    },
    percorsoPiuVeloce(da, a) {
      chiamate.push(`percorsoPiuVeloce ${da} ${a}`);
      const candidati = dati.tempiPercorrenza
        .filter((t) => stessaCoppia(t, da, a))
        .sort((x, y) => x.minuti - y.minuti || ORDINE_MEZZI.indexOf(x.mezzo) - ORDINE_MEZZI.indexOf(y.mezzo));
      const primo = candidati[0];
      return primo ? ({ mezzo: primo.mezzo, minuti: primo.minuti } satisfies Percorso) : null;
    },
    previsioni(zonaId, data) {
      chiamate.push(`previsioni ${zonaId} ${data}`);
      return dati.previsioni.filter((p) => p.zonaId === zonaId && p.data === data);
    },
    chiusure(luogoId, data) {
      chiamate.push(`chiusure ${luogoId} ${data}`);
      return dati.chiusure.filter((c) => c.luogoId === luogoId && c.data === data);
    },
  };
}
