/**
 * Sorgente dei dati di contesto costruita da dati già in memoria (`modello-dominio.md` §2.3).
 * È la base della sorgente su file e serve a chi deve arricchire o variare i dati simulati.
 */
import {
  ORDINE_MEZZI,
  type ChiusuraStraordinaria,
  type DatiContesto,
  type Mezzo,
  type Percorso,
  type PrevisioneMeteo,
  type SorgenteDatiContesto,
} from "../model/index.js";
import { validaDatiContesto } from "./validazione.js";

const confronta = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Chiave della coppia di luoghi indipendente dal verso: i tempi valgono nei due sensi. */
const chiaveCoppia = (da: string, a: string): string => JSON.stringify(da <= a ? [da, a] : [a, da]);

/** Costruisce la sorgente da dati già validati. */
export function costruisciSorgente(dati: DatiContesto): SorgenteDatiContesto {
  const tempi = new Map<string, Map<Mezzo, number>>();
  for (const { da, a, mezzo, minuti } of dati.tempiPercorrenza) {
    const chiave = chiaveCoppia(da, a);
    const perMezzo = tempi.get(chiave) ?? new Map<Mezzo, number>();
    perMezzo.set(mezzo, minuti);
    tempi.set(chiave, perMezzo);
  }

  // Ordine stabile e indipendente dall'ordine del file: inizio, fine, poi condizione.
  const previsioni: readonly PrevisioneMeteo[] = [...dati.previsioni].sort(
    (x, y) => confronta(x.inizio, y.inizio) || confronta(x.fine, y.fine) || confronta(x.condizione, y.condizione),
  );
  const chiusure: readonly ChiusuraStraordinaria[] = [...dati.chiusure].sort(
    (x, y) => confronta(x.inizio, y.inizio) || confronta(x.fine, y.fine),
  );

  return {
    tempoPercorrenza(da, a, mezzo) {
      return tempi.get(chiaveCoppia(da, a))?.get(mezzo) ?? null;
    },
    percorsoPiuVeloce(da, a) {
      const perMezzo = tempi.get(chiaveCoppia(da, a));
      if (!perMezzo) return null;
      let migliore: Percorso | null = null;
      // Scorrendo i mezzi in ORDINE_MEZZI e tenendo solo i tempi strettamente minori, a parità vince il primo.
      for (const mezzo of ORDINE_MEZZI) {
        const minuti = perMezzo.get(mezzo);
        if (minuti !== undefined && (migliore === null || minuti < migliore.minuti)) migliore = { mezzo, minuti };
      }
      return migliore;
    },
    previsioni(zonaId, data) {
      return previsioni.filter((p) => p.zonaId === zonaId && p.data === data).map((p) => ({ ...p }));
    },
    chiusure(luogoId, data) {
      return chiusure.filter((c) => c.luogoId === luogoId && c.data === data).map((c) => ({ ...c }));
    },
  };
}

/**
 * Crea una sorgente dei dati di contesto a partire da dati in memoria, dopo averli validati.
 * @throws ErroreDatiContesto se i dati non rispettano il modello.
 */
export function creaSorgenteDaDati(dati: DatiContesto): SorgenteDatiContesto {
  return costruisciSorgente(validaDatiContesto(dati));
}

/**
 * Arricchisce una sorgente con altre previsioni meteo (per esempio quelle di un servizio esterno, REQ-INTEG-001):
 * le previsioni della sorgente di base restano e si aggiungono le nuove, in ordine stabile. Tempi e chiusure non cambiano.
 * @throws ErroreDatiContesto se le previsioni aggiunte non rispettano il modello.
 */
export function conPrevisioni(base: SorgenteDatiContesto, previsioni: readonly PrevisioneMeteo[]): SorgenteDatiContesto {
  const aggiunte = validaDatiContesto({ tempiPercorrenza: [], previsioni: [...previsioni], chiusure: [] }).previsioni;
  const ordina = (x: PrevisioneMeteo, y: PrevisioneMeteo): number =>
    confronta(x.inizio, y.inizio) || confronta(x.fine, y.fine) || confronta(x.condizione, y.condizione);
  return {
    tempoPercorrenza: (da, a, mezzo) => base.tempoPercorrenza(da, a, mezzo),
    percorsoPiuVeloce: (da, a) => base.percorsoPiuVeloce(da, a),
    chiusure: (luogoId, data) => base.chiusure(luogoId, data),
    previsioni: (zonaId, data) =>
      [...base.previsioni(zonaId, data), ...aggiunte.filter((p) => p.zonaId === zonaId && p.data === data)].sort(ordina).map((p) => ({ ...p })),
  };
}
