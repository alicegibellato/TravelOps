/**
 * ST-QA-001E (REQ-QA-001): coerenza tra pagine, persistenza e versioni (solo web app su computer, 1280 px).
 * TB-XPAGE-001, TB-TRIP-002: conferma di una bozza vista da home, viaggio e Oggi.
 * TB-XPAGE-002: modifiche della bozza dopo ricaricamento e riavvio del server.
 * TB-XPAGE-003: scenario «Chiusura del MUSE» accettato e visto ovunque.
 * TB-VER-003: proposta rifiutata, nessuna nuova versione.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, expect } from "vitest";
import type { Page } from "playwright-core";
import { flusso } from "./flussi";
import { avviaApp, creaBozzaDalPercorso, testo, type Flusso } from "./supporto";
import { idBozza } from "./ux003b-supporto";

const TITOLO_GARDA = "Quattro giorni sul Lago di Garda";
const NOME_ATTIVITA = /^Azioni per «(.+)»$/;

/** Conferma la bozza aperta e chiude la festa. */
async function confermaBozza(f: Flusso): Promise<void> {
  const { pagina } = f;
  await pagina.getByRole("button", { name: "Conferma l'itinerario" }).click();
  await pagina.locator(".bozza__festa-titolo").waitFor();
  await pagina.getByRole("button", { name: "Chiudi", exact: true }).click();
  await pagina.getByText("Versione 1", { exact: true }).first().waitFor();
}

/** Le attività visibili nella pagina della bozza, per giorno (data -> nomi). */
async function attivitaPerGiorno(pagina: Page): Promise<Record<string, string[]>> {
  return pagina.locator("section.bozza__giorno").evaluateAll((giorni) =>
    Object.fromEntries(
      giorni.map((g) => [
        g.getAttribute("data-data") ?? "",
        [...g.querySelectorAll('li[data-tipo="attivita"] button[aria-label^="Azioni per «"]')].map((b) =>
          (b.getAttribute("aria-label") ?? "").replace(/^Azioni per «/, "").replace(/»$/, ""),
        ),
      ]),
    ),
  );
}

/** Le righe della cronologia delle versioni in /versioni. */
const righeVersioni = (pagina: Page) => pagina.locator("li[data-versione]");

/** Apre una voce del menu «Sezioni». */
async function vaiAlMenu(pagina: Page, voce: string): Promise<void> {
  await pagina.getByRole("navigation", { name: "Sezioni" }).getByRole("link", { name: voce, exact: true }).click();
}

flusso("TB-XPAGE-001 / TB-TRIP-002: la bozza confermata è la stessa su tutte le pagine", async (f) => {
  const { pagina } = f;
  await creaBozzaDalPercorso(f);
  const viaggio = idBozza(pagina.url());
  const attivita = await attivitaPerGiorno(pagina);
  const date = Object.keys(attivita);
  expect(date.length).toBe(4);

  await f.passo("Confermo la bozza", () => confermaBozza(f));

  await f.passo("TB-XPAGE-001: la home mostra il viaggio «Confermato» (o «In corso»)", async () => {
    await pagina.goto(`${f.url}/`);
    const scheda = pagina.locator(`[data-viaggio="${viaggio}"]`);
    await scheda.waitFor();
    expect(await scheda.locator("[data-stato]").innerText()).toMatch(/Confermato|In corso/);
    expect(await scheda.innerText()).toContain("4 giorni");
  });

  await f.passo("TB-TRIP-002: «Apri» sul viaggio dell'utente porta al viaggio, non alla bozza", async () => {
    await pagina.locator(`[data-viaggio="${viaggio}"]`).getByRole("link").first().click();
    await pagina.waitForURL(new RegExp(`/viaggi/${encodeURIComponent(viaggio)}$`));
    await pagina.getByRole("list", { name: "Giorni del viaggio" }).waitFor();
    const visto = await testo(pagina);
    expect(visto).not.toContain("Pagina non trovata");
    expect(visto).not.toContain("Conferma l'itinerario");
    expect(visto).toContain("Partenza da");
    expect(visto).toContain("Alloggio della notte");
    expect(visto).toContain("Programma");
  });

  await f.passo("TB-XPAGE-001: stessi giorni e stesse attività del viaggio", async () => {
    const giorniViaggio = await pagina.locator("ol[aria-label='Giorni del viaggio'] > li").evaluateAll((l) => l.map((e) => e.getAttribute("data-data")));
    expect(giorniViaggio).toEqual(date);
    for (const data of date) {
      await pagina.goto(`${f.url}/viaggi/${encodeURIComponent(viaggio)}/giorni/${data}`);
      await pagina.locator("h1").first().waitFor();
      const visto = await testo(pagina);
      for (const nome of attivita[data] ?? []) expect(visto, `${nome} il ${data}`).toContain(nome);
    }
  });

  await f.passo("TB-XPAGE-001: «Oggi» è coerente (nessun errore, vista del viaggio)", async () => {
    await vaiAlMenu(pagina, "Oggi");
    await pagina.waitForURL(/\/viaggi\/[^/]+\/oggi$/);
    await pagina.getByRole("heading", { name: "Oggi", level: 1 }).waitFor();
    expect(await testo(pagina)).not.toContain("Pagina non trovata");
  });

  await f.passo("TB-TRIP-002: «Apri» su «Quattro giorni sul Lago di Garda» apre il viaggio di riferimento", async () => {
    await pagina.goto(`${f.url}/`);
    const link = pagina.locator(".scheda-viaggio").filter({ hasText: TITOLO_GARDA }).getByRole("link").first();
    await link.click();
    await pagina.waitForURL(/\/viaggi\/(?!.*\/oggi)[^/]+$/);
    await pagina.getByRole("list", { name: "Giorni del viaggio" }).waitFor();
    const visto = await testo(pagina);
    expect(visto).not.toContain("Pagina non trovata");
    expect(visto).not.toContain("Conferma l'itinerario");
    expect(visto).toContain("Partenza da");
    expect(visto).toContain("Alloggio della notte");
    expect(visto).toContain("Programma");
  });
});

// La cartella dati condivisa tra i due avvii del server di TB-XPAGE-002 (avviaApp rimuove solo la propria).
const CARTELLA_RIAVVIO = mkdtempSync(join(tmpdir(), "travelops-e2e-riavvio-"));
afterAll(() => rmSync(CARTELLA_RIAVVIO, { recursive: true, force: true }));

flusso(
  "TB-XPAGE-002: modifiche della bozza dopo ricaricamento e riavvio del server",
  async (f) => {
    const { pagina } = f;
    await creaBozzaDalPercorso(f);
    const viaggio = idBozza(pagina.url());
    const visite = () => pagina.locator('li[data-tipo="attivita"]:not([data-pasto])');
    const apriMenu = (n: number) => visite().nth(n).getByRole("button", { name: NOME_ATTIVITA }).click();
    const voce = (nome: string) => pagina.getByRole("menuitem", { name: nome, exact: true });
    const nomeVisita = async (n: number): Promise<string> => {
      const etichetta = (await visite().nth(n).getByRole("button", { name: NOME_ATTIVITA }).getAttribute("aria-label")) ?? "";
      return NOME_ATTIVITA.exec(etichetta)?.[1] ?? "";
    };
    const bloccata = (nome: string) => bloccataIn(pagina, nome);
    const revisioni = () => pagina.locator("li[data-revisione]").evaluateAll((l) => l.map((e) => (e as HTMLElement).innerText));

    const sostituita = await nomeVisita(0);
    await f.passo("Sostituisco la prima visita con un'alternativa", async () => {
      await apriMenu(0);
      await voce("Sostituisci").click();
      const alternative = pagina.getByRole("group", { name: /^Alternative a «/ });
      await alternative.getByText("Scegli con cosa sostituirla:").waitFor();
      await alternative.getByRole("button").first().click();
      await pagina.locator('[data-messaggio="bozza"]').waitFor();
      expect(await pagina.getByRole("button", { name: `Azioni per «${sostituita}»` }).count()).toBe(0);
      expect(await nomeVisita(0)).not.toBe(sostituita);
    });

    const fissa = await nomeVisita(1);
    await f.passo("Blocco un'altra visita: compare «Bloccata»", async () => {
      await apriMenu(1);
      await voce("Blocca").click();
      await bloccata(fissa).waitFor();
    });

    const prima = await attivitaPerGiorno(pagina);
    const giornoBloccata = (await posizioneDi(pagina, fissa)).giorno;
    await f.passo("Cambio il ritmo e rigenero: l'attività bloccata resta dov'è", async () => {
      await pagina.getByLabel("Ritmo").selectOption("intenso");
      await pagina.getByRole("button", { name: "Rigenera con queste preferenze" }).click();
      await bloccata(fissa).waitFor();
      await pagina.getByText("Ultima modifica: Preferenze", { exact: false }).first().waitFor();
      expect(await attivitaPerGiorno(pagina)).not.toEqual(prima);
      // L'attività bloccata resta nello stesso giorno (l'orario può scorrere con le nuove attività: vedi il rapporto di QA).
      expect((await posizioneDi(pagina, fissa)).giorno).toBe(giornoBloccata);
    });

    const dopoRigenera = await attivitaPerGiorno(pagina);
    const posizioneBloccata = await posizioneDi(pagina, fissa);
    const cronologia = await revisioni();
    expect(cronologia.length).toBeGreaterThanOrEqual(4);

    const controlla = async (dove: Page, cosa: string): Promise<void> => {
      await dove.getByRole("button", { name: "Conferma l'itinerario" }).waitFor();
      expect(await attivitaPerGiorno(dove), `attività ${cosa}`).toEqual(dopoRigenera);
      await bloccataIn(dove, fissa).waitFor();
      expect(await posizioneDi(dove, fissa), `posizione ${cosa}`).toEqual(posizioneBloccata);
      expect(await dove.locator("li[data-revisione]").evaluateAll((l) => l.map((e) => (e as HTMLElement).innerText)), `cronologia ${cosa}`).toEqual(cronologia);
    };

    await f.passo("Dopo il ricaricamento tutto resta", async () => {
      await pagina.reload();
      await controlla(pagina, "dopo il ricaricamento");
    });

    await f.passo("Dopo il riavvio del server (stessa cartella dati) tutto resta", async () => {
      const secondo = await avviaApp({ TRAVELOPS_DATI: CARTELLA_RIAVVIO });
      const contesto = await pagina.context().browser()!.newContext({ viewport: pagina.viewportSize()!, locale: "it-IT" });
      try {
        contesto.setDefaultTimeout(10_000);
        const altra = await contesto.newPage();
        await altra.goto(`${secondo.url}/bozza/${encodeURIComponent(viaggio)}`);
        await controlla(altra, "dopo il riavvio");
      } finally {
        await contesto.close();
        await secondo.ferma();
      }
    });
  },
  { TRAVELOPS_DATI: CARTELLA_RIAVVIO },
);

/** Giorno e posizione di un'attività nella pagina della bozza. */
async function posizioneDi(pagina: Page, nome: string): Promise<{ giorno: string; orario: string }> {
  const scheda = pagina.locator("section.bozza__giorno").filter({ has: pagina.getByRole("button", { name: `Azioni per «${nome}»` }) });
  const giorno = (await scheda.getAttribute("data-data")) ?? "";
  const riga = pagina.locator("li[data-tipo='attivita']").filter({ has: pagina.getByRole("button", { name: `Azioni per «${nome}»` }) });
  return { giorno, orario: /\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2}/.exec(await riga.innerText())?.[0] ?? "" };
}

function bloccataIn(pagina: Page, nome: string) {
  return pagina.locator("li[data-tipo='attivita']").filter({ has: pagina.getByRole("button", { name: `Azioni per «${nome}»` }) }).getByText("Bloccata", { exact: true });
}

/** Il testo della pagina senza la riga della versione (che riporta la causa, per esempio «Chiusura del MUSE»). */
async function testoSenzaIntestazione(pagina: Page): Promise<string> {
  return pagina.evaluate(() => {
    const copia = document.body.cloneNode(true) as HTMLElement;
    copia.querySelectorAll("nav[aria-label='Versione']").forEach((n) => n.remove());
    document.body.after(copia);
    const t = copia.innerText;
    copia.remove();
    return t;
  });
}

/** Avvia lo scenario con quel titolo dalla pagina Demo e aspetta la pagina della proposta. */
async function avviaScenario(f: Flusso, titolo: string): Promise<void> {
  const { pagina } = f;
  await pagina.goto(`${f.url}/demo`);
  await pagina.getByRole("button", { name: `Avvia lo scenario ${titolo}` }).click();
  await pagina.waitForURL(/\/demo\/proposte\//);
  await pagina.getByRole("heading", { name: "Decisione" }).waitFor();
}

flusso("TB-XPAGE-003: lo scenario «Chiusura del MUSE» accettato è coerente ovunque", async (f) => {
  const { pagina } = f;
  const GIORNO = "2026-06-14";
  // La proposta toglie la visita al MUSE e accorcia lo spostamento verso l'hotel: l'alternativa è il giorno senza MUSE.
  const RISULTATO = "Trattoria in centro a Trento → Hotel sul lago, Riva del Garda";

  await f.passo("Avvio lo scenario: la proposta toglie la visita al MUSE", async () => {
    await avviaScenario(f, "Chiusura del MUSE");
    expect(await testo(pagina)).toContain("ti propongo di togliere Visita al MUSE");
  });

  await f.passo("Accetto la proposta", async () => {
    await pagina.getByRole("button", { name: "Accetta", exact: true }).click();
    await pagina.locator("[data-decisione]").getByText(/Accettata/).waitFor();
    expect(await testo(pagina)).toContain("versione 2");
  });

  await f.passo("/demo: «Versione corrente» 2 e proposta accettata", async () => {
    await pagina.goto(`${f.url}/demo`);
    expect(await pagina.locator("[data-versione-corrente]").getAttribute("data-versione-corrente")).toBe("2");
    const proposta = await pagina.locator("dt", { hasText: "Proposta" }).locator("xpath=following-sibling::dd[1]").innerText();
    expect(proposta).toContain("Chiusura del MUSE");
    expect(proposta).toContain("Accettata");
  });

  const senzaMuse = async (cosa: string): Promise<void> => {
    const visto = await testoSenzaIntestazione(pagina);
    expect(visto, cosa).not.toContain("MUSE");
    expect(visto, cosa).toContain(RISULTATO);
  };

  await f.passo("«Versioni»: la versione 2 è la corrente e il suo giorno mostra l'alternativa, non il MUSE", async () => {
    await vaiAlMenu(pagina, "Versioni");
    await pagina.waitForURL(/\/versioni$/);
    expect(await righeVersioni(pagina).count()).toBe(2);
    expect(await righeVersioni(pagina).last().innerText()).toContain("Corrente");
    await pagina.goto(`${f.url}/versioni/2/giorni/${GIORNO}`);
    await pagina.getByText("Versione 2", { exact: true }).first().waitFor();
    await senzaMuse("Versioni, versione 2");
  });

  await f.passo("«Itinerario corrente»: è la versione 2 e il suo giorno mostra l'alternativa, non il MUSE", async () => {
    await vaiAlMenu(pagina, "Itinerario corrente");
    await pagina.waitForURL(/\/versioni\/2$/);
    await pagina.goto(`${f.url}/versioni/2/giorni/${GIORNO}`);
    await senzaMuse("Itinerario corrente");
  });

  await f.passo("«Oggi» sul giorno del MUSE mostra l'alternativa, non il MUSE", async () => {
    await pagina.goto(`${f.url}/demo`);
    await pagina.getByLabel("Data", { exact: true }).fill(GIORNO);
    await pagina.getByLabel("Ora", { exact: true }).fill("09:00");
    await pagina.getByRole("button", { name: "Imposta l'orologio" }).click();
    await pagina.locator(`[data-orologio^="${GIORNO}"]`).waitFor();
    await vaiAlMenu(pagina, "Oggi");
    await pagina.waitForURL(/\/viaggi\/[^/]+\/oggi$/);
    await pagina.getByRole("heading", { name: "Adesso" }).waitFor();
    const visto = await testo(pagina);
    expect(visto).not.toContain("MUSE");
    expect(visto).toContain("Castello del Buonconsiglio");
  });
});

flusso("TB-VER-003: una proposta rifiutata non crea versioni e non cambia l'itinerario", async (f) => {
  const { pagina } = f;
  await f.passo("Parto da un itinerario con la sua versione e annoto cosa mostra il giorno del MUSE", async () => {
    await pagina.goto(`${f.url}/versioni/1/giorni/2026-06-14`);
    await pagina.getByText("Versione 1", { exact: true }).first().waitFor();
  });
  const prima = await testoSenzaIntestazione(pagina);
  expect(prima).toContain("Visita al MUSE");

  await f.passo("Avvio lo scenario e premo «Rifiuta»", async () => {
    await avviaScenario(f, "Chiusura del MUSE");
    await pagina.getByRole("button", { name: "Rifiuta", exact: true }).click();
    await pagina.locator("[data-decisione]").getByText(/Rifiutata/).waitFor();
  });

  await f.passo("/demo: proposta «Rifiutata», ancora una sola versione", async () => {
    await pagina.goto(`${f.url}/demo`);
    expect(await pagina.locator("[data-versione-corrente]").getAttribute("data-versione-corrente")).toBe("1");
    expect(await testo(pagina)).toContain("Rifiutata");
  });

  await f.passo("«Versioni»: le versioni sono ancora quelle di prima e l'itinerario corrente non cambia", async () => {
    await vaiAlMenu(pagina, "Versioni");
    await pagina.waitForURL(/\/versioni$/);
    expect(await righeVersioni(pagina).count()).toBe(1);
    await vaiAlMenu(pagina, "Itinerario corrente");
    await pagina.waitForURL(/\/versioni\/1$/);
    await pagina.goto(`${f.url}/versioni/1/giorni/2026-06-14`);
    await pagina.getByText("Versione 1", { exact: true }).first().waitFor();
    // L'itinerario è lo stesso: nessuna riga della versione 1 sparisce (la riga sui problemi di fattibilità dipende dallo scenario in corso).
    const dopo = (await testoSenzaIntestazione(pagina)).split("\n");
    const mancanti = prima.split("\n").filter((riga) => !/problem[ia] di fattibilità/.test(riga) && !dopo.includes(riga));
    expect(mancanti).toEqual([]);
    expect(dopo.join("\n")).toContain("Visita al MUSE");
  });
});
