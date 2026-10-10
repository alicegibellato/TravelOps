/**
 * ST-QA-001E (REQ-QA-001): casi P1 del testbook su computer (1280 px): TB-PREF-005 (senza chiave «Crea la mia bozza» non
 * resta bloccato), TB-CHAT-008 (destinazione non trovata) e TB-A11Y-001 (contenuto principale per i lettori di schermo).
 */
import { describe, expect, it } from "vitest";
import { flusso } from "./flussi";
import { creaBozzaDalPercorso, testo } from "./supporto";
import { idBozza } from "./ux003b-supporto";

const ATTESA_BOZZA_MS = 15_000;

flusso(
  "TB-PREF-005: senza chiave «Crea la mia bozza» non resta bloccato",
  async (f) => {
    const { pagina } = f;
    await f.passo("Percorso guidato fino al passo 5", async () => {
      await pagina.goto(`${f.url}/preferenze`);
      await pagina.getByText("Passo 1 di 5").waitFor();
      await pagina.getByRole("button", { name: "Lago di Garda (Riva del Garda e dintorni)" }).click();
      await pagina.getByRole("button", { name: "Avanti" }).click();
      await pagina.getByText("Passo 2 di 5").waitFor();
      await pagina.getByLabel("Dal", { exact: true }).fill("2026-07-10");
      await pagina.getByLabel("Al", { exact: true }).fill("2026-07-13");
      await pagina.getByRole("button", { name: "Avanti" }).click();
      for (const numero of [3, 4]) {
        await pagina.getByText(`Passo ${numero} di 5`).waitFor();
        await pagina.getByRole("button", { name: "Avanti" }).click();
      }
      await pagina.getByText("Passo 5 di 5").waitFor();
    });

    await f.passo("Premo «Crea la mia bozza»: entro 15 s si apre la bozza o c'è un messaggio con un'azione", async () => {
      await pagina.getByRole("button", { name: "Crea la mia bozza" }).click();
      // Entro 15 s: o si apre la bozza, o il pulsante torna utilizzabile con un messaggio.
      const aperta = await pagina.waitForURL(/\/bozza\//, { timeout: ATTESA_BOZZA_MS }).then(() => true, () => false);
      if (aperta) {
        await pagina.getByRole("button", { name: "Conferma l'itinerario" }).waitFor();
        return;
      }
      // Niente bozza: serve un messaggio chiaro e un'azione per proseguire (il pulsante torna utilizzabile).
      const visto = await testo(pagina);
      expect(visto).not.toContain("Preparo la bozza…");
      expect(visto).toMatch(/non (è|sono) (stat|riuscit)|non ho potuto|riprova|Mancano|Qualcosa non ha funzionato/i);
      await expect(pagina.getByRole("button", { name: "Crea la mia bozza" }).isEnabled()).resolves.toBe(true);
    });
  },
  { TRAVELOPS_ASSISTENTE: "" },
);

flusso("TB-CHAT-008: destinazione non trovata, nessun viaggio e profilo invariato", async (f) => {
  const { pagina } = f;
  const viaggiInHome = async (): Promise<string> => {
    await pagina.goto(f.url);
    await pagina.getByRole("heading", { name: "I miei viaggi" }).waitFor();
    return pagina.locator("section.home__viaggi").innerText();
  };
  const profilo = async (): Promise<string> => {
    await pagina.goto(`${f.url}/preferenze`);
    await pagina.getByText("Passo 1 di 5").waitFor();
    // Il riepilogo calcola «Cosa manca» dopo il caricamento: lo si attende prima di leggere il profilo.
    await pagina.getByText("Cosa manca").waitFor();
    return (await testo(pagina)).replace(/\s+/g, " ");
  };

  const viaggiPrima = await f.passo("Annoto i viaggi e il profilo di partenza", viaggiInHome);
  const profiloPrima = await profilo();

  await f.passo("In /pianifica scrivo la richiesta per Manila", async () => {
    await pagina.goto(`${f.url}/pianifica`);
    await pagina.getByText("Raccontami il viaggio che hai in mente").first().waitFor();
    await pagina.getByPlaceholder("Scrivi qui…").fill("Voglio 4 giorni a Manila a luglio");
    await pagina.getByRole("button", { name: "Invia" }).click();
    await pagina.getByText("Voglio 4 giorni a Manila a luglio", { exact: true }).first().waitFor();
  });

  await f.passo("La chat chiede di precisare la destinazione o ne propone", async () => {
    await pagina.getByText(/Dimmi qualcosa in più sul viaggio|destinazion|dove/i).last().waitFor();
    const visto = await testo(pagina);
    expect(visto).not.toMatch(/Qualcosa non ha funzionato/i);
  });

  await f.passo("Nessun viaggio nuovo in «I miei viaggi»", async () => {
    expect(await viaggiInHome()).toBe(viaggiPrima);
  });

  await f.passo("Il profilo delle preferenze è invariato", async () => {
    expect(await profilo()).toBe(profiloPrima);
  });
});

flusso("TB-A11Y-001: <main> con titolo h1 e contenuti, senza «Caricamento»", async (f) => {
  const { pagina } = f;
  await creaBozzaDalPercorso(f);
  const viaggio = idBozza(pagina.url());

  const pagine: ReadonlyArray<readonly [string, string]> = [
    ["home", "/"],
    ["bozza", `/bozza/${encodeURIComponent(viaggio)}`],
    ["Oggi", "/oggi"],
    ["Versioni", "/versioni"],
  ];
  for (const [nome, percorso] of pagine) {
    await f.passo(`Pagina ${nome}: <main> ha un h1 e contenuti, niente «Caricamento»`, async () => {
      await pagina.goto(`${f.url}${percorso}`);
      const principale = pagina.getByRole("main");
      await principale.getByRole("heading", { level: 1 }).first().waitFor();
      await expect.poll(() => principale.getByText(/Caricamento/).count(), { timeout: 10_000 }).toBe(0);
      expect(await principale.locator('[aria-label="Caricamento"]').count()).toBe(0);
      const titolo = (await principale.getByRole("heading", { level: 1 }).first().innerText()).trim();
      expect(titolo).not.toBe("");
      const contenuto = (await principale.innerText()).replace(titolo, "").trim();
      expect(contenuto.length).toBeGreaterThan(20);
    });
  }
});

// Casi P1 che richiedono servizi reali (modello vero, rete esterna): non automatizzabili qui, girano su PC1 con le chiavi.
describe.skip("TB-CHAT-007: conversazione completa con il modello vero (richiede OPENAI_API_KEY, solo PC1; risposte non deterministiche e a pagamento)", () => {
  it("collaudo manuale su PC1", () => {});
});
describe.skip("TB-CHAT-009: preparazione della destinazione fallita (richiede il servizio reale fuori uso, non simulabile con gli adattatori finti)", () => {
  it("collaudo manuale su PC1", () => {});
});
describe.skip("TB-CHAT-010 / TB-REAL-003: destinazione vera non ancora pronta o non raggiungibile (richiede TRAVELOPS_GEOCODING=reale e rete esterna, solo PC1)", () => {
  it("collaudo manuale su PC1", () => {});
});
