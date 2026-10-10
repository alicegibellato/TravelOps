/**
 * Generatore della prima bozza (REQ-PLAN-001): regole R-1…R-9 e criteri CA-2, CA-3, CA-4, CA-5, CA-7.
 * CA-1 e CA-6 sono in `riferimento.test.ts`. Tutte le istantanee usate qui sono dati di test.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  attivitaDaSostituire,
  attivitaPrevistePerGiorno,
  ATTIVITA_PER_RITMO,
  controllaFattibilita,
  creaSorgenteDaDati,
  ETICHETTE_PROFILO,
  FINESTRA_GIORNATA,
  FINESTRE_PASTI,
  generaAlternativa,
  generaBozza,
  INTENSITA_MASSIMA,
  scegliAlloggio,
  TENTATIVI_MASSIMI,
  validaItinerario,
  valutaAttivita,
  type BozzaProfilo,
  type IstantaneaCatalogo,
  type ProfiloPreferenze,
} from "../../src/index.js";
import { collocaGiornata, Percorsi } from "../../src/planning/giornata.js";
import {
  attivitaDelGiorno,
  attivitaDelViaggio,
  istantaneaDiProva,
  istantaneaGrande,
  istantaneaInFila,
  minuti,
  profiloDiRiferimento,
  type IdProfilo,
} from "./supporto.js";

const PROFILI: IdProfilo[] = ["PR-1", "PR-2", "PR-3", "PR-4"];
const INTENSITA = ["facile", "moderata", "impegnativa"] as const;

const conProfilo = (id: IdProfilo, modifica?: (b: BozzaProfilo) => void): ProfiloPreferenze => profiloDiRiferimento(id, modifica);

afterEach(() => {
  vi.unstubAllGlobals();
});

// Il catalogo sintetico ha una sola categoria: le prove di altre regole non vogliono il vincolo di varietà.
const SENZA_VARIETA = { maxAttivitaStessoTipo: 99 } as const;

describe("R-1 — profilo e istantanea già scelta, senza rete", () => {
  it("non chiama la rete e non modifica l'istantanea", () => {
    const fetch = vi.fn(() => {
      throw new Error("rete vietata");
    });
    vi.stubGlobal("fetch", fetch);
    const istantanea = istantaneaDiProva();
    const copia = structuredClone(istantanea);
    for (const id of PROFILI) generaBozza(conProfilo(id), istantanea);
    expect(fetch).not.toHaveBeenCalled();
    expect(istantanea).toEqual(copia);
  });

  it("usa l'istantanea ricevuta anche con «sorprendimi» (PR-4)", () => {
    const istantanea = istantaneaDiProva();
    const bozza = generaBozza(conProfilo("PR-4"), istantanea);
    expect(bozza.istantaneaId).toBe(istantanea.id);
    expect(bozza.viaggio.titolo).toContain(istantanea.destinazione);
    const ids = new Set(istantanea.attivita.map((a) => a.id));
    for (const e of attivitaDelViaggio(bozza.viaggio)) expect(ids.has(e.attivitaId)).toBe(true);
  });

  it("il viaggio è valido secondo REQ-ITIN-001 per tutti i profili", () => {
    const istantanea = istantaneaDiProva();
    for (const id of PROFILI) expect(validaItinerario(generaBozza(conProfilo(id), istantanea).viaggio, istantanea)).toEqual([]);
  });

  it("date: inizio delle date precise, primo del mese, oppure la data indicata", () => {
    const istantanea = istantaneaDiProva();
    expect(generaBozza(conProfilo("PR-1"), istantanea).viaggio).toMatchObject({ dataInizio: "2026-06-12", dataFine: "2026-06-15" });
    expect(generaBozza(conProfilo("PR-2"), istantanea).viaggio).toMatchObject({ dataInizio: "2026-08-01", dataFine: "2026-08-05" });
    expect(generaBozza(conProfilo("PR-2"), istantanea, { dataInizio: "2026-08-10" }).viaggio).toMatchObject({
      dataInizio: "2026-08-10",
      dataFine: "2026-08-14",
    });
  });
});

describe("R-2 — alloggio con la fascia più vicina al budget", () => {
  const istantanea = istantaneaDiProva(); // alloggi: PROVA-OSTELLO (€) e PROVA-HOTEL (€€€)

  it.each([
    ["€", "PROVA-OSTELLO"],
    ["€€", "PROVA-OSTELLO"], // a pari distanza vince il più economico
    ["€€€", "PROVA-HOTEL"],
  ] as const)("budget %s → %s, tutte le notti", (budget, atteso) => {
    const profilo = conProfilo("PR-1", (b) => (b.budget = budget));
    expect(scegliAlloggio(istantanea, profilo).id).toBe(atteso);
    const bozza = generaBozza(profilo, istantanea);
    expect(bozza.alloggioId).toBe(atteso);
    const giorni = bozza.viaggio.giorni;
    for (const giorno of giorni.slice(0, -1)) expect(giorno.alloggio).toBe(atteso);
    expect(giorni.at(-1)?.alloggio).toBeUndefined();
  });
});

describe("R-3 e CA-3 — attività per giorno secondo il ritmo", () => {
  it("primo e ultimo giorno a metà (per eccesso) con arrivo e partenza", () => {
    const profilo = conProfilo("PR-2"); // intenso, 5 giorni
    expect(attivitaPrevistePerGiorno(profilo, true)).toEqual([2, 4, 4, 4, 2]);
    expect(attivitaPrevistePerGiorno(profilo, false)).toEqual([4, 4, 4, 4, 4]);
    expect(attivitaPrevistePerGiorno(conProfilo("PR-3"), true)).toEqual([2, 3, 2]); // bilanciato: 3 → 2
    expect(attivitaPrevistePerGiorno(conProfilo("PR-1"), true)).toEqual([1, 2, 2, 1]); // lento: 2 → 1
  });

  it.each([
    ["PR-1", [1, 2, 2, 1]],
    ["PR-2", [2, 4, 4, 4, 2]],
    ["PR-3", [2, 3, 2]],
    ["PR-4", [1, 2, 1]],
  ] as const)("%s: ogni giorno ha esattamente le attività previste %j", (id, previste) => {
    const istantanea = istantaneaDiProva();
    const profilo = conProfilo(id);
    const bozza = generaBozza(profilo, istantanea);
    const attese = [...previste];
    expect(attivitaPrevistePerGiorno(profilo, true)).toEqual(attese);
    expect(bozza.arrivoId).toBe("PROVA-STAZIONE");
    expect(bozza.giorni.map((g) => g.attivitaPreviste)).toEqual(attese);
    expect(bozza.viaggio.giorni.map((g) => attivitaDelGiorno(istantanea, g.elementi).length)).toEqual(attese);
    expect(bozza.giorni.map((g) => g.attivita.length)).toEqual(attese);
  });

  it("con arrivo e partenza: spostamento dalla stazione il primo giorno e verso la stazione l'ultimo", () => {
    const bozza = generaBozza(conProfilo("PR-1"), istantaneaDiProva());
    const primo = bozza.viaggio.giorni[0];
    const ultimo = bozza.viaggio.giorni.at(-1);
    expect(primo?.luogoPartenza).toBe("PROVA-STAZIONE");
    expect(primo?.elementi[0]).toMatchObject({ tipo: "spostamento", da: "PROVA-STAZIONE", a: bozza.alloggioId, inizio: "12:00" });
    expect(ultimo?.elementi.at(-1)).toMatchObject({ tipo: "spostamento", da: bozza.alloggioId, a: "PROVA-STAZIONE", fine: "17:00" });
    expect(bozza.giorni[0]?.arrivo).toBe(true);
    expect(bozza.giorni.at(-1)?.partenza).toBe(true);
  });

  it("senza arrivo e partenza tutti i giorni hanno il numero del ritmo", () => {
    const istantanea = istantaneaDiProva();
    const profilo = conProfilo("PR-3");
    const bozza = generaBozza(profilo, istantanea, { arrivoEPartenza: false });
    expect(bozza.arrivoId).toBeNull();
    expect(bozza.viaggio.giorni.map((g) => attivitaDelGiorno(istantanea, g.elementi).length)).toEqual([3, 3, 3]);
    expect(bozza.viaggio.giorni.every((g) => g.luogoPartenza === bozza.alloggioId)).toBe(true);
    expect(bozza.fattibile).toBe(true);
  });
});

describe("R-4 — scelta delle attività", () => {
  it.each(PROFILI)("%s: ogni attività una sola volta, uno stile del profilo ogni giorno, al più un'impegnativa al giorno", (id) => {
    const istantanea = istantaneaDiProva();
    const profilo = conProfilo(id);
    const bozza = generaBozza(profilo, istantanea);
    const usate = bozza.viaggio.giorni.flatMap((g) => attivitaDelGiorno(istantanea, g.elementi).map((x) => x.attivita.id));
    expect(new Set(usate).size).toBe(usate.length);
    for (const giorno of bozza.viaggio.giorni) {
      const del = attivitaDelGiorno(istantanea, giorno.elementi).map((x) => x.attivita);
      expect(del.some((a) => (a.stili ?? []).some((s) => profilo.stili.includes(s)))).toBe(true);
      expect(del.filter((a) => a.intensita === "impegnativa").length).toBeLessThanOrEqual(1);
    }
  });

  it("PR-2 (forma impegnativo) usa le attività impegnative, ma mai due nello stesso giorno", () => {
    const istantanea = istantaneaDiProva();
    const bozza = generaBozza(conProfilo("PR-2"), istantanea);
    const impegnative = bozza.viaggio.giorni.map(
      (g) => attivitaDelGiorno(istantanea, g.elementi).filter((x) => x.attivita.intensita === "impegnativa").length,
    );
    expect(impegnative.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(2);
    expect(Math.max(...impegnative)).toBe(1);
  });

  it("mai due impegnative nello stesso giorno, anche quando sarebbero le migliori", () => {
    // Istantanea sintetica: tre attività impegnative brevi con lo stile del profilo, le altre facili e senza.
    const istantanea = istantaneaGrande(12);
    for (const a of istantanea.attivita) {
      if (a.categoria === "pasto") continue;
      const impegnativa = ["A-P01", "A-P02", "A-P03"].includes(a.id);
      a.intensita = impegnativa ? "impegnativa" : "facile";
      a.stili = impegnativa ? ["avventura"] : ["relax"];
    }
    const profilo = conProfilo("PR-2", (b) => {
      b.stili = ["avventura"];
      b.durata = 2;
      b.date = { tipo: "precise", inizio: "2026-08-03", fine: "2026-08-04" };
    });
    const bozza = generaBozza(profilo, istantanea, { arrivoEPartenza: false, varieta: SENZA_VARIETA });
    const perGiorno = bozza.viaggio.giorni.map(
      (g) => attivitaDelGiorno(istantanea, g.elementi).filter((x) => x.attivita.intensita === "impegnativa").length,
    );
    expect(perGiorno).toEqual([1, 1]);
    expect(bozza.giorni.flatMap((g) => g.attivita)).not.toContain("A-P03");
    expect(bozza.giorni.map((g) => g.attivita.length)).toEqual([4, 4]);
  });

  it("le attività sono in ordine di punteggio: nessuna esclusa ha un punteggio più alto di una scelta", () => {
    const istantanea = istantaneaDiProva();
    const profilo = conProfilo("PR-1");
    const bozza = generaBozza(profilo, istantanea);
    const scelte = new Set(bozza.giorni.flatMap((g) => g.attivita));
    const punteggi = istantanea.attivita
      .filter((a) => a.categoria !== "pasto")
      .map((a) => ({ id: a.id, punteggio: valutaAttivita(a, profilo).punteggio }));
    const minimoScelto = Math.min(...punteggi.filter((p) => scelte.has(p.id)).map((p) => p.punteggio ?? 0));
    const maxNonScelto = Math.max(...punteggi.filter((p) => !scelte.has(p.id) && p.punteggio !== null).map((p) => p.punteggio ?? 0));
    expect(minimoScelto).toBeGreaterThanOrEqual(maxNonScelto);
  });

  it("prima gli irrinunciabili, anche con punteggio basso, con priorità irrinunciabile", () => {
    const istantanea = istantaneaDiProva();
    // PROVA-A-GALLERIA (solo cultura) non ha stili in comune con PR-1: senza irrinunciabile non verrebbe scelta.
    expect(generaBozza(conProfilo("PR-1"), istantanea).giorni.flatMap((g) => g.attivita)).not.toContain("PROVA-A-GALLERIA");
    const profilo = conProfilo("PR-1", (b) => (b.irrinunciabili = { attivita: ["PROVA-A-GALLERIA"] }));
    const bozza = generaBozza(profilo, istantanea);
    const elemento = attivitaDelViaggio(bozza.viaggio).find((e) => e.attivitaId === "PROVA-A-GALLERIA");
    expect(elemento?.priorita).toBe("irrinunciabile");
    expect(bozza.irrinunciabiliMancanti).toEqual({ attivita: [], stili: [] });
  });
});

describe("R-5 — collocazione", () => {
  it.each(PROFILI)("%s: dentro la finestra del profilo, pasti nelle loro finestre, fattibile", (id) => {
    const istantanea = istantaneaDiProva();
    const profilo = conProfilo(id);
    const bozza = generaBozza(profilo, istantanea);
    const finestra = FINESTRA_GIORNATA[profilo.orari];
    const pasti = new Set(istantanea.attivita.filter((a) => a.categoria === "pasto").map((a) => a.id));
    for (const giorno of bozza.viaggio.giorni) {
      for (const e of giorno.elementi) {
        if (e.tipo !== "attivita") continue;
        if (pasti.has(e.attivitaId)) continue;
        expect(minuti(e.inizio)).toBeGreaterThanOrEqual(minuti(finestra.inizio));
        expect(minuti(e.fine)).toBeLessThanOrEqual(minuti(finestra.fine));
      }
    }
    for (const giorno of bozza.giorni) {
      for (const pasto of ["pranzo", "cena"] as const) {
        const attivitaId = giorno.pasti[pasto];
        if (!profilo.pasti[pasto]) expect(attivitaId).toBeNull();
        if (attivitaId === null) continue;
        const giornoViaggio = bozza.viaggio.giorni.find((g) => g.data === giorno.data);
        const elemento = giornoViaggio?.elementi.find((e) => e.tipo === "attivita" && e.attivitaId === attivitaId && minuti(e.inizio) >= minuti(FINESTRE_PASTI[pasto].inizio) && minuti(e.fine) <= minuti(FINESTRE_PASTI[pasto].fine));
        expect(elemento, `${giorno.data} ${pasto}`).toBeDefined();
      }
    }
    // Orari di apertura, spostamenti e sovrapposizioni: il controllo di REQ-FEAS-001 non trova problemi bloccanti.
    expect(bozza.problemi.filter((p) => p.gravita === "bloccante")).toEqual([]);
  });

  it("pranzo e cena se richiesti; il pranzo non c'è l'ultimo giorno se la partenza lo impedisce, la cena mai dopo la partenza", () => {
    const bozza = generaBozza(conProfilo("PR-1"), istantaneaDiProva());
    expect(bozza.giorni.map((g) => [g.pasti.pranzo !== null, g.pasti.cena !== null])).toEqual([
      [true, true],
      [true, true],
      [true, true],
      [true, false],
    ]);
    const senzaCena = generaBozza(conProfilo("PR-3"), istantaneaDiProva()); // PR-3: pranzo sì, cena no
    expect(senzaCena.giorni.every((g) => g.pasti.cena === null && g.pasti.pranzo !== null)).toBe(true);
  });

  it("ristorante compatibile con le esigenze alimentari (vegetariano e senza glutine → solo la trattoria)", () => {
    const istantanea = istantaneaDiProva();
    const profilo = conProfilo("PR-1", (b) => (b.esigenze = ["vegetariano", "senza_glutine"]));
    const bozza = generaBozza(profilo, istantanea);
    const pasti = bozza.giorni.flatMap((g) => [g.pasti.pranzo, g.pasti.cena]).filter((p): p is string => p !== null);
    expect(pasti.length).toBeGreaterThan(0);
    expect(new Set(pasti)).toEqual(new Set(["PROVA-A-PASTO-TRATTORIA"]));
    expect(bozza.fattibile).toBe(true);
  });

  it("il ristorante più vicino: da un luogo a 5 minuti dalla pizzeria si pranza in pizzeria", () => {
    const istantanea = istantaneaDiProva();
    const profilo = conProfilo("PR-1");
    const luoghi = new Map(istantanea.luoghi.map((l) => [l.id, l]));
    const ristoranti = istantanea.attivita.filter((a) => a.categoria === "pasto").sort((a, b) => (a.id < b.id ? -1 : 1));
    const percorsi = new Percorsi(creaSorgenteDaDati({ tempiPercorrenza: istantanea.tempiPercorrenza, previsioni: [], chiusure: [] }), profilo.mezzi);
    const piano = collocaGiornata({
      giornoSettimana: "mer",
      vociIniziali: [],
      partenza: { luogo: "PROVA-OSTELLO", minuti: 11 * 60 + 30 },
      tappeFinali: [{ luogo: "PROVA-OSTELLO", entro: null, allUltimoMomento: false }],
      fineAttivita: minuti("21:30"),
      attivita: [],
      pasti: ["pranzo"],
      ristoranti,
      luoghi,
      percorsi,
    });
    const piu = ristoranti
      .map((r) => ({ id: r.id, minuti: percorsi.tratto("PROVA-OSTELLO", r.luogoId)?.minuti ?? Infinity }))
      .sort((a, b) => a.minuti - b.minuti || (a.id < b.id ? -1 : 1))[0];
    expect(piano?.pasti.pranzo).toBe(piu?.id);
  });

  it("l'ordine minimizza gli spostamenti (alloggio tra luoghi su una linea)", () => {
    const istantanea = istantaneaInFila();
    const profilo = conProfilo("PR-3", (b) => (b.viaggiatori = { adulti: 2, bambini: [] }));
    const luoghi = new Map(istantanea.luoghi.map((l) => [l.id, l]));
    const percorsi = new Percorsi(creaSorgenteDaDati({ tempiPercorrenza: istantanea.tempiPercorrenza, previsioni: [], chiusure: [] }), profilo.mezzi);
    const piano = collocaGiornata({
      giornoSettimana: "mer",
      vociIniziali: [],
      partenza: { luogo: "H", minuti: minuti("09:30") },
      tappeFinali: [{ luogo: "H", entro: null, allUltimoMomento: false }],
      fineAttivita: minuti("21:30"),
      attivita: istantanea.attivita,
      pasti: [],
      ristoranti: [],
      luoghi,
      percorsi,
    });
    // Minimo calcolato a parte su tutti gli ordini possibili (luoghi sempre aperti: conta solo la percorrenza).
    const tempo = (a: string, b: string): number =>
      istantanea.tempiPercorrenza.find((t) => (t.da === a && t.a === b) || (t.da === b && t.a === a))?.minuti ?? Infinity;
    const giro = (ordine: string[]): number => ["H", ...ordine, "H"].reduce((s, l, i, v) => (i === 0 ? 0 : s + tempo(v[i - 1] ?? "", l)), 0);
    const ordini = [["L1", "L2", "L3"], ["L1", "L3", "L2"], ["L2", "L1", "L3"], ["L2", "L3", "L1"], ["L3", "L1", "L2"], ["L3", "L2", "L1"]];
    const minimo = Math.min(...ordini.map(giro));
    const ordine = piano?.voci.flatMap((v) => (v.tipo === "attivita" ? [v.attivita.luogoId] : [])) ?? [];
    expect(piano?.minutiSpostamento).toBe(minimo);
    expect(giro(ordine)).toBe(minimo);
    expect(Math.max(...ordini.map(giro))).toBeGreaterThan(minimo);
  });

  it("rispetta gli orari di apertura: il museo chiuso il lunedì non compare di lunedì", () => {
    const istantanea = istantaneaDiProva();
    const bozza = generaBozza(conProfilo("PR-3"), istantanea, { dataInizio: "2026-10-05" }); // lunedì
    const lunedi = bozza.viaggio.giorni[0];
    const luoghi = attivitaDelGiorno(istantanea, lunedi?.elementi ?? []).map((x) => x.attivita.luogoId);
    expect(luoghi).not.toContain("PROVA-MUSEO");
    expect(bozza.fattibile).toBe(true);
  });
});

describe("R-6 — verifica con REQ-FEAS-001", () => {
  const istantanea = istantaneaDiProva();
  const profilo = conProfilo("PR-1");
  const iniziale = generaBozza(profilo, istantanea);

  it("con una chiusura straordinaria toglie l'attività coinvolta, riprova e restituisce una bozza fattibile", () => {
    const primaAttivita = iniziale.giorni[1]?.attivita[0] ?? "";
    const luogoId = istantanea.attivita.find((a) => a.id === primaAttivita)?.luogoId ?? "";
    const data = iniziale.giorni[1]?.data ?? "";
    const sorgente = creaSorgenteDaDati({
      tempiPercorrenza: istantanea.tempiPercorrenza,
      previsioni: [],
      chiusure: [{ luogoId, data, inizio: "00:00", fine: "24:00" }],
    });
    const bozza = generaBozza(profilo, istantanea, { sorgente });
    expect(bozza.tolte.map((t) => t.attivitaId)).toContain(primaAttivita);
    expect(bozza.tolte[0]?.problema.codice).toBe("LUOGO_CHIUSO");
    expect(bozza.fattibile).toBe(true);
    expect(bozza.giorni.flatMap((g) => g.attivita)).not.toContain(primaAttivita);
    expect(bozza.spiegazione).toContain("Ho tolto");
    expect(controllaFattibilita(bozza.viaggio, istantanea, sorgente)).toEqual(bozza.problemi);
  });

  it("tra le coinvolte toglie quella col punteggio più basso", () => {
    // Chiusi tutti i luoghi delle attività del secondo giorno: entrambe coinvolte, si toglie la meno adatta.
    const giorno = iniziale.giorni[1];
    const coinvolte = (giorno?.attivita ?? []).map((id) => istantanea.attivita.find((a) => a.id === id));
    const sorgente = creaSorgenteDaDati({
      tempiPercorrenza: istantanea.tempiPercorrenza,
      previsioni: [],
      chiusure: coinvolte.map((a) => ({ luogoId: a?.luogoId ?? "", data: giorno?.data ?? "", inizio: "00:00", fine: "24:00" })),
    });
    const bozza = generaBozza(profilo, istantanea, { sorgente });
    const punteggi = coinvolte.map((a) => (a ? (valutaAttivita(a, profilo).punteggio ?? 0) : 0));
    expect(bozza.tolte[0]?.punteggio).toBe(Math.min(...punteggi));
  });

  it(`al massimo ${TENTATIVI_MASSIMI} nuovi tentativi; se restano problemi la bozza è restituita con problemi e spiegazione`, () => {
    // Tutti i luoghi delle attività chiusi in tutti i giorni: nessun tentativo può bastare.
    const chiusure = iniziale.viaggio.giorni.flatMap((g) =>
      istantanea.luoghi
        .filter((l) => l.tipo !== "alloggio" && l.tipo !== "stazione" && l.tipo !== "ristorante")
        .map((l) => ({ luogoId: l.id, data: g.data, inizio: "00:00", fine: "24:00" })),
    );
    const sorgente = creaSorgenteDaDati({ tempiPercorrenza: istantanea.tempiPercorrenza, previsioni: [], chiusure });
    const bozza = generaBozza(profilo, istantanea, { sorgente });
    expect(bozza.tolte).toHaveLength(TENTATIVI_MASSIMI);
    expect(bozza.fattibile).toBe(false);
    expect(bozza.problemi.some((p) => p.gravita === "bloccante" && p.codice === "LUOGO_CHIUSO")).toBe(true);
    expect(bozza.spiegazione).toMatch(/^La bozza ha ancora \d+ problemi da risolvere/);
    expect(bozza.viaggio.giorni).toHaveLength(4);
  });

  it("gli avvisi (orari da verificare) non fanno togliere nulla e sono nella spiegazione", () => {
    // Le terme di prova hanno orari non verificati.
    const profilo = conProfilo("PR-4", (b) => (b.irrinunciabili = { attivita: ["PROVA-A-TERME"] }));
    const bozza = generaBozza(profilo, istantaneaDiProva());
    expect(bozza.problemi.map((p) => [p.codice, p.gravita])).toContainEqual(["ORARI_DA_VERIFICARE", "avviso"]);
    expect(bozza.tolte).toEqual([]);
    expect(bozza.spiegazione).toContain("Da tenere d'occhio");
    expect(bozza.fattibile).toBe(true);
  });
});

describe("R-7 — perché te lo propongo", () => {
  it("ogni giorno ha una frase costruita da stili in comune e irrinunciabili", () => {
    const istantanea = istantaneaDiProva();
    const profilo = conProfilo("PR-1", (b) => (b.irrinunciabili = { attivita: ["PROVA-A-GALLERIA"] }));
    const bozza = generaBozza(profilo, istantanea);
    for (const giorno of bozza.giorni) {
      expect(giorno.perche.length).toBeGreaterThan(0);
      for (const stile of giorno.stiliInComune) expect(giorno.perche).toContain(ETICHETTE_PROFILO.stile[stile]);
      expect(giorno.stiliInComune.every((s) => profilo.stili.includes(s))).toBe(true);
    }
    const conGalleria = bozza.giorni.find((g) => g.irrinunciabili.includes("PROVA-A-GALLERIA"));
    expect(conGalleria?.perche).toContain('"Galleria');
    expect(conGalleria?.perche).toContain("che non vuoi perdere");
    expect(bozza.giorni[0]?.perche).toContain("arrivo");
    expect(bozza.giorni.at(-1)?.perche).toContain("partenza");
  });
});

describe("R-8 e CA-5 — determinismo", () => {
  it.each(PROFILI)("%s: stesso profilo e stessa istantanea → stessa bozza (5 volte)", (id) => {
    const prima = generaBozza(conProfilo(id), istantaneaDiProva());
    for (let i = 0; i < 4; i++) expect(generaBozza(conProfilo(id), istantaneaDiProva())).toEqual(prima);
  });

  it("l'ordine di luoghi, attività e tempi nell'istantanea non cambia la bozza", () => {
    const istantanea = istantaneaDiProva();
    const rovesciata: IstantaneaCatalogo = {
      ...istantanea,
      luoghi: [...istantanea.luoghi].reverse(),
      attivita: [...istantanea.attivita].reverse(),
      tempiPercorrenza: [...istantanea.tempiPercorrenza].reverse(),
    };
    for (const id of PROFILI) expect(generaBozza(conProfilo(id), rovesciata)).toEqual(generaBozza(conProfilo(id), istantanea));
  });
});

describe("R-9 — mostrami un'alternativa", () => {
  it("esclude le attività della bozza corrente quando ci sono sostituti con punteggio positivo", () => {
    const istantanea = istantaneaDiProva();
    const profilo = conProfilo("PR-1");
    const corrente = generaBozza(profilo, istantanea);
    const alternativa = generaAlternativa(profilo, istantanea, corrente);
    const prima = new Set(corrente.giorni.flatMap((g) => g.attivita));
    const dopo = alternativa.giorni.flatMap((g) => g.attivita);
    expect(alternativa.escluse).toEqual([...prima].sort());
    expect(dopo.filter((id) => prima.has(id))).toEqual([]);
    expect(alternativa.fattibile).toBe(true);
    expect(alternativa.giorni.map((g) => g.attivita.length)).toEqual(corrente.giorni.map((g) => g.attivita.length));
    // Anche dal solo viaggio.
    expect(generaAlternativa(profilo, istantanea, corrente.viaggio)).toEqual(alternativa);
  });

  it("tiene gli irrinunciabili", () => {
    const istantanea = istantaneaDiProva();
    const profilo = conProfilo("PR-1", (b) => (b.irrinunciabili = { attivita: ["PROVA-A-CANTINA"] }));
    const corrente = generaBozza(profilo, istantanea);
    const alternativa = generaAlternativa(profilo, istantanea, corrente);
    expect(alternativa.escluse).not.toContain("PROVA-A-CANTINA");
    expect(alternativa.giorni.flatMap((g) => g.attivita)).toContain("PROVA-A-CANTINA");
  });

  it("con pochi sostituti positivi esclude solo quante attività si possono sostituire, a partire dalle meno adatte", () => {
    const istantanea = istantaneaDiProva();
    const profilo = conProfilo("PR-3"); // famiglia: poche candidate con punteggio positivo
    const corrente = generaBozza(profilo, istantanea);
    const usate = new Set(corrente.giorni.flatMap((g) => g.attivita));
    const positiviLiberi = istantanea.attivita.filter((a) => {
      const v = valutaAttivita(a, profilo);
      return a.categoria !== "pasto" && !usate.has(a.id) && (v.punteggio ?? 0) > 0 && !v.irrinunciabile;
    });
    const escluse = attivitaDaSostituire(profilo, istantanea, corrente);
    expect(escluse.length).toBe(Math.min(usate.size, positiviLiberi.length));
    expect(escluse.every((id) => usate.has(id))).toBe(true);
    const punteggio = (id: string): number => valutaAttivita(istantanea.attivita.find((a) => a.id === id)!, profilo).punteggio ?? 0;
    const tenute = [...usate].filter((id) => !escluse.includes(id));
    if (escluse.length > 0 && tenute.length > 0) {
      expect(Math.max(...escluse.map(punteggio))).toBeLessThanOrEqual(Math.min(...tenute.map(punteggio)));
    }
  });
});

describe("CA-2 — tutti gli irrinunciabili, nessuna attività da evitare", () => {
  it("irrinunciabili per attività e per stile; da evitare per attività, categoria e stile", () => {
    const istantanea = istantaneaDiProva();
    const profilo = conProfilo("PR-1", (b) => {
      b.irrinunciabili = { attivita: ["PROVA-A-CANTINA", "PROVA-A-MERCATO"], stili: ["cultura"] };
      b.daEvitare = { attivita: ["PROVA-A-BARCA"], categorie: ["natura"], stili: ["avventura"] };
    });
    const bozza = generaBozza(profilo, istantanea);
    const scelte = bozza.giorni.flatMap((g) => g.attivita).map((id) => istantanea.attivita.find((a) => a.id === id)!);
    expect(scelte.map((a) => a.id)).toEqual(expect.arrayContaining(["PROVA-A-CANTINA", "PROVA-A-MERCATO"]));
    expect(scelte.some((a) => (a.stili ?? []).includes("cultura"))).toBe(true);
    expect(bozza.irrinunciabiliMancanti).toEqual({ attivita: [], stili: [] });
    const tutte = attivitaDelViaggio(bozza.viaggio).map((e) => istantanea.attivita.find((a) => a.id === e.attivitaId)!);
    for (const a of tutte) {
      expect(a.id).not.toBe("PROVA-A-BARCA");
      expect(a.categoria).not.toBe("natura");
      expect(a.stili ?? []).not.toContain("avventura");
    }
  });

  it.each(PROFILI)("%s: nessuna attività da evitare", (id) => {
    const istantanea = istantaneaDiProva();
    const profilo = conProfilo(id);
    const bozza = generaBozza(profilo, istantanea);
    for (const e of attivitaDelViaggio(bozza.viaggio)) {
      const a = istantanea.attivita.find((x) => x.id === e.attivitaId)!;
      expect(valutaAttivita(a, profilo).esclusioni).not.toContain("da_evitare");
    }
  });

  it("un irrinunciabile che non si può collocare è segnalato", () => {
    const istantanea = istantaneaDiProva();
    // Viaggio di 2 giorni a ritmo lento con arrivo e partenza: 1 attività al giorno, 2 posti per 3 irrinunciabili.
    const profilo = conProfilo("PR-1", (b) => {
      b.durata = 2;
      b.date = { tipo: "precise", inizio: "2026-06-14", fine: "2026-06-15" };
      b.irrinunciabili = { attivita: ["PROVA-A-LABORATORIO", "PROVA-A-MUSEO", "PROVA-A-GALLERIA"] };
    });
    const bozza = generaBozza(profilo, istantanea);
    expect(bozza.irrinunciabiliMancanti.attivita.length).toBeGreaterThan(0);
    expect(bozza.avvisi.some((a) => a.includes("che volevi assolutamente fare"))).toBe(true);
  });
});

describe("CA-4 — forma fisica e bambini", () => {
  it.each(PROFILI)("%s: nessuna attività oltre la forma fisica; con bambini solo attività adatte", (id) => {
    const istantanea = istantaneaDiProva();
    const profilo = conProfilo(id);
    const massima = INTENSITA.indexOf(INTENSITA_MASSIMA[profilo.formaFisica]);
    for (const e of attivitaDelViaggio(generaBozza(profilo, istantanea).viaggio)) {
      const a = istantanea.attivita.find((x) => x.id === e.attivitaId)!;
      expect(INTENSITA.indexOf(a.intensita ?? "impegnativa")).toBeLessThanOrEqual(massima);
      if (profilo.viaggiatori.bambini.length > 0) expect(a.adattaAiBambini).toBe(true);
    }
  });

  it("PR-3 (2 bambini, forma facile): niente cantina, kayak, sentieri moderati o impegnativi, anche nei pasti", () => {
    const istantanea = istantaneaDiProva();
    const ids = attivitaDelViaggio(generaBozza(conProfilo("PR-3"), istantanea).viaggio).map((e) => e.attivitaId);
    for (const vietata of ["PROVA-A-CANTINA", "PROVA-A-KAYAK", "PROVA-A-SENTIERO", "PROVA-A-CRESTA", "PROVA-A-FERRATA"]) {
      expect(ids).not.toContain(vietata);
    }
  });

  it("mobilità ridotta: solo attività accessibili", () => {
    const istantanea = istantaneaDiProva();
    const profilo = conProfilo("PR-1", (b) => (b.esigenze = ["mobilita_ridotta"]));
    for (const e of attivitaDelViaggio(generaBozza(profilo, istantanea).viaggio)) {
      expect(istantanea.attivita.find((x) => x.id === e.attivitaId)?.accessibile).toBe(true);
    }
  });
});

describe("CA-7 — meno di 2 secondi per 14 giorni", () => {
  const quattordici = (b: BozzaProfilo): void => {
    b.durata = 14;
    b.date = { tipo: "mese", mese: "2026-07" };
    b.ritmo = "intenso";
  };

  it("14 giorni a ritmo intenso su un'istantanea grande (70 attività)", () => {
    const istantanea = istantaneaGrande(70);
    const profilo = conProfilo("PR-2", quattordici);
    const inizio = performance.now();
    const bozza = generaBozza(profilo, istantanea, { varieta: SENZA_VARIETA });
    const durata = performance.now() - inizio;
    expect(durata).toBeLessThan(2000);
    expect(bozza.viaggio.giorni).toHaveLength(14);
    expect(bozza.giorni.map((g) => g.attivita.length)).toEqual(attivitaPrevistePerGiorno(profilo, true));
    expect(bozza.fattibile).toBe(true);
    expect(validaItinerario(bozza.viaggio, istantanea)).toEqual([]);
  });

  it("14 giorni sull'istantanea di prova (le attività finiscono: giorni più leggeri con avviso)", () => {
    const istantanea = istantaneaDiProva();
    const profilo = conProfilo("PR-2", quattordici);
    const inizio = performance.now();
    const bozza = generaBozza(profilo, istantanea);
    expect(performance.now() - inizio).toBeLessThan(2000);
    expect(bozza.fattibile).toBe(true);
    expect(bozza.avvisi.some((a) => a.includes("invece di 4"))).toBe(true);
    expect(bozza.giorni.flatMap((g) => g.attivita).length).toBeLessThanOrEqual(
      istantanea.attivita.filter((a) => a.categoria !== "pasto").length,
    );
    expect(ATTIVITA_PER_RITMO.intenso).toBe(4);
  });
});
