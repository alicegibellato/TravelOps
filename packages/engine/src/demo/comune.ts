/**
 * Parti comuni della demo a terminale: dove stanno i dati di riferimento, come si leggono e come si stampa
 * un elemento in una riga. Usate dagli scenari di imprevisto (S1–S8) e di modifica richiesta (M1–M6).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Elemento, Viaggio } from "../model/index.js";

/** Cartella dei dati di riferimento del pacchetto (`packages/engine/data/reference`). */
export const CARTELLA_DATI_RIFERIMENTO = fileURLToPath(new URL("../../data/reference/", import.meta.url));

/** File di ogni itinerario usato dagli scenari. */
export const FILE_ITINERARIO: Readonly<Record<string, string>> = {
  "versione-1": "versione-1.json",
  "V-IRR": "variante-v-irr.json",
  "V-FISSO": "variante-v-fisso.json",
  "V-VOLO": "variante-v-volo.json",
  "V-BUS": "estensioni/variante-v-bus.json",
};

/** Accettazione delle proposte nella demo (come REQ-ITIN-002 CA-2). */
export const ACCETTAZIONE_DEMO = { autore: "Alice", momento: { data: "2026-06-13", ora: "07:30" } } as const;

export const RIENTRO = "    ";

/** Legge un file JSON della cartella dei dati (anche con BOM). */
export function lettore(cartella: string): <T>(file: string) => T {
  return <T>(file: string): T => JSON.parse(readFileSync(join(cartella, file), "utf8").replace(/^﻿/, "")) as T;
}

/** Il viaggio di un itinerario degli scenari (`versione-1`, `V-IRR`, `V-FISSO`, `V-VOLO`). */
export function leggiItinerario(leggi: <T>(file: string) => T, nome: string, scenario: string): Viaggio {
  const file = FILE_ITINERARIO[nome];
  if (!file) throw new Error(`Itinerario sconosciuto nello scenario ${scenario}: ${nome}`);
  return leggi<Viaggio>(file);
}

/** Una riga compatta per un elemento: `D2-E1 08:40–09:00 piedi HOTEL → PONALE` o `N1 10:00–12:00 A-MAG`. */
export function compatto(e: Elemento): string {
  const base = `${e.id} ${e.inizio}–${e.fine}`;
  const extra = [e.orarioFisso === true ? "orario fisso" : "", e.prenotazione ? `prenotazione ${e.prenotazione.codice}` : ""]
    .filter((x) => x !== "")
    .join(", ");
  const corpo = e.tipo === "attivita" ? `${base} ${e.attivitaId} (${e.priorita ?? "desiderata"})` : `${base} ${e.mezzo} ${e.da} → ${e.a}`;
  return extra === "" ? corpo : `${corpo} [${extra}]`;
}
