/** ST-UX-003B, CB-4 e CB-6: home e card dei viaggi, Demo e Oggi a 1280 px. */
import { expect } from "vitest";
import { flusso } from "./flussi";
import { scatta, scorrimentoOrizzontale, violazioniAxe } from "./ux003b-supporto";

flusso("ST-UX-003B CB-4/CB-6: Home, Demo e Oggi (immagini dei luoghi, gerarchia)", async (f) => {
  const { pagina } = f;

  await f.passo("Home: titoli senza punteggiatura orfana e un'immagine per ogni viaggio", async () => {
    await pagina.goto(f.url);
    await pagina.getByRole("heading", { name: "I miei viaggi" }).waitFor();
    const schede = await pagina.locator(".scheda-viaggio").evaluateAll((els) =>
      els.map((el) => {
        const immagine = el.querySelector(".ui-luogo")?.getBoundingClientRect();
        return {
          titolo: (el.querySelector("h3") as HTMLElement).innerText,
          immagine: immagine === undefined ? null : { w: immagine.width, h: immagine.height },
          tracciati: el.querySelectorAll(".ui-luogo svg path").length,
          esterne: [...el.querySelectorAll("img, image, use")].length,
        };
      }),
    );
    // I 4 viaggi di riferimento e i 3 viaggi demo della base dati (REQ-UX-003 CA-2, ST-UX-003A).
    expect(schede.length).toBe(7);
    for (const s of schede) {
      expect(s.titolo).not.toMatch(/(^|\s)[:;,.]|[:;,]\s*$|[:;,]\s/);
      expect(s.immagine).not.toBeNull();
      expect(s.immagine!.w / s.immagine!.h).toBeCloseTo(16 / 7, 1);
      expect(s.tracciati).toBeGreaterThan(3);
      expect(s.esterne).toBe(0);
    }
    // Le quattro illustrazioni non sono identiche: il seme le distingue.
    const disegni = await pagina.locator(".scheda-viaggio .ui-luogo svg").evaluateAll((els) => els.map((e) => e.innerHTML));
    expect(new Set(disegni).size).toBe(disegni.length);
    expect(await scorrimentoOrizzontale(pagina)).toBeLessThanOrEqual(0);
    await scatta(f, "cb4-home-test", false);
    { const v = JSON.stringify(await violazioniAxe(pagina)); expect(v, v).toBe("[]"); }
  });

  await f.passo("Oggi: «Adesso» in evidenza, prossimi momenti in timeline, immagini dei luoghi", async () => {
    await pagina.goto(`${f.url}/oggi`);
    await pagina.getByRole("heading", { name: "Adesso" }).waitFor();
    const m = await pagina.evaluate(() => {
      const r = (s: string) => document.querySelector(s)!.getBoundingClientRect();
      const px = (s: string) => parseFloat(getComputedStyle(document.querySelector(s)!).fontSize);
      return {
        eroe: { alto: r(".oggi__hero").top, largo: r(".oggi__hero").width, immagine: r(".oggi__hero .ui-luogo").height },
        dopo: { alto: r(".oggi__prossimi").top },
        titoloEroe: px(".oggi__hero-nome"),
        titoloDopo: px(".oggi__prossimi > :is(h2, h3)"),
        finestra: window.innerHeight,
        immagini: document.querySelectorAll(".oggi .ui-luogo svg").length,
        timeline: document.querySelectorAll(".oggi__timeline-voce").length,
        titolo: document.querySelector("h1")?.textContent,
      };
    });
    expect(m.titolo).toBe("Oggi");
    expect(m.eroe.alto).toBeLessThan(m.finestra);
    expect(m.eroe.immagine).toBeGreaterThan(80);
    expect(m.dopo.alto).toBeGreaterThan(m.eroe.alto);
    expect(m.titoloEroe).toBeGreaterThan(m.titoloDopo * 1.5);
    expect(m.immagini).toBeGreaterThanOrEqual(2);
    expect(await scorrimentoOrizzontale(pagina)).toBeLessThanOrEqual(0);
    await scatta(f, "cb6-oggi-test", false);
    { const v = JSON.stringify(await violazioniAxe(pagina)); expect(v, v).toBe("[]"); }
  });

  await f.passo("Demo: momento attuale in evidenza e un'immagine per ogni scenario", async () => {
    await pagina.goto(`${f.url}/demo`);
    await pagina.getByRole("heading", { name: "Modalità presentazione" }).waitFor();
    const m = await pagina.evaluate(() => ({
      orologio: document.querySelector(".demo-eroe [data-orologio]")?.textContent,
      dimensione: parseFloat(getComputedStyle(document.querySelector(".demo-eroe [data-orologio]")!).fontSize),
      base: parseFloat(getComputedStyle(document.body).fontSize),
      scenari: document.querySelectorAll(".scenario").length,
      conImmagine: document.querySelectorAll(".scenario > .ui-luogo svg").length,
    }));
    expect(m.orologio).toContain("12 giugno 2026");
    expect(m.dimensione).toBeGreaterThan(m.base * 1.5);
    expect(m.scenari).toBeGreaterThanOrEqual(8);
    expect(m.conImmagine).toBe(m.scenari);
    expect(await scorrimentoOrizzontale(pagina)).toBeLessThanOrEqual(0);
    await scatta(f, "cb6-demo-test", false);
    { const v = JSON.stringify(await violazioniAxe(pagina)); expect(v, v).toBe("[]"); }
  });
});
