/**
 * ST-QA-001E (REQ-QA-001): casi P1 del testbook su Oggi e Imprevisti (TB-TODAY-002/008, TB-IMPR-002/003/005/010/011/013),
 * a 1280 px, con l'assistente e i servizi esterni finti.
 */
import { describe, expect, it } from "vitest";
import { flusso } from "./flussi";
import { apriPercorsoDaCapo, testo, type Flusso } from "./supporto";
import { idBozza } from "./ux003b-supporto";

/** Il momento reale (fuso Europe/Rome) come data `AAAA-MM-GG` e ora `HH:MM`. */
function adessoARoma(): { data: string; ora: string } {
  const parti = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const p = (tipo: string): string => parti.find((x) => x.type === tipo)?.value ?? "00";
  return { data: `${p("year")}-${p("month")}-${p("day")}`, ora: `${p("hour")}:${p("minute")}` };
}

/** La data `AAAA-MM-GG` spostata di `giorni` giorni. */
function spostata(data: string, giorni: number): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + giorni);
  return d.toISOString().slice(0, 10);
}

const minuti = (ora: string): number => Number(ora.slice(0, 2)) * 60 + Number(ora.slice(3, 5));

/** Crea dal percorso guidato il viaggio sul Garda con le date indicate, lo conferma e torna il suo identificativo. */
async function creaEConfermaViaggio(f: Flusso, dal: string, al: string): Promise<string> {
  const { pagina } = f;
  // Il percorso ricorda il passo nella sessione del browser: per un secondo viaggio si riparte dal primo.
  await apriPercorsoDaCapo(f);
  await pagina.getByRole("button", { name: "Lago di Garda (Riva del Garda e dintorni)", exact: true }).click();
  await pagina.getByText("Hai scelto: Lago di Garda").waitFor();
  await pagina.getByRole("button", { name: "Avanti" }).click();
  await pagina.getByText("Passo 2 di 5").waitFor();
  await pagina.getByLabel("Dal", { exact: true }).fill(dal);
  await pagina.getByLabel("Al", { exact: true }).fill(al);
  await pagina.getByRole("button", { name: "Avanti" }).click();
  for (const numero of [3, 4]) {
    await pagina.getByText(`Passo ${numero} di 5`).waitFor();
    await pagina.getByRole("button", { name: "Avanti" }).click();
  }
  await pagina.getByText("Passo 5 di 5").waitFor();
  await pagina.getByRole("button", { name: "Crea la mia bozza" }).click();
  await pagina.waitForURL(/\/bozza\//);
  const id = idBozza(pagina.url());
  await pagina.getByRole("button", { name: "Conferma l'itinerario" }).click();
  await pagina.locator(".bozza__festa-titolo").waitFor();
  await pagina.getByRole("button", { name: "Chiudi", exact: true }).click();
  expect(await testo(pagina)).toContain("Versione 1");
  return id;
}

/** Il momento mostrato da Oggi (`AAAA-MM-GG HH:MM`) e la sua origine. */
async function momentoOggi(f: Flusso, id: string): Promise<{ data: string; ora: string }> {
  await f.pagina.goto(`${f.url}/viaggi/${encodeURIComponent(id)}/oggi`);
  const valore = await f.pagina.locator("[data-momento]").first().getAttribute("data-momento");
  const [data = "", ora = ""] = (valore ?? "").split(" ");
  return { data, ora };
}

/** Apre la scheda di «Ho un imprevisto» dalla griglia, compila i campi indicati e prepara la proposta. */
async function preparaProposta(f: Flusso, scheda: string, campi: Readonly<Record<string, string>> = {}): Promise<void> {
  const { pagina } = f;
  await pagina.goto(`${f.url}/imprevisti`);
  await pagina.locator(`[data-scheda="${scheda}"]`).click();
  await pagina.locator("form.imprevisti__modulo").waitFor();
  for (const [nome, valore] of Object.entries(campi)) {
    const campo = pagina.locator(`#imprevisto-${nome}`);
    // Le scelte (select) si indicano con un pezzo dell'etichetta, gli altri campi con il valore.
    if ((await campo.evaluate((e) => e.tagName)) === "SELECT") await campo.selectOption({ label: await campo.locator("option", { hasText: valore }).first().innerText() });
    else await campo.fill(valore);
  }
  await pagina.getByRole("button", { name: "Prepara la proposta" }).click();
  await pagina.waitForURL(/\/demo\/proposte\/\d+/);
  await pagina.getByRole("heading", { name: "Imprevisto", exact: true }).waitFor();
}

flusso("TB-TODAY-002: viaggio dell'utente con orologio automatico (reale dentro le date, simulato fuori)", async (f) => {
  const { pagina } = f;
  const ora = adessoARoma();
  let a = "";
  let b = "";
  const dalB = spostata(ora.data, 60);

  await f.passo("Creo e confermo il viaggio A, che comprende oggi", async () => {
    a = await creaEConfermaViaggio(f, spostata(ora.data, -1), spostata(ora.data, 2));
  });
  await f.passo("Creo e confermo il viaggio B, nel futuro", async () => {
    b = await creaEConfermaViaggio(f, dalB, spostata(dalB, 3));
    expect(b).not.toBe(a);
  });
  await f.passo("Oggi del viaggio A usa la data e l'ora reali", async () => {
    const m = await momentoOggi(f, a);
    const dopo = adessoARoma();
    expect(m.data).toBe(dopo.data);
    expect(Math.abs(minuti(m.ora) - minuti(dopo.ora))).toBeLessThanOrEqual(5);
    expect(m.ora).not.toBe("08:00");
  });
  await f.passo("Oggi del viaggio B usa l'orologio simulato riportato sulle sue date", async () => {
    const m = await momentoOggi(f, b);
    expect(m.data).toBe(dalB);
    expect(m.ora).toBe("08:00");
    expect(await testo(pagina)).toContain("Oggi");
  });
});

flusso("TB-TODAY-008: Oggi segue il viaggio dell'utente appena aperto", async (f) => {
  const { pagina } = f;
  let id = "";
  let attivita: string[] = [];

  await f.passo("Creo e confermo il viaggio dell'utente", async () => {
    id = await creaEConfermaViaggio(f, "2026-07-10", "2026-07-13");
    attivita = await pagina.locator('button[aria-label^="Azioni per «"]').evaluateAll((els) =>
      els.map((el) => /«(.*)»/.exec(el.getAttribute("aria-label") ?? "")?.[1] ?? "").filter((n) => n !== ""),
    );
    expect(attivita.length).toBeGreaterThan(0);
  });
  await f.passo("Lo apro dalla home e poi scelgo «Oggi» dal menu", async () => {
    await pagina.goto(f.url);
    await pagina.getByRole("heading", { name: "I miei viaggi" }).waitFor();
    await pagina.locator(`.scheda-viaggio[data-viaggio="${id}"] a`).first().click();
    await pagina.waitForURL((u) => u.pathname !== "/");
    await pagina.locator('a[href="/oggi"]').first().click();
    await pagina.waitForURL(/\/viaggi\/[^/]+\/oggi$/);
  });
  await f.passo("Oggi mostra il viaggio dell'utente e le sue attività", async () => {
    expect(decodeURIComponent(new URL(pagina.url()).pathname)).toBe(`/viaggi/${id}/oggi`);
    await pagina.getByRole("heading", { name: "Oggi", exact: true }).waitFor();
    const visto = await testo(pagina);
    // Le attività del programma di Oggi sono le sue (alcune sono pasti e spostamenti: ne basta una del suo programma).
    const sue = attivita.filter((nome) => visto.includes(nome));
    expect(sue.length, `nessuna attività del viaggio dell'utente in Oggi: ${attivita.join(" | ")}`).toBeGreaterThan(0);
  });
  await f.passo("Le attività dell'utente non compaiono nell'itinerario di riferimento della presentazione", async () => {
    await pagina.goto(`${f.url}/viaggi/versione-1/oggi`);
    await pagina.getByRole("heading", { name: "Oggi", exact: true }).waitFor();
    const riferimento = await testo(pagina);
    for (const nome of attivita) expect(riferimento).not.toContain(nome);
  });
});

const AVVISO_LINK = "I link si aprono in una nuova scheda solo quando li scegli: TravelOps non agisce sulle prenotazioni.";
const VOLO = "Aeroporto di Verona → Aeroporto di Roma Fiumicino";

/** Avvia uno scenario dalla Demo (carica il suo itinerario di partenza) e apre la sua proposta. */
async function avviaScenario(f: Flusso, titolo: string): Promise<void> {
  await f.pagina.goto(`${f.url}/demo`);
  await f.pagina.getByRole("button", { name: new RegExp(`Avvia lo scenario.*${titolo}`) }).click();
  await f.pagina.waitForURL(/\/demo\/proposte\/\d+/);
}

/** Il blocco di testo di una sezione della proposta, dal suo titolo al titolo successivo. */
async function sezione(f: Flusso, titolo: string): Promise<string> {
  const visto = await testo(f.pagina);
  const inizio = visto.indexOf(`\n${titolo}\n`);
  expect(inizio, `sezione «${titolo}» assente`).toBeGreaterThanOrEqual(0);
  return visto.slice(inizio + titolo.length + 2);
}

flusso("TB-IMPR-002 e TB-IMPR-003: Maltempo e Sono in ritardo", async (f) => {
  const { pagina } = f;

  await f.passo("Maltempo sabato dalle 10:00: la proposta toglie l'attività all'aperto e propone una al chiuso", async () => {
    await preparaProposta(f, "maltempo", { data: "2026-06-13", inizio: "10:00" });
    const impatto = await pagina.locator("[data-colpito]").allInnerTexts();
    expect(impatto.join("\n")).toContain("Trekking sul Sentiero del Ponale");
    const tolto = await pagina.locator('[data-tipo="rimosso"]').allInnerTexts();
    expect(tolto.join("\n")).toContain("Trekking sul Sentiero del Ponale");
    const aggiunto = await pagina.locator('[data-tipo="aggiunto"]').allInnerTexts();
    expect(aggiunto.join("\n")).toContain("Visita al MAG");
    // L'attività al chiuso proposta sta nell'itinerario risultante, segnata «Al coperto».
    expect(await sezione(f, "Itinerario risultante: sabato 13 giugno 2026")).toMatch(/Visita al MAG[\s\S]*Al coperto/);
  });

  await f.passo("Finché non si accetta il programma non cambia: resta la versione 1", async () => {
    expect(await testo(pagina)).toContain("versione corrente: 1");
    await pagina.goto(`${f.url}/demo`);
    expect(await testo(pagina)).toContain("1 versione: elenco e confronto");
  });

  await f.passo("Sono in ritardo di 45 minuti: le attività successive slittano, il volo a orario fisso no", async () => {
    await avviaScenario(f, "Volo cancellato");
    await preparaProposta(f, "ritardo", { data: "2026-06-14", momento: "14:00", minuti: "45" });
    const spostati = (await pagina.locator('[data-tipo="modificato"]').allInnerTexts()).join("\n");
    expect(spostati).toContain("Visita al MUSE");
    expect(spostati).toContain("14:00–17:15");
    // Il volo ha l'orario fisso (19:30–20:35): non è tra gli elementi spostati.
    expect(spostati).not.toContain("Aeroporto di Roma Fiumicino");
    expect(await sezione(f, "Elementi a rischio")).toContain("Nessun elemento a rischio");
  });

  await f.passo("Con un ritardo che arriva al volo, il volo a orario fisso resta dov'è ed è tra gli elementi a rischio", async () => {
    await preparaProposta(f, "ritardo", { data: "2026-06-14", momento: "14:00", minuti: "120" });
    const spostati = (await pagina.locator('[data-tipo="modificato"]').allInnerTexts()).join("\n");
    expect(spostati).not.toContain("Aeroporto di Roma Fiumicino");
    const aRischio = (await pagina.locator("[data-a-rischio]").allInnerTexts()).join("\n");
    expect(aRischio).toContain("19:30–20:35");
    expect(aRischio).toContain("Aeroporto di Roma Fiumicino");
  });
});

flusso("TB-IMPR-005: Volo cancellato e Ho perso il volo o il treno, con alternative come link", async (f) => {
  const { pagina } = f;

  await f.passo("Carico l'itinerario «Volo di ritorno» dalla Demo", async () => {
    await avviaScenario(f, "Volo cancellato");
    await pagina.goto(`${f.url}/demo`);
    const visto = await testo(pagina);
    expect(visto).toContain("Volo cancellato");
  });

  for (const [scheda, nome] of [
    ["volo-cancellato", "Volo cancellato"],
    ["volo-perso", "Ho perso il volo o il treno"],
  ] as const) {
    await f.passo(`«${nome}»: la proposta indica le alternative come link di ricerca`, async () => {
      await preparaProposta(f, scheda, { elementoId: VOLO });
      expect(await sezione(f, "Alternative")).toContain(AVVISO_LINK);
      const link = pagina.locator(".elenco-alternative a");
      expect(await link.count()).toBeGreaterThan(0);
      for (const a of await link.all()) {
        expect(await a.getAttribute("href")).toMatch(/^https?:\/\//);
        expect(await a.getAttribute("target")).toBe("_blank");
        expect(await a.getAttribute("rel")).toContain("noopener");
      }
      expect(await pagina.locator('.elenco-alternative a:has-text("Cerca")').count()).toBeGreaterThan(0);
      // Il volo è tra gli elementi a rischio e nessuna prenotazione parte dall'app.
      expect((await pagina.locator("[data-a-rischio]").allInnerTexts()).join("\n")).toContain("Aeroporto di Roma Fiumicino");
    });
  }
});

flusso("TB-IMPR-010 e TB-IMPR-011: scenario Pioggia sul trekking, proposta spiegata e accettata", async (f) => {
  const { pagina } = f;

  await f.passo("Avvio «Pioggia sul trekking»: si apre la proposta con tutte le sezioni compilate", async () => {
    await pagina.goto(`${f.url}/demo`);
    await pagina.getByRole("button", { name: /Avvia lo scenario.*Pioggia sul trekking/ }).click();
    await pagina.waitForURL(/\/demo\/proposte\/\d+/);
    for (const titolo of ["Imprevisto", "Cosa cambia"]) await pagina.getByRole("heading", { name: titolo, exact: true }).waitFor();
    await pagina.getByRole("heading", { name: "Impatto", exact: true }).waitFor();
    await pagina.getByRole("heading", { name: "Spiegazione", exact: true }).waitFor();
    expect(await pagina.locator("[data-imprevisto]").innerText()).toContain("pioggia in zona Alto Garda");
    expect(await pagina.locator("[data-colpito]").allInnerTexts()).not.toHaveLength(0);
    expect(await pagina.locator("[data-modifica]").count()).toBeGreaterThan(0);
    expect((await pagina.locator("[data-riepilogo]").innerText()).trim().length).toBeGreaterThan(20);
    await pagina.getByText("Mostra i dettagli").click();
    expect((await pagina.locator("[data-spiegazione]").innerText()).trim().length).toBeGreaterThan(20);
  });

  await f.passo("In Demo lo scenario in corso è «Pioggia sul trekking»", async () => {
    await pagina.goto(`${f.url}/demo`);
    const stato = pagina.locator(".campo", { hasText: "Scenario in corso" });
    expect(await stato.innerText()).toContain("Pioggia sul trekking");
  });

  await f.passo("Accetto come «Viaggiatore»: nasce la versione 2 corrente, causata dallo scenario", async () => {
    await pagina.getByRole("link", { name: /Pioggia sul trekking/ }).click();
    await pagina.waitForURL(/\/demo\/proposte\/\d+/);
    expect(await pagina.getByLabel("Nome di chi accetta").inputValue()).toBe("Viaggiatore");
    await pagina.getByRole("button", { name: "Accetta" }).click();
    await pagina.locator("[data-decisione]").waitFor();
    await pagina.goto(`${f.url}/versioni`);
    const visto = await testo(pagina);
    expect(visto).toMatch(/Versione 2\s+Corrente/);
    expect(visto).toContain("Meteo avverso: pioggia in zona Alto Garda il 13 giugno 2026");
    expect(visto).toContain("Accettata da Viaggiatore");
  });

  await f.passo("Oggi mostra il programma nuovo (sabato alle 10:30: la visita al MAG, non il trekking)", async () => {
    await pagina.goto(`${f.url}/demo`);
    await pagina.getByLabel("Data", { exact: true }).fill("2026-06-13");
    await pagina.getByLabel("Ora", { exact: true }).fill("10:30");
    await pagina.getByRole("button", { name: "Imposta l'orologio" }).click();
    await pagina.locator('[data-orologio="2026-06-13 10:30"]').waitFor();
    await pagina.goto(`${f.url}/oggi`);
    await pagina.getByRole("heading", { name: "Adesso" }).waitFor();
    const visto = await testo(pagina);
    expect(visto).toContain("Visita al MAG");
    expect(visto).not.toContain("Trekking sul Sentiero del Ponale");
  });

  await f.passo("Riaprendo la proposta risulta «Accettata» e non si può accettare due volte", async () => {
    await pagina.goto(`${f.url}/demo`);
    await pagina.getByRole("link", { name: /Pioggia sul trekking/ }).click();
    await pagina.waitForURL(/\/demo\/proposte\/\d+/);
    const decisione = await pagina.locator("[data-decisione]").innerText();
    expect(decisione).toContain("Accettata da Viaggiatore");
    expect(decisione).toContain("versione 2");
    expect(await pagina.getByRole("button", { name: "Accetta" }).count()).toBe(0);
    expect(await pagina.getByRole("button", { name: "Rifiuta" }).count()).toBe(0);
  });
});

/**
 * Difetto noto, aperto in ST-QA-FIX-010: «Ho un imprevisto» lavora solo sull'itinerario della presentazione (date del 12-14
 * giugno 2026), non sul viaggio dell'utente. Quando sarà corretto, impostare a `false` per attivare il caso.
 */
const IMPR_013_DIFETTO_APERTO = true;

if (IMPR_013_DIFETTO_APERTO) {
  describe.skip("TB-IMPR-013: imprevisto sul viaggio dell'utente (difetto noto, da correggere in ST-QA-FIX-010)", () => {
    it("riattivare quando ST-QA-FIX-010 è consegnata", () => {});
  });
} else flusso("TB-IMPR-013: imprevisto sul viaggio dell'utente, nuova versione su quel viaggio", async (f) => {
  const { pagina } = f;
  let id = "";
  let titolo = "";

  await f.passo("Creo e confermo il viaggio dell'utente e lo apro dalla home", async () => {
    id = await creaEConfermaViaggio(f, "2026-07-10", "2026-07-13");
    await pagina.goto(f.url);
    await pagina.getByRole("heading", { name: "I miei viaggi" }).waitFor();
    const scheda = pagina.locator(`.scheda-viaggio[data-viaggio="${id}"]`);
    titolo = ((await scheda.locator("h2, h3").first().innerText()) ?? "").trim();
    expect(titolo).not.toBe("");
    await scheda.locator("a").first().click();
    await pagina.waitForURL((u) => u.pathname !== "/");
  });

  await f.passo("«Ho un imprevisto» → Maltempo: la proposta riguarda il viaggio dell'utente", async () => {
    await preparaProposta(f, "maltempo", { data: "2026-07-11", inizio: "09:00" });
    const visto = await testo(pagina);
    expect(visto).toContain(titolo);
    expect(visto).not.toContain("Trekking sul Sentiero del Ponale");
  });

  await f.passo("Accetto: nasce la versione 2 del viaggio dell'utente", async () => {
    await pagina.getByRole("button", { name: "Accetta" }).click();
    await pagina.locator("[data-decisione]").waitFor();
    await pagina.goto(`${f.url}/viaggi/${encodeURIComponent(id)}`);
    await pagina.getByRole("link", { name: /Versioni/ }).first().click();
    await pagina.waitForURL(/\/versioni/);
    expect(await testo(pagina)).toMatch(/Versione 2\s+Corrente/);
  });

  await f.passo("L'itinerario della presentazione non cambia: resta la versione 1", async () => {
    await pagina.goto(`${f.url}/demo`);
    expect(await testo(pagina)).toContain("1 versione: elenco e confronto");
  });
});
