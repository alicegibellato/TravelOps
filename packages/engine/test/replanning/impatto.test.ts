import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Catalogo, Imprevisto, ImprevistoRitardo, Viaggio } from "../../src/model/index.js";
import { calcolaImpatto, type ImpattoDettagliato } from "../../src/replanning/index.js";

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

function impattoScenario(id: string): ImpattoDettagliato {
  const { viaggio, imprevisto } = scenario(id);
  return calcolaImpatto(viaggio, catalogo, imprevisto);
}

const ids = (impatto: ImpattoDettagliato): string[] => impatto.elementiColpiti.map((e) => e.elementoId);

const orariSlittati = (impatto: ImpattoDettagliato): [string, string | undefined, string | undefined][] =>
  impatto.elementiColpiti.map((e) => [e.elementoId, e.inizioSlittato, e.fineSlittata]);

const ritardo = (data: string, momento: string, minuti: number, motivo = "prova"): ImprevistoRitardo => ({
  tipo: "RITARDO",
  data,
  momento,
  minuti,
  motivo,
});

describe("calcolaImpatto: criteri di accettazione di REQ-REPLAN-001", () => {
  it("CA-1 S1 pioggia: colpito solo D2-E2, con motivo meteo avverso", () => {
    const impatto = impattoScenario("S1");

    expect(impatto.elementiColpiti).toEqual([
      {
        elementoId: "D2-E2",
        tipoImprevisto: "METEO_AVVERSO",
        data: "2026-06-13",
        motivo:
          "Meteo avverso (pioggia) in zona Alto Garda il 2026-06-13 dalle 08:00 alle 13:00: " +
          "l'attività «Trekking sul Sentiero del Ponale» (09:00–13:00) è all'aperto.",
      },
    ]);
  });

  it("CA-2 S2 ritardo breve: colpiti D3-E1…D3-E4 con gli orari slittati, D3-E5…D3-E7 no", () => {
    const impatto = impattoScenario("S2");

    expect(orariSlittati(impatto)).toEqual([
      ["D3-E1", "09:00", "10:20"],
      ["D3-E2", "10:20", "12:20"],
      ["D3-E3", "12:20", "12:30"],
      ["D3-E4", "12:30", "13:30"],
    ]);
    expect(ids(impatto)).not.toContain("D3-E5");
    expect(ids(impatto)).not.toContain("D3-E6");
    expect(ids(impatto)).not.toContain("D3-E7");
    expect(impatto.elementiColpiti.every((e) => e.tipoImprevisto === "RITARDO")).toBe(true);
    expect(impatto.elementiColpiti[0]?.motivo).toBe(
      "Ritardo di 30 minuti alle 09:20 (traffico): l'elemento è in corso e finirebbe alle 10:20 invece che alle 09:50.",
    );
    expect(impatto.elementiColpiti[1]?.motivo).toBe(
      "Ritardo di 30 minuti alle 09:20 (traffico): slitterebbe da 10:00–12:00 a 10:20–12:20.",
    );
  });

  it("CA-3 S3 foratura: colpiti D3-E1…D3-E7 con gli orari slittati, nessun elemento dei giorni 1 e 2", () => {
    const impatto = impattoScenario("S3");

    expect(orariSlittati(impatto)).toEqual([
      ["D3-E1", "09:00", "11:50"],
      ["D3-E2", "11:50", "13:50"],
      ["D3-E3", "13:50", "14:00"],
      ["D3-E4", "14:00", "15:00"],
      ["D3-E5", "15:00", "15:15"],
      ["D3-E6", "15:15", "17:45"],
      ["D3-E7", "17:45", "18:35"],
    ]);
    expect(impatto.elementiColpiti.every((e) => e.data === "2026-06-14")).toBe(true);
    expect(ids(impatto).some((id) => id.startsWith("D1-") || id.startsWith("D2-"))).toBe(false);
    expect(impatto.elementiColpiti.every((e) => e.motivo.startsWith("Ritardo di 120 minuti alle 09:20 (foratura dell'auto a noleggio)"))).toBe(true);
  });

  it("CA-4 S4 chiusura del MUSE: colpito solo D3-E6", () => {
    const impatto = impattoScenario("S4");

    expect(impatto.elementiColpiti).toEqual([
      {
        elementoId: "D3-E6",
        tipoImprevisto: "CHIUSURA_LUOGO",
        data: "2026-06-14",
        motivo:
          "Chiusura del luogo «MUSE Museo delle Scienze» il 2026-06-14 per tutta la giornata: " +
          "l'attività «Visita al MUSE» (14:00–16:30) si svolge lì.",
      },
    ]);
  });

  it("CA-5 S5 cancellazione: colpito solo D3-E1", () => {
    const impatto = impattoScenario("S5");

    expect(impatto.elementiColpiti).toEqual([
      {
        elementoId: "D3-E1",
        tipoImprevisto: "CANCELLAZIONE_SPOSTAMENTO",
        data: "2026-06-14",
        motivo:
          "Cancellazione dello spostamento: lo spostamento in auto da «Hotel sul lago, Riva del Garda» " +
          "a «Castello del Buonconsiglio» del 2026-06-14 (09:00–09:50) è cancellato.",
      },
    ]);
  });

  it("CA-6 S6: impatto identico a S3, la priorità irrinunciabile non cambia l'impatto", () => {
    const { viaggio } = scenario("S6");
    const castello = viaggio.giorni[2]?.elementi.find((e) => e.id === "D3-E2");
    expect(castello?.tipo === "attivita" ? castello.priorita : undefined).toBe("irrinunciabile");

    expect(impattoScenario("S6")).toEqual(impattoScenario("S3"));
  });

  it("CA-7 S7 volo cancellato: colpito solo D3-E9", () => {
    const impatto = impattoScenario("S7");

    expect(impatto.elementiColpiti).toEqual([
      {
        elementoId: "D3-E9",
        tipoImprevisto: "CANCELLAZIONE_SPOSTAMENTO",
        data: "2026-06-14",
        motivo:
          "Cancellazione dello spostamento: lo spostamento in volo da «Aeroporto di Verona» " +
          "a «Aeroporto di Roma Fiumicino» del 2026-06-14 (19:30–20:35) è cancellato.",
      },
    ]);
  });

  it("CA-8 S8 ritardo verso l'aeroporto: colpiti D3-E8 e D3-E9, che slitterebbe anche se è a orario fisso", () => {
    const { viaggio } = scenario("S8");
    expect(viaggio.giorni[2]?.elementi.find((e) => e.id === "D3-E9")?.orarioFisso).toBe(true);

    const impatto = impattoScenario("S8");

    expect(orariSlittati(impatto)).toEqual([
      ["D3-E8", "17:30", "19:45"],
      ["D3-E9", "19:45", "20:50"],
    ]);
    expect(impatto.elementiColpiti[1]?.motivo).toBe(
      "Ritardo di 60 minuti alle 17:40 (coda in autostrada): slitterebbe da 19:30–20:35 a 19:45–20:50. " +
        "L'elemento è a orario fisso e non verrà spostato.",
    );
  });

  it("CA-9 una pioggia in zona TRENTO il 2026-06-13 dà impatto vuoto", () => {
    const viaggio = itinerario("versione-1");
    const pioggiaTrento: Imprevisto = {
      tipo: "METEO_AVVERSO",
      zonaId: "TRENTO",
      data: "2026-06-13",
      inizio: "00:00",
      fine: "24:00",
      condizione: "pioggia",
    };

    expect(calcolaImpatto(viaggio, catalogo, pioggiaTrento).elementiColpiti).toEqual([]);
  });

  it("CA-9 qualsiasi imprevisto del 2026-06-20 (fuori dalle date del viaggio) dà impatto vuoto", () => {
    const viaggio = itinerario("versione-1");
    const imprevisti: Imprevisto[] = [
      { tipo: "METEO_AVVERSO", zonaId: "GARDA_NORD", data: "2026-06-20", inizio: "00:00", fine: "24:00", condizione: "temporale" },
      ritardo("2026-06-20", "09:20", 120),
      { tipo: "CHIUSURA_LUOGO", luogoId: "MUSE", data: "2026-06-20", inizio: "00:00", fine: "24:00" },
    ];
    for (const imprevisto of imprevisti) {
      expect(calcolaImpatto(viaggio, catalogo, imprevisto).elementiColpiti).toEqual([]);
    }

    // Gli imprevisti datati degli scenari S1–S8, spostati al 2026-06-20, sul loro itinerario.
    const datati = scenari.filter((s) => "data" in s.imprevisto);
    expect(datati.map((s) => s.id)).toEqual(["S1", "S2", "S3", "S4", "S6", "S8"]);
    for (const s of datati) {
      const spostato = { ...s.imprevisto, data: "2026-06-20" } as Imprevisto;
      expect(calcolaImpatto(itinerario(s.itinerario), catalogo, spostato).elementiColpiti).toEqual([]);
    }
  });
});

describe("calcolaImpatto: regole di REQ-REPLAN-001", () => {
  const versione1 = itinerario("versione-1");

  describe("R-RIT-1 slittamento dei ritardi", () => {
    it("senza elementi in corso il viaggiatore è disponibile da momento + minuti", () => {
      // 09:55: D3-E1 è già finito (09:50), D3-E2 non è ancora iniziato (10:00); disponibile dalle 10:25.
      const impatto = calcolaImpatto(versione1, catalogo, ritardo("2026-06-14", "09:55", 30));

      expect(orariSlittati(impatto)).toEqual([
        ["D3-E2", "10:25", "12:25"],
        ["D3-E3", "12:25", "12:35"],
        ["D3-E4", "12:35", "13:35"],
        ["D3-E5", "13:35", "13:50"],
      ]);
    });

    it("lo slittamento si ferma al primo elemento che resta in orario", () => {
      // 13:16 + 5 minuti = 13:21: D3-E5 (13:30) resta in orario, quindi nessuno è colpito.
      expect(calcolaImpatto(versione1, catalogo, ritardo("2026-06-14", "13:16", 5)).elementiColpiti).toEqual([]);
      // D3-E1 in corso finisce alle 10:00, D3-E2 inizia comunque alle 10:00: colpito solo D3-E1.
      expect(orariSlittati(calcolaImpatto(versione1, catalogo, ritardo("2026-06-14", "09:00", 10)))).toEqual([
        ["D3-E1", "09:00", "10:00"],
      ]);
    });

    it("un elemento è in corso se inizio ≤ momento < fine: alla sua fine non è più in corso", () => {
      // Alle 09:50 D3-E1 è finito; disponibile dalle 09:55, D3-E2 (10:00) resta in orario.
      expect(calcolaImpatto(versione1, catalogo, ritardo("2026-06-14", "09:50", 5)).elementiColpiti).toEqual([]);
    });

    it("i giorni successivi non sono mai colpiti; oltre la mezzanotte l'orario continua (25:00)", () => {
      const impatto = calcolaImpatto(versione1, catalogo, ritardo("2026-06-12", "18:15", 400, "guasto"));

      expect(orariSlittati(impatto)).toEqual([["D1-E3", "18:10", "25:00"]]);
      expect(impatto.elementiColpiti[0]?.motivo).toBe(
        "Ritardo di 400 minuti alle 18:15 (guasto): l'elemento è in corso e finirebbe alle 25:00 invece che alle 18:20. " +
          "Finirebbe oltre la mezzanotte.",
      );
    });

    it("un ritardo di zero minuti non tocca nessun elemento", () => {
      expect(calcolaImpatto(versione1, catalogo, ritardo("2026-06-14", "09:20", 0)).elementiColpiti).toEqual([]);
    });
  });

  describe("R-1 meteo avverso, chiusura e cancellazione (modello-dominio §2.4)", () => {
    it("il meteo avverso colpisce solo le attività all'aperto della zona, non i pasti al coperto né gli spostamenti", () => {
      const tuttoIlGiorno: Imprevisto = {
        tipo: "METEO_AVVERSO",
        zonaId: "GARDA_NORD",
        data: "2026-06-13",
        inizio: "00:00",
        fine: "24:00",
        condizione: "neve",
      };
      expect(ids(calcolaImpatto(versione1, catalogo, tuttoIlGiorno))).toEqual(["D2-E2"]);

      const temporaleLungolago: Imprevisto = {
        tipo: "METEO_AVVERSO",
        zonaId: "GARDA_NORD",
        data: "2026-06-12",
        inizio: "17:00",
        fine: "18:00",
        condizione: "temporale",
      };
      expect(ids(calcolaImpatto(versione1, catalogo, temporaleLungolago))).toEqual(["D1-E2"]);
    });

    it("intervalli che si toccano non si sovrappongono", () => {
      const pioggiaDopoIlTrekking: Imprevisto = {
        tipo: "METEO_AVVERSO",
        zonaId: "GARDA_NORD",
        data: "2026-06-13",
        inizio: "13:00",
        fine: "14:00",
        condizione: "pioggia",
      };
      expect(calcolaImpatto(versione1, catalogo, pioggiaDopoIlTrekking).elementiColpiti).toEqual([]);

      const chiusura = (inizio: string): Imprevisto => ({
        tipo: "CHIUSURA_LUOGO",
        luogoId: "MUSE",
        data: "2026-06-14",
        inizio,
        fine: "18:00",
      });
      expect(calcolaImpatto(versione1, catalogo, chiusura("16:30")).elementiColpiti).toEqual([]);
      expect(ids(calcolaImpatto(versione1, catalogo, chiusura("16:29")))).toEqual(["D3-E6"]);
    });

    it("la chiusura colpisce le attività nel luogo, non gli spostamenti che vi arrivano o ne partono", () => {
      const chiusuraCastello: Imprevisto = {
        tipo: "CHIUSURA_LUOGO",
        luogoId: "BUONCONSIGLIO",
        data: "2026-06-14",
        inizio: "09:00",
        fine: "13:00",
      };
      const impatto = calcolaImpatto(versione1, catalogo, chiusuraCastello);

      expect(impatto.elementiColpiti).toHaveLength(1);
      expect(impatto.elementiColpiti[0]?.elementoId).toBe("D3-E2");
      expect(impatto.elementiColpiti[0]?.motivo).toBe(
        "Chiusura del luogo «Castello del Buonconsiglio» il 2026-06-14 dalle 09:00 alle 13:00: " +
          "l'attività «Visita al Castello del Buonconsiglio» (10:00–12:00) si svolge lì.",
      );
    });

    it("R-2 la cancellazione di un id sconosciuto o di un'attività non tocca nessun elemento", () => {
      const cancella = (elementoId: string): Imprevisto => ({ tipo: "CANCELLAZIONE_SPOSTAMENTO", elementoId });

      expect(calcolaImpatto(versione1, catalogo, cancella("D9-E9")).elementiColpiti).toEqual([]);
      expect(calcolaImpatto(versione1, catalogo, cancella("D3-E2")).elementiColpiti).toEqual([]);
    });
  });

  describe("R-3 ordine e determinismo (regole comuni §3)", () => {
    it("gli elementi colpiti sono in ordine di inizio anche se il giorno li elenca in disordine", () => {
      const { viaggio, imprevisto } = scenario("S3");
      const disordinato = structuredClone(viaggio);
      const giorno3 = disordinato.giorni[2];
      if (!giorno3) throw new Error("manca il giorno 3");
      giorno3.elementi.reverse();

      expect(calcolaImpatto(disordinato, catalogo, imprevisto)).toEqual(impattoScenario("S3"));
    });

    it("a parità di input il risultato è identico e il viaggio non viene modificato", () => {
      for (const s of scenari) {
        const { viaggio, imprevisto } = scenario(s.id);
        const prima = structuredClone(viaggio);

        const primo = calcolaImpatto(viaggio, catalogo, imprevisto);
        const secondo = calcolaImpatto(viaggio, catalogo, imprevisto);

        expect(secondo).toEqual(primo);
        expect(viaggio).toEqual(prima);
      }
    });
  });
});
