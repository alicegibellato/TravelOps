/** ST-UX-003B, CB-1 e CB-2: /pianifica con riepilogo a chip, bozza affiancata e «Destinazioni pronte» a 1280 px. */
import { expect } from "vitest";
import { flusso } from "./flussi";
import { creaBozzaDalPercorso } from "./supporto";
import { idBozza, scatta, scorrimentoOrizzontale, testoBasePx, violazioniAxe } from "./ux003b-supporto";

flusso("ST-UX-003B CB-1/CB-2: Pianifica (chip, bozza affiancata, destinazioni pronte)", async (f) => {
  const { pagina } = f;
  const largo = f.vista.larghezza >= 1100;

  await f.passo("Destinazioni pronte: immagini in proporzione e testo almeno base", async () => {
    await pagina.goto(`${f.url}/pianifica`);
    if (!largo) await pagina.getByRole("heading", { name: "Destinazioni pronte" }).waitFor();
    await pagina.getByRole("heading", { name: "Destinazioni pronte" }).waitFor();
    const base = await testoBasePx(pagina);
    const schede = await pagina.locator(".percorso__scheda").evaluateAll((els) =>
      els.map((el) => {
        const immagine = el.querySelector(".ui-luogo")!.getBoundingClientRect();
        const nome = el.querySelector<HTMLElement>(".percorso__scheda-nome")!;
        return {
          proporzione: immagine.width / immagine.height,
          larghezza: immagine.width,
          testo: parseFloat(getComputedStyle(nome).fontSize),
          tagliato: nome.scrollWidth > nome.clientWidth + 1,
          tracciati: el.querySelectorAll(".ui-luogo svg path").length,
        };
      }),
    );
    expect(schede.length).toBeGreaterThanOrEqual(3);
    for (const s of schede) {
      expect(s.proporzione).toBeCloseTo(16 / 9, 1);
      expect(s.larghezza).toBeGreaterThan(100);
      expect(s.testo).toBeGreaterThanOrEqual(base);
      expect(s.tagliato).toBe(false);
      expect(s.tracciati).toBeGreaterThan(3);
    }
    expect(await scorrimentoOrizzontale(pagina)).toBeLessThanOrEqual(0);
    await scatta(f, "cb2-destinazioni-pronte-test");
  });

  await f.passo("Il riepilogo è fatto di chip modificabili, non di righe", async () => {
    const chip = pagina.locator(".riepilogo__voci:not([hidden]) .riepilogo__voce");
    expect(await chip.count()).toBeLessThanOrEqual(5);
    const altezze = await chip.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
    for (const h of altezze) expect(h).toBeLessThan(100);
    await pagina.getByRole("button", { name: /^Altre \d+ preferenze/ }).click();
    expect(await pagina.locator(".riepilogo__voci:not([hidden]) .riepilogo__voce").count()).toBeGreaterThan(10);
    await pagina.getByRole("button", { name: "Nascondi le altre" }).click();
    // Un chip porta al passo in cui si modifica.
    await pagina.getByRole("button", { name: /^Date: .*modifica$/ }).or(pagina.getByRole("button", { name: /^Destinazione: .*modifica$/ })).first().click();
  });

  await f.passo("Bozza visibile senza scorrere a 1280×800, affiancata ai filtri; sul telefono sotto i filtri", async () => {
    await creaBozzaDalPercorso(f);
    await pagina.goto(`${f.url}/pianifica?viaggio=${encodeURIComponent(idBozza(pagina.url()))}`);
    await pagina.locator(".pianifica-bozza__giorno").first().waitFor();
    if (largo) await pagina.setViewportSize({ width: 1280, height: 800 });
    const riquadri = await pagina.evaluate(() => {
      const r = (s: string) => document.querySelector(s)!.getBoundingClientRect();
      const percorso = r(".pianifica-percorso");
      const bozza = r(".pianifica-bozza");
      const giorno = r(".pianifica-bozza__giorno");
      return { percorso: { x: percorso.left, y: percorso.top, giu: percorso.bottom }, bozza: { x: bozza.left, y: bozza.top }, giornoSotto: giorno.top + Math.min(giorno.height, 120), finestra: window.innerHeight, scroll: window.scrollY };
    });
    expect(riquadri.scroll).toBe(0);
    if (largo) {
      expect(riquadri.bozza.x).toBeGreaterThan(riquadri.percorso.x + 200);
      expect(Math.abs(riquadri.bozza.y - riquadri.percorso.y)).toBeLessThan(80);
      // Il titolo della bozza e l'inizio del primo giorno stanno nella finestra, senza scorrere.
      expect(riquadri.giornoSotto).toBeLessThanOrEqual(riquadri.finestra);
    } else {
      expect(riquadri.bozza.y).toBeGreaterThanOrEqual(riquadri.percorso.giu - 1);
    }
    expect(await scorrimentoOrizzontale(pagina)).toBeLessThanOrEqual(0);
    await scatta(f, "cb1-pianifica-bozza-test", false);
  });

  await f.passo("axe: nessuna violazione, contrasto compreso", async () => {
    { const v = JSON.stringify(await violazioniAxe(pagina)); expect(v, v).toBe("[]"); }
  });
});
