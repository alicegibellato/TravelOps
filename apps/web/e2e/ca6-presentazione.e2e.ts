/** Flusso 6: Modalità presentazione, prompt copiabili e «Ripristina i viaggi demo». */
import { expect } from "vitest";
import { COPIONE_DEMO } from "../src/demo/copione";
import { flusso } from "./flussi";
import { testo } from "./supporto";

const PRIMO_PROMPT = COPIONE_DEMO.atti[0]?.voci.find((v) => v.tipo === "prompt")?.testo ?? "";

flusso("Flusso 6: Modalità presentazione", async (f) => {
  const { pagina } = f;

  await f.passo("Apro la Modalità presentazione", async () => {
    await pagina.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: f.url });
    await pagina.goto(`${f.url}/demo`);
    await pagina.getByRole("heading", { name: "Modalità presentazione" }).waitFor();
    expect(await testo(pagina)).toContain("Copione della demo");
  });

  await f.passo("Il prompt 1 si copia e il pulsante lo dice", async () => {
    await pagina.locator('[data-copia="1"]').click();
    await pagina.locator('[data-copia="1"]').getByText("Copiato").waitFor();
    expect(await pagina.evaluate(() => navigator.clipboard.readText())).toBe(PRIMO_PROMPT);
  });

  await f.passo("Avvio uno scenario: c'è uno scenario in corso", async () => {
    await pagina.getByRole("button", { name: /Avvia lo scenario.*Ritardo breve/ }).click();
    await pagina.waitForURL(/\/demo\/proposte\//);
  });

  await f.passo("«Ripristina i viaggi demo» riporta la versione 1 e scarta la proposta", async () => {
    await pagina.goto(`${f.url}/demo`);
    await pagina.getByRole("button", { name: "Ripristina i viaggi demo" }).click();
    // Lo scenario in corso e l'orologio restano (REQ-DATA-001); i viaggi tornano alla prima versione e le proposte spariscono.
    await expect.poll(async () => testo(pagina), { timeout: 10_000 }).not.toContain("In attesa di decisione");
    const visto = await testo(pagina);
    expect(visto).toContain("1 versione: elenco e confronto");
    expect(visto).toContain("Versione 1 · Itinerario iniziale");
  });
});
