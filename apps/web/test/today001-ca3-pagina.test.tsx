/**
 * ST-TODAY-001, CA-3 di REQ-TODAY-001: su telefono "Oggi" è la scheda iniziale di un viaggio in corso (pagina, CSS e
 * accessibilità). La pagina del viaggio legge l'orologio simulato: se il viaggio è in corso si apre sulla scheda "Oggi";
 * sul telefono (fino a 767 px) si vede solo il riquadro attivo. Fuori dal viaggio la vista viaggio resta com'era.
 */
import axe from "axe-core";
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";
import PaginaViaggio from "../app/viaggi/[viaggio]/page";
import PaginaOggi from "../app/viaggi/[viaggio]/oggi/page";
import { ContenutoOggi, ContenutoViaggioInCorso } from "../src/componenti/ContenutiOggi";
import { datiOggi } from "../src/oggi/operazioni";
import { MESSAGGIO_RITARDO_NON_SEGNALATO } from "../src/oggi/ritardi";
import { impostaOrologio } from "../src/stato/operazioni";
import { datiValidi, html } from "./supporto";
import { blocchi, senzaCommentiCss } from "./supporto-css";
import { comeHtml, nuovaCartella } from "./supporto-stato";
import { leggiApp, paginaCompleta } from "./supporto-ux";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((indirizzo: string) => {
    throw new Error(`REDIRECT ${indirizzo}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NOT FOUND");
  }),
  usePathname: () => "/viaggi/versione-1",
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

afterEach(() => {
  vi.restoreAllMocks();
});

const nessuna = (): void => undefined;
const parametri = (viaggio: string) => Promise.resolve({ viaggio });

/** Una cartella di lavoro finta per Next.js, con l'orologio simulato impostato. */
function conOrologio(data: string, ora: string): string {
  const cartella = nuovaCartella();
  impostaOrologio(`${cartella}/.data`, data, ora);
  vi.spyOn(process, "cwd").mockReturnValue(cartella);
  return cartella;
}

async function violazioniGravi(markup: string): Promise<string[]> {
  const dom = new JSDOM(markup, { runScripts: "outside-only", pretendToBeVisual: true });
  dom.window.eval(axe.source);
  const axeNellaPagina = (dom.window as unknown as { axe: typeof axe }).axe;
  const risultato = await axeNellaPagina.run(dom.window.document, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] },
    rules: { "color-contrast": { enabled: false } },
  });
  dom.window.close();
  return risultato.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

describe("CA-3 la pagina del viaggio si apre su «Oggi» quando il viaggio è in corso", () => {
  it("CA-3 con l'orologio al 2026-06-13 alle 10:30 la scheda «Oggi» è premuta e il suo riquadro è quello attivo", async () => {
    conOrologio("2026-06-13", "10:30");
    const markup = html(await PaginaViaggio({ params: parametri("versione-1") }));
    expect(markup).toMatch(/aria-pressed="true"[^>]*><svg[^>]*lucide-calendar-days[^>]*>.*?<span>Oggi<\/span>/);
    expect(markup).toContain('data-riquadro="oggi" data-attivo="true"');
    expect(markup).toContain('data-riquadro="itinerario" data-attivo="false"');
    expect(markup).toContain('id="viaggio-titolo"');
  });

  it("CA-3 fuori dal viaggio (2026-06-20) la vista viaggio resta com'era, senza schede in basso", async () => {
    conOrologio("2026-06-20", "10:30");
    const markup = html(await PaginaViaggio({ params: parametri("versione-1") }));
    expect(markup).not.toContain("ui-schede-basso");
    expect(markup).not.toContain('data-riquadro="oggi"');
    expect(markup).toContain('id="viaggio-titolo"');
  });

  it("CA-3 sul telefono si vede solo il riquadro attivo; su schermo grande il riquadro «Oggi» non si vede", () => {
    const css = senzaCommentiCss(leggiApp("src/ui/ui.css"));
    expect(blocchi(css, "@media (max-width: 767px)").join("\n")).toContain('.ui-layout-viaggio__riquadro[data-attivo="false"]');
    expect(blocchi(css, "@media (min-width: 1100px)").join("\n")).toContain(".ui-layout-viaggio__oggi");
  });
});

describe("CA-3 la pagina Oggi di un viaggio, su tutti gli schermi", () => {
  it("CA-3 la pagina Oggi mostra Adesso e Dopo all'orologio simulato e l'errore di un ritardo non segnalato", async () => {
    conOrologio("2026-06-13", "10:30");
    const markup = html(await PaginaOggi({ params: parametri("versione-1"), searchParams: Promise.resolve({ errore: "ritardo" }) }));
    expect(markup).toContain('data-momento="2026-06-13 10:30"');
    expect(markup).toContain('data-scheda="adesso"');
    expect(markup).toContain('data-scheda="dopo"');
    expect(markup).toContain(comeHtml(MESSAGGIO_RITARDO_NON_SEGNALATO));
  });

  it("CA-3 un viaggio sconosciuto non ha la pagina Oggi", async () => {
    conOrologio("2026-06-13", "10:30");
    await expect(PaginaOggi({ params: parametri("sconosciuto"), searchParams: Promise.resolve({}) })).rejects.toThrow("NOT FOUND");
  });

  it("CA-3 la vista viaggio in corso e la pagina Oggi non hanno violazioni gravi di accessibilità (axe, senza il contrasto)", async () => {
    const cartella = nuovaCartella();
    impostaOrologio(cartella, "2026-06-13", "10:30");
    const dati = datiOggi(cartella, "versione-1");
    if (dati === null) throw new Error("viaggio mancante");
    const pagine = [
      paginaCompleta(<ContenutoViaggioInCorso chiave="versione-1" esito={datiValidi("versione-1")} dati={dati} azioni={{ segnalaRitardo: nessuna }} />),
      paginaCompleta(<ContenutoOggi chiave="versione-1" dati={dati} azioni={{ segnalaRitardo: nessuna }} errore={MESSAGGIO_RITARDO_NON_SEGNALATO} />),
    ];
    for (const markup of pagine) expect(await violazioniGravi(markup)).toEqual([]);
  });
});
