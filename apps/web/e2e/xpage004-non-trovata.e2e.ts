/** ST-UX-003A-FIX-TB-XPAGE-004: viaggio, bozza, giorno e versione inesistenti rispondono 404 con «Pagina non trovata». */
import { expect } from "vitest";
import { flusso } from "./flussi";

const INESISTENTI = ["/viaggi/non-esiste", "/bozza/non-esiste", "/viaggi/TRIP-DEMO-GARDA/giorni/2000-01-01", "/versioni/99"];
const ESISTENTI = ["/viaggi/TRIP-DEMO-GARDA", "/viaggi/versione-1/giorni/2026-06-13", "/versioni/1"];

flusso("TB-XPAGE-004: pagine inesistenti con «Pagina non trovata» e HTTP 404", async (f) => {
  const { pagina } = f;
  for (const percorso of INESISTENTI) {
    await f.passo(`${percorso}: 404, «Pagina non trovata» e «Torna ai miei viaggi»`, async () => {
      const risposta = await pagina.goto(`${f.url}${percorso}`);
      expect(risposta?.status()).toBe(404);
      await pagina.getByRole("heading", { name: "Pagina non trovata" }).waitFor();
      expect(await pagina.getByRole("link", { name: "Torna ai miei viaggi" }).getAttribute("href")).toBe("/");
      expect(await pagina.getByText("Non trovato", { exact: true }).count()).toBe(0);
    });
  }
  for (const percorso of ESISTENTI) {
    await f.passo(`${percorso}: pagina vera con 200`, async () => {
      const risposta = await pagina.goto(`${f.url}${percorso}`);
      expect(risposta?.status()).toBe(200);
      expect(await pagina.getByRole("heading", { name: "Pagina non trovata" }).count()).toBe(0);
    });
  }
});
