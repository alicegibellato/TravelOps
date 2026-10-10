/** Flusso 4: la vista Oggi (Adesso e Dopo) e «Sono in ritardo di 30 minuti», che porta a una proposta. */
import { expect } from "vitest";
import { flusso } from "./flussi";
import { testo } from "./supporto";

flusso("Flusso 4: Oggi (Adesso, Dopo, ritardo)", async (f) => {
  const { pagina } = f;

  await f.passo("Apro Oggi dalla barra di navigazione", async () => {
    await pagina.goto(f.url);
    await pagina.locator('a[href="/oggi"]').first().click().catch(async () => pagina.goto(`${f.url}/oggi`));
    await pagina.getByRole("heading", { name: "Adesso" }).waitFor();
  });

  await f.passo("Vedo Adesso, Dopo e i pulsanti di ritardo", async () => {
    await pagina.getByRole("heading", { name: "Dopo" }).waitFor();
    const visto = await testo(pagina);
    expect(visto).toContain("venerdì 12 giugno 2026 alle 08:00");
    expect(visto).toContain("Parti alle");
    expect(visto).toContain("Qualcosa è cambiato?");
    for (const minuti of [15, 30, 60]) expect(visto).toContain(`Sono in ritardo di ${minuti} minuti`);
  });

  await f.passo("«Sono in ritardo di 30 minuti» porta a una proposta da decidere", async () => {
    await pagina.getByRole("button", { name: "Sono in ritardo di 30 minuti" }).click();
    await pagina.getByRole("button", { name: "Accetta" }).first().waitFor();
    expect(await testo(pagina)).toMatch(/proposta/i);
  });

  await f.passo("La proposta resta dopo il ricaricamento", async () => {
    await pagina.reload();
    await pagina.getByRole("button", { name: "Accetta" }).first().waitFor();
  });
});
