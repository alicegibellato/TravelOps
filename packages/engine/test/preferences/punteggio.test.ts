/**
 * Punteggio delle preferenze (modello-dominio-estensioni.md §7.7), una regola alla volta, comprese le esclusioni
 * (REQ-PREF-001 CA-4).
 */
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  classificaAttivita,
  confrontaValutazioni,
  MOTIVI_ESCLUSIONE,
  punteggioAttivita,
  TESTO_ESCLUSIONE,
  valutaAttivita,
  type AttivitaCatalogoEstesa,
  type FormaFisica,
  type Intensita,
} from "../../src/index.js";
import { attivita, catalogoEsteso, profiloBase, testoSemplice } from "./supporto.js";

describe("CA-4 — punti della §7.7", () => {
  it("CA-4 +3 per ogni stile in comune con il profilo", () => {
    const profilo = profiloBase({ stili: ["cultura", "natura", "gastronomia"] });
    expect(punteggioAttivita(attivita({ stili: ["relax"] }), profilo)).toBe(0);
    expect(punteggioAttivita(attivita({ stili: ["cultura"] }), profilo)).toBe(3);
    expect(punteggioAttivita(attivita({ stili: ["cultura", "relax", "natura"] }), profilo)).toBe(6);
    expect(punteggioAttivita(attivita({ stili: ["gastronomia", "natura", "cultura"] }), profilo)).toBe(9);
    expect(valutaAttivita(attivita({ stili: ["gastronomia", "natura", "relax"] }), profilo).stiliInComune).toEqual([
      "natura",
      "gastronomia",
    ]);
  });

  it("CA-4 +5 se è tra gli irrinunciabili, per id o per stile, una volta sola", () => {
    const perId = profiloBase({ irrinunciabili: { attivita: ["A-PROVA"] } });
    expect(punteggioAttivita(attivita(), perId)).toBe(5);
    expect(punteggioAttivita(attivita({ id: "A-ALTRA" }), perId)).toBe(0);
    const perStile = profiloBase({ irrinunciabili: { stili: ["relax"] } });
    expect(punteggioAttivita(attivita(), perStile)).toBe(5);
    const entrambi = profiloBase({ irrinunciabili: { attivita: ["A-PROVA"], stili: ["relax", "avventura"] } });
    expect(punteggioAttivita(attivita({ stili: ["relax", "avventura"] }), entrambi)).toBe(5);
    expect(punteggioAttivita(attivita({ stili: ["cultura"] }), profiloBase({ irrinunciabili: { attivita: ["A-PROVA"] } }))).toBe(8);
  });

  it("CA-4 −1 se il costo supera la fascia di budget di un livello", () => {
    const tabella: [string, string, number][] = [
      ["€", "gratis", 0],
      ["€", "€", 0],
      ["€", "€€", -1],
      ["€€", "€", 0],
      ["€€", "€€", 0],
      ["€€", "€€€", -1],
      ["€€€", "€€€", 0],
    ];
    for (const [budget, costo, atteso] of tabella) {
      const profilo = profiloBase({ budget: budget as "€" });
      const valutazione = valutaAttivita(attivita({ costo: costo as "€" }), profilo);
      expect([budget, costo, valutazione.punteggio], `${budget} ${costo}`).toEqual([budget, costo, atteso]);
    }
    expect(punteggioAttivita(attivita({ costo: "€€€", stili: ["cultura"] }), profiloBase())).toBe(2);
  });

  it("CA-4 tutti i punti insieme: 2 stili, irrinunciabile e un livello oltre il budget fanno 3+3+5−1 = 10", () => {
    const profilo = profiloBase({ stili: ["cultura", "natura"], budget: "€", irrinunciabili: { attivita: ["A-PROVA"] } });
    expect(valutaAttivita(attivita({ stili: ["natura", "cultura"], costo: "€€" }), profilo)).toStrictEqual({
      attivitaId: "A-PROVA",
      esclusa: false,
      esclusioni: [],
      punteggio: 10,
      stiliInComune: ["cultura", "natura"],
      irrinunciabile: true,
      livelliOltreIlBudget: 1,
    });
  });
});

describe("CA-4 — esclusioni della §7.7", () => {
  const motivi = (a: AttivitaCatalogoEstesa, variante: Parameters<typeof profiloBase>[0] = {}): string[] =>
    valutaAttivita(a, profiloBase(variante)).esclusioni;

  it("CA-4 esclusa se è tra le cose da evitare: per id, per categoria o per uno dei suoi stili", () => {
    expect(motivi(attivita(), { daEvitare: { attivita: ["A-PROVA"] } })).toEqual(["da_evitare"]);
    expect(motivi(attivita({ categoria: "natura" }), { daEvitare: { categorie: ["natura"] } })).toEqual(["da_evitare"]);
    expect(motivi(attivita({ stili: ["relax", "avventura"] }), { daEvitare: { stili: ["avventura"] } })).toEqual([
      "da_evitare",
    ]);
    expect(motivi(attivita(), { daEvitare: { attivita: ["A-ALTRA"], categorie: ["cultura"], stili: ["avventura"] } })).toEqual(
      [],
    );
  });

  it("CA-4 esclusa se l'intensità supera la forma fisica (tutte le 9 combinazioni)", () => {
    const forme: FormaFisica[] = ["facile", "moderato", "impegnativo"];
    const intensita: Intensita[] = ["facile", "moderata", "impegnativa"];
    const esclusa = forme.map((formaFisica) =>
      intensita.map((i) => valutaAttivita(attivita({ intensita: i }), profiloBase({ formaFisica })).esclusa),
    );
    expect(esclusa).toEqual([
      [false, true, true],
      [false, false, true],
      [false, false, false],
    ]);
    expect(motivi(attivita({ intensita: "impegnativa" }))).toEqual(["troppo_impegnativa"]);
  });

  it("CA-4 esclusa se il profilo chiede mobilità ridotta e non è accessibile", () => {
    expect(motivi(attivita({ accessibile: false }))).toEqual([]);
    expect(motivi(attivita({ accessibile: false }), { esigenze: ["mobilita_ridotta"] })).toEqual(["non_accessibile"]);
    expect(motivi(attivita({ accessibile: true }), { esigenze: ["mobilita_ridotta"] })).toEqual([]);
  });

  it("CA-4 esclusa se ci sono bambini (o l'esigenza adatto ai bambini) e non è adatta", () => {
    const nonAdatta = attivita({ adattaAiBambini: false });
    expect(motivi(nonAdatta)).toEqual([]);
    expect(motivi(nonAdatta, { viaggiatori: { adulti: 2, bambini: [8] } })).toEqual(["non_adatta_ai_bambini"]);
    expect(motivi(nonAdatta, { esigenze: ["adatto_ai_bambini"] })).toEqual(["non_adatta_ai_bambini"]);
    expect(motivi(attivita(), { viaggiatori: { adulti: 2, bambini: [8] } })).toEqual([]);
  });

  it("CA-4 esclusa se il costo supera la fascia di budget di più di un livello", () => {
    expect(motivi(attivita({ costo: "€€€" }), { budget: "€" })).toEqual(["troppo_cara"]);
    expect(valutaAttivita(attivita({ costo: "€€€" }), profiloBase({ budget: "€" })).livelliOltreIlBudget).toBe(2);
    expect(motivi(attivita({ costo: "€€" }), { budget: "€" })).toEqual([]);
  });

  it("CA-4 un'attività esclusa non ha punteggio, anche se irrinunciabile o con stili in comune, e riporta tutti i motivi", () => {
    const tutto = attivita({
      stili: ["cultura", "avventura"],
      intensita: "impegnativa",
      accessibile: false,
      adattaAiBambini: false,
      costo: "€€€",
    });
    const valutazione = valutaAttivita(
      tutto,
      profiloBase({
        budget: "€",
        formaFisica: "facile",
        viaggiatori: { adulti: 1, bambini: [4] },
        esigenze: ["mobilita_ridotta"],
        irrinunciabili: { attivita: ["A-PROVA"] },
        daEvitare: { stili: ["avventura"] },
      }),
    );
    expect(valutazione).toStrictEqual({
      attivitaId: "A-PROVA",
      esclusa: true,
      esclusioni: ["da_evitare", "troppo_impegnativa", "non_accessibile", "non_adatta_ai_bambini", "troppo_cara"],
      punteggio: null,
      stiliInComune: ["cultura"],
      irrinunciabile: true,
      livelliOltreIlBudget: 2,
    });
    expect(valutazione.esclusioni).toEqual([...MOTIVI_ESCLUSIONE]);
  });

  it("CA-4 un dato della §7.3 assente non si presume favorevole; senza costo e senza stili nessun punto e nessuna penalità", () => {
    const senza = (campo: keyof AttivitaCatalogoEstesa): AttivitaCatalogoEstesa => {
      const a = attivita();
      delete a[campo];
      return a;
    };
    expect(motivi(senza("intensita"))).toEqual(["troppo_impegnativa"]);
    expect(motivi(senza("intensita"), { formaFisica: "impegnativo" })).toEqual([]);
    expect(motivi(senza("accessibile"), { esigenze: ["mobilita_ridotta"] })).toEqual(["non_accessibile"]);
    expect(motivi(senza("accessibile"))).toEqual([]);
    expect(motivi(senza("adattaAiBambini"), { viaggiatori: { adulti: 1, bambini: [2] } })).toEqual(["non_adatta_ai_bambini"]);
    expect(motivi(senza("adattaAiBambini"))).toEqual([]);
    expect(valutaAttivita(senza("costo"), profiloBase({ budget: "€" }))).toMatchObject({ punteggio: 0, livelliOltreIlBudget: 0 });
    expect(punteggioAttivita(senza("stili"), profiloBase({ irrinunciabili: { stili: ["relax"] } }))).toBe(0);
  });

  it("CA-4 i motivi di esclusione hanno un testo semplice per il viaggiatore", () => {
    expect(Object.keys(TESTO_ESCLUSIONE)).toEqual([...MOTIVI_ESCLUSIONE]);
    for (const testo of Object.values(TESTO_ESCLUSIONE)) expect(testoSemplice(testo), testo).toBe(true);
  });
});

describe("CA-4 — ordine della §7.7 e determinismo", () => {
  it("CA-4 punteggio più alto prima; a parità, ordine alfabetico dell'id per codice, non secondo la lingua", () => {
    const profilo = profiloBase({ stili: ["cultura"] });
    const elenco = [
      attivita({ id: "A-a", stili: ["cultura"] }),
      attivita({ id: "A-Z", stili: ["cultura"] }),
      attivita({ id: "A-B", stili: ["relax"] }),
      attivita({ id: "A-A", stili: ["relax"] }),
      attivita({ id: "A-CARA", stili: ["cultura"], costo: "€€€" }),
      attivita({ id: "A-0", stili: ["relax"], costo: "€€€" }),
      attivita({ id: "A-ESCLUSA-2", intensita: "impegnativa" }),
      attivita({ id: "A-ESCLUSA-1", intensita: "impegnativa", stili: ["cultura"] }),
    ];
    const ordine = (voci: AttivitaCatalogoEstesa[]): [string, number | null][] => {
      const { candidate, escluse } = classificaAttivita(voci, profilo);
      return [...candidate, ...escluse].map((v) => [v.attivitaId, v.punteggio]);
    };
    const atteso: [string, number | null][] = [
      ["A-Z", 3],
      ["A-a", 3],
      ["A-CARA", 2],
      ["A-A", 0],
      ["A-B", 0],
      ["A-0", -1],
      ["A-ESCLUSA-1", null],
      ["A-ESCLUSA-2", null],
    ];
    expect(ordine(elenco)).toEqual(atteso);
    expect(ordine([...elenco].reverse())).toEqual(atteso);
    expect(ordine([elenco[3], elenco[6], elenco[0], elenco[5], elenco[1], elenco[7], elenco[2], elenco[4]] as AttivitaCatalogoEstesa[])).toEqual(atteso);
  });

  it("CA-4 confrontaValutazioni mette le escluse in fondo e ordina un elenco misto come classificaAttivita", () => {
    const profilo = profiloBase({ stili: ["cultura"] });
    const valutazioni = [
      valutaAttivita(attivita({ id: "A-2", intensita: "impegnativa" }), profilo),
      valutaAttivita(attivita({ id: "A-1" }), profilo),
      valutaAttivita(attivita({ id: "A-3", stili: ["cultura"] }), profilo),
    ];
    expect([...valutazioni].sort(confrontaValutazioni).map((v) => v.attivitaId)).toEqual(["A-3", "A-1", "A-2"]);
  });

  it("CA-4 classificaAttivita accetta il catalogo o l'elenco delle attività e non li modifica", () => {
    const catalogo = catalogoEsteso();
    const copia = structuredClone(catalogo);
    const profilo = profiloBase();
    expect(classificaAttivita(catalogo, profilo)).toStrictEqual(classificaAttivita(catalogo.attivita, profilo));
    expect(catalogo).toStrictEqual(copia);
  });

  it("CA-4 il codice delle preferenze non usa file system, rete, orologio, casualità né ordinamenti secondo la lingua", () => {
    const cartella = new URL("../../src/preferences/", import.meta.url);
    const sorgenti = readdirSync(cartella).filter((f) => f.endsWith(".ts"));
    expect(sorgenti).toEqual(["index.ts", "punteggio.ts", "tipi.ts", "validazione.ts"]);
    for (const file of sorgenti) {
      const codice = readFileSync(new URL(file, cartella), "utf8");
      expect(codice, file).not.toMatch(/from\s+["'](node:|fs|path|http|https|net)/);
      expect(codice, file).not.toMatch(/\bfetch\(|XMLHttpRequest|require\(|import\(/);
      expect(codice, file).not.toMatch(/Date\.now|new Date\(|Math\.random|performance\.now|localeCompare|Intl\./);
    }
  });
});
