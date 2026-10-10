/**
 * Flusso 7 (REQ-MONITOR-001): aprendo Oggi il monitoraggio trova una pioggia sul trekking del Ponale (adattatori finti),
 * mostra la notifica con l'imprevisto e il link alla proposta, che si apre; ricaricando Oggi la notifica resta una sola.
 */
import { expect } from "vitest";
import { flusso } from "./flussi";
import { testo } from "./supporto";

const SCENARIO = JSON.stringify({
  meteo: [{ zonaId: "GARDA_NORD", data: "2026-06-13", fasce: [{ inizio: "08:00", fine: "13:00", condizione: "pioggia" }] }],
});
const NOTIFICA = "Nuovo imprevisto: pioggia prevista sabato alle 09:00 per «Trekking sul Sentiero del Ponale»";

flusso(
  "Flusso 7: monitoraggio, notifica in Oggi e proposta",
  async (f) => {
    const { pagina } = f;

    await f.passo("Apro Oggi: vedo la notifica del nuovo imprevisto", async () => {
      await pagina.goto(`${f.url}/oggi`);
      await pagina.getByRole("heading", { name: "Adesso" }).waitFor();
      const notifica = pagina.locator("[data-notifica]");
      await notifica.waitFor();
      expect(await notifica.count()).toBe(1);
      expect(await notifica.innerText()).toContain(NOTIFICA);
    });

    await f.passo("Ricaricando Oggi la notifica resta una sola (nessun duplicato)", async () => {
      await pagina.reload();
      await pagina.locator("[data-notifica]").waitFor();
      expect(await pagina.locator("[data-notifica]").count()).toBe(1);
    });

    await f.passo("«Vedi la proposta» apre la proposta di ripianificazione da decidere", async () => {
      await pagina.getByRole("link", { name: "Vedi la proposta" }).click();
      await pagina.getByRole("button", { name: "Accetta" }).first().waitFor();
      const visto = await testo(pagina);
      expect(visto).toMatch(/Sentiero del Ponale/);
      expect(visto).toMatch(/proposta/i);
    });

    await f.passo("Rifiutata la proposta, tornando a Oggi la notifica non c'è più", async () => {
      await pagina.getByRole("button", { name: "Rifiuta" }).first().click();
      await pagina.goto(`${f.url}/oggi`);
      await pagina.getByRole("heading", { name: "Adesso" }).waitFor();
      expect(await pagina.locator("[data-notifica]").count()).toBe(0);
    });
  },
  { MONITOR_FINTO: SCENARIO },
);
