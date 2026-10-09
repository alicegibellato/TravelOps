/**
 * REQ-CHAT-001 CA-4 (ST-CHAT-001B): su telefono la chat è a tutto schermo e la tastiera non copre il campo di testo.
 * Controlli sul codice (CSS e viewport) sempre eseguiti; misura con l'impaginazione vera nel browser di sistema, con
 * la finestra accorciata come quando si apre la tastiera (si salta in locale senza browser, non nella CI).
 */
import { chromium, type Browser, type Page } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ContenutoGiorno } from "../src/componenti/Contenuti";
import { blocchi, dichiarazioni, senzaCommentiCss } from "./supporto-css";
import { datiValidi } from "./supporto";
import { IN_CI, leggiApp, paginaCompleta, trovaBrowser } from "./supporto-ux";

const percorsoBrowser = trovaBrowser();
let browser: Browser | null = null;

beforeAll(async () => {
  if (percorsoBrowser !== null) browser = await chromium.launch({ executablePath: percorsoBrowser, headless: true });
}, 60_000);

afterAll(async () => {
  await browser?.close();
});

describe("CA-4 su telefono la chat è a tutto schermo e la tastiera non copre il campo di testo (codice)", () => {
  const css = senzaCommentiCss(leggiApp("src/ui/ui.css"));
  const telefono = blocchi(css, "@media (max-width: 767px)").join("\n");

  it("CA-4 sul telefono la chat attiva è fissa, a tutta larghezza e alta quanto l'area visibile", () => {
    const regola = dichiarazioni(blocchi(telefono, '.ui-layout-viaggio__chat[data-attivo="true"] {')[0] ?? "");
    const valore = (proprieta: string) => regola.find((d) => d.proprieta === proprieta)?.valore;
    expect(valore("position")).toBe("fixed");
    expect([valore("left"), valore("right")]).toEqual(["0", "0"]);
    expect(valore("top")).toBe("var(--scostamento-visibile)");
    expect(valore("height")).toBe("var(--altezza-visibile)");
    // Senza il pannello che misura l'area visibile, l'altezza è quella dinamica della finestra (dvh) e non 100vh.
    expect(valore("--altezza-visibile")).toBe("100dvh");
    // Le schede in basso restano raggiungibili: la chat sta sotto di loro.
    const schede = dichiarazioni(blocchi(telefono, ".ui-schede-basso {")[0] ?? "");
    expect(Number(schede.find((d) => d.proprieta === "z-index")?.valore)).toBeGreaterThan(Number(valore("z-index")));
  });

  it("CA-4 i messaggi scorrono dentro il pannello e il campo di testo resta in fondo, fuori dallo scorrimento", () => {
    const corpo = dichiarazioni(blocchi(css, ".ui-chat__corpo {")[0] ?? "");
    expect(corpo).toContainEqual({ proprieta: "overflow-y", valore: "auto" });
    expect(corpo).toContainEqual({ proprieta: "flex", valore: "1 1 auto" });
    const scrivi = dichiarazioni(blocchi(css, ".ui-chat__scrivi {")[0] ?? "");
    expect(scrivi).toContainEqual({ proprieta: "flex", valore: "none" });
  });

  it("CA-4 il campo di testo è grande almeno 16 px (il telefono non ingrandisce la pagina) e il suo pulsante almeno 44 px", () => {
    const campo = blocchi(css, ".ui-chat__scrivi .ui-campo__controllo {").flatMap(dichiarazioni);
    expect(campo.find((d) => d.proprieta === "font-size")?.valore).toBe("max(1rem, var(--testo-m))");
    const controllo = dichiarazioni(blocchi(css, ".ui-campo__controllo {")[0] ?? "");
    expect(controllo.find((d) => d.proprieta === "min-height")?.valore).toBe("var(--area-tocco)");
  });

  it("CA-4 la pagina si accorcia con la tastiera (viewport «resizes-content») e il pannello segue l'area visibile", () => {
    expect(leggiApp("app/layout.tsx")).toContain('interactiveWidget: "resizes-content"');
    const pannello = leggiApp("src/ui/PannelloChat.tsx");
    for (const parte of ["window.visualViewport", '"--altezza-visibile"', '"--scostamento-visibile"', 'addEventListener("resize"', "removeProperty"]) {
      expect(pannello).toContain(parte);
    }
  });
});

describe.skipIf(percorsoBrowser === null && !IN_CI)("CA-4 su telefono la chat è a tutto schermo e la tastiera non copre il campo (browser)", () => {
  async function apriChat(altezza: number): Promise<Page> {
    if (browser === null) throw new Error("browser non disponibile");
    const markup = paginaCompleta(<ContenutoGiorno chiave="versione-1" esito={datiValidi("versione-1")} data="2026-06-13" />, { conCss: true });
    const pagina = await browser.newPage({ viewport: { width: 375, height: altezza } });
    await pagina.route("**/*", (richiesta) => (richiesta.request().url().startsWith("data:") ? richiesta.continue() : richiesta.abort()));
    await pagina.setContent(markup, { waitUntil: "load" });
    // Senza JavaScript delle schede: si attiva la scheda «Chat» come fa il clic sul pulsante.
    await pagina.evaluate(() => {
      for (const riquadro of document.querySelectorAll("[data-riquadro]")) riquadro.setAttribute("data-attivo", riquadro.getAttribute("data-riquadro") === "chat" ? "true" : "false");
    });
    return pagina;
  }

  const misure = (pagina: Page) =>
    pagina.evaluate(() => {
      const rettangolo = (selettore: string) => {
        const r = document.querySelector(selettore)?.getBoundingClientRect();
        return r === undefined ? null : { sopra: r.top, sotto: r.bottom, sinistra: r.left, destra: r.right };
      };
      return {
        finestra: { larghezza: window.innerWidth, altezza: window.innerHeight },
        chat: rettangolo(".ui-layout-viaggio__chat"),
        campo: rettangolo("input[name='messaggio']"),
        invia: rettangolo("button[aria-label='Invia']"),
        schede: rettangolo(".ui-schede-basso"),
        orizzontale: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });

  it("CA-4 la chat occupa tutto lo schermo a 375 px, sopra l'intestazione, e non scorre in orizzontale", async () => {
    const pagina = await apriChat(812);
    const m = await misure(pagina);
    await pagina.close();
    expect(m.chat).toMatchObject({ sopra: 0, sinistra: 0, destra: 375, sotto: 812 });
    expect(m.orizzontale).toBe(false);
  }, 60_000);

  it("CA-4 il campo di testo sta sopra le schede in basso anche con la tastiera aperta (finestra accorciata)", async () => {
    for (const altezza of [812, 420, 340]) {
      const pagina = await apriChat(altezza);
      const m = await misure(pagina);
      await pagina.close();
      const campo = m.campo;
      const schede = m.schede;
      if (campo === null || schede === null) throw new Error("mancano il campo o le schede");
      expect(m.finestra.altezza).toBe(altezza);
      expect(campo.sotto).toBeLessThanOrEqual(altezza);
      expect(campo.sotto).toBeLessThanOrEqual(schede.sopra + 0.5);
      expect(campo.sopra).toBeGreaterThanOrEqual(0);
      expect(campo.destra).toBeLessThanOrEqual(375);
      // Almeno 44 px di altezza per il campo e per il pulsante «Invia».
      expect(campo.sotto - campo.sopra).toBeGreaterThanOrEqual(44);
      const invia = m.invia;
      if (invia === null) throw new Error("manca il pulsante Invia");
      expect(invia.sotto - invia.sopra).toBeGreaterThanOrEqual(44);
      expect(invia.destra - invia.sinistra).toBeGreaterThanOrEqual(44);
    }
  }, 60_000);
});
