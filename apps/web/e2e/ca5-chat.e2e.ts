/** Flusso 5: la chat con l'assistente finto: si invia un prompt del copione e la risposta si vede. */
import { expect } from "vitest";
import { COPIONE_DEMO } from "../src/demo/copione";
import { flusso } from "./flussi";
import { testo } from "./supporto";

const PRIMO_PROMPT = COPIONE_DEMO.atti[0]?.voci.find((v) => v.tipo === "prompt")?.testo ?? "";

flusso("Flusso 5: chat (assistente finto)", async (f) => {
  const { pagina } = f;

  await f.passo("Apro Pianifica e vedo il benvenuto della chat", async () => {
    expect(PRIMO_PROMPT).not.toBe("");
    await pagina.goto(`${f.url}/pianifica`);
    // Sul telefono la chat sta dietro la scheda «Chat»; sul computer è accanto all'itinerario.
    if (f.vista.larghezza < 768) await pagina.getByRole("navigation", { name: "Parti del viaggio" }).getByRole("button", { name: "Chat" }).click();
    await pagina.getByText("Raccontami il viaggio che hai in mente").first().waitFor();
  });

  await f.passo("Invio il primo prompt del copione", async () => {
    await pagina.getByPlaceholder("Scrivi qui…").fill(PRIMO_PROMPT);
    await pagina.getByRole("button", { name: "Invia" }).click();
    await pagina.getByText(PRIMO_PROMPT, { exact: true }).first().waitFor();
  });

  await f.passo("La risposta dell'assistente è visibile, con le risposte rapide", async () => {
    await pagina.getByText("Vi piace di più la natura o il buon vino?").waitFor();
    const rapide = pagina.getByRole("group", { name: "Risposte rapide" });
    await rapide.getByRole("button", { name: "Tutte e due" }).waitFor();
  });

  await f.passo("Una risposta rapida si invia come messaggio", async () => {
    await pagina.getByRole("group", { name: "Risposte rapide" }).getByRole("button", { name: "Natura" }).click();
    await pagina.getByText("Dimmi qualcosa in più sul viaggio").waitFor();
    expect(await testo(pagina)).toContain("Natura");
  });

  await f.passo("Dopo il ricaricamento la chat non mostra errori", async () => {
    await pagina.reload();
    expect(await testo(pagina)).not.toMatch(/Qualcosa non ha funzionato|non disponibile/i);
  });
});
