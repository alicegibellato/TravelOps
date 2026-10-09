/**
 * Profilo delle preferenze nel motore (§7.2): tipo, campi obbligatori, valori ammessi, predefiniti e normalizzazione;
 * un profilo incompleto dice cosa manca in parole semplici (REQ-PREF-001 CA-2, parte del motore).
 */
import { describe, expect, it } from "vitest";
import {
  cosaManca,
  validaProfilo,
  type BozzaProfilo,
  type ProblemaProfilo,
  type ProfiloPreferenze,
} from "../../src/index.js";
import { bozzaMinima, catalogoEsteso, congela, profilo, testoSemplice } from "./supporto.js";

const problemi = (bozza: unknown, catalogo = false): ProblemaProfilo[] => {
  const esito = validaProfilo(bozza, catalogo ? { catalogo: catalogoEsteso() } : {});
  return esito.ok ? [] : esito.problemi;
};

/** `[campo, tipo]` di ogni problema, nell'ordine restituito. */
const campi = (bozza: unknown, catalogo = false): [string, string][] =>
  problemi(bozza, catalogo).map((p) => [p.campo, p.tipo]);

const conBozza = (variante: Record<string, unknown>): Record<string, unknown> => ({ ...bozzaMinima(), ...variante });

describe("CA-2 — un profilo incompleto dice cosa manca, in parole semplici", () => {
  it("CA-2 una bozza vuota manca della destinazione e delle date, con i passi del percorso guidato", () => {
    expect(problemi({})).toEqual([
      {
        campo: "destinazione",
        tipo: "mancante",
        passo: 1,
        testo: "Manca la destinazione: scegli dove vuoi andare, oppure lasciati sorprendere.",
      },
      {
        campo: "date",
        tipo: "mancante",
        passo: 2,
        testo: "Mancano le date: scegli i giorni precisi, oppure il mese e quanti giorni.",
      },
    ]);
  });

  it("CA-2 qualsiasi ingresso che non è un oggetto vale come bozza vuota, senza eccezioni", () => {
    for (const ingresso of [undefined, null, "Roma", 42, [], true]) {
      expect(campi(ingresso)).toEqual([
        ["destinazione", "mancante"],
        ["date", "mancante"],
      ]);
    }
  });

  it("CA-2 con il mese manca la durata; con le date precise la durata si ricava", () => {
    const soloMese = { destinazione: { tipo: "sorprendimi" }, date: { tipo: "mese", mese: "2026-05" } };
    expect(problemi(soloMese)).toEqual([
      {
        campo: "durata",
        tipo: "mancante",
        passo: 2,
        testo: "Manca la durata: indica quanti giorni vuoi stare via, da 2 a 14.",
      },
    ]);
    expect(cosaManca({ ...soloMese, durata: 3 })).toEqual([]);
    expect(profilo(bozzaMinima()).durata).toBe(3);
  });

  it("CA-2 campi vuoti valgono come mancanti: destinazione senza nome, date precise senza ritorno, mese vuoto", () => {
    expect(
      problemi({ destinazione: { tipo: "luogo", nome: "   " }, date: { tipo: "precise", inizio: "2026-06-12" } }).map(
        (p) => [p.campo, p.tipo, p.testo],
      ),
    ).toEqual([
      ["destinazione", "mancante", "Manca la destinazione: scegli dove vuoi andare, oppure lasciati sorprendere."],
      ["date", "mancante", "Mancano le date: indica il giorno di partenza e quello di ritorno."],
    ]);
    expect(campi({ destinazione: "", date: { tipo: "mese", mese: "" } })).toEqual([
      ["destinazione", "mancante"],
      ["date", "mancante"],
    ]);
  });

  it("CA-2 cosaManca restituisce gli stessi testi, vuoto quando il profilo è completo", () => {
    expect(cosaManca({ destinazione: { tipo: "sorprendimi" } })).toEqual([
      "Mancano le date: scegli i giorni precisi, oppure il mese e quanti giorni.",
    ]);
    expect(cosaManca(bozzaMinima())).toEqual([]);
  });

  it("CA-2 ogni testo è in italiano semplice: nessun codice, nessun nome di campo, nessun valore grezzo ricevuto", () => {
    const sbagliata = {
      destinazione: { tipo: "pianeta", nome: "Marte" },
      date: { tipo: "precise", inizio: "2026-02-30", fine: "2026-03-02" },
      durata: "tre",
      viaggiatori: { adulti: 0, bambini: [18, "sei"] },
      tipoGruppo: "colleghi",
      stili: ["cultura", "spiaggia"],
      ritmo: "frenetico",
      formaFisica: "atletico",
      budget: "€€€€",
      orari: "alba",
      pasti: { pranzo: "sì" },
      mezzi: ["volo"],
      irrinunciabili: { attivita: ["A-NESSUNA"], stili: ["relax"] },
      daEvitare: { attivita: [""], categorie: ["shopping"], stili: ["cultura", "relax", "nightlife"] },
      esigenze: ["animali_ammessi"],
    };
    const elenco = [
      ...problemi(sbagliata),
      ...problemi(conBozza({ stili: ["cultura"], daEvitare: { stili: ["cultura"] } })),
      ...problemi(conBozza({ irrinunciabili: { attivita: ["A-PONALE", "A-X", "A-Y"] }, daEvitare: { stili: ["avventura"] } }), true),
      ...problemi(conBozza({ irrinunciabili: { attivita: ["A-X"] }, daEvitare: { attivita: ["A-X"] } })),
      ...problemi(conBozza({ stili: [], mezzi: [] })),
      ...problemi(conBozza({ date: { tipo: "precise", inizio: "2026-06-15", fine: "2026-06-12" } })),
      ...problemi(conBozza({ date: { tipo: "precise", inizio: "2026-06-01", fine: "2026-06-30" } })),
      ...problemi(conBozza({ durata: 4 })),
      ...problemi({ destinazione: { tipo: "sorprendimi" }, date: { tipo: "mese", mese: "2026-05" } }),
      ...problemi({}),
    ];
    expect(elenco.length).toBeGreaterThan(20);
    for (const { testo } of elenco) {
      expect(testoSemplice(testo), testo).toBe(true);
      for (const grezzo of ["pianeta", "Marte", "tre", "colleghi", "spiaggia", "frenetico", "atletico", "€€€€", "alba", "volo", "A-NESSUNA", "shopping", "nightlife", "animali"]) {
        expect(testo, testo).not.toContain(grezzo);
      }
    }
  });
});

describe("§7.2 — valori ammessi", () => {
  it("ogni valore non ammesso è un problema del suo campo, mai sostituito in silenzio, nell'ordine della §7.2", () => {
    expect(
      campi({
        esigenze: ["animali_ammessi"],
        destinazione: { tipo: "pianeta", nome: "Marte" },
        date: { tipo: "settimana" },
        durata: 20,
        viaggiatori: { adulti: 0 },
        tipoGruppo: "colleghi",
        stili: ["spiaggia"],
        ritmo: "frenetico",
        formaFisica: "atletico",
        budget: "€€€€",
        orari: "alba",
        pasti: { cena: "no" },
        mezzi: ["volo"],
        irrinunciabili: { attivita: [42] },
        daEvitare: { categorie: ["shopping"] },
      }),
    ).toEqual([
      ["destinazione", "non_valido"],
      ["date", "non_valido"],
      ["durata", "non_valido"],
      ["viaggiatori", "non_valido"],
      ["tipoGruppo", "non_valido"],
      ["stili", "non_valido"],
      ["ritmo", "non_valido"],
      ["formaFisica", "non_valido"],
      ["budget", "non_valido"],
      ["orari", "non_valido"],
      ["pasti", "non_valido"],
      ["mezzi", "non_valido"],
      ["irrinunciabili", "non_valido"],
      ["daEvitare", "non_valido"],
      ["esigenze", "non_valido"],
    ]);
  });

  it("i testi dei valori non ammessi elencano le scelte possibili con le etichette per il viaggiatore", () => {
    const testi = problemi(conBozza({ ritmo: "frenetico", stili: ["spiaggia"], mezzi: ["volo"] })).map((p) => p.testo);
    expect(testi).toEqual([
      "Uno degli stili scelti non è tra quelli disponibili: scegli tra Relax, Cultura, Natura, Avventura, Gastronomia, Romantico e Famiglia.",
      "La scelta per ritmo non è tra quelle disponibili: scegli tra Lento, Bilanciato e Intenso.",
      "Uno dei mezzi scelti non è tra quelli disponibili: scegli tra A piedi, Mezzi pubblici, Treno e Auto.",
    ]);
  });

  it("date: giorni inesistenti, ritorno prima della partenza, durata fuori da 2–14, mese non valido", () => {
    const testo = (date: unknown, durata?: unknown): string[] =>
      problemi(conBozza({ date, ...(durata === undefined ? {} : { durata }) })).map((p) => p.testo);
    expect(testo({ tipo: "precise", inizio: "2026-02-29", fine: "2026-03-02" })).toEqual([
      "Le date non sono valide: scegli di nuovo il giorno di partenza e quello di ritorno.",
    ]);
    expect(testo({ tipo: "precise", inizio: "2026-06-15", fine: "2026-06-12" })).toEqual([
      "Il giorno di ritorno viene prima di quello di partenza.",
    ]);
    expect(testo({ tipo: "precise", inizio: "2026-06-12", fine: "2026-06-12" })).toEqual([
      "Tra le date scelte c'è 1 giorno: il viaggio può durare da 2 a 14 giorni.",
    ]);
    expect(testo({ tipo: "precise", inizio: "2026-06-01", fine: "2026-06-15" })).toEqual([
      "Tra le date scelte ci sono 15 giorni: il viaggio può durare da 2 a 14 giorni.",
    ]);
    expect(testo({ tipo: "precise", inizio: "2026-06-12", fine: "2026-06-15" }, 5)).toEqual([
      "La durata di 5 giorni non coincide con le date scelte, che ne comprendono 4.",
    ]);
    for (const mese of ["2026-13", "2026-6", "giugno", 202606]) {
      expect(campi(conBozza({ date: { tipo: "mese", mese }, durata: 3 }))).toEqual([["date", "non_valido"]]);
    }
    for (const durata of [1, 15, 2.5, "3"]) {
      expect(campi(conBozza({ date: { tipo: "mese", mese: "2026-06" }, durata }))).toEqual([["durata", "non_valido"]]);
    }
  });

  it("limiti accettati: 2 e 14 giorni, date a cavallo dell'anno, il 29 febbraio di un anno bisestile", () => {
    expect(profilo(conBozza({ date: { tipo: "precise", inizio: "2026-12-30", fine: "2027-01-12" } })).durata).toBe(14);
    expect(profilo(conBozza({ date: { tipo: "precise", inizio: "2028-02-28", fine: "2028-02-29" } })).durata).toBe(2);
    expect(profilo(conBozza({ date: { tipo: "mese", mese: "2026-08" }, durata: 2 })).durata).toBe(2);
    expect(profilo(conBozza({ date: { tipo: "mese", mese: "2026-08" }, durata: 14 })).durata).toBe(14);
  });

  it("viaggiatori: almeno un adulto, età dei bambini da 0 a 17 anni", () => {
    const testi = (viaggiatori: unknown): string[] => problemi(conBozza({ viaggiatori })).map((p) => p.testo);
    expect(testi({ adulti: 0, bambini: [] })).toEqual([
      "Serve almeno un adulto: il numero di adulti deve essere un numero intero, da 1 in su.",
    ]);
    expect(testi({ adulti: 2, bambini: [18] })).toEqual([
      "Indica l'età di ogni bambino con un numero intero da 0 a 17 anni.",
    ]);
    for (const viaggiatori of [{ adulti: 1.5 }, { adulti: "2" }, { bambini: [-1] }, { bambini: [6.5] }, { bambini: 2 }, 3]) {
      expect(campi(conBozza({ viaggiatori }))).toEqual([["viaggiatori", "non_valido"]]);
    }
    expect(profilo(conBozza({ viaggiatori: { adulti: 1, bambini: [0, 17] } })).viaggiatori).toEqual({
      adulti: 1,
      bambini: [0, 17],
    });
  });

  it("stili e mezzi: almeno uno se indicati", () => {
    expect(problemi(conBozza({ stili: [], mezzi: [] })).map((p) => [p.campo, p.testo])).toEqual([
      ["stili", "Scegli almeno uno stile di viaggio."],
      ["mezzi", "Scegli almeno un mezzo per spostarti."],
    ]);
  });
});

describe("§7.2 — predefiniti e normalizzazione", () => {
  it("con i soli campi obbligatori il profilo prende tutti i predefiniti della §7.2", () => {
    expect(profilo(bozzaMinima())).toStrictEqual<ProfiloPreferenze>({
      destinazione: { tipo: "luogo", nome: "Roma" },
      date: { tipo: "precise", inizio: "2026-10-02", fine: "2026-10-04" },
      durata: 3,
      viaggiatori: { adulti: 2, bambini: [] },
      tipoGruppo: "coppia",
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
    });
  });

  it("il tipo di gruppo si ricava dai viaggiatori se manca, e resta quello scelto se c'è", () => {
    const gruppo = (viaggiatori: BozzaProfilo["viaggiatori"], tipoGruppo?: BozzaProfilo["tipoGruppo"]): string =>
      profilo(conBozza({ viaggiatori, ...(tipoGruppo === undefined ? {} : { tipoGruppo }) })).tipoGruppo;
    expect(gruppo({ adulti: 1 })).toBe("da_solo");
    expect(gruppo({ adulti: 2 })).toBe("coppia");
    expect(gruppo({ adulti: 4 })).toBe("amici");
    expect(gruppo({ adulti: 1, bambini: [5] })).toBe("famiglia");
    expect(gruppo({ adulti: 2 }, "amici")).toBe("amici");
    expect(gruppo({ bambini: [3] })).toBe("famiglia");
    expect(profilo(conBozza({ viaggiatori: { bambini: [3] } })).viaggiatori).toEqual({ adulti: 2, bambini: [3] });
  });

  it("pasti: un pasto non indicato vale sì", () => {
    expect(profilo(conBozza({ pasti: { cena: false } })).pasti).toEqual({ pranzo: true, cena: false });
  });

  it("gli stili predefiniti non comprendono quelli da evitare; se li escludono tutti è un problema", () => {
    expect(profilo(conBozza({ daEvitare: { stili: ["natura"] } })).stili).toEqual(["cultura"]);
    expect(problemi(conBozza({ daEvitare: { stili: ["natura", "cultura"] } }))).toEqual([
      {
        campo: "stili",
        tipo: "non_valido",
        passo: 4,
        testo: "Gli stili proposti (Cultura e Natura) sono tutti tra quelli da evitare: scegli almeno uno stile di viaggio.",
      },
    ]);
  });

  it("stesse scelte in ordine diverso o ripetute danno lo stesso profilo (filtri e chat scrivono lo stesso profilo)", () => {
    const dalPercorso = profilo(
      conBozza({
        stili: ["romantico", "natura", "gastronomia"],
        mezzi: ["auto", "piedi"],
        viaggiatori: { adulti: 2, bambini: [9, 6] },
        irrinunciabili: { attivita: ["A-MAG", "A-CANTINA"], stili: ["romantico"] },
        daEvitare: { attivita: ["A-PONALE"], categorie: ["pasto", "cultura"], stili: ["famiglia", "avventura"] },
        esigenze: ["senza_glutine", "vegetariano"],
      }),
    );
    const dallaChat = profilo({
      esigenze: ["vegetariano", "senza_glutine", "vegetariano"],
      daEvitare: { stili: ["avventura", "famiglia"], categorie: ["cultura", "pasto"], attivita: [" A-PONALE "] },
      irrinunciabili: { stili: ["romantico", "romantico"], attivita: ["A-CANTINA", "A-MAG", "A-CANTINA"] },
      viaggiatori: { bambini: [6, 9], adulti: 2 },
      mezzi: ["piedi", "auto", "auto"],
      stili: ["gastronomia", "natura", "romantico", "natura"],
      date: { fine: "2026-10-04", inizio: "2026-10-02", tipo: "precise" },
      destinazione: { nome: " Roma ", tipo: "luogo" },
    });
    expect(dallaChat).toStrictEqual(dalPercorso);
    expect(dalPercorso.stili).toEqual(["natura", "gastronomia", "romantico"]);
    expect(dalPercorso.mezzi).toEqual(["piedi", "auto"]);
    expect(dalPercorso.viaggiatori.bambini).toEqual([6, 9]);
    expect(dalPercorso.irrinunciabili.attivita).toEqual(["A-CANTINA", "A-MAG"]);
    expect(dalPercorso.daEvitare).toEqual({
      attivita: ["A-PONALE"],
      categorie: ["cultura", "pasto"],
      stili: ["avventura", "famiglia"],
    });
    expect(dalPercorso.esigenze).toEqual(["vegetariano", "senza_glutine"]);
    expect(dalPercorso.tipoGruppo).toBe("famiglia");
  });

  it("la validazione è idempotente, non modifica l'ingresso e non condivide oggetti con i predefiniti", () => {
    const bozza = congela(conBozza({ stili: ["natura", "cultura"], pasti: { pranzo: false } }));
    const primo = profilo(bozza);
    expect(profilo(primo)).toStrictEqual(primo);
    primo.mezzi.push("auto");
    primo.viaggiatori.bambini.push(4);
    primo.daEvitare.stili.push("relax");
    expect(profilo(bozzaMinima())).toMatchObject({
      mezzi: ["piedi", "mezzi_pubblici", "treno", "auto"],
      viaggiatori: { adulti: 2, bambini: [] },
      daEvitare: { stili: [] },
    });
  });

  it("la destinazione può portare il riferimento della ricerca; sorprendimi non ha nome", () => {
    expect(profilo(conBozza({ destinazione: { tipo: "luogo", nome: "Lisbona", riferimento: " relation/123 " } })).destinazione).toEqual({
      tipo: "luogo",
      nome: "Lisbona",
      riferimento: "relation/123",
    });
    expect(profilo(conBozza({ destinazione: { tipo: "sorprendimi", nome: "ignorato" } })).destinazione).toEqual({
      tipo: "sorprendimi",
    });
    expect(campi(conBozza({ destinazione: { tipo: "luogo", nome: "Lisbona", riferimento: 7 } }))).toEqual([
      ["destinazione", "non_valido"],
    ]);
  });
});

describe("§7.2 — coerenza tra irrinunciabili e cose da evitare", () => {
  it("uno stile non può essere insieme scelto, o irrinunciabile, e da evitare", () => {
    expect(
      problemi(conBozza({ stili: ["cultura", "natura"], irrinunciabili: { stili: ["natura"] }, daEvitare: { stili: ["natura"] } })).map(
        (p) => [p.campo, p.testo],
      ),
    ).toEqual([
      ["daEvitare", "Lo stile Natura è tra quelli che ti piacciono ma anche tra quelli da evitare: scegli dove tenerlo."],
      ["daEvitare", "Lo stile Natura è sia tra gli irrinunciabili sia tra quelli da evitare: scegli dove tenerlo."],
    ]);
  });

  it("un'attività non può essere insieme irrinunciabile e da evitare; con il catalogo la si chiama per nome", () => {
    const bozza = conBozza({ irrinunciabili: { attivita: ["A-MAG"] }, daEvitare: { attivita: ["A-MAG"] } });
    expect(cosaManca(bozza)).toEqual([
      "Un'attività è sia tra le cose irrinunciabili sia tra quelle da evitare: scegli dove tenerla.",
    ]);
    expect(cosaManca(bozza, { catalogo: catalogoEsteso() })).toEqual([
      "«Visita al MAG» è sia tra le cose irrinunciabili sia tra quelle da evitare: scegli dove tenerla.",
    ]);
  });

  it("con il catalogo: attività sconosciute e irrinunciabili che rientrano in categorie o stili da evitare", () => {
    const bozza = conBozza({
      irrinunciabili: { attivita: ["A-PONALE", "A-MUSE", "A-X", "A-Y"] },
      daEvitare: { attivita: ["A-Z"], categorie: ["cultura"], stili: ["avventura"] },
    });
    expect(cosaManca(bozza)).toEqual([]);
    expect(problemi(bozza, true).map((p) => [p.campo, p.testo])).toEqual([
      ["irrinunciabili", "2 attività irrinunciabili non si trovano tra quelle della destinazione: sceglile di nuovo."],
      ["daEvitare", "Una delle attività da evitare non si trova tra quelle della destinazione: sceglila di nuovo."],
      [
        "daEvitare",
        "«Visita al MUSE» è tra le cose irrinunciabili ma rientra in ciò che vuoi evitare: togli una delle due scelte.",
      ],
      [
        "daEvitare",
        "«Trekking sul Sentiero del Ponale» è tra le cose irrinunciabili ma rientra in ciò che vuoi evitare: togli una delle due scelte.",
      ],
    ]);
  });
});
