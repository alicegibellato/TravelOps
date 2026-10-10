/**
 * REQ-UX-001 CA-2 (aggiornato da REQ-UX-002): contrasto del testo almeno 4.5:1 in tema chiaro e scuro, verificato sui
 * token in OKLCH (OKLCH → sRGB → luminanza relativa WCAG 2.2), anche quando sono mescolati con `color-mix`. Le coppie sono
 * quelle che l'interfaccia usa davvero (`src/ui/contrasto.ts`); il test controlla anche che ogni colore di testo
 * usato nei fogli di stile sia tra quelle coppie.
 */
import { describe, expect, it } from "vitest";
import {
  inEsadecimale,
  inGammaSrgb,
  CONTRASTO_MINIMO_GRAFICA,
  CONTRASTO_MINIMO_TESTO,
  COPPIE_GRAFICHE,
  COPPIE_TESTO,
  rapportoContrasto,
  STILI_COLORE,
  type CoppiaColori,
} from "../src/ui/contrasto";
import { dichiarazioni, tokenDelTema } from "./supporto-css";
import { fileApp, leggiApp } from "./supporto-ux";

const TEMI = ["chiaro", "scuro"] as const;

function sottoSoglia(coppie: readonly CoppiaColori[], minimo: number): string[] {
  const token = leggiApp("src/ui/token.css");
  const risultati: string[] = [];
  for (const tema of TEMI) {
    const valori = tokenDelTema(token, tema);
    for (const { primoPiano, sfondo } of coppie) {
      const a = valori.get(primoPiano);
      const b = valori.get(sfondo);
      if (a === undefined || b === undefined) {
        risultati.push(`${tema}: token mancante ${primoPiano} / ${sfondo}`);
        continue;
      }
      const rapporto = rapportoContrasto(a, b);
      if (rapporto < minimo) risultati.push(`${tema}: ${primoPiano} (${a}) su ${sfondo} (${b}) = ${rapporto.toFixed(2)}:1`);
    }
  }
  return risultati;
}

describe("CA-2 contrasto del testo almeno 4.5:1 in tema chiaro e scuro", () => {
  it("CA-2 il calcolo segue WCAG 2.2: nero su bianco 21:1, bianco su bianco 1:1, #767676 su bianco 4.54:1", () => {
    expect(rapportoContrasto("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(rapportoContrasto("#fff", "#ffffff")).toBeCloseTo(1, 5);
    expect(rapportoContrasto("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
  });

  it("CA-2 il calcolo legge OKLCH e color-mix: oklch(1 0 0) su oklch(0 0 0) 21:1, grigio L 0.5 su bianco 6:1, miscela 50% = L 0.5", () => {
    expect(rapportoContrasto("oklch(1 0 0)", "oklch(0 0 0)")).toBeCloseTo(21, 3);
    expect(rapportoContrasto("oklch(0.5 0 0)", "oklch(1 0 0)")).toBeCloseTo(6, 3);
    expect(rapportoContrasto("color-mix(in oklch, oklch(1 0 0) 50%, oklch(0 0 0))", "oklch(1 0 0)")).toBeCloseTo(6, 3);
    // Gli esadecimali restano leggibili e OKLCH converte in sRGB con i canali di bianco e nero esatti.
    expect(inEsadecimale("oklch(1 0 0)")).toBe("#ffffff");
    expect(inEsadecimale("oklch(0 0 0)")).toBe("#000000");
    expect(rapportoContrasto("oklch(0.5 0 0)", "#ffffff")).toBeCloseTo(rapportoContrasto(inEsadecimale("oklch(0.5 0 0)"), "#ffffff"), 1);
    // Percentuali, tinte e trasparenza: la miscela con `transparent` tiene il colore e dimezza solo l'opacità.
    expect(() => rapportoContrasto("color-mix(in oklch, oklch(1 0 0) 50%, transparent)", "oklch(0 0 0)")).toThrow(/non opaco/);
    expect(() => rapportoContrasto("rgb(0 0 0)", "#ffffff")).toThrow(/non valido/);
  });

  it("CA-2 ogni colore opaco dei token sta dentro la gamma sRGB: il browser non lo modifica per portarlo a schermo", () => {
    const token = leggiApp("src/ui/token.css");
    const fuori: string[] = [];
    for (const tema of TEMI) {
      for (const [nome, valore] of tokenDelTema(token, tema)) {
        if (nome.startsWith("--colore-") && !valore.includes("transparent") && !valore.includes("/") && !inGammaSrgb(valore)) fuori.push(`${tema}: ${nome} ${valore}`);
      }
    }
    expect(fuori).toEqual([]);
  });

  it("CA-2 i valori dei due temi sono diversi: il tema scuro non è una copia del chiaro", () => {
    const token = leggiApp("src/ui/token.css");
    const chiaro = tokenDelTema(token, "chiaro");
    const scuro = tokenDelTema(token, "scuro");
    expect(chiaro.get("--colore-sfondo")).not.toBe(scuro.get("--colore-sfondo"));
    expect(rapportoContrasto(chiaro.get("--colore-sfondo") ?? "", "oklch(1 0 0)")).toBeLessThan(1.1);
    expect(rapportoContrasto(scuro.get("--colore-sfondo") ?? "", "oklch(0 0 0)")).toBeLessThan(1.3);
  });

  it(`CA-2 ogni coppia testo/sfondo dell'interfaccia ha almeno ${CONTRASTO_MINIMO_TESTO}:1, in entrambi i temi`, () => {
    expect(COPPIE_TESTO.length).toBeGreaterThan(60);
    expect(sottoSoglia(COPPIE_TESTO, CONTRASTO_MINIMO_TESTO)).toEqual([]);
  });

  it("CA-2 gli stati derivati (forte, attivo, tenue) non hanno un valore proprio: sono miscele dei colori di base", () => {
    const token = leggiApp("src/ui/token.css");
    const grezzi = new Map(dichiarazioni(token).map((d) => [d.proprieta, d.valore] as const));
    for (const famiglia of ["primario", "secondario"]) {
      for (const stato of ["forte", "attivo", "tenue"]) {
        expect(grezzi.get(`--colore-${famiglia}-${stato}`)).toMatch(new RegExp(`^color-mix\\(in oklch, var\\(--colore-${famiglia}\\)`));
      }
    }
    for (const base of ["accento", "successo", "attenzione", "errore", ...STILI_COLORE.map((s) => `stile-${s}`)]) {
      expect(grezzi.get(`--colore-${base}-tenue`)).toMatch(new RegExp(`^color-mix\\(in oklch, var\\(--colore-${base}\\)`));
    }
  });

  it(`CA-2 bordi dei campi e anello del focus hanno almeno ${CONTRASTO_MINIMO_GRAFICA}:1 (WCAG 1.4.11)`, () => {
    expect(sottoSoglia(COPPIE_GRAFICHE, CONTRASTO_MINIMO_GRAFICA)).toEqual([]);
  });

  it("CA-2 ogni colore usato per il testo nei fogli di stile è tra le coppie verificate", () => {
    const verificati = new Set(COPPIE_TESTO.map((c) => c.primoPiano));
    const nonVerificati: string[] = [];
    for (const { file, testo } of fileApp(/\.css$/)) {
      for (const { proprieta, valore } of dichiarazioni(testo)) {
        if (proprieta !== "color") continue;
        for (const [, nome] of valore.matchAll(/var\((--colore-[\w-]+)\)/g)) {
          if (nome !== undefined && !verificati.has(nome)) nonVerificati.push(`${file}: color: ${valore}`);
        }
      }
    }
    expect(nonVerificati).toEqual([]);
  });
});
