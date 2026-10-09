// @vitest-environment jsdom
/**
 * REQ-WEB-003 CA-3: la scheda di un'attività e il suo punto sulla mappa si evidenziano a vicenda, al passaggio del
 * mouse, al focus e al tocco. La pagina si monta davvero (React nel DOM di jsdom, Leaflet compreso).
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ContenutoGiorno } from "../src/componenti/Contenuti";
import { datiValidi } from "./supporto";

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

async function attendi(ms = 50): Promise<void> {
  await act(async () => {
    await new Promise((fatto) => setTimeout(fatto, ms));
  });
}

/** Monta la pagina del giorno 2026-06-14 e aspetta che Leaflet abbia disegnato gli indicatori. */
async function montaGiorno(): Promise<HTMLElement> {
  contenitore = document.createElement("div");
  document.body.append(contenitore);
  radice = createRoot(contenitore);
  act(() => radice?.render(<ContenutoGiorno chiave="versione-1" esito={datiValidi("versione-1")} data="2026-06-14" />));
  for (let tentativi = 0; tentativi < 40 && contenitore.querySelectorAll(".leaflet-marker-icon").length < 3; tentativi += 1) await attendi(25);
  return contenitore;
}

const scheda = (radiceDom: HTMLElement, id: string): HTMLElement => {
  const voce = radiceDom.querySelector<HTMLElement>(`.ui-linea-tempo__voce[data-elemento="${id}"]`);
  if (voce === null) throw new Error(`voce di ${id} non trovata`);
  return voce;
};
const indicatore = (radiceDom: HTMLElement, numero: number): HTMLElement => {
  const trovato = [...radiceDom.querySelectorAll<HTMLElement>(".leaflet-marker-icon")].find((e) => e.textContent === String(numero));
  if (trovato === undefined) throw new Error(`indicatore ${numero} non trovato`);
  return trovato;
};
const accesi = (radiceDom: HTMLElement): string[] =>
  [...radiceDom.querySelectorAll("[data-evidenziata='si'], [data-evidenziato='si']")].map((e) => `${e.tagName.toLowerCase()}:${e.getAttribute("data-elemento") ?? e.textContent}`);

describe("CA-3 scheda attività e punto sulla mappa si evidenziano a vicenda", () => {
  it("CA-3 la mappa disegna un indicatore per ogni attività e all'inizio niente è evidenziato", async () => {
    const pagina = await montaGiorno();
    expect(pagina.querySelectorAll(".leaflet-marker-icon")).toHaveLength(3);
    expect(accesi(pagina)).toEqual([]);
  });

  it("CA-3 passando il mouse sulla scheda si accendono la scheda, la voce della legenda e il punto sulla mappa; uscendo si spengono", async () => {
    const pagina = await montaGiorno();
    const castello = scheda(pagina, "D3-E2");
    act(() => {
      // React ricava "entra" e "esce" dagli eventi mouseover e mouseout.
      castello.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });
    await attendi();
    expect(castello.getAttribute("data-evidenziata")).toBe("si");
    expect(castello.querySelector(".ui-scheda-attivita")?.getAttribute("data-evidenziata")).toBe("si");
    expect(pagina.querySelector(".legenda [data-elemento='D3-E2']")?.getAttribute("data-evidenziata")).toBe("si");
    expect(indicatore(pagina, 1).getAttribute("data-evidenziato")).toBe("si");
    expect(indicatore(pagina, 2).hasAttribute("data-evidenziato")).toBe(false);
    act(() => {
      castello.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
    });
    await attendi();
    expect(accesi(pagina)).toEqual([]);
  });

  it("CA-3 passando il mouse sul punto della mappa si accende la scheda dell'attività", async () => {
    const pagina = await montaGiorno();
    act(() => {
      indicatore(pagina, 3).dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });
    await attendi();
    expect(scheda(pagina, "D3-E6").getAttribute("data-evidenziata")).toBe("si");
    expect(scheda(pagina, "D3-E2").hasAttribute("data-evidenziata")).toBe(false);
    expect(indicatore(pagina, 3).getAttribute("data-evidenziato")).toBe("si");
    act(() => {
      indicatore(pagina, 3).dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
    });
    await attendi();
    expect(accesi(pagina)).toEqual([]);
  });

  it("CA-3 con un tocco (clic) sulla scheda o sul punto la stessa attività si accende; toccare la mappa vuota spegne", async () => {
    const pagina = await montaGiorno();
    act(() => scheda(pagina, "D3-E4").click());
    await attendi();
    expect(indicatore(pagina, 2).getAttribute("data-evidenziato")).toBe("si");
    act(() => indicatore(pagina, 1).click());
    await attendi();
    expect(scheda(pagina, "D3-E2").getAttribute("data-evidenziata")).toBe("si");
    expect(scheda(pagina, "D3-E4").hasAttribute("data-evidenziata")).toBe(false);
    expect(indicatore(pagina, 2).hasAttribute("data-evidenziato")).toBe(false);
  });

  it("CA-3 anche con la tastiera: il focus sulla scheda accende il punto sulla mappa", async () => {
    const pagina = await montaGiorno();
    const dettagli = scheda(pagina, "D3-E6").querySelector<HTMLElement>("a.dettagli-apri");
    expect(dettagli).not.toBeNull();
    act(() => dettagli?.focus());
    await attendi();
    expect(indicatore(pagina, 3).getAttribute("data-evidenziato")).toBe("si");
    act(() => dettagli?.blur());
    await attendi();
    expect(accesi(pagina)).toEqual([]);
  });
});
