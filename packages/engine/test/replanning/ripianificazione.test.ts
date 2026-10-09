import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { creaSorgenteDaDati } from "../../src/context/index.js";
import { applicaProposta, creaStorico, elencaVersioni, rifiutaProposta } from "../../src/history/index.js";
import type {
  Catalogo,
  DatiContesto,
  Elemento,
  ElementoAttivita,
  Imprevisto,
  Proposta,
  SorgenteDatiContesto,
  Viaggio,
} from "../../src/model/index.js";
import {
  arricchisciSorgente,
  costruisciAlternative,
  proponiRipianificazione,
  type PropostaRipianificazione,
} from "../../src/replanning/index.js";

// Dati di riferimento (docs/requirements/dati-di-riferimento.md), letti come oggetti del modello.
const leggi = <T>(file: string): T =>
  JSON.parse(readFileSync(new URL(`../../data/reference/${file}`, import.meta.url), "utf8")) as T;

interface ScenarioImprevisto {
  id: string;
  titolo: string;
  itinerario: string;
  imprevisto: Imprevisto;
}

const FILE_ITINERARIO: Record<string, string> = {
  "versione-1": "versione-1.json",
  "V-IRR": "variante-v-irr.json",
  "V-FISSO": "variante-v-fisso.json",
  "V-VOLO": "variante-v-volo.json",
};

const catalogo = leggi<Catalogo>("catalogo.json");
const datiContesto = leggi<DatiContesto>("contesto.json");
const sorgente = creaSorgenteDaDati(datiContesto);
const scenari = leggi<ScenarioImprevisto[]>("scenari-imprevisti.json");

function itinerario(nome: string): Viaggio {
  const file = FILE_ITINERARIO[nome];
  if (!file) throw new Error(`Itinerario sconosciuto: ${nome}`);
  return leggi<Viaggio>(file);
}

function scenario(id: string): { viaggio: Viaggio; imprevisto: Imprevisto } {
  const trovato = scenari.find((s) => s.id === id);
  if (!trovato) throw new Error(`Scenario sconosciuto: ${id}`);
  return { viaggio: itinerario(trovato.itinerario), imprevisto: trovato.imprevisto };
}

function proponi(id: string, s: SorgenteDatiContesto = sorgente, varia?: (v: Viaggio) => void): PropostaRipianificazione {
  const { viaggio, imprevisto } = scenario(id);
  varia?.(viaggio);
  return proponiRipianificazione(viaggio, 1, catalogo, s, imprevisto);
}

/** Gli elementi di un giorno come `[id, inizio, fine]`. */
const orari = (viaggio: Viaggio, data: string): [string, string, string][] =>
  (viaggio.giorni.find((g) => g.data === data)?.elementi ?? []).map((e) => [e.id, e.inizio, e.fine]);

const ids = (elementi: readonly { id: string }[]): string[] => elementi.map((e) => e.id);

function elemento(viaggio: Viaggio, id: string): Elemento {
  for (const g of viaggio.giorni) {
    const e = g.elementi.find((x) => x.id === id);
    if (e) return e;
  }
  throw new Error(`Elemento ${id} assente`);
}

/** Il resto del viaggio (gli altri giorni e i dati generali) resta identico. */
function altriGiorniIdentici(prima: Viaggio, dopo: Viaggio, data: string): void {
  expect(dopo.giorni.filter((g) => g.data !== data)).toEqual(prima.giorni.filter((g) => g.data !== data));
}

const DOM = "2026-06-14";

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

describe("proponiRipianificazione: criteri di accettazione di REQ-REPLAN-002", () => {
  it("CA-1 S1 pioggia: sostituzione con A-MAG, la proposta coincide con P-S1", () => {
    const attesa = leggi<Proposta>("proposta-p-s1.json");
    const p = proponi("S1");

    expect(p.versioneBase).toBe(attesa.versioneBase);
    expect(p.origine).toEqual(attesa.origine);
    expect(p.impatto.elementiColpiti.map((c) => c.elementoId)).toEqual(["D2-E2"]);
    expect(p.modifiche).toEqual(attesa.modifiche);
    expect(p.itinerario).toEqual(attesa.itinerario);
    expect(p.fattibile).toBe(true);
    expect(p.problemi).toEqual([]);
    expect(p.elementiARischio).toEqual([]);
    expect(p.alternative).toEqual([]);
    // Finestra 08:40–13:20 da HOTEL a RIST-RIVA; candidate A-MAG (10 + 5) e A-CANTINA (15 + 15).
    expect(p.spiegazione).toContain("tra le 08:40 e le 13:20");
    expect(p.spiegazione).toContain("«Visita al MAG» (10:00–12:00, spostamenti 10 + 5 minuti)");
    expect(p.spiegazione).toContain("«Degustazione in cantina» (10:00–11:30, spostamenti 15 + 15 minuti)");
    expect(p.spiegazione).toContain("minor tempo di spostamento");
  });

  it("CA-2 S2 ritardo breve: posticipo di D3-E1…D3-E4, D3-E5…D3-E7 invariati, fattibile", () => {
    const { viaggio } = scenario("S2");
    const p = proponi("S2");
    expect(orari(p.itinerario, DOM)).toEqual([
      ["D3-E1", "09:00", "10:20"],
      ["D3-E2", "10:20", "12:20"],
      ["D3-E3", "12:20", "12:30"],
      ["D3-E4", "12:30", "13:30"],
      ["D3-E5", "13:30", "13:45"],
      ["D3-E6", "14:00", "16:30"],
      ["D3-E7", "16:30", "17:20"],
    ]);
    expect(ids(p.modifiche.modificati)).toEqual(["D3-E1", "D3-E2", "D3-E3", "D3-E4"]);
    expect(p.modifiche.aggiunti).toEqual([]);
    expect(p.modifiche.rimossi).toEqual([]);
    altriGiorniIdentici(viaggio, p.itinerario, DOM);
    expect(p.fattibile).toBe(true);
    expect(p.problemi).toEqual([]);
    expect(p.elementiARischio).toEqual([]);
    expect(p.alternative).toEqual([]);
  });

  it("CA-3 S3 foratura: il posticipo non basta, si rimuove D3-E2 e il resto torna in orario", () => {
    const { viaggio } = scenario("S3");
    const p = proponi("S3");
    expect(orari(p.itinerario, DOM)).toEqual([
      ["D3-E1", "09:00", "11:50"],
      ["D3-E3", "12:00", "12:10"],
      ["D3-E4", "12:15", "13:15"],
      ["D3-E5", "13:30", "13:45"],
      ["D3-E6", "14:00", "16:30"],
      ["D3-E7", "16:30", "17:20"],
    ]);
    expect(ids(p.modifiche.rimossi)).toEqual(["D3-E2"]);
    expect(ids(p.modifiche.modificati)).toEqual(["D3-E1"]);
    expect(p.modifiche.aggiunti).toEqual([]);
    altriGiorniIdentici(viaggio, p.itinerario, DOM);
    expect(p.fattibile).toBe(true);
    expect(p.problemi).toEqual([]);
    expect(p.elementiARischio).toEqual([]);
    expect(p.alternative).toEqual([]);
    // Il posticipo non funziona perché il castello la domenica chiude alle 13:00.
    expect(p.spiegazione).toContain("(11:50–13:50)");
    expect(p.spiegazione).toContain("09:30–13:00");
  });

  it("CA-4 S4 chiusura del MUSE: nessuna candidata, D3-E6 e D3-E7 rimossi, D3-E5 auto RIST-TRENTO → HOTEL 13:30–14:20", () => {
    const { viaggio } = scenario("S4");
    const p = proponi("S4");
    expect(ids(p.modifiche.rimossi)).toEqual(["D3-E6", "D3-E7"]);
    expect(p.modifiche.aggiunti).toEqual([]);
    expect(p.modifiche.modificati).toHaveLength(1);
    expect(p.modifiche.modificati[0]?.dopo).toEqual({
      id: "D3-E5",
      tipo: "spostamento",
      inizio: "13:30",
      fine: "14:20",
      orarioFisso: false,
      da: "RIST-TRENTO",
      a: "HOTEL",
      mezzo: "auto",
    });
    expect(orari(p.itinerario, DOM).map(([id]) => id)).toEqual(["D3-E1", "D3-E2", "D3-E3", "D3-E4", "D3-E5"]);
    altriGiorniIdentici(viaggio, p.itinerario, DOM);
    expect(p.itinerario.prossimoNumeroId).toBe(1);
    expect(p.fattibile).toBe(true);
    expect(p.problemi).toEqual([]);
    expect(p.elementiARischio).toEqual([]);
    expect(p.alternative).toEqual([]);
    // Il castello è già nell'itinerario, il pranzo è un pasto.
    expect(p.spiegazione).toContain("«Visita al Castello del Buonconsiglio» è già nell'itinerario");
    expect(p.spiegazione).toContain("«Pranzo in centro» è un pasto");
  });

  it("CA-5 S5 cancellazione senza altro mezzo: itinerario invariato, D3-E1 a rischio, nessuna alternativa", () => {
    const { viaggio } = scenario("S5");
    const p = proponi("S5");
    expect(p.itinerario).toEqual(viaggio);
    expect(p.modifiche).toEqual({ aggiunti: [], rimossi: [], modificati: [] });
    expect(p.fattibile).toBe(true);
    expect(p.problemi).toEqual([]);
    expect(p.elementiARischio).toEqual(["D3-E1"]);
    expect(p.alternative).toEqual([]);
    expect(p.spiegazione).toContain("Come vuoi procedere?");
  });

  it("CA-6 S6 castello irrinunciabile: nessuna rimozione funziona, posticipo con gli orari di S3, non fattibile", () => {
    const p = proponi("S6");
    expect(orari(p.itinerario, DOM)).toEqual([
      ["D3-E1", "09:00", "11:50"],
      ["D3-E2", "11:50", "13:50"],
      ["D3-E3", "13:50", "14:00"],
      ["D3-E4", "14:00", "15:00"],
      ["D3-E5", "15:00", "15:15"],
      ["D3-E6", "15:15", "17:45"],
      ["D3-E7", "17:45", "18:35"],
    ]);
    expect(p.modifiche.rimossi).toEqual([]);
    expect(p.fattibile).toBe(false);
    expect(p.problemi.map((x) => [x.codice, x.gravita, x.elementi])).toEqual([
      ["FUORI_ORARIO", "bloccante", ["D3-E2"]],
      ["FUORI_ORARIO", "bloccante", ["D3-E4"]],
    ]);
    expect(p.elementiARischio).toEqual(["D3-E2", "D3-E4"]);
    expect(p.alternative).toEqual([]);
    expect(p.spiegazione).toContain("Come vuoi procedere?");
  });

  it("CA-7 S7 volo cancellato: itinerario invariato, D3-E9 a rischio, alternative con link", () => {
    const { viaggio } = scenario("S7");
    const p = proponi("S7");
    expect(p.itinerario).toEqual(viaggio);
    expect(p.modifiche).toEqual({ aggiunti: [], rimossi: [], modificati: [] });
    expect(p.fattibile).toBe(true);
    expect(p.problemi).toEqual([]);
    expect(p.elementiARischio).toEqual(["D3-E9"]);
    expect(p.alternative).toEqual(ALTERNATIVE_VOLO);
  });

  it("CA-8 S8 ritardo verso l'aeroporto: D3-E8 17:30–19:45, D3-E9 fermo, sovrapposizione, non fattibile", () => {
    const p = proponi("S8");
    expect(orari(p.itinerario, DOM).slice(-2)).toEqual([
      ["D3-E8", "17:30", "19:45"],
      ["D3-E9", "19:30", "20:35"],
    ]);
    expect(ids(p.modifiche.modificati)).toEqual(["D3-E8"]);
    expect(p.fattibile).toBe(false);
    expect(p.problemi.map((x) => [x.codice, x.gravita, x.elementi])).toEqual([
      ["SOVRAPPOSIZIONE", "bloccante", ["D3-E8", "D3-E9"]],
    ]);
    expect(p.elementiARischio).toEqual(["D3-E8", "D3-E9"]);
    expect(p.alternative).toEqual(ALTERNATIVE_VOLO);
  });

  it("CA-9 variante di S4 con D3-E6 irrinunciabile: itinerario invariato, LUOGO_CHIUSO su D3-E6, a rischio", () => {
    const { viaggio } = scenario("S4");
    const p = proponi("S4", sorgente, (v) => {
      (elemento(v, "D3-E6") as ElementoAttivita).priorita = "irrinunciabile";
    });
    const atteso = JSON.parse(JSON.stringify(viaggio)) as Viaggio;
    (elemento(atteso, "D3-E6") as ElementoAttivita).priorita = "irrinunciabile";
    expect(p.itinerario).toEqual(atteso);
    expect(p.modifiche).toEqual({ aggiunti: [], rimossi: [], modificati: [] });
    expect(p.fattibile).toBe(false);
    expect(p.problemi.map((x) => [x.codice, x.gravita, x.elementi])).toEqual([["LUOGO_CHIUSO", "bloccante", ["D3-E6"]]]);
    expect(p.elementiARischio).toEqual(["D3-E6"]);
    expect(p.spiegazione).toContain("irrinunciabile");
    expect(p.spiegazione).toContain("Come vuoi procedere?");
  });

  it("CA-10 variante di S5 con mezzi pubblici HOTEL–BUONCONSIGLIO in 80 minuti: D3-E1 09:00–10:20, posticipo come S2", () => {
    const conMezzi = creaSorgenteDaDati({
      ...datiContesto,
      tempiPercorrenza: [
        ...datiContesto.tempiPercorrenza,
        { da: "HOTEL", a: "BUONCONSIGLIO", mezzo: "mezzi_pubblici", minuti: 80 },
      ],
    });
    const p = proponi("S5", conMezzi);
    expect(elemento(p.itinerario, "D3-E1")).toEqual({
      id: "D3-E1",
      tipo: "spostamento",
      inizio: "09:00",
      fine: "10:20",
      orarioFisso: false,
      da: "HOTEL",
      a: "BUONCONSIGLIO",
      mezzo: "mezzi_pubblici",
    });
    expect(orari(p.itinerario, DOM)).toEqual(orari(proponi("S2").itinerario, DOM));
    expect(ids(p.modifiche.modificati)).toEqual(["D3-E1", "D3-E2", "D3-E3", "D3-E4"]);
    expect(p.fattibile).toBe(true);
    expect(p.problemi).toEqual([]);
    expect(p.elementiARischio).toEqual([]);
    expect(p.alternative).toEqual([]);
  });

  it("CA-11 un elemento a orario fisso colpito da un ritardo resta al suo orario ed è a rischio (S8)", () => {
    const { viaggio } = scenario("S8");
    const p = proponi("S8");
    expect(p.impatto.elementiColpiti.find((c) => c.elementoId === "D3-E9")).toMatchObject({
      inizioSlittato: "19:45",
      fineSlittata: "20:50",
    });
    expect(elemento(p.itinerario, "D3-E9")).toEqual(elemento(viaggio, "D3-E9"));
    expect(p.elementiARischio).toContain("D3-E9");
    expect(p.spiegazione).toContain("è a orario fisso");
  });

  describe("CA-12 la spiegazione nomina elementi cambiati, orari prima e dopo, imprevisto, elementi a rischio e alternative", () => {
    const attese: Record<string, string> = {
      S1: "pioggia in zona Alto Garda il 2026-06-13 dalle 08:00 alle 13:00",
      S2: "ritardo di 30 minuti il 2026-06-14 alle 09:20 (traffico)",
      S3: "ritardo di 120 minuti il 2026-06-14 alle 09:20 (foratura dell'auto a noleggio)",
      S4: "chiusura straordinaria di «MUSE Museo delle Scienze» il 2026-06-14 per tutta la giornata",
      S5: "cancellazione dello spostamento D3-E1",
      S6: "ritardo di 120 minuti il 2026-06-14 alle 09:20 (foratura dell'auto a noleggio)",
      S7: "cancellazione dello spostamento D3-E9",
      S8: "ritardo di 60 minuti il 2026-06-14 alle 17:40 (coda in autostrada)",
    };
    for (const s of scenari) {
      it(`${s.id} ${s.titolo}`, () => {
        const p = proponi(s.id);
        const testo = p.spiegazione;
        expect(testo).toContain(`Imprevisto: ${s.imprevisto.tipo === "METEO_AVVERSO" ? "meteo avverso: " : ""}`);
        expect(testo).toContain(attese[s.id]);
        for (const e of [...p.modifiche.aggiunti, ...p.modifiche.rimossi]) {
          expect(testo).toContain(e.id);
          expect(testo).toContain(`${e.inizio}–${e.fine}`);
        }
        for (const m of p.modifiche.modificati) {
          expect(testo).toContain(`Modificato ${m.id}`);
          expect(testo).toContain(`${m.prima.inizio}–${m.prima.fine}`);
          expect(testo).toContain(`${m.dopo.inizio}–${m.dopo.fine}`);
        }
        if (p.elementiARischio.length > 0) expect(testo).toContain("Elementi a rischio:");
        for (const id of p.elementiARischio) expect(testo).toMatch(new RegExp(`^- ${id}[ ,]`, "m"));
        for (const a of p.alternative) {
          expect(testo).toContain(a.etichetta);
          expect(testo).toContain(a.indirizzo);
        }
        expect(testo).toContain(p.fattibile ? "la proposta è fattibile" : "la proposta non è fattibile");
      });
    }
  });

  it("CA-13 a parità di input la proposta è identica, compresi id nuovi e spiegazione; l'input non cambia", () => {
    for (const s of scenari) {
      const { viaggio, imprevisto } = scenario(s.id);
      const copia = JSON.parse(JSON.stringify(viaggio)) as Viaggio;
      const a = proponiRipianificazione(viaggio, 1, catalogo, sorgente, imprevisto);
      const b = proponiRipianificazione(viaggio, 1, catalogo, creaSorgenteDaDati(datiContesto), imprevisto);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      expect(viaggio).toEqual(copia);
    }
    expect(proponi("S1").modifiche.aggiunti.map((e) => e.id)).toEqual(["N1"]);
  });
});

describe("proponiRipianificazione: altre regole", () => {
  it("R-5 la proposta diventa versione solo se accettata; il rifiuto non crea versioni", () => {
    const { viaggio } = scenario("S1");
    const p = proponi("S1");
    const creato = creaStorico(viaggio);
    if (!creato.ok) throw new Error("storico non creato");
    expect(rifiutaProposta(creato.storico, p).storico.versioni).toHaveLength(1);
    const esito = applicaProposta(creato.storico, p, "Alice", { data: "2026-06-13", ora: "07:30" });
    expect(esito.esito).toBe("versione_creata");
    expect(elencaVersioni(esito.storico).map((v) => v.causa)).toEqual([
      "Itinerario iniziale",
      "Meteo avverso: pioggia in GARDA_NORD il 2026-06-13 08:00–13:00",
    ]);
  });

  it("R-8 gli id nuovi continuano dal prossimo numero del viaggio", () => {
    const p = proponi("S1", sorgente, (v) => {
      v.prossimoNumeroId = 7;
    });
    expect(p.modifiche.aggiunti.map((e) => e.id)).toEqual(["N7"]);
    expect(p.itinerario.prossimoNumeroId).toBe(8);
  });

  it("R-SOS-4 a parità di condizioni vince la stessa categoria", () => {
    // Variante: A-CANTINA diventa di categoria natura, quindi vince anche se ha più spostamenti.
    const variato: Catalogo = {
      ...catalogo,
      attivita: catalogo.attivita.map((a) => (a.id === "A-CANTINA" ? { ...a, categoria: "natura" } : a)),
    };
    const { viaggio, imprevisto } = scenario("S1");
    const p = proponiRipianificazione(viaggio, 1, variato, sorgente, imprevisto);
    expect(p.modifiche.aggiunti).toMatchObject([{ id: "N1", attivitaId: "A-CANTINA", inizio: "10:00", fine: "11:30" }]);
    expect(p.fattibile).toBe(true);
  });

  it("R-7 un'attività irrinunciabile sotto la pioggia resta al suo posto ed è a rischio", () => {
    const p = proponi("S1", sorgente, (v) => {
      (elemento(v, "D2-E2") as ElementoAttivita).priorita = "irrinunciabile";
    });
    expect(p.modifiche).toEqual({ aggiunti: [], rimossi: [], modificati: [] });
    expect(p.elementiARischio).toEqual(["D2-E2"]);
    expect(p.problemi.map((x) => [x.codice, x.gravita])).toEqual([["METEO_AVVERSO", "avviso"]]);
    expect(p.spiegazione).toContain("Come vuoi procedere?");
  });

  it("R-2 un'attività a orario fisso colpita non viene spostata ed è a rischio", () => {
    const p = proponi("S1", sorgente, (v) => {
      elemento(v, "D2-E2").orarioFisso = true;
    });
    expect(p.modifiche).toEqual({ aggiunti: [], rimossi: [], modificati: [] });
    expect(p.elementiARischio).toEqual(["D2-E2"]);
  });

  describe("R-RIT-3 scelta tra insiemi della stessa dimensione", () => {
    // Variante: ritardo di 200 minuti sabato durante D2-E1. Togliere D2-E2 (trekking) oppure D2-E4 (pranzo)
    // rende la giornata fattibile: due insiemi di una sola attività.
    const ritardoSabato: Imprevisto = { tipo: "RITARDO", data: "2026-06-13", momento: "08:50", minuti: 200, motivo: "prova" };
    const pranzoNonPasto: Catalogo = {
      ...catalogo,
      attivita: catalogo.attivita.map((a) => (a.id === "A-PRANZO-RIVA" ? { ...a, categoria: "gastronomia" } : a)),
    };

    it("prima si evita di togliere un pasto", () => {
      const p = proponiRipianificazione(itinerario("versione-1"), 1, catalogo, sorgente, ritardoSabato);
      expect(ids(p.modifiche.rimossi)).toEqual(["D2-E2"]);
      expect(p.fattibile).toBe(true);
    });

    it("poi si toglie prima un'opzionale di una desiderata", () => {
      const viaggio = itinerario("versione-1");
      (elemento(viaggio, "D2-E4") as ElementoAttivita).priorita = "opzionale";
      const p = proponiRipianificazione(viaggio, 1, pranzoNonPasto, sorgente, ritardoSabato);
      expect(ids(p.modifiche.rimossi)).toEqual(["D2-E4"]);
      expect(p.fattibile).toBe(true);
    });

    it("poi si toglie l'attività che inizia prima", () => {
      const p = proponiRipianificazione(itinerario("versione-1"), 1, pranzoNonPasto, sorgente, ritardoSabato);
      expect(ids(p.modifiche.rimossi)).toEqual(["D2-E2"]);
      expect(orari(p.itinerario, "2026-06-13")[0]).toEqual(["D2-E1", "08:40", "12:20"]);
    });
  });

  it("R-ALT-2 per uno spostamento in treno si propone la ricerca su Trainline", () => {
    const viaggio = itinerario("versione-1");
    const treno: Elemento = { id: "T1", tipo: "spostamento", inizio: "09:00", fine: "10:00", da: "HOTEL", a: "MUSE", mezzo: "treno" };
    expect(costruisciAlternative([{ data: viaggio.dataFine, elemento: treno }], catalogo)).toEqual([
      {
        tipo: "ricerca_treni",
        elementoId: "T1",
        etichetta: "Cerca treni da Hotel sul lago, Riva del Garda a MUSE Museo delle Scienze il 2026-06-14 su Trainline",
        indirizzo: "https://www.thetrainline.com/it",
      },
    ]);
  });

  it("R-3 la sorgente arricchita vede l'imprevisto come previsione o chiusura, senza cambiare quella originale", () => {
    const { imprevisto: pioggia } = scenario("S1");
    const { imprevisto: chiusura } = scenario("S4");
    expect(arricchisciSorgente(sorgente, pioggia).previsioni("GARDA_NORD", "2026-06-13")).toEqual([
      { zonaId: "GARDA_NORD", data: "2026-06-13", inizio: "08:00", fine: "13:00", condizione: "pioggia" },
    ]);
    expect(arricchisciSorgente(sorgente, chiusura).chiusure("MUSE", DOM)).toEqual([
      { luogoId: "MUSE", data: DOM, inizio: "00:00", fine: "24:00" },
    ]);
    expect(sorgente.previsioni("GARDA_NORD", "2026-06-13")).toEqual([]);
    expect(sorgente.chiusure("MUSE", DOM)).toEqual([]);
  });

  it("un imprevisto che non tocca nessun elemento non cambia l'itinerario", () => {
    const viaggio = itinerario("versione-1");
    const p = proponiRipianificazione(viaggio, 1, catalogo, sorgente, {
      tipo: "METEO_AVVERSO",
      zonaId: "TRENTO",
      data: "2026-06-13",
      inizio: "08:00",
      fine: "13:00",
      condizione: "pioggia",
    });
    expect(p.itinerario).toEqual(viaggio);
    expect(p.fattibile).toBe(true);
    expect(p.spiegazione).toContain("Nessun elemento dell'itinerario è colpito.");
  });

  it("un ritardo che porterebbe oltre la mezzanotte dà una proposta non fattibile con FUORI_GIORNATA", () => {
    const viaggio = itinerario("versione-1");
    const p = proponiRipianificazione(viaggio, 1, catalogo, sorgente, {
      tipo: "RITARDO",
      data: "2026-06-12",
      momento: "16:05",
      minuti: 600,
      motivo: "prova",
    });
    expect(p.fattibile).toBe(false);
    expect(p.problemi.some((x) => x.codice === "FUORI_GIORNATA")).toBe(true);
  });
});
