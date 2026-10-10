/**
 * REQ-UX-001, controlli con l'impaginazione vera, nel browser di sistema senza rete (playwright-core pilota Chrome,
 * Edge o Chromium già installati; nessun browser viene scaricato):
 * - CA-4: a 375 px nessuna pagina principale scorre in orizzontale; a 1280 px la home mostra le schede in griglia;
 * - CA-5: axe-core con tutte le regole (anche il contrasto calcolato) su home e /stile; Tab raggiunge ogni elemento
 *   interattivo e il focus si vede;
 * - CA-3: nella pagina /stile i due pannelli hanno davvero i colori dei due temi;
 * - CA-7: con `prefers-reduced-motion` animazioni e transizioni durano zero.
 * Le pagine sono l'HTML dei componenti (React lato server) con tutto il CSS della web app; ogni richiesta di rete
 * viene bloccata. Senza browser i test si saltano in locale (con un avviso) ma non nella CI, dove falliscono.
 */
import axe from "axe-core";
import { chromium, type Browser, type Page } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PaginaHome } from "../src/componenti/PaginaHome";
import { PaginaStile } from "../src/componenti/PaginaStile";
import { VIAGGI } from "../src/dati/viaggi";
import { vistaHome } from "../src/viste/home";
import { IN_CI, paginaCompleta, paginePrincipali, trovaBrowser } from "./supporto-ux";

const percorsoBrowser = trovaBrowser();
if (percorsoBrowser === null && !IN_CI) {
  console.warn("Nessun browser di sistema (Chrome, Edge, Chromium): i controlli nel browser di REQ-UX-001 sono saltati. Indica TRAVELOPS_BROWSER.");
}

/**
 * Tempo massimo di ogni prova di questo file: renderizzano decine di pagine e le misurano nel browser, e con tutta la suite
 * in parallelo il carico della macchina le rallenta molto oltre i 5 s predefiniti. Il margine non nasconde un blocco:
 * se una prova non finisce, fallisce comunque.
 */
const PAUSA_PROVA_MS = 90_000;

let browser: Browser | null = null;

beforeAll(async () => {
  if (percorsoBrowser !== null) browser = await chromium.launch({ executablePath: percorsoBrowser, headless: true });
}, PAUSA_PROVA_MS);

afterAll(async () => {
  await browser?.close();
}, PAUSA_PROVA_MS);

interface Opzioni {
  larghezza: number;
  altezza?: number;
  tema?: "light" | "dark";
  movimentoRidotto?: boolean;
}

/** Apre l'HTML in una pagina nuova, con la rete bloccata. */
async function apri(markup: string, { larghezza, altezza = 900, tema = "light", movimentoRidotto = false }: Opzioni): Promise<Page> {
  if (browser === null) throw new Error("browser non disponibile");
  const pagina = await browser.newPage({ viewport: { width: larghezza, height: altezza }, colorScheme: tema, reducedMotion: movimentoRidotto ? "reduce" : "no-preference" });
  await pagina.route("**/*", (richiesta) => (richiesta.request().url().startsWith("data:") ? richiesta.continue() : richiesta.abort()));
  await pagina.setContent(markup, { waitUntil: "load" });
  return pagina;
}

const html = {
  home: () => paginaCompleta(<PaginaHome viaggi={vistaHome(VIAGGI)} />, { conCss: true }),
  stile: () => paginaCompleta(<PaginaStile />, { conCss: true, titolo: "Stile · TravelOps" }),
};

describe.skipIf(percorsoBrowser === null && !IN_CI)("REQ-UX-001 nel browser", { timeout: PAUSA_PROVA_MS }, () => {
  it("nella CI il browser di sistema c'è: i controlli nel browser non si saltano", () => {
    expect(percorsoBrowser).not.toBeNull();
  });

  it("CA-4 il controllo riconosce una pagina che scorre in orizzontale (per esempio una tabella delle vecchie viste)", async () => {
    const tabella = `<table class="tabella"><tr>${"<td>Hotel sul lago, Riva del Garda → Castello del Buonconsiglio</td>".repeat(4)}</tr></table>`;
    const pagina = await apri(`<!doctype html><html lang="it"><head><style>${""}</style></head><body>${tabella}</body></html>`, { larghezza: 375 });
    const [scorrimento, finestra] = await pagina.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    await pagina.close();
    expect(scorrimento).toBeGreaterThan(finestra ?? 0);
  });

  it("CA-4 a 375 px nessuna pagina principale scorre in orizzontale (tema chiaro e scuro)", async () => {
    const pagine = paginePrincipali({ tuttiGliElementi: false });
    expect(pagine.length).toBeGreaterThan(60);
    const chiara = await apri("<!doctype html><title>x</title>", { larghezza: 375, altezza: 812, tema: "light" });
    const scura = await apri("<!doctype html><title>x</title>", { larghezza: 375, altezza: 812, tema: "dark" });
    const larghe: string[] = [];
    for (const [indice, { nome, contenuto }] of pagine.entries()) {
      const tema = indice % 2 === 0 ? "light" : "dark";
      const pagina = tema === "light" ? chiara : scura;
      await pagina.setContent(paginaCompleta(contenuto, { conCss: true }), { waitUntil: "load" });
      const misure = await pagina.evaluate(() => {
        const radice = document.documentElement;
        // Elementi che sporgono oltre il bordo destro della finestra (la causa, se la pagina scorre).
        const sporgenti = [...document.body.querySelectorAll("*")]
          .filter((e) => e.getBoundingClientRect().right > radice.clientWidth + 0.5 && getComputedStyle(e).position !== "fixed")
          .slice(0, 3)
          .map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].join(".")}`);
        return { scorrimento: radice.scrollWidth, finestra: radice.clientWidth, sporgenti };
      });
      if (misure.scorrimento > misure.finestra) larghe.push(`${nome} (${tema}): ${misure.scorrimento}px > ${misure.finestra}px ${misure.sporgenti.join(", ")}`);
    }
    await chiara.close();
    await scura.close();
    expect(larghe).toEqual([]);
  }, 300_000);

  it("CA-4 a 1280 px la home mostra le schede dei viaggi in griglia; a 375 px una sotto l'altra", async () => {
    const colonne = async (larghezza: number) => {
      const pagina = await apri(html.home(), { larghezza });
      const risultato = await pagina.evaluate(() => {
        const elementi = [...document.querySelectorAll<HTMLElement>(".home__griglia > .scheda-viaggio")];
        const schede = elementi.map((s) => s.getBoundingClientRect());
        return {
          schede: schede.length,
          colonne: new Set(schede.map((r) => Math.round(r.left))).size,
          // La riga si misura sul layout (offsetTop): `top` include la traslazione dell'animazione d'ingresso, che varia col carico.
          righe: new Set(elementi.map((s) => s.offsetTop)).size,
          display: getComputedStyle(document.querySelector(".home__griglia") as Element).display,
        };
      });
      await pagina.close();
      return risultato;
    };
    const grande = await colonne(1280);
    expect(grande).toEqual({ schede: 4, colonne: 4, righe: 1, display: "grid" });
    const telefono = await colonne(375);
    expect(telefono).toEqual({ schede: 4, colonne: 1, righe: 4, display: "grid" });
  }, 60_000);

  it.each([
    ["home", "light"],
    ["home", "dark"],
    ["stile", "light"],
    ["stile", "dark"],
  ] as const)("CA-5 axe-core con tutte le regole (anche il contrasto) su %s in tema %s: nessuna violazione grave", async (nome, tema) => {
    const pagina = await apri(html[nome](), { larghezza: 1280, tema });
    await pagina.addScriptTag({ content: axe.source });
    // Le schede e i badge compaiono con una dissolvenza di 250 ms: axe misura il contrasto a dissolvenza finita,
    // non a metà (altrimenti legge colori più chiari di quelli dei token).
    await pagina.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => null))));
    const violazioni = await pagina.evaluate(async () => {
      const risultato = await (window as unknown as { axe: typeof axe }).axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] },
      });
      return risultato.violations.map((v) => ({ id: v.id, impact: v.impact ?? null, nodi: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) }));
    });
    await pagina.close();
    expect(violazioni.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
    expect(violazioni).toEqual([]);
  }, 60_000);

  it.each(["home", "stile"] as const)("CA-5 %s: Tab raggiunge ogni elemento interattivo e il focus si vede sempre", async (nome) => {
    const pagina = await apri(html[nome](), { larghezza: 1280 });
    // Una chiave per riconoscere un elemento: un numero assegnato in ordine di pagina, poi tag e classi.
    await pagina.addScriptTag({
      content: `window.chiaveDi = (e) => { if (!e.dataset.provaTab) e.dataset.provaTab = String(document.querySelectorAll("[data-prova-tab]").length + 1); return e.dataset.provaTab + " " + e.tagName.toLowerCase() + "." + [...e.classList].join("."); };`,
    });
    const attesi: string[] = await pagina.evaluate(() =>
      [...document.querySelectorAll("a[href], button:not([disabled]), input:not([type='hidden']):not([disabled]), select, textarea, summary, [tabindex='0']")]
        .filter((e) => {
          // Dei pulsanti di scelta di un gruppo si raggiunge con Tab quello scelto (gli altri con le frecce).
          if (e instanceof HTMLInputElement && e.type === "radio" && !e.checked) return false;
          const r = e.getBoundingClientRect();
          return r.width > 0 || r.height > 0 || e.matches(".ui-salta");
        })
        .map((e) => (window as unknown as { chiaveDi: (e: Element) => string }).chiaveDi(e)),
    );
    const raggiunti: string[] = [];
    const senzaFocus: string[] = [];
    // I campi data hanno più parti (giorno, mese, anno): Tab si ferma più volte sullo stesso campo.
    for (let i = 0; i < attesi.length * 4 + 10; i += 1) {
      await pagina.keyboard.press("Tab");
      const stato = await pagina.evaluate(() => {
        const attivo = document.activeElement as HTMLElement | null;
        if (attivo === null || attivo === document.body) return null;
        // Il focus si vede sull'elemento o su un contenitore vicino (etichetta di un pulsante di scelta, scheda viaggio).
        let visibile = false;
        for (let e: HTMLElement | null = attivo, livello = 0; e !== null && livello < 4; e = e.parentElement, livello += 1) {
          const s = getComputedStyle(e);
          if (s.outlineStyle !== "none" && Number.parseFloat(s.outlineWidth) >= 2) visibile = true;
        }
        // Nei campi data e ora l'ultima fermata di Tab è il pulsante del calendario, interno al campo nativo: il focus è
        // lì (il campo non risulta più ":focus") e lo mostra l'anello del browser, che dall'esterno non si può leggere.
        if (!attivo.matches(":focus") && attivo.matches("input[type='date'], input[type='time']")) visibile = true;
        return { chiave: (window as unknown as { chiaveDi: (e: Element) => string }).chiaveDi(attivo), visibile };
      });
      if (stato === null || (raggiunti.length > 0 && stato.chiave === raggiunti[0])) break;
      if (!raggiunti.includes(stato.chiave)) raggiunti.push(stato.chiave);
      if (!stato.visibile && !senzaFocus.includes(stato.chiave)) senzaFocus.push(stato.chiave);
    }
    await pagina.close();
    expect(attesi.length).toBeGreaterThan(nome === "home" ? 8 : 60);
    expect(attesi.filter((chiave) => !raggiunti.includes(chiave))).toEqual([]);
    // L'ordine di Tab segue l'ordine della pagina.
    expect(raggiunti).toEqual(attesi);
    expect(senzaFocus).toEqual([]);
  }, 120_000);

  it("CA-3 in /stile il pannello chiaro e quello scuro hanno davvero i colori del loro tema", async () => {
    const pagina = await apri(html.stile(), { larghezza: 1280, tema: "light" });
    // I valori attesi sono i colori OKLCH dei token, scritti nella forma in cui il browser li restituisce.
    const attesi = [
      { sfondo: "oklch(0.98 0.008 80)", testo: "oklch(0.24 0.02 70)", pulsante: "oklch(0.52 0.088 205)" },
      { sfondo: "oklch(0.18 0.008 70)", testo: "oklch(0.96 0.01 80)", pulsante: "oklch(0.8 0.1 205)" },
    ];
    const normalizzati = await pagina.evaluate((elenco) => {
      const normalizza = (colore: string) => {
        const sonda = document.createElement("i");
        sonda.style.color = colore;
        document.body.append(sonda);
        const valore = getComputedStyle(sonda).color;
        sonda.remove();
        return valore;
      };
      return elenco.map((c) => ({ sfondo: normalizza(c.sfondo), testo: normalizza(c.testo), pulsante: normalizza(c.pulsante) }));
    }, attesi);
    const colori = await pagina.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>(".stile__tema")].map((p) => ({
        tema: p.dataset.tema,
        sfondo: getComputedStyle(p).backgroundColor,
        testo: getComputedStyle(p).color,
        pulsante: getComputedStyle(p.querySelector(".ui-pulsante--primario") as Element).backgroundColor,
      })),
    );
    await pagina.close();
    expect(colori.map((c) => c.tema)).toEqual(["chiaro", "scuro"]);
    expect(colori[0]).toMatchObject(normalizzati[0] ?? {});
    expect(colori[1]).toMatchObject(normalizzati[1] ?? {});
    expect(normalizzati[0]).not.toEqual(normalizzati[1]);
  }, 60_000);

  it("CA-7 con prefers-reduced-motion animazioni e transizioni durano zero; senza, durano 150–250 ms", async () => {
    const durate = async (movimentoRidotto: boolean) => {
      const pagina = await apri(html.stile(), { larghezza: 1280, movimentoRidotto });
      const risultato = await pagina.evaluate(() => {
        const secondi = (valore: string) => Math.max(...valore.split(",").map((v) => Number.parseFloat(v) * (v.trim().endsWith("ms") ? 0.001 : 1)));
        const elementi = [...document.querySelectorAll(".ui-pulsante, .ui-chip, .ui-scheda-attivita, .ui-avviso, .ui-scheletro__blocco, .ui-chat__bolla, .scheda-viaggio, .leaflet-container")];
        return {
          elementi: elementi.length,
          transizione: Math.max(...elementi.map((e) => secondi(getComputedStyle(e).transitionDuration))),
          animazione: Math.max(...elementi.map((e) => secondi(getComputedStyle(e).animationDuration))),
          animazioniInCorso: document.getAnimations().filter((a) => a.playState === "running").length,
        };
      });
      await pagina.close();
      return risultato;
    };
    const normale = await durate(false);
    expect(normale.elementi).toBeGreaterThan(20);
    expect(normale.transizione).toBeGreaterThanOrEqual(0.15);
    expect(normale.transizione).toBeLessThanOrEqual(0.25);
    expect(normale.animazioniInCorso).toBeGreaterThan(0);
    const ridotto = await durate(true);
    expect(ridotto).toEqual({ elementi: normale.elementi, transizione: 0, animazione: 0, animazioniInCorso: 0 });
  }, 60_000);
});
