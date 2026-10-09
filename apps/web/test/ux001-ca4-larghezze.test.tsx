/**
 * REQ-UX-001 CA-4 (controlli sul codice, sempre eseguiti): le regole che tengono le pagine dentro i 375 px e mettono in
 * griglia le schede della home a 1280 px. La misura vera nel browser è in `ux001-browser.test.tsx`.
 */
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { blocchi, dichiarazioni, senzaCommentiCss } from "./supporto-css";
import { fileApp, leggiApp, paginaCompleta, paginePrincipali } from "./supporto-ux";

/** Larghezza utile a 375 px: la finestra meno i margini laterali del contenuto (16 px per parte). */
const UTILE_TELEFONO = 375 - 2 * 16;

describe("CA-4 a 375 px nessuna pagina scorre in orizzontale; a 1280 px la home mostra le schede in griglia", () => {
  it("CA-4 la griglia della home: colonne da almeno 260 px che si riempiono da sole (4 a 1280 px, 1 a 375 px)", () => {
    const griglia = dichiarazioni(blocchi(leggiApp("app/globals.css"), ".home__griglia {")[0] ?? "");
    expect(griglia).toContainEqual({ proprieta: "display", valore: "grid" });
    const colonne = griglia.find((d) => d.proprieta === "grid-template-columns")?.valore ?? "";
    const minimo = /^repeat\(auto-fill, minmax\(min\(100%, (\d+)px\), 1fr\)\)$/.exec(colonne);
    expect(minimo).not.toBeNull();
    const larghezza = Number(minimo?.[1]);
    // `min(100%, …)`: sul telefono la colonna non supera mai lo spazio disponibile.
    expect(larghezza).toBeLessThanOrEqual(UTILE_TELEFONO);
    const spazio = 20; // --spazio-5
    const contenuto = 1200 - 2 * 16; // --larghezza-contenuto meno i margini
    expect(Math.floor((contenuto + spazio) / (larghezza + spazio))).toBeGreaterThanOrEqual(3);
    expect(Math.floor((UTILE_TELEFONO + spazio) / (larghezza + spazio))).toBe(1);
  });

  it("CA-4 nessuna larghezza fissa più grande del telefono fuori dalle regole per schermi grandi", () => {
    const fuori: string[] = [];
    for (const { file, testo } of fileApp(/\.css$/)) {
      // Si tolgono i blocchi per gli schermi grandi (min-width): lì le larghezze grandi sono ammesse.
      let css = senzaCommentiCss(testo);
      for (const blocco of blocchi(css, "@media (min-width")) css = css.replace(blocco, "");
      for (const { proprieta, valore } of dichiarazioni(css)) {
        if (!/^(width|min-width|flex-basis|grid-template-columns)$/.test(proprieta)) continue;
        // `min(Npx, 100vw…)` e `min(100%, Npx)` non superano mai la finestra.
        if (/(^|\s|\()min\(/.test(valore) && /100(%|vw)/.test(valore)) continue;
        for (const [, px] of valore.matchAll(/(\d+)px/g)) {
          if (Number(px) > UTILE_TELEFONO) fuori.push(`${file}: ${proprieta}: ${valore}`);
        }
      }
    }
    expect(fuori).toEqual([]);
  });

  it("CA-4 ogni tabella delle pagine principali diventa schede sul telefono: classe tabella--schede ed etichetta per ogni cella", () => {
    const senzaSchede: string[] = [];
    for (const { nome, contenuto } of paginePrincipali({ tuttiGliElementi: false })) {
      const { document } = new JSDOM(paginaCompleta(contenuto)).window;
      for (const tabella of document.querySelectorAll("table")) {
        // Le tabelle a due colonne (orari di apertura) stanno già nei 375 px.
        const colonne = tabella.querySelector("tr")?.children.length ?? 0;
        if (colonne <= 2) continue;
        if (!tabella.classList.contains("tabella--schede")) senzaSchede.push(`${nome}: ${tabella.className}`);
        for (const cella of tabella.querySelectorAll("tbody td")) {
          if (!cella.hasAttribute("data-etichetta")) senzaSchede.push(`${nome}: cella senza etichetta in ${tabella.className}`);
        }
      }
    }
    expect([...new Set(senzaSchede)]).toEqual([]);
  }, 120_000);

  it("CA-4 le regole delle schede valgono sul telefono e nelle colonne strette del layout di viaggio", () => {
    const css = senzaCommentiCss(leggiApp("app/globals.css"));
    const telefono = blocchi(css, "@media (max-width: 767px)").find((b) => b.includes(".tabella--schede thead"));
    const colonna = blocchi(css, "@container riquadro (max-width: 760px)").find((b) => b.includes(".tabella--schede thead"));
    expect(telefono).toBeDefined();
    expect(colonna).toBe(telefono);
    expect(leggiApp("src/ui/ui.css")).toMatch(/\.ui-layout-viaggio__riquadro \{\s*container: riquadro \/ inline-size;/);
  });
});
