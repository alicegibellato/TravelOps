/**
 * REQ-UX-001 CA-1: tutti i colori dell'app vengono dai token; nessun colore scritto direttamente nei componenti.
 * I valori di colore compaiono solo in `src/ui/token.css`; CSS e componenti usano `var(--…)`.
 */
import { describe, expect, it } from "vitest";
import { coloreLetterale, dichiarazioni, senzaCommentiCss, tokenDelTema } from "./supporto-css";
import { fileApp, leggiApp } from "./supporto-ux";

const FILE_COLORI = "src/ui/token.css";

describe("CA-1 tutti i colori vengono dai token", () => {
  it("CA-1 i colori sono definiti una volta sola, nel file dei token, con versione chiara e scura", () => {
    const css = fileApp(/\.css$/).map((f) => f.file);
    expect(css.sort()).toEqual(["app/globals.css", "src/ui/token.css", "src/ui/ui.css"]);
    const token = leggiApp(FILE_COLORI);
    const colori = dichiarazioni(token).filter((d) => d.proprieta.startsWith("--colore-"));
    expect(colori.length).toBeGreaterThan(40);
    // Ogni colore ha il valore per il tema chiaro e per lo scuro, o rimanda a un altro token.
    for (const { proprieta, valore } of colori) {
      expect([proprieta, /^light-dark\(.+,.+\)$|^var\(--colore-[\w-]+\)$/.test(valore)]).toEqual([proprieta, true]);
    }
  });

  it("CA-1 nei fogli di stile dei componenti e delle pagine nessun colore è scritto direttamente", () => {
    const trovati: string[] = [];
    for (const { file, testo } of fileApp(/\.css$/).filter((f) => f.file !== FILE_COLORI)) {
      for (const { proprieta, valore } of dichiarazioni(testo)) {
        const letterale = coloreLetterale(valore);
        if (letterale !== null) trovati.push(`${file}: ${proprieta}: ${valore} (${letterale})`);
      }
    }
    expect(trovati).toEqual([]);
  });

  it("CA-1 ogni variabile usata nei fogli di stile esiste: niente colori di ripiego nascosti", () => {
    const definite = new Set(tokenDelTema(leggiApp(FILE_COLORI), "chiaro").keys());
    // Variabili locali dei componenti (tinta dei chip, dell'avviso…), anch'esse definite con i token.
    for (const { testo } of fileApp(/\.css$/)) {
      for (const d of dichiarazioni(testo)) if (d.proprieta.startsWith("--")) definite.add(d.proprieta);
    }
    const mancanti: string[] = [];
    for (const { file, testo } of fileApp(/\.css$/)) {
      for (const [, nome] of senzaCommentiCss(testo).matchAll(/var\((--[\w-]+)/g)) {
        if (nome !== undefined && !definite.has(nome) && !nome.startsWith("--radix-")) mancanti.push(`${file}: ${nome}`);
      }
    }
    expect(mancanti).toEqual([]);
  });

  it("CA-1 nei componenti (TSX/TS) nessun colore: niente esadecimali, funzioni di colore, stili in linea o fill colorati", () => {
    const trovati: string[] = [];
    for (const { file, testo } of fileApp(/\.(tsx?|mjs)$/)) {
      const codice = testo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
      const regole: [string, RegExp][] = [
        ["esadecimale", /["'`]#[0-9a-fA-F]{3,8}["'`]/],
        ["funzione di colore", /\b(rgba?|hsla?|hwb|oklab|oklch|color-mix|light-dark)\(/],
        ["stile in linea con colori", /style=\{\{[^}]*(color|background|border|fill|stroke)/i],
        ["fill o stroke colorati", /\b(fill|stroke|stopColor|stop-color)=["'{](?!currentColor|none|var\()/],
      ];
      for (const [nome, regola] of regole) if (regola.test(codice)) trovati.push(`${file}: ${nome}`);
    }
    expect(trovati).toEqual([]);
  });

  it("CA-1 i colori di Leaflet (popup, controlli, attribuzione) sono riportati ai token", () => {
    const pagine = leggiApp("app/globals.css");
    for (const selettore of [".leaflet-popup-content-wrapper", ".leaflet-bar a", ".leaflet-control-attribution", ".leaflet-container"]) {
      expect(pagine).toContain(selettore);
    }
  });

  it("CA-1 il layout importa i token prima dei componenti e delle pagine", () => {
    const layout = leggiApp("app/layout.tsx");
    const ordine = ["../src/ui/token.css", "../src/ui/ui.css", "./globals.css"].map((f) => layout.indexOf(`import "${f}"`));
    expect(ordine.every((posizione) => posizione > 0)).toBe(true);
    expect([...ordine].sort((a, b) => a - b)).toEqual(ordine);
    expect(layout.indexOf('import "leaflet/dist/leaflet.css"')).toBeLessThan(ordine[0] ?? 0);
  });
});
