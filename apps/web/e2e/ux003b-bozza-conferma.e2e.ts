/** ST-UX-003B, CB-5 e CB-7: la festa della conferma ha un solo controllo per chiuderla e rispetta il movimento ridotto. */
import { join } from "node:path";
import { expect } from "vitest";
import { flusso } from "./flussi";
import { cartellaScatti, creaBozzaDalPercorso, testo } from "./supporto";

const SCREENSHOT = cartellaScatti("ST-UX-003B");

flusso("ST-UX-003B CB-5: festa con un solo controllo di chiusura", async (f) => {
  const { pagina } = f;
  await creaBozzaDalPercorso(f);
  const festa = pagina.locator(".bozza__festa");

  await f.passo("Confermo: la festa ha un solo pulsante, «Chiudi»", async () => {
    await pagina.getByRole("button", { name: "Conferma l'itinerario" }).click();
    await festa.waitFor();
    await pagina.waitForTimeout(1600);
    await pagina.screenshot({ path: join(SCREENSHOT, `bozza-conferma-dopo-${f.vista.larghezza}.png`) });
    expect(await festa.getByRole("button").count()).toBe(1);
    expect(await festa.getByRole("button", { name: "Chiudi", exact: true }).count()).toBe(1);
    expect(await testo(pagina)).not.toContain("Togli i coriandoli");
    expect(await festa.locator(".bozza__coriandoli").count()).toBe(1);
  });

  await f.passo("«Chiudi» toglie festa e coriandoli insieme e il focus va al titolo", async () => {
    await festa.getByRole("button", { name: "Chiudi", exact: true }).click();
    await festa.waitFor({ state: "detached" });
    expect(await pagina.evaluate(() => document.activeElement?.id)).toBe("bozza-titolo");
    expect(await testo(pagina)).toContain("Versione 1");
  });
});

flusso("ST-UX-003B CB-5: Esc chiude la festa; con movimento ridotto niente coriandoli", async (f) => {
  const { pagina } = f;
  await pagina.emulateMedia({ reducedMotion: "reduce" });
  await creaBozzaDalPercorso(f);
  const festa = pagina.locator(".bozza__festa");

  await f.passo("Con movimento ridotto i coriandoli non si vedono, la festa sì", async () => {
    await pagina.getByRole("button", { name: "Conferma l'itinerario" }).click();
    await festa.waitFor();
    expect(await festa.locator(".bozza__coriandoli").evaluate((e) => getComputedStyle(e).display)).toBe("none");
    await festa.locator(".bozza__festa-titolo").waitFor();
    await pagina.screenshot({ path: join(SCREENSHOT, `bozza-conferma-movimento-ridotto-${f.vista.larghezza}.png`) });
  });

  await f.passo("Esc chiude la festa", async () => {
    await pagina.keyboard.press("Escape");
    await festa.waitFor({ state: "detached" });
  });
});
