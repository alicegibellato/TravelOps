/**
 * REQ-UX-001 CA-7: con `prefers-reduced-motion` le animazioni sono disattivate. Le durate sono token (150–250 ms) e
 * con la preferenza attiva valgono zero; una regola globale ferma anche le animazioni di librerie esterne (Leaflet,
 * Radix UI). La verifica con il browser vero è in `ux001-browser.test.tsx`.
 */
import { describe, expect, it } from "vitest";
import { blocchi, dichiarazioni, senzaCommentiCss } from "./supporto-css";
import { fileApp, leggiApp } from "./supporto-ux";

const PROPRIETA_MOVIMENTO = /^(transition|transition-duration|transition-delay|animation|animation-duration|animation-delay)$/;

function millisecondi(valore: string): number {
  const trovato = /^(\d+(?:\.\d+)?)(ms|s)$/.exec(valore.trim());
  if (trovato === null) throw new Error(`durata non valida: ${valore}`);
  return Number(trovato[1]) * (trovato[2] === "s" ? 1000 : 1);
}

describe("CA-7 con prefers-reduced-motion le animazioni sono disattivate", () => {
  const token = leggiApp("src/ui/token.css");
  const radice = blocchi(token, ":root,\n[data-tema]")[0] ?? "";
  const durate = dichiarazioni(radice).filter((d) => d.proprieta.startsWith("--durata-"));

  it("CA-7 le transizioni brevi durano tra 150 e 250 ms (REQ-UX-001 §6.1)", () => {
    const brevi = durate.filter((d) => d.proprieta !== "--durata-scheletro");
    expect(brevi.map((d) => d.proprieta)).toEqual(["--durata-breve", "--durata-media", "--durata-lunga"]);
    for (const { valore } of brevi) {
      expect(millisecondi(valore)).toBeGreaterThanOrEqual(150);
      expect(millisecondi(valore)).toBeLessThanOrEqual(250);
    }
  });

  it("CA-7 ogni transizione e animazione dei fogli di stile usa le durate dei token, mai un valore scritto a mano", () => {
    const fuoriToken: string[] = [];
    let usate = 0;
    for (const { file, testo } of fileApp(/\.css$/).filter((f) => f.file !== "src/ui/token.css")) {
      for (const { proprieta, valore } of dichiarazioni(testo)) {
        if (!PROPRIETA_MOVIMENTO.test(proprieta)) continue;
        usate += 1;
        if (/\d(ms|s)\b/.test(valore.replace(/var\([^)]*\)/g, ""))) fuoriToken.push(`${file}: ${proprieta}: ${valore}`);
        if (!/var\(--durata-/.test(valore)) fuoriToken.push(`${file}: ${proprieta}: ${valore} (senza token)`);
      }
    }
    expect(usate).toBeGreaterThan(20);
    expect(fuoriToken).toEqual([]);
  });

  it("CA-7 con la preferenza attiva tutte le durate valgono zero e una regola globale ferma animazioni e transizioni", () => {
    const ridotto = blocchi(token, "@media (prefers-reduced-motion: reduce)");
    expect(ridotto).toHaveLength(1);
    const blocco = ridotto[0] ?? "";
    const azzerate = dichiarazioni(blocco).filter((d) => d.proprieta.startsWith("--durata-"));
    expect(azzerate.map((d) => d.proprieta).sort()).toEqual(durate.map((d) => d.proprieta).sort());
    for (const { valore } of azzerate) expect(millisecondi(valore)).toBe(0);
    // Vale anche per i contenitori con data-tema, che ridichiarano i token (pagina /stile).
    expect(blocco).toMatch(/:root,\s*\[data-tema\]\s*\{/);
    const globale = dichiarazioni(blocchi(blocco, "*,")[0] ?? "");
    for (const proprieta of ["animation-duration", "transition-duration", "animation-iteration-count", "scroll-behavior"]) {
      expect(globale.find((d) => d.proprieta === proprieta)?.valore).toMatch(/!important$/);
    }
    expect(globale.find((d) => d.proprieta === "animation-duration")?.valore).toBe("0ms !important");
    expect(globale.find((d) => d.proprieta === "transition-duration")?.valore).toBe("0ms !important");
  });

  it("CA-7 i keyframe definiti sono usati solo con le durate dei token", () => {
    const css = senzaCommentiCss(leggiApp("src/ui/ui.css"));
    const definiti = [...css.matchAll(/@keyframes ([\w-]+)/g)].map((t) => t[1]);
    expect(definiti.length).toBeGreaterThan(3);
    const tutti = fileApp(/\.css$/).map((f) => f.testo).join("\n");
    for (const nome of definiti) expect(tutti).toMatch(new RegExp(`animation(-name)?:[^;]*\\b${nome}\\b`));
  });

  it("CA-7 la mappa non anima zoom e dissolvenze se il sistema chiede meno movimento", () => {
    const mappa = leggiApp("src/componenti/MappaGiorno.tsx");
    expect(mappa).toContain('matchMedia?.("(prefers-reduced-motion: reduce)")');
    for (const opzione of ["zoomAnimation: !movimentoRidotto", "fadeAnimation: !movimentoRidotto", "markerZoomAnimation: !movimentoRidotto"]) {
      expect(mappa).toContain(opzione);
    }
  });
});
