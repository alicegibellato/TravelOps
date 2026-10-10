/**
 * ST-UX-003A (REQ-UX-003 CA-7): flussi collegati (solo web app su computer; il mobile e' escluso).
 * CA-1 «Apri la bozza» da /pianifica; CA-4 il passo delle preferenze sopravvive al ricaricamento;
 * CA-2 la bozza creata compare in «I miei viaggi»; CA-6 «Ripristina i viaggi demo» azzera lo scenario.
 */
import { expect } from "vitest";
import { flusso } from "./flussi";
import { creaBozzaDalPercorso, testo } from "./supporto";
import { idBozza } from "./ux003b-supporto";

/** Evidenza visiva su computer: `test-results/e2e/screenshots/ST-UX-003A/<nome>.png` (solo a 1280 px). */
async function scatto(pagina: import("playwright").Page, nome: string): Promise<void> {
  if ((pagina.viewportSize()?.width ?? 0) < 1280) return;
  await pagina.screenshot({ path: `test-results/e2e/screenshots/ST-UX-003A/${nome}.png` });
}

flusso("ST-UX-003A CA-1: da /pianifica si apre la bozza", async (f) => {
  const { pagina } = f;
  await creaBozzaDalPercorso(f);
  const viaggio = idBozza(pagina.url());

  await f.passo("In /pianifica con la bozza c'è l'azione evidente «Apri la bozza»", async () => {
    await pagina.goto(`${f.url}/pianifica?viaggio=${encodeURIComponent(viaggio)}`);
    await pagina.locator('[data-azione="apri-bozza"]').waitFor();
    expect(await pagina.locator('[data-azione="apri-bozza"]').innerText()).toBe("Apri la bozza");
    await scatto(pagina, "ca1-pianifica-apri-bozza");
  });

  await f.passo("«Apri la bozza» porta alla pagina della bozza, dove si conferma", async () => {
    await pagina.locator('[data-azione="apri-bozza"]').click();
    await pagina.waitForURL(new RegExp(`/bozza/${encodeURIComponent(viaggio)}$`));
    await pagina.getByRole("button", { name: "Conferma l'itinerario" }).waitFor();
  });
});

flusso("ST-UX-003A CA-4: il passo delle preferenze sopravvive al ricaricamento", async (f) => {
  const { pagina } = f;

  await f.passo("Arrivo al passo 2 del percorso guidato", async () => {
    await pagina.goto(`${f.url}/preferenze`);
    await pagina.getByText("Passo 1 di 5").waitFor();
    await pagina.getByRole("button", { name: "Lago di Garda (Riva del Garda e dintorni)" }).click();
    await pagina.getByRole("button", { name: "Avanti" }).click();
    await pagina.getByText("Passo 2 di 5").waitFor();
  });

  await f.passo("Ricarico la pagina: resto al passo 2", async () => {
    await pagina.reload();
    await pagina.getByText("Passo 2 di 5").waitFor();
    expect(await testo(pagina)).not.toContain("Passo 1 di 5");
  });
});

flusso("ST-UX-003A CA-6: «Ripristina i viaggi demo» azzera lo scenario", async (f) => {
  const { pagina } = f;
  const scenarioInCorso = () => pagina.locator("dt", { hasText: "Scenario in corso" }).locator("xpath=following-sibling::dd[1]").innerText();

  await f.passo("Avvio uno scenario dalla Demo", async () => {
    await pagina.goto(`${f.url}/demo`);
    await pagina.locator("[data-scenario]").first().getByRole("button", { name: /^Avvia lo scenario/ }).click();
    await pagina.waitForURL(/\/demo/);
    await pagina.goto(`${f.url}/demo`);
    expect(await scenarioInCorso()).not.toBe("Nessuno");
  });

  await f.passo("Ripristino i viaggi demo: lo scenario torna «Nessuno»", async () => {
    await pagina.getByRole("button", { name: "Ripristina i viaggi demo" }).click();
    await pagina.waitForURL(/\/demo/);
    await pagina.goto(`${f.url}/demo`);
    expect(await scenarioInCorso()).toBe("Nessuno");
  });
});

flusso("ST-UX-003A CA-2: la bozza creata compare in «I miei viaggi»", async (f) => {
  const { pagina } = f;
  await creaBozzaDalPercorso(f);
  const viaggio = idBozza(pagina.url());

  await f.passo("Nella home c'è la scheda della bozza, che riapre la bozza", async () => {
    await pagina.goto(`${f.url}/`);
    const scheda = pagina.locator(`[data-viaggio="${viaggio}"]`);
    await scheda.waitFor();
    await scatto(pagina, "ca2-home-i-miei-viaggi");
    await scheda.getByRole("link").first().click();
    await pagina.waitForURL(new RegExp(`/bozza/${encodeURIComponent(viaggio)}$`));
  });
});
