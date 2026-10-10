/**
 * ST-CAT-002C, Sorprendimi (REQ-CAT-002, REQ-PREF-001 CA-7): l'elenco configurabile di 20 destinazioni candidate in
 * `packages/sources/candidates.json`, ordinate col punteggio del profilo (§7.7 del motore); si propongono le prime 3.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PUNTI, validaProfilo, type BozzaProfilo, type ProfiloPreferenze } from "@travelops/engine";
import { describe, expect, it } from "vitest";
import { leggiCandidati, NUMERO_PROPOSTE_SORPRENDIMI, ordinaCandidati, proponiSorprendimi, type DestinazioneCandidata } from "../src/index.js";

const FILE = fileURLToPath(new URL("../candidates.json", import.meta.url));
const grezzo = JSON.parse(readFileSync(FILE, "utf8")) as unknown;

function candidate(): DestinazioneCandidata[] {
  const letto = leggiCandidati(grezzo);
  if (!letto.ok) throw new Error(letto.problemi.join(" "));
  return letto.elenco.candidati;
}

function profilo(bozza: BozzaProfilo): ProfiloPreferenze {
  const esito = validaProfilo({ destinazione: { tipo: "sorprendimi" }, date: { tipo: "mese", mese: "2026-05" }, durata: 3, ...bozza });
  if (!esito.ok) throw new Error(esito.problemi.map((p) => p.testo).join(" "));
  return esito.profilo;
}

const voce = (id: string, stili: DestinazioneCandidata["stili"], mesi: number[] = [5]): DestinazioneCandidata => ({
  id,
  nome: id,
  descrizione: `Descrizione di ${id}`,
  stili,
  mesiConsigliati: mesi,
});

describe("candidates.json", () => {
  it("contiene 20 destinazioni candidate valide, con stili prevalenti e mesi consigliati", () => {
    expect(candidate()).toHaveLength(20);
    expect(new Set(candidate().map((c) => c.id)).size).toBe(20);
    for (const c of candidate()) {
      expect(c.stili.length).toBeGreaterThan(0);
      expect(c.mesiConsigliati.length).toBeGreaterThan(0);
    }
  });

  it("l'elenco è configurabile: se cambia il file cambia l'elenco, senza toccare il codice", () => {
    const meno = { formato: 1, candidati: candidate().slice(0, 5) };
    const letto = leggiCandidati(meno);
    expect(letto.ok && letto.elenco.candidati).toHaveLength(5);
  });

  it("un elenco non valido dà tutti i problemi in italiano", () => {
    const esito = leggiCandidati({
      formato: 1,
      candidati: [
        { id: "A B", nome: "", descrizione: "x", stili: ["sport"], mesiConsigliati: [13] },
        { id: "ok", nome: "Ok", descrizione: "x", stili: ["relax"], mesiConsigliati: [5] },
        { id: "ok", nome: "Ok", descrizione: "x", stili: ["relax"], mesiConsigliati: [5] },
      ],
    });
    expect(esito.ok).toBe(false);
    if (esito.ok) return;
    expect(esito.problemi).toEqual(
      expect.arrayContaining([
        "Candidata 1: l'identificativo non è valido.",
        "Candidata 1: manca il nome.",
        "Candidata 1: servono uno o più stili tra quelli ammessi.",
        "Candidata 1: i mesi consigliati devono essere numeri da 1 a 12.",
        'Candidata 3: l\'identificativo "ok" è ripetuto.',
      ]),
    );
    expect(leggiCandidati({ formato: 2 }).ok).toBe(false);
    expect(leggiCandidati({ formato: 1, candidati: [] }).ok).toBe(false);
  });
});

describe("Sorprendimi: punteggio del profilo e prime 3", () => {
  it("il punteggio è quello del motore: +3 per ogni stile in comune, +5 per uno stile irrinunciabile", () => {
    const p = profilo({ stili: ["relax", "gastronomia"], irrinunciabili: { stili: ["relax"] } });
    const ordinate = ordinaCandidati([voce("a", ["relax", "gastronomia"]), voce("b", ["relax"]), voce("c", ["natura"])], p);
    expect(ordinate.map((o) => [o.candidata.id, o.punteggio])).toEqual([
      ["a", 2 * PUNTI.stileInComune + PUNTI.irrinunciabile],
      ["b", PUNTI.stileInComune + PUNTI.irrinunciabile],
      ["c", 0],
    ]);
  });

  it("le candidate con uno stile da evitare sono escluse", () => {
    const p = profilo({ stili: ["relax"], daEvitare: { stili: ["avventura"] } });
    const ordinate = ordinaCandidati([voce("a", ["relax", "avventura"]), voce("b", ["relax"])], p);
    expect(ordinate.map((o) => o.candidata.id)).toEqual(["b"]);
  });

  it("a parità di punteggio vince il mese consigliato, poi l'ordine alfabetico; l'ordine dell'elenco non conta", () => {
    const p = profilo({ stili: ["cultura"], date: { tipo: "mese", mese: "2026-07" } });
    const elenco = [voce("z", ["cultura"], [7]), voce("b", ["cultura"], [1]), voce("a", ["cultura"], [1]), voce("m", ["cultura"], [7])];
    const atteso = ["m", "z", "a", "b"];
    expect(ordinaCandidati(elenco, p).map((o) => o.candidata.id)).toEqual(atteso);
    expect(ordinaCandidati([...elenco].reverse(), p).map((o) => o.candidata.id)).toEqual(atteso);
    expect(ordinaCandidati(elenco, p).map((o) => o.meseConsigliato)).toEqual([true, true, false, false]);
  });

  it("propone le prime 3 di candidates.json, ordinate col punteggio (profilo PR-4: relax e gastronomia, evita avventura)", () => {
    const p = profilo({ stili: ["relax", "gastronomia"], daEvitare: { stili: ["avventura"] }, date: { tipo: "mese", mese: "2026-05" } });
    const proposte = proponiSorprendimi(candidate(), p);
    expect(NUMERO_PROPOSTE_SORPRENDIMI).toBe(3);
    expect(proposte).toHaveLength(3);
    const tutte = ordinaCandidati(candidate(), p);
    expect(proposte.map((x) => x.candidata.id)).toEqual(tutte.slice(0, 3).map((x) => x.candidata.id));
    const punteggi = tutte.map((x) => x.punteggio);
    expect(punteggi).toEqual([...punteggi].sort((a, b) => b - a));
    for (const { candidata } of tutte) expect(candidata.stili).not.toContain("avventura");
    // Le prime 3 hanno il punteggio massimo possibile tra le candidate non escluse.
    expect(Math.min(...proposte.map((x) => x.punteggio))).toBeGreaterThanOrEqual(punteggi[3] ?? 0);
  });

  it("con meno di 3 candidate non escluse ne propone meno", () => {
    const p = profilo({ stili: ["relax"], daEvitare: { stili: ["avventura"] } });
    expect(proponiSorprendimi([voce("a", ["relax"]), voce("b", ["avventura"])], p)).toHaveLength(1);
  });
});

describe("nessuna destinazione candidata scritta nel codice", () => {
  it("i nomi di candidates.json non compaiono nei sorgenti del pacchetto", () => {
    const fonti = ["candidati", "formato", "index", "lettore", "minimi", "registrata", "sorgente", "cartella", "pacchetto"].map((nome) =>
      readFileSync(fileURLToPath(new URL(`../src/${nome}.ts`, import.meta.url)), "utf8"),
    );
    for (const { nome } of candidate()) for (const testo of fonti) expect(testo).not.toContain(nome);
  });
});
