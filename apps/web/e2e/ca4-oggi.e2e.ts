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

  await f.passo("«Sono in ritardo di 30 minuti» che non cambia nessuna attività è solo una nota, senza Accetta", async () => {
    await pagina.getByRole("button", { name: "Sono in ritardo di 30 minuti" }).click();
    await pagina.locator("[data-informativa]").waitFor();
    const visto = await testo(pagina);
    expect(visto).toContain("Nessuna attività cambia");
    expect(visto).toContain("non c'è nessuna modifica da accettare");
    expect(await pagina.getByRole("button", { name: "Accetta" }).count()).toBe(0);
    expect(await pagina.getByRole("button", { name: "Rifiuta" }).count()).toBe(0);
  });

  await f.passo("I dettagli della spiegazione si aprono e la nota resta dopo il ricaricamento", async () => {
    await pagina.reload();
    await pagina.locator("[data-informativa]").waitFor();
    await pagina.getByText("Mostra i dettagli").click();
    await pagina.locator("[data-spiegazione]").waitFor({ state: "visible" });
    expect(await pagina.getByRole("button", { name: "Accetta" }).count()).toBe(0);
  });
});
