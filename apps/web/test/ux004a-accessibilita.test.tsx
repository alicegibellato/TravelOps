/**
 * ST-UX-004A: la pagina della proposta con il riepilogo, i dettagli espandibili e la nota informativa non ha
 * violazioni di accessibilità (axe-core a11y, regole WCAG A e AA, contrasto escluso come negli altri test in jsdom) e
 * non mostra codici tecnici nel testo visibile.
 */
import axe from "axe-core";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { PaginaProposta } from "../src/componenti/PaginaProposta";
import { catalogoDiRiferimento } from "../src/dati/scenari";
import { segnalaRitardo } from "../src/oggi/operazioni";
import { impostaOrologio } from "../src/stato/operazioni";
import { vistaProposta, type VistaProposta } from "../src/viste/proposta";
import { paginaCompleta, testoVisibile } from "./supporto-ux";
import { AZIONI_PROPOSTA, nuovaCartella, statoSalvato } from "./supporto-stato";

async function violazioni(html: string): Promise<string[]> {
  const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true });
  dom.window.eval(axe.source);
  const nellaPagina = (dom.window as unknown as { axe: typeof axe }).axe;
  const risultato = await nellaPagina.run(dom.window.document, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] },
    rules: { "color-contrast": { enabled: false } },
  });
  dom.window.close();
  return risultato.violations.map((v) => `${v.id} (${v.impact ?? ""}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

function vista(ora: string, minuti: number): VistaProposta {
  const cartella = nuovaCartella();
  impostaOrologio(cartella, "2026-06-13", ora);
  const esito = segnalaRitardo(cartella, "versione-1", minuti);
  if (!esito.ok) throw new Error(esito.messaggio);
  return vistaProposta(esito.proposta, statoSalvato(cartella), catalogoDiRiferimento());
}

describe("la pagina della proposta è accessibile e senza codici tecnici (a11y, axe)", () => {
  it.each([
    ["proposta con riepilogo e dettagli", () => vista("10:30", 30)],
    ["nota informativa senza Accetta", () => vista("23:00", 15)],
  ] as const)("%s: nessuna violazione di axe, nessun codice a vista", async (_nome, crea) => {
    const html = paginaCompleta(<PaginaProposta vista={crea()} azioni={AZIONI_PROPOSTA} />, { titolo: "La proposta · TravelOps" });
    expect(await violazioni(html)).toEqual([]);
    expect(testoVisibile(html)).not.toMatch(/\bD\d+-E\d+\b|\bN\d+\b|\b[A-Z]{3,}_[A-Z_]{3,}\b/);
  }, 60_000);
});
