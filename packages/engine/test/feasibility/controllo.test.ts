import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { creaSorgenteDaFile } from "../../src/context/index.js";
import {
  CODICI_PROBLEMA_FATTIBILITA,
  ErroreDatiNonValidi,
  GRAVITA_PROBLEMI_FATTIBILITA,
  controllaFattibilita,
  eFattibile,
  type CodiceProblemaFattibilita,
} from "../../src/feasibility/index.js";
import type { DatiContesto, Elemento, PrevisioneMeteo, Viaggio } from "../../src/model/index.js";
import {
  ITINERARI_DI_RIFERIMENTO,
  cartellaRiferimento,
  catalogo,
  chiusuraS4,
  contesto,
  leggiRiferimento,
  mezzo,
  orario,
  previsioneS1,
  rimuovi,
  sorgenteFinta,
  versione1,
} from "./supporto.js";

/** Controllo con il catalogo di riferimento e una sorgente finta (per default con i dati di contesto di riferimento). */
const controlla = (viaggio: Viaggio, dati: DatiContesto = contesto()) =>
  controllaFattibilita(viaggio, catalogo(), sorgenteFinta(dati));

/** Viaggio di un solo giorno, per i casi che le date della versione 1 non coprono. */
const unGiorno = (data: string, elementi: Elemento[], alloggio?: string): Viaggio => ({
  ...versione1(),
  dataInizio: data,
  dataFine: data,
  giorni: [{ data, luogoPartenza: "HOTEL", elementi, ...(alloggio === undefined ? {} : { alloggio }) }],
});

const andataERitorno = (luogo: string, prima: [string, string], attivita: Elemento, dopo: [string, string]): Elemento[] => [
  { id: "X-E1", tipo: "spostamento", inizio: prima[0], fine: prima[1], da: "HOTEL", a: luogo, mezzo: "piedi" },
  attivita,
  { id: "X-E3", tipo: "spostamento", inizio: dopo[0], fine: dopo[1], da: luogo, a: "HOTEL", mezzo: "piedi" },
];

const sintesi = (problemi: ReturnType<typeof controlla>) => problemi.map((p) => [p.codice, p.gravita, p.elementi]);

describe("CA-1 versione 1 e varianti senza problemi (meteo sereno, nessuna chiusura)", () => {
  it("i dati di contesto di riferimento non hanno previsioni né chiusure", () => {
    expect(contesto().previsioni).toEqual([]);
    expect(contesto().chiusure).toEqual([]);
  });

  it.each(ITINERARI_DI_RIFERIMENTO)("%s: nessun problema con la sorgente su file dei dati di riferimento", (_nome, file) => {
    const sorgente = creaSorgenteDaFile(cartellaRiferimento());
    expect(controllaFattibilita(leggiRiferimento<Viaggio>(file), catalogo(), sorgente)).toEqual([]);
  });

  it.each(ITINERARI_DI_RIFERIMENTO)("%s: nessun problema con una sorgente finta con gli stessi dati", (_nome, file) => {
    const problemi = controlla(leggiRiferimento<Viaggio>(file));
    expect(problemi).toEqual([]);
    expect(eFattibile(problemi)).toBe(true);
  });
});

describe("CA-2 un solo difetto per regola R-1…R-6: un solo problema bloccante", () => {
  const casi: Array<{
    regola: string;
    caso: string;
    codice: CodiceProblemaFattibilita;
    variante: (viaggio: Viaggio) => Viaggio;
    elementi: string[];
    messaggio: string;
  }> = [
    {
      regola: "R-1",
      caso: "tra due elementi consecutivi (senza D2-E3)",
      codice: "MANCA_SPOSTAMENTO",
      variante: (v) => rimuovi(v, "D2-E3"),
      elementi: ["D2-E2", "D2-E4"],
      messaggio:
        'Manca uno spostamento tra D2-E2 e D2-E4: D2-E2 finisce a "Sentiero del Ponale, partenza", D2-E4 inizia a "Ristorante sul lago".',
    },
    {
      regola: "R-1",
      caso: "primo elemento rispetto al luogo di partenza (senza D2-E1)",
      codice: "MANCA_SPOSTAMENTO",
      variante: (v) => rimuovi(v, "D2-E1"),
      elementi: ["D2-E2"],
      messaggio:
        'Manca uno spostamento prima di D2-E2: la giornata parte da "Hotel sul lago, Riva del Garda", D2-E2 inizia a "Sentiero del Ponale, partenza".',
    },
    {
      regola: "R-1",
      caso: "ultimo elemento rispetto all'alloggio della notte (senza D1-E3)",
      codice: "MANCA_SPOSTAMENTO",
      variante: (v) => rimuovi(v, "D1-E3"),
      elementi: ["D1-E2"],
      messaggio:
        'Manca uno spostamento dopo D1-E2: D1-E2 finisce a "Lungolago di Riva", l\'alloggio della notte è "Hotel sul lago, Riva del Garda".',
    },
    {
      regola: "R-2",
      caso: "D1-E1 in auto, mezzo senza tempo di percorrenza",
      codice: "PERCORSO_SCONOSCIUTO",
      variante: (v) => mezzo(v, "D1-E1", "auto"),
      elementi: ["D1-E1"],
      messaggio:
        'Tempo di percorrenza sconosciuto per D1-E1: nessun dato da "Hotel sul lago, Riva del Garda" a "Lungolago di Riva" in auto.',
    },
    {
      regola: "R-3",
      caso: "D3-E1 dura 40 minuti invece di 50",
      codice: "SPOSTAMENTO_TROPPO_BREVE",
      variante: (v) => orario(v, "D3-E1", "09:00", "09:40"),
      elementi: ["D3-E1"],
      messaggio:
        'Lo spostamento D3-E1 da "Hotel sul lago, Riva del Garda" a "Castello del Buonconsiglio" in auto dura 40 minuti, ma ne servono 50.',
    },
    {
      regola: "R-4",
      caso: "D3-E5 parte alle 13:10, prima della fine del pranzo",
      codice: "SOVRAPPOSIZIONE",
      variante: (v) => orario(v, "D3-E5", "13:10", "13:25"),
      elementi: ["D3-E4", "D3-E5"],
      messaggio: 'D3-E4 "Pranzo in centro" (12:15–13:15) e D3-E5 (13:10–13:25) si sovrappongono.',
    },
    {
      regola: "R-5",
      caso: "pranzo sul lago fino alle 14:40, dopo la chiusura delle 14:30",
      codice: "FUORI_ORARIO",
      variante: (v) => orario(orario(v, "D2-E4", "13:20", "14:40"), "D2-E5", "14:40", "14:45"),
      elementi: ["D2-E4"],
      messaggio:
        'D2-E4 "Pranzo sul lago" (13:20–14:40) non rientra negli orari di apertura di "Ristorante sul lago" il sabato: 12:00–14:30 e 19:00–22:30.',
    },
    {
      regola: "R-6",
      caso: "passeggiata di 110 minuti invece di 120",
      codice: "DURATA_INSUFFICIENTE",
      variante: (v) => orario(v, "D1-E2", "16:10", "18:00"),
      elementi: ["D1-E2"],
      messaggio: 'D1-E2 "Passeggiata sul lungolago" (16:10–18:00) dura 110 minuti, meno della durata tipica di 120 minuti.',
    },
  ];

  it.each(casi)("$regola $codice: $caso", ({ codice, variante, elementi, messaggio }) => {
    const problemi = controlla(variante(versione1()));
    expect(problemi).toEqual([{ codice, gravita: "bloccante", elementi, messaggio }]);
    expect(eFattibile(problemi)).toBe(false);
  });

  it("ogni regola R-1…R-6 ha almeno una variante", () => {
    expect([...new Set(casi.map((c) => c.codice))]).toEqual(CODICI_PROBLEMA_FATTIBILITA.slice(0, 6));
  });
});

describe("CA-3 scenario S1: pioggia sul trekking", () => {
  it("restituisce un solo problema: avviso METEO_AVVERSO su D2-E2", () => {
    const problemi = controlla(versione1(), { ...contesto(), previsioni: [previsioneS1()] });
    expect(problemi).toEqual([
      {
        codice: "METEO_AVVERSO",
        gravita: "avviso",
        elementi: ["D2-E2"],
        messaggio:
          'Meteo avverso in zona "Alto Garda" durante D2-E2 "Trekking sul Sentiero del Ponale" (09:00–13:00), che è all\'aperto: pioggia 08:00–13:00.',
      },
    ]);
    expect(eFattibile(problemi)).toBe(true);
  });
});

describe("CA-4 scenario S4: chiusura del MUSE", () => {
  it("restituisce un solo problema: LUOGO_CHIUSO bloccante su D3-E6", () => {
    const problemi = controlla(versione1(), { ...contesto(), chiusure: [chiusuraS4()] });
    expect(problemi).toEqual([
      {
        codice: "LUOGO_CHIUSO",
        gravita: "bloccante",
        elementi: ["D3-E6"],
        messaggio:
          '"MUSE Museo delle Scienze" è chiuso in via straordinaria durante D3-E6 "Visita al MUSE" (14:00–16:30): chiusura 00:00–24:00.',
      },
    ]);
    expect(eFattibile(problemi)).toBe(false);
  });
});

describe("CA-5 il controllo usa solo la sorgente ricevuta", () => {
  it("con una sorgente finta i tempi, il meteo e le chiusure vengono da lei", () => {
    // Nella sorgente finta HOTEL ↔ LUNGOLAGO a piedi richiede 15 minuti invece dei 10 dei file.
    const dati = contesto();
    dati.tempiPercorrenza = dati.tempiPercorrenza.map((t) =>
      t.da === "HOTEL" && t.a === "LUNGOLAGO" ? { ...t, minuti: 15 } : t,
    );
    const sorgente = sorgenteFinta(dati);
    const problemi = controllaFattibilita(versione1(), catalogo(), sorgente);
    expect(sintesi(problemi)).toEqual([
      ["SPOSTAMENTO_TROPPO_BREVE", "bloccante", ["D1-E1"]],
      ["SPOSTAMENTO_TROPPO_BREVE", "bloccante", ["D1-E3"]],
    ]);
    expect(sorgente.chiamate).toContain("tempoPercorrenza HOTEL LUNGOLAGO piedi");
    expect(sorgente.chiamate).toContain("previsioni GARDA_NORD 2026-06-13");
    expect(sorgente.chiamate).toContain("chiusure MUSE 2026-06-14");
  });

  it("con una sorgente finta vuota ogni spostamento ha un percorso sconosciuto", () => {
    const problemi = controlla(versione1(), { tempiPercorrenza: [], previsioni: [], chiusure: [] });
    expect(problemi.map((p) => p.codice)).toEqual(Array(9).fill("PERCORSO_SCONOSCIUTO"));
    expect(problemi.flatMap((p) => p.elementi)).toEqual([
      "D1-E1", "D1-E3", "D2-E1", "D2-E3", "D2-E5", "D3-E1", "D3-E3", "D3-E5", "D3-E7",
    ]);
  });

  it("il codice del controllo non usa file system, rete, orologio, casualità né il modulo context", () => {
    const cartella = new URL("../../src/feasibility/", import.meta.url);
    const sorgenti = readdirSync(cartella).filter((f) => f.endsWith(".ts"));
    expect(sorgenti.length).toBeGreaterThan(0);
    for (const file of sorgenti) {
      const codice = readFileSync(new URL(file, cartella), "utf8");
      expect(codice, file).not.toMatch(/from\s+["'](node:|fs|path|http|https|net)/);
      expect(codice, file).not.toMatch(/\bfetch\(|XMLHttpRequest|require\(|import\(/);
      expect(codice, file).not.toMatch(/Date\.now|new Date\(\)|Math\.random|performance\.now/);
      expect(codice, file).not.toMatch(/["']\.\.\/context/);
    }
  });
});

describe("CA-7 stesso input, stesso elenco nello stesso ordine", () => {
  /** Variante con un difetto per ogni regola, distribuiti sui tre giorni, con il meteo di S1 e la chiusura di S4. */
  const molteDifetti = (): Viaggio => {
    const v = versione1();
    orario(v, "D1-E2", "16:10", "18:00"); // R-6
    rimuovi(v, "D1-E3"); // R-1
    mezzo(v, "D2-E1", "auto"); // R-2
    orario(orario(v, "D2-E4", "13:20", "14:40"), "D2-E5", "14:40", "14:45"); // R-5
    orario(v, "D3-E1", "09:00", "09:40"); // R-3
    orario(v, "D3-E5", "13:10", "13:25"); // R-4
    return v;
  };
  const datiS1S4 = (): DatiContesto => ({ ...contesto(), previsioni: [previsioneS1()], chiusure: [chiusuraS4()] });
  const atteso = [
    ["DURATA_INSUFFICIENTE", "bloccante", ["D1-E2"]], // 2026-06-12 16:10: a parità di inizio, ordine di codice
    ["MANCA_SPOSTAMENTO", "bloccante", ["D1-E2"]],
    ["PERCORSO_SCONOSCIUTO", "bloccante", ["D2-E1"]], // 2026-06-13 08:40
    ["METEO_AVVERSO", "avviso", ["D2-E2"]], // 09:00
    ["FUORI_ORARIO", "bloccante", ["D2-E4"]], // 13:20
    ["SPOSTAMENTO_TROPPO_BREVE", "bloccante", ["D3-E1"]], // 2026-06-14 09:00
    ["SOVRAPPOSIZIONE", "bloccante", ["D3-E4", "D3-E5"]], // 12:15
    ["LUOGO_CHIUSO", "bloccante", ["D3-E6"]], // 14:00
  ];

  it("ordina per data, poi inizio del primo elemento coinvolto, poi codice", () => {
    expect(sintesi(controlla(molteDifetti(), datiS1S4()))).toEqual(atteso);
  });

  it("ripetendo il controllo l'elenco è identico, messaggi compresi", () => {
    const primo = controlla(molteDifetti(), datiS1S4());
    for (let i = 0; i < 5; i++) expect(controlla(molteDifetti(), datiS1S4())).toEqual(primo);
  });

  it("l'ordine non dipende dall'ordine dei giorni nell'elenco", () => {
    const rovesciato = molteDifetti();
    rovesciato.giorni.reverse();
    expect(controlla(rovesciato, datiS1S4())).toEqual(controlla(molteDifetti(), datiS1S4()));
  });

  it("non modifica il viaggio, il catalogo né i dati ricevuti", () => {
    const viaggio = molteDifetti();
    const cat = catalogo();
    const dati = datiS1S4();
    const copie = structuredClone({ viaggio, cat, dati });
    controllaFattibilita(viaggio, cat, sorgenteFinta(dati));
    expect({ viaggio, cat, dati }).toEqual(copie);
  });
});

describe("regole: casi limite", () => {
  it("R-1 un giorno senza elementi con l'alloggio in un altro luogo", () => {
    expect(sintesi(controlla(unGiorno("2026-06-12", [], "CANTINA")))).toEqual([
      ["MANCA_SPOSTAMENTO", "bloccante", []],
    ]);
    expect(controlla(unGiorno("2026-06-12", [], "HOTEL"))).toEqual([]);
  });

  it("R-5 un luogo senza fasce in quel giorno della settimana è chiuso (MAG di lunedì)", () => {
    const visita: Elemento = { id: "X-E2", tipo: "attivita", inizio: "10:00", fine: "12:00", attivitaId: "A-MAG" };
    const problemi = controlla(unGiorno("2026-06-15", andataERitorno("MAG", ["09:50", "10:00"], visita, ["12:00", "12:10"])));
    expect(problemi).toEqual([
      {
        codice: "FUORI_ORARIO",
        gravita: "bloccante",
        elementi: ["X-E2"],
        messaggio:
          'X-E2 "Visita al MAG" (10:00–12:00) non rientra negli orari di apertura di "MAG Museo Alto Garda" il lunedì: chiuso.',
      },
    ]);
  });

  it.each([
    ["12:00", "14:30", []],
    ["19:00", "22:30", []],
    ["11:50", "13:00", ["FUORI_ORARIO"]],
    ["14:00", "19:30", ["FUORI_ORARIO"]],
  ])("R-5 pranzo sul lago di sabato %s–%s: deve stare dentro una sola fascia", (inizio, fine, codici) => {
    const pranzo: Elemento = { id: "X-E2", tipo: "attivita", inizio, fine, attivitaId: "A-PRANZO-RIVA" };
    const elementi = andataERitorno("RIST-RIVA", ["06:00", "06:05"], pranzo, ["23:00", "23:05"]);
    expect(controlla(unGiorno("2026-06-13", elementi)).map((p) => p.codice)).toEqual(codici);
  });

  it("R-7 nessun avviso per meteo non avverso, intervalli che si toccano, altre zone o altre date", () => {
    const previsioni: PrevisioneMeteo[] = [
      { zonaId: "GARDA_NORD", data: "2026-06-13", inizio: "08:00", fine: "13:00", condizione: "nuvoloso" },
      { zonaId: "GARDA_NORD", data: "2026-06-13", inizio: "13:00", fine: "18:00", condizione: "temporale" },
      { zonaId: "TRENTO", data: "2026-06-13", inizio: "08:00", fine: "13:00", condizione: "pioggia" },
      { zonaId: "GARDA_NORD", data: "2026-06-14", inizio: "08:00", fine: "13:00", condizione: "neve" },
    ];
    expect(controlla(versione1(), { ...contesto(), previsioni })).toEqual([]);
  });

  it("R-7 al coperto nessun avviso; più previsioni avverse sulla stessa attività danno un solo avviso", () => {
    const previsioni: PrevisioneMeteo[] = [
      { zonaId: "GARDA_NORD", data: "2026-06-13", inizio: "11:00", fine: "14:30", condizione: "temporale" },
      { zonaId: "GARDA_NORD", data: "2026-06-13", inizio: "08:00", fine: "10:00", condizione: "pioggia" },
    ];
    const problemi = controlla(versione1(), { ...contesto(), previsioni });
    expect(sintesi(problemi)).toEqual([["METEO_AVVERSO", "avviso", ["D2-E2"]]]);
    expect(problemi[0]?.messaggio).toContain("pioggia 08:00–10:00 e temporale 11:00–14:30");
  });

  it("R-8 una chiusura che tocca l'attività o è in un'altra data non conta; una parziale sì", () => {
    const chiusure = [
      { luogoId: "MUSE", data: "2026-06-14", inizio: "16:30", fine: "18:00" },
      { luogoId: "MUSE", data: "2026-06-13", inizio: "00:00", fine: "24:00" },
    ];
    expect(controlla(versione1(), { ...contesto(), chiusure })).toEqual([]);
    const parziale = [{ luogoId: "MUSE", data: "2026-06-14", inizio: "15:00", fine: "16:00" }];
    expect(sintesi(controlla(versione1(), { ...contesto(), chiusure: parziale }))).toEqual([
      ["LUOGO_CHIUSO", "bloccante", ["D3-E6"]],
    ]);
  });

  it("gravità: tutti bloccanti tranne METEO_AVVERSO; fattibile se nessun problema è bloccante", () => {
    const avvisi = CODICI_PROBLEMA_FATTIBILITA.filter((c) => GRAVITA_PROBLEMI_FATTIBILITA[c] === "avviso");
    expect(avvisi).toEqual(["METEO_AVVERSO"]);
    const problema = (gravita: "bloccante" | "avviso") => ({ codice: "X", gravita, elementi: [], messaggio: "" });
    expect(eFattibile([])).toBe(true);
    expect(eFattibile([problema("avviso")])).toBe(true);
    expect(eFattibile([problema("avviso"), problema("bloccante")])).toBe(false);
  });

  it("dati non validi secondo il modello sono un errore esplicito, non un problema", () => {
    const sconosciuta = versione1();
    const d1e2 = sconosciuta.giorni[0]?.elementi[1];
    if (d1e2?.tipo === "attivita") d1e2.attivitaId = "A-INESISTENTE";
    expect(() => controlla(sconosciuta)).toThrow(ErroreDatiNonValidi);
    expect(() => controlla(sconosciuta)).toThrow("A-INESISTENTE");
    expect(() => controlla(orario(versione1(), "D1-E1", "9:00", "16:10"))).toThrow('Orario non valido "9:00"');
  });
});
