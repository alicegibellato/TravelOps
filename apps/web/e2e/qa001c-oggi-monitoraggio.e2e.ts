/**
 * QA-001C: casi TB-TODAY-001..008 e TB-MON-001..003 del testbook di gruppo C (docs/testbook-c/oggi.md, monitoraggio.md),
 * scritti come flussi end-to-end a 1280 px. Ogni test verifica l'atteso del caso così com'è scritto.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect } from "vitest";
import { flussoCaso as flusso } from "./qa001c-difetti";
import { apriPercorsoDaCapo, avviaApp, CARTELLA_APP, testo, type Flusso } from "./supporto";
import { idBozza } from "./ux003b-supporto";

// --- aiuti ------------------------------------------------------------------------------------------------------

const FUSO = "Europe/Rome";

/** Data (AAAA-MM-GG) e ora (HH:MM) reali nel fuso di Roma, per un istante spostato di `giorni` giorni. */
function realeRoma(giorni = 0, istante = new Date()): { data: string; ora: string } {
  const d = new Date(istante.getTime() + giorni * 86_400_000);
  const parti = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const p = (t: string): string => parti.find((x) => x.type === t)?.value ?? "00";
  return { data: `${p("year")}-${p("month")}-${p("day")}`, ora: `${p("hour")}:${p("minute")}` };
}

/** Imposta l'orologio simulato della Demo. */
async function impostaOrologio(f: Flusso, data: string, ora: string): Promise<void> {
  const { pagina } = f;
  await pagina.goto(`${f.url}/demo`);
  const eroe = pagina.locator(".demo-eroe");
  await eroe.getByLabel("Data").fill(data);
  await eroe.getByLabel("Ora").fill(ora);
  await eroe.getByRole("button", { name: "Imposta l'orologio" }).click();
  await pagina.locator(`[data-orologio="${data} ${ora}"]`).waitFor();
}

/** Il momento mostrato in una pagina Oggi (`data-momento` del sottotitolo). */
async function momentoMostrato(f: Flusso): Promise<string> {
  const m = await f.pagina.locator("[data-momento]").first().getAttribute("data-momento");
  return m ?? "";
}

/** Crea una bozza dal percorso guidato (Garda) con le date indicate e la conferma; restituisce l'identificativo. */
async function creaViaggioConfermato(f: Flusso, dal: string, al: string): Promise<string> {
  const { pagina } = f;
  await apriPercorsoDaCapo(f);
  await pagina.getByRole("button", { name: "Lago di Garda (Riva del Garda e dintorni)", exact: true }).click();
  await pagina.getByText("Hai scelto: Lago di Garda").waitFor();
  await pagina.getByRole("button", { name: "Avanti" }).click();
  await pagina.getByText("Passo 2 di 5").waitFor();
  await pagina.getByLabel("Dal", { exact: true }).fill(dal);
  await pagina.getByLabel("Al", { exact: true }).fill(al);
  await pagina.getByRole("button", { name: "Avanti" }).click();
  for (const n of [3, 4]) {
    await pagina.getByText(`Passo ${n} di 5`).waitFor();
    await pagina.getByRole("button", { name: "Avanti" }).click();
  }
  await pagina.getByText("Passo 5 di 5").waitFor();
  await pagina.getByRole("button", { name: "Crea la mia bozza" }).click();
  await pagina.waitForURL(/\/bozza\//);
  const id = idBozza(pagina.url());
  await pagina.getByRole("button", { name: "Conferma l'itinerario" }).click();
  const festa = pagina.locator(".bozza__festa");
  await festa.waitFor();
  await festa.getByRole("button", { name: "Chiudi", exact: true }).click();
  await festa.waitFor({ state: "detached" });
  return id;
}

const SCENARIO_PIOGGIA = JSON.stringify({
  meteo: [{ zonaId: "GARDA_NORD", data: "2026-06-13", fasce: [{ inizio: "08:00", fine: "13:00", condizione: "pioggia" }] }],
});

// --- TB-TODAY ---------------------------------------------------------------------------------------------------

flusso("TB-TODAY-001 · Viaggio demo sull'orologio simulato", async (f) => {
  const { pagina } = f;
  await f.passo("Imposto l'orologio della Demo a 2026-06-12 17:00", () => impostaOrologio(f, "2026-06-12", "17:00"));
  await f.passo("Apro «Oggi» dal menu", async () => {
    await pagina.goto(f.url);
    await pagina.locator('a[href="/oggi"]').first().click();
    await pagina.getByRole("heading", { name: "Adesso" }).waitFor();
  });
  await f.passo("Il giorno mostrato è quello dell'orologio simulato", async () => {
    expect(await momentoMostrato(f)).toBe("2026-06-12 17:00");
    expect(await testo(pagina)).toContain("venerdì 12 giugno 2026 alle 17:00");
  });
  await f.passo("«Adesso» mostra l'elemento in corso alle 17:00", async () => {
    const adesso = pagina.locator('[data-scheda="adesso"]');
    const elemento = await adesso.getAttribute("data-elemento");
    expect(elemento, `«Adesso» alle 17:00 non ha nessun elemento in corso. Testo: ${(await adesso.innerText()).replace(/\s+/g, " ")}`).not.toBeNull();
    expect(await adesso.innerText()).toContain("Finisce alle");
  });
});

flusso(
  "TB-TODAY-002 · Viaggio dell'utente con orologio automatico",
  async (f) => {
    const { pagina } = f;
    const oggi = realeRoma().data;
    let a = "";
    let b = "";
    await f.passo("Creo A (comprende oggi) e B (nel futuro), entrambi confermati", async () => {
      a = await creaViaggioConfermato(f, realeRoma(-1).data, realeRoma(2).data);
      b = await creaViaggioConfermato(f, realeRoma(60).data, realeRoma(63).data);
      expect(a).not.toBe(b);
    });
    await f.passo("A usa la data e l'ora reali (Europe/Rome)", async () => {
      await pagina.goto(`${f.url}/viaggi/${a}/oggi`);
      await pagina.getByRole("heading", { name: "Oggi", level: 1 }).waitFor();
      const m = await momentoMostrato(f);
      const reale = realeRoma();
      expect(m.split(" ")[0]).toBe(oggi);
      const minuti = (s: string): number => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
      expect(Math.abs(minuti(m.split(" ")[1] ?? "00:00") - minuti(reale.ora))).toBeLessThanOrEqual(3);
    });
    await f.passo("B, fuori dalle sue date, usa l'orologio simulato riportato sulle sue date", async () => {
      await pagina.goto(`${f.url}/viaggi/${b}/oggi`);
      await pagina.getByRole("heading", { name: "Oggi", level: 1 }).waitFor();
      expect(await momentoMostrato(f)).toBe(`${realeRoma(60).data} 08:00`);
    });
  },
  { TRAVELOPS_OROLOGIO: "automatico" },
);

const DATI_T3 = mkdtempSync(join(tmpdir(), "travelops-qa001c-t3-"));
flusso(
  "TB-TODAY-003 · Orologio forzato reale o simulato",
  async (f) => {
    const { pagina } = f;
    const dal = "2026-07-10";
    const demo = "TRIP-DEMO-GARDA";
    let utente = "";
    try {
      await f.passo("Creo il viaggio dell'utente confermato fuori dalle date di oggi (10-13 luglio 2026)", async () => {
        utente = await creaViaggioConfermato(f, dal, "2026-07-13");
      });
      const aperture = async (url: string): Promise<{ utente: string; demo: string; testoUtente: string; testoDemo: string }> => {
        await pagina.goto(`${url}/viaggi/${utente}/oggi`);
        await pagina.getByRole("heading", { name: "Oggi", level: 1 }).waitFor();
        const mu = await momentoMostrato({ ...f, url });
        const tu = await testo(pagina);
        await pagina.goto(`${url}/viaggi/${demo}/oggi`);
        await pagina.getByRole("heading", { name: "Oggi", level: 1 }).waitFor();
        const md = await momentoMostrato({ ...f, url });
        const td = await testo(pagina);
        return { utente: mu, demo: md, testoUtente: tu, testoDemo: td };
      };
      await f.passo("Con «reale» il viaggio dell'utente usa l'ora reale, il demo resta simulato", async () => {
        const r = await aperture(f.url);
        expect(r.utente.split(" ")[0]).toBe(realeRoma().data);
        expect(r.demo.split(" ")[0]).not.toBe(realeRoma().data);
        expect(r.demo.split(" ")[1]).toBe("08:00");
      });
      for (const valore of ["simulato", "boh"]) {
        const app = await avviaApp({ TRAVELOPS_DATI: DATI_T3, TRAVELOPS_OROLOGIO: valore });
        try {
          await f.passo(`Con «${valore}» entrambi i viaggi usano l'orologio della Demo, senza errori in pagina`, async () => {
            const r = await aperture(app.url);
            expect(r.utente, `viaggio utente con ${valore}`).toBe(`${dal} 08:00`);
            expect(r.demo.split(" ")[1]).toBe("08:00");
            expect(r.demo.split(" ")[0]).not.toBe(realeRoma().data);
            for (const t of [r.testoUtente, r.testoDemo]) expect(t).not.toMatch(/Application error|non trovat/i);
          });
        } finally {
          await app.ferma();
        }
      }
    } finally {
      rmSync(DATI_T3, { recursive: true, force: true });
    }
  },
  { TRAVELOPS_DATI: DATI_T3, TRAVELOPS_OROLOGIO: "reale" },
);

flusso("TB-TODAY-004 · «Adesso» e «Dopo» coerenti con l'ora", async (f) => {
  const { pagina } = f;
  const apri = async (data: string, ora: string): Promise<string> => {
    await impostaOrologio(f, data, ora);
    await pagina.goto(`${f.url}/oggi`);
    await pagina.getByRole("heading", { name: "Adesso" }).waitFor();
    return testo(pagina);
  };
  await f.passo("A metà di un'attività (12 giugno 16:30): «Finisce alle…: mancano…» e «Dopo» la successiva", async () => {
    const t = await apri("2026-06-12", "16:30");
    expect(t).toMatch(/Finisce alle 18:10: mancano .+\./);
    const dopo = await pagina.locator('[data-scheda="dopo"]').innerText();
    expect(dopo).toMatch(/Parti alle|Inizia alle|Sei già in viaggio/);
    expect(await pagina.locator('[data-scheda="dopo"]').getAttribute("data-elemento")).toBe("D1-E3");
  });
  await f.passo("In una pausa (14 giugno 13:20): «Niente in programma fino alle…: hai… di tempo libero.»", async () => {
    const t = await apri("2026-06-14", "13:20");
    expect(t).toMatch(/Niente in programma fino alle \d\d:\d\d: hai .+ di tempo libero./);
    // «6 ore libere», non «6 ore liberi» (ST-QA-FIX-017).
    expect(t).not.toMatch(/\bore liberi\b/);
  });
  await f.passo("Dopo l'ultima attività (14 giugno 18:00): «Per oggi è tutto: goditi il resto della giornata.»", async () => {
    const t = await apri("2026-06-14", "18:00");
    expect(t).toContain("Per oggi è tutto: goditi il resto della giornata.");
  });
});

flusso("TB-TODAY-005 · Ritardo di 30 minuti", async (f) => {
  const { pagina } = f;
  await f.passo("Orologio a metà mattina (13 giugno 10:00, trekking del Ponale in corso) e apro Oggi", async () => {
    await impostaOrologio(f, "2026-06-13", "10:00");
    await pagina.goto(`${f.url}/oggi`);
    await pagina.getByRole("heading", { name: "Adesso" }).waitFor();
  });
  const orariDopo = async (): Promise<string> => (await pagina.locator('[data-scheda="dopo"]').innerText()).replace(/\s+/g, " ");
  const prima = await orariDopo();
  let senzaPerche = false;
  await f.passo("«Sono in ritardo di 30 minuti» apre una proposta con «Spiegazione» / «Cosa cambia»", async () => {
    await pagina.getByRole("button", { name: "Sono in ritardo di 30 minuti" }).click();
    await pagina.getByRole("button", { name: "Accetta" }).first().waitFor();
    const t = await testo(pagina);
    expect(t).toContain("Cosa cambia");
    senzaPerche = !t.includes("Spiegazione");
  });
  await f.passo("Il programma non cambia finché non si preme «Accetta»", async () => {
    await pagina.goto(`${f.url}/oggi`);
    await pagina.getByRole("heading", { name: "Adesso" }).waitFor();
    expect(await orariDopo()).toBe(prima);
  });
  await f.passo("Dopo «Accetta» gli orari di «Dopo» sono slittati", async () => {
    await pagina.getByRole("button", { name: "Sono in ritardo di 30 minuti" }).click();
    await pagina.getByRole("button", { name: "Accetta" }).first().click();
    await pagina.goto(`${f.url}/oggi`);
    await pagina.getByRole("heading", { name: "Adesso" }).waitFor();
    expect(await orariDopo()).not.toBe(prima);
  });
  expect(senzaPerche, "la proposta non ha nessuna sezione «Spiegazione»").toBe(false);
});

flusso("TB-TODAY-006 · «Ho un imprevisto» da Oggi", async (f) => {
  const { pagina } = f;
  await f.passo("Apro Oggi e premo «Ho un imprevisto»", async () => {
    await pagina.goto(`${f.url}/oggi`);
    await pagina.getByRole("heading", { name: "Adesso" }).waitFor();
    await pagina.getByRole("link", { name: "Ho un imprevisto" }).click();
    await pagina.waitForURL((u) => !u.pathname.endsWith("/oggi"));
  });
  await f.passo("Si apre /imprevisti con la griglia «Che cosa è successo», non /demo", async () => {
    expect(new URL(pagina.url()).pathname, `indirizzo aperto: ${pagina.url()}`).toBe("/imprevisti");
    await pagina.getByRole("list", { name: "Che cosa è successo" }).waitFor();
  });
});

flusso("TB-TODAY-007 · «Oggi sono stanco»", async (f) => {
  const { pagina } = f;
  await f.passo("Apro Oggi e premo «Oggi sono stanco»", async () => {
    await pagina.goto(`${f.url}/oggi`);
    await pagina.getByRole("heading", { name: "Adesso" }).waitFor();
    await pagina.getByRole("link", { name: "Oggi sono stanco" }).click();
    await pagina.waitForURL((u) => !u.pathname.endsWith("/oggi"));
  });
  await f.passo("Si apre /imprevisti?scheda=stanchezza con la scheda «Sono stanco» e il campo «Quando»", async () => {
    const u = new URL(pagina.url());
    expect(u.pathname, `indirizzo aperto: ${pagina.url()}`).toBe("/imprevisti");
    expect(u.searchParams.get("scheda")).toBe("stanchezza");
    await pagina.getByRole("heading", { name: "Sono stanco", level: 2 }).waitFor();
    // REQ-REPLAN-004 R2-STA: nessuna scelta d'intensità per la stanchezza (ST-QA-FIX-020).
    await pagina.getByLabel("Quando", { exact: true }).waitFor();
  });
});

flusso("TB-TODAY-008 · Oggi segue il viaggio scelto", async (f) => {
  const { pagina } = f;
  let id = "";
  await f.passo("Creo e confermo un viaggio dell'utente", async () => {
    id = await creaViaggioConfermato(f, "2026-07-10", "2026-07-13");
  });
  await f.passo("Lo apro dalla home e poi premo «Oggi» dal menu", async () => {
    await pagina.goto(f.url);
    await pagina.getByRole("heading", { name: "I miei viaggi" }).waitFor();
    await pagina.locator(`a[href="/viaggi/${id}"]`).first().click();
    await pagina.waitForURL(new RegExp(`/viaggi/${id}`));
    await pagina.locator('a[href="/oggi"]').first().click();
    await pagina.getByRole("heading", { name: "Oggi", level: 1 }).waitFor();
  });
  await f.passo("«Oggi» mostra il viaggio dell'utente, non l'itinerario di riferimento", async () => {
    expect(new URL(pagina.url()).pathname, `indirizzo aperto: ${pagina.url()}`).toBe(`/viaggi/${id}/oggi`);
    const m = await momentoMostrato(f);
    expect(m.split(" ")[0]! >= "2026-07-10" && m.split(" ")[0]! <= "2026-07-13", `momento mostrato ${m}: non è nelle date del viaggio dell'utente`).toBe(true);
    expect(await pagina.locator('.scelta-viaggio__voce--attiva').count(), "è attivo uno dei viaggi di riferimento").toBe(0);
  });
});

// --- TB-MON -----------------------------------------------------------------------------------------------------

flusso(
  "TB-MON-001 · Pioggia rilevata: notifica in Oggi",
  async (f) => {
    const { pagina } = f;
    await f.passo("Attendo un giro del monitoraggio (3 s) e porto l'orologio al giorno del trekking", async () => {
      await new Promise((r) => setTimeout(r, 3000));
      await impostaOrologio(f, "2026-06-13", "08:00");
    });
    await f.passo("Apro «Oggi»: compare la notifica che spiega il rischio, col link alla proposta", async () => {
      await pagina.goto(`${f.url}/oggi`);
      await pagina.getByRole("heading", { name: "Adesso" }).waitFor();
      const notifica = pagina.locator("[data-notifica]");
      await notifica.first().waitFor();
      const t = await notifica.first().innerText();
      expect(t).toMatch(/pioggia/i);
      expect(t).toContain("Trekking sul Sentiero del Ponale");
      await pagina.getByRole("link", { name: "Vedi la proposta" }).waitFor();
    });
    await f.passo("Nessuna modifica al programma finché non si accetta (resta la versione 1)", async () => {
      await pagina.getByRole("link", { name: "Vedi la proposta" }).click();
      await pagina.getByRole("button", { name: "Accetta" }).first().waitFor();
      await pagina.goto(`${f.url}/demo`);
      expect(await pagina.locator("[data-versione-corrente]").getAttribute("data-versione-corrente")).toBe("1");
    });
  },
  { MONITOR_ATTIVO: "true", MONITOR_INTERVALLO_S: "1", MONITOR_FINTO: SCENARIO_PIOGGIA },
);

flusso(
  "TB-MON-002 · Monitoraggio spento",
  async (f) => {
    const { pagina } = f;
    await f.passo("Attendo 5 s e apro «Oggi» sul giorno del trekking", async () => {
      await new Promise((r) => setTimeout(r, 5000));
      await impostaOrologio(f, "2026-06-13", "08:00");
      await pagina.goto(`${f.url}/oggi`);
      await pagina.getByRole("heading", { name: "Adesso" }).waitFor();
    });
    // MONITOR_ATTIVO=false spegne solo il controllo periodico: quello all'apertura di Oggi resta (REQ-MONITOR-001 CA-1).
    await f.passo("Il controllo all'apertura di Oggi resta attivo: compare la notifica della pioggia", async () => {
      await pagina.locator("[data-notifica]").first().waitFor();
      expect(await pagina.locator("[data-notifica]").first().innerText()).toMatch(/pioggia/i);
    });
    await f.passo("Il resto di «Oggi» funziona", async () => {
      await pagina.getByRole("heading", { name: "Dopo" }).waitFor();
      await pagina.getByRole("heading", { name: "Qualcosa è cambiato?" }).waitFor();
    });
  },
  { MONITOR_ATTIVO: "false", MONITOR_INTERVALLO_S: "1", MONITOR_FINTO: SCENARIO_PIOGGIA },
);

flusso(
  "TB-MON-003 · Configurazione non valida e orizzonte",
  async (f) => {
    const { pagina } = f;
    const dati = mkdtempSync(join(tmpdir(), "travelops-qa001c-mon3-"));
    const ambiente: NodeJS.ProcessEnv = {
      ...process.env,
      TRAVELOPS_DATI: dati,
      TRAVELOPS_ASSISTENTE: "finto",
      TRAVELOPS_METEO: "finto",
      TRAVELOPS_PERCORSI: "finto",
      TRAVELOPS_GEOCODING: "finto",
      TRAVELOPS_VOLI: "finto",
      TRAVELOPS_EVENTI: "finto",
      OPENAI_API_KEY: "",
      NODE_ENV: "production",
      MONITOR_ATTIVO: "true",
      MONITOR_INTERVALLO_S: "0",
      MONITOR_ORIZZONTE_GIORNI: "2",
      MONITOR_FINTO: SCENARIO_PIOGGIA,
    };
    const porta = 40_000 + Math.floor(Math.random() * 10_000);
    const figlio = spawn(process.execPath, ["scripts/next.mjs", "start", "-p", String(porta), "-H", "127.0.0.1"], { cwd: CARTELLA_APP, env: ambiente, stdio: ["ignore", "pipe", "pipe"] });
    let log = "";
    figlio.stdout.on("data", (d: Buffer) => (log += d.toString()));
    figlio.stderr.on("data", (d: Buffer) => (log += d.toString()));
    const url = `http://127.0.0.1:${porta}`;
    try {
      await f.passo("Avvio l'app con intervallo 0 e orizzonte 2: l'app parte", async () => {
        const inizio = Date.now();
        for (;;) {
          try {
            if ((await fetch(url)).ok) break;
          } catch {
            // non ancora pronta
          }
          if (Date.now() - inizio > 30_000 || figlio.exitCode !== null) throw new Error(`l'app non parte:\n${log.slice(-1500)}`);
          await new Promise((r) => setTimeout(r, 200));
        }
      });
      await f.passo("Il log di avvio avvisa e torna al predefinito di 900 s", async () => {
        expect(log, `log di avvio:\n${log}`).toMatch(/MONITOR_INTERVALLO_S="0" non è valido[^\n]*uso 900/);
      });
      const g = { ...f, url };
      await f.passo("Porto l'orologio a 5 giorni dalla partenza (7 giugno) e apro «Oggi»", async () => {
        await impostaOrologio(g, "2026-06-07", "08:00");
        await pagina.goto(`${url}/oggi`);
        await pagina.getByRole("heading", { name: "Oggi", level: 1 }).waitFor();
        expect(await momentoMostrato(g)).toBe("2026-06-07 08:00");
      });
      await f.passo("Il viaggio fuori dall'orizzonte di 2 giorni non riceve notifiche", async () => {
        const n = await pagina.locator("[data-notifica]").count();
        const t = n > 0 ? (await pagina.locator("[data-notifica]").first().innerText()).replace(/\s+/g, " ") : "";
        expect(n, `notifiche presenti fuori orizzonte: «${t}»`).toBe(0);
      });
    } finally {
      figlio.kill("SIGTERM");
      await new Promise((r) => (figlio.exitCode !== null ? r(null) : figlio.once("exit", r)));
      rmSync(dati, { recursive: true, force: true });
    }
  },
  { MONITOR_ATTIVO: "false" },
);
