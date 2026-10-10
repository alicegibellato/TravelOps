/** Flusso 2: la bozza (sostituisci, sposta, blocca, annulla, confronta) e «Conferma l'itinerario». */
import { expect } from "vitest";
import { flusso } from "./flussi";
import { creaBozzaDalPercorso, testo } from "./supporto";

flusso("Flusso 2: Bozza (modifiche, annulla, confronta, conferma)", async (f) => {
  const { pagina } = f;
  await creaBozzaDalPercorso(f);
  // Una visita (non un pasto): il suo menu «…» ha Sostituisci, Sposta e Blocca.
  const prima = () => pagina.locator('li[data-tipo="attivita"]:not([data-pasto])').first();
  const apriMenu = () => prima().getByRole("button", { name: /^Azioni per «/ }).click();
  const voce = (nome: string) => pagina.getByRole("menuitem", { name: nome, exact: true });

  await f.passo("Blocco un'attività: compare «Bloccata» e il pulsante diventa «Sblocca»", async () => {
    await apriMenu();
    await voce("Blocca").click();
    await pagina.getByText("Bloccata", { exact: true }).first().waitFor();
    await apriMenu();
    expect(await voce("Sblocca").count()).toBe(1);
    await pagina.keyboard.press("Escape");
  });

  await f.passo("Annulla toglie il blocco", async () => {
    await pagina.getByRole("button", { name: "Annulla", exact: true }).click();
    await pagina.getByText("Bloccata", { exact: true }).waitFor({ state: "detached" });
    expect(await testo(pagina)).not.toContain("Sblocca");
  });

  await f.passo("Sostituisco un'attività con un'alternativa", async () => {
    const prima_ = await testo(pagina);
    await apriMenu();
    await voce("Sostituisci").click();
    const alternative = pagina.getByRole("group", { name: /^Alternative a «/ });
    await alternative.getByText("Scegli con cosa sostituirla:").waitFor();
    await alternative.getByRole("button").first().click();
    await pagina.locator('[data-messaggio="bozza"]').waitFor();
    expect(await testo(pagina)).not.toBe(prima_);
    expect(await testo(pagina)).toMatch(/Revisione B[3-9]/);
  });

  await f.passo("Sposto un'attività in un altro giorno", async () => {
    await apriMenu();
    await voce("Sposta").click();
    await pagina.getByLabel("Giorno").selectOption({ index: 1 });
    await pagina.getByLabel("Ora di inizio").fill("11:00");
    await pagina.getByRole("button", { name: "Sposta qui" }).click();
    await pagina.locator('[data-messaggio="bozza"]').waitFor();
    const messaggio = await pagina.locator('[data-messaggio="bozza"]').first().innerText();
    expect(messaggio.length).toBeGreaterThan(0);
  });

  await f.passo("Confronto due revisioni", async () => {
    await pagina.getByRole("button", { name: "Confronta", exact: true }).click();
    await pagina.getByText(/^Da B\d+ a B\d+:/).waitFor();
  });

  await f.passo("Conferma l'itinerario: festa e «Versione 1»", async () => {
    await pagina.getByRole("button", { name: "Conferma l'itinerario" }).click();
    await pagina.locator(".bozza__festa-titolo").getByText("Buon viaggio!").waitFor();
    expect(await testo(pagina)).toContain("Versione 1");
  });

  await f.passo("Dopo il ricaricamento l'itinerario resta confermato", async () => {
    await pagina.reload();
    const visto = await testo(pagina);
    expect(visto).toContain("Versione 1");
    expect(visto).not.toContain("Conferma l'itinerario");
  });
});
