import { afterEach, describe, expect, it, vi } from "vitest";
import { creaSorgenteCondizioniFinta, type ScenarioFinto } from "@travelops/engine";
import { conBaseDati } from "../src/basedati";
import { avviaMonitoraggio, fermaMonitoraggio } from "../src/monitoraggio/avvio";
import { creaSorgenteMonitoraggio } from "../src/monitoraggio/collegamento";
import { controllaViaggiConfermati, controllaViaggio, controlloAllApertura, notificheAperte, type ContestoMonitoraggio } from "../src/monitoraggio/servizio";
import { leggiStatoMonitoraggio } from "../src/monitoraggio/stato";
import { rifiutaPropostaSalvata } from "../src/stato/operazioni";
import { nuovaCartella, statoSalvato } from "./supporto-stato";

const PIOGGIA: ScenarioFinto = {
  meteo: [{ zonaId: "GARDA_NORD", data: "2026-06-13", fasce: [{ inizio: "08:00", fine: "13:00", condizione: "pioggia" }] }],
};
const contesto = (scenario: ScenarioFinto = PIOGGIA): ContestoMonitoraggio => ({
  sorgente: creaSorgenteCondizioniFinta(scenario),
  config: { orizzonteGiorni: 7 },
});
const TESTO = "Nuovo imprevisto: pioggia prevista sabato alle 09:00 per «Trekking sul Sentiero del Ponale»";

afterEach(async () => {
  await fermaMonitoraggio();
  vi.useRealTimers();
});

describe("monitoraggio sullo stato locale (REQ-MONITOR-001 CA-2, CA-3, CA-4, CA-5)", () => {
  it("una pioggia nuova: 1 imprevisto, 1 proposta minima salvata nello stato, 1 notifica; il secondo controllo non duplica", async () => {
    const cartella = nuovaCartella();
    const c = contesto();
    const primo = await controllaViaggio(cartella, "versione-1", c);
    expect(primo.ok && primo.controllo.nuovi.length).toBe(1);
    const stato = statoSalvato(cartella);
    expect(stato.proposte).toHaveLength(1);
    expect(stato.proposte[0]?.scenario).toBe(TESTO);
    expect(stato.proposte[0]?.proposta.livello).toBe("minimo");
    expect(stato.proposte[0]?.decisione).toBeNull();
    expect(primo.ok && primo.notifiche.map((n) => [n.testo, n.proposta])).toEqual([[TESTO, stato.proposte[0]?.id]]);

    const secondo = await controllaViaggio(cartella, "versione-1", c);
    expect(secondo.ok && secondo.controllo.nuovi.length).toBe(0);
    expect(statoSalvato(cartella).proposte).toHaveLength(1);
    expect(conBaseDati(cartella, (db) => leggiStatoMonitoraggio(db).notifiche)).toHaveLength(1);
  });

  it("due controlli simultanei (scheduler e apertura di Oggi) non producono duplicati", async () => {
    const cartella = nuovaCartella();
    const c = contesto();
    await Promise.all([controllaViaggio(cartella, "versione-1", c), controllaViaggio(cartella, "versione-1", c), controlloAllApertura(cartella, "versione-1", c)]);
    expect(statoSalvato(cartella).proposte).toHaveLength(1);
  });

  it("nessun impatto (pioggia di sera, sereno): niente imprevisti, niente proposte, stato invariato", async () => {
    const cartella = nuovaCartella();
    const sera: ScenarioFinto = { meteo: [{ zonaId: "GARDA_NORD", data: "2026-06-13", fasce: [{ inizio: "20:00", fine: "23:00", condizione: "pioggia" }] }] };
    const esito = await controllaViaggio(cartella, "versione-1", contesto(sera));
    expect(esito.ok && esito.controllo.nuovi).toEqual([]);
    expect(statoSalvato(cartella).proposte).toEqual([]);
    expect(conBaseDati(cartella, (db) => leggiStatoMonitoraggio(db).chiavi.size)).toBe(0);
  });

  it("servizio non disponibile: nessun imprevisto, esito annotato", async () => {
    const cartella = nuovaCartella();
    const esito = await controllaViaggio(cartella, "versione-1", contesto({ ...PIOGGIA, nonDisponibili: ["meteo"] }));
    expect(esito.ok && esito.controllo.nonDisponibili.length).toBeGreaterThan(0);
    expect(statoSalvato(cartella).proposte).toEqual([]);
  });

  it("rifiutata la proposta la notifica sparisce e la stessa condizione non ne crea un'altra", async () => {
    const cartella = nuovaCartella();
    const c = contesto();
    await controllaViaggio(cartella, "versione-1", c);
    const id = statoSalvato(cartella).proposte[0]!.id;
    expect(rifiutaPropostaSalvata(cartella, id).ok).toBe(true);
    expect(conBaseDati(cartella, (db) => notificheAperte(db, "versione-1"))).toEqual([]);
    const dopo = await controllaViaggio(cartella, "versione-1", c);
    expect(dopo.ok && dopo.notifiche).toEqual([]);
    expect(statoSalvato(cartella).proposte).toHaveLength(1);
  });

  it("controllo all'apertura di Oggi di un altro viaggio: lo rende il viaggio di partenza con la sua proposta", async () => {
    const cartella = nuovaCartella();
    expect(statoSalvato(cartella).partenza).toBe("versione-1");
    const notifiche = await controlloAllApertura(cartella, "v-irr", contesto());
    expect(notifiche).toHaveLength(1);
    const stato = statoSalvato(cartella);
    expect(stato.partenza).toBe("v-irr");
    expect(stato.proposte.map((p) => p.id)).toEqual([notifiche[0]?.proposta]);
  });

  it("il controllo periodico guarda tutti i viaggi confermati e salva le proposte senza cambiare il viaggio di partenza", async () => {
    const cartella = nuovaCartella();
    const esiti = await controllaViaggiConfermati(cartella, contesto());
    expect(esiti.filter((e) => e.ok && e.controllo.nuovi.length === 1).length).toBeGreaterThanOrEqual(2);
    expect(statoSalvato(cartella).partenza).toBe("versione-1");
    const ids = conBaseDati(cartella, (db) => leggiStatoMonitoraggio(db).notifiche.map((n) => n.proposta));
    expect(new Set(ids).size).toBe(ids.length);
    const ancora = await controllaViaggiConfermati(cartella, contesto());
    // I viaggi che non si caricano (i viaggi demo da istantanea) sono saltati con un motivo; gli altri non producono altro.
    expect(ancora.every((e) => !e.ok || e.controllo.nuovi.length === 0)).toBe(true);
    expect(ancora.filter((e) => e.ok).length).toBeGreaterThanOrEqual(4);
  });

  it("viaggio sconosciuto o non confermato: nessun controllo", async () => {
    const cartella = nuovaCartella();
    expect((await controllaViaggio(cartella, "non-esiste", contesto())).ok).toBe(false);
  });
});

describe("scheduler nel server (CA-1): una sola istanza, intervallo da config, spegnimento pulito", () => {
  it("MONITOR_ATTIVO=false non avvia niente", () => {
    expect(avviaMonitoraggio({ MONITOR_ATTIVO: "false" })).toBeNull();
  });

  it("avviato due volte è lo stesso pianificatore; a ogni intervallo controlla; dopo ferma() non scatta più", async () => {
    vi.useFakeTimers();
    const cartella = nuovaCartella();
    vi.stubEnv("TRAVELOPS_DATI", cartella);
    try {
      const env = { MONITOR_INTERVALLO_S: "5", MONITOR_FINTO: JSON.stringify(PIOGGIA) };
      const p = avviaMonitoraggio(env);
      expect(p).not.toBeNull();
      expect(avviaMonitoraggio(env)).toBe(p);
      expect(statoSalvato(cartella).proposte).toHaveLength(0);
      await vi.advanceTimersByTimeAsync(4_900);
      expect(statoSalvato(cartella).proposte).toHaveLength(0);
      await vi.advanceTimersByTimeAsync(200);
      const dopoPrimo = conBaseDati(cartella, (db) => leggiStatoMonitoraggio(db).notifiche.length);
      expect(dopoPrimo).toBeGreaterThanOrEqual(2);
      await vi.advanceTimersByTimeAsync(5_000);
      expect(conBaseDati(cartella, (db) => leggiStatoMonitoraggio(db).notifiche.length)).toBe(dopoPrimo);
      await fermaMonitoraggio();
      expect(vi.getTimerCount()).toBe(0);
      expect(p?.avviato).toBe(false);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("collegamento", () => {
  it("senza MONITOR_FINTO usa le porte dei servizi (finte per predefinito); con JSON non valido avviso e nessuna condizione", async () => {
    const r = creaSorgenteMonitoraggio({ TRAVELOPS_METEO: "finto", TRAVELOPS_EVENTI: "finto" });
    expect(r.avvisi).toEqual([]);
    const conCoordinate = await r.sorgente.meteo({ zonaId: "GARDA_NORD", coordinate: { lat: 45.7, lon: 10.7 }, data: "2026-06-13" });
    expect(conCoordinate.disponibile).toBe(true);
    await expect(r.sorgente.meteo({ zonaId: "GARDA_NORD", coordinate: null, data: "2026-06-13" })).resolves.toMatchObject({ disponibile: false });
    await expect(r.sorgente.eventi({ luogoId: "L1", coordinate: { lat: 45.7, lon: 10.7 }, data: "2026-06-13" })).resolves.toEqual({ disponibile: true, dati: [] });
    const invalido = creaSorgenteMonitoraggio({ MONITOR_FINTO: "{" });
    expect(invalido.avvisi).toHaveLength(1);
    await expect(invalido.sorgente.meteo({ zonaId: "GARDA_NORD", coordinate: null, data: "2026-06-13" })).resolves.toEqual({ disponibile: true, dati: [] });
  });
});
