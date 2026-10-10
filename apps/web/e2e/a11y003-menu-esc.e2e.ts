/** ST-UX-003B-FIX-TB-A11Y-003: nel menu del giorno Esc chiude un livello alla volta, prima il sottomenu e poi il menu. */
import { expect } from "vitest";
import { flusso } from "./flussi";
import { attendiFocus, creaBozzaDalPercorso } from "./supporto";

flusso("TB-A11Y-003: Esc chiude solo il sottomenu «Scambia con…», il secondo Esc chiude il menu", async (f) => {
  const { pagina } = f;
  await creaBozzaDalPercorso(f);
  const menuGiorno = () => pagina.getByRole("button", { name: /^Modifica giorno/ }).first();
  const scambia = () => pagina.getByRole("menuitem", { name: "Scambia con…" });
  const menuAperti = () => pagina.getByRole("menu").count();

  await f.passo("Apro il menu del giorno da tastiera e il sottomenu con freccia destra", async () => {
    await menuGiorno().focus();
    await pagina.keyboard.press("Enter");
    await pagina.getByRole("menu").first().waitFor();
    await scambia().focus();
    await pagina.keyboard.press("ArrowRight");
    await pagina.getByRole("menuitem").filter({ hasText: /\d{4}/ }).first().waitFor();
    expect(await menuAperti()).toBe(2);
    expect(await pagina.evaluate(() => document.activeElement?.getAttribute("role"))).toBe("menuitem");
  });

  await f.passo("Il primo Esc chiude solo il sottomenu: il menu resta aperto e il focus torna su «Scambia con…»", async () => {
    await pagina.keyboard.press("Escape");
    await pagina.getByRole("menuitem").filter({ hasText: /\d{4}/ }).first().waitFor({ state: "detached" });
    expect(await menuAperti()).toBe(1);
    expect(await scambia().count()).toBe(1);
    await attendiFocus(scambia());
  });

  await f.passo("Il secondo Esc chiude il menu e il focus torna su «Modifica giorno»", async () => {
    await pagina.keyboard.press("Escape");
    await pagina.getByRole("menu").first().waitFor({ state: "detached" });
    expect(await menuAperti()).toBe(0);
    await attendiFocus(menuGiorno());
  });

  await f.passo("Da sottomenu aperto col mouse, Esc chiude comunque solo il sottomenu", async () => {
    await menuGiorno().click();
    await scambia().hover();
    await pagina.getByRole("menuitem").filter({ hasText: /\d{4}/ }).first().waitFor();
    expect(await menuAperti()).toBe(2);
    await pagina.keyboard.press("Escape");
    await pagina.getByRole("menuitem").filter({ hasText: /\d{4}/ }).first().waitFor({ state: "detached" });
    expect(await menuAperti()).toBe(1);
    await pagina.keyboard.press("Escape");
    await pagina.getByRole("menu").first().waitFor({ state: "detached" });
    await attendiFocus(menuGiorno());
  });
});
