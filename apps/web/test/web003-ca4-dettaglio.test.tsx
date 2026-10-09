// @vitest-environment jsdom
/**
 * REQ-WEB-003 CA-4: il dettaglio si apre in un pannello (a destra sullo schermo grande, dal basso sul telefono) con
 * descrizione, orari di apertura in linguaggio naturale e, se c'è il link, il pulsante "Gestisci prenotazione".
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ContenutoGiorno } from "../src/componenti/Contenuti";
import { orariSettimanaInParole } from "../src/viste/etichette";
import { blocchi, dichiarazioni } from "./supporto-css";
import { datiValidi } from "./supporto";

// La cartella della web app: i test girano da lì (in jsdom `import.meta.url` non è un file).
const leggiApp = (percorso: string): string => readFileSync(join(process.cwd(), percorso), "utf8");

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
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
});

async function attendi(ms = 30): Promise<void> {
  await act(async () => {
    await new Promise((fatto) => setTimeout(fatto, ms));
  });
}

async function montaGiorno(chiave: string, data: string): Promise<HTMLElement> {
  contenitore = document.createElement("div");
  document.body.append(contenitore);
  radice = createRoot(contenitore);
  act(() => radice?.render(<ContenutoGiorno chiave={chiave} esito={datiValidi(chiave)} data={data} />));
  await attendi();
  return contenitore;
}

function dettagli(pagina: HTMLElement, id: string): HTMLAnchorElement {
  const link = pagina.querySelector<HTMLAnchorElement>(`.ui-linea-tempo__voce[data-elemento="${id}"] a.dettagli-apri`);
  if (link === null) throw new Error(`"Dettagli" di ${id} non trovato`);
  return link;
}

const pannello = (): HTMLElement | null => document.querySelector<HTMLElement>("[role='dialog'].ui-pannello");

describe("CA-4 il dettaglio si apre in un pannello", () => {
  it("CA-4 \"Dettagli\" è un link alla pagina del dettaglio e, con un clic, apre il pannello senza lasciare il giorno", async () => {
    const pagina = await montaGiorno("versione-1", "2026-06-14");
    const link = dettagli(pagina, "D3-E2");
    expect(link.getAttribute("href")).toBe("/viaggi/versione-1/elementi/D3-E2");
    expect(pannello()).toBeNull();
    act(() => link.click());
    await attendi();
    expect(pannello()).not.toBeNull();
    expect(pannello()?.querySelector("h2")?.textContent).toBe("Visita al Castello del Buonconsiglio");
  });

  it("CA-4 il pannello di un'attività ha la descrizione e gli orari di apertura in parole, senza prenotazione se non c'è", async () => {
    const pagina = await montaGiorno("versione-1", "2026-06-14");
    act(() => dettagli(pagina, "D3-E2").click());
    await attendi();
    const testo = pannello()?.textContent ?? "";
    expect(testo).toContain("Una visita per scoprire la storia e la cultura del posto.");
    expect(testo).toContain("Aperto da martedì a sabato dalle 9:30 alle 17 e la domenica dalle 9:30 alle 13, chiuso il lunedì.");
    // Gli orari del luogo sono solo nella frase: nessuna fascia scritta come 09:30–17:00.
    expect(pannello()?.querySelector(".dettaglio-pannello__orari")?.textContent).not.toMatch(/\d{2}:\d{2}/);
    expect(pannello()?.textContent).not.toContain("Gestisci prenotazione");
    expect(pannello()?.querySelector("a")).toBeNull();
  });

  it("CA-4 se la prenotazione ha il link, il pannello ha il pulsante \"Gestisci prenotazione\" che si apre in una nuova scheda", async () => {
    const pagina = await montaGiorno("v-volo", "2026-06-14");
    act(() => dettagli(pagina, "D3-E9").click());
    await attendi();
    const pulsante = [...(pannello()?.querySelectorAll("a") ?? [])].find((a) => a.textContent === "Gestisci prenotazione");
    expect(pulsante).toBeDefined();
    expect(pulsante?.getAttribute("href")).toBe("https://example.com/prenotazioni/XY123");
    expect(pulsante?.getAttribute("target")).toBe("_blank");
    expect(pulsante?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(pulsante?.className).toContain("ui-pulsante");
    expect(pannello()?.textContent).toContain("Aeroporto di Verona");
  });

  it("CA-4 Esc chiude il pannello e il focus torna a \"Dettagli\"", async () => {
    const pagina = await montaGiorno("versione-1", "2026-06-14");
    const link = dettagli(pagina, "D3-E6");
    act(() => link.click());
    await attendi();
    expect(pannello()).not.toBeNull();
    act(() => {
      pannello()?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    });
    await attendi(300);
    expect(pannello()).toBeNull();
    expect(document.activeElement).toBe(link);
  });

  it("CA-4 un clic con Ctrl o Cmd lascia fare al browser: non si apre il pannello", async () => {
    const pagina = await montaGiorno("versione-1", "2026-06-14");
    act(() => {
      dettagli(pagina, "D3-E2").dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, ctrlKey: true }));
    });
    await attendi();
    expect(pannello()).toBeNull();
  });
});

describe("CA-4 gli orari di apertura sono in linguaggio naturale", () => {
  const fascia = (apertura: string, chiusura: string) => [{ apertura, chiusura }];
  const settimana = (giorni: Partial<Record<"lun" | "mar" | "mer" | "gio" | "ven" | "sab" | "dom", ReturnType<typeof fascia>>>) => ({
    lun: [],
    mar: [],
    mer: [],
    gio: [],
    ven: [],
    sab: [],
    dom: [],
    ...giorni,
  });

  it("CA-4 tutti i giorni con lo stesso orario", () => {
    const uguale = fascia("09:00", "18:00");
    const tutti = settimana({ lun: uguale, mar: uguale, mer: uguale, gio: uguale, ven: uguale, sab: uguale, dom: uguale });
    expect(orariSettimanaInParole(tutti)).toBe("Aperto tutti i giorni dalle 9 alle 18.");
  });

  it("CA-4 giorni di fila, un giorno diverso e un giorno di chiusura", () => {
    const feriale = fascia("09:00", "18:00");
    const parole = orariSettimanaInParole(settimana({ mar: feriale, mer: feriale, gio: feriale, ven: feriale, sab: feriale, dom: fascia("10:30", "13:00") }));
    expect(parole).toBe("Aperto da martedì a sabato dalle 9 alle 18 e la domenica dalle 10:30 alle 13, chiuso il lunedì.");
  });

  it("CA-4 due fasce nello stesso giorno e più giorni chiusi", () => {
    const pranzoCena = [...fascia("12:00", "14:30"), ...fascia("19:00", "22:30")];
    const parole = orariSettimanaInParole(settimana({ mer: pranzoCena, gio: pranzoCena, ven: pranzoCena, sab: pranzoCena, dom: pranzoCena }));
    expect(parole).toBe("Aperto da mercoledì a domenica dalle 12 alle 14:30 e dalle 19 alle 22:30, chiuso il lunedì e il martedì.");
  });

  it("CA-4 sempre chiuso", () => {
    expect(orariSettimanaInParole(settimana({}))).toBe("Chiuso tutti i giorni.");
  });
});

describe("CA-4 il pannello sta a destra sullo schermo grande e sale dal basso sul telefono", () => {
  const css = leggiApp("src/ui/ui.css");

  it("CA-4 di base il pannello è ancorato in basso, a tutta larghezza (telefono)", () => {
    const regola = dichiarazioni(blocchi(css, ".ui-pannello {\n  inset: auto 0 0;")[0] ?? "");
    expect(regola).toContainEqual({ proprieta: "inset", valore: "auto 0 0" });
    expect(regola.find((d) => d.proprieta === "animation")?.valore).toContain("ui-dal-basso");
  });

  it("CA-4 da 768 px in su il pannello è una colonna a destra, a tutta altezza", () => {
    const grande = blocchi(css, "@media (min-width: 768px)").find((b) => b.includes(".ui-pannello")) ?? "";
    expect(grande).toMatch(/inset:\s*0 0 0 auto/);
    expect(grande).toMatch(/animation-name:\s*ui-da-destra/);
  });

  it("CA-4 \"Dettagli\" usa il pannello laterale del design system", () => {
    const sorgente = leggiApp("src/componenti/ApriDettaglio.tsx");
    expect(sorgente).toContain('from "../ui/Finestra"');
    expect(sorgente).toContain("<PannelloLaterale");
  });
});
