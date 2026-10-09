import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ErroreDatiContesto,
  FILE_DATI_CONTESTO,
  creaSorgenteDaDati,
  creaSorgenteDaFile,
} from "../../src/context/index.js";
import type { DatiContesto, Percorso, PrevisioneMeteo, TempoPercorrenza } from "../../src/model/index.js";
import { cartellaRiferimento, chiusuraS4, contesto, previsioneS1 } from "../feasibility/supporto.js";

let cartellaTemporanea = "";
beforeAll(() => {
  cartellaTemporanea = mkdtempSync(join(tmpdir(), "travelops-contesto-"));
});
afterAll(() => {
  rmSync(cartellaTemporanea, { recursive: true, force: true });
});

/** Scrive una variante dei dati di contesto in una sua cartella e ne restituisce il percorso. */
function cartellaConVariante(nome: string, contenuto: unknown): string {
  const cartella = join(cartellaTemporanea, nome);
  mkdirSync(cartella);
  const testo = typeof contenuto === "string" ? contenuto : JSON.stringify(contenuto, null, 2);
  writeFileSync(join(cartella, FILE_DATI_CONTESTO), testo, "utf8");
  return cartella;
}

const erroriDi = (azione: () => unknown): readonly string[] => {
  try {
    azione();
  } catch (errore) {
    expect(errore).toBeInstanceOf(ErroreDatiContesto);
    return (errore as ErroreDatiContesto).errori;
  }
  throw new Error("era atteso un ErroreDatiContesto");
};

describe("CA-6 sorgente su file: legge i dati di riferimento", () => {
  const sorgente = () => creaSorgenteDaFile(cartellaRiferimento());

  it("restituisce i 15 tempi di percorrenza di riferimento, validi nei due sensi", () => {
    const s = sorgente();
    const tempi = contesto().tempiPercorrenza;
    expect(tempi).toHaveLength(15);
    for (const { da, a, mezzo, minuti } of tempi) {
      expect(s.tempoPercorrenza(da, a, mezzo), `${da} → ${a}`).toBe(minuti);
      expect(s.tempoPercorrenza(a, da, mezzo), `${a} → ${da}`).toBe(minuti);
    }
  });

  it("restituisce null per un mezzo o una coppia senza dati", () => {
    const s = sorgente();
    expect(s.tempoPercorrenza("HOTEL", "LUNGOLAGO", "auto")).toBeNull();
    expect(s.tempoPercorrenza("LUNGOLAGO", "MUSE", "auto")).toBeNull();
    expect(s.percorsoPiuVeloce("LUNGOLAGO", "MUSE")).toBeNull();
  });

  it("con un solo mezzo per coppia il più veloce è quel mezzo", () => {
    const s = sorgente();
    expect(s.percorsoPiuVeloce("MUSE", "HOTEL")).toEqual({ mezzo: "auto", minuti: 50 });
    expect(s.percorsoPiuVeloce("AEROPORTO-FCO", "AEROPORTO-VRN")).toEqual({ mezzo: "volo", minuti: 65 });
  });

  it("meteo di riferimento tutto sereno e nessuna chiusura", () => {
    const s = sorgente();
    expect(s.previsioni("GARDA_NORD", "2026-06-13")).toEqual([]);
    expect(s.chiusure("MUSE", "2026-06-14")).toEqual([]);
  });

  it("la sorgente in memoria con gli stessi dati risponde allo stesso modo", () => {
    const daFile = sorgente();
    const inMemoria = creaSorgenteDaDati(contesto());
    for (const { da, a, mezzo } of contesto().tempiPercorrenza) {
      expect(inMemoria.tempoPercorrenza(a, da, mezzo)).toBe(daFile.tempoPercorrenza(a, da, mezzo));
      expect(inMemoria.percorsoPiuVeloce(da, a)).toEqual(daFile.percorsoPiuVeloce(da, a));
    }
  });
});

describe("CA-6 sorgente su file: coppie con più mezzi (variante di test)", () => {
  /** Variante dichiarata qui: i dati di riferimento più altri mezzi per cinque coppie già note. */
  const altriMezzi: TempoPercorrenza[] = [
    { da: "BUONCONSIGLIO", a: "HOTEL", mezzo: "mezzi_pubblici", minuti: 80 }, // con auto 50: vince auto
    { da: "AEROPORTO-VRN", a: "AEROPORTO-FCO", mezzo: "treno", minuti: 240 }, // con volo 65: vince volo
    { da: "AEROPORTO-FCO", a: "AEROPORTO-VRN", mezzo: "auto", minuti: 330 },
    { da: "CANTINA", a: "HOTEL", mezzo: "mezzi_pubblici", minuti: 15 }, // parità con auto 15
    { da: "MUSE", a: "HOTEL", mezzo: "volo", minuti: 50 }, // parità a tre con auto 50 e treno 50
    { da: "HOTEL", a: "MUSE", mezzo: "treno", minuti: 50 },
    { da: "RIST-RIVA", a: "HOTEL", mezzo: "auto", minuti: 5 }, // parità con piedi 5
  ];
  const variante = (): DatiContesto => ({ ...contesto(), tempiPercorrenza: [...contesto().tempiPercorrenza, ...altriMezzi] });

  const attesi: Array<[string, string, Percorso]> = [
    ["HOTEL", "BUONCONSIGLIO", { mezzo: "auto", minuti: 50 }],
    ["AEROPORTO-VRN", "AEROPORTO-FCO", { mezzo: "volo", minuti: 65 }],
    ["HOTEL", "CANTINA", { mezzo: "mezzi_pubblici", minuti: 15 }],
    ["HOTEL", "MUSE", { mezzo: "treno", minuti: 50 }],
    ["HOTEL", "RIST-RIVA", { mezzo: "piedi", minuti: 5 }],
  ];

  it.each(attesi)("%s ↔ %s: il più veloce, a parità di minuti nell'ordine dei mezzi", (da, a, percorso) => {
    const s = creaSorgenteDaFile(cartellaConVariante(`piu-mezzi-${da}-${a}`, variante()));
    expect(s.percorsoPiuVeloce(da, a)).toEqual(percorso);
    expect(s.percorsoPiuVeloce(a, da)).toEqual(percorso);
  });

  it("il risultato non dipende dall'ordine delle righe nel file", () => {
    const rovesciata = variante();
    rovesciata.tempiPercorrenza.reverse();
    const s = creaSorgenteDaFile(cartellaConVariante("piu-mezzi-rovesciata", rovesciata));
    for (const [da, a, percorso] of attesi) expect(s.percorsoPiuVeloce(da, a)).toEqual(percorso);
  });

  it("il tempo di ciascun mezzo della coppia resta disponibile", () => {
    const s = creaSorgenteDaFile(cartellaConVariante("piu-mezzi-tempi", variante()));
    expect(s.tempoPercorrenza("HOTEL", "BUONCONSIGLIO", "auto")).toBe(50);
    expect(s.tempoPercorrenza("HOTEL", "BUONCONSIGLIO", "mezzi_pubblici")).toBe(80);
    expect(s.tempoPercorrenza("HOTEL", "BUONCONSIGLIO", "treno")).toBeNull();
  });
});

describe("sorgente su file: previsioni e chiusure", () => {
  const nuvoloso: PrevisioneMeteo = { zonaId: "GARDA_NORD", data: "2026-06-13", inizio: "14:00", fine: "18:00", condizione: "nuvoloso" };

  it("restituisce le previsioni della zona e della data in ordine di inizio, e le chiusure del luogo e della data", () => {
    const dati: DatiContesto = { ...contesto(), previsioni: [nuvoloso, previsioneS1()], chiusure: [chiusuraS4()] };
    const s = creaSorgenteDaFile(cartellaConVariante("meteo-e-chiusure", dati));
    expect(s.previsioni("GARDA_NORD", "2026-06-13")).toEqual([previsioneS1(), nuvoloso]);
    expect(s.previsioni("GARDA_NORD", "2026-06-12")).toEqual([]);
    expect(s.previsioni("TRENTO", "2026-06-13")).toEqual([]);
    expect(s.chiusure("MUSE", "2026-06-14")).toEqual([chiusuraS4()]);
    expect(s.chiusure("MUSE", "2026-06-13")).toEqual([]);
    expect(s.chiusure("MAG", "2026-06-14")).toEqual([]);
  });

  it("restituisce copie: modificarle non cambia la sorgente", () => {
    const s = creaSorgenteDaDati({ ...contesto(), previsioni: [previsioneS1()] });
    const prima = s.previsioni("GARDA_NORD", "2026-06-13");
    prima[0]!.condizione = "sereno";
    prima.length = 0;
    expect(s.previsioni("GARDA_NORD", "2026-06-13")).toEqual([previsioneS1()]);
  });

  it("accetta un file con BOM iniziale", () => {
    const cartella = cartellaConVariante("bom", `﻿${JSON.stringify(contesto())}`);
    expect(creaSorgenteDaFile(cartella).tempoPercorrenza("HOTEL", "MAG", "piedi")).toBe(10);
  });
});

describe("sorgente su file: errori espliciti", () => {
  it("cartella o file assenti", () => {
    const errori = erroriDi(() => creaSorgenteDaFile(join(cartellaTemporanea, "non-esiste")));
    expect(errori).toEqual([expect.stringContaining("impossibile leggere il file")]);
  });

  it("file che non è JSON", () => {
    const errori = erroriDi(() => creaSorgenteDaFile(cartellaConVariante("non-json", "{ tempi: ")));
    expect(errori).toEqual([expect.stringContaining("non contiene JSON valido")]);
  });

  it("contenuto non conforme al modello: tutti i difetti in una volta", () => {
    const contenuto = {
      tempiPercorrenza: [
        { da: "HOTEL", a: "MAG", mezzo: "bici", minuti: 10 },
        { da: "HOTEL", a: "LUNGOLAGO", mezzo: "piedi", minuti: -5 },
      ],
      previsioni: [{ zonaId: "GARDA_NORD", data: "2026-06-13", inizio: "25:00", fine: "13:00", condizione: "grandine" }],
      chiusure: [{ luogoId: "MUSE", data: "2026-02-30", inizio: "18:00", fine: "10:00" }],
    };
    const errori = erroriDi(() => creaSorgenteDaFile(cartellaConVariante("non-conforme", contenuto)));
    expect(errori).toEqual([
      expect.stringMatching(/^tempiPercorrenza\[0\]: mezzo non valido/),
      expect.stringMatching(/^tempiPercorrenza\[1\]: i minuti/),
      expect.stringMatching(/^previsioni\[0\]: inizio non valido/),
      expect.stringMatching(/^previsioni\[0\]: condizione non valida/),
      expect.stringMatching(/^chiusure\[0\]: data non valida/),
      expect.stringMatching(/^chiusure\[0\]: la fine deve essere successiva all'inizio/),
    ]);
  });

  it("elenchi mancanti", () => {
    expect(erroriDi(() => creaSorgenteDaFile(cartellaConVariante("vuoto", {})))).toEqual([
      "tempiPercorrenza: deve essere un elenco",
      "previsioni: deve essere un elenco",
      "chiusure: deve essere un elenco",
    ]);
  });

  it("tempi discordanti per la stessa coppia e lo stesso mezzo, anche in senso inverso", () => {
    const dati: DatiContesto = {
      ...contesto(),
      tempiPercorrenza: [...contesto().tempiPercorrenza, { da: "LUNGOLAGO", a: "HOTEL", mezzo: "piedi", minuti: 12 }],
    };
    expect(erroriDi(() => creaSorgenteDaDati(dati))).toEqual([
      expect.stringContaining("tempi discordanti tra LUNGOLAGO e HOTEL con il mezzo piedi (10 e 12 minuti)"),
    ]);
  });
});
