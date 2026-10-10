/**
 * REQ-UX-002, controlli con l'impaginazione vera, nel browser di sistema senza rete (come `ux001-browser.test.tsx`):
 * - CA-3: a 320, 375 e 1280 px nessuna pagina principale scorre in orizzontale e la scala tipografica è fluida;
 * - container query: scheda, linea del tempo e pannello chat sono contenitori e le loro regole si applicano alla
 *   larghezza del contenitore, non a quella della finestra;
 * - CA-4: con `prefers-reduced-motion` tutte le durate dei token valgono zero.
 * Senza browser i test si saltano in locale (con un avviso) ma non nella CI, dove falliscono.
 */
import { chromium, type Browser, type Page } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PaginaHome } from "../src/componenti/PaginaHome";
import { VIAGGI } from "../src/dati/viaggi";
import { vistaHome } from "../src/viste/home";
import { IN_CI, paginaCompleta, paginePrincipali, trovaBrowser } from "./supporto-ux";

const percorsoBrowser = trovaBrowser();
if (percorsoBrowser === null && !IN_CI) {
  console.warn("Nessun browser di sistema (Chrome, Edge, Chromium): i controlli nel browser di REQ-UX-002 sono saltati. Indica TRAVELOPS_BROWSER.");
}

let browser: Browser | null = null;

beforeAll(async () => {
  if (percorsoBrowser !== null) browser = await chromium.launch({ executablePath: percorsoBrowser, headless: true });
}, 60_000);

afterAll(async () => {
  await browser?.close();
}, 60_000);

async function apri(larghezza: number, opzioni: { altezza?: number; movimentoRidotto?: boolean } = {}): Promise<Page> {
  if (browser === null) throw new Error("browser non disponibile");
  const pagina = await browser.newPage({
    viewport: { width: larghezza, height: opzioni.altezza ?? 900 },
    reducedMotion: opzioni.movimentoRidotto === true ? "reduce" : "no-preference",
  });
  await pagina.route("**/*", (richiesta) => (richiesta.request().url().startsWith("data:") ? richiesta.continue() : richiesta.abort()));
  return pagina;
}

describe.skipIf(percorsoBrowser === null && !IN_CI)("REQ-UX-002 nel browser", () => {
  it("nella CI il browser di sistema c'è: i controlli nel browser non si saltano", () => {
    expect(percorsoBrowser).not.toBeNull();
  });

  it.each([320, 375])("CA-3 a %i px nessuna pagina principale scorre in orizzontale", async (larghezza) => {
    const pagine = paginePrincipali({ tuttiGliElementi: false });
    const pagina = await apri(larghezza, { altezza: 812 });
    const larghe: string[] = [];
    for (const { nome, contenuto } of pagine) {
      await pagina.setContent(paginaCompleta(contenuto, { conCss: true }), { waitUntil: "load" });
      const misure = await pagina.evaluate(() => ({ scorrimento: document.documentElement.scrollWidth, finestra: document.documentElement.clientWidth }));
      if (misure.scorrimento > misure.finestra) larghe.push(`${nome}: ${misure.scorrimento}px > ${misure.finestra}px`);
    }
    await pagina.close();
    expect(pagine.length).toBeGreaterThan(60);
    expect(larghe).toEqual([]);
  }, 300_000);

  it("CA-3 la scala tipografica è fluida: il corpo misura 16 px a 320 px e cresce a 1280 px; i titoli crescono di più", async () => {
    const misura = async (larghezza: number) => {
      const pagina = await apri(larghezza);
      await pagina.setContent(paginaCompleta(<PaginaHome viaggi={vistaHome(VIAGGI)} />, { conCss: true }), { waitUntil: "load" });
      const risultato = await pagina.evaluate(() => {
        const px = (nome: string) => {
          const sonda = document.createElement("i");
          sonda.style.fontSize = `var(${nome})`;
          document.body.append(sonda);
          const v = Number.parseFloat(getComputedStyle(sonda).fontSize);
          sonda.remove();
          return v;
        };
        return { m: px("--testo-m"), xl: px("--testo-xl"), x4: px("--testo-4xl") };
      });
      await pagina.close();
      return risultato;
    };
    const piccolo = await misura(320);
    const medio = await misura(800);
    const grande = await misura(1280);
    expect(piccolo.m).toBeCloseTo(16, 1);
    expect(grande.m).toBeCloseTo(17, 1);
    expect(piccolo.x4).toBeCloseTo(30, 1);
    expect(grande.x4).toBeCloseTo(44, 1);
    for (const passo of ["m", "xl", "x4"] as const) {
      expect(medio[passo]).toBeGreaterThan(piccolo[passo]);
      expect(medio[passo]).toBeLessThan(grande[passo]);
    }
  }, 60_000);

  it("container query: a 1280 px la home ha 4 colonne e le schede sono contenitori; a 375 e 320 px una colonna", async () => {
    const colonne = async (larghezza: number) => {
      const pagina = await apri(larghezza);
      await pagina.setContent(paginaCompleta(<PaginaHome viaggi={vistaHome(VIAGGI)} />, { conCss: true }), { waitUntil: "load" });
      const risultato = await pagina.evaluate(() => {
        const schede = [...document.querySelectorAll<HTMLElement>(".home__griglia > .scheda-viaggio")];
        const rettangoli = schede.map((s) => s.getBoundingClientRect());
        const corpo = schede[0]?.querySelector<HTMLElement>(".scheda-viaggio__corpo");
        return {
          schede: schede.length,
          colonne: new Set(rettangoli.map((r) => Math.round(r.left))).size,
          contenitore: schede.every((s) => getComputedStyle(s).containerType === "inline-size"),
          larghezzaScheda: Math.round(rettangoli[0]?.width ?? 0),
          paddingSinistro: corpo === undefined || corpo === null ? 0 : Number.parseFloat(getComputedStyle(corpo).paddingLeft),
          scorrimento: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      await pagina.close();
      return risultato;
    };
    const grande = await colonne(1280);
    expect(grande).toMatchObject({ schede: 4, colonne: 4, contenitore: true, scorrimento: 0 });
    const telefono = await colonne(375);
    expect(telefono).toMatchObject({ schede: 4, colonne: 1, contenitore: true, scorrimento: 0 });
    expect((await colonne(320)).scorrimento).toBe(0);
    // La scheda a una colonna da 375 px è più larga di 22 rem? No (343 px): niente padding ampio; la regola segue il contenitore.
    expect(telefono.larghezzaScheda).toBeLessThan(22 * 16);
    expect(telefono.paddingSinistro).toBeLessThan(grande.paddingSinistro + 100);
  }, 60_000);

  it("container query: una regola @container segue la larghezza del contenitore, non quella della finestra", async () => {
    const pagina = await apri(1280);
    // Due scatole nella stessa finestra larga 1280 px: una larga 600 px e una di 300 px. Solo la stretta riceve la regola.
    await pagina.setContent(
      `<!doctype html><html lang="it"><head><style>
        .c { container: prova / inline-size; }
        .x { color: rgb(0 0 255); }
        @container prova (max-width: 24rem) { .x { color: rgb(255 0 0); } }
      </style></head><body><div class="c" style="width:600px"><p class="x" id="largo">a</p></div><div class="c" style="width:300px"><p class="x" id="stretto">b</p></div></body></html>`,
      { waitUntil: "load" },
    );
    const colori = await pagina.evaluate(() => ["largo", "stretto"].map((id) => getComputedStyle(document.getElementById(id) as Element).color));
    await pagina.close();
    expect(colori).toEqual(["rgb(0, 0, 255)", "rgb(255, 0, 0)"]);
  });

  it("CA-4 con prefers-reduced-motion tutte le durate dei token valgono zero; senza, i token sono 100–250 ms", async () => {
    const durate = async (movimentoRidotto: boolean) => {
      const pagina = await apri(1280, { movimentoRidotto });
      await pagina.setContent(paginaCompleta(<PaginaHome viaggi={vistaHome(VIAGGI)} />, { conCss: true }), { waitUntil: "load" });
      const valori = await pagina.evaluate(() => {
        const stile = getComputedStyle(document.documentElement);
        return ["minima", "breve", "media", "lunga"].map((n) => stile.getPropertyValue(`--durata-${n}`).trim());
      });
      await pagina.close();
      return valori;
    };
    expect(await durate(false)).toEqual(["100ms", "150ms", "200ms", "250ms"]);
    expect(await durate(true)).toEqual(["0ms", "0ms", "0ms", "0ms"]);
  }, 60_000);
});
