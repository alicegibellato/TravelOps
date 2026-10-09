import { describe, expect, it } from "vitest";
import {
  caricaCatalogo,
  caricaViaggio,
  CODICI_ERRORE,
  validaItinerario,
  type ErroreValidazione,
} from "../../src/itinerary/index.js";
import type { Catalogo, Viaggio } from "../../src/model/index.js";
import { catalogoDiRiferimento, elemento, FILE_VIAGGI, leggiRiferimento, type Grezzo } from "./dati.js";

describe("CA-1 — i dati di riferimento si caricano e sono validi", () => {
  it("CA-1 il catalogo di riferimento si carica senza errori", () => {
    const esito = caricaCatalogo(leggiRiferimento("catalogo.json"));
    expect(esito).toEqual({ ok: true, valore: leggiRiferimento("catalogo.json") });
  });

  it.each(FILE_VIAGGI)("CA-1 %s si carica e la validazione con il catalogo non restituisce errori", (file) => {
    const catalogo = catalogoDiRiferimento();
    const esito = caricaViaggio(leggiRiferimento(file), catalogo);
    expect(esito.ok ? [] : esito.errori).toEqual([]);
    if (!esito.ok) return;
    expect(esito.valore).toEqual(leggiRiferimento(file));
    expect(validaItinerario(esito.valore, catalogo)).toEqual([]);
  });

  it("CA-1 si carica anche il testo JSON letto dal file, non solo il valore decodificato", () => {
    const testo = JSON.stringify(leggiRiferimento("versione-1.json"));
    const esito = caricaViaggio(testo, catalogoDiRiferimento());
    expect(esito.ok).toBe(true);
  });

  it("l'itinerario della proposta P-S1 (id nuovo N1, prossimo numero 2) è valido", () => {
    const catalogo = catalogoDiRiferimento();
    const esito = caricaViaggio(leggiRiferimento("proposta-p-s1.json").itinerario, catalogo);
    expect(esito.ok).toBe(true);
    if (esito.ok) expect(validaItinerario(esito.valore, catalogo)).toEqual([]);
  });
});

describe("CA-6 — valori predefiniti al caricamento", () => {
  it("CA-6 un'attività senza priorità viene caricata con priorità desiderata", () => {
    const grezzo = leggiRiferimento("versione-1.json");
    delete elemento(grezzo, "D1-E2").priorita;
    delete elemento(grezzo, "D3-E6").priorita;
    const esito = caricaViaggio(grezzo, catalogoDiRiferimento());
    expect(esito.ok).toBe(true);
    if (!esito.ok) return;
    expect(elemento(esito.valore, "D1-E2").priorita).toBe("desiderata");
    expect(elemento(esito.valore, "D3-E6").priorita).toBe("desiderata");
  });

  it("CA-6 un elemento senza indicazione di orario fisso viene caricato come non fisso", () => {
    const grezzo = leggiRiferimento("variante-v-volo.json");
    for (const giorno of grezzo.giorni) for (const voce of giorno.elementi) if (voce.id !== "D3-E9") delete voce.orarioFisso;
    const esito = caricaViaggio(grezzo, catalogoDiRiferimento());
    expect(esito.ok).toBe(true);
    if (!esito.ok) return;
    const elementi = esito.valore.giorni.flatMap((g) => g.elementi);
    expect(elementi.filter((e) => e.orarioFisso === false).map((e) => e.id)).toHaveLength(16);
    expect(elemento(esito.valore, "D3-E9").orarioFisso).toBe(true);
  });

  it("CA-6 con i valori predefiniti il viaggio caricato coincide con la versione 1 che li scrive esplicitamente", () => {
    const grezzo = leggiRiferimento("versione-1.json");
    for (const giorno of grezzo.giorni) {
      for (const voce of giorno.elementi) {
        delete voce.orarioFisso;
        delete voce.priorita;
      }
    }
    expect(caricaViaggio(grezzo)).toEqual({ ok: true, valore: leggiRiferimento("versione-1.json") });
  });
});

/** Proxy che solleva un'eccezione a ogni lettura: simula un dato che non si riesce nemmeno a leggere. */
function oggettoOstile(): object {
  const esplodi = (): never => {
    throw new Error("lettura impossibile");
  };
  return new Proxy({}, { get: esplodi, has: esplodi, getOwnPropertyDescriptor: esplodi, ownKeys: esplodi });
}

function viaggioConGiorni(giorni: unknown): Grezzo {
  return { ...leggiRiferimento("versione-1.json"), giorni };
}

const viaggiNonValidi: [string, unknown][] = [
  ["undefined", undefined],
  ["null", null],
  ["un numero", 42],
  ["un booleano", true],
  ["un testo che non è JSON", "{ questo non è json"],
  ["un testo vuoto", ""],
  ["il testo JSON di un numero", "42"],
  ["un elenco", []],
  ["un oggetto vuoto", {}],
  ["giorni che non sono un elenco", viaggioConGiorni("tre giorni")],
  ["giorni con valori di ogni tipo", viaggioConGiorni([null, 7, "x", [], { data: 20260612, elementi: {} }])],
  [
    "elementi con valori di ogni tipo",
    viaggioConGiorni([
      {
        data: "2026-06-12",
        luogoPartenza: 5,
        alloggio: [],
        elementi: [
          null,
          1,
          "x",
          [],
          { tipo: 3, inizio: 900, fine: {}, orarioFisso: "sì", prenotazione: "XY", priorita: [] },
          { id: "A", tipo: "attivita", inizio: "10:00", fine: "11:00", attivitaId: {}, prenotazione: { linkGestione: 7 } },
          { id: "B", tipo: "spostamento", inizio: "-1:00", fine: "99:99", da: null, a: 3, mezzo: {} },
        ],
      },
    ]),
  ],
  [
    "campi del viaggio con tipi sbagliati",
    {
      id: 1,
      titolo: [],
      dataInizio: {},
      dataFine: true,
      fusoOrario: 0,
      numeroViaggiatori: "2",
      prossimoNumeroId: Number.NaN,
      giorni: {},
    },
  ],
  ["date impossibili", { ...leggiRiferimento("versione-1.json"), dataInizio: "2026-02-30", dataFine: "2026-13-01" }],
  ["un intervallo di date enorme", { ...leggiRiferimento("versione-1.json"), dataInizio: "0001-01-01", dataFine: "9999-12-31" }],
  ["valori JavaScript che il JSON non ha (BigInt, simboli, funzioni)", { id: 10n, titolo: Symbol("x"), giorni: [() => 1] }],
  ["un oggetto che solleva eccezioni a ogni lettura", oggettoOstile()],
  ["un viaggio con un giorno che solleva eccezioni", viaggioConGiorni([oggettoOstile()])],
];

const catalogiNonValidi: [string, unknown][] = [
  ["undefined", undefined],
  ["null", null],
  ["un testo che non è JSON", "zone: []"],
  ["un elenco", [1, 2]],
  ["un oggetto vuoto", {}],
  ["elenchi che non sono elenchi", { zone: "x", luoghi: 1, attivita: {} }],
  ["voci di ogni tipo", { zone: [null, 1, []], luoghi: ["x", { apertura: 5 }], attivita: [{ durataTipica: "lunga" }] }],
  [
    "orari di apertura strani",
    {
      zone: [{ id: "Z", nome: "Z", coordinate: { lat: "nord", lon: Number.POSITIVE_INFINITY } }],
      luoghi: [
        { id: "L1", nome: "L", zonaId: "Z", tipo: "museo", apertura: { settimana: { lun: "chiuso", xyz: [] } } },
        { id: "L2", nome: "L", zonaId: "Z", tipo: "museo", apertura: { settimana: { lun: [null, { apertura: 9 }] } } },
        { id: "L3", nome: "L", zonaId: "Z", tipo: "museo", apertura: { sempre: "sì" } },
      ],
      attivita: [],
    },
  ],
  ["un oggetto che solleva eccezioni a ogni lettura", oggettoOstile()],
];

function controllaErrori(errori: ErroreValidazione[]): void {
  expect(errori.length).toBeGreaterThan(0);
  for (const errore of errori) {
    expect(CODICI_ERRORE).toContain(errore.codice);
    expect(errore.id).not.toBe("");
    expect(errore.motivo).not.toBe("");
    expect(errore.messaggio).toContain(errore.codice);
    expect(errore.messaggio).toContain(errore.id);
  }
}

describe("CA-7 — i dati non validi non provocano eccezioni", () => {
  it.each(viaggiNonValidi)("CA-7 caricaViaggio con %s restituisce errori senza eccezioni", (_nome, dati) => {
    let esito: ReturnType<typeof caricaViaggio> | undefined;
    expect(() => {
      esito = caricaViaggio(dati, catalogoDiRiferimento());
    }).not.toThrow();
    expect(esito?.ok).toBe(false);
    if (esito !== undefined && !esito.ok) controllaErrori(esito.errori);
  });

  it.each(catalogiNonValidi)("CA-7 caricaCatalogo con %s restituisce errori senza eccezioni", (_nome, dati) => {
    let esito: ReturnType<typeof caricaCatalogo> | undefined;
    expect(() => {
      esito = caricaCatalogo(dati);
    }).not.toThrow();
    expect(esito?.ok).toBe(false);
    if (esito !== undefined && !esito.ok) controllaErrori(esito.errori);
  });

  it("CA-7 validaItinerario non solleva eccezioni neanche con viaggio e catalogo non validi", () => {
    for (const [, viaggio] of viaggiNonValidi) {
      for (const [, catalogo] of catalogiNonValidi) {
        let errori: ErroreValidazione[] = [];
        expect(() => {
          errori = validaItinerario(viaggio as Viaggio, catalogo as Catalogo);
        }).not.toThrow();
        controllaErrori(errori);
      }
    }
  });

  it("CA-7 un intervallo di date enorme dà un solo errore per ogni gruppo di giorni mancanti", () => {
    const grezzo = { ...leggiRiferimento("versione-1.json"), dataInizio: "0001-01-01", dataFine: "9999-12-31" };
    grezzo.giorni[2].alloggio = "HOTEL";
    const esito = caricaViaggio(grezzo);
    expect(esito.ok).toBe(false);
    if (esito.ok) return;
    expect(esito.errori.map((e) => [e.codice, e.id])).toEqual([
      ["GIORNI_NON_VALIDI", "0001-01-01"],
      ["GIORNI_NON_VALIDI", "2026-06-15"],
    ]);
    expect(esito.errori[0]?.motivo).toBe("mancano i giorni del viaggio TRIP-GARDA dal 0001-01-01 al 2026-06-11");
    expect(esito.errori[1]?.motivo).toBe("mancano i giorni del viaggio TRIP-GARDA dal 2026-06-15 al 9999-12-31");
  });

  it("CA-7 il caricamento non modifica il JSON ricevuto e restituisce un oggetto nuovo", () => {
    const grezzo = leggiRiferimento("versione-1.json");
    delete elemento(grezzo, "D1-E2").priorita;
    const copia = structuredClone(grezzo);
    const esito = caricaViaggio(grezzo);
    expect(grezzo).toEqual(copia);
    expect(esito.ok).toBe(true);
    if (esito.ok) expect(esito.valore).not.toBe(grezzo);
  });
});
