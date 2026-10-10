/**
 * REQ-WEB-003 CA-6: il layout su desktop e su telefono segue REQ-UX-001 §6.3. Controlli sulla struttura e sul CSS
 * (sempre eseguiti) e, con un browser di sistema, sull'impaginazione vera a 1280 e 375 px.
 */
import { JSDOM } from "jsdom";
import { chromium, type Browser } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ContenutoGiorno } from "../src/componenti/Contenuti";
import { datiValidi } from "./supporto";
import { blocchi, dichiarazioni } from "./supporto-css";
import { IN_CI, leggiApp, paginaCompleta, trovaBrowser } from "./supporto-ux";

const pagina = (chiave: string, data: string) => <ContenutoGiorno chiave={chiave} esito={datiValidi(chiave)} data={data} />;

describe("CA-6 il giorno usa il layout di viaggio del design system", () => {
  it("CA-6 itinerario e mappa stanno nei riquadri del layout; sul telefono le schede in basso li alternano", () => {
    const { document } = new JSDOM(paginaCompleta(pagina("versione-1", "2026-06-14"))).window;
    expect(document.querySelector(".ui-layout-viaggio [data-riquadro='itinerario'] .ui-linea-tempo")).not.toBeNull();
    expect(document.querySelector(".ui-layout-viaggio [data-riquadro='mappa'] .mappa")).not.toBeNull();
    const schede = [...document.querySelectorAll(".ui-schede-basso button")].map((b) => b.textContent);
    // Con la chat (REQ-CHAT-001) c'è anche la scheda «Chat»: itinerario e mappa restano i primi due riquadri.
    expect(schede).toEqual(["Itinerario", "Mappa", "Chat"]);
    // All'inizio si vede l'itinerario.
    expect(document.querySelector("[data-riquadro='itinerario']")?.getAttribute("data-attivo")).toBe("true");
    expect(document.querySelector("[data-riquadro='mappa']")?.getAttribute("data-attivo")).toBe("false");
  });

  it("CA-6 la linea del tempo e le schede usano solo i componenti del design system (nessuna tabella, nessuno stile in linea)", () => {
    const html = paginaCompleta(pagina("v-volo", "2026-06-14"));
    expect(html).not.toContain("<table");
    expect(html).not.toContain("style=");
    const { document } = new JSDOM(html).window;
    expect(document.querySelectorAll(".ui-linea-tempo > li").length).toBe(9);
    for (const scheda of document.querySelectorAll(".ui-scheda-attivita")) expect(scheda.querySelector(".ui-illustrazione")).not.toBeNull();
    // Ogni azione del giorno ha la classe dei pulsanti (almeno 44 px, focus visibile).
    const azioni = [...document.querySelectorAll(".dettagli-apri, .gestisci-prenotazione")];
    expect(azioni.length).toBeGreaterThan(9);
    for (const azione of azioni) expect(azione.classList.contains("ui-pulsante")).toBe(true);
  });

  it("CA-6 a 1100 px e oltre itinerario e mappa stanno affiancati; sotto, uno alla volta", () => {
    const css = leggiApp("src/ui/ui.css");
    const grande = blocchi(css, "@media (min-width: 1100px)").find((b) => b.includes(".ui-layout-viaggio__principale")) ?? "";
    expect(grande).toMatch(/grid-template-columns:\s*minmax\(0, 1\.25fr\) minmax\(0, 1fr\)/);
    const telefono = blocchi(css, "@media (max-width: 767px)").find((b) => b.includes('.ui-layout-viaggio__riquadro[data-attivo="false"]')) ?? "";
    expect(dichiarazioni(telefono)).toContainEqual({ proprieta: "display", valore: "none" });
  });

  it("CA-6 la linea del tempo sta nella colonna: la scheda può restringersi (minmax a 0) senza far scorrere la pagina", () => {
    const css = leggiApp("src/ui/ui.css");
    const voce = dichiarazioni(blocchi(css, ".ui-linea-tempo__voce {")[0] ?? "");
    expect(voce.find((d) => d.proprieta === "grid-template-columns")?.valore).toBe("3.5rem minmax(0, 1fr)");
    const corpo = dichiarazioni(blocchi(css, ".ui-scheda-attivita__corpo {")[0] ?? "");
    expect(corpo).toContainEqual({ proprieta: "min-width", valore: "0" });
  });
});

const percorsoBrowser = trovaBrowser();
let browser: Browser | null = null;

beforeAll(async () => {
  if (percorsoBrowser !== null) browser = await chromium.launch({ executablePath: percorsoBrowser, headless: true });
}, 60_000);

afterAll(async () => {
  await browser?.close();
});

describe.skipIf(percorsoBrowser === null && !IN_CI)("CA-6 nel browser", () => {
  async function misura(larghezza: number, altezza: number, chiave: string, data: string) {
    if (browser === null) throw new Error("browser non disponibile");
    const scheda = await browser.newPage({ viewport: { width: larghezza, height: altezza } });
    await scheda.route("**/*", (richiesta) => (richiesta.request().url().startsWith("data:") ? richiesta.continue() : richiesta.abort()));
    await scheda.setContent(paginaCompleta(pagina(chiave, data), { conCss: true }), { waitUntil: "load" });
    const risultato = await scheda.evaluate(() => {
      const riquadro = (nome: string) => {
        const r = document.querySelector(`[data-riquadro='${nome}']`)?.getBoundingClientRect();
        return r === undefined ? null : { left: r.left, right: r.right, width: r.width };
      };
      const radice = document.documentElement;
      return {
        scorre: radice.scrollWidth > radice.clientWidth,
        itinerario: riquadro("itinerario"),
        mappa: riquadro("mappa"),
        schede: document.querySelectorAll(".ui-linea-tempo .ui-scheda-attivita").length,
        sporgenti: [...document.querySelectorAll(".ui-linea-tempo *")].filter((e) => e.getBoundingClientRect().right > radice.clientWidth + 0.5).length,
      };
    });
    await scheda.close();
    return risultato;
  }

  it("CA-6 a 1280 px itinerario e mappa sono affiancati e la pagina non scorre in orizzontale", async () => {
    const m = await misura(1280, 900, "v-volo", "2026-06-14");
    expect(m.scorre).toBe(false);
    expect(m.schede).toBe(3);
    expect(m.itinerario).not.toBeNull();
    expect(m.mappa).not.toBeNull();
    expect((m.mappa?.left ?? 0) >= (m.itinerario?.right ?? 0) - 1).toBe(true);
    expect(m.sporgenti).toBe(0);
  }, 60_000);

  it("CA-6 a 375 px si vede l'itinerario a tutta larghezza (la mappa sta dietro la scheda in basso) e non si scorre in orizzontale", async () => {
    const m = await misura(375, 812, "v-volo", "2026-06-14");
    expect(m.scorre).toBe(false);
    expect(m.sporgenti).toBe(0);
    expect(m.mappa?.width ?? 0).toBe(0);
    expect(m.itinerario?.width ?? 0).toBeGreaterThan(300);
  }, 60_000);
});
