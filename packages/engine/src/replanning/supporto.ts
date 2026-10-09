/**
 * Funzioni di supporto della ripianificazione (REQ-REPLAN-002): orari, indice del catalogo,
 * posizione del viaggiatore, ricerca e ordinamento degli elementi. Funzioni pure e deterministiche:
 * nessun orologio, nessuna casualità, confronti indipendenti dalle impostazioni locali.
 */
import type {
  AttivitaCatalogo,
  Catalogo,
  Data,
  Elemento,
  ElementoAttivita,
  Giorno,
  Luogo,
  Mezzo,
  Orario,
  Percorso,
  SorgenteDatiContesto,
  Viaggio,
} from "../model/index.js";
import { giornoSettimana } from "../feasibility/orari.js";

/** Minuti di una giornata: `24:00`. */
export const FINE_GIORNATA = 24 * 60;

const FORMATO_ORARIO = /^(\d{2,}):([0-5]\d)$/;

/**
 * Minuti dalla mezzanotte di un orario `HH:mm`. Accetta anche orari oltre le `24:00`
 * (per esempio `25:10`), che l'impatto usa per dire dove slitterebbe un ritardo oltre la mezzanotte.
 */
export function minuti(orario: Orario): number {
  const parti = FORMATO_ORARIO.exec(orario);
  if (!parti) throw new Error(`Orario non valido: "${orario}". Il formato atteso è HH:mm.`);
  return Number(parti[1]) * 60 + Number(parti[2]);
}

/** Orario `HH:mm` da minuti dalla mezzanotte (oltre le 24:00 le ore continuano a crescere). */
export function orario(totale: number): Orario {
  const ore = Math.floor(totale / 60);
  return `${String(ore).padStart(2, "0")}:${String(totale % 60).padStart(2, "0")}`;
}

/** `HH:mm–HH:mm` di un elemento. */
export const orariDi = (e: { inizio: Orario; fine: Orario }): string => `${e.inizio}–${e.fine}`;

/** Confronto per punti di codice, indipendente dalle impostazioni locali (determinismo). */
export const confronta = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Elementi in ordine di inizio, poi di fine, poi di posizione originale (ordinamento stabile). */
export function ordinaElementi<T extends Elemento>(elementi: readonly T[]): T[] {
  return elementi
    .map((elemento, posizione) => ({ elemento, posizione }))
    .sort(
      (x, y) =>
        minuti(x.elemento.inizio) - minuti(y.elemento.inizio) ||
        minuti(x.elemento.fine) - minuti(y.elemento.fine) ||
        x.posizione - y.posizione,
    )
    .map((v) => v.elemento);
}

/** Il giorno del viaggio con quella data. */
export const giornoDi = (viaggio: Viaggio, data: Data): Giorno | undefined => viaggio.giorni.find((g) => g.data === data);

/** L'elemento con quell'`id` e il giorno in cui si trova. */
export function trovaElemento(viaggio: Viaggio, id: string): { giorno: Giorno; elemento: Elemento } | undefined {
  for (const giorno of viaggio.giorni) {
    const elemento = giorno.elementi.find((e) => e.id === id);
    if (elemento) return { giorno, elemento };
  }
  return undefined;
}

/** Vero se l'elemento è a orario fisso (assente vale `false`). */
export const eFisso = (elemento: Elemento): boolean => elemento.orarioFisso === true;

/** Priorità di un'attività, con il valore predefinito `desiderata`. */
export const prioritaDi = (elemento: ElementoAttivita): NonNullable<ElementoAttivita["priorita"]> =>
  elemento.priorita ?? "desiderata";

/** Copia profonda di dati JSON. */
export const copiaDati = <T>(valore: T): T => JSON.parse(JSON.stringify(valore)) as T;

export const DESCRIZIONE_MEZZO: Readonly<Record<Mezzo, string>> = {
  piedi: "a piedi",
  mezzi_pubblici: "con i mezzi pubblici",
  treno: "in treno",
  auto: "in auto",
  volo: "in aereo",
};

/** Accesso al catalogo per `id`, con nomi leggibili per le spiegazioni. */
export class IndiceCatalogo {
  readonly attivita: ReadonlyMap<string, AttivitaCatalogo>;
  readonly luoghi: ReadonlyMap<string, Luogo>;
  private readonly zone: ReadonlyMap<string, string>;

  constructor(readonly catalogo: Catalogo) {
    this.attivita = new Map(catalogo.attivita.map((a) => [a.id, a]));
    this.luoghi = new Map(catalogo.luoghi.map((l) => [l.id, l]));
    this.zone = new Map(catalogo.zone.map((z) => [z.id, z.nome]));
  }

  attivitaDi(elemento: ElementoAttivita): AttivitaCatalogo {
    const attivita = this.attivita.get(elemento.attivitaId);
    if (!attivita) throw new Error(`L'attività ${elemento.attivitaId} di ${elemento.id} non è nel catalogo.`);
    return attivita;
  }

  /** Luogo in cui l'elemento inizia: il luogo dell'attività o la partenza dello spostamento. */
  luogoInizio(elemento: Elemento): string {
    return elemento.tipo === "spostamento" ? elemento.da : this.attivitaDi(elemento).luogoId;
  }

  /** Luogo in cui l'elemento finisce: il luogo dell'attività o l'arrivo dello spostamento. */
  luogoFine(elemento: Elemento): string {
    return elemento.tipo === "spostamento" ? elemento.a : this.attivitaDi(elemento).luogoId;
  }

  nomeLuogo(id: string): string {
    return this.luoghi.get(id)?.nome ?? id;
  }

  nomeZona(id: string): string {
    return this.zone.get(id) ?? id;
  }

  /** `D2-E2 «Trekking sul Sentiero del Ponale»` oppure `D2-E1 (a piedi da «Hotel» a «MAG»)`. */
  descrivi(elemento: Elemento): string {
    if (elemento.tipo === "attivita") {
      return `${elemento.id} «${this.attivita.get(elemento.attivitaId)?.nome ?? elemento.attivitaId}»`;
    }
    return `${elemento.id} (${this.tratta(elemento.da, elemento.a, elemento.mezzo)})`;
  }

  /** `a piedi da «Hotel» a «MAG»`. */
  tratta(da: string, a: string, mezzo: Mezzo): string {
    return `${DESCRIZIONE_MEZZO[mezzo]} da «${this.nomeLuogo(da)}» a «${this.nomeLuogo(a)}»`;
  }

  /**
   * Fasce di apertura del luogo nella data, in minuti e in ordine di apertura;
   * "sempre aperto" vale come un'unica fascia 00:00–24:00. Nessuna fascia = chiuso.
   */
  fasceApertura(luogoId: string, data: Data): { apertura: number; chiusura: number }[] {
    const luogo = this.luoghi.get(luogoId);
    if (!luogo) return [];
    if ("sempre" in luogo.apertura) return [{ apertura: 0, chiusura: FINE_GIORNATA }];
    const giorno = giornoSettimana(data);
    if (giorno === null) return [];
    return luogo.apertura.settimana[giorno]
      .map((f) => ({ apertura: minuti(f.apertura), chiusura: minuti(f.chiusura) }))
      .sort((x, y) => x.apertura - y.apertura || x.chiusura - y.chiusura);
  }
}

/** Il percorso più veloce tra due luoghi; tra luoghi coincidenti non serve spostarsi (0 minuti). */
export function percorso(sorgente: SorgenteDatiContesto, da: string, a: string): Percorso | null {
  if (da === a) return { mezzo: "piedi", minuti: 0 };
  return sorgente.percorsoPiuVeloce(da, a);
}

/** "a", "a e b", "a, b e c". */
export function elenca(voci: readonly string[]): string {
  if (voci.length <= 1) return voci.join("");
  return `${voci.slice(0, -1).join(", ")} e ${voci.at(-1)}`;
}

/** "1 minuto", "30 minuti". */
export const minutiTesto = (n: number): string => (n === 1 ? "1 minuto" : `${n} minuti`);
