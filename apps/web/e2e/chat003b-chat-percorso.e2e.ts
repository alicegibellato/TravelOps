/**
 * ST-CHAT-003B (REQ-CHAT-003) con l'assistente finto: la chat delle pagine del viaggio passa dal server degli agenti
 * (CA-3, TB-CHAT-013) e «Crea la mia bozza» dai filtri arriva a una risposta, senza restare su «Preparo la bozza…» (CA-6).
 */
import { expect } from "vitest";
import { caricaViaggioScelto } from "../src/dati/viaggi";
import { flusso } from "./flussi";

const CHIAVE = "versione-1";
const esito = caricaViaggioScelto(CHIAVE);
const PRIMO_GIORNO = esito?.ok === true ? (esito.viaggio.giorni[0]?.data ?? "") : "";

flusso("ST-CHAT-003B: una sola chat e «Crea la mia bozza» con l'assistente finto", async (f) => {
  const { pagina } = f;
  const richieste: string[] = [];
  pagina.on("request", (r) => {
    if (r.url().includes("/api/chat/conversazioni")) richieste.push(`${r.method()} ${new URL(r.url()).pathname}`);
  });

  await f.passo("CA-3: dalla pagina di un giorno scrivo in chat e il messaggio va al server degli agenti", async () => {
    expect(PRIMO_GIORNO).not.toBe("");
    await pagina.goto(`${f.url}/viaggi/${CHIAVE}/giorni/${PRIMO_GIORNO}`);
    await pagina.getByText("Dimmi cosa vuoi cambiare in questo viaggio").first().waitFor();
    await pagina.getByPlaceholder("Scrivi qui…").fill("Sabato piove: cosa cambio?");
    await pagina.getByRole("button", { name: "Invia" }).click();
    await pagina.getByText("Dimmi qualcosa in più sul viaggio").waitFor();
    expect(richieste).toContain("POST /api/chat/conversazioni");
    expect(richieste.some((r) => /^POST \/api\/chat\/conversazioni\/\d+\/messaggi$/.test(r))).toBe(true);
  });

  await f.passo("CA-3: ricaricando la pagina la chat riprende la conversazione del viaggio", async () => {
    await pagina.reload();
    await pagina.getByText("Sabato piove: cosa cambio?", { exact: true }).first().waitFor();
  });

  await f.passo("CA-6: compilo i filtri di Pianifica e premo «Crea la mia bozza»", async () => {
    await pagina.goto(`${f.url}/pianifica`);
    await pagina.getByText("Passo 1 di 5").waitFor();
    await pagina.getByRole("button", { name: "Lago di Garda (Riva del Garda e dintorni)" }).click();
    await pagina.getByText("Hai scelto: Lago di Garda").waitFor();
    await pagina.getByRole("button", { name: "Avanti" }).click();
    await pagina.getByText("Passo 2 di 5").waitFor();
    await pagina.getByLabel("Dal", { exact: true }).fill("2026-07-10");
    await pagina.getByLabel("Al", { exact: true }).fill("2026-07-13");
    for (const numero of [2, 3, 4]) {
      await pagina.getByText(`Passo ${numero} di 5`).waitFor();
      await pagina.getByRole("button", { name: "Avanti" }).click();
    }
    await pagina.getByText("Passo 5 di 5").waitFor();
    await pagina.getByRole("button", { name: "Crea la mia bozza" }).click();
  });

  await f.passo("CA-6: arriva la risposta e la bozza non resta su «Preparo la bozza…»", async () => {
    await pagina.getByText("qui non preparo la bozza").waitFor({ timeout: 15_000 });
    await pagina.getByText("Preparo la bozza…").waitFor({ state: "detached", timeout: 15_000 });
  });
});
