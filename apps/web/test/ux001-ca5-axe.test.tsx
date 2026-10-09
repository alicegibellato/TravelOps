/**
 * REQ-UX-001 CA-5 (controllo automatico): axe-core non trova violazioni gravi (impatto "serious" o "critical") nella
 * home e in /stile. Qui axe gira in jsdom, senza browser: tutte le regole tranne il contrasto calcolato, che ha
 * bisogno dell'impaginazione (il contrasto è verificato sui token da CA-2 e con axe nel browser vero da
 * `ux001-browser.test.tsx`). In più: ogni elemento interattivo si raggiunge con Tab e il focus ha uno stile visibile.
 */
import axe from "axe-core";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { ContenutoGiorno } from "../src/componenti/Contenuti";
import { PaginaHome } from "../src/componenti/PaginaHome";
import { PaginaStile } from "../src/componenti/PaginaStile";
import { caricaViaggioScelto, VIAGGI } from "../src/dati/viaggi";
import { vistaHome } from "../src/viste/home";
import { blocchi, dichiarazioni, senzaCommentiCss } from "./supporto-css";
import { leggiApp, paginaCompleta } from "./supporto-ux";

interface Violazione {
  id: string;
  impact: string | null;
  help: string;
  nodes: { target: string[] }[];
}

/** Le violazioni di axe-core sulla pagina, con tutte le regole WCAG 2.x A e AA e le buone pratiche. */
async function violazioni(html: string): Promise<Violazione[]> {
  const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true });
  dom.window.eval(axe.source);
  const axeNellaPagina = (dom.window as unknown as { axe: typeof axe }).axe;
  const risultato = await axeNellaPagina.run(dom.window.document, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] },
    rules: { "color-contrast": { enabled: false } },
  });
  dom.window.close();
  return risultato.violations as Violazione[];
}

function gravi(elenco: Violazione[]): string[] {
  return elenco
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id} (${v.impact}): ${v.help} → ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

const PAGINE = {
  home: () => paginaCompleta(<PaginaHome viaggi={vistaHome(VIAGGI)} />, { titolo: "TravelOps" }),
  "home senza viaggi": () => paginaCompleta(<PaginaHome viaggi={[]} />, { titolo: "TravelOps" }),
  stile: () => paginaCompleta(<PaginaStile />, { titolo: "Stile · TravelOps" }),
  "giorno con mappa e schede in basso": () => {
    const esito = caricaViaggioScelto("v-volo");
    if (esito === null) throw new Error("viaggio mancante");
    return paginaCompleta(<ContenutoGiorno chiave="v-volo" esito={esito} data="2026-06-14" />, { titolo: "domenica 14 giugno 2026 · TravelOps" });
  },
};

describe("CA-5 un controllo automatico di accessibilità (axe) non trova violazioni gravi nella home e in /stile", () => {
  it("CA-5 il controllo funziona: una pagina con errori noti dà violazioni gravi", async () => {
    const sbagliata = `<!doctype html><html><head><title>x</title></head><body><main><img src="x.png"><button></button><input type="text"></main></body></html>`;
    const trovate = gravi(await violazioni(sbagliata)).map((v) => v.split(" ")[0]);
    expect(trovate).toEqual(expect.arrayContaining(["button-name", "html-has-lang", "image-alt", "label"]));
  });

  it.each(Object.entries(PAGINE))("CA-5 %s: nessuna violazione grave", async (_nome, pagina) => {
    const elenco = await violazioni(pagina());
    expect(gravi(elenco)).toEqual([]);
    // Anche le violazioni minori sono tenute a zero: se ne compare una, il test la mostra.
    expect(elenco.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  }, 60_000);
});

describe("CA-5 ogni componente interattivo si raggiunge da tastiera e ha il focus visibile", () => {
  it.each(Object.entries(PAGINE))("CA-5 %s: nessun elemento interattivo fuori dalla sequenza di Tab o con tabindex positivo", (_nome, pagina) => {
    const { document } = new JSDOM(pagina()).window;
    const problemi: string[] = [];
    for (const e of document.querySelectorAll("[tabindex]")) {
      const valore = Number(e.getAttribute("tabindex"));
      if (valore > 0) problemi.push(`tabindex positivo: ${e.outerHTML.slice(0, 80)}`);
    }
    // Ruoli interattivi su elementi non nativi: devono essere nella sequenza di Tab.
    for (const e of document.querySelectorAll("[role='button'], [role='slider'], [role='tab'], [role='checkbox'], [role='switch'], [role='link']")) {
      if (!e.matches("button, a[href], input") && e.getAttribute("tabindex") !== "0") problemi.push(`non raggiungibile: ${e.outerHTML.slice(0, 80)}`);
    }
    // Elementi interattivi nativi tolti dalla sequenza di Tab (ammesso solo il contenuto principale, destinazione del salto).
    for (const e of document.querySelectorAll("a[href], button, input:not([type='hidden']), select, textarea, summary")) {
      if (e.getAttribute("tabindex") === "-1") problemi.push(`tolto dalla sequenza: ${e.outerHTML.slice(0, 80)}`);
    }
    // Niente gestori di clic su elementi non interattivi (React non li scrive nell'HTML, ma un onclick in linea sì).
    for (const e of document.querySelectorAll("[onclick]")) problemi.push(`onclick: ${e.outerHTML.slice(0, 80)}`);
    expect(problemi).toEqual([]);
    expect(document.querySelector("a.ui-salta[href='#contenuto']")).not.toBeNull();
    expect(document.querySelector("main#contenuto")).not.toBeNull();
  });

  it("CA-5 il focus è sempre visibile: anello di 3 px nel colore del focus su tutti gli elementi interattivi", () => {
    const css = senzaCommentiCss(leggiApp("src/ui/ui.css"));
    const regola = /:where\(([^)]*(?:\([^)]*\)[^)]*)*)\):focus-visible\s*\{([^}]*)\}/.exec(css);
    if (regola === null) throw new Error("regola del focus mancante");
    for (const selettore of ["a[href]", "button", "input", "select", "textarea", "summary", "[tabindex]", '[role="slider"]']) {
      expect(regola[1]).toContain(selettore);
    }
    expect(dichiarazioni(regola[2] ?? "")).toEqual([
      { proprieta: "outline", valore: "var(--spessore-focus) solid var(--colore-focus)" },
      { proprieta: "outline-offset", valore: "2px" },
    ]);
    const token = dichiarazioni(blocchi(leggiApp("src/ui/token.css"), ":root,\n[data-tema]")[0] ?? "");
    expect(token).toContainEqual({ proprieta: "--spessore-focus", valore: "3px" });
    // Gli input nascosti dietro un'etichetta (tema, segmenti) mostrano il focus sull'etichetta.
    expect(css).toMatch(/\.ui-selettore-tema__voce:has\(input:focus-visible\)/);
    expect(css).toMatch(/\.ui-segmenti__voce:has\(input:focus-visible\)/);
  });

  it("CA-5 nessun foglio di stile toglie il focus senza mostrarlo altrove", () => {
    const tolti: string[] = [];
    for (const file of ["src/ui/ui.css", "app/globals.css"]) {
      const css = senzaCommentiCss(leggiApp(file));
      for (const [, selettore, corpo] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (!/outline:\s*(none|0)\b/.test(corpo ?? "")) continue;
        tolti.push(`${file}: ${(selettore ?? "").trim()}`);
      }
    }
    // Il contenuto principale (riceve il focus solo dal link "Vai al contenuto"), la regione delle notifiche e il
    // link della scheda viaggio, il cui focus si vede sull'intera scheda (`.scheda-viaggio:focus-within`).
    expect(tolti).toEqual(["src/ui/ui.css: .ui-notifiche", "app/globals.css: .contenuto:focus", "app/globals.css: .scheda-viaggio__link:focus-visible"]);
    expect(senzaCommentiCss(leggiApp("app/globals.css"))).toMatch(/\.scheda-viaggio:focus-within\s*\{\s*outline: var\(--spessore-focus\) solid var\(--colore-focus\);/);
  });

  it("CA-5 aree cliccabili di almeno 44×44 px: pulsanti, chip, voci di menu e tema usano --area-tocco", () => {
    const css = senzaCommentiCss(leggiApp("src/ui/ui.css"));
    expect(dichiarazioni(blocchi(leggiApp("src/ui/token.css"), ":root,\n[data-tema]")[0] ?? "")).toContainEqual({ proprieta: "--area-tocco", valore: "44px" });
    for (const classe of [".ui-pulsante {", ".ui-chip {", ".ui-navigazione__voce {", ".ui-selettore-tema__voce {", ".ui-contatore__pulsante {", ".ui-campo__controllo {"]) {
      expect([classe, /(min-)?height: var\(--area-tocco\)/.test(blocchi(css, classe)[0] ?? "")]).toEqual([classe, true]);
    }
  });
});
