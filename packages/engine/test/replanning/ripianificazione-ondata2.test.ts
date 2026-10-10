/**
 * REQ-REPLAN-004 (ST-REPLAN-004): ripianificazione dei nuovi imprevisti S9–S14 con preferenze e livello dichiarato.
 * I risultati esatti di S12, S13 e S14 sono quelli fissati nel contratto contract-ST-REPLAN-004-implementation.
 */
import { readdirSync, readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { creaSorgenteDaDati } from "../../src/context/index.js";
import type {
  Catalogo,
  DatiContesto,
  Elemento,
  ElementoAttivita,
  ElementoSpostamento,
  Imprevisto,
  ImprevistoEsteso,
  Proposta,
  Viaggio,
} from "../../src/model/index.js";
import { generaBozza } from "../../src/planning/index.js";
import {
  FINESTRA_NON_TROVATA,
  proponiRipianificazione,
  type PropostaRipianificazioneEstesa,
} from "../../src/replanning/index.js";
import { profiloDiRiferimento } from "../planning/supporto.js";
import {
  catalogoOndata2,
  contestoOndata2,
  istantaneaGarda,
  itinerario,
  leggi,
  scenarioOndata2,
  sorgenteOndata2,
  type Scenario,
} from "./supporto-ondata2.js";

const catalogo1 = leggi<Catalogo>("catalogo.json");
const sorgente1 = creaSorgenteDaDati(leggi<DatiContesto>("contesto.json"));
const scenari1 = leggi<Scenario<Imprevisto>[]>("scenari-imprevisti.json");
const pS1 = leggi<Proposta>("proposta-p-s1.json");

/** La proposta di uno scenario S9–S14 sui dati dell'ondata 2 (S11 con il tempo della variante V-BUS). */
function proponi(id: string, varia?: (v: Viaggio) => void): PropostaRipianificazioneEstesa {
  const s = scenarioOndata2(id);
  const viaggio = itinerario(s.itinerario);
  varia?.(viaggio);
  return proponiRipianificazione(viaggio, 1, catalogoOndata2(), sorgenteOndata2(id === "S11"), s.imprevisto);
}

function proponiImprevisto(viaggio: Viaggio, imprevisto: ImprevistoEsteso): PropostaRipianificazioneEstesa {
  return proponiRipianificazione(viaggio, 1, catalogoOndata2(), sorgenteOndata2(), imprevisto);
}

const ids = (elementi: readonly { id: string }[]): string[] => elementi.map((e) => e.id);

const giorno = (v: Viaggio, data: string): Elemento[] => v.giorni.find((g) => g.data === data)?.elementi ?? [];

/** Gli altri giorni restano identici. */
function altriGiorniIdentici(prima: Viaggio, dopo: Viaggio, data: string): void {
  expect(dopo.giorni.filter((g) => g.data !== data)).toEqual(prima.giorni.filter((g) => g.data !== data));
}

const spostamento = (id: string, inizio: string, fine: string, da: string, a: string, mezzo: ElementoSpostamento["mezzo"]): ElementoSpostamento => ({
  id,
  tipo: "spostamento",
  inizio,
  fine,
  orarioFisso: false,
  da,
  a,
  mezzo,
});

const attivita = (id: string, inizio: string, fine: string, attivitaId: string, priorita: ElementoAttivita["priorita"]): ElementoAttivita => ({
  id,
  tipo: "attivita",
  inizio,
  fine,
  orarioFisso: false,
  attivitaId,
  priorita,
});

const ALTERNATIVE_VOLO = [
  {
    tipo: "gestione_prenotazione",
    elementoId: "D3-E9",
    etichetta: "Gestisci la prenotazione XY123 (Compagnia aerea di esempio)",
    indirizzo: "https://example.com/prenotazioni/XY123",
  },
  {
    tipo: "ricerca_voli",
    elementoId: "D3-E9",
    etichetta: "Cerca voli da Aeroporto di Verona a Aeroporto di Roma Fiumicino il 2026-06-14",
    indirizzo:
      "https://www.google.com/travel/flights?q=Voli%20da%20Aeroporto%20di%20Verona%20a%20Aeroporto%20di%20Roma%20Fiumicino%20il%202026-06-14",
  },
];

const RIGENERA = "«Rigenera questa giornata»";

describe("CA-1 senza profilo S1–S8 danno le stesse proposte di REQ-REPLAN-002", () => {
  const confrontabile = (p: Proposta) => ({
    modifiche: p.modifiche,
    itinerario: p.itinerario,
    fattibile: p.fattibile,
    problemi: p.problemi,
    elementiARischio: p.elementiARischio,
    alternative: p.alternative,
  });

  it("S1 coincide con P-S1 (modifiche ed esito)", () => {
    const s1 = scenari1.find((s) => s.id === "S1");
    if (!s1) throw new Error("S1 assente");
    const p = proponiRipianificazione(itinerario(s1.itinerario), 1, catalogo1, sorgente1, s1.imprevisto);
    expect(p.modifiche).toEqual(pS1.modifiche);
    expect(p.fattibile).toBe(pS1.fattibile);
  });

  it.each(scenari1.map((s) => [s.id, s] as const))(
    "%s: stessa proposta senza opzioni, con opzioni vuote e sui dati dell'ondata 2 (catalogo esteso e §8.5)",
    (_, s) => {
      const senza = proponiRipianificazione(itinerario(s.itinerario), 1, catalogo1, sorgente1, s.imprevisto);
      const vuote = proponiRipianificazione(itinerario(s.itinerario), 1, catalogo1, sorgente1, s.imprevisto, {});
      expect(vuote).toEqual(senza);
      const ondata2 = proponiRipianificazione(itinerario(s.itinerario), 1, catalogoOndata2(), sorgenteOndata2(), s.imprevisto);
      expect(confrontabile(ondata2)).toEqual(confrontabile(senza));
      expect(senza.livello).toBe("minimo");
    },
  );

  it("la spiegazione delle proposte fattibili non offre di rigenerare la giornata", () => {
    for (const s of scenari1) {
      const p = proponiRipianificazione(itinerario(s.itinerario), 1, catalogo1, sorgente1, s.imprevisto);
      expect(p.spiegazione.includes(RIGENERA), s.id).toBe(!p.fattibile);
    }
  });
});

describe("CA-2 S9 caviglia slogata (R2-SAL)", () => {
  const p = proponi("S9");

  it("produce le modifiche di P-S1, fattibile", () => {
    expect(p.modifiche).toEqual(pS1.modifiche);
    expect(p.fattibile).toBe(true);
    expect(p.elementiARischio).toEqual([]);
    altriGiorniIdentici(itinerario("versione-1"), p.itinerario, "2026-06-13");
  });

  it("le candidate sono A-MAG e A-CANTINA per intensità, vince A-MAG per minor spostamento", () => {
    expect(p.spiegazione).toContain("si cercano attività di intensità al massimo facile in zona Alto Garda tra le 08:40 e le 13:20");
    expect(p.spiegazione).toContain("«Visita al MAG» (10:00–12:00, spostamenti 10 + 5 minuti) e «Degustazione in cantina» (10:00–11:30, spostamenti 15 + 15 minuti)");
    expect(p.spiegazione).toContain("ha il minor tempo di spostamento");
  });

  it("la spiegazione cita l'infortunio", () => {
    expect(p.spiegazione).toContain("caviglia slogata");
    expect(p.spiegazione).toContain("per «caviglia slogata» l'intensità massima consentita è facile e l'attività è impegnativa");
  });

  it("con mobilità ridotta le candidate devono essere anche accessibili", () => {
    const q = proponiImprevisto(itinerario("versione-1"), {
      tipo: "SALUTE",
      dataInizio: "2026-06-13",
      giorni: 1,
      intensitaMassima: "impegnativa",
      mobilitaRidotta: true,
      descrizione: "stampelle",
    });
    expect(ids(q.modifiche.rimossi)).toEqual(["D2-E2"]);
    expect(q.modifiche.aggiunti.map((e) => (e as ElementoAttivita).attivitaId)).toEqual(["A-MAG"]);
  });

  it("riposo: restano solo pasti, orari fissi e irrinunciabili (questi a rischio)", () => {
    const viaggio = itinerario("V-IRR");
    const q = proponiImprevisto(viaggio, {
      tipo: "SALUTE",
      dataInizio: "2026-06-13",
      giorni: 2,
      intensitaMassima: "nessuna",
      mobilitaRidotta: false,
      descrizione: "febbre",
    });
    expect(ids(q.modifiche.rimossi).sort()).toEqual(["D2-E2", "D2-E3", "D3-E6", "D3-E7"]);
    expect(q.modifiche.aggiunti).toEqual([]);
    expect(q.modifiche.modificati.map((m) => m.dopo)).toEqual([
      spostamento("D2-E1", "08:40", "08:45", "HOTEL", "RIST-RIVA", "piedi"),
      spostamento("D3-E5", "13:30", "14:20", "RIST-TRENTO", "HOTEL", "auto"),
    ]);
    expect(ids(giorno(q.itinerario, "2026-06-13"))).toEqual(["D2-E1", "D2-E4", "D2-E5"]);
    expect(q.elementiARischio).toEqual(["D3-E2"]);
    expect(q.spiegazione).toContain("serve riposo");
    expect(q.livello).toBe("minimo");
  });
});

describe("CA-3 S10 volo perso (R2-VOL)", () => {
  const p = proponi("S10");

  it("itinerario invariato, D3-E9 a rischio, alternative come in S7, fattibile", () => {
    expect(p.itinerario).toEqual(itinerario("V-VOLO"));
    expect(p.modifiche).toEqual({ aggiunti: [], rimossi: [], modificati: [] });
    expect(p.elementiARischio).toEqual(["D3-E9"]);
    expect(p.alternative).toEqual(ALTERNATIVE_VOLO);
    expect(p.fattibile).toBe(true);
    const s7 = scenari1.find((s) => s.id === "S7");
    if (!s7) throw new Error("S7 assente");
    expect(p.alternative).toEqual(proponiRipianificazione(itinerario("V-VOLO"), 1, catalogo1, sorgente1, s7.imprevisto).alternative);
  });

  it("con l'arrivo previsto gli elementi prima dell'arrivo si trattano come un ritardo, anche il giorno dopo", () => {
    const viaggio = itinerario("versione-1");
    const g1 = viaggio.giorni[0];
    if (!g1) throw new Error("giorno assente");
    const volo: ElementoSpostamento = {
      id: "D1-E0",
      tipo: "spostamento",
      inizio: "13:00",
      fine: "14:05",
      orarioFisso: true,
      da: "AEROPORTO-FCO",
      a: "AEROPORTO-VRN",
      mezzo: "volo",
    };
    g1.elementi.unshift(volo);
    // Arrivo lo stesso giorno alle 17:00: D1-E1…D1-E3 iniziano dopo l'arrivo.
    const stesso = proponiImprevisto(viaggio, { tipo: "VOLO_PERSO", elementoId: "D1-E0", arrivoPrevisto: { data: "2026-06-12", orario: "17:00" } });
    expect(giorno(stesso.itinerario, "2026-06-12").map((e) => [e.id, e.inizio, e.fine])).toEqual([
      ["D1-E0", "13:00", "14:05"],
      ["D1-E1", "17:00", "17:10"],
      ["D1-E2", "17:10", "19:10"],
      ["D1-E3", "19:10", "19:20"],
    ]);
    expect(stesso.elementiARischio).toContain("D1-E0");
    // Arrivo il giorno dopo alle 10:00: anche D2-E1 e D2-E2, che iniziano prima, sono trattati come un ritardo.
    const dopo = proponiImprevisto(viaggio, { tipo: "VOLO_PERSO", elementoId: "D1-E0", arrivoPrevisto: { data: "2026-06-13", orario: "10:00" } });
    expect(dopo.impatto.elementiColpiti.map((c) => c.elementoId)).toEqual(["D1-E0", "D1-E1", "D1-E2", "D1-E3", "D2-E1", "D2-E2"]);
    const sabato = giorno(dopo.itinerario, "2026-06-13");
    for (const e of sabato) expect(e.inizio >= "10:00", `${e.id} ${e.inizio}`).toBe(true);
    expect(dopo.spiegazione).toContain("arrivo previsto il 2026-06-13 alle 10:00");
  });
});

describe("CA-4 S11 sciopero (R2-SCI)", () => {
  const p = proponi("S11");

  it("D3-E1 diventa auto 08:40–09:30, mantiene l'id, il resto invariato, fattibile", () => {
    expect(p.modifiche.aggiunti).toEqual([]);
    expect(p.modifiche.rimossi).toEqual([]);
    expect(p.modifiche.modificati.map((m) => m.dopo)).toEqual([
      spostamento("D3-E1", "08:40", "09:30", "HOTEL", "BUONCONSIGLIO", "auto"),
    ]);
    const prima = itinerario("V-BUS");
    expect(giorno(p.itinerario, "2026-06-14").slice(1)).toEqual(giorno(prima, "2026-06-14").slice(1));
    altriGiorniIdentici(prima, p.itinerario, "2026-06-14");
    expect(p.fattibile).toBe(true);
    expect(p.elementiARischio).toEqual([]);
    expect(p.alternative).toEqual([]);
    expect(p.spiegazione).toContain("sciopero dei mezzi pubblici");
  });

  it("senza un altro mezzo lo spostamento resta ed è a rischio (R-CAN-2 per ogni spostamento colpito)", () => {
    const q = proponiRipianificazione(itinerario("V-BUS"), 1, catalogoOndata2(), sorgenteOndata2(true), {
      tipo: "SCIOPERO",
      mezzo: "mezzi_pubblici",
      data: "2026-06-14",
      zonaId: "GARDA_NORD",
    });
    expect(ids(q.modifiche.modificati)).toEqual(["D3-E1"]);
    const altra = proponiRipianificazione(itinerario("V-BUS"), 1, catalogoOndata2(), sorgenteOndata2(true), {
      tipo: "SCIOPERO",
      mezzo: "treno",
      data: "2026-06-14",
    });
    expect(altra.modifiche).toEqual({ aggiunti: [], rimossi: [], modificati: [] });
  });
});

describe("CA-5 S12, S13 e S14 coincidono con i risultati fissati nel contratto", () => {
  it("S12 bagaglio smarrito (R2-BAG): via D2-E2, N1 A-ACQUISTI 09:00–10:30 a NEGOZIO-RIVA, fattibile", () => {
    const prima = itinerario("versione-1");
    const p = proponi("S12");
    expect(p.modifiche.rimossi).toEqual([attivita("D2-E2", "09:00", "13:00", "A-PONALE", "desiderata")]);
    expect(p.modifiche.aggiunti).toEqual([attivita("N1", "09:00", "10:30", "A-ACQUISTI", "irrinunciabile")]);
    expect(p.modifiche.modificati.map((m) => m.dopo)).toEqual([
      spostamento("D2-E1", "08:55", "09:00", "HOTEL", "NEGOZIO-RIVA", "piedi"),
      spostamento("D2-E3", "10:30", "10:35", "NEGOZIO-RIVA", "RIST-RIVA", "piedi"),
    ]);
    expect(giorno(p.itinerario, "2026-06-13").slice(3)).toEqual(giorno(prima, "2026-06-13").slice(3));
    altriGiorniIdentici(prima, p.itinerario, "2026-06-13");
    expect(p.itinerario.prossimoNumeroId).toBe(2);
    expect(p.fattibile).toBe(true);
    expect(p.problemi.filter((x) => x.gravita === "bloccante")).toEqual([]);
    expect(p.elementiARischio).toEqual([]);
    expect(p.alternative).toEqual([]);
    expect(p.livello).toBe("minimo");
    expect(p.spiegazione).toContain("servono 90 minuti liberi entro le 13:00 del 2026-06-13");
  });

  it("S13 documenti rubati (R2-DOC): itinerario invariato, non fattibile, FINESTRA_NON_TROVATA, Polizia di Stato, Rigenera", () => {
    const p = proponi("S13");
    expect(p.itinerario).toEqual(itinerario("versione-1"));
    expect(p.modifiche).toEqual({ aggiunti: [], rimossi: [], modificati: [] });
    expect(p.fattibile).toBe(false);
    expect(p.problemi.map((x) => [x.codice, x.gravita, x.elementi])).toEqual([[FINESTRA_NON_TROVATA, "bloccante", []]]);
    expect(p.elementiARischio).toEqual([]);
    expect(p.alternative).toEqual([
      { tipo: "denuncia_polizia", etichetta: "Polizia di Stato — denuncia", indirizzo: "https://www.poliziadistato.it" },
    ]);
    expect(p.livello).toBe("minimo");
    expect(p.spiegazione).toContain(`${RIGENERA} per il 2026-06-14`);
  });

  it("S14 stanchezza (R2-STA): la giornata è già al ritmo lento, itinerario invariato, fattibile", () => {
    const p = proponi("S14");
    expect(p.impatto.elementiColpiti.map((c) => c.elementoId)).toEqual(["D3-E2", "D3-E4", "D3-E6"]);
    expect(p.itinerario).toEqual(itinerario("versione-1"));
    expect(p.modifiche).toEqual({ aggiunti: [], rimossi: [], modificati: [] });
    expect(p.fattibile).toBe(true);
    expect(p.problemi).toEqual([]);
    expect(p.elementiARischio).toEqual([]);
    expect(p.alternative).toEqual([]);
    expect(p.livello).toBe("minimo");
    expect(p.spiegazione).toContain("la giornata ne ha già 2, quindi non c'è nulla da togliere");
  });
});

describe("R2-BAG, R2-DOC e R2-STA: le altre strade delle regole", () => {
  it("R2-BAG con uno spazio libero: aggiunge andata, acquisti e ritorno con id nuovi, senza togliere nulla", () => {
    const p = proponiImprevisto(itinerario("versione-1"), { tipo: "BAGAGLIO_SMARRITO", data: "2026-06-12", momento: "08:00" });
    expect(p.modifiche.rimossi).toEqual([]);
    expect(p.modifiche.modificati).toEqual([]);
    expect(p.modifiche.aggiunti).toEqual([
      spostamento("N1", "08:55", "09:00", "HOTEL", "NEGOZIO-RIVA", "piedi"),
      attivita("N2", "09:00", "10:30", "A-ACQUISTI", "irrinunciabile"),
      spostamento("N3", "10:30", "10:35", "NEGOZIO-RIVA", "HOTEL", "piedi"),
    ]);
    expect(p.fattibile).toBe(true);
  });

  it("R2-BAG: alternativa per la prenotazione del volo di arrivo, se c'è", () => {
    const viaggio = itinerario("versione-1");
    viaggio.giorni[0]?.elementi.unshift({
      id: "D1-E0",
      tipo: "spostamento",
      inizio: "07:00",
      fine: "08:05",
      orarioFisso: true,
      da: "AEROPORTO-FCO",
      a: "AEROPORTO-VRN",
      mezzo: "volo",
      prenotazione: { fornitore: "Compagnia aerea di esempio", codice: "AB456", linkGestione: "https://example.com/prenotazioni/AB456" },
    });
    const p = proponiImprevisto(viaggio, { tipo: "BAGAGLIO_SMARRITO", data: "2026-06-13", momento: "08:00" });
    // Il volo di prova non è collegato all'alloggio, quindi il primo giorno ha problemi e il volo è anche a rischio
    // (con la ricerca voli di R-ALT): qui conta la gestione della prenotazione del volo di arrivo.
    expect(p.alternative.filter((a) => a.tipo === "gestione_prenotazione")).toEqual([
      {
        tipo: "gestione_prenotazione",
        elementoId: "D1-E0",
        etichetta: "Gestisci la prenotazione AB456 (Compagnia aerea di esempio)",
        indirizzo: "https://example.com/prenotazioni/AB456",
      },
    ]);
    // Il volo di ritorno di V-VOLO non è un volo di arrivo.
    expect(proponiImprevisto(itinerario("V-VOLO"), { tipo: "BAGAGLIO_SMARRITO", data: "2026-06-13", momento: "08:00" }).alternative).toEqual([]);
  });

  it("R2-DOC il sabato con il volo di ritorno: denuncia al posto del trekking, D3-E9 a rischio perché serve un documento valido", () => {
    const p = proponiImprevisto(itinerario("V-VOLO"), { tipo: "DOCUMENTI_SMARRITI", data: "2026-06-13", momento: "08:30" });
    expect(ids(p.modifiche.rimossi)).toEqual(["D2-E2"]);
    expect(p.modifiche.aggiunti).toEqual([attivita("N1", "08:50", "11:50", "A-DENUNCIA", "irrinunciabile")]);
    expect(p.modifiche.modificati.map((m) => m.dopo)).toEqual([
      spostamento("D2-E1", "08:40", "08:50", "HOTEL", "COMMISSARIATO-RIVA", "piedi"),
      spostamento("D2-E3", "11:50", "12:00", "COMMISSARIATO-RIVA", "RIST-RIVA", "piedi"),
    ]);
    expect(p.elementiARischio).toEqual(["D3-E9"]);
    expect(p.spiegazione).toContain("serve un documento valido");
    expect(p.alternative).toEqual([
      ...ALTERNATIVE_VOLO,
      { tipo: "denuncia_polizia", etichetta: "Polizia di Stato — denuncia", indirizzo: "https://www.poliziadistato.it" },
    ]);
    expect(p.fattibile).toBe(true);
  });

  /** Versione 1 con una terza attività la domenica sera: il lungolago dalle 17:40 alle 19:40. */
  function conLungolago(priorita: ElementoAttivita["priorita"]): Viaggio {
    const viaggio = itinerario("versione-1");
    viaggio.giorni[2]?.elementi.push(
      spostamento("D3-E8", "17:30", "17:40", "HOTEL", "LUNGOLAGO", "piedi"),
      attivita("D3-E9", "17:40", "19:40", "A-LUNGOLAGO", priorita),
      spostamento("D3-E10", "19:40", "19:50", "LUNGOLAGO", "HOTEL", "piedi"),
    );
    return viaggio;
  }

  it("R2-STA con tre attività: senza opzionali si toglie quella che inizia prima (R-RIT-3), con R-SOS-5 per gli spostamenti", () => {
    const p = proponiImprevisto(conLungolago("desiderata"), { tipo: "STANCHEZZA", data: "2026-06-14" });
    expect(ids(p.modifiche.rimossi).sort()).toEqual(["D3-E2", "D3-E3"]);
    expect(p.modifiche.modificati.map((m) => m.dopo)).toEqual([spostamento("D3-E1", "09:00", "09:50", "HOTEL", "RIST-TRENTO", "auto")]);
    expect(p.spiegazione).toContain("ritmo lento");
  });

  it("R2-STA: si parte dalle opzionali", () => {
    const p = proponiImprevisto(conLungolago("opzionale"), { tipo: "STANCHEZZA", data: "2026-06-14" });
    expect(ids(p.modifiche.rimossi).sort()).toEqual(["D3-E10", "D3-E8", "D3-E9"]);
    expect(p.fattibile).toBe(true);
  });

  it("R2-STA: irrinunciabili, orari fissi e pasti restano", () => {
    const viaggio = conLungolago("desiderata");
    for (const e of viaggio.giorni[2]?.elementi ?? []) {
      if (e.id === "D3-E2") (e as ElementoAttivita).priorita = "irrinunciabile";
      if (e.id === "D3-E6") e.orarioFisso = true;
    }
    const p = proponiImprevisto(viaggio, { tipo: "STANCHEZZA", data: "2026-06-14" });
    expect(ids(p.modifiche.rimossi).sort()).toEqual(["D3-E10", "D3-E8", "D3-E9"]);
  });
});

describe("CA-6 con il profilo PR-1 su TRIP-DEMO-GARDA la pioggia sceglie un sostituto gastronomia o romantico", () => {
  const istantanea = istantaneaGarda();
  const profilo = profiloDiRiferimento("PR-1");
  const viaggio = generaBozza(profilo, istantanea, { idViaggio: "TRIP-DEMO-GARDA" }).viaggio;
  const sorgente = creaSorgenteDaDati({ tempiPercorrenza: istantanea.tempiPercorrenza, previsioni: [], chiusure: [] });
  const pioggia: ImprevistoEsteso = {
    tipo: "METEO_AVVERSO",
    zonaId: "GARDA_DINTORNI",
    data: "2026-06-13",
    inizio: "00:00",
    fine: "24:00",
    condizione: "pioggia",
  };
  const p = proponiRipianificazione(viaggio, 1, istantanea, sorgente, pioggia, { profilo });
  const stili = new Map(istantanea.attivita.map((a) => [a.id, a.stili ?? []]));

  it("ogni sostituta ha lo stile gastronomia o romantico, ed è fattibile", () => {
    expect(p.impatto.elementiColpiti.length).toBeGreaterThan(0);
    expect(p.modifiche.aggiunti.length).toBe(p.impatto.elementiColpiti.length);
    for (const e of p.modifiche.aggiunti) {
      const s = stili.get((e as ElementoAttivita).attivitaId) ?? [];
      expect(s.includes("gastronomia") || s.includes("romantico"), (e as ElementoAttivita).attivitaId).toBe(true);
    }
    expect(p.fattibile).toBe(true);
    expect(p.livello).toBe("minimo");
  });

  it("nella scelta il punteggio viene prima della categoria e dello spostamento: candidate in ordine di punteggio", () => {
    const righe = p.spiegazione.split("\n").filter((r) => r.startsWith("Per sostituire"));
    expect(righe.length).toBeGreaterThan(0);
    for (const riga of righe) {
      const punteggi = [...riga.matchAll(/punteggio (-?\d+)\)/g)].map((m) => Number(m[1]));
      expect(punteggi.length).toBeGreaterThan(1);
      expect([...punteggi].sort((a, b) => b - a)).toEqual(punteggi);
    }
  });

  it("su S1 il profilo PR-1 sceglie la cantina (gastronomia, romantico) invece del MAG", () => {
    const s1 = scenari1.find((s) => s.id === "S1");
    if (!s1) throw new Error("S1 assente");
    const con = proponiRipianificazione(itinerario("versione-1"), 1, catalogoOndata2(), sorgenteOndata2(), s1.imprevisto, { profilo });
    expect(con.modifiche.aggiunti).toEqual([attivita("N1", "10:00", "11:30", "A-CANTINA", "desiderata")]);
    expect(con.spiegazione).toContain("ha il punteggio più alto per le preferenze del viaggio (6 contro 0)");
    expect(con.fattibile).toBe(true);
    const senza = proponiRipianificazione(itinerario("versione-1"), 1, catalogoOndata2(), sorgenteOndata2(), s1.imprevisto);
    expect(senza.modifiche.aggiunti).toEqual([attivita("N1", "10:00", "12:00", "A-MAG", "desiderata")]);
  });

  it("le attività escluse dal profilo non sono candidate (PR-3 con bambini esclude la cantina)", () => {
    const s1 = scenari1.find((s) => s.id === "S1");
    if (!s1) throw new Error("S1 assente");
    const pr3 = profiloDiRiferimento("PR-3");
    const q = proponiRipianificazione(itinerario("versione-1"), 1, catalogoOndata2(), sorgenteOndata2(), s1.imprevisto, { profilo: pr3 });
    expect(q.modifiche.aggiunti.map((e) => (e as ElementoAttivita).attivitaId)).toEqual(["A-MAG"]);
    expect(q.spiegazione).not.toContain("«Degustazione in cantina» (");
  });
});

describe("CA-7 ogni proposta dichiara il livello; se il minimo non è fattibile offre Rigenera questa giornata", () => {
  it("S1–S14 hanno livello minimo; S6, S8 e S13 (non fattibili) offrono di rigenerare la giornata", () => {
    const tutte: [string, PropostaRipianificazioneEstesa | Proposta][] = [
      ...scenari1.map((s) => [s.id, proponiRipianificazione(itinerario(s.itinerario), 1, catalogo1, sorgente1, s.imprevisto)] as [string, Proposta]),
      ...["S9", "S10", "S11", "S12", "S13", "S14"].map((id) => [id, proponi(id)] as [string, PropostaRipianificazioneEstesa]),
    ];
    const nonFattibili: string[] = [];
    for (const [id, p] of tutte) {
      expect(p.livello, id).toBe("minimo");
      if (!p.fattibile) {
        nonFattibili.push(id);
        expect(p.spiegazione, id).toContain(RIGENERA);
      } else {
        expect(p.spiegazione, id).not.toContain(RIGENERA);
      }
    }
    expect(nonFattibili).toEqual(["S6", "S8", "S13"]);
  });

  it("la giornata da rigenerare è quella coinvolta (S8: 2026-06-14)", () => {
    const s8 = scenari1.find((s) => s.id === "S8");
    if (!s8) throw new Error("S8 assente");
    const p = proponiRipianificazione(itinerario(s8.itinerario), 1, catalogo1, sorgente1, s8.imprevisto);
    expect(p.spiegazione).toContain(`${RIGENERA} per il 2026-06-14`);
  });
});

describe("CA-8 alternative di salute e documenti costruite senza aprirle né chiamare la rete", () => {
  afterEach(() => vi.restoreAllMocks());

  it("Farmacie vicine, Pronto soccorso vicino e Polizia di Stato, senza nessuna chiamata di rete", () => {
    const rete = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      throw new Error("chiamata di rete non ammessa");
    });
    const s9 = proponi("S9");
    const s13 = proponi("S13");
    expect(rete).not.toHaveBeenCalled();
    expect(s9.alternative).toEqual([
      { tipo: "farmacie_vicine", etichetta: "Farmacie vicine", indirizzo: "https://www.google.com/maps/search/?api=1&query=farmacie%20Alto%20Garda" },
      {
        tipo: "pronto_soccorso_vicino",
        etichetta: "Pronto soccorso vicino",
        indirizzo: "https://www.google.com/maps/search/?api=1&query=pronto%20soccorso%20Alto%20Garda",
      },
    ]);
    expect(s13.alternative.map((a) => a.indirizzo)).toEqual(["https://www.poliziadistato.it"]);
    expect(s9.spiegazione).toContain("Farmacie vicine: https://www.google.com/maps/search/?api=1&query=farmacie%20Alto%20Garda");
  });

  it("i sorgenti della ripianificazione non usano rete, processi o file", () => {
    const cartella = new URL("../../src/replanning/", import.meta.url);
    const sorgenti = readdirSync(cartella).filter((f) => f.endsWith(".ts"));
    expect(sorgenti).toContain("ondata2.ts");
    for (const file of sorgenti) {
      const codice = readFileSync(new URL(file, cartella), "utf8");
      expect(codice, file).not.toMatch(/\bfetch\s*\(|node:http|node:https|node:net|node:child_process|node:fs|XMLHttpRequest|WebSocket/);
    }
  });
});

describe("determinismo e dati", () => {
  it("a parità di input le proposte S9–S14 sono identiche e l'input non cambia", () => {
    for (const id of ["S9", "S10", "S11", "S12", "S13", "S14"]) {
      const s = scenarioOndata2(id);
      const viaggio = itinerario(s.itinerario);
      const copia = structuredClone(viaggio);
      const a = proponiRipianificazione(viaggio, 1, catalogoOndata2(), sorgenteOndata2(id === "S11"), s.imprevisto);
      const b = proponiRipianificazione(viaggio, 1, catalogoOndata2(), sorgenteOndata2(id === "S11"), s.imprevisto);
      expect(a, id).toEqual(b);
      expect(viaggio, id).toEqual(copia);
    }
  });

  it("i dati della §8.5 sono in un file separato e i dati di riferimento esistenti non li contengono", () => {
    const contesto = contestoOndata2();
    expect(contesto.tempiPercorrenza.filter((t) => t.da === "HOTEL" && t.a === "NEGOZIO-RIVA")).toEqual([
      { da: "HOTEL", a: "NEGOZIO-RIVA", mezzo: "piedi", minuti: 5 },
    ]);
    expect(leggi<Catalogo>("catalogo.json").attivita.map((a) => a.id)).not.toContain("A-ACQUISTI");
    expect(leggi<Catalogo>("estensioni/catalogo-esteso.json").attivita.map((a) => a.id)).not.toContain("A-DENUNCIA");
    expect(leggi<DatiContesto>("contesto.json").tempiPercorrenza.some((t) => t.mezzo === "mezzi_pubblici")).toBe(false);
  });
});
