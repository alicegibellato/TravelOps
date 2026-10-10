/**
 * ST-UX-003A, CA-3 di REQ-UX-003: Oggi/Adesso, imprevisti e agenti usano un orologio coerente con le date del viaggio,
 * simulato relativo all'inizio del viaggio oppure reale se il viaggio è in corso, configurabile
 * (`TRAVELOPS_OROLOGIO`). I viaggi della modalità presentazione restano sull'orologio della Demo. L'istante reale è
 * sempre iniettato: nessun test dipende dalla data di oggi né dalla rete.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { collegaConversazione, creaConversazione, elencaProposteDelViaggio } from "../src/basedati";
import { servizioBozza } from "../src/bozza/server";
import { orologioDellaConversazione } from "../src/chat/server/agenti";
import { decidiPropostaDelViaggio } from "../src/chat/server/proposte-viaggio";
import { momentoSulViaggio, type OpzioniOrologio } from "../src/dati/viaggi-salvati";
import { datiOggi, segnalaRitardoSulViaggio } from "../src/oggi/operazioni";
import {
  aggiungiGiorni,
  configurazioneOrologio,
  momentoDelViaggio,
  momentoReale,
  type ConfigurazioneOrologio,
  type DatiOrologio,
} from "../src/oggi/orologio";
import { usaBaseDati } from "../src/stato/avvio";
import { impostaOrologio } from "../src/stato/operazioni";
import { nuovaCartella } from "./supporto-stato";
import { conViaggioUtente, DEMO_GARDA } from "./supporto-ux003a";

const AUTOMATICO: ConfigurazioneOrologio = { modo: "automatico", fuso: "Europe/Rome" };
const SIMULATO: ConfigurazioneOrologio = { modo: "simulato", fuso: "Europe/Rome" };
const REALE: ConfigurazioneOrologio = { modo: "reale", fuso: "Europe/Rome" };

const ORIGINALE = process.env.TRAVELOPS_OROLOGIO;

beforeEach(() => {
  process.env.TRAVELOPS_OROLOGIO = "simulato";
});

afterEach(() => {
  if (ORIGINALE === undefined) delete process.env.TRAVELOPS_OROLOGIO;
  else process.env.TRAVELOPS_OROLOGIO = ORIGINALE;
});

function dati(parziali: Partial<DatiOrologio>): DatiOrologio {
  return {
    inizio: "2026-10-10",
    fine: "2026-10-13",
    presentazione: false,
    demo: false,
    orologioDemo: { data: "2026-06-12", ora: "08:00" },
    inizioDemo: "2026-06-12",
    configurazione: AUTOMATICO,
    adesso: new Date("2026-12-01T10:00:00Z"),
    ...parziali,
  };
}

describe("CA-3 le regole dell'orologio di un viaggio", () => {
  it("CA-3 configurazione: predefinito «automatico» a Europe/Rome; valori non validi tornano ai predefiniti", () => {
    expect(configurazioneOrologio({})).toEqual(AUTOMATICO);
    expect(configurazioneOrologio({ TRAVELOPS_OROLOGIO: " Reale ", TRAVELOPS_FUSO_ORARIO: "UTC" })).toEqual({ modo: "reale", fuso: "UTC" });
    expect(configurazioneOrologio({ TRAVELOPS_OROLOGIO: "domani", TRAVELOPS_FUSO_ORARIO: "Luna/Mare" })).toEqual(AUTOMATICO);
    expect(configurazioneOrologio({ TRAVELOPS_OROLOGIO: "simulato" }).modo).toBe("simulato");
  });

  it("CA-3 ora reale nel fuso scelto e date spostate di giorni di calendario", () => {
    expect(momentoReale(new Date("2026-10-10T22:30:00Z"), "Europe/Rome")).toEqual({ data: "2026-10-11", ora: "00:30" });
    expect(momentoReale(new Date("2026-10-10T22:30:00Z"), "UTC")).toEqual({ data: "2026-10-10", ora: "22:30" });
    expect(aggiungiGiorni("2026-02-27", 3)).toBe("2026-03-02");
    expect(aggiungiGiorni("2026-06-12", -1)).toBe("2026-06-11");
  });

  it("CA-3 i viaggi della modalità presentazione seguono l'orologio della Demo, in qualsiasi modo", () => {
    for (const configurazione of [AUTOMATICO, SIMULATO, REALE]) {
      const esito = momentoDelViaggio(dati({ presentazione: true, demo: true, orologioDemo: { data: "2026-06-13", ora: "10:30" }, configurazione }));
      expect(esito).toEqual({ momento: { data: "2026-06-13", ora: "10:30" }, origine: "presentazione" });
    }
  });

  it("CA-3 simulato relativo all'inizio del viaggio: stesso giorno del viaggio e stessa ora dell'orologio della Demo", () => {
    expect(momentoDelViaggio(dati({})).momento).toEqual({ data: "2026-10-10", ora: "08:00" });
    expect(momentoDelViaggio(dati({ orologioDemo: { data: "2026-06-14", ora: "17:45" } })).momento).toEqual({ data: "2026-10-12", ora: "17:45" });
    expect(momentoDelViaggio(dati({ orologioDemo: { data: "2026-06-11", ora: "09:00" } })).momento).toEqual({ data: "2026-10-09", ora: "09:00" });
  });

  it("CA-3 ora reale se il viaggio è in corso (automatico) o sempre (reale); mai con «simulato» né per i viaggi demo", () => {
    const durante = new Date("2026-10-11T07:15:00Z"); // 09:15 a Roma, secondo giorno del viaggio
    const fuori = new Date("2026-12-01T10:00:00Z");
    expect(momentoDelViaggio(dati({ adesso: durante }))).toEqual({ momento: { data: "2026-10-11", ora: "09:15" }, origine: "reale" });
    expect(momentoDelViaggio(dati({ adesso: fuori })).origine).toBe("simulato");
    expect(momentoDelViaggio(dati({ adesso: fuori, configurazione: REALE }))).toEqual({ momento: { data: "2026-12-01", ora: "11:00" }, origine: "reale" });
    expect(momentoDelViaggio(dati({ adesso: durante, configurazione: SIMULATO })).origine).toBe("simulato");
    expect(momentoDelViaggio(dati({ adesso: durante, demo: true })).origine).toBe("simulato");
  });
});

// Il primo avvio della base dati (istantanee e viaggi demo) richiede qualche secondo su questa macchina.
const LENTO = { timeout: 60_000 };

/** Base dati con un viaggio confermato del viaggiatore dal 10 al 13 ottobre 2026 e l'orologio della Demo al 13 giugno. */
function cartellaConViaggio(): string {
  const cartella = nuovaCartella();
  conViaggioUtente(cartella, { id: "viaggio-1", spostamento: 120 });
  impostaOrologio(cartella, "2026-06-13", "10:30");
  return cartella;
}

const momento = (cartella: string, chiave: string | null, opzioni: OpzioniOrologio) => usaBaseDati(cartella, (db) => momentoSulViaggio(db, chiave, opzioni));

describe("CA-3 l'orologio sui viaggi della base dati", LENTO, () => {
  it("CA-3 viaggio del viaggiatore, viaggio demo e viaggio della presentazione: ognuno il suo momento", () => {
    const cartella = cartellaConViaggio();
    const durante = (): Date => new Date("2026-10-12T07:15:00Z");
    // Viaggio del viaggiatore: simulato (secondo giorno, come l'orologio della Demo) o reale se è in corso.
    expect(momento(cartella, "viaggio-1", { configurazione: SIMULATO, adesso: durante })).toEqual({
      momento: { data: "2026-10-11", ora: "10:30" },
      origine: "simulato",
    });
    expect(momento(cartella, "viaggio-1", { configurazione: AUTOMATICO, adesso: durante })).toEqual({
      momento: { data: "2026-10-12", ora: "09:15" },
      origine: "reale",
    });
    // Viaggio demo del prodotto (dal 12 giugno): sempre simulato, anche quando l'ora reale cade nelle sue date.
    expect(momento(cartella, DEMO_GARDA, { configurazione: AUTOMATICO, adesso: () => new Date("2026-06-14T10:00:00Z") })).toEqual({
      momento: { data: "2026-06-13", ora: "10:30" },
      origine: "simulato",
    });
    // Viaggio della modalità presentazione: l'orologio della Demo, anche in modo «reale».
    expect(momento(cartella, "versione-1", { configurazione: REALE, adesso: durante }).momento).toEqual({ data: "2026-06-13", ora: "10:30" });
    // Nessun viaggio: l'orologio della Demo (in modo «reale», l'ora reale).
    expect(momento(cartella, null, { configurazione: AUTOMATICO }).momento).toEqual({ data: "2026-06-13", ora: "10:30" });
    expect(momento(cartella, null, { configurazione: REALE, adesso: durante }).momento).toEqual({ data: "2026-10-12", ora: "09:15" });
  });

  it("CA-3 Oggi/Adesso e il ritardo segnalato usano il momento del viaggio", () => {
    const cartella = cartellaConViaggio();
    expect(datiOggi(cartella, "viaggio-1")?.momento).toEqual({ data: "2026-10-11", ora: "10:30" });
    expect(datiOggi(cartella, "versione-1")?.momento).toEqual({ data: "2026-06-13", ora: "10:30" });
    const reale = { configurazione: AUTOMATICO, adesso: () => new Date("2026-10-12T07:15:00Z") };
    expect(datiOggi(cartella, "viaggio-1", reale)?.momento).toEqual({ data: "2026-10-12", ora: "09:15" });

    const esito = segnalaRitardoSulViaggio(cartella, "viaggio-1", 15);
    expect(esito.ok).toBe(true);
    const proposta = usaBaseDati(cartella, (db) => elencaProposteDelViaggio(db, "viaggio-1"))[0]?.proposta as {
      origine: { imprevisto: { tipo: string; data: string; momento: string; minuti: number } };
    };
    expect(proposta.origine.imprevisto).toMatchObject({ tipo: "RITARDO", data: "2026-10-11", momento: "10:30", minuti: 15 });
  });

  it("CA-3 le decisioni sulle proposte (pagina del viaggio e chat) e gli agenti usano l'orologio del viaggio", () => {
    const cartella = cartellaConViaggio();
    const prima = segnalaRitardoSulViaggio(cartella, "viaggio-1", 30);
    const seconda = segnalaRitardoSulViaggio(cartella, "viaggio-1", 60);
    if (!prima.ok || !seconda.ok) throw new Error("proposte non create");
    const accettata = servizioBozza(cartella).accetta("viaggio-1", prima.id);
    expect(accettata.ok).toBe(true);
    decidiPropostaDelViaggio(cartella, "viaggio-1", seconda.id, "accetta", "Ada");
    const decisioni = usaBaseDati(cartella, (db) => elencaProposteDelViaggio(db, "viaggio-1")).map((p) => p.decisione as { momento?: unknown } | null);
    const atteso = { data: "2026-10-11", ora: "10:30" };
    expect(decisioni[0]?.momento).toEqual(atteso);
    // La seconda proposta può non creare una versione (costruita sulla versione 1): se è decisa, al momento del viaggio.
    if (decisioni[1]?.momento !== undefined) expect(decisioni[1].momento).toEqual(atteso);

    const conversazione = usaBaseDati(cartella, (db) => {
      const id = creaConversazione(db, null);
      collegaConversazione(db, id, "viaggio-1");
      return id;
    });
    expect(orologioDellaConversazione(cartella, conversazione)).toEqual(atteso);
    const senzaViaggio = usaBaseDati(cartella, (db) => creaConversazione(db, null));
    expect(orologioDellaConversazione(cartella, senzaViaggio)).toEqual({ data: "2026-06-13", ora: "10:30" });
  });
});
