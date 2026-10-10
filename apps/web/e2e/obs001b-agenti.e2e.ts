/**
 * ST-OBS-001B (REQ-OBS-001 CA-3, CA-4): dal menu si apre «Cosa hanno fatto gli agenti», che mostra le tracce runtime
 * per conversazione e per viaggio (agente, strumento, input riassunto, esito, durata); senza tracce lo dice. A 1280 px,
 * con controllo di accessibilità e screenshot in `test-results/e2e/screenshots/ST-OBS-001B`.
 */
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect } from "vitest";
import { creaConversazione, elencaViaggi, salvaTracceAgenti } from "../src/basedati";
import { usaBaseDati } from "../src/stato/avvio";
import { flusso } from "./flussi";
import { cartellaScatti, type Flusso } from "./supporto";
import { scorrimentoOrizzontale, violazioniAxe } from "./ux003b-supporto";

const CARTELLA_SCATTI = cartellaScatti("ST-OBS-001B");

/** Una base dati con le tracce di una conversazione sul primo viaggio: una delega e due strumenti, uno in errore. */
const DATI = mkdtempSync(join(tmpdir(), "travelops-agenti-e2e-"));
const { viaggio, conversazione } = usaBaseDati(DATI, (db) => {
  const viaggio = elencaViaggi(db)[0]?.id;
  if (viaggio === undefined) throw new Error("nessun viaggio nella base dati");
  const conversazione = creaConversazione(db, viaggio);
  const inizio = "2026-10-10T08:00:00.000Z";
  salvaTracceAgenti(db, conversazione, "Vorrei un weekend al lago", [
    { tipo: "delega", agente: "consulente", input: "Vuole partire: servono le preferenze", esito: "ok", dettaglio: "modo: modello", durataMs: 820, inizio },
    { tipo: "strumento", agente: "consulente", strumento: "leggi_viaggio", input: '{"versione":null}', esito: "ok", durataMs: 35, inizio },
  ]);
  salvaTracceAgenti(db, conversazione, "Aggiungi un museo", [
    { tipo: "strumento", agente: "logistica", strumento: "cerca_attivita", input: '{"tipo":"museo"}', esito: "errore", dettaglio: "catalogo non disponibile", durataMs: 2400, inizio },
  ]);
  return { viaggio, conversazione };
});

async function scatta(f: Flusso, nome: string): Promise<void> {
  mkdirSync(CARTELLA_SCATTI, { recursive: true });
  await f.pagina.screenshot({ path: join(CARTELLA_SCATTI, `${nome}--${f.vista.nome}.png`), fullPage: true });
}

flusso("ST-OBS-001B: senza tracce la pagina lo dice", async (f) => {
  const { pagina } = f;
  await f.passo("Dal menu apro «Agenti»: nessuna traccia ancora", async () => {
    await pagina.goto(f.url);
    await pagina.getByRole("link", { name: "Agenti", exact: true }).click();
    await pagina.getByRole("heading", { name: "Gli agenti non hanno ancora fatto nulla", level: 1 }).waitFor();
    expect(await pagina.getByRole("link", { name: "Agenti", exact: true }).getAttribute("aria-current")).toBe("page");
    await scatta(f, "agenti-vuota");
  });
});

flusso(
  "ST-OBS-001B: tracce per conversazione e per viaggio",
  async (f) => {
    const { pagina } = f;

    await f.passo("L'elenco mostra la conversazione con risposte, voci ed errori", async () => {
      await pagina.goto(`${f.url}/agenti`);
      await pagina.getByRole("heading", { name: "Cosa hanno fatto gli agenti", level: 1 }).waitFor();
      const voce = pagina.locator(`li[data-conversazione="${conversazione}"]`);
      expect(await voce.innerText()).toContain("2 risposte · 3 voci · 1 errore");
    });

    await f.passo("Apro la conversazione: una sezione per risposta, con agente, strumento, esito", async () => {
      await pagina.getByRole("link", { name: `Conversazione ${conversazione}`, exact: true }).click();
      await pagina.waitForURL(new RegExp(`/agenti\\?conversazione=${conversazione}$`));
      await pagina.getByRole("heading", { name: "Risposta 2", level: 3 }).waitFor();
      expect(await pagina.locator("[data-risposta]").count()).toBe(2);
      expect(await pagina.locator('tr[data-esito="errore"]').innerText()).toContain("cerca_attivita");
      await scatta(f, "agenti-conversazione");
    });

    await f.passo("Apro le tracce del viaggio", async () => {
      await pagina.getByRole("link", { name: `Tutte le tracce del viaggio ${viaggio}` }).click();
      await pagina.getByRole("heading", { name: `Viaggio ${viaggio}`, level: 2 }).waitFor();
      await pagina.getByRole("heading", { name: `Conversazione ${conversazione}, risposta 1`, level: 3 }).waitFor();
    });

    await f.passo("Nessuno scorrimento orizzontale e nessuna violazione di accessibilità", async () => {
      expect(await scorrimentoOrizzontale(pagina)).toBeLessThanOrEqual(0);
      expect(await violazioniAxe(pagina)).toEqual([]);
    });
  },
  { TRAVELOPS_DATI: DATI },
);
