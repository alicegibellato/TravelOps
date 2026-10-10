/**
 * QA-001C: casi del testbook gruppo C «Imprevisti» (TB-IMPR-001..013), scritti come e2e a 1280 px.
 * Ogni caso verifica il risultato ATTESO così com'è scritto in docs/testbook-c/imprevisti.md: se l'app non lo
 * produce, il test fallisce (le verifiche indipendenti di uno stesso caso sono raccolte e riportate tutte insieme).
 */
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect } from "vitest";
import type { Page } from "playwright-core";
import { scriviImpostazione } from "../src/basedati";
import { usaBaseDati } from "../src/stato/avvio";
import { flussoCaso as flusso } from "./qa001c-difetti";
import { testo, type Flusso } from "./supporto";

const USCITA = join(tmpdir(), "travelops-qa001c-dump");
const OGGI = "2026-06-12";

function dump(nome: string, contenuto: string): void {
  try {
    mkdirSync(USCITA, { recursive: true });
    writeFileSync(join(USCITA, `dump-${nome}.txt`), contenuto);
  } catch {
    // Il dump è solo un aiuto alla diagnosi.
  }
}

/** Raccoglie i controlli indipendenti di un caso: tutti vengono eseguiti, poi il caso fallisce se ne manca uno. */
class Controlli {
  readonly errori: string[] = [];
  constructor(private readonly f: Flusso) {}
  async prova(nome: string, corpo: () => Promise<void>): Promise<void> {
    try {
      await this.f.passo(nome, corpo);
    } catch (errore) {
      const m = errore instanceof Error ? errore.message : String(errore);
      this.errori.push(`[${nome}] ${m.split("\n").filter((r) => !r.startsWith("    at ")).slice(0, 6).join(" | ")}`);
    }
  }
  chiudi(): void {
    if (this.errori.length > 0) throw new Error(`Verifiche non superate (${this.errori.length}):\n- ${this.errori.join("\n- ")}`);
  }
}

async function apriScheda(f: Flusso, id: string, titolo: string): Promise<void> {
  const { pagina } = f;
  await pagina.goto(`${f.url}/imprevisti`);
  await pagina.getByRole("heading", { name: "Ho un imprevisto", level: 1 }).waitFor();
  await pagina.locator(`a[data-scheda="${id}"]`).click();
  await pagina.getByRole("heading", { name: titolo, level: 2, exact: true }).waitFor();
}

async function preparaProposta(f: Flusso): Promise<string> {
  const { pagina } = f;
  await pagina.getByRole("button", { name: "Prepara la proposta" }).click();
  await pagina.waitForURL(/\/demo\/proposte\/\d+/);
  await pagina.getByRole("heading", { name: "Decisione", level: 2 }).waitFor();
  return testo(pagina);
}

async function righe(pagina: Page, selettore: string): Promise<string[]> {
  return pagina.locator(selettore).evaluateAll((els) => els.map((e) => (e as HTMLElement).innerText.replace(/\s+/g, " ").trim()));
}

async function impostaOrologio(f: Flusso, data: string, ora: string): Promise<void> {
  const { pagina } = f;
  await pagina.goto(`${f.url}/demo`);
  await pagina.getByLabel("Data", { exact: true }).fill(data);
  await pagina.getByLabel("Ora", { exact: true }).fill(ora);
  await pagina.getByRole("button", { name: "Imposta l'orologio" }).click();
  await pagina.locator(`[data-orologio="${data} ${ora}"]`).waitFor();
}

async function avviaScenario(f: Flusso, titolo: string): Promise<void> {
  const { pagina } = f;
  await pagina.goto(`${f.url}/demo`);
  await pagina.getByRole("button", { name: `Avvia lo scenario ${titolo}` }).click();
  await pagina.waitForURL(/\/demo\/proposte\/\d+/);
  await pagina.getByRole("heading", { name: "Decisione", level: 2 }).waitFor();
}

async function versioniAttuali(f: Flusso): Promise<string> {
  await f.pagina.goto(`${f.url}/versioni`);
  await f.pagina.getByRole("heading", { level: 1 }).first().waitFor();
  return testo(f.pagina);
}

// ---------------------------------------------------------------------------------------------------------------------

flusso("TB-IMPR-001 Come si arriva agli imprevisti", async (f) => {
  const { pagina } = f;
  const c = new Controlli(f);
  const origine = new URL(f.url).origin;

  /** Gli indirizzi interni dei link di una pagina. */
  const indirizzi = async (): Promise<string[]> =>
    pagina.evaluate(() => [...new Set([...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href") ?? ""))].filter((h) => h.startsWith("/") && !h.startsWith("//")));
  const linkImprevisto = async (): Promise<{ testo: string; href: string }[]> =>
    pagina.evaluate(() =>
      [...document.querySelectorAll("a[href]")]
        .map((a) => ({ testo: (a as HTMLElement).innerText.replace(/\s+/g, " ").trim(), href: a.getAttribute("href") ?? "" }))
        .filter((l) => /imprevist/i.test(l.testo) || l.href.startsWith("/imprevisti")),
    );

  /** Apre un indirizzo; false se non si apre (download, reindirizzamento interrotto). */
  const vai = async (url: string): Promise<boolean> => {
    try {
      await pagina.goto(url, { waitUntil: "domcontentloaded" });
      await pagina.waitForLoadState("networkidle").catch(() => undefined);
      return true;
    } catch {
      return false;
    }
  };

  /** Quanti clic servono (0 = non raggiungibile entro 2) per arrivare a /imprevisti partendo da `partenza`. */
  async function clic(partenza: string): Promise<{ n: number; via: string; link: { testo: string; href: string }[] }> {
    await vai(`${f.url}${partenza}`);
    const link = await linkImprevisto();
    if (link.some((l) => l.href.startsWith("/imprevisti"))) return { n: 1, via: partenza, link };
    const vicini = (await indirizzi()).filter((h) => !h.startsWith("/_next") && h !== partenza).slice(0, 40);
    for (const h of vicini) {
      if (!(await vai(`${origine}${h}`))) continue;
      if ((await linkImprevisto()).some((l) => l.href.startsWith("/imprevisti"))) return { n: 2, via: h, link };
    }
    return { n: 0, via: "", link };
  }

  let chiaveViaggio = "";
  await c.prova("Dalla home trovo il viaggio confermato", async () => {
    await pagina.goto(f.url);
    await pagina.getByRole("heading", { name: "I miei viaggi" }).waitFor();
    const scheda = pagina.locator(".scheda-viaggio", { hasText: "Quattro giorni sul Lago di Garda" }).first();
    chiaveViaggio = (await scheda.getAttribute("data-viaggio")) ?? "";
    expect(chiaveViaggio).not.toBe("");
  });

  const punti: [string, string][] = [
    ["Oggi", "/oggi"],
    ["pagina del viaggio", `/viaggi/${chiaveViaggio}`],
    ["Versioni", "/versioni"],
    ["home", "/"],
  ];
  const riepilogo: string[] = [];
  for (const [nome, percorso] of punti) {
    await c.prova(`Da «${nome}» «Ho un imprevisto» è raggiungibile e non porta a /demo`, async () => {
      const r = await clic(percorso);
      riepilogo.push(`${nome}: ${r.n === 0 ? "non raggiungibile in 2 clic" : `${r.n} clic via ${r.via}`}; link «imprevisto»: ${JSON.stringify(r.link)}`);
      expect(r.n, `da «${nome}» (${percorso}) non si arriva a /imprevisti in due clic; link trovati: ${JSON.stringify(r.link)}`).toBeGreaterThan(0);
      // Solo per Oggi e il viaggio il limite è obbligatorio; per gli altri basta che i link «Ho un imprevisto» non vadano a /demo.
      const verso = r.link.filter((l) => /imprevisto/i.test(l.testo));
      for (const l of verso) expect(l.href, `il link «${l.testo}» in ${percorso} porta a ${l.href}`).toMatch(/^\/imprevisti/);
    });
  }
  dump("TB-IMPR-001", riepilogo.join("\n"));
  c.chiudi();
});

// ---------------------------------------------------------------------------------------------------------------------

flusso("TB-IMPR-004 Posto chiuso", async (f) => {
  const { pagina } = f;
  const c = new Controlli(f);
  await c.prova("Apro «Posto chiuso», scelgo un luogo del programma (Ponale), sabato 13 giugno, preparo la proposta", async () => {
    await apriScheda(f, "posto-chiuso", "Posto chiuso");
    const opzioni = await pagina.locator("#imprevisto-luogoId option").evaluateAll((os) => os.map((o) => ({ v: (o as HTMLOptionElement).value, t: o.textContent ?? "" })));
    const ponale = opzioni.find((o) => /ponale/i.test(o.t) || /ponale/i.test(o.v));
    expect(ponale, `luoghi nel menu: ${JSON.stringify(opzioni)}`).toBeDefined();
    await pagina.getByLabel("Quale posto").selectOption(ponale!.v);
    await pagina.getByLabel("Quando", { exact: true }).fill("2026-06-13");
    dump("TB-IMPR-004", await preparaProposta(f));
  });
  await c.prova("«Cosa cambia» sostituisce l'attività in quel luogo con un'alternativa nello stesso giorno", async () => {
    const cambi = await righe(pagina, "[data-modifica]");
    expect(cambi.length, "nessuna modifica").toBeGreaterThan(0);
    expect(await pagina.locator('[data-modifica][data-tipo="rimosso"]').count(), "nessuna attività tolta").toBeGreaterThan(0);
    expect(await pagina.locator('[data-modifica][data-tipo="aggiunto"]').count(), "nessuna alternativa aggiunta").toBeGreaterThan(0);
  });
  await c.prova("Gli altri giorni non cambiano", async () => {
    const ids = await pagina.locator("[data-modifica]").evaluateAll((els) => els.map((e) => e.getAttribute("data-modifica") ?? ""));
    const altri = ids.filter((i) => /^D[13]-/.test(i));
    expect(altri, `modifiche su altri giorni: ${altri.join(", ")}`).toEqual([]);
    expect(await testo(pagina)).toContain("13 giugno");
  });
  c.chiudi();
});

flusso("TB-IMPR-006 Non sto bene / Sono stanco", async (f) => {
  const { pagina } = f;
  const c = new Controlli(f);
  // REQ-REPLAN-004 R2-STA: «Sono stanco» non ha una scelta d'intensità; alleggerisce il giorno (ST-QA-FIX-020).
  await c.prova("«Sono stanco»: «Prepara la proposta» sul giorno indicato", async () => {
    await apriScheda(f, "stanchezza", "Sono stanco");
    await pagina.getByLabel("Quando", { exact: true }).fill("2026-06-13");
    dump("TB-IMPR-006a", await preparaProposta(f));
  });
  await c.prova("La prima proposta alleggerisce il giorno indicato (o dice che è già leggero)", async () => {
    expect(await testo(pagina)).toMatch(/13 giugno/);
    expect(await pagina.locator("[data-modifica][data-tipo=\"aggiunto\"]").count(), "la stanchezza non aggiunge attività").toBe(0);
  });
  await c.prova("«Non sto bene»: «Solo riposo» e preparo la proposta", async () => {
    await apriScheda(f, "salute", "Non sto bene / mi sono fatto male");
    await pagina.getByLabel("Da quando").fill("2026-06-13");
    await pagina.getByLabel("Per quanti giorni").fill("1");
    await pagina.getByLabel("Che cosa riesci a fare").selectOption({ label: "Solo riposo" });
    dump("TB-IMPR-006b", await preparaProposta(f));
  });
  await c.prova("La seconda proposta toglie le attività del giorno", async () => {
    const tolte = await pagina.locator('[data-modifica][data-tipo="rimosso"]').count();
    expect(tolte, "nessuna attività tolta").toBeGreaterThan(0);
    expect(await pagina.locator('[data-modifica][data-tipo="aggiunto"]').count(), "il giorno di riposo non deve avere attività nuove").toBe(0);
  });
  await c.prova("… e lo spiega in «Spiegazione»", async () => {
    await pagina.getByRole("heading", { name: "Spiegazione" }).waitFor({ timeout: 2000 });
  });
  c.chiudi();
});

flusso("TB-IMPR-007 Voglio restare di più / tornare prima", async (f) => {
  const { pagina } = f;
  const c = new Controlli(f);
  await c.prova("«Voglio restare di più»: un giorno in più dopo il 14 giugno", async () => {
    await apriScheda(f, "restare", "Voglio restare di più");
    await pagina.getByLabel("Quanti giorni in più").fill("1");
    await pagina.getByLabel("Dopo il giorno").fill("2026-06-14");
    dump("TB-IMPR-007a", await preparaProposta(f));
  });
  await c.prova("La prima aggiunge giorni dopo l'ultimo e «Cosa cambia» li elenca", async () => {
    const cambi = await righe(pagina, "[data-modifica]");
    expect(cambi.length, "«Cosa cambia» non elenca nulla").toBeGreaterThan(0);
    expect(cambi.join(" ")).toMatch(/15 giugno|2026-06-15/);
  });
  await c.prova("L'alloggio della notte cambiata è segnalato (prolungamento)", async () => {
    expect(await testo(pagina), "nessun accenno all'alloggio o alla notte").toMatch(/alloggi|notte|pernott/i);
  });
  await c.prova("«Voglio tornare prima»: un giorno in meno", async () => {
    await apriScheda(f, "tornare-prima", "Voglio tornare prima");
    await pagina.getByLabel("Quanti giorni in meno").fill("1");
    dump("TB-IMPR-007b", await preparaProposta(f));
  });
  await c.prova("La seconda toglie i giorni dalla fine e «Cosa cambia» li elenca", async () => {
    const cambi = await righe(pagina, "[data-modifica]");
    expect(cambi.length, "«Cosa cambia» non elenca nulla").toBeGreaterThan(0);
    const ids = await pagina.locator("[data-modifica]").evaluateAll((els) => els.map((e) => e.getAttribute("data-modifica") ?? ""));
    expect(ids.every((i) => i.startsWith("D3-")), `elementi toccati: ${ids.join(", ")}`).toBe(true);
    expect(await pagina.locator('[data-modifica][data-tipo="aggiunto"]').count()).toBe(0);
  });
  await c.prova("L'alloggio della notte cambiata è segnalato (accorciamento)", async () => {
    expect(await testo(pagina), "nessun accenno all'alloggio o alla notte").toMatch(/alloggi|notte|pernott/i);
  });
  c.chiudi();
});

flusso("TB-IMPR-008 Imprevisti solo informativi", async (f) => {
  const { pagina } = f;
  const c = new Controlli(f);
  const INFO = "È solo un'informazione: non c'è nessuna modifica da accettare e l'itinerario resta com'è.";
  for (const [id, titolo] of [
    ["bagaglio", "Bagaglio smarrito"],
    ["documenti", "Documenti persi o rubati"],
    ["sciopero", "Sciopero"],
  ] as const) {
    await c.prova(`«${titolo}»: se non c'è nulla da cambiare dice che è solo un'informazione e non offre «Accetta»`, async () => {
      await apriScheda(f, id, titolo);
      const vista = await preparaProposta(f);
      dump(`TB-IMPR-008-${id}`, vista);
      const nessunaModifica = (await pagina.locator("[data-modifica]").count()) === 0;
      if (nessunaModifica) {
        const accetta = await pagina.getByRole("button", { name: "Accetta" }).count();
        const esito = await pagina.locator("[data-esito]").getAttribute("data-esito");
        expect(vista, `nessuna frase «solo un'informazione» (esito ${esito}, pulsante «Accetta» ${accetta === 0 ? "assente" : "presente"})`).toContain(INFO);
        expect(accetta).toBe(0);
      } else {
        // Se la proposta cambia qualcosa il caso non è «solo informativo»: lo segnaliamo come differenza dall'atteso.
        throw new Error(`la proposta modifica l'itinerario (${await pagina.locator("[data-modifica]").count()} modifiche) invece di essere solo un'informazione`);
      }
    });
  }
  c.chiudi();
});

// ---------------------------------------------------------------------------------------------------------------------

const DATI_009 = mkdtempSync(join(tmpdir(), "travelops-qa001c-impr009-"));
usaBaseDati(DATI_009, () => undefined);

flusso(
  "TB-IMPR-009 Modulo incompleto e stato non leggibile",
  async (f) => {
    const { pagina } = f;
    const c = new Controlli(f);
    await c.prova("Apro «Maltempo» e premo «Prepara la proposta» senza «Quando»: compare «Controlla il modulo»", async () => {
      await apriScheda(f, "maltempo", "Maltempo");
      await pagina.getByLabel("Quando", { exact: true }).fill("");
      await pagina.getByLabel("Dalle", { exact: true }).fill("11:30");
      await pagina.getByRole("button", { name: "Prepara la proposta" }).click();
      const apparso = await pagina.getByText("Controlla il modulo", { exact: true }).waitFor({ timeout: 3000 }).then(() => true, () => false);
      const invalido = await pagina.locator("#imprevisto-data").evaluate((e) => (e as HTMLInputElement).validity.valueMissing);
      expect(apparso, `«Controlla il modulo» non compare: ${invalido ? "il browser blocca l'invio con la sua validazione nativa («required») e il messaggio dell'app non si vede" : "nessun messaggio"}`).toBe(true);
    });
    await c.prova("(percorso del server) senza la validazione del browser: «Controlla il modulo» con il campo da sistemare e dati scritti che restano", async () => {
      await apriScheda(f, "maltempo", "Maltempo");
      await pagina.getByLabel("Quando", { exact: true }).fill("");
      await pagina.getByLabel("Dalle", { exact: true }).fill("11:30");
      await pagina.locator("form.imprevisti__modulo").evaluate((form) => ((form as HTMLFormElement).noValidate = true));
      await pagina.getByRole("button", { name: "Prepara la proposta" }).click();
      await pagina.getByText("Controlla il modulo", { exact: true }).waitFor();
      expect(await testo(pagina)).toContain("Quando");
      expect(await pagina.getByLabel("Dalle", { exact: true }).inputValue(), "il dato scritto («Dalle» 11:30) non è rimasto").toBe("11:30");
    });
    await c.prova("«Annulla» chiude la scheda senza proposte", async () => {
      await apriScheda(f, "maltempo", "Maltempo");
      await pagina.getByRole("link", { name: "Annulla" }).click();
      await pagina.waitForURL(/\/imprevisti$/);
      expect(await pagina.locator("form.imprevisti__modulo").count()).toBe(0);
      await pagina.goto(`${f.url}/demo`);
      expect(await testo(pagina)).not.toMatch(/In attesa di decisione/);
      expect(await pagina.locator("dt", { hasText: "Proposta" }).count(), "è stata creata una proposta").toBe(0);
    });
    await c.prova("Con lo stato salvato non valido, /imprevisti dice che lo stato non è leggibile", async () => {
      usaBaseDati(DATI_009, (db) => scriviImpostazione(db, "presentazione", 42));
      await pagina.goto(`${f.url}/imprevisti`);
      await pagina.locator("section.errori").waitFor();
      expect(await testo(pagina)).toContain("Lo stato del viaggio non è leggibile: apri la modalità presentazione e usa «Ripristina».");
    });
    c.chiudi();
  },
  { TRAVELOPS_DATI: DATI_009 },
);

// ---------------------------------------------------------------------------------------------------------------------

flusso("TB-IMPR-012 Elementi a rischio e alternative come link", async (f) => {
  const { pagina } = f;
  const ctx = f.pagina.context();
  const c = new Controlli(f);
  const esterne: string[] = [];
  const origine = new URL(f.url).origin;
  await ctx.route("**/*", (rotta) => {
    const u = rotta.request().url();
    if (u.startsWith(origine)) return rotta.continue();
    esterne.push(u);
    return rotta.fulfill({ status: 200, contentType: "text/html", body: "<html><body>esterno</body></html>" });
  });
  await c.prova("In /demo avvio «Volo cancellato»", async () => {
    await avviaScenario(f, "Volo cancellato");
    dump("TB-IMPR-012", await testo(pagina));
  });
  await c.prova("Leggo «Elementi a rischio» e «Alternative»: sono elencati", async () => {
    await pagina.getByRole("heading", { name: "Elementi a rischio", level: 2 }).waitFor();
    expect(await pagina.locator("[data-a-rischio]").count(), "nessun elemento a rischio elencato").toBeGreaterThan(0);
    await pagina.getByRole("heading", { name: "Alternative", level: 2 }).waitFor();
    expect(await pagina.locator("[data-alternativa]").count(), "nessuna alternativa elencata").toBeGreaterThan(0);
  });
  await c.prova("«Mostra i dettagli» si apre", async () => {
    await pagina.getByText("Mostra i dettagli").click();
    await pagina.locator("[data-spiegazione]").waitFor({ state: "visible" });
  });
  await c.prova("Le alternative sono link esterni in nuova scheda, aperti solo al clic", async () => {
    const link = pagina.locator("[data-alternativa] a[href]");
    const n = await link.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      expect(await link.nth(i).getAttribute("target")).toBe("_blank");
      expect(await link.nth(i).getAttribute("href")).toMatch(/^https?:\/\//);
    }
    expect(ctx.pages().length, "si è aperta una scheda senza clic").toBe(1);
    expect(esterne, "richieste esterne prima del clic").toEqual([]);
    const href = (await link.first().getAttribute("href")) ?? "";
    const [nuova] = await Promise.all([ctx.waitForEvent("page"), link.first().click()]);
    await nuova.waitForLoadState("domcontentloaded").catch(() => undefined);
    expect(nuova.url()).toBe(href);
    expect(ctx.pages().length).toBe(2);
  });
  await c.prova("Nessuna prenotazione o pagamento viene avviato", async () => {
    // L'unica richiesta esterna è quella del clic; la proposta resta in attesa e l'itinerario non cambia.
    expect(esterne.length).toBe(1);
    const v = await versioniAttuali(f);
    expect(v).not.toContain("Versione 2");
    expect(await testo(pagina)).not.toMatch(/pagament|carta di credito|prenotazione confermata/i);
  });
  c.chiudi();
});

// ---------------------------------------------------------------------------------------------------------------------

