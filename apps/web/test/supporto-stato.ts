/**
 * Supporto ai test di REQ-WEB-002 e REQ-DATA-001: una cartella temporanea per la base dati (mai `apps/web/.data`),
 * azioni finte per disegnare i componenti e il testo come lo scrive React nell'HTML.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach } from "vitest";
import type { AzioniDemo, AzioniProposta } from "../src/componenti/azioni";
import { conBaseDati, testoStoricoDelViaggio, type BaseDati } from "../src/basedati";
import { leggiStato } from "../src/stato/archivio";
import type { StatoDemo } from "../src/stato/stato";

const create: string[] = [];

afterEach(() => {
  for (const cartella of create.splice(0)) rmSync(cartella, { recursive: true, force: true });
});

/** Una cartella vuota per lo stato, cancellata alla fine del test. */
export function nuovaCartella(): string {
  const cartella = mkdtempSync(join(tmpdir(), "travelops-web-"));
  create.push(cartella);
  return cartella;
}

/** Lo stato salvato: deve essere valido. */
export function statoSalvato(cartella: string): StatoDemo {
  const letto = leggiStato(cartella);
  if (!letto.ok) throw new Error(`stato non valido: ${letto.motivo}`);
  return letto.stato;
}

/** Lo storico del viaggio di partenza come è salvato nella base dati (il testo di `esportaStorico`). */
export function storicoNelDatabase(cartella: string): string {
  const partenza = statoSalvato(cartella).partenza;
  const testo = conBaseDati(cartella, (db) => testoStoricoDelViaggio(db, partenza));
  if (testo === null) throw new Error(`nessuno storico per ${partenza}`);
  return testo;
}

/** Lavora direttamente sulla base dati della cartella (senza il primo avvio), per esempio per manometterla. */
export function sullaBaseDati<T>(cartella: string, lavoro: (db: BaseDati) => T): T {
  return conBaseDati(cartella, lavoro);
}

const nessuna = (): void => undefined;

export const AZIONI_DEMO: AzioniDemo = { avviaScenario: nessuna, impostaOrologio: nessuna, ripristina: nessuna };
export const AZIONI_PROPOSTA: AzioniProposta = { accetta: nessuna, rifiuta: nessuna };
export const RIPRISTINA = nessuna;

/** Il testo come compare nell'HTML prodotto da React (caratteri speciali sostituiti). */
export function comeHtml(testo: string): string {
  return testo.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;");
}

/** Il frammento di HTML dall'elemento con quell'attributo `data-*` fino alla sua chiusura (`</li>`, `</tr>`…). */
export function frammento(markup: string, attributo: string, valore: string, chiusura: string): string {
  const inizio = markup.indexOf(`${attributo}="${valore}"`);
  if (inizio < 0) throw new Error(`${attributo}="${valore}" non trovato`);
  const fine = markup.indexOf(chiusura, inizio);
  return markup.slice(inizio, fine < 0 ? undefined : fine + chiusura.length);
}

/** I campi di un modulo. */
export function modulo(campi: Record<string, string>): FormData {
  const dati = new FormData();
  for (const [nome, valore] of Object.entries(campi)) dati.set(nome, valore);
  return dati;
}
