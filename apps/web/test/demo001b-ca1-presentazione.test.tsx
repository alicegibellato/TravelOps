/**
 * REQ-DEMO-001 CA-1 (ST-DEMO-001B): la modalità presentazione elenca i prompt del copione con «Copia» accanto, dalla
 * stessa fonte (`src/demo/copione.json`) che eseguono i test; `docs/demo/copione-demo.md` è generato da quella fonte.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { describe, expect, it, vi } from "vitest";
import { ContenutoDemo } from "../src/componenti/ContenutiStato";
import { COPIONE_DEMO, copioneInMarkdown, vociCopione } from "../src/demo/copione";
import { leggiStato } from "../src/stato/archivio";
import { AZIONI_DEMO, nuovaCartella } from "./supporto-stato";
import { paginaCompleta } from "./supporto-ux";

vi.mock("next/navigation", () => ({ usePathname: () => "/demo", redirect: vi.fn() }));

const pagina = (): Document => new JSDOM(paginaCompleta(<ContenutoDemo esito={leggiStato(nuovaCartella())} azioni={AZIONI_DEMO} />)).window.document;

describe("CA-1 il copione nella modalità presentazione", () => {
  it("ogni voce del copione compare, e ogni prompt ha «Copia» (le azioni dell'Atto 4 no)", () => {
    const d = pagina();
    const voci = vociCopione();
    expect(voci.length).toBe(COPIONE_DEMO.atti.reduce((n, a) => n + a.voci.length, 0));
    for (const voce of voci) {
      const riga = d.querySelector(`[data-prompt="${voce.id}"]`);
      expect(riga?.querySelector("[data-testo-prompt]")?.textContent, voce.id).toBe(voce.testo);
      expect(riga?.querySelector(`button[data-copia="${voce.id}"]`) !== null, voce.id).toBe(voce.tipo === "prompt");
    }
    expect(d.querySelectorAll("button[data-copia]")).toHaveLength(voci.filter((v) => v.tipo === "prompt").length);
    expect(d.querySelectorAll("[data-atto]")).toHaveLength(4);
  });

  it("docs/demo/copione-demo.md è quello generato dalla fonte (npm run copione -w @travelops/web)", () => {
    const file = fileURLToPath(new URL("../../../docs/demo/copione-demo.md", import.meta.url));
    expect(readFileSync(file, "utf8")).toBe(copioneInMarkdown());
  });

  it("il copione ha i 19 prompt e le 2 azioni della CR-001 §10", () => {
    expect(vociCopione().map((v) => v.id)).toEqual(["1", "2", "3", "3b", "4", "4b", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21"]);
  });
});
