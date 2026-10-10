/** QA-001C: testbook gruppo C, casi TB-TRIP-001..006 (viaggi) e TB-VER-001..005 (versioni). Solo desktop 1280 px. */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect } from "vitest";
import { elencaViaggi, eliminaViaggio, leggiProfilo, salvaProfilo, salvaViaggio } from "../src/basedati";
import { usaBaseDati } from "../src/stato/avvio";
import { flussoCaso as flusso } from "./qa001c-difetti";
import { attendiMappe, creaBozzaDalPercorso, testo, type Flusso } from "./supporto";
import { idBozza } from "./ux003b-supporto";

const GARDA = "Quattro giorni sul Lago di Garda";
const DOLOMITI = "Cinque giorni sulle Dolomiti";
const ROMA = "Tre giorni a Roma con i bambini";

/** Conferma la bozza aperta e chiude la festa. */
async function conferma(f: Flusso): Promise<void> {
  const { pagina } = f;
  await f.passo("Confermo l'itinerario", async () => {
    await pagina.getByRole("button", { name: "Conferma l'itinerario" }).click();
    await pagina.locator(".bozza__festa-titolo").waitFor();
    await pagina.getByRole("button", { name: "Chiudi", exact: true }).click();
    await pagina.getByText("Versione 1").first().waitFor();
  });
}

/** Chiede «Giornata più leggera» sul primo giorno: nasce una proposta in attesa. */
async function chiediModifica(f: Flusso): Promise<void> {
  const { pagina } = f;
  await f.passo("«Proponi una modifica» → «Giornata più leggera»", async () => {
    await pagina.getByRole("button", { name: /^Proponi una modifica/ }).first().click();
    await pagina.getByRole("menuitem", { name: "Giornata più leggera", exact: true }).click();
    await pagina.getByRole("region", { name: "Proposte di modifica" }).getByRole("button", { name: "Accetta" }).first().waitFor();
  });
}

const accettaPrima = async (f: Flusso): Promise<void> => {
  const { pagina } = f;
  await f.passo("Premo «Accetta»", async () => {
    await pagina.getByRole("region", { name: "Proposte di modifica" }).getByRole("button", { name: "Accetta" }).first().click();
    await pagina.getByText("Proposta accettata").first().waitFor();
    const stato = await pagina.locator("main").innerText();
    await pagina.getByText("Accettata", { exact: true }).first().waitFor();
  });
};

/** La scheda della home con quel titolo (parte del titolo). */
const scheda = (f: Flusso, titolo: string) => f.pagina.locator("li.scheda-viaggio", { hasText: titolo });

flusso("TB-TRIP-003 Viaggi demo e viaggi dell'utente distinti", async (f) => {
  const { pagina } = f;
  await creaBozzaDalPercorso(f);
  const viaggio = idBozza(pagina.url());
  await conferma(f);

  await f.passo("In home i viaggi dell'utente sono riconoscibili rispetto ai demo", async () => {
    await pagina.goto(`${f.url}/`);
    const mio = await pagina.locator(`[data-viaggio="${viaggio}"]`).innerText();
    const tutte = await pagina.locator("li.scheda-viaggio").allInnerTexts();
    expect(tutte.length).toBeGreaterThan(1);
    expect(mio).toMatch(/tuo|tua/i);
    for (const titolo of [GARDA, DOLOMITI, ROMA]) {
      const d = tutte.find((x) => x.includes(titolo));
      expect(d).toBeDefined();
      expect(d).not.toMatch(/Il tuo itinerario|La tua bozza/);
    }
  });
});

const DATI_VUOTI = mkdtempSync(join(tmpdir(), "travelops-qa001c-vuoto-"));
usaBaseDati(DATI_VUOTI, (db) => {
  for (const v of elencaViaggi(db)) eliminaViaggio(db, v.id);
});
flusso(
  "TB-TRIP-004 Home senza viaggi",
  async (f) => {
    const { pagina } = f;
    await f.passo("Apro la home senza viaggi", async () => {
      await pagina.goto(`${f.url}/`);
      await pagina.getByRole("heading", { name: "Non hai ancora viaggi" }).waitFor();
      const t = await testo(pagina);
      expect(t).toContain("Quando pianificherai un viaggio lo troverai qui, con le date e lo stato.");
      expect(await pagina.locator("li.scheda-viaggio").count()).toBe(0);
      const azione = pagina.getByRole("main").getByRole("button", { name: "Pianifica un viaggio" }).or(pagina.getByRole("main").getByRole("link", { name: "Pianifica un viaggio" }));
      expect(await azione.count()).toBeGreaterThan(0);
    });
  },
  { TRAVELOPS_DATI: DATI_VUOTI },
);

const DATI_BOZZA = mkdtempSync(join(tmpdir(), "travelops-qa001c-bozza-"));
const ID_BOZZA_UTENTE = "bozza-utente-qa";
usaBaseDati(DATI_BOZZA, (db) => {
  const roma = elencaViaggi(db).find((v) => v.titolo === ROMA);
  if (roma === undefined) throw new Error("manca la bozza demo di Roma");
  const riga = db.prepare<unknown[], Record<string, unknown>>("SELECT viaggio_json FROM revisioni_bozza WHERE viaggio_id = ? ORDER BY numero DESC").get(roma.id);
  if (riga === undefined) throw new Error("la bozza di Roma non ha revisioni");
  salvaViaggio(db, { ...roma, id: ID_BOZZA_UTENTE, titolo: "La mia bozza di prova", demo: false, ordine: 98 });
  salvaProfilo(db, ID_BOZZA_UTENTE, leggiProfilo(db, roma.id));
  db.prepare<unknown[], Record<string, unknown>>("INSERT INTO revisioni_bozza (viaggio_id, numero, causa, viaggio_json) VALUES (?, 1, ?, ?)").run(ID_BOZZA_UTENTE, "Bozza iniziale", String(riga.viaggio_json));
});

flusso("TB-TRIP-005 «Ripristina i viaggi demo» non tocca i viaggi dell'utente", async (f) => {
  const { pagina } = f;
  const scenarioInCorso = () => pagina.locator("dt", { hasText: "Scenario in corso" }).locator("xpath=following-sibling::dd[1]").innerText();
  await creaBozzaDalPercorso(f);
  const confermato = idBozza(pagina.url());
  await conferma(f);
  const bozza = ID_BOZZA_UTENTE;

  const foto = async (): Promise<{ home: string; bozza: string; confermato: string }> => {
    await pagina.goto(`${f.url}/`);
    const home = (await pagina.locator(`[data-viaggio="${bozza}"]`).innerText()) + "\n" + (await pagina.locator(`[data-viaggio="${confermato}"]`).innerText());
    await pagina.goto(`${f.url}/bozza/${encodeURIComponent(bozza)}`);
    await pagina.getByRole("button", { name: "Conferma l'itinerario" }).waitFor();
    await attendiMappe(pagina);
    const b = await pagina.locator("main").innerText();
    await pagina.goto(`${f.url}/viaggi/${encodeURIComponent(confermato)}`);
    await pagina.getByLabel("Giorni del viaggio").waitFor();
    await attendiMappe(pagina);
    const c = await pagina.locator("main").innerText();
    return { home, bozza: b, confermato: c };
  };

  const prima = await f.passo("Annoto titolo, stato e contenuto dei viaggi dell'utente", foto);

  await f.passo("Avvio uno scenario in /demo", async () => {
    await pagina.goto(`${f.url}/demo`);
    await pagina.locator("[data-scenario]").first().getByRole("button", { name: /^Avvia lo scenario/ }).click();
    await pagina.waitForURL(/\/demo/);
    await pagina.goto(`${f.url}/demo`);
    expect(await scenarioInCorso()).not.toBe("Nessuno");
  });

  await f.passo("«Ripristina i viaggi demo»: scenario «Nessuno»", async () => {
    await pagina.getByRole("button", { name: "Ripristina i viaggi demo" }).click();
    await pagina.waitForURL(/\/demo/);
    await pagina.goto(`${f.url}/demo`);
    expect(await scenarioInCorso()).toBe("Nessuno");
  });

  await f.passo("I viaggi dell'utente sono identici a prima", async () => {
    const dopo = await foto();
    expect(dopo.home).toBe(prima.home);
    expect(dopo.bozza).toBe(prima.bozza);
    expect(dopo.confermato).toBe(prima.confermato);
  });

  await f.passo("I viaggi demo hanno la sola prima versione", async () => {
    await pagina.goto(`${f.url}/versioni`);
    // «Versioni» porta alle versioni del viaggio scelto (QA-FIX-004B): titolo «Versioni di «…»».
    await pagina.getByRole("heading", { name: /^Versioni di «/, level: 1 }).waitFor();
    expect(await pagina.locator("[data-versione]").count()).toBe(1);
  });
}, { TRAVELOPS_DATI: DATI_BOZZA });

const DATI_NON_VALIDI = mkdtempSync(join(tmpdir(), "travelops-qa001c-invalido-"));
const ID_NON_VALIDO = "viaggio-non-valido";
usaBaseDati(DATI_NON_VALIDI, (db) => {
  const roma = elencaViaggi(db).find((v) => v.titolo === ROMA);
  if (roma === undefined) throw new Error("manca la bozza demo di Roma");
  const riga = db.prepare<unknown[], Record<string, unknown>>("SELECT viaggio_json FROM revisioni_bozza WHERE viaggio_id = ? ORDER BY numero DESC").get(roma.id);
  if (riga === undefined) throw new Error("la bozza di Roma non ha revisioni");
  const rotto = JSON.parse(String(riga.viaggio_json)) as Record<string, unknown>;
  rotto.dataInizio = "non-una-data";
  salvaViaggio(db, { ...roma, id: ID_NON_VALIDO, titolo: "Viaggio con dati rotti", demo: false, ordine: 99 });
  salvaProfilo(db, ID_NON_VALIDO, leggiProfilo(db, roma.id));
  db.prepare<unknown[], Record<string, unknown>>("INSERT INTO revisioni_bozza (viaggio_id, numero, causa, viaggio_json) VALUES (?, 1, ?, ?)").run(ID_NON_VALIDO, "Prima bozza", JSON.stringify(rotto));
});
flusso(
  "TB-TRIP-006 Viaggio con dati non validi",
  async (f) => {
    const { pagina } = f;
    await f.passo("Home: la card dice che i dati non sono validi, gli altri restano visibili", async () => {
      await pagina.goto(`${f.url}/`);
      const card = pagina.locator(`[data-viaggio="${ID_NON_VALIDO}"]`);
      await card.waitFor();
      expect(await card.innerText()).toContain("I dati di questo viaggio non sono validi: aprilo per vedere cosa correggere.");
      for (const titolo of [GARDA, DOLOMITI, ROMA]) expect(await scheda(f, titolo).count()).toBeGreaterThan(0);
    });
    await f.passo("«Apri»: la pagina spiega cosa correggere, senza errore generico", async () => {
      await pagina.locator(`[data-viaggio="${ID_NON_VALIDO}"]`).getByRole("link").first().click();
      await pagina.waitForLoadState("networkidle");
      const t = await testo(pagina);
      expect(t).toContain("I dati del viaggio non sono validi");
      expect(t).not.toMatch(/Qualcosa è andato storto|Pagina non trovata|Application error/i);
    });
  },
  { TRAVELOPS_DATI: DATI_NON_VALIDI },
);

flusso("TB-VER-004 Confronto senza differenze e numeri non validi", async (f) => {
  const { pagina } = f;
  await creaBozzaDalPercorso(f);
  await conferma(f);
  await chiediModifica(f);
  await accettaPrima(f);

  await f.passo("/versioni?a=1&b=1: «Nessuna differenza tra le due versioni.»", async () => {
    await pagina.goto(`${f.url}/versioni?a=1&b=1`);
    await pagina.getByText("Nessuna differenza tra le due versioni.").waitFor();
  });
  await f.passo("/versioni/999: «Pagina non trovata» con «Torna ai miei viaggi»", async () => {
    await pagina.goto(`${f.url}/versioni/999`);
    await pagina.getByText("Pagina non trovata").first().waitFor();
    await pagina.getByRole("link", { name: "Torna ai miei viaggi" }).waitFor();
  });
});

