import { readFileSync } from "node:fs";
import { creaSorgenteDaDati } from "../../src/context/index.js";
import type { Catalogo, DatiContesto, Viaggio } from "../../src/model/index.js";
import type { Orologio, ViaggioMonitorato } from "../../src/monitoring/index.js";

const leggi = <T>(file: string): T => JSON.parse(readFileSync(new URL(`../../data/reference/${file}`, import.meta.url), "utf8")) as T;

export const CATALOGO = leggi<Catalogo>("catalogo.json");
export const VIAGGIO = leggi<Viaggio>("versione-1.json");
const CONTESTO = creaSorgenteDaDati(leggi<DatiContesto>("contesto.json"));

/** Il weekend di riferimento (12–14 giugno 2026): il trekking del Ponale è sabato 13, dalle 09:00 alle 13:00. */
export function viaggioDiProva(id = "versione-1"): ViaggioMonitorato {
  return { id, viaggio: VIAGGIO, versioneBase: 1, catalogo: CATALOGO, contesto: CONTESTO };
}

/** Un orologio guidato dal test. */
export function orologioFinto(data = "2026-06-12", ora = "08:00"): Orologio & { imposta(data: string, ora: string): void } {
  let momento = { data, ora };
  return { adesso: () => ({ ...momento }), imposta: (d, o) => void (momento = { data: d, ora: o }) };
}

export const PIOGGIA_SABATO = { zonaId: "GARDA_NORD", data: "2026-06-13", fasce: [{ inizio: "08:00", fine: "13:00", condizione: "pioggia" as const }] };
