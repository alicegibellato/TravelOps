/**
 * Supporto ai test della web app: dati di riferimento caricati con il motore e disegno delle pagine in HTML
 * (React lato server), senza browser e senza rete.
 */
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { caricaDati, type EsitoDati } from "../src/dati/carica";
import { CATALOGO_DI_RIFERIMENTO, caricaViaggioScelto, trovaVoceViaggio } from "../src/dati/viaggi";

/** JSON grezzo, da modificare liberamente per costruire le varianti dei test. */
export type Grezzo = any;

/** Il viaggio scelto (versione-1, v-irr, v-fisso, v-volo), caricato e validato: deve essere valido. */
export function datiValidi(chiave: string): Extract<EsitoDati, { ok: true }> {
  const esito = caricaViaggioScelto(chiave);
  if (esito === null) throw new Error(`viaggio ${chiave} sconosciuto`);
  if (!esito.ok) throw new Error(`dati non validi: ${esito.errori.map((e) => e.messaggio).join("; ")}`);
  return esito;
}

/** Copia nuova del JSON di un viaggio di riferimento, per costruire una variante dichiarata nel test. */
export function jsonViaggio(chiave: string): Grezzo {
  const voce = trovaVoceViaggio(chiave);
  if (voce === null) throw new Error(`viaggio ${chiave} sconosciuto`);
  return structuredClone(voce.json);
}

/** Copia nuova del JSON del catalogo di riferimento. */
export function jsonCatalogo(): Grezzo {
  return structuredClone(CATALOGO_DI_RIFERIMENTO);
}

/** Variante con catalogo modificato: carica e valida con il motore, come la web app. */
export function datiVariante(viaggio: Grezzo, catalogo: Grezzo = jsonCatalogo()): EsitoDati {
  return caricaDati(viaggio, catalogo);
}

/** L'HTML prodotto da un componente. */
export function html(elemento: ReactElement): string {
  return renderToStaticMarkup(elemento);
}

/** I valori di un attributo `data-*` nell'ordine in cui compaiono nell'HTML. */
export function valoriAttributo(markup: string, attributo: string): string[] {
  return [...markup.matchAll(new RegExp(`${attributo}="([^"]*)"`, "g"))].map((trovato) => trovato[1] ?? "");
}

/** La riga della tabella (`<tr …>…</tr>`) dell'elemento con quell'id. */
export function rigaElemento(markup: string, id: string): string {
  const trovata = new RegExp(`<tr[^>]*data-elemento="${id}"[^>]*>.*?</tr>`).exec(markup);
  if (trovata === null) throw new Error(`riga di ${id} non trovata`);
  return trovata[0];
}
