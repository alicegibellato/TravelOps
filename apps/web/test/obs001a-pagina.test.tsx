/**
 * ST-OBS-001A (REQ-OBS-001, CA-1, CA-2 e CA-4 parte test): la pagina «Qualità dei test» mostra totali, esiti per suite,
 * data, durata e link ai log; senza file (o con un file rotto) dice chiaramente cosa fare. Stile solo con i token del
 * design system; controllo automatico di accessibilità (DV-ui-accessibility).
 */
import axe from "axe-core";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { PaginaQualita } from "../src/componenti/PaginaQualita";
import { interpretaRapporto, type EsitoLetturaRapporto } from "../src/qualita/rapporto";
import { rapportoDiProva } from "./supporto-qualita";
import { dichiarazioni, senzaCommentiCss } from "./supporto-css";
import { leggiApp, paginaCompleta, testoVisibile } from "./supporto-ux";

const PERCORSO = "/repo/reports/test-report.json";
const ok = (grezzo: unknown = rapportoDiProva()): EsitoLetturaRapporto => ({ stato: "ok", percorso: PERCORSO, rapporto: interpretaRapporto(grezzo) });
const html = (esito: EsitoLetturaRapporto): string => paginaCompleta(<PaginaQualita esito={esito} fuso="UTC" />, { titolo: "Qualità dei test" });
const documento = (markup: string): Document => new JSDOM(markup).window.document;

describe("pagina con il report (CA-1)", () => {
  const d = documento(html(ok()));

  it("ha un solo titolo di primo livello, la data dell'ultimo report e la durata complessiva", () => {
    expect([...d.querySelectorAll("h1")].map((h) => h.textContent)).toEqual(["Qualità dei test"]);
    expect(d.querySelector(".sottotitolo")?.textContent).toMatch(/10 ottobre 2026.*08:58.*durata complessiva 25 s/);
  });

  it("mostra i totali di tutte le suite: totali, superati, falliti, saltati", () => {
    const totali = Object.fromEntries([...d.querySelectorAll("[data-totale]")].map((e) => [e.getAttribute("data-totale"), e.querySelector("dd")?.textContent]));
    expect(totali).toEqual({ totali: "15", superati: "12", falliti: "2", saltati: "1" });
  });

  it("per ogni suite: esito in parole, conteggi, durata, data e link al log", () => {
    const righe = [...d.querySelectorAll("tr[data-suite]")];
    expect(righe.map((r) => [r.getAttribute("data-suite"), r.getAttribute("data-esito")])).toEqual([
      ["engine", "superata"],
      ["web", "fallita"],
      ["e2e", "errore"],
    ]);
    const web = righe[1] as Element;
    const celle = (r: Element) => [...r.querySelectorAll("td")].map((c) => c.textContent?.replace(/\s+/g, " ").trim());
    expect(celle(web).slice(0, 8)).toEqual(["Unit webUnit", "Fallita", "5", "2", "2", "1", "21 s", "10 ottobre 2026, 08:51"]);
    expect(web.querySelector("a")?.getAttribute("href")).toBe("/qualita/log/web");
    expect(web.querySelector("a")?.textContent).toBe("Apri il log di Unit web");
    // Una suite non eseguita lo dice, con il motivo, e senza log non finge un link.
    const e2e = righe[2] as Element;
    expect(e2e.textContent).toContain("Non eseguita");
    expect(e2e.textContent).toContain("La suite si è fermata senza un esito");
    expect(e2e.querySelector("a")).toBeNull();
    expect(e2e.textContent).toContain("Non disponibile");
  });

  it("il significato non sta solo nel colore e le celle hanno l'etichetta per la vista a schede del telefono", () => {
    expect(d.querySelector("[data-esito='ko']")?.textContent).toContain("2 test falliti");
    const intestazioni = [...d.querySelectorAll("thead th")].map((t) => t.textContent);
    const etichette = [...d.querySelectorAll("tr[data-suite='engine'] td")].map((c) => c.getAttribute("data-etichetta"));
    expect(etichette).toEqual(intestazioni.map((t) => (t === "Eseguita il" ? "Eseguita il" : t)));
  });

  it("con tutte le suite superate lo dice (e conta anche i saltati)", () => {
    const base = rapportoDiProva();
    const tutteOk = { ...base, suite: [base.suite[0]] };
    const t = testoVisibile(html(ok(tutteOk)));
    expect(t).toContain("Tutti i test sono superati");
    expect(t).toContain("10 test superati in 1 suite");
    expect(documento(html(ok(tutteOk))).querySelector("[data-esito='ok']")).not.toBeNull();
  });

  it("la voce «Qualità» è nel menu e punta a /qualita", () => {
    expect(d.querySelector("nav[aria-label='Sezioni'] a[href='/qualita']")?.textContent).toBe("Qualità");
  });
});

describe("senza report (CA-2)", () => {
  it("stato vuoto chiaro: dice che il report manca, dove lo cerca e come generarlo", () => {
    const markup = html({ stato: "assente", percorso: PERCORSO });
    const d = documento(markup);
    expect(d.querySelector("[data-stato='assente']")).not.toBeNull();
    expect([...d.querySelectorAll("h1")].map((h) => h.textContent)).toEqual(["Nessun report dei test"]);
    const t = testoVisibile(markup);
    expect(t).toContain(PERCORSO);
    expect(t).toContain("npx tsx scripts/esegui-test.ts --tipo unit");
    expect(t).toContain("npx tsx scripts/esegui-test.ts --tipo e2e");
    expect(t).toContain("TRAVELOPS_RAPPORTO_TEST");
    expect(d.querySelector("table")).toBeNull();
  });

  it("file non valido: lo dice con il motivo e indica come rigenerarlo", () => {
    const markup = html({ stato: "non_valido", percorso: PERCORSO, motivo: "non è un JSON valido" });
    const d = documento(markup);
    expect(d.querySelector("[data-stato='non-valido']")).not.toBeNull();
    expect([...d.querySelectorAll("h1")].map((h) => h.textContent)).toEqual(["Il report dei test non è leggibile"]);
    expect(testoVisibile(markup)).toContain("non è un JSON valido");
    expect(testoVisibile(markup)).toContain("npx tsx scripts/esegui-test.ts --tipo unit");
  });
});

describe("accessibilità e stile (DV-ui-accessibility, design system)", () => {
  async function violazioniGravi(markup: string): Promise<string[]> {
    const dom = new JSDOM(markup, { runScripts: "outside-only", pretendToBeVisual: true });
    dom.window.eval(axe.source);
    const axeNellaPagina = (dom.window as unknown as { axe: typeof axe }).axe;
    const risultato = await axeNellaPagina.run(dom.window.document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] },
      rules: { "color-contrast": { enabled: false } },
    });
    dom.window.close();
    return risultato.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
  }

  it("axe non trova violazioni gravi con il report, senza report e con il file rotto", async () => {
    for (const esito of [ok(), { stato: "assente", percorso: PERCORSO } as const, { stato: "non_valido", percorso: PERCORSO, motivo: "x" } as const]) {
      expect(await violazioniGravi(html(esito))).toEqual([]);
    }
  });

  it("gli stili della pagina usano solo token (nessun colore scritto a mano) e le aree cliccabili restano da 44 px", () => {
    const css = senzaCommentiCss(leggiApp("app/globals.css"));
    const inizio = css.indexOf(".qualita__riepilogo");
    expect(inizio).toBeGreaterThan(0);
    const sezione = css.slice(inizio);
    for (const { proprieta, valore } of dichiarazioni(sezione)) {
      if (/color|background|border|box-shadow/.test(proprieta)) {
        expect([proprieta, valore, /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(/i.test(valore)]).toEqual([proprieta, valore, false]);
      }
    }
    expect(sezione).toMatch(/\.qualita__log\s*\{[^}]*min-height: var\(--area-tocco\)/);
  });
});
