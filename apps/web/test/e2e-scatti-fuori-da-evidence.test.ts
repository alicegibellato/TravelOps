/**
 * ST-E2E-001-FIX1: le prove end-to-end non scrivono mai in `evidence/` (si sporcherebbero le evidenze di story chiuse):
 * gli screenshot vanno in `test-results/e2e` (ignorata da git); una copia in evidence è solo il comando esplicito.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const APP = fileURLToPath(new URL("..", import.meta.url));
const CARTELLA_E2E = join(APP, "e2e");

/** Il codice senza i commenti (di riga e di blocco), perché la documentazione può nominare `evidence/`. */
function senzaCommenti(sorgente: string): string {
  return sorgente.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("le prove end-to-end non scrivono in evidence/", () => {
  const file = readdirSync(CARTELLA_E2E).filter((nome) => nome.endsWith(".ts"));

  it("ci sono file di prova da controllare", () => {
    expect(file.length).toBeGreaterThan(5);
  });

  it.each(file)("%s non nomina la cartella evidence nel codice", (nome) => {
    const codice = senzaCommenti(readFileSync(join(CARTELLA_E2E, nome), "utf8"));
    expect(codice).not.toMatch(/["'`]evidence["'`]|\/evidence\//);
  });

  it("la cartella degli screenshot è quella ignorata da git", () => {
    const ignorati = readFileSync(join(APP, ".gitignore"), "utf8");
    expect(ignorati).toMatch(/^test-results\/$/m);
    expect(readFileSync(join(CARTELLA_E2E, "supporto.ts"), "utf8")).toContain('join(CARTELLA_ERRORI, "screenshots")');
  });
});
