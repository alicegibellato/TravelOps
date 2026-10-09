/**
 * Funzioni di supporto del modulo history: segnalazioni, momento, uguaglianza profonda, copia e congelamento.
 * Nessun orologio, nessuna casualità.
 */
import type { CodiceStorico, Momento, SegnalazioneStorico } from "./tipi.js";

export function segnalazione(codice: CodiceStorico, motivo: string, dettagli: string[] = []): SegnalazioneStorico {
  return { codice, messaggio: `[${codice}] ${motivo}`, dettagli };
}

const FORMATO_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;
const FORMATO_ORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

function bisestile(anno: number): boolean {
  return (anno % 4 === 0 && anno % 100 !== 0) || anno % 400 === 0;
}

/** Vero se il testo è una data `AAAA-MM-GG` che esiste nel calendario. */
export function eDataValida(testo: unknown): testo is string {
  if (typeof testo !== "string") return false;
  const parti = FORMATO_DATA.exec(testo);
  if (parti === null) return false;
  const anno = Number(parti[1]);
  const mese = Number(parti[2]);
  const giorno = Number(parti[3]);
  if (mese < 1 || mese > 12 || giorno < 1) return false;
  const giorniDelMese = [31, bisestile(anno) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mese - 1] ?? 0;
  return giorno <= giorniDelMese;
}

/** Vero se il testo è un'ora `HH:mm` tra `00:00` e `23:59`. */
export function eOraValida(testo: unknown): testo is string {
  return typeof testo === "string" && FORMATO_ORA.test(testo);
}

/** Il motivo per cui il momento non è valido, oppure `null` se è valido. */
export function problemaMomento(momento: unknown): string | null {
  if (typeof momento !== "object" || momento === null || Array.isArray(momento)) {
    return "il momento deve indicare data e ora";
  }
  const { data, ora } = momento as { data?: unknown; ora?: unknown };
  const motivi: string[] = [];
  if (!eDataValida(data)) motivi.push(`la data (${descrivi(data)}) non è una data valida nel formato AAAA-MM-GG`);
  if (!eOraValida(ora)) motivi.push(`l'ora (${descrivi(ora)}) non è un'ora valida nel formato HH:mm`);
  return motivi.length === 0 ? null : motivi.join("; ");
}

/** Copia del momento con i soli campi del modello. */
export function copiaMomento(momento: Momento): Momento {
  return { data: momento.data, ora: momento.ora };
}

/** Descrizione breve di un valore per i messaggi. */
export function descrivi(valore: unknown): string {
  if (valore === undefined) return "assente";
  if (typeof valore === "string") return `"${valore}"`;
  return JSON.stringify(valore) ?? String(valore);
}

/** Uguaglianza profonda di dati JSON; l'ordine delle chiavi non conta, quello degli elenchi sì. */
export function uguali(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((voce, i) => uguali(voce, b[i]));
  }
  const oa = a as Record<string, unknown>;
  const ob = b as Record<string, unknown>;
  const chiaviA = Object.keys(oa).filter((k) => oa[k] !== undefined);
  const chiaviB = Object.keys(ob).filter((k) => ob[k] !== undefined);
  return chiaviA.length === chiaviB.length && chiaviA.every((k) => Object.hasOwn(ob, k) && uguali(oa[k], ob[k]));
}

/** Copia profonda di dati JSON: chi la riceve può modificarla senza toccare l'originale. */
export function copia<T>(valore: T): T {
  return JSON.parse(JSON.stringify(valore)) as T;
}

/** Congela in profondità un dato (R-2): ogni tentativo di modifica fallisce. */
export function congela<T>(valore: T): T {
  if (typeof valore === "object" && valore !== null && !Object.isFrozen(valore)) {
    Object.freeze(valore);
    for (const figlio of Object.values(valore)) congela(figlio);
  }
  return valore;
}
