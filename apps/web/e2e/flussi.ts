/**
 * Registra un flusso end-to-end su entrambe le larghezze (375 e 1280 px): ogni esecuzione ha la sua web app con dati
 * nuovi. Senza browser di sistema il flusso è saltato (la preparazione ha già avvisato).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { IN_CI, trovaBrowser } from "../test/supporto-ux";
import type { Browser } from "playwright-core";
import { apriBrowser, eseguiFlusso, VISTE, type Flusso } from "./supporto";

export function flusso(nome: string, corpo: (f: Flusso) => Promise<void>, ambiente: Readonly<Record<string, string>> = {}): void {
  const percorso = trovaBrowser();
  if (percorso === null && !IN_CI) {
    console.warn(`\n[e2e] Nessun browser di sistema (Chrome, Edge, Chromium): «${nome}» è saltato. Indica TRAVELOPS_BROWSER.\n`);
  }
  describe.skipIf(percorso === null && !IN_CI)(nome, () => {
    // Nella CI il browser deve esserci: le prove non si saltano mai in silenzio.
    it("il browser di sistema c'è", () => {
      expect(percorso).not.toBeNull();
    });
    let browser: Browser;
    beforeAll(async () => {
      browser = await apriBrowser(percorso as string);
    });
    afterAll(async () => {
      await browser?.close();
    });
    for (const vista of VISTE) {
      it(`a ${vista.nome}`, () => eseguiFlusso(browser, nome, vista, corpo, ambiente));
    }
  });
}
