/** Flusso 3: dopo la conferma una modifica diventa una proposta da accettare. */
import { expect } from "vitest";
import { flusso } from "./flussi";
import { creaBozzaDalPercorso, testo } from "./supporto";

flusso("Flusso 3: dopo la conferma, una modifica è una proposta", async (f) => {
  const { pagina } = f;
  await creaBozzaDalPercorso(f);

  await f.passo("Confermo l'itinerario", async () => {
    await pagina.getByRole("button", { name: "Conferma l'itinerario" }).click();
    await pagina.locator(".bozza__festa-titolo").waitFor();
    await pagina.getByRole("button", { name: "Chiudi", exact: true }).click();
    expect(await testo(pagina)).toContain("Versione 1");
  });

  await f.passo("Una modifica non cambia l'itinerario ma diventa una proposta in attesa", async () => {
    const proposte = pagina.getByRole("region", { name: "Proposte di modifica" });
    expect(await proposte.getByRole("button", { name: "Accetta" }).count()).toBe(0);
    await pagina.getByRole("button", { name: /^Azioni per «/ }).first().click();
    await pagina.getByRole("menuitem", { name: "Rimuovi", exact: true }).click();
    await proposte.getByRole("button", { name: "Accetta" }).first().waitFor();
    expect(await testo(pagina)).toContain("Versione 1");
  });

  await f.passo("Accetto la proposta: nasce la versione 2", async () => {
    await pagina.getByRole("button", { name: "Accetta" }).first().click();
    await pagina.getByText("Accettata", { exact: true }).first().waitFor();
    expect(await testo(pagina)).toContain("Versione 2");
  });

  await f.passo("Dopo il ricaricamento restano la versione 2 e la proposta accettata", async () => {
    await pagina.reload();
    const visto = await testo(pagina);
    expect(visto).toContain("Versione 2");
    expect(visto).toContain("Accettata");
  });
});
