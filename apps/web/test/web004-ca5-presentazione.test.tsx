/**
 * REQ-WEB-004 CA-5: la pagina Demo diventa "Modalità presentazione", raggiungibile da un'icona nell'intestazione, con
 * orologio simulato, "Ripristina i viaggi demo" e scenari descritti in parole semplici.
 */
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ripristinaViaggiDemoAzione } from "../app/demo/azioni";
import { ContenutoDemo } from "../src/componenti/ContenutiStato";
import { leggiStato } from "../src/stato/archivio";
import { avviaScenario } from "../src/stato/operazioni";
import { AZIONI_DEMO, nuovaCartella } from "./supporto-stato";
import { leggiApp, paginaCompleta } from "./supporto-ux";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((indirizzo: string) => {
    throw new Error(`REDIRECT ${indirizzo}`);
  }),
  usePathname: () => "/demo",
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

afterEach(() => {
  vi.restoreAllMocks();
});

function pagina(): Document {
  const cartella = nuovaCartella();
  avviaScenario(cartella, "S1");
  return new JSDOM(paginaCompleta(<ContenutoDemo esito={leggiStato(cartella)} azioni={AZIONI_DEMO} />)).window.document;
}

describe("CA-5 la Demo è la Modalità presentazione", () => {
  it("CA-5 si raggiunge da un'icona nell'intestazione, non dalle sezioni", () => {
    const d = pagina();
    const icona = d.querySelector("header a.ui-intestazione__presentazione");
    expect(icona?.getAttribute("href")).toBe("/demo");
    expect(icona?.getAttribute("aria-label")).toBe("Modalità presentazione");
    expect(icona?.querySelector("svg[aria-hidden='true']")).not.toBeNull();
    expect(icona?.getAttribute("aria-current")).toBe("page");
    expect(d.querySelector("nav[aria-label='Sezioni']")?.textContent).not.toContain("Demo");
  });

  it("CA-5 il titolo è Modalità presentazione; ci sono l'orologio simulato e Ripristina i viaggi demo", () => {
    const d = pagina();
    expect(d.querySelector("h1")?.textContent).toBe("Modalità presentazione");
    expect(d.querySelector("[data-orologio]")?.getAttribute("data-orologio")).toBe("2026-06-12 08:00");
    expect(d.querySelector("input[type='date'][name='data']")).not.toBeNull();
    expect(d.querySelector("input[type='time'][name='ora']")).not.toBeNull();
    expect([...d.querySelectorAll("button")].map((b) => b.textContent)).toContain("Ripristina i viaggi demo");
  });

  it("CA-5 gli scenari sono descritti in parole semplici, senza il codice", () => {
    const d = pagina();
    const scenari = [...d.querySelectorAll<HTMLElement>("[data-scenario]")];
    expect(scenari).toHaveLength(8);
    const s1 = scenari[0];
    expect(s1?.querySelector("h3")?.textContent).toBe("Pioggia sul trekking");
    expect(s1?.querySelector(".scenario__imprevisto")?.textContent).toBe("Meteo avverso: pioggia in zona Alto Garda il 13 giugno 2026 dalle 08:00 alle 13:00");
    expect(s1?.textContent).not.toMatch(/\bS\d\b/);
    expect(s1?.querySelector("button")?.textContent).toContain("Avvia lo scenario");
  });

  it("CA-5 Ripristina i viaggi demo è un'azione del server che torna alla pagina", async () => {
    const cartella = nuovaCartella();
    vi.spyOn(process, "cwd").mockReturnValue(cartella);
    await expect(ripristinaViaggiDemoAzione()).rejects.toThrow("REDIRECT /demo");
    expect(leggiApp("app/demo/page.tsx")).toContain("ripristinaViaggiDemo: ripristinaViaggiDemoAzione");
    expect(leggiApp("app/demo/page.tsx")).toContain('title: "Modalità presentazione"');
  });
});
