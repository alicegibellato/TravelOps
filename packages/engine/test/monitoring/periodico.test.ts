import { describe, expect, it } from "vitest";
import {
  creaPianificatore,
  creaRegistroInMemoria,
  creaSorgenteCondizioniFinta,
  eseguiControllo,
  leggiConfigMonitoraggio,
  leggiScenarioFinto,
  type TimerPianificatore,
} from "../../src/monitoring/index.js";
import { orologioFinto, PIOGGIA_SABATO, viaggioDiProva } from "./supporto.js";

/** Timer e orologio finti: il tempo avanza solo quando lo decide il test. */
function timerFinto() {
  const coda: { azione: () => void; ms: number; annullato: boolean }[] = [];
  const timer: TimerPianificatore = {
    imposta(azione, ms) {
      const voce = { azione, ms, annullato: false };
      coda.push(voce);
      return { annulla: () => void (voce.annullato = true) };
    },
  };
  return {
    timer,
    programmati: () => coda.filter((v) => !v.annullato).length,
    scatta(): void {
      const voce = coda.find((v) => !v.annullato);
      if (voce === undefined) throw new Error("nessun timer programmato");
      voce.annullato = true;
      voce.azione();
    },
  };
}

const attendi = () => new Promise<void>((r) => setImmediate(r));

describe("controllo periodico con pianificatore, orologio e timer finti (REQ-MONITOR-001 CA-1, CA-5)", () => {
  it("a ogni scatto controlla; al primo scatto sereno, poi arriva la pioggia: 1 solo imprevisto, poi nessun duplicato", async () => {
    const sorgente = creaSorgenteCondizioniFinta();
    const registro = creaRegistroInMemoria();
    const orologio = orologioFinto();
    const t = timerFinto();
    const nuovi: number[] = [];
    const p = creaPianificatore({
      intervalloMs: 900_000,
      timer: t.timer,
      esegui: async () => {
        const esito = await eseguiControllo({ viaggi: [viaggioDiProva()], sorgente, orologio, registro, config: { orizzonteGiorni: 7 } });
        nuovi.push(esito.nuovi.length);
      },
    });
    p.avvia();
    p.avvia(); // idempotente: un solo timer
    expect(t.programmati()).toBe(1);
    t.scatta();
    await attendi();
    expect(nuovi).toEqual([0]);
    sorgente.imposta({ meteo: [PIOGGIA_SABATO] });
    orologio.imposta("2026-06-12", "08:15");
    t.scatta();
    await attendi();
    t.scatta();
    await attendi();
    expect(nuovi).toEqual([0, 1, 0]);
    await p.ferma();
  });

  it("ferma(): nessun timer resta programmato e attende il giro in corso; dopo non scatta più niente", async () => {
    const t = timerFinto();
    let finito = false;
    let sblocca!: () => void;
    const p = creaPianificatore({
      intervalloMs: 10,
      timer: t.timer,
      esegui: () =>
        new Promise<void>((r) => {
          sblocca = () => {
            finito = true;
            r();
          };
        }),
    });
    p.avvia();
    t.scatta();
    const fermato = p.ferma();
    await attendi();
    expect(finito).toBe(false);
    sblocca();
    await fermato;
    expect(finito).toBe(true);
    expect(t.programmati()).toBe(0);
    expect(p.avviato).toBe(false);
  });

  it("un errore del controllo è riferito e non ferma i giri successivi", async () => {
    const t = timerFinto();
    const errori: string[] = [];
    let n = 0;
    const p = creaPianificatore({
      intervalloMs: 10,
      timer: t.timer,
      esegui: async () => {
        n += 1;
        if (n === 1) throw new Error("guasto");
      },
      inErrore: (e) => errori.push((e as Error).message),
    });
    p.avvia();
    t.scatta();
    await attendi();
    expect(errori).toEqual(["guasto"]);
    expect(t.programmati()).toBe(1);
    await p.ferma();
  });

  it("l'intervallo non valido è rifiutato", () => {
    expect(() => creaPianificatore({ intervalloMs: 0, esegui: async () => undefined })).toThrow();
  });
});

describe("configurazione del monitoraggio", () => {
  it("predefiniti sicuri", () => {
    expect(leggiConfigMonitoraggio({})).toEqual({ attivo: true, intervalloSecondi: 900, orizzonteGiorni: 7, avvisi: [] });
  });
  it("legge i valori e disattiva lo scheduler", () => {
    const c = leggiConfigMonitoraggio({ MONITOR_ATTIVO: "false", MONITOR_INTERVALLO_S: "30", MONITOR_ORIZZONTE_GIORNI: "3" });
    expect(c).toMatchObject({ attivo: false, intervalloSecondi: 30, orizzonteGiorni: 3, avvisi: [] });
  });
  it("valori non validi: predefinito e avviso", () => {
    const c = leggiConfigMonitoraggio({ MONITOR_ATTIVO: "forse", MONITOR_INTERVALLO_S: "0", MONITOR_ORIZZONTE_GIORNI: "x" });
    expect(c).toMatchObject({ attivo: true, intervalloSecondi: 900, orizzonteGiorni: 7 });
    expect(c.avvisi).toHaveLength(3);
  });
});

describe("scenario finto da JSON", () => {
  it("accetta uno scenario valido e rifiuta il resto con il motivo", () => {
    expect(leggiScenarioFinto(JSON.stringify({ meteo: [PIOGGIA_SABATO] })).ok).toBe(true);
    expect(leggiScenarioFinto("{").ok).toBe(false);
    expect(leggiScenarioFinto(JSON.stringify({ meteo: [{ zonaId: "X" }] }))).toMatchObject({ ok: false });
    expect(leggiScenarioFinto(JSON.stringify({ meteo: [{ ...PIOGGIA_SABATO, fasce: [{ inizio: "9", fine: "10:00", condizione: "pioggia" }] }] }))).toMatchObject({ ok: false });
  });
});
