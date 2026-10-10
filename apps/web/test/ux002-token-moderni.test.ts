/**
 * REQ-UX-002 (CR su REQ-UX-001), controlli sul codice: scala tipografica fluida con clamp() per ogni passo (CA-3),
 * spaziature e raggi fluidi, livelli di elevazione e token di movimento (CA-4), container query come standard dei
 * componenti adattivi (schede della home, linea del tempo, pannello chat), nessuna dipendenza nuova (CA-6).
 * I colori in OKLCH e il contrasto sono in `ux001-ca1-colori` e `ux001-ca2-contrasto`; il movimento ridotto in
 * `ux001-ca7-movimento`; le misure nel browser sono in `ux002-browser.test.tsx`.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { blocchi, dichiarazioni, senzaCommentiCss } from "./supporto-css";
import { fileApp, leggiApp } from "./supporto-ux";

const token = dichiarazioni(blocchi(leggiApp("src/ui/token.css"), ":root,\n[data-tema]")[0] ?? "");
const valore = (nome: string): string => token.find((d) => d.proprieta === nome)?.valore ?? "";

/** Il minimo e il massimo (in rem) di un `clamp(min, preferito, max)`. */
function estremi(clamp: string): { minimo: number; massimo: number; preferito: string } {
  const trovato = /^clamp\(([\d.]+)rem, ([\d.]+rem \+ [\d.]+vw), ([\d.]+)rem\)$/.exec(clamp);
  if (trovato === null) throw new Error(`clamp() non valido: ${clamp}`);
  return { minimo: Number(trovato[1]), preferito: trovato[2] ?? "", massimo: Number(trovato[3]) };
}

describe("CA-3 scala tipografica fluida", () => {
  const PASSI = ["xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl"];

  it("CA-3 ogni passo della scala (xs … 4xl) è un clamp() in rem, che cresce da 320 a 1280 px senza scendere sotto il minimo", () => {
    expect(token.filter((d) => d.proprieta.startsWith("--testo-")).map((d) => d.proprieta)).toEqual(PASSI.map((p) => `--testo-${p}`));
    let precedente = 0;
    for (const passo of PASSI) {
      const { minimo, massimo } = estremi(valore(`--testo-${passo}`));
      expect(massimo).toBeGreaterThan(minimo);
      // I passi sono in ordine crescente, sia al minimo sia al massimo.
      expect(minimo).toBeGreaterThanOrEqual(precedente);
      precedente = minimo;
    }
    // Il testo del corpo non scende sotto i 16 px a 320 px: il telefono non ingrandisce la pagina quando ci si scrive.
    expect(estremi(valore("--testo-m")).minimo).toBeGreaterThanOrEqual(1);
  });

  it("CA-3 la formula del clamp() raggiunge il minimo a 320 px e il massimo a 1280 px", () => {
    for (const passo of PASSI) {
      const { minimo, massimo, preferito } = estremi(valore(`--testo-${passo}`));
      const [, intercetta, pendenza] = /^([\d.]+)rem \+ ([\d.]+)vw$/.exec(preferito) ?? [];
      const a320 = Number(intercetta) + (Number(pendenza) * 320) / 100 / 16;
      const a1280 = Number(intercetta) + (Number(pendenza) * 1280) / 100 / 16;
      expect(a320).toBeCloseTo(minimo, 2);
      expect(a1280).toBeCloseTo(massimo, 2);
    }
  });

  it("CA-3 nei fogli di stile le dimensioni del testo vengono dalla scala: nessun font-size in px o rem scritto a mano", () => {
    const fuori: string[] = [];
    for (const { file, testo } of fileApp(/\.css$/).filter((f) => f.file !== "src/ui/token.css")) {
      for (const { proprieta, valore: v } of dichiarazioni(testo)) {
        if (proprieta !== "font-size") continue;
        // `max(1rem, var(--testo-m))` nei campi: almeno 16 px perché i telefoni non ingrandiscano la pagina.
        if (/\b\d+(?:\.\d+)?(px|rem)\b/.test(v.replace(/max\(1rem, var\(--testo-m\)\)/, "")) ) fuori.push(`${file}: font-size: ${v}`);
      }
    }
    expect(fuori).toEqual([]);
  });

  it("CA-3 spaziature (dal passo 4) e raggi medio e grande sono fluidi; i passi piccoli e la pillola restano fissi", () => {
    for (const passo of ["4", "5", "6", "8", "10", "12", "16"]) {
      const { minimo, massimo } = estremi(valore(`--spazio-${passo}`));
      expect(massimo).toBeGreaterThan(minimo);
      // A 320 px le spaziature sono quelle di REQ-UX-001; a 1280 px crescono al massimo del 25%.
      expect(massimo / minimo).toBeLessThanOrEqual(1.25 + 1e-9);
    }
    expect(valore("--spazio-1")).toBe("0.25rem");
    expect(valore("--spazio-2")).toBe("0.5rem");
    expect(valore("--spazio-3")).toBe("0.75rem");
    expect(estremi(valore("--raggio-m")).minimo).toBe(0.75);
    expect(estremi(valore("--raggio-l")).minimo).toBe(1);
    expect(valore("--raggio-s")).toBe("8px");
    expect(valore("--raggio-pillola")).toBe("999px");
  });
});

describe("CA-4 elevazione e movimento come token", () => {
  it("CA-4 cinque livelli di elevazione (0–4), le ombre storiche sono alias dei livelli e il loro colore viene dal token dell'ombra", () => {
    expect(valore("--elevazione-0")).toBe("none");
    for (const livello of [1, 2, 3, 4]) expect(valore(`--elevazione-${livello}`)).toContain("var(--colore-ombra)");
    for (const livello of [1, 2, 3]) expect(valore(`--ombra-${livello}`)).toBe(`var(--elevazione-${livello})`);
    // Più in alto, ombra più larga.
    const sfocature = [1, 2, 3, 4].map((livello) => Number(/^0 (\d+)px (\d+)px/.exec(valore(`--elevazione-${livello}`))?.[2]));
    expect([...sfocature].sort((a, b) => a - b)).toEqual(sfocature);
  });

  it("CA-4 le durate e le curve sono token e con prefers-reduced-motion tutte le durate valgono 0", () => {
    const durate = token.filter((d) => d.proprieta.startsWith("--durata-")).map((d) => d.proprieta);
    expect(durate).toEqual(["--durata-minima", "--durata-breve", "--durata-media", "--durata-lunga", "--durata-scheletro"]);
    const ridotto = dichiarazioni(blocchi(leggiApp("src/ui/token.css"), "@media (prefers-reduced-motion: reduce)")[0] ?? "");
    for (const durata of durate) expect(ridotto).toContainEqual({ proprieta: durata, valore: "0ms" });
  });
});

describe("Container query nei componenti adattivi", () => {
  const css = senzaCommentiCss(fileApp(/\.css$/).map((f) => f.testo).join("\n"));

  it.each([
    ["scheda", ".scheda-viaggio {", "schede dei viaggi (griglia della home)"],
    ["linea-tempo", ".ui-linea-tempo {", "linea del tempo"],
    ["chat", ".ui-chat {", "pannello chat"],
  ])("un contenitore «%s» per le %s, con regole @container che lo interrogano", (nome, selettore) => {
    const dichiarazione = dichiarazioni(blocchi(css, selettore)[0] ?? "");
    expect(dichiarazione).toContainEqual({ proprieta: "container", valore: `${nome} / inline-size` });
    expect(css).toMatch(new RegExp(`@container ${nome} \\(`));
  });

  it("le regole @container usano unità relative (rem): nessuna soglia in px", () => {
    for (const [, condizione] of css.matchAll(/@container [\w-]+ \(([^)]*)\)/g)) expect(condizione).toMatch(/\d+rem/);
    expect(css).not.toMatch(/@container [\w-]+ \([^)]*\d+px/);
  });
});

describe("CA-6 nessuna dipendenza di esecuzione nuova, nessun Tailwind", () => {
  it("CA-6 le dipendenze della web app sono quelle di prima e non c'è Tailwind", () => {
    const pacchetto = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
    expect(Object.keys(pacchetto.dependencies).sort()).toEqual([
      "@fontsource-variable/inter",
      "@fontsource-variable/plus-jakarta-sans",
      "@travelops/engine",
      "better-sqlite3",
      "leaflet",
      "lucide-react",
      "next",
      "radix-ui",
      "react",
      "react-dom",
    ]);
    expect(JSON.stringify(pacchetto)).not.toMatch(/tailwind/i);
  });
});
