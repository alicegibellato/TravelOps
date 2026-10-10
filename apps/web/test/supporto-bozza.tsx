/**
 * Supporto ai test di ST-PLAN-002 (REQ-PLAN-002): una bozza vera (PR-1 sull'istantanea precaricata del Garda) creata
 * dal servizio in una cartella temporanea, e la pagina della bozza montata in jsdom con le azioni collegate allo
 * stesso servizio (come le azioni lato server, senza Next.js).
 */
import type { BozzaProfilo } from "@travelops/engine";
import { servizioBozza } from "../src/bozza/server";
import type { AzioniBozza, VistaBozza } from "../src/bozza/tipi";
import { PaginaBozza } from "../src/componenti/PaginaBozza";
import { act } from "react";
import { attendi, clic, monta } from "./supporto-chat";
import { profiliDiRiferimento } from "./supporto-preferenze";
import { nuovaCartella } from "./supporto-stato";

/** L'istantanea precaricata del Garda (`packages/sources/snapshots/`). */
export const ISTANTANEA_GARDA = "garda-2026-10-09";

/** Il profilo di riferimento PR-1 con la destinazione già scelta tra quelle pronte. */
export function profiloGarda(): BozzaProfilo {
  const pr1 = profiliDiRiferimento().find((p) => p.id === "PR-1");
  if (!pr1) throw new Error("profilo PR-1 assente");
  return { ...pr1.profilo, destinazione: { tipo: "luogo", nome: "Lago di Garda", riferimento: ISTANTANEA_GARDA } };
}

export interface BozzaPronta {
  cartella: string;
  viaggioId: string;
  servizio: ReturnType<typeof servizioBozza>;
  vista: VistaBozza;
}

/** Crea la bozza con il servizio vero, come fa «Crea la mia bozza». */
export function nuovaBozza(): BozzaPronta {
  const cartella = nuovaCartella();
  const servizio = servizioBozza(cartella);
  const esito = servizio.crea(profiloGarda());
  if (esito.esito !== "creata") throw new Error(esito.messaggio);
  const viaggioId = decodeURIComponent(esito.indirizzo.split("/").at(-1) ?? "");
  const vista = servizio.vista(viaggioId);
  if (vista === null) throw new Error("bozza non trovata");
  return { cartella, viaggioId, servizio, vista };
}

/** Le azioni della pagina collegate al servizio (le azioni lato server fanno lo stesso con la cartella dei dati). */
export function azioniDi({ servizio, viaggioId }: Pick<BozzaPronta, "servizio" | "viaggioId">): AzioniBozza {
  return {
    opera: (operazione) => Promise.resolve(servizio.opera(viaggioId, operazione)),
    cambiaPreferenze: (cambio) => Promise.resolve(servizio.cambiaPreferenze(viaggioId, cambio)),
    alternative: (elementoId) => Promise.resolve(servizio.alternative(viaggioId, elementoId)),
    confronta: (da, a) => Promise.resolve(servizio.confronta(viaggioId, da, a)),
    conferma: () => Promise.resolve(servizio.conferma(viaggioId)),
    accetta: (id) => Promise.resolve(servizio.accetta(viaggioId, id)),
    rifiuta: (id) => Promise.resolve(servizio.rifiuta(viaggioId, id)),
  };
}

export function montaBozza(bozza: BozzaPronta): HTMLElement {
  return monta(<PaginaBozza vista={bozza.vista} azioni={azioniDi(bozza)} />);
}

// Radix (menu e finestre) misura gli elementi con ResizeObserver, che jsdom non ha.
globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
};

const tasto = (elemento: Element, key: string): void => {
  act(() => {
    elemento.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  });
};

const vociAperte = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>("[role='menuitem']")];

/** La voce di menu con quel testo tra i menu aperti. */
export function voceAperta(testo: string): HTMLElement | undefined {
  return vociAperte().find((v) => v.textContent?.trim() === testo);
}

/**
 * Il pulsante con quel testo dentro `radice` (il primo, se ce ne sono più). Se non c'è come pulsante, è una voce dei
 * menu «…» della scheda o del giorno: il menu si apre da tastiera e si restituisce la voce.
 */
export function pulsanteIn(radice: ParentNode, testo: string): HTMLButtonElement {
  const trovato = [...radice.querySelectorAll("button")].find((b) => b.textContent?.trim() === testo);
  if (trovato) return trovato;
  // Un solo menu aperto alla volta: chiudo quello della chiamata precedente.
  const aperto = document.querySelector("[role='menu']");
  if (aperto) tasto(aperto, "Escape");
  for (const attivatore of radice.querySelectorAll<HTMLElement>("button[aria-haspopup='menu']")) {
    tasto(attivatore, "Enter");
    const voce = voceAperta(testo);
    if (voce) return voce as HTMLButtonElement;
    tasto(document.querySelector("[role='menu']") ?? attivatore, "Escape");
  }
  throw new Error(`pulsante «${testo}» assente`);
}

/** Dal menu del giorno apre «Scambia con…» e restituisce la prima data. */
export function voceScambio(giorno: Element): HTMLElement {
  const attivatore = giorno.querySelector<HTMLElement>("button[aria-haspopup='menu']");
  if (!attivatore) throw new Error("menu del giorno assente");
  tasto(attivatore, "Enter");
  const sotto = voceAperta("Scambia con…");
  if (!sotto) throw new Error("«Scambia con…» assente");
  tasto(sotto, "ArrowRight");
  const prima = vociAperte().find((v) => v !== sotto && /\d{4}/.test(v.textContent ?? ""));
  if (!prima) throw new Error("nessun giorno con cui scambiare");
  return prima;
}

/** Dal menu del giorno apre il selettore delle attività e restituisce la prima. */
export async function primaAttivitaDelSelettore(giorno: Element): Promise<HTMLElement> {
  clic(pulsanteIn(giorno, "Aggiungi un'attività…"));
  await attendi();
  const prima = document.querySelector<HTMLElement>("[role='dialog'] .bozza__selettore-voce");
  if (!prima) throw new Error("selettore delle attività assente");
  return prima;
}

/** Clic su un pulsante e attesa della risposta del servizio. */
export async function premiEAttendi(pulsante: Element): Promise<void> {
  clic(pulsante);
  await attendi();
}

/** Le schede delle attività (pasti esclusi) di un giorno. */
export function schedeAttivita(vista: HTMLElement, data: string): HTMLElement[] {
  const giorno = vista.querySelector(`[data-data='${data}']`);
  return [...(giorno?.querySelectorAll<HTMLElement>("li[data-tipo='attivita']:not([data-pasto])") ?? [])];
}

export const revisioneMostrata = (vista: HTMLElement): string | undefined =>
  [...vista.querySelectorAll(".ui-badge")].map((b) => b.textContent ?? "").find((t) => t.startsWith("Revisione") || t.startsWith("Versione"));
