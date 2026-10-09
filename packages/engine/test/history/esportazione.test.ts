/**
 * Esportazione e importazione dello storico (REQ-ITIN-002, CA-5).
 */
import { describe, expect, it } from "vitest";
import {
  applicaProposta,
  elencaVersioni,
  esportaStorico,
  importaStorico,
  type Storico,
} from "../../src/history/index.js";
import type { Proposta } from "../../src/model/index.js";
import { MOMENTO_CA2, propostaCon, propostaPS1, storicoDopoCA2, storicoVersione1, viaggio } from "./dati.js";

function importa(json: unknown): Storico {
  const esito = importaStorico(json);
  if (!esito.ok) throw new Error(`${esito.errore.messaggio}: ${esito.errore.dettagli.join("; ")}`);
  return esito.storico;
}

/** Storico con tre versioni: P-S1 (imprevisto) e poi M6 (modifica richiesta) accettata anche se non fattibile. */
function storicoTreVersioni(): Storico {
  const storico = storicoDopoCA2();
  const itinerario = structuredClone(storico.versioni[1]!.viaggio);
  const pranzo = itinerario.giorni[1]!.elementi.find((e) => e.id === "D2-E4")!;
  pranzo.orarioFisso = true;
  pranzo.prenotazione = { fornitore: "Ristorante sul lago", codice: "T-12", linkGestione: "https://example.com/t12" };
  const proposta: Proposta = propostaCon(2, itinerario, {
    origine: {
      tipo: "modifica",
      modifica: { operazione: "imposta_orario_fisso", elementoId: "D2-E4", orarioFisso: true },
    },
    fattibile: false,
    problemi: [{ codice: "PROVA", gravita: "bloccante", elementi: ["D2-E4"], messaggio: "problema di prova" }],
  });
  const esito = applicaProposta(storico, proposta, "Bruno", { data: "2026-06-13", ora: "09:00" });
  if (esito.esito !== "versione_creata") throw new Error(esito.esito);
  return esito.storico;
}

describe("CA-5 esporta e importa", () => {
  it("CA-5: esportare e reimportare lo storico del CA-2 restituisce le stesse versioni", () => {
    const storico = storicoDopoCA2();
    const testo = esportaStorico(storico);
    const importato = importa(testo);
    expect(importato).toEqual(storico);
    expect(importato.versioni).toHaveLength(2);
    expect(elencaVersioni(importato)).toEqual(elencaVersioni(storico));
    expect(esportaStorico(importato)).toBe(testo);
  });

  it("CA-5: vale anche per la sola versione 1 e per uno storico con modifica richiesta, prenotazione e proposta non fattibile", () => {
    for (const storico of [storicoVersione1(), storicoTreVersioni()]) {
      const testo = esportaStorico(storico);
      const importato = importa(testo);
      expect(importato).toEqual(storico);
      expect(esportaStorico(importato)).toBe(testo);
    }
    const terza = importa(esportaStorico(storicoTreVersioni())).versioni[2]!;
    expect(terza.causa).toBe("Modifica richiesta: orario fisso su D2-E4");
    expect(terza.propostaFattibile).toBe(false);
    expect(terza.autore).toBe("Bruno");
  });

  it("accetta anche il valore già decodificato e restituisce uno storico congelato", () => {
    const importato = importa(JSON.parse(esportaStorico(storicoDopoCA2())));
    expect(Object.isFrozen(importato)).toBe(true);
    expect(Object.isFrozen(importato.versioni[1]!.viaggio.giorni[1]!.elementi[1])).toBe(true);
  });

  it("lo storico importato si usa come l'originale: la proposta superata è rifiutata, quella sulla versione 2 crea la 3", () => {
    const importato = importa(esportaStorico(storicoDopoCA2()));
    const superata = applicaProposta(importato, propostaPS1(), "Alice", MOMENTO_CA2);
    expect(superata.esito === "errore" && superata.errore.codice).toBe("PROPOSTA_SUPERATA");

    const nuova = applicaProposta(importato, propostaCon(2, viaggio("variante-v-fisso.json")), "Alice", MOMENTO_CA2);
    expect(nuova.esito === "versione_creata" && nuova.versione.numero).toBe(3);
  });
});

describe("importazione di uno storico non valido", () => {
  function problemi(json: unknown): string[] {
    const esito = importaStorico(json);
    expect(esito.ok).toBe(false);
    if (esito.ok) return [];
    expect(esito.errore.codice).toBe("STORICO_NON_VALIDO");
    expect(esito.errore.messaggio).toBe("[STORICO_NON_VALIDO] lo storico da importare non è valido");
    return esito.errore.dettagli;
  }

  function esportato(): any {
    return JSON.parse(esportaStorico(storicoDopoCA2()));
  }

  it("testo che non è JSON, elenco delle versioni mancante o vuoto", () => {
    expect(problemi("{ non è json")).toEqual(["il testo non è JSON valido"]);
    expect(problemi({})).toEqual(["versioni: manca l'elenco delle versioni (valore trovato: {})"]);
    expect(problemi({ versioni: [] })).toEqual(["versioni: lo storico deve avere almeno la versione 1"]);
  });

  it("numeri non consecutivi e causa della versione 1 diversa da \"Itinerario iniziale\"", () => {
    const dati = esportato();
    dati.versioni[1].numero = 3;
    dati.versioni[0].causa = "Altro";
    expect(problemi(dati)).toEqual([
      'versioni[0].causa: la versione 1 ha causa "Itinerario iniziale", trovato "Altro"',
      "versioni[1].numero: atteso 2 (le versioni sono numerate da 1 senza salti), trovato 3",
    ]);
  });

  it("versione successiva senza autore, con momento non valido o origine sconosciuta", () => {
    const dati = esportato();
    dati.versioni[1].autore = "";
    dati.versioni[1].momento = { data: "2026-06-13", ora: "25:00" };
    dati.versioni[1].origine = { tipo: "sconosciuta" };
    const trovati = problemi(dati);
    expect(trovati).toHaveLength(3);
    expect(trovati[0]).toMatch(/^versioni\[1\]\.momento: /);
    expect(trovati[1]).toMatch(/^versioni\[1\]\.autore: /);
    expect(trovati[2]).toBe('versioni[1].origine: tipo di origine sconosciuto: "sconosciuta"');
  });

  it("modifiche registrate che non corrispondono alle differenze tra le versioni", () => {
    const dati = esportato();
    dati.versioni[1].modifiche.rimossi = [];
    expect(problemi(dati)).toEqual([
      "versioni[1].modifiche: le modifiche registrate non corrispondono alle differenze con la versione precedente",
    ]);
  });

  it("viaggio di una versione non valido o di un altro viaggio", () => {
    const rotto = esportato();
    rotto.versioni[1].viaggio.giorni[1].elementi[1].fine = "09:00";
    expect(problemi(rotto).some((p) => p.startsWith("versioni[1].viaggio: [ORARIO_NON_VALIDO] N1"))).toBe(true);

    const altro = esportato();
    altro.versioni[1].viaggio.id = "TRIP-ALTRO";
    expect(problemi(altro)).toContain(
      'versioni[1].viaggio.id: tutte le versioni sono dello stesso viaggio (TRIP-GARDA), trovato "TRIP-ALTRO"',
    );
  });
});
