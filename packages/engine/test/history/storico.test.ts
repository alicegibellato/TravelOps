/**
 * Storico delle versioni (REQ-ITIN-002): CA-1, CA-2, CA-4, CA-6, CA-7 e regole R-1…R-8.
 */
import { describe, expect, it } from "vitest";
import {
  applicaProposta,
  CAUSA_ITINERARIO_INIZIALE,
  creaStorico,
  elencaVersioni,
  esportaStorico,
  leggiVersione,
  rifiutaProposta,
  versioneCorrente,
  viaggioCorrente,
  type EsitoApplicazione,
  type Storico,
} from "../../src/history/index.js";
import type { ModificaRichiesta, OrigineProposta, Proposta } from "../../src/model/index.js";
import {
  elemento,
  MOMENTO_CA2,
  propostaCon,
  propostaPS1,
  storicoDopoCA2,
  storicoVersione1,
  versione1,
  viaggio,
} from "./dati.js";

function versioneCreata(esito: EsitoApplicazione) {
  if (esito.esito !== "versione_creata") throw new Error(`attesa una versione, ottenuto ${esito.esito}`);
  return esito;
}

describe("CA-1 / R-1 crea storico", () => {
  it("CA-1: lo storico della versione 1 di riferimento ha solo la versione 1, con causa \"Itinerario iniziale\"", () => {
    const esito = creaStorico(versione1());
    expect(esito.ok).toBe(true);
    if (!esito.ok) return;
    expect(elencaVersioni(esito.storico)).toEqual([{ numero: 1, momento: null, causa: "Itinerario iniziale", autore: null }]);
    expect(CAUSA_ITINERARIO_INIZIALE).toBe("Itinerario iniziale");
    expect(esito.storico.versioni).toHaveLength(1);
    const v1 = esito.storico.versioni[0]!;
    expect(v1.origine).toBeNull();
    expect(v1.propostaFattibile).toBeNull();
    expect(v1.problemi).toEqual([]);
    expect(v1.modifiche).toEqual({ aggiunti: [], rimossi: [], modificati: [] });
    const letta = leggiVersione(esito.storico, 1);
    expect(letta).toEqual({ ok: true, viaggio: versione1() });
    expect(versioneCorrente(esito.storico).numero).toBe(1);
  });

  it("un viaggio non valido non crea lo storico: VIAGGIO_NON_VALIDO con i dettagli", () => {
    const rotto = versione1();
    elemento(rotto, "D2-E2").fine = "08:00";
    const esito = creaStorico(rotto);
    expect(esito.ok).toBe(false);
    if (esito.ok) return;
    expect(esito.errore.codice).toBe("VIAGGIO_NON_VALIDO");
    expect(esito.errore.dettagli.some((d) => d.includes("ORARIO_NON_VALIDO") && d.includes("D2-E2"))).toBe(true);
  });
});

describe("CA-2 / R-3 applica proposta", () => {
  it("CA-2: P-S1 accettata da \"Alice\" il 2026-06-13 alle 07:30 crea la versione 2; la versione 1 non cambia", () => {
    const storico = storicoVersione1();
    const primaTesto = esportaStorico(storico);
    const v1 = storico.versioni[0]!;

    const esito = versioneCreata(applicaProposta(storico, propostaPS1(), "Alice", { data: "2026-06-13", ora: "07:30" }));

    expect(esito.versione.numero).toBe(2);
    expect(esito.versione.causa).toBe("Meteo avverso: pioggia in GARDA_NORD il 2026-06-13 08:00–13:00");
    expect(esito.versione.autore).toBe("Alice");
    expect(esito.versione.momento).toEqual({ data: "2026-06-13", ora: "07:30" });
    expect(esito.versione.origine).toEqual(propostaPS1().origine);
    expect(esito.versione.propostaFattibile).toBe(true);
    expect(esito.versione.viaggio).toEqual(propostaPS1().itinerario);
    expect(versioneCorrente(esito.storico)).toBe(esito.versione);
    expect(elencaVersioni(esito.storico)).toEqual([
      { numero: 1, momento: null, causa: "Itinerario iniziale", autore: null },
      {
        numero: 2,
        momento: { data: "2026-06-13", ora: "07:30" },
        causa: "Meteo avverso: pioggia in GARDA_NORD il 2026-06-13 08:00–13:00",
        autore: "Alice",
      },
    ]);

    // La versione 1 è identica a prima: stesso oggetto, stesso contenuto, e lo storico di partenza non è cambiato.
    expect(esito.storico.versioni[0]).toBe(v1);
    expect(leggiVersione(esito.storico, 1)).toEqual({ ok: true, viaggio: versione1() });
    expect(esportaStorico(storico)).toBe(primaTesto);
    expect(storico.versioni).toHaveLength(1);
  });

  it("R-3: la versione registra l'elenco delle modifiche rispetto alla precedente", () => {
    const v2 = storicoDopoCA2().versioni[1]!;
    expect(v2.modifiche.aggiunti.map((v) => v.elemento.id)).toEqual(["N1"]);
    expect(v2.modifiche.rimossi.map((v) => v.elemento.id)).toEqual(["D2-E2"]);
    expect(v2.modifiche.modificati.map((m) => m.id)).toEqual(["D2-E1", "D2-E3"]);
  });

  it("è deterministico: a parità di input lo storico esportato è identico", () => {
    expect(esportaStorico(storicoDopoCA2())).toBe(esportaStorico(storicoDopoCA2()));
  });

  it("le versioni si accumulano: la proposta costruita sulla versione 2 crea la versione 3", () => {
    const storico = storicoDopoCA2();
    const itinerario = viaggioCorrente(storico);
    elemento(itinerario, "D2-E4").orarioFisso = true;
    const modifica: ModificaRichiesta = { operazione: "imposta_orario_fisso", elementoId: "D2-E4", orarioFisso: true };
    const esito = versioneCreata(
      applicaProposta(storico, propostaCon(2, itinerario, { origine: { tipo: "modifica", modifica } }), "Bruno", {
        data: "2026-06-13",
        ora: "09:15",
      }),
    );
    expect(esito.versione.numero).toBe(3);
    expect(esito.versione.causa).toBe("Modifica richiesta: orario fisso su D2-E4");
    expect(elencaVersioni(esito.storico).map((v) => [v.numero, v.autore])).toEqual([
      [1, null],
      [2, "Alice"],
      [3, "Bruno"],
    ]);
    expect(esito.versione.modifiche.modificati).toEqual([
      expect.objectContaining({ id: "D2-E4", campi: [{ campo: "orarioFisso", prima: false, dopo: true }] }),
    ]);
  });
});

describe("R-3 causa della versione", () => {
  const casi: { nome: string; origine: OrigineProposta & { descrizione?: string }; causa: string }[] = [
    {
      nome: "RITARDO (S3)",
      origine: {
        tipo: "imprevisto",
        imprevisto: { tipo: "RITARDO", data: "2026-06-14", momento: "09:20", minuti: 120, motivo: "foratura dell'auto a noleggio" },
      },
      causa: "Ritardo di 120 minuti il 2026-06-14 alle 09:20: foratura dell'auto a noleggio",
    },
    {
      nome: "CHIUSURA_LUOGO (S4)",
      origine: {
        tipo: "imprevisto",
        imprevisto: { tipo: "CHIUSURA_LUOGO", luogoId: "MUSE", data: "2026-06-14", inizio: "00:00", fine: "24:00" },
      },
      causa: "Chiusura di MUSE il 2026-06-14 00:00–24:00",
    },
    {
      nome: "CANCELLAZIONE_SPOSTAMENTO (S5)",
      origine: { tipo: "imprevisto", imprevisto: { tipo: "CANCELLAZIONE_SPOSTAMENTO", elementoId: "D3-E1" } },
      causa: "Cancellazione dello spostamento D3-E1",
    },
    {
      nome: "modifica richiesta: aggiungi (M1, REQ-EDIT-001 CA-8)",
      origine: {
        tipo: "modifica",
        modifica: { operazione: "aggiungi", data: "2026-06-13", attivitaId: "A-CANTINA", inizio: "16:00", priorita: "opzionale" },
      },
      causa: "Modifica richiesta: aggiungi A-CANTINA il 2026-06-13 alle 16:00",
    },
    {
      nome: "modifica richiesta: rimuovi (M2)",
      origine: { tipo: "modifica", modifica: { operazione: "rimuovi", elementoId: "D2-E4" } },
      causa: "Modifica richiesta: rimuovi D2-E4 (A-PRANZO-RIVA)",
    },
    {
      nome: "modifica richiesta: sposta (M3)",
      origine: { tipo: "modifica", modifica: { operazione: "sposta", elementoId: "D1-E2", data: "2026-06-12", inizio: "17:00" } },
      causa: "Modifica richiesta: sposta D1-E2 (A-LUNGOLAGO) al 2026-06-12 alle 17:00",
    },
    {
      nome: "modifica richiesta: cambia priorità (M5)",
      origine: { tipo: "modifica", modifica: { operazione: "cambia_priorita", elementoId: "D3-E2", priorita: "irrinunciabile" } },
      causa: "Modifica richiesta: priorità di D3-E2 (A-BUONCONSIGLIO) a irrinunciabile",
    },
    {
      nome: "modifica richiesta: orario non più fisso",
      origine: { tipo: "modifica", modifica: { operazione: "imposta_orario_fisso", elementoId: "D2-E4", orarioFisso: false } },
      causa: "Modifica richiesta: orario non più fisso su D2-E4",
    },
    {
      nome: "modifica richiesta con la descrizione che arriva con la proposta",
      origine: {
        tipo: "modifica",
        modifica: { operazione: "rimuovi", elementoId: "D2-E4" },
        descrizione: "togli il pranzo sul lago",
      },
      causa: "Modifica richiesta: togli il pranzo sul lago",
    },
  ];

  for (const caso of casi) {
    it(`${caso.nome}: "${caso.causa}", con l'origine registrata`, () => {
      const proposta = propostaCon(1, propostaPS1().itinerario, { origine: caso.origine });
      const esito = versioneCreata(applicaProposta(storicoVersione1(), proposta, "Alice", MOMENTO_CA2));
      expect(esito.versione.causa).toBe(caso.causa);
      expect(esito.versione.origine).toEqual(caso.origine);
    });
  }

  it("M5 e M6 applicate alla versione 1 danno le varianti V-IRR e V-FISSO con la loro causa", () => {
    const m5 = propostaCon(1, viaggio("variante-v-irr.json"), {
      origine: { tipo: "modifica", modifica: { operazione: "cambia_priorita", elementoId: "D3-E2", priorita: "irrinunciabile" } },
    });
    const esito5 = versioneCreata(applicaProposta(storicoVersione1(), m5, "Alice", MOMENTO_CA2));
    expect(esito5.versione.viaggio).toEqual(viaggio("variante-v-irr.json"));
    expect(esito5.versione.causa).toBe("Modifica richiesta: priorità di D3-E2 (A-BUONCONSIGLIO) a irrinunciabile");

    const m6 = propostaCon(1, viaggio("variante-v-fisso.json"), {
      origine: { tipo: "modifica", modifica: { operazione: "imposta_orario_fisso", elementoId: "D2-E4", orarioFisso: true } },
    });
    const esito6 = versioneCreata(applicaProposta(storicoVersione1(), m6, "Alice", MOMENTO_CA2));
    expect(esito6.versione.causa).toBe("Modifica richiesta: orario fisso su D2-E4");
  });
});

describe("R-2 una versione non cambia più", () => {
  it("le versioni sono congelate: ogni tentativo di modifica fallisce", () => {
    const storico = storicoDopoCA2();
    const v2 = storico.versioni[1]!;
    expect(Object.isFrozen(storico)).toBe(true);
    expect(Object.isFrozen(storico.versioni)).toBe(true);
    expect(() => {
      (v2 as { causa: string }).causa = "altro";
    }).toThrow(TypeError);
    expect(() => {
      elemento(v2.viaggio, "N1").inizio = "11:00";
    }).toThrow(TypeError);
    expect(() => {
      (storico.versioni as unknown[]).push({});
    }).toThrow(TypeError);
    expect(v2.causa).toBe("Meteo avverso: pioggia in GARDA_NORD il 2026-06-13 08:00–13:00");
  });

  it("modificare il viaggio passato, la proposta accettata o il viaggio letto non cambia lo storico", () => {
    const iniziale = versione1();
    const creato = creaStorico(iniziale);
    if (!creato.ok) throw new Error("storico non creato");
    elemento(iniziale, "D1-E2").inizio = "17:00";

    const proposta = propostaPS1();
    const esito = versioneCreata(applicaProposta(creato.storico, proposta, "Alice", MOMENTO_CA2));
    const testo = esportaStorico(esito.storico);
    elemento(proposta.itinerario, "N1").fine = "12:30";
    proposta.origine = { tipo: "imprevisto", imprevisto: { tipo: "CANCELLAZIONE_SPOSTAMENTO", elementoId: "D3-E1" } };

    const letta = leggiVersione(esito.storico, 2);
    if (!letta.ok) throw new Error("versione 2 non letta");
    elemento(letta.viaggio, "D2-E1").fine = "23:00";
    viaggioCorrente(esito.storico).giorni.pop();

    expect(esportaStorico(esito.storico)).toBe(testo);
    expect(leggiVersione(esito.storico, 1)).toEqual({ ok: true, viaggio: versione1() });
  });
});

describe("leggi versione", () => {
  it("restituisce il viaggio di ogni versione; una versione che non esiste dà VERSIONE_INESISTENTE", () => {
    const storico = storicoDopoCA2();
    expect(leggiVersione(storico, 2)).toEqual({ ok: true, viaggio: propostaPS1().itinerario });
    for (const numero of [0, 3, -1, 1.5]) {
      const esito = leggiVersione(storico, numero);
      expect(esito.ok).toBe(false);
      if (esito.ok) continue;
      expect(esito.errore.codice).toBe("VERSIONE_INESISTENTE");
      expect(esito.errore.messaggio).toBe(
        `[VERSIONE_INESISTENTE] la versione ${numero} non esiste: lo storico ha le versioni da 1 a 2`,
      );
    }
  });
});

describe("CA-4 / R-5 proposta superata", () => {
  it("CA-4: una proposta costruita sulla versione 1, applicata quando la corrente è la 2, è rifiutata con PROPOSTA_SUPERATA e lo storico non cambia", () => {
    const storico = storicoDopoCA2();
    const testo = esportaStorico(storico);
    const sullaVersione1 = propostaCon(1, viaggio("variante-v-fisso.json"), {
      origine: { tipo: "modifica", modifica: { operazione: "imposta_orario_fisso", elementoId: "D2-E4", orarioFisso: true } },
    });

    const esito = applicaProposta(storico, sullaVersione1, "Alice", { data: "2026-06-13", ora: "08:00" });

    expect(esito.esito).toBe("errore");
    if (esito.esito !== "errore") return;
    expect(esito.errore.codice).toBe("PROPOSTA_SUPERATA");
    expect(esito.errore.messaggio).toBe(
      "[PROPOSTA_SUPERATA] la proposta è costruita sulla versione 1, ma la versione corrente è la 2: va ricostruita sulla versione corrente",
    );
    expect(esito.storico).toBe(storico);
    expect(esportaStorico(storico)).toBe(testo);
    expect(elencaVersioni(storico).map((v) => v.numero)).toEqual([1, 2]);
  });

  it("anche P-S1 accettata una seconda volta è superata", () => {
    const storico = storicoDopoCA2();
    const esito = applicaProposta(storico, propostaPS1(), "Alice", MOMENTO_CA2);
    expect(esito.esito === "errore" && esito.errore.codice).toBe("PROPOSTA_SUPERATA");
    expect(esito.storico).toBe(storico);
  });

  it("una proposta costruita su una versione che non esiste ancora non si applica", () => {
    const storico = storicoVersione1();
    const esito = applicaProposta(storico, propostaCon(2, propostaPS1().itinerario), "Alice", MOMENTO_CA2);
    expect(esito.esito === "errore" && esito.errore.codice).toBe("PROPOSTA_SUPERATA");
    expect(esito.storico).toBe(storico);
  });
});

describe("R-6 proposte rifiutate o non accettate", () => {
  it("rifiutare una proposta non crea versioni", () => {
    const storico = storicoVersione1();
    const esito = rifiutaProposta(storico, propostaPS1());
    expect(esito).toEqual({ esito: "rifiutata", storico });
    expect(esito.storico).toBe(storico);
    expect(elencaVersioni(esito.storico)).toHaveLength(1);
  });

  it("senza il nome di chi accetta la proposta non è accettata: ACCETTAZIONE_NON_VALIDA, nessuna versione", () => {
    const storico = storicoVersione1();
    for (const nome of ["", "   "]) {
      const esito = applicaProposta(storico, propostaPS1(), nome, MOMENTO_CA2);
      expect(esito.esito).toBe("errore");
      if (esito.esito !== "errore") continue;
      expect(esito.errore.codice).toBe("ACCETTAZIONE_NON_VALIDA");
      expect(esito.errore.messaggio).toContain("manca il nome di chi accetta");
      expect(esito.storico).toBe(storico);
    }
  });

  it("con un momento non valido la proposta non è accettata: ACCETTAZIONE_NON_VALIDA, nessuna versione", () => {
    const storico = storicoVersione1();
    const momenti = [
      { data: "2026-02-30", ora: "07:30" },
      { data: "13/06/2026", ora: "07:30" },
      { data: "2026-06-13", ora: "24:00" },
      { data: "2026-06-13", ora: "7:30" },
    ];
    for (const momento of momenti) {
      const esito = applicaProposta(storico, propostaPS1(), "Alice", momento);
      expect(esito.esito === "errore" && esito.errore.codice).toBe("ACCETTAZIONE_NON_VALIDA");
      expect(esito.storico).toBe(storico);
    }
  });

  it("il nome di chi accetta si registra senza spazi ai bordi", () => {
    const esito = versioneCreata(applicaProposta(storicoVersione1(), propostaPS1(), "  Alice ", MOMENTO_CA2));
    expect(esito.versione.autore).toBe("Alice");
  });
});

describe("CA-6 / R-7 nessuna modifica", () => {
  it("CA-6: una proposta con itinerario identico a quello corrente non crea versioni e restituisce NESSUNA_MODIFICA", () => {
    const storico = storicoVersione1();
    const esito = applicaProposta(storico, propostaCon(1, versione1()), "Alice", MOMENTO_CA2);
    expect(esito.esito).toBe("avviso");
    if (esito.esito !== "avviso") return;
    expect(esito.avviso.codice).toBe("NESSUNA_MODIFICA");
    expect(esito.avviso.messaggio).toBe(
      "[NESSUNA_MODIFICA] l'itinerario della proposta è identico a quello della versione corrente (1): nessuna nuova versione",
    );
    expect(esito.storico).toBe(storico);
    expect(elencaVersioni(esito.storico)).toHaveLength(1);
  });

  it("vale anche dopo la versione 2 e quando la proposta omette i valori predefiniti", () => {
    const storico = storicoDopoCA2();
    const identico = viaggioCorrente(storico);
    for (const giorno of identico.giorni) {
      for (const e of giorno.elementi) {
        delete e.orarioFisso;
        if (e.tipo === "attivita") delete e.priorita;
      }
    }
    const esito = applicaProposta(storico, propostaCon(2, identico), "Alice", MOMENTO_CA2);
    expect(esito.esito === "avviso" && esito.avviso.codice).toBe("NESSUNA_MODIFICA");
    expect(esito.storico).toBe(storico);
  });
});

describe("CA-7 id nuovi", () => {
  it("CA-7: dopo il CA-2 il prossimo numero per gli id nuovi del viaggio corrente è 2", () => {
    const storico = storicoDopoCA2();
    expect(viaggioCorrente(storico).prossimoNumeroId).toBe(2);
    expect(versioneCorrente(storico).viaggio.prossimoNumeroId).toBe(2);
    const v1 = leggiVersione(storico, 1);
    expect(v1.ok && v1.viaggio.prossimoNumeroId).toBe(1);
  });

  it("un id già usato non torna disponibile: il prossimo numero non scende sotto gli id N<numero> già comparsi", () => {
    const itinerario = propostaPS1().itinerario;
    itinerario.prossimoNumeroId = 1;
    const esito = versioneCreata(applicaProposta(storicoVersione1(), propostaCon(1, itinerario), "Alice", MOMENTO_CA2));
    expect(esito.versione.viaggio.prossimoNumeroId).toBe(2);
  });
});

describe("R-8 proposta non fattibile", () => {
  it("si può accettare una proposta non fattibile: la versione registra che non era fattibile e i suoi problemi", () => {
    const problema = {
      codice: "SOVRAPPOSIZIONE",
      gravita: "bloccante" as const,
      elementi: ["D2-E4", "N1"],
      messaggio: "N1 si sovrappone a D2-E4",
    };
    const proposta: Proposta = { ...propostaPS1(), fattibile: false, problemi: [problema], elementiARischio: ["D2-E4", "N1"] };
    const esito = versioneCreata(applicaProposta(storicoVersione1(), proposta, "Alice", MOMENTO_CA2));
    expect(esito.versione.numero).toBe(2);
    expect(esito.versione.propostaFattibile).toBe(false);
    expect(esito.versione.problemi).toEqual([problema]);
  });

  it("una proposta fattibile registra propostaFattibile true e nessun problema", () => {
    const v2 = storicoDopoCA2().versioni[1]!;
    expect(v2.propostaFattibile).toBe(true);
    expect(v2.problemi).toEqual([]);
  });
});

describe("proposte non valide", () => {
  function applica(proposta: Proposta): { esito: EsitoApplicazione; storico: Storico } {
    const storico = storicoVersione1();
    return { esito: applicaProposta(storico, proposta, "Alice", MOMENTO_CA2), storico };
  }

  it("un itinerario non valido è rifiutato con PROPOSTA_NON_VALIDA e i dettagli", () => {
    const itinerario = propostaPS1().itinerario;
    elemento(itinerario, "N1").fine = "09:00";
    const { esito, storico } = applica(propostaCon(1, itinerario));
    expect(esito.esito).toBe("errore");
    if (esito.esito !== "errore") return;
    expect(esito.errore.codice).toBe("PROPOSTA_NON_VALIDA");
    expect(esito.errore.dettagli.some((d) => d.startsWith("[ORARIO_NON_VALIDO] N1"))).toBe(true);
    expect(esito.storico).toBe(storico);
  });

  it("l'itinerario di un altro viaggio è rifiutato con PROPOSTA_NON_VALIDA", () => {
    const itinerario = propostaPS1().itinerario;
    itinerario.id = "TRIP-ALTRO";
    const { esito } = applica(propostaCon(1, itinerario));
    expect(esito.esito === "errore" && esito.errore.messaggio).toBe(
      "[PROPOSTA_NON_VALIDA] la proposta riguarda il viaggio TRIP-ALTRO, ma lo storico è del viaggio TRIP-GARDA",
    );
  });
});
