import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type {
  Catalogo,
  CatalogoEsteso,
  ElementoAttivita,
  ElementoSpostamento,
  Giorno,
  Imprevisto,
  ImprevistoEsteso,
  ImprevistoSalute,
  Viaggio,
} from "../../src/model/index.js";
import { calcolaImpatto, type ImpattoDettagliato } from "../../src/replanning/index.js";

// Dati di riferimento (dati-di-riferimento.md e dati-di-riferimento-estensioni.md), letti come oggetti del modello.
const leggi = <T>(file: string): T =>
  JSON.parse(readFileSync(new URL(`../../data/reference/${file}`, import.meta.url), "utf8")) as T;

interface Scenario<I> {
  id: string;
  titolo: string;
  itinerario: string;
  imprevisto: I;
}

const FILE_ITINERARIO: Record<string, string> = {
  "versione-1": "versione-1.json",
  "V-IRR": "variante-v-irr.json",
  "V-FISSO": "variante-v-fisso.json",
  "V-VOLO": "variante-v-volo.json",
  "V-BUS": "estensioni/variante-v-bus.json",
};

const catalogo = leggi<Catalogo>("catalogo.json");
const catalogoEsteso = leggi<CatalogoEsteso>("estensioni/catalogo-esteso.json");
const scenariOndata1 = leggi<Scenario<Imprevisto>[]>("scenari-imprevisti.json");
const scenariOndata2 = leggi<Scenario<ImprevistoEsteso>[]>("estensioni/scenari-imprevisti-estesi.json");

function itinerario(nome: string): Viaggio {
  const file = FILE_ITINERARIO[nome];
  if (!file) throw new Error(`Itinerario sconosciuto: ${nome}`);
  return leggi<Viaggio>(file);
}

function impattoScenario(id: string): ImpattoDettagliato {
  const trovato = scenariOndata2.find((s) => s.id === id);
  if (!trovato) throw new Error(`Scenario sconosciuto: ${id}`);
  return calcolaImpatto(itinerario(trovato.itinerario), catalogoEsteso, trovato.imprevisto);
}

const ids = (impatto: ImpattoDettagliato): string[] => impatto.elementiColpiti.map((e) => e.elementoId);

const salute = (campi: Partial<ImprevistoSalute>): ImprevistoSalute => ({
  tipo: "SALUTE",
  dataInizio: "2026-06-13",
  giorni: 1,
  intensitaMassima: "facile",
  mobilitaRidotta: false,
  descrizione: "",
  ...campi,
});

/** Data `AAAA-MM-GG` del 2026-06-12 più `n` giorni. */
const giornoDiGiugno = (n: number): string => `2026-06-${String(12 + n).padStart(2, "0")}`;

/**
 * Viaggio di 5 giorni (2026-06-12…2026-06-16) che ripete ogni giorno il trekking del Ponale
 * (impegnativo, non accessibile) e la passeggiata sul lungolago (facile, accessibile).
 */
function viaggioDiCinqueGiorni(): Viaggio {
  const giorni: Giorno[] = [0, 1, 2, 3, 4].map((n) => {
    const d = `G${n + 1}`;
    const ponale: ElementoAttivita = { id: `${d}-PONALE`, tipo: "attivita", inizio: "09:00", fine: "13:00", attivitaId: "A-PONALE" };
    const lungolago: ElementoAttivita = {
      id: `${d}-LUNGOLAGO`,
      tipo: "attivita",
      inizio: "16:00",
      fine: "18:00",
      attivitaId: "A-LUNGOLAGO",
    };
    return { data: giornoDiGiugno(n), luogoPartenza: "HOTEL", alloggio: "HOTEL", elementi: [ponale, lungolago] };
  });
  return { ...itinerario("versione-1"), id: "TRIP-5", dataInizio: "2026-06-12", dataFine: "2026-06-16", giorni };
}

/** Versione 1 con un treno la sera del primo giorno (`D1-TRENO`, 18:20–19:30, da `HOTEL` a `HOTEL`). */
function viaggioConTrenoSerale(): Viaggio {
  const viaggio = itinerario("versione-1");
  const treno: ElementoSpostamento = {
    id: "D1-TRENO",
    tipo: "spostamento",
    inizio: "18:20",
    fine: "19:30",
    da: "HOTEL",
    a: "HOTEL",
    mezzo: "treno",
  };
  viaggio.giorni[0]?.elementi.push(treno);
  return viaggio;
}

describe("calcolaImpatto: criteri di accettazione di REQ-REPLAN-003", () => {
  it("CA-1 gli scenari S1…S8 di REQ-REPLAN-001 hanno lo stesso impatto con il catalogo esteso", () => {
    expect(scenariOndata1.map((s) => s.id)).toEqual(["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"]);
    for (const s of scenariOndata1) {
      const viaggio = itinerario(s.itinerario);
      expect(calcolaImpatto(viaggio, catalogoEsteso, s.imprevisto), s.id).toEqual(
        calcolaImpatto(viaggio, catalogo, s.imprevisto),
      );
    }
  });

  it("CA-2 S9 caviglia slogata: colpito solo D2-E2, con motivo di salute", () => {
    expect(impattoScenario("S9").elementiColpiti).toEqual([
      {
        elementoId: "D2-E2",
        tipoImprevisto: "SALUTE",
        data: "2026-06-13",
        motivo:
          "Salute (caviglia slogata) dal 2026-06-13 per 2 giorni: l'attività «Trekking sul Sentiero del Ponale» " +
          "del 2026-06-13 (09:00–13:00) ha intensità impegnativa, superiore alla massima consentita (facile).",
      },
    ]);
  });

  it("CA-2 S10 volo perso: colpito solo D3-E9", () => {
    const impatto = impattoScenario("S10");

    expect(ids(impatto)).toEqual(["D3-E9"]);
    expect(impatto.elementiColpiti[0]).toMatchObject({ tipoImprevisto: "VOLO_PERSO", data: "2026-06-14" });
    expect(impatto.elementiColpiti[0]?.motivo).toMatch(/^Volo perso: lo spostamento in volo da «.+» a «.+» del 2026-06-14 \(19:30–20:35\) è perso\.$/);
  });

  it("CA-2 S11 sciopero: colpito solo D3-E1", () => {
    const impatto = impattoScenario("S11");

    expect(ids(impatto)).toEqual(["D3-E1"]);
    expect(impatto.elementiColpiti[0]).toMatchObject({ tipoImprevisto: "SCIOPERO", data: "2026-06-14" });
    expect(impatto.elementiColpiti[0]?.motivo).toMatch(
      /^Sciopero dei mezzi pubblici il 2026-06-14: lo spostamento con i mezzi pubblici da «.+» a «.+» \(08:40–10:00\) non è garantito\.$/,
    );
  });

  it("CA-3 S12 bagaglio smarrito e S13 documenti rubati: nessun elemento colpito", () => {
    expect(impattoScenario("S12").elementiColpiti).toEqual([]);
    expect(impattoScenario("S13").elementiColpiti).toEqual([]);
  });

  it("CA-3 S14 stanchezza: colpite le attività del 2026-06-14, non gli spostamenti", () => {
    const impatto = impattoScenario("S14");

    expect(ids(impatto)).toEqual(["D3-E2", "D3-E4", "D3-E6"]);
    expect(impatto.elementiColpiti.every((e) => e.tipoImprevisto === "STANCHEZZA" && e.data === "2026-06-14")).toBe(true);
    expect(impatto.elementiColpiti[0]?.motivo).toMatch(/^Stanchezza il 2026-06-14: l'attività «.+» \(10:00–12:00\) non è irrinunciabile e non è a orario fisso\.$/);
  });

  it("CA-3 stanchezza: le attività irrinunciabili e quelle a orario fisso non sono colpite", () => {
    expect(ids(calcolaImpatto(itinerario("V-IRR"), catalogoEsteso, { tipo: "STANCHEZZA", data: "2026-06-14" }))).toEqual([
      "D3-E4",
      "D3-E6",
    ]);
    expect(ids(calcolaImpatto(itinerario("V-FISSO"), catalogoEsteso, { tipo: "STANCHEZZA", data: "2026-06-13" }))).toEqual([
      "D2-E2",
    ]);
  });

  it("CA-3 sciopero: vale solo per quel mezzo, quella data e, se indicata, quella zona", () => {
    const vBus = itinerario("V-BUS");

    expect(ids(calcolaImpatto(vBus, catalogoEsteso, { tipo: "SCIOPERO", mezzo: "treno", data: "2026-06-14" }))).toEqual([]);
    expect(ids(calcolaImpatto(vBus, catalogoEsteso, { tipo: "SCIOPERO", mezzo: "mezzi_pubblici", data: "2026-06-13" }))).toEqual([]);
    expect(
      ids(calcolaImpatto(vBus, catalogoEsteso, { tipo: "SCIOPERO", mezzo: "mezzi_pubblici", data: "2026-06-14", zonaId: "TRENTO" })),
    ).toEqual(["D3-E1"]);
    expect(
      ids(calcolaImpatto(vBus, catalogoEsteso, { tipo: "SCIOPERO", mezzo: "mezzi_pubblici", data: "2026-06-14", zonaId: "ZONA-ASSENTE" })),
    ).toEqual([]);
  });

  it("CA-3 volo perso: uno spostamento che non è in volo o in treno, o un id sconosciuto, non tocca nulla", () => {
    const vVolo = itinerario("V-VOLO");

    expect(calcolaImpatto(vVolo, catalogoEsteso, { tipo: "VOLO_PERSO", elementoId: "D3-E8" }).elementiColpiti).toEqual([]);
    expect(calcolaImpatto(vVolo, catalogoEsteso, { tipo: "VOLO_PERSO", elementoId: "D3-E2" }).elementiColpiti).toEqual([]);
    expect(calcolaImpatto(vVolo, catalogoEsteso, { tipo: "VOLO_PERSO", elementoId: "X" }).elementiColpiti).toEqual([]);
  });

  it("CA-4 salute di 3 giorni: colpite solo le attività non compatibili in quei 3 giorni", () => {
    const impatto = calcolaImpatto(viaggioDiCinqueGiorni(), catalogoEsteso, salute({ dataInizio: "2026-06-13", giorni: 3 }));

    expect(ids(impatto)).toEqual(["G2-PONALE", "G3-PONALE", "G4-PONALE"]);
    expect(impatto.elementiColpiti.map((e) => e.data)).toEqual(["2026-06-13", "2026-06-14", "2026-06-15"]);
  });

  it("CA-4 salute: mobilità ridotta, intensità consentita, giorni fino alla fine del viaggio e fuori dal viaggio", () => {
    const viaggio = viaggioDiCinqueGiorni();
    const conMobilita = calcolaImpatto(
      viaggio,
      catalogoEsteso,
      salute({ dataInizio: "2026-06-15", giorni: 3, intensitaMassima: "impegnativa", mobilitaRidotta: true }),
    );

    expect(ids(conMobilita)).toEqual(["G4-PONALE", "G5-PONALE"]);
    expect(conMobilita.elementiColpiti[0]?.motivo).toContain("non è accessibile con mobilità ridotta");
    expect(
      ids(calcolaImpatto(viaggio, catalogoEsteso, salute({ dataInizio: "2026-06-14", giorni: undefined, intensitaMassima: "moderata" }))),
    ).toEqual(["G3-PONALE", "G4-PONALE", "G5-PONALE"]);
    expect(calcolaImpatto(viaggio, catalogoEsteso, salute({ dataInizio: "2026-06-20", giorni: 2 })).elementiColpiti).toEqual([]);
    expect(calcolaImpatto(viaggio, catalogoEsteso, salute({ giorni: 0 })).elementiColpiti).toEqual([]);
  });

  it("CA-4 salute: un'attività senza intensità o accessibilità nel catalogo non è colpita", () => {
    const impatto = calcolaImpatto(viaggioDiCinqueGiorni(), catalogo, salute({ giorni: 3, mobilitaRidotta: true }));

    expect(impatto.elementiColpiti).toEqual([]);
  });

  it("CA-5 volo perso con arrivo il giorno dopo: colpiti gli elementi che iniziano prima dell'arrivo previsto", () => {
    const impatto = calcolaImpatto(viaggioConTrenoSerale(), catalogoEsteso, {
      tipo: "VOLO_PERSO",
      elementoId: "D1-TRENO",
      arrivoPrevisto: { data: "2026-06-13", orario: "10:00" },
    });

    expect(impatto.elementiColpiti.map((e) => [e.elementoId, e.data])).toEqual([
      ["D1-TRENO", "2026-06-12"],
      ["D2-E1", "2026-06-13"],
      ["D2-E2", "2026-06-13"],
    ]);
    expect(impatto.elementiColpiti[0]?.motivo).toMatch(/^Treno perso: .* è perso\. Arrivo previsto con il nuovo mezzo il 2026-06-13 alle 10:00\.$/);
    expect(impatto.elementiColpiti[2]?.motivo).toMatch(
      /l'attività «Trekking sul Sentiero del Ponale» del 2026-06-13 \(09:00–13:00\) inizia prima dell'arrivo previsto il 2026-06-13 alle 10:00\.$/,
    );
  });

  it("CA-5 volo perso senza arrivo previsto: colpito solo lo spostamento perso", () => {
    expect(ids(calcolaImpatto(viaggioConTrenoSerale(), catalogoEsteso, { tipo: "VOLO_PERSO", elementoId: "D1-TRENO" }))).toEqual([
      "D1-TRENO",
    ]);
  });

  it("il calcolo è deterministico e non modifica il viaggio", () => {
    for (const s of scenariOndata2) {
      const viaggio = itinerario(s.itinerario);
      const prima = JSON.stringify(viaggio);
      expect(calcolaImpatto(viaggio, catalogoEsteso, s.imprevisto), s.id).toEqual(
        calcolaImpatto(viaggio, catalogoEsteso, s.imprevisto),
      );
      expect(JSON.stringify(viaggio), s.id).toBe(prima);
    }
  });
});
