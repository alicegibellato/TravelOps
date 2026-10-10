/**
 * ST-UX-003A-FIX-TB-XPAGE-003 (TB-XPAGE-003): nel browser vero, accettata la proposta «Chiusura del MUSE», `/demo`
 * mostra la versione corrente 2 e la proposta accettata, e la pagina del giorno del MUSE del viaggio di riferimento
 * (`/viaggi/versione-1/giorni/2026-06-14`), come «Versioni» e «Itinerario corrente», non mostra più la visita al MUSE.
 */
import { expect } from "vitest";
import { flusso } from "./flussi";
import { testo } from "./supporto";

const GIORNO_MUSE = "2026-06-14";
const VISITA_MUSE = "Visita al MUSE";

flusso("ST-UX-003A-FIX-TB-XPAGE-003: la proposta accettata si vede nella pagina del giorno", async (f) => {
  const { pagina } = f;

  await f.passo("Prima dello scenario il giorno del MUSE mostra la visita al MUSE", async () => {
    await pagina.goto(`${f.url}/viaggi/versione-1/giorni/${GIORNO_MUSE}`);
    expect(await testo(pagina)).toContain(VISITA_MUSE);
  });

  await f.passo("Avvio «Chiusura del MUSE» e accetto la proposta", async () => {
    await pagina.goto(`${f.url}/demo`);
    await pagina.getByRole("button", { name: /Avvia lo scenario.*Chiusura del MUSE/ }).click();
    await pagina.waitForURL(/\/demo\/proposte\//);
    await pagina.getByRole("button", { name: "Accetta", exact: true }).click();
    await expect.poll(async () => testo(pagina), { timeout: 10_000 }).toContain("Proposta accettata");
  });

  await f.passo("/demo mostra la versione corrente 2", async () => {
    await pagina.goto(`${f.url}/demo`);
    await pagina.locator('[data-versione-corrente="2"]').waitFor();
  });

  await f.passo("Il giorno del MUSE del viaggio di riferimento, Itinerario corrente e Versioni non mostrano più il MUSE", async () => {
    await pagina.goto(`${f.url}/viaggi/versione-1/giorni/${GIORNO_MUSE}`);
    expect(await testo(pagina)).not.toContain(VISITA_MUSE);
    await pagina.goto(`${f.url}/viaggi/versione-1`);
    expect(await testo(pagina)).not.toContain(VISITA_MUSE);
    await pagina.goto(`${f.url}/itinerario`);
    await pagina.waitForURL(/\/versioni\/2/);
    expect(await testo(pagina)).not.toContain(VISITA_MUSE);
  });
});
