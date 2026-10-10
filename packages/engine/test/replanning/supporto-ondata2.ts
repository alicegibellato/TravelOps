/**
 * Dati degli scenari dell'ondata 2 per la ripianificazione (REQ-REPLAN-004): catalogo esteso con i dati della §8.5,
 * contesto con i tempi della §8.5 (e, solo per S11, quello della variante V-BUS), itinerari e imprevisti S9–S14.
 */
import { readFileSync } from "node:fs";
import { creaSorgenteDaDati } from "../../src/context/index.js";
import type {
  CatalogoEsteso,
  DatiContesto,
  ImprevistoEsteso,
  IstantaneaCatalogo,
  SorgenteDatiContesto,
  TempoPercorrenza,
  Viaggio,
} from "../../src/model/index.js";

export const leggi = <T>(file: string): T =>
  JSON.parse(readFileSync(new URL(`../../data/reference/${file}`, import.meta.url), "utf8")) as T;

export interface Scenario<I = ImprevistoEsteso> {
  id: string;
  titolo: string;
  itinerario: string;
  imprevisto: I;
}

const FILE_ITINERARIO: Record<string, string> = {
  "versione-1": "versione-1.json",
  "V-IRR": "variante-v-irr.json",
  "V-FISSO": "variante-v-fisso.json",
  "V-VOLO": "variante-v-volo.json",
  "V-BUS": "estensioni/variante-v-bus.json",
};

export function itinerario(nome: string): Viaggio {
  const file = FILE_ITINERARIO[nome];
  if (!file) throw new Error(`Itinerario sconosciuto: ${nome}`);
  return leggi<Viaggio>(file);
}

interface Servizi {
  luoghi: CatalogoEsteso["luoghi"];
  attivita: CatalogoEsteso["attivita"];
  tempiPercorrenza: TempoPercorrenza[];
}

/** Il catalogo esteso con i luoghi e le attività della §8.5. */
export function catalogoOndata2(): CatalogoEsteso {
  const esteso = leggi<CatalogoEsteso>("estensioni/catalogo-esteso.json");
  const servizi = leggi<Servizi>("estensioni/servizi-ondata2.json");
  return { zone: esteso.zone, luoghi: [...esteso.luoghi, ...servizi.luoghi], attivita: [...esteso.attivita, ...servizi.attivita] };
}

/** I dati di contesto di riferimento con i tempi della §8.5; con `vBus` anche gli 80 minuti in mezzi pubblici di S11. */
export function contestoOndata2(vBus = false): DatiContesto {
  const base = leggi<DatiContesto>("contesto.json");
  const servizi = leggi<Servizi>("estensioni/servizi-ondata2.json");
  const extra = vBus ? leggi<{ tempiPercorrenza: TempoPercorrenza[] }>("estensioni/contesto-v-bus.json").tempiPercorrenza : [];
  return { ...base, tempiPercorrenza: [...base.tempiPercorrenza, ...servizi.tempiPercorrenza, ...extra] };
}

export const sorgenteOndata2 = (vBus = false): SorgenteDatiContesto => creaSorgenteDaDati(contestoOndata2(vBus));

export const scenariOndata2 = (): Scenario[] => leggi<Scenario[]>("estensioni/scenari-imprevisti-estesi.json");

export function scenarioOndata2(id: string): Scenario {
  const s = scenariOndata2().find((x) => x.id === id);
  if (!s) throw new Error(`Scenario sconosciuto: ${id}`);
  return s;
}

/** L'istantanea del Garda precaricata (REQ-CAT-002), su cui nasce TRIP-DEMO-GARDA. */
export function istantaneaGarda(): IstantaneaCatalogo {
  return JSON.parse(
    readFileSync(new URL("../../../sources/snapshots/garda-2026-10-09.json", import.meta.url), "utf8"),
  ) as IstantaneaCatalogo;
}
