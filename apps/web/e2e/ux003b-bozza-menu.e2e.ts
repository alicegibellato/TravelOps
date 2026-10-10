/** ST-UX-003B, CB-3: la bozza con un menu «…» per attività e un menu per giorno, da tastiera, con i connettori. */
import { join } from "node:path";
import { expect } from "vitest";
import { flusso } from "./flussi";
import { cartellaScatti, creaBozzaDalPercorso, testo } from "./supporto";

const SCREENSHOT = cartellaScatti("ST-UX-003B");

flusso("ST-UX-003B CB-3: bozza con menu per attività e per giorno", async (f) => {
  const { pagina } = f;
  const larghezza = f.vista.larghezza;
  await creaBozzaDalPercorso(f);
  const scheda = () => pagina.locator('li[data-tipo="attivita"]:not([data-pasto])').first();
  const attivatore = () => scheda().getByRole("button", { name: /^Azioni per «/ });
  const voce = (nome: string) => pagina.getByRole("menuitem", { name: nome, exact: true });

  await f.passo("A menu chiusi non ci sono pannelli tecnici: niente selezioni né pulsanti per attività", async () => {
    await pagina.screenshot({ path: join(SCREENSHOT, `bozza-dopo-${larghezza}.png`), fullPage: true });
    expect(await pagina.locator("select[id$='-scambia'], select[id$='-aggiungi']").count()).toBe(0);
    for (const nome of ["Rimuovi", "Sposta", "Blocca", "Sostituisci"]) {
      expect(await pagina.getByRole("button", { name: nome, exact: true }).count()).toBe(0);
    }
    expect(await pagina.getByRole("button", { name: /^Modifica giorno/ }).count()).toBeGreaterThan(1);
  });

  await f.passo("Gli spostamenti non sono righe numerate e quelli brevi sono connettori compatti", async () => {
    const stile = await pagina.locator("ol.bozza__voci").first().evaluate((e) => getComputedStyle(e).listStyleType);
    expect(stile).toBe("none");
    const brevi = pagina.locator('li[data-tipo="spostamento"][data-breve="si"]');
    expect(await brevi.count()).toBeGreaterThan(0);
    expect(await brevi.first().locator(".bozza__connettore-pillola > span[aria-hidden]").innerText()).toMatch(/^\d+ min$/);
  });

  await f.passo("Nessun scorrimento orizzontale", async () => {
    const larga = await pagina.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(larga).toBe(false);
  });

  await f.passo("Menu dell'attività da tastiera: Invio apre, frecce scorrono, Esc chiude e il focus torna", async () => {
    await attivatore().focus();
    await pagina.keyboard.press("Enter");
    await pagina.getByRole("menu").waitFor();
    for (const nome of ["Sostituisci", "Sposta", "Blocca", "Rimuovi"]) expect(await voce(nome).count()).toBe(1);
    await pagina.waitForTimeout(350);
    await pagina.screenshot({ path: join(SCREENSHOT, `bozza-menu-attivita-${larghezza}.png`) });
    await pagina.keyboard.press("ArrowDown");
    const evidenziata = await pagina.evaluate(() => document.activeElement?.getAttribute("role"));
    expect(evidenziata).toBe("menuitem");
    await pagina.keyboard.press("Escape");
    await pagina.getByRole("menu").waitFor({ state: "detached" });
    await attivatore().evaluate((e) => new Promise<void>((ok) => setTimeout(ok, 150)));
    expect(await attivatore().evaluate((e) => e === document.activeElement)).toBe(true);
  });

  await f.passo("Blocca da tastiera: compare «Bloccata»", async () => {
    await attivatore().focus();
    await pagina.keyboard.press("Enter");
    await voce("Blocca").focus();
    await pagina.keyboard.press("Enter");
    await pagina.getByText("Bloccata", { exact: true }).first().waitFor();
  });

  await f.passo("Menu del giorno: più leggera, più piena, rigenera, scambia, aggiungi", async () => {
    await pagina.getByRole("button", { name: /^Modifica giorno/ }).first().click();
    for (const nome of ["Giornata più leggera", "Giornata più piena", "Rigenera questo giorno", "Aggiungi un'attività…"]) {
      expect(await voce(nome).count()).toBe(1);
    }
    await pagina.waitForTimeout(350);
    await pagina.screenshot({ path: join(SCREENSHOT, `bozza-menu-giorno-${larghezza}.png`) });
    await pagina.getByRole("menuitem", { name: "Scambia con…" }).focus();
    await pagina.keyboard.press("ArrowRight");
    await pagina.getByRole("menuitem").filter({ hasText: /\d{4}/ }).first().click();
    await pagina.locator('[data-messaggio="bozza"]').waitFor();
  });

  await f.passo("Il selettore è ricercabile, raggruppato e si chiude con Esc", async () => {
    const menuGiorno = pagina.getByRole("button", { name: /^Modifica giorno/ }).first();
    await menuGiorno.click();
    await voce("Aggiungi un'attività…").click();
    const finestra = pagina.getByRole("dialog");
    await finestra.waitFor();
    const campo = finestra.getByRole("searchbox");
    expect(await campo.evaluate((e) => e === document.activeElement)).toBe(true);
    expect(await finestra.getByText("Consigliate per te").count()).toBe(1);
    await pagina.waitForTimeout(350);
    await pagina.screenshot({ path: join(SCREENSHOT, `bozza-selettore-${larghezza}.png`) });
    await campo.fill("zzzzqqq");
    await finestra.getByText(/Nessuna attività corrisponde/).waitFor();
    await campo.fill("");
    await pagina.keyboard.press("Escape");
    await finestra.waitFor({ state: "detached" });
    await pagina.waitForTimeout(150);
    expect(await menuGiorno.evaluate((e) => e === document.activeElement)).toBe(true);
  });

  await f.passo("Aggiungo un'attività dal selettore", async () => {
    const prima = await testo(pagina);
    await pagina.getByRole("button", { name: /^Modifica giorno/ }).first().click();
    await voce("Aggiungi un'attività…").click();
    await pagina.getByRole("dialog").getByRole("button").nth(1).click();
    await pagina.getByRole("dialog").waitFor({ state: "detached" });
    await pagina.locator('[data-messaggio="bozza"]').waitFor();
    expect(await testo(pagina)).not.toBe(prima);
  });

  await f.passo("Sposta apre il pannello e il focus ci entra", async () => {
    await attivatore().click();
    await voce("Sposta").click();
    await pagina.getByLabel("Ora di inizio").waitFor();
    expect(await pagina.evaluate(() => document.activeElement?.tagName)).toBe("SELECT");
    await pagina.getByRole("button", { name: "Non spostare" }).click();
  });
});
