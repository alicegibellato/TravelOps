/**
 * ST-PLAN-002: la pagina della bozza (prima e dopo la conferma) non ha violazioni di accessibilità (axe-core, regole
 * WCAG A e AA, contrasto escluso come negli altri test in jsdom) e non mostra codici tecnici (REQ-UX-001 CA-5, CA-6).
 */
import axe from "axe-core";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import type { AzioniBozza, VistaBozza } from "../src/bozza/tipi";
import { PaginaBozza } from "../src/componenti/PaginaBozza";
import { nuovaBozza } from "./supporto-bozza";
import { paginaCompleta, testoVisibile } from "./supporto-ux";

const NESSUNA: AzioniBozza = {
  opera: () => Promise.resolve({ ok: false, messaggio: "" }),
  cambiaPreferenze: () => Promise.resolve({ ok: false, messaggio: "" }),
  alternative: () => Promise.resolve([]),
  confronta: () => Promise.resolve(null),
  conferma: () => Promise.resolve({ ok: false, messaggio: "" }),
  accetta: () => Promise.resolve({ ok: false, messaggio: "" }),
  rifiuta: () => Promise.resolve({ ok: false, messaggio: "" }),
};

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

function pagine(): Record<string, VistaBozza> {
  const bozza = nuovaBozza();
  const data = bozza.vista.date[1]!.valore;
  bozza.servizio.opera(bozza.viaggioId, { tipo: "giornata_piu_piena", data });
  bozza.servizio.conferma(bozza.viaggioId);
  const giorno = bozza.vista.giorni[1]!;
  const attivita = giorno.voci.find((v) => v.tipo === "attivita" && !v.pasto)!;
  const proposta = bozza.servizio.opera(bozza.viaggioId, { tipo: "rimuovi", elementoId: attivita.id });
  if (!proposta.ok) throw new Error(proposta.messaggio);
  return { bozza: bozza.vista, "itinerario confermato con una proposta": proposta.vista };
}

describe("la pagina della bozza è accessibile e senza codici tecnici", () => {
  it.each(Object.entries(pagine()))("%s: nessuna violazione di axe, nessun codice a vista", async (_nome, vista) => {
    const html = paginaCompleta(<PaginaBozza vista={vista} azioni={NESSUNA} />, { titolo: "La tua bozza · TravelOps" });
    expect(await violazioni(html)).toEqual([]);
    expect(testoVisibile(html)).not.toMatch(/\bD\d+-E\d+\b|\bN\d+\b|A-OSM|\b[A-Z]{3,}_[A-Z_]{3,}\b|\d{4}-\d{2}-\d{2}/);
  }, 60_000);
});
