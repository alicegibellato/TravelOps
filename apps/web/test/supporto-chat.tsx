/**
 * Supporto ai test della chat (REQ-CHAT-001): montaggio dei componenti nel DOM di jsdom, scrittura nel campo e attese,
 * più il copione del viaggio di riferimento costruito con il motore.
 */
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll } from "vitest";
import { copioneViaggio } from "../src/chat/copione";
import { datiValidi } from "./supporto";

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

let radice: Root | null = null;
let contenitore: HTMLElement | null = null;

/** Da chiamare una volta in cima al file di test: prepara React per i test e smonta tutto dopo ogni prova. */
export function preparaChat(): void {
  beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  });
  afterEach(() => {
    smonta();
    contenitore?.remove();
    document.body.innerHTML = "";
    radice = null;
    contenitore = null;
  });
}

/** Smonta ciò che è montato (per vedere cosa succede alla chiusura). */
export function smonta(): void {
  act(() => radice?.unmount());
  radice = null;
}

export function monta(elemento: ReactElement): HTMLElement {
  contenitore = document.createElement("div");
  document.body.append(contenitore);
  radice = createRoot(contenitore);
  act(() => radice?.render(elemento));
  return contenitore;
}

/** Lascia finire i lavori rimandati (risposte della sorgente, effetti di React). */
export async function attendi(millisecondi = 20): Promise<void> {
  await act(async () => {
    await new Promise((fatto) => setTimeout(fatto, millisecondi));
  });
}

export function clic(elemento: Element): void {
  act(() => {
    (elemento as HTMLElement).click();
  });
}

/** Scrive nel campo e invia con Invio, come fa chi usa la tastiera. */
export async function scrivi(vista: HTMLElement, testo: string): Promise<void> {
  const campo = vista.querySelector<HTMLInputElement>("input[name='messaggio']");
  if (campo === null) throw new Error("manca il campo del messaggio");
  act(() => {
    const impostaValore = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    impostaValore?.call(campo, testo);
    campo.dispatchEvent(new Event("input", { bubbles: true }));
  });
  act(() => {
    vista.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await attendi();
}

export function pulsante(vista: ParentNode, testo: string): HTMLButtonElement {
  const trovato = [...vista.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === testo);
  if (trovato === undefined) throw new Error(`manca il pulsante «${testo}»`);
  return trovato;
}

/** I testi dei messaggi, nell'ordine, senza le etichette per i lettori di schermo. */
export function messaggi(vista: ParentNode): { autore: string; testo: string }[] {
  return [...vista.querySelectorAll<HTMLElement>(".ui-chat__messaggi > li:not(.ui-chat__scrive)")].map((li) => {
    const copia = li.cloneNode(true) as HTMLElement;
    copia.querySelectorAll(".ui-scheda-chat, .ui-proposta, .ui-solo-lettori").forEach((e) => e.remove());
    return { autore: li.classList.contains("ui-chat__bolla--viaggiatore") ? "viaggiatore" : "travelops", testo: copia.textContent?.trim() ?? "" };
  });
}

/** Il copione del viaggio di riferimento (versione 1), come lo costruisce la pagina del giorno. */
export function copioneDiRiferimento() {
  return copioneViaggio("versione-1", datiValidi("versione-1"));
}
