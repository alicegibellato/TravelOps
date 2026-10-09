// @vitest-environment jsdom
/**
 * REQ-UX-001 CA-5 (tastiera): ogni componente interattivo si usa da tastiera. I componenti si montano davvero (React
 * nel DOM di jsdom) e si usano come farebbe chi naviga con la tastiera: elementi raggiungibili con Tab (pulsanti e
 * campi nativi, oppure `tabindex="0"` con un ruolo), tasti freccia, Inizio, Fine ed Esc dove servono.
 * Il focus visibile e il percorso con Tab nel browser vero sono in `ux001-browser.test.tsx`.
 */
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ChipSelezionabile } from "../src/ui/Chip";
import { Contatore } from "../src/ui/Contatore";
import { ChiudiFinestra, FinestraModale, PannelloLaterale } from "../src/ui/Finestra";
import { LayoutViaggio } from "../src/ui/LayoutViaggio";
import { EsempioNotifica } from "../src/ui/Notifica";
import { PannelloChat } from "../src/ui/PannelloChat";
import { Pulsante } from "../src/ui/Pulsante";
import { SelettoreDate } from "../src/ui/SelettoreDate";
import { SelettoreTema } from "../src/ui/SelettoreTema";
import { Cursore } from "../src/ui/Slider";
import { CHIAVE_TEMA } from "../src/ui/tema";

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  // jsdom non ha ResizeObserver (lo usa lo slider di Radix UI per misurare il pomello).
  globalThis.ResizeObserver ??= class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
});

let radice: Root | null = null;
let contenitore: HTMLElement | null = null;

afterEach(() => {
  act(() => radice?.unmount());
  contenitore?.remove();
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("data-tema");
  localStorage.clear();
});

function monta(elemento: ReactElement): HTMLElement {
  contenitore = document.createElement("div");
  document.body.append(contenitore);
  radice = createRoot(contenitore);
  act(() => radice?.render(elemento));
  return contenitore;
}

/** Lascia finire i lavori rimandati di React e Radix UI (per esempio il ritorno del focus). */
async function attendi(): Promise<void> {
  await act(async () => {
    await new Promise((fatto) => setTimeout(fatto, 20));
  });
}

function tasto(elemento: Element, key: string): void {
  act(() => {
    elemento.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  });
}

/** Attiva un pulsante come fanno Invio e Spazio: il browser lo trasforma in un clic sul pulsante che ha il focus. */
function attiva(elemento: HTMLElement): void {
  act(() => {
    elemento.focus();
    elemento.click();
  });
}

/** Un elemento si raggiunge con Tab se è un controllo nativo attivo o ha `tabindex="0"`. */
function raggiungibile(elemento: Element): boolean {
  const nativo = elemento.matches("button:not([disabled]), a[href], input:not([type='hidden']):not([disabled]), select, textarea, summary");
  return nativo ? elemento.getAttribute("tabindex") !== "-1" : elemento.getAttribute("tabindex") === "0";
}

describe("CA-5 ogni componente interattivo si usa da tastiera", () => {
  it("CA-5 pulsanti: elementi <button> nativi (Tab, Invio, Spazio)", () => {
    const vista = monta(
      <>
        <Pulsante variante="primario">Accetta</Pulsante>
        <Pulsante variante="secondario">Rifiuta</Pulsante>
        <Pulsante variante="testo">Annulla</Pulsante>
      </>,
    );
    const pulsanti = [...vista.querySelectorAll("button")];
    expect(pulsanti).toHaveLength(3);
    for (const p of pulsanti) {
      expect(raggiungibile(p)).toBe(true);
      expect(p.getAttribute("type")).toBe("button");
    }
  });

  it("CA-5 chip: pulsante con aria-pressed, che cambia stato a ogni attivazione", () => {
    const vista = monta(<ChipSelezionabile etichetta="Natura" stile="natura" />);
    const chip = vista.querySelector("button");
    if (chip === null) throw new Error("chip mancante");
    expect(raggiungibile(chip)).toBe(true);
    expect(chip.getAttribute("aria-pressed")).toBe("false");
    attiva(chip);
    expect(document.activeElement).toBe(chip);
    expect(chip.getAttribute("aria-pressed")).toBe("true");
    attiva(chip);
    expect(chip.getAttribute("aria-pressed")).toBe("false");
  });

  it("CA-5 slider: frecce, Inizio e Fine cambiano il valore, letto in parole", () => {
    const vista = monta(<Cursore etichetta="Ritmo" min={2} max={4} predefinito={3} unita={{ singolare: "attività", plurale: "attività" }} />);
    const pomello = vista.querySelector("[role='slider']");
    if (!(pomello instanceof HTMLElement)) throw new Error("slider mancante");
    expect(raggiungibile(pomello)).toBe(true);
    expect(pomello.getAttribute("aria-labelledby")).not.toBeNull();
    act(() => pomello.focus());
    tasto(pomello, "ArrowRight");
    expect(pomello.getAttribute("aria-valuenow")).toBe("4");
    expect(pomello.getAttribute("aria-valuetext")).toBe("4 attività");
    tasto(pomello, "Home");
    expect(pomello.getAttribute("aria-valuenow")).toBe("2");
    tasto(pomello, "ArrowUp");
    expect(pomello.getAttribute("aria-valuenow")).toBe("3");
    tasto(pomello, "End");
    expect(pomello.getAttribute("aria-valuenow")).toBe("4");
  });

  it("CA-5 contatore: pulsanti − e + con nome, valore annunciato, pulsante disattivato al limite", () => {
    const vista = monta(<Contatore etichetta="Adulti" min={1} max={3} predefinito={2} unita={{ singolare: "adulto", plurale: "adulti" }} />);
    const [meno, piu] = [...vista.querySelectorAll("button")];
    const valore = vista.querySelector("output");
    if (meno === undefined || piu === undefined || valore === null) throw new Error("contatore incompleto");
    expect(meno.getAttribute("aria-label")).toBe("Togli uno: Adulti");
    expect(valore.getAttribute("aria-live")).toBe("polite");
    attiva(piu);
    expect(valore.textContent).toBe("3 adulti");
    expect(piu.disabled).toBe(true);
    attiva(meno);
    attiva(meno);
    expect(valore.textContent).toBe("1 adulto");
    expect(meno.disabled).toBe(true);
  });

  it("CA-5 selettore di date e periodi: scelte native raggruppate, campi data e mese raggiungibili", () => {
    const vista = monta(<SelettoreDate dal="2026-06-12" al="2026-06-14" />);
    const scelte = [...vista.querySelectorAll<HTMLInputElement>("input[type='radio']")];
    expect(scelte).toHaveLength(2);
    expect(new Set(scelte.map((s) => s.name)).size).toBe(1);
    expect(vista.querySelector("fieldset > legend")?.textContent).toBe("Quando parti?");
    expect([...vista.querySelectorAll("input[type='date']")].every(raggiungibile)).toBe(true);
    attiva(scelte[1] as HTMLInputElement);
    expect(vista.querySelector("select[name='mese']")).not.toBeNull();
    expect(vista.querySelectorAll("input[type='date']")).toHaveLength(0);
  });

  it("CA-5 finestra modale: si apre dal pulsante, il focus entra, Esc chiude e il focus torna al pulsante", async () => {
    const vista = monta(
      <FinestraModale
        titolo="Vuoi togliere la visita?"
        descrizione="Puoi sempre annullare."
        attivatore={<Pulsante variante="secondario">Apri</Pulsante>}
        azioni={
          <ChiudiFinestra>
            <Pulsante>Togli</Pulsante>
          </ChiudiFinestra>
        }
      />,
    );
    const apri = vista.querySelector("button");
    if (apri === null) throw new Error("pulsante mancante");
    expect(apri.getAttribute("aria-haspopup")).toBe("dialog");
    attiva(apri);
    const finestra = document.querySelector("[role='dialog']");
    if (finestra === null) throw new Error("la finestra non si è aperta");
    expect(finestra.getAttribute("aria-labelledby")).not.toBeNull();
    expect(finestra.contains(document.activeElement)).toBe(true);
    expect(finestra.querySelector("button[aria-label='Chiudi']")).not.toBeNull();
    tasto(document.activeElement ?? finestra, "Escape");
    expect(document.querySelector("[role='dialog']")).toBeNull();
    await attendi();
    expect(document.activeElement).toBe(apri);
  });

  it("CA-5 pannello laterale: stesso comportamento della finestra (focus dentro, Esc chiude)", async () => {
    const vista = monta(
      <PannelloLaterale titolo="Visita al MAG" attivatore={<Pulsante variante="secondario">Dettagli</Pulsante>}>
        <p>Museo Alto Garda</p>
      </PannelloLaterale>,
    );
    const apri = vista.querySelector("button");
    if (apri === null) throw new Error("pulsante mancante");
    attiva(apri);
    const pannello = document.querySelector("[role='dialog']");
    expect(pannello?.classList.contains("ui-pannello")).toBe(true);
    expect(pannello?.contains(document.activeElement)).toBe(true);
    tasto(document.activeElement ?? document.body, "Escape");
    expect(document.querySelector("[role='dialog']")).toBeNull();
    await attendi();
    expect(document.activeElement).toBe(apri);
  });

  it("CA-5 notifica breve: compare da un pulsante, è annunciata e si chiude con il suo pulsante", () => {
    const vista = monta(<EsempioNotifica />);
    const mostra = vista.querySelector("button");
    if (mostra === null) throw new Error("pulsante mancante");
    attiva(mostra);
    const notifica = document.querySelector(".ui-notifica");
    if (notifica === null) throw new Error("la notifica non è comparsa");
    expect(notifica.textContent).toContain("Ho sostituito il trekking con la visita al MAG");
    const annulla = [...notifica.querySelectorAll("button")].find((b) => b.textContent === "Annulla");
    const chiudi = notifica.querySelector("button[aria-label='Chiudi la notifica']");
    expect(annulla !== undefined && raggiungibile(annulla)).toBe(true);
    if (!(chiudi instanceof HTMLElement)) throw new Error("manca il pulsante per chiudere");
    attiva(chiudi);
    expect(document.querySelector(".ui-notifica[data-state='open']")).toBeNull();
  });

  it("CA-5 selettore del tema: tre scelte native; la scelta si applica alla pagina e si ricorda", () => {
    const vista = monta(<SelettoreTema />);
    const scelte = [...vista.querySelectorAll<HTMLInputElement>("input[type='radio']")];
    expect(scelte.map((s) => s.value)).toEqual(["sistema", "chiaro", "scuro"]);
    expect(vista.querySelector("fieldset > legend")?.textContent).toBe("Tema");
    for (const s of scelte) expect(s.closest("label")?.textContent).not.toBe("");
    attiva(scelte[2] as HTMLInputElement);
    expect(document.documentElement.getAttribute("data-tema")).toBe("scuro");
    expect(localStorage.getItem(CHIAVE_TEMA)).toBe("scuro");
    attiva(scelte[0] as HTMLInputElement);
    expect(document.documentElement.hasAttribute("data-tema")).toBe(false);
    expect(localStorage.getItem(CHIAVE_TEMA)).toBeNull();
  });

  it("CA-5 layout del viaggio: le schede in basso sono pulsanti con aria-pressed; la chat si chiude e si riapre", () => {
    const vista = monta(<LayoutViaggio itinerario={<p>Programma</p>} mappa={<p>Mappa</p>} chat={<p>Chat</p>} oggi={<p>Oggi</p>} />);
    const schede = [...vista.querySelectorAll<HTMLButtonElement>(".ui-schede-basso button")];
    expect(schede.map((s) => s.textContent)).toEqual(["Itinerario", "Mappa", "Chat", "Oggi"]);
    expect(schede.every(raggiungibile)).toBe(true);
    attiva(schede[1] as HTMLButtonElement);
    expect(schede.map((s) => s.getAttribute("aria-pressed"))).toEqual(["false", "true", "false", "false"]);
    expect(vista.querySelector("[data-riquadro='mappa']")?.getAttribute("data-attivo")).toBe("true");
    expect(vista.querySelector("[data-riquadro='itinerario']")?.getAttribute("data-attivo")).toBe("false");
    const chiudi = vista.querySelector<HTMLButtonElement>(".ui-layout-viaggio__chiudi-chat");
    if (chiudi === null) throw new Error("manca il pulsante della chat");
    expect(chiudi.getAttribute("aria-expanded")).toBe("true");
    attiva(chiudi);
    expect(chiudi.getAttribute("aria-expanded")).toBe("false");
    expect(chiudi.textContent).toBe("Apri la chat");
  });

  it("CA-5 pannello chat: risposte rapide e invio sono pulsanti, il campo ha un'etichetta", () => {
    const vista = monta(<PannelloChat messaggi={[{ autore: "travelops", testo: "Ciao!" }]} risposteRapide={["Va bene", "Mostrami un'alternativa"]} />);
    const rapide = [...vista.querySelectorAll<HTMLButtonElement>(".ui-chat__rapide button")];
    expect(rapide.map((b) => b.textContent)).toEqual(["Va bene", "Mostrami un'alternativa"]);
    expect(rapide.every(raggiungibile)).toBe(true);
    const campo = vista.querySelector("input[name='messaggio']");
    expect(campo?.id).toBeTruthy();
    expect(vista.querySelector(`label[for='${campo?.id ?? ""}']`)?.textContent).toBe("Scrivi un messaggio");
    expect(vista.querySelector("button[type='submit']")?.getAttribute("aria-label")).toBe("Invia");
  });
});
