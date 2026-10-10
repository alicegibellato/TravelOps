/**
 * Indirizzi delle pagine della web app.
 *
 * Le viste di viaggio, giorno ed elemento si usano sia per i viaggi di riferimento (`/viaggi/<chiave>`) sia per
 * le versioni dello stato locale (`/versioni/<numero>`): la "radice" è l'indirizzo della vista viaggio da cui
 * dipendono quelli del giorno e dell'elemento.
 */

export function percorsoViaggio(chiave: string): string {
  return `/viaggi/${encodeURIComponent(chiave)}`;
}

export function percorsoGiornoDa(radice: string, data: string): string {
  return `${radice}/giorni/${encodeURIComponent(data)}`;
}

export function percorsoElementoDa(radice: string, id: string): string {
  return `${radice}/elementi/${encodeURIComponent(id)}`;
}

export function percorsoGiorno(chiave: string, data: string): string {
  return percorsoGiornoDa(percorsoViaggio(chiave), data);
}

export function percorsoElemento(chiave: string, id: string): string {
  return percorsoElementoDa(percorsoViaggio(chiave), id);
}

/** Pagina Demo: scenari S1–S8, orologio simulato, Ripristina (REQ-WEB-002). */
export const PERCORSO_DEMO = "/demo";

/** Scelta della destinazione: ricerca, avanzamento, attribuzioni e Sorprendimi (REQ-CAT-002). */
export const PERCORSO_DESTINAZIONE = "/destinazione";

/** Percorso guidato delle preferenze di viaggio (REQ-PREF-001). */
export const PERCORSO_PREFERENZE = "/preferenze";

/** Elenco e confronto delle versioni dello stato locale. */
export const PERCORSO_VERSIONI = "/versioni";

/** L'itinerario corrente: porta alla versione corrente dello stato locale. */
export const PERCORSO_ITINERARIO = "/itinerario";

export function percorsoProposta(id: number): string {
  return `${PERCORSO_DEMO}/proposte/${id}`;
}

/** Radice delle viste di una versione dello stato locale. */
export function percorsoVersione(numero: number): string {
  return `${PERCORSO_VERSIONI}/${numero}`;
}

/** Il confronto tra due versioni. */
export function percorsoConfronto(a: number, b: number): string {
  return `${PERCORSO_VERSIONI}?a=${a}&b=${b}`;
}

/** Un numero (di versione o di proposta) da un parametro dell'indirizzo; `null` se non è un intero positivo. */
export function numeroDaParametro(valore: string | string[] | undefined): number | null {
  const testo = Array.isArray(valore) ? valore[0] : valore;
  if (testo === undefined || !/^[1-9]\d{0,8}$/.test(testo)) return null;
  return Number(testo);
}
