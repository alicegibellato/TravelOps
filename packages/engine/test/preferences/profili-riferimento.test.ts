/**
 * Profili di riferimento PR-1…PR-5 (dati-di-riferimento-estensioni.md §8.2): sono dati validi, il profilo
 * completo coincide con la §8.2 più i predefiniti della §7.2, e il loro punteggio sul catalogo esteso di
 * riferimento è fissato e deterministico (ST-PREF-001A, criterio 3).
 */
import { describe, expect, it } from "vitest";
import {
  classificaAttivita,
  validaProfilo,
  type MotivoEsclusione,
  type ProfiloPreferenze,
} from "../../src/index.js";
import { catalogoEsteso, profiliDiRiferimento, profilo } from "./supporto.js";

/** I predefiniti della §7.2, scritti qui per esteso e non presi dal motore. */
const PREDEFINITI: Omit<ProfiloPreferenze, "destinazione" | "date" | "durata" | "tipoGruppo"> = {
  viaggiatori: { adulti: 2, bambini: [] },
  stili: ["cultura", "natura"],
  ritmo: "bilanciato",
  formaFisica: "moderato",
  budget: "€€",
  orari: "normale",
  pasti: { pranzo: true, cena: true },
  mezzi: ["piedi", "mezzi_pubblici", "treno", "auto"],
  irrinunciabili: { attivita: [], stili: [] },
  daEvitare: { attivita: [], categorie: [], stili: [] },
  esigenze: [],
};

const ATTESI: Record<string, ProfiloPreferenze> = structuredClone<Record<string, ProfiloPreferenze>>({
  "PR-1": {
    ...PREDEFINITI,
    destinazione: { tipo: "luogo", nome: "Lago di Garda (Riva del Garda e dintorni)" },
    date: { tipo: "precise", inizio: "2026-06-12", fine: "2026-06-15" },
    durata: 4,
    tipoGruppo: "coppia",
    stili: ["natura", "gastronomia", "romantico"],
    ritmo: "lento",
  },
  "PR-2": {
    ...PREDEFINITI,
    destinazione: { tipo: "luogo", nome: "Dolomiti – Val di Fassa" },
    date: { tipo: "mese", mese: "2026-08" },
    durata: 5,
    viaggiatori: { adulti: 3, bambini: [] },
    tipoGruppo: "amici",
    stili: ["natura", "avventura"],
    ritmo: "intenso",
    formaFisica: "impegnativo",
    budget: "€",
    orari: "mattiniero",
  },
  "PR-3": {
    ...PREDEFINITI,
    destinazione: { tipo: "luogo", nome: "Roma" },
    date: { tipo: "mese", mese: "2026-10" },
    durata: 3,
    viaggiatori: { adulti: 2, bambini: [6, 9] },
    tipoGruppo: "famiglia",
    stili: ["cultura", "famiglia"],
    formaFisica: "facile",
    pasti: { pranzo: true, cena: false },
  },
  "PR-4": {
    ...PREDEFINITI,
    destinazione: { tipo: "sorprendimi" },
    date: { tipo: "mese", mese: "2026-05" },
    durata: 3,
    viaggiatori: { adulti: 1, bambini: [] },
    tipoGruppo: "da_solo",
    stili: ["relax", "gastronomia"],
    ritmo: "lento",
    formaFisica: "facile",
    budget: "€€€",
    daEvitare: { attivita: [], categorie: [], stili: ["avventura"] },
  },
  "PR-5": {
    ...PREDEFINITI,
    destinazione: { tipo: "luogo", nome: "Lisbona" },
    date: { tipo: "mese", mese: "2026-05" },
    durata: 4,
    tipoGruppo: "coppia",
    stili: ["cultura", "gastronomia"],
  },
});

/**
 * Classifica attesa sul catalogo esteso di riferimento (8 attività), calcolata a mano con le regole della §7.7:
 * candidate `[id, punteggio]` in ordine, escluse `[id, motivi]` in ordine di id.
 */
const CLASSIFICHE: Record<string, { candidate: [string, number][]; escluse: [string, MotivoEsclusione[]][] }> = {
  // natura, gastronomia, romantico; forma moderato; €€.
  "PR-1": {
    candidate: [
      ["A-CANTINA", 6],
      ["A-LUNGOLAGO", 3],
      ["A-PRANZO-RIVA", 3],
      ["A-PRANZO-TRENTO", 3],
      ["A-BUONCONSIGLIO", 0],
      ["A-MAG", 0],
      ["A-MUSE", 0],
    ],
    escluse: [["A-PONALE", ["troppo_impegnativa"]]],
  },
  // natura, avventura; forma impegnativo; € (cantina e pranzi €€: −1).
  "PR-2": {
    candidate: [
      ["A-PONALE", 6],
      ["A-LUNGOLAGO", 3],
      ["A-BUONCONSIGLIO", 0],
      ["A-MAG", 0],
      ["A-MUSE", 0],
      ["A-CANTINA", -1],
      ["A-PRANZO-RIVA", -1],
      ["A-PRANZO-TRENTO", -1],
    ],
    escluse: [],
  },
  // cultura, famiglia; forma facile; €€; bambini di 6 e 9 anni.
  "PR-3": {
    candidate: [
      ["A-MUSE", 6],
      ["A-BUONCONSIGLIO", 3],
      ["A-MAG", 3],
      ["A-LUNGOLAGO", 0],
      ["A-PRANZO-RIVA", 0],
      ["A-PRANZO-TRENTO", 0],
    ],
    escluse: [
      ["A-CANTINA", ["non_adatta_ai_bambini"]],
      ["A-PONALE", ["troppo_impegnativa"]],
    ],
  },
  // relax, gastronomia; forma facile; €€€; da evitare avventura.
  "PR-4": {
    candidate: [
      ["A-CANTINA", 3],
      ["A-PRANZO-RIVA", 3],
      ["A-PRANZO-TRENTO", 3],
      ["A-BUONCONSIGLIO", 0],
      ["A-LUNGOLAGO", 0],
      ["A-MAG", 0],
      ["A-MUSE", 0],
    ],
    escluse: [["A-PONALE", ["da_evitare", "troppo_impegnativa"]]],
  },
  // cultura, gastronomia; forma moderato; €€.
  "PR-5": {
    candidate: [
      ["A-BUONCONSIGLIO", 3],
      ["A-CANTINA", 3],
      ["A-MAG", 3],
      ["A-MUSE", 3],
      ["A-PRANZO-RIVA", 3],
      ["A-PRANZO-TRENTO", 3],
      ["A-LUNGOLAGO", 0],
    ],
    escluse: [["A-PONALE", ["troppo_impegnativa"]]],
  },
};

const riassunto = (profiloCompleto: ProfiloPreferenze, catalogo = catalogoEsteso()) => {
  const { candidate, escluse } = classificaAttivita(catalogo, profiloCompleto);
  return {
    candidate: candidate.map((v) => [v.attivitaId, v.punteggio]),
    escluse: escluse.map((v) => [v.attivitaId, v.esclusioni]),
  };
};

describe("PR-1…PR-5 sono dati di riferimento validi", () => {
  it("il file contiene i cinque profili della §8.2, nell'ordine", () => {
    expect(profiliDiRiferimento().map((p) => [p.id, p.nome])).toEqual([
      ["PR-1", "Coppia sul Garda"],
      ["PR-2", "Amici avventurosi"],
      ["PR-3", "Famiglia a Roma"],
      ["PR-4", "Sorprendimi"],
      ["PR-5", "Destinazione nuova"],
    ]);
  });

  for (const id of Object.keys(ATTESI)) {
    it(`${id} è valido, anche con il catalogo di riferimento, e il profilo completo coincide con la §8.2 più i predefiniti`, () => {
      const voce = profiliDiRiferimento().find((p) => p.id === id);
      expect(voce).toBeDefined();
      expect(validaProfilo(voce?.profilo)).toStrictEqual({ ok: true, profilo: ATTESI[id] });
      expect(validaProfilo(voce?.profilo, { catalogo: catalogoEsteso() })).toStrictEqual({ ok: true, profilo: ATTESI[id] });
    });
  }
});

describe("PR-1…PR-5 hanno un punteggio deterministico", () => {
  for (const [id, attesa] of Object.entries(CLASSIFICHE)) {
    it(`${id}: classifica fissata sul catalogo esteso di riferimento`, () => {
      const voce = profiliDiRiferimento().find((p) => p.id === id);
      expect(riassunto(profilo(voce?.profilo))).toEqual(attesa);
    });
  }

  it("stesso profilo e stesso catalogo danno sempre lo stesso risultato, in qualsiasi ordine arrivino le attività", () => {
    const catalogo = catalogoEsteso();
    const rovesciato = { ...catalogo, attivita: [...catalogo.attivita].reverse() };
    const mescolato = { ...catalogo, attivita: [...catalogo.attivita].sort((a, b) => (a.nome < b.nome ? -1 : 1)) };
    for (const voce of profiliDiRiferimento()) {
      const completo = profilo(voce.profilo);
      const primo = JSON.stringify(classificaAttivita(catalogo, completo));
      for (let i = 0; i < 3; i++) {
        expect(JSON.stringify(classificaAttivita(catalogoEsteso(), profilo(voce.profilo)))).toBe(primo);
      }
      expect(JSON.stringify(classificaAttivita(rovesciato, completo))).toBe(primo);
      expect(JSON.stringify(classificaAttivita(mescolato, completo))).toBe(primo);
    }
  });
});
