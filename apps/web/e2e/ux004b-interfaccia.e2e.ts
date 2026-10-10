/**
 * ST-UX-004B, CB-1..CB-7: meteo per giorno in bozza e in Oggi, intestazione in una riga con menu compatto, card dei
 * viaggi, Sorprendimi che si riassume, copione e etichette della Demo, un solo pannello azione in bozza. A 1280 px,
 * con axe sulle pagine toccate e gli screenshot in `test-results/e2e/screenshots/ST-UX-004B/`.
 */
import { expect } from "vitest";
import { flusso } from "./flussi";
import { creaBozzaDalPercorso } from "./supporto";
import { scorrimentoOrizzontale, violazioniAxe } from "./ux003b-supporto";
import { scatta } from "./ux004b-supporto";

const senzaViolazioni = async (f: Parameters<Parameters<typeof flusso>[1]>[0]): Promise<void> => {
  const v = JSON.stringify(await violazioniAxe(f.pagina));
  expect(v, v).toBe("[]");
};

flusso("ST-UX-004B CB-2/CB-3/CB-4/CB-5/CB-1: header, home, Sorprendimi, Demo e Oggi", async (f) => {
  const { pagina } = f;
  const telefono = f.vista.larghezza < 768;

  await f.passo("Home: l'intestazione sta in una riga e le card dicono luogo e date", async () => {
    await pagina.goto(f.url);
    await pagina.getByRole("heading", { name: "I miei viaggi" }).waitFor();
    const m = await pagina.evaluate(() => {
      const riga = document.querySelector(".ui-intestazione__riga")!.getBoundingClientRect();
      const visibile = (s: string) => {
        const e = document.querySelector(s);
        return e !== null && getComputedStyle(e).display !== "none" && e.getBoundingClientRect().width > 0;
      };
      const figli = [...document.querySelectorAll(".ui-intestazione__riga > *, .ui-intestazione__pannello > *")]
        .filter((e) => getComputedStyle(e).display !== "none" && e.getBoundingClientRect().width > 0)
        .map((e) => e.getBoundingClientRect());
      return {
        altezza: riga.height,
        stessaRiga: figli.every((r) => r.top >= riga.top - 1 && r.bottom <= riga.bottom + 1),
        pulsante: visibile(".ui-intestazione__menu-pulsante"),
        navigazione: visibile(".ui-navigazione"),
        tema: visibile(".ui-selettore-tema"),
        titoli: [...document.querySelectorAll(".scheda-viaggio h3")].map((h) => (h as HTMLElement).innerText),
        stagioni: [...document.querySelectorAll(".scheda-viaggio .ui-luogo")].map((e) => `${e.getAttribute("data-luogo")}/${e.getAttribute("data-stagione")}`),
      };
    });
    expect(m.altezza).toBeLessThan(80);
    expect(m.stessaRiga).toBe(true);
    expect(m.pulsante).toBe(telefono);
    expect(m.navigazione).toBe(!telefono);
    expect(m.tema).toBe(!telefono);
    expect(m.titoli.length).toBe(4);
    for (const t of m.titoli) expect(t).toMatch(/^Weekend sul Garda · 12–14 giugno 2026\s/);
    for (const s of m.stagioni) expect(s).toBe("lago/estate");
    expect(await scorrimentoOrizzontale(pagina)).toBeLessThanOrEqual(0);
    await scatta(f, "cb2-cb3-home", false);
    await senzaViolazioni(f);
  });

  if (telefono) {
    await f.passo("Telefono: il menu si apre da tastiera, contiene il selettore del tema, Esc chiude", async () => {
      const pulsante = pagina.getByRole("button", { name: "Menu" });
      await pulsante.focus();
      await pagina.keyboard.press("Enter");
      expect(await pulsante.getAttribute("aria-expanded")).toBe("true");
      await pagina.getByRole("radio", { name: "Scuro" }).waitFor();
      await pagina.getByRole("link", { name: "Oggi" }).waitFor();
      const riga = await pagina.evaluate(() => document.querySelector(".ui-intestazione__riga")!.getBoundingClientRect().height);
      expect(riga).toBeLessThan(80);
      await scatta(f, "cb2-menu-aperto", false);
      await senzaViolazioni(f);
      await pagina.keyboard.press("Escape");
      expect(await pulsante.getAttribute("aria-expanded")).toBe("false");
      expect(await pulsante.evaluate((e) => e === document.activeElement)).toBe(true);
      expect(await pagina.getByRole("radio", { name: "Scuro" }).isVisible()).toBe(false);
    });
    await f.passo("Telefono: dal menu si cambia il tema e si naviga", async () => {
      await pagina.getByRole("button", { name: "Menu" }).click();
      await pagina.getByRole("radio", { name: "Scuro" }).check();
      expect(await pagina.evaluate(() => document.documentElement.getAttribute("data-tema"))).toBe("scuro");
      await pagina.getByRole("link", { name: "Destinazione" }).click();
      await pagina.waitForURL(/\/destinazione/);
      expect(await pagina.getByRole("radio", { name: "Scuro" }).isVisible()).toBe(false);
      await pagina.evaluate(() => document.documentElement.removeAttribute("data-tema"));
    });
  } else {
    await f.passo("Schermo grande: tutte le voci nella riga, nessun a capo", async () => {
      const m = await pagina.evaluate(() => {
        const riga = document.querySelector(".ui-intestazione__riga")!;
        return {
          alte: [...document.querySelectorAll(".ui-navigazione__voce")].map((e) => Math.round(e.getBoundingClientRect().height)),
          cime: [...document.querySelectorAll(".ui-navigazione__voce")].map((e) => Math.round(e.getBoundingClientRect().top)),
          straborda: riga.scrollWidth - riga.clientWidth,
        };
      });
      expect(new Set(m.cime).size).toBe(1);
      // Nessuna voce va a capo dentro se stessa: tutte alte quanto l'area di tocco.
      expect(Math.max(...m.alte)).toBeLessThanOrEqual(48);
      expect(m.straborda).toBeLessThanOrEqual(0);
    });
  }

  await f.passo("Sorprendimi: dopo la scelta si riassume", async () => {
    await pagina.goto(`${f.url}/destinazione`);
    await pagina.getByRole("heading", { name: /Sorprendimi/ }).waitFor();
    await pagina.getByRole("button", { name: "Sorprendimi", exact: true }).click();
    await pagina.locator(".sorprendimi__proposta").first().waitFor();
    expect(await pagina.locator(".sorprendimi__proposta").count()).toBe(3);
    const scelta = pagina.locator(".sorprendimi__proposta").first();
    const nome = (await scelta.locator("h3").innerText()).trim();
    await scelta.getByRole("button", { name: `Scegli ${nome}` }).click();
    await pagina.locator(".sorprendimi--scelta").waitFor();
    expect(await pagina.locator(".sorprendimi__proposta").count()).toBe(0);
    expect(await pagina.locator(".sorprendimi--scelta").innerText()).toContain(`Hai scelto ${nome}`);
    await scatta(f, "cb4-sorprendimi-riassunto", false);
    await senzaViolazioni(f);
    await pagina.getByRole("button", { name: "Scegli un'altra idea" }).click();
    expect(await pagina.locator(".sorprendimi__proposta").count()).toBe(3);
  });

  await f.passo("Demo: il copione si raggiunge dal link e le etichette non hanno punteggiatura ridondante", async () => {
    await pagina.goto(`${f.url}/demo`);
    await pagina.getByRole("heading", { name: "Modalità presentazione" }).waitFor();
    await pagina.getByRole("link", { name: "Vai al copione della demo" }).click();
    await pagina.getByRole("heading", { name: "Copione della demo" }).waitFor();
    const m = await pagina.evaluate(() => {
      const titolo = document.querySelector("#copione-titolo")!.getBoundingClientRect();
      return { vicinoAllaCima: titolo.top < window.innerHeight, prompt: document.querySelectorAll("[data-copione] [data-prompt]").length };
    });
    expect(m.vicinoAllaCima).toBe(true);
    expect(m.prompt).toBeGreaterThanOrEqual(20);
    const nomi = await pagina.locator("[data-scenario] form button").evaluateAll((els) => els.map((e) => (e as HTMLElement).textContent ?? ""));
    expect(nomi.length).toBeGreaterThanOrEqual(8);
    for (const n of nomi) expect(n).toMatch(/^Avvia lo scenario [^:]+$/);
    await scatta(f, "cb5-demo-copione", false);
    await senzaViolazioni(f);
  });

  await f.passo("Oggi: la previsione del giorno è sopra le schede", async () => {
    await pagina.goto(`${f.url}/oggi`);
    await pagina.getByRole("heading", { name: "Adesso" }).waitFor();
    const meteo = pagina.locator("[data-meteo-oggi] .previsione-giorno");
    await meteo.waitFor();
    expect(await meteo.getAttribute("data-origine")).toBe("finto");
    expect(await meteo.innerText()).toContain("(esempio)");
    const m = await pagina.evaluate(() => ({
      meteo: document.querySelector("[data-meteo-oggi]")!.getBoundingClientRect().bottom,
      schede: document.querySelector(".oggi__schede")!.getBoundingClientRect().top,
    }));
    expect(m.meteo).toBeLessThanOrEqual(m.schede + 1);
    expect(await scorrimentoOrizzontale(pagina)).toBeLessThanOrEqual(0);
    await scatta(f, "cb1-oggi-meteo", false);
    await senzaViolazioni(f);
  });
});

flusso("ST-UX-004B CB-1/CB-6: bozza con meteo per giorno e un solo pannello azione", async (f) => {
  const { pagina } = f;
  await creaBozzaDalPercorso(f);

  await f.passo("Ogni giorno della bozza ha la sua previsione", async () => {
    const giorni = await pagina.locator(".bozza__giorno").count();
    expect(giorni).toBe(4);
    expect(await pagina.locator(".bozza__giorno > .previsione-giorno").count()).toBe(giorni);
    expect(await pagina.locator(".bozza__giorno > .previsione-giorno").first().innerText()).toContain("(esempio)");
    expect(await scorrimentoOrizzontale(pagina)).toBeLessThanOrEqual(0);
    await scatta(f, "cb1-bozza-meteo");
    await senzaViolazioni(f);
  });

  await f.passo("Aprire «Sposta» su un'altra attività chiude il pannello precedente", async () => {
    const attivatori = pagina.locator('li[data-tipo="attivita"]:not([data-pasto])').getByRole("button", { name: /^Azioni per «/ });
    await attivatori.nth(0).click();
    await pagina.getByRole("menuitem", { name: "Sposta", exact: true }).click();
    await pagina.locator(".bozza__pannello").first().waitFor();
    expect(await pagina.locator(".bozza__pannello").count()).toBe(1);
    await attivatori.nth(1).click();
    await pagina.getByRole("menuitem", { name: "Sposta", exact: true }).click();
    await pagina.waitForTimeout(250);
    expect(await pagina.locator(".bozza__pannello").count()).toBe(1);
    await attivatori.nth(2).click();
    await pagina.getByRole("menuitem", { name: "Sostituisci", exact: true }).click();
    await pagina.locator(".bozza__alternative").waitFor();
    expect(await pagina.locator(".bozza__pannello").count()).toBe(1);
    expect(await pagina.locator(".bozza__modulo.bozza__pannello").count()).toBe(0);
    await scatta(f, "cb6-un-solo-pannello", false);
    await senzaViolazioni(f);
    await pagina.getByRole("button", { name: "Non sostituire" }).click();
    expect(await pagina.locator(".bozza__pannello").count()).toBe(0);
  });

  await f.passo("Dopo la conferma il menu del giorno è «Proponi una modifica»", async () => {
    await pagina.getByRole("button", { name: "Conferma l'itinerario" }).click();
    await pagina.getByRole("button", { name: /^Proponi una modifica/ }).first().waitFor();
    expect(await pagina.getByRole("button", { name: /^Modifica giorno/ }).count()).toBe(0);
    await pagina.getByRole("button", { name: "Chiudi" }).click().catch(() => undefined);
    await scatta(f, "cb6-bozza-confermata", false);
    await senzaViolazioni(f);
  });
});
