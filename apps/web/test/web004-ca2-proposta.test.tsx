/**
 * REQ-WEB-004 CA-2: la proposta mostra un titolo in parole semplici, il livello di ripianificazione, le modifiche
 * evidenziate nella linea del tempo (tolti, aggiunti e spostati con colori diversi), gli elementi a rischio, le
 * alternative come pulsanti, Accetta e Rifiuta.
 */
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { ContenutoProposta } from "../src/componenti/ContenutiStato";
import { leggiStato } from "../src/stato/archivio";
import { avviaScenario } from "../src/stato/operazioni";
import { TESTI_LIVELLI } from "../src/testi-ui";
import { blocchi, dichiarazioni } from "./supporto-css";
import { html } from "./supporto";
import { AZIONI_PROPOSTA, nuovaCartella, RIPRISTINA } from "./supporto-stato";
import { leggiApp } from "./supporto-ux";

function paginaProposta(scenario: string): Document {
  const cartella = nuovaCartella();
  const avvio = avviaScenario(cartella, scenario);
  if (!avvio.ok) throw new Error(avvio.messaggio);
  return new JSDOM(html(<ContenutoProposta esito={leggiStato(cartella)} id={avvio.proposta.id} azioni={AZIONI_PROPOSTA} ripristina={RIPRISTINA} />)).window.document;
}

describe("CA-2 la proposta è una scheda chiara con le modifiche evidenziate", () => {
  it("CA-2 il titolo è in parole semplici e c'è il livello di ripianificazione", () => {
    const d = paginaProposta("S1");
    expect(d.querySelector("h1")?.textContent).toBe("Pioggia sul trekking: ti propongo Visita al MAG al posto di Trekking sul Sentiero del Ponale");
    const livello = d.querySelector("[data-livello]");
    expect(livello?.textContent).toContain(TESTI_LIVELLI.minimo);
    expect(livello?.textContent).toContain("Livello di ripianificazione");
  });

  it("CA-2 nella linea del tempo il tolto, l'aggiunto e lo spostato hanno classi e parole diverse", () => {
    const d = paginaProposta("S1");
    const linea = d.querySelector("ol.ui-linea-tempo");
    expect(linea).not.toBeNull();
    const voce = (selettore: string) => linea?.querySelector(selettore);
    const tolto = voce("li.ui-linea-tempo__voce--rimosso");
    const aggiunto = voce('li.ui-linea-tempo__voce--aggiunto[data-elemento="N1"]');
    const spostato = voce('li.ui-linea-tempo__voce--spostato[data-elemento="D2-E1"]');
    expect(tolto?.querySelector('[data-rimosso="D2-E2"]')).not.toBeNull();
    expect(tolto?.textContent).toContain("Trekking sul Sentiero del Ponale");
    expect(tolto?.textContent).toContain("Tolto");
    expect(aggiunto?.textContent).toContain("Aggiunto");
    expect(spostato?.textContent).toContain("Spostato");
    // Il tolto sta al suo posto nell'ordine degli orari, prima dell'aggiunto che lo sostituisce.
    const ordine = [...(linea?.querySelectorAll("li.ui-linea-tempo__voce") ?? [])];
    expect(ordine.indexOf(tolto as Element)).toBeLessThan(ordine.indexOf(aggiunto as Element));
  });

  it("CA-2 i tre colori sono diversi (token) e il tolto è barrato", () => {
    const css = leggiApp("src/ui/ui.css");
    const pieno = (voce: string): string => {
      const blocco = blocchi(css, `.ui-linea-tempo__voce--${voce} {`)[0] ?? "";
      return dichiarazioni(blocco).find((x) => x.proprieta === "--cambio-pieno")?.valore ?? "";
    };
    const colori = ["rimosso", "aggiunto", "spostato"].map(pieno);
    expect(colori.every((c) => /^var\(--colore-[\w-]+\)$/.test(c))).toBe(true);
    expect(new Set(colori).size).toBe(3);
    const barrato = blocchi(css, ".ui-linea-tempo__voce--rimosso .ui-scheda-attivita__nome,").length;
    expect(barrato).toBeGreaterThan(0);
    expect(css).toMatch(/\.ui-linea-tempo__voce--rimosso \.ui-scheda-attivita__nome,[\s\S]*?text-decoration: line-through/);
  });

  it("CA-2 con S7 l'elemento a rischio ha un avviso chiaro e le alternative sono pulsanti-link in una nuova scheda", () => {
    const d = paginaProposta("S7");
    const avviso = d.querySelector('.ui-avviso [data-a-rischio="D3-E9"]');
    expect(avviso?.textContent).toContain("A rischio");
    const link = [...d.querySelectorAll<HTMLAnchorElement>("[data-alternativa] a")];
    expect(link).toHaveLength(2);
    for (const a of link) {
      expect(a.className).toContain("ui-pulsante");
      expect(a.getAttribute("target")).toBe("_blank");
      expect(a.getAttribute("rel")).toBe("noopener noreferrer");
    }
  });

  it("CA-2 ci sono Accetta e Rifiuta", () => {
    const d = paginaProposta("S1");
    const pulsanti = [...d.querySelectorAll("form button[type='submit']")].map((b) => b.textContent);
    expect(pulsanti).toEqual(["Accetta", "Rifiuta"]);
  });
});
