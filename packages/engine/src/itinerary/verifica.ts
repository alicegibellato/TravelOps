/**
 * Lettura difensiva del JSON: ogni lettore controlla un campo, registra gli errori trovati e
 * restituisce il valore solo se è valido. Nessun lettore solleva eccezioni sui dati non validi (CA-7).
 */
import type { Coordinate, Prenotazione } from "../model/index.js";
import { creaErrore, type CodiceErrore, type ErroreValidazione, type RisultatoCaricamento } from "./errori.js";
import { descrivi, FINE_GIORNATA, minutiDaOrario, numeroDaData } from "./valori.js";

export type Oggetto = Record<string, unknown>;

/** Dove si trova il campo letto: chi è coinvolto (`id`) e la posizione nel JSON (`base`). */
export interface Posizione {
  id: string;
  base: string;
}

export interface OrarioLetto {
  testo: string;
  minuti: number;
}

export interface DataLetta {
  testo: string;
  numero: number;
}

export function eOggetto(valore: unknown): valore is Oggetto {
  return typeof valore === "object" && valore !== null && !Array.isArray(valore);
}

export function percorso(base: string, campo: string | number): string {
  if (typeof campo === "number") return `${base}[${campo}]`;
  return base === "" ? campo : `${base}.${campo}`;
}

/** Valore di un campo proprio dell'oggetto; `null` vale come assente. */
export function campo(oggetto: Oggetto, nome: string): unknown {
  if (!Object.hasOwn(oggetto, nome)) return undefined;
  const valore = oggetto[nome];
  return valore === null ? undefined : valore;
}

/** Raccoglie gli errori di un caricamento o di una validazione, nell'ordine in cui li trova. */
export class Verifica {
  readonly errori: ErroreValidazione[] = [];

  segnala(codice: CodiceErrore, id: string, dove: string, motivo: string): void {
    this.errori.push(creaErrore(codice, id, dove, motivo));
  }

  private mancante(pos: Posizione, nome: string): void {
    this.segnala("CAMPO_MANCANTE", pos.id, percorso(pos.base, nome), `manca il campo obbligatorio "${nome}"`);
  }

  /** Testo non vuoto. Un testo vuoto vale come assente. */
  testo(oggetto: Oggetto, nome: string, pos: Posizione, obbligatorio = true): string | undefined {
    const valore = campo(oggetto, nome);
    if (valore === undefined || (typeof valore === "string" && valore.trim() === "")) {
      if (obbligatorio) this.mancante(pos, nome);
      return undefined;
    }
    if (typeof valore !== "string") {
      this.segnala(
        "VALORE_NON_VALIDO",
        pos.id,
        percorso(pos.base, nome),
        `il campo "${nome}" deve essere un testo (valore trovato: ${descrivi(valore)})`,
      );
      return undefined;
    }
    return valore;
  }

  /** Numero intero non minore di `minimo`. */
  intero(oggetto: Oggetto, nome: string, pos: Posizione, minimo: number, descrizione: string): number | undefined {
    const valore = campo(oggetto, nome);
    if (valore === undefined) {
      this.mancante(pos, nome);
      return undefined;
    }
    if (typeof valore !== "number" || !Number.isInteger(valore) || valore < minimo) {
      this.segnala(
        "VALORE_NON_VALIDO",
        pos.id,
        percorso(pos.base, nome),
        `${descrizione} deve essere un numero intero maggiore o uguale a ${minimo} (valore trovato: ${descrivi(valore)})`,
      );
      return undefined;
    }
    return valore;
  }

  booleano(oggetto: Oggetto, nome: string, pos: Posizione, obbligatorio: boolean): boolean | undefined {
    const valore = campo(oggetto, nome);
    if (valore === undefined) {
      if (obbligatorio) this.mancante(pos, nome);
      return undefined;
    }
    if (typeof valore !== "boolean") {
      this.segnala(
        "VALORE_NON_VALIDO",
        pos.id,
        percorso(pos.base, nome),
        `il campo "${nome}" deve essere true o false (valore trovato: ${descrivi(valore)})`,
      );
      return undefined;
    }
    return valore;
  }

  /** Uno dei valori ammessi (R-8). */
  scelta<T extends string>(
    oggetto: Oggetto,
    nome: string,
    ammessi: readonly T[],
    pos: Posizione,
    obbligatorio = true,
  ): T | undefined {
    const valore = campo(oggetto, nome);
    if (valore === undefined || valore === "") {
      if (obbligatorio) this.mancante(pos, nome);
      return undefined;
    }
    const trovato = ammessi.find((ammesso) => ammesso === valore);
    if (trovato === undefined) {
      this.segnala(
        "VALORE_NON_VALIDO",
        pos.id,
        percorso(pos.base, nome),
        `il valore ${descrivi(valore)} del campo "${nome}" non è ammesso (valori ammessi: ${ammessi.join(", ")})`,
      );
    }
    return trovato;
  }

  elenco(oggetto: Oggetto, nome: string, pos: Posizione): readonly unknown[] | undefined {
    const valore = campo(oggetto, nome);
    if (valore === undefined) {
      this.mancante(pos, nome);
      return undefined;
    }
    if (!Array.isArray(valore)) {
      this.segnala(
        "VALORE_NON_VALIDO",
        pos.id,
        percorso(pos.base, nome),
        `il campo "${nome}" deve essere un elenco (valore trovato: ${descrivi(valore)})`,
      );
      return undefined;
    }
    return valore;
  }

  /**
   * Orario `HH:mm` (R-2) entro la giornata (R-3). Con `ruolo` `"inizio"` le 24:00 non sono ammesse:
   * `24:00` vale solo come fine.
   */
  orario(oggetto: Oggetto, nome: string, pos: Posizione, ruolo: "inizio" | "fine"): OrarioLetto | undefined {
    const valore = campo(oggetto, nome);
    const dove = percorso(pos.base, nome);
    if (valore === undefined || valore === "") {
      this.mancante(pos, nome);
      return undefined;
    }
    if (typeof valore !== "string") {
      this.segnala(
        "ORARIO_NON_VALIDO",
        pos.id,
        dove,
        `il campo "${nome}" deve essere un orario nel formato HH:mm (valore trovato: ${descrivi(valore)})`,
      );
      return undefined;
    }
    const minuti = minutiDaOrario(valore);
    if (minuti === null) {
      this.segnala(
        "ORARIO_NON_VALIDO",
        pos.id,
        dove,
        `l'orario "${valore}" del campo "${nome}" non è nel formato HH:mm (due cifre per le ore, minuti da 00 a 59)`,
      );
      return undefined;
    }
    if (minuti > FINE_GIORNATA) {
      this.segnala("FUORI_GIORNATA", pos.id, dove, `l'orario "${valore}" del campo "${nome}" supera le 24:00`);
      return undefined;
    }
    if (ruolo === "inizio" && minuti === FINE_GIORNATA) {
      this.segnala(
        "FUORI_GIORNATA",
        pos.id,
        dove,
        `il campo "${nome}" vale 24:00: 24:00 è ammesso solo come orario di fine`,
      );
      return undefined;
    }
    return { testo: valore, minuti };
  }

  /** Data `AAAA-MM-GG` esistente nel calendario. */
  data(oggetto: Oggetto, nome: string, pos: Posizione): DataLetta | undefined {
    const valore = campo(oggetto, nome);
    if (valore === undefined || valore === "") {
      this.mancante(pos, nome);
      return undefined;
    }
    const numero = typeof valore === "string" ? numeroDaData(valore) : null;
    if (typeof valore !== "string" || numero === null) {
      this.segnala(
        "VALORE_NON_VALIDO",
        pos.id,
        percorso(pos.base, nome),
        `la data ${descrivi(valore)} del campo "${nome}" non è una data valida nel formato AAAA-MM-GG`,
      );
      return undefined;
    }
    return { testo: valore, numero };
  }

  /** Coordinate facoltative: latitudine da −90 a 90, longitudine da −180 a 180 (R-8). */
  coordinate(oggetto: Oggetto, nome: string, pos: Posizione): Coordinate | undefined {
    const valore = campo(oggetto, nome);
    if (valore === undefined) return undefined;
    const base = percorso(pos.base, nome);
    if (!eOggetto(valore)) {
      this.segnala(
        "VALORE_NON_VALIDO",
        pos.id,
        base,
        `il campo "${nome}" deve essere un oggetto con lat e lon (valore trovato: ${descrivi(valore)})`,
      );
      return undefined;
    }
    const interna: Posizione = { id: pos.id, base };
    const lat = this.gradi(valore, "lat", interna, 90, "la latitudine");
    const lon = this.gradi(valore, "lon", interna, 180, "la longitudine");
    if (lat === undefined || lon === undefined) return undefined;
    return { lat, lon };
  }

  private gradi(oggetto: Oggetto, nome: string, pos: Posizione, limite: number, descrizione: string): number | undefined {
    const valore = campo(oggetto, nome);
    if (valore === undefined) {
      this.mancante(pos, nome);
      return undefined;
    }
    if (typeof valore !== "number" || !Number.isFinite(valore)) {
      this.segnala(
        "VALORE_NON_VALIDO",
        pos.id,
        percorso(pos.base, nome),
        `${descrizione} deve essere un numero da −${limite} a ${limite} (valore trovato: ${descrivi(valore)})`,
      );
      return undefined;
    }
    if (valore < -limite || valore > limite) {
      this.segnala(
        "VALORE_NON_VALIDO",
        pos.id,
        percorso(pos.base, nome),
        `${descrizione} ${valore} è fuori dall'intervallo da −${limite} a ${limite}`,
      );
      return undefined;
    }
    return valore;
  }

  /** Prenotazione facoltativa: fornitore, codice e link di gestione `https://` facoltativo (R-8). */
  prenotazione(oggetto: Oggetto, pos: Posizione): Prenotazione | undefined {
    const valore = campo(oggetto, "prenotazione");
    if (valore === undefined) return undefined;
    const base = percorso(pos.base, "prenotazione");
    if (!eOggetto(valore)) {
      this.segnala(
        "VALORE_NON_VALIDO",
        pos.id,
        base,
        `la prenotazione deve essere un oggetto con fornitore e codice (valore trovato: ${descrivi(valore)})`,
      );
      return undefined;
    }
    const interna: Posizione = { id: pos.id, base };
    const fornitore = this.testo(valore, "fornitore", interna);
    const codice = this.testo(valore, "codice", interna);
    const link = this.testo(valore, "linkGestione", interna, false);
    let linkValido = true;
    if (link !== undefined && !link.startsWith("https://")) {
      linkValido = false;
      this.segnala(
        "VALORE_NON_VALIDO",
        pos.id,
        percorso(base, "linkGestione"),
        `il link di gestione "${link}" non inizia con "https://"`,
      );
    }
    if (fornitore === undefined || codice === undefined || !linkValido) return undefined;
    return { fornitore, codice, ...(link !== undefined ? { linkGestione: link } : {}) };
  }
}

/**
 * Il caricamento riceve il JSON già letto: un testo da decodificare oppure il valore già decodificato.
 * Un testo che non è JSON è un `VALORE_NON_VALIDO` sul documento intero.
 */
export function decodifica(json: unknown, radice: string, verifica: Verifica): { dati: unknown } | null {
  if (typeof json !== "string") return { dati: json };
  try {
    return { dati: JSON.parse(json) as unknown };
  } catch {
    verifica.segnala("VALORE_NON_VALIDO", radice, "", "il testo ricevuto non è un JSON valido");
    return null;
  }
}

/**
 * Esegue un'analisi e restituisce il valore oppure tutti gli errori. È l'ultima garanzia di CA-7:
 * anche un dato che non si riesce a leggere (per esempio un oggetto che solleva eccezioni) diventa un errore.
 */
export function eseguiCaricamento<T>(radice: string, analizza: (verifica: Verifica) => T | null): RisultatoCaricamento<T> {
  const verifica = new Verifica();
  let valore: T | null = null;
  try {
    valore = analizza(verifica);
  } catch {
    valore = null;
    verifica.segnala("VALORE_NON_VALIDO", radice, "", "i dati non si possono leggere: struttura non riconosciuta");
  }
  if (valore !== null && verifica.errori.length === 0) return { ok: true, valore };
  if (verifica.errori.length === 0) {
    verifica.segnala("VALORE_NON_VALIDO", radice, "", "i dati non si possono leggere: struttura non riconosciuta");
  }
  return { ok: false, errori: verifica.errori };
}
