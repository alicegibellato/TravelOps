/**
 * Tipi e costanti condivisi tra le azioni lato server e i componenti nel browser per la scelta della destinazione
 * (REQ-CAT-002, ST-CAT-002C). Niente motore e niente `@travelops/sources` qui: i componenti del browser importano
 * solo questo file.
 */
import type { StileViaggio } from "../testi";

/** Attesa tra l'ultima battuta e la ricerca dei suggerimenti, in millisecondi. */
export const ATTESA_RICERCA_MS = 300;

/** Sotto questa lunghezza il testo non dà suggerimenti (come la sorgente delle destinazioni). */
export const LUNGHEZZA_MINIMA_RICERCA = 2;

/** Quante destinazioni vicine si propongono quando una è troppo piccola. */
export const MASSIMO_DESTINAZIONI_VICINE = 3;

/** Un'area trovata dalla ricerca: si rimanda così com'è alla costruzione. */
export interface Suggerimento {
  id: string;
  nome: string;
  descrizione: string;
  centro: { lat: number; lon: number };
  osmId?: string;
}

/** Un passo della costruzione, per mostrarne l'avanzamento. */
export interface PassoAvanzamento {
  numero: number;
  totale: number;
  messaggio: string;
}

/** Le attribuzioni da mostrare con una destinazione (REQ-CAT-002: OpenStreetMap, immagini, descrizioni). */
export interface AttribuzioniDestinazione {
  mappa: string;
  fonti: { nome: string; attribuzione: string }[];
  immagini: { attivita: string; autore: string; licenza: string }[];
  descrizioni: { luogo: string; fonte: string }[];
}

export type EsitoCostruzioneWeb =
  | {
      esito: "pronta";
      avanzamento: PassoAvanzamento[];
      destinazione: { nome: string; luoghi: number; attivita: number };
      attribuzioni: AttribuzioniDestinazione;
    }
  | { esito: "troppo_piccola"; avanzamento: PassoAvanzamento[]; messaggio: string; vicine: Suggerimento[] }
  | { esito: "non_disponibile"; messaggio: string };

/** Le scelte del viaggiatore per Sorprendimi. `mese` è `AAAA-MM`. */
export interface RichiestaSorprendimi {
  stili: StileViaggio[];
  daEvitare: StileViaggio[];
  mese: string;
}

/** Una destinazione proposta da Sorprendimi. */
export interface PropostaSorprendimi {
  id: string;
  nome: string;
  descrizione: string;
  stili: StileViaggio[];
  stiliInComune: StileViaggio[];
  meseConsigliato: boolean;
}

export type EsitoSorprendimi = { esito: "proposte"; proposte: PropostaSorprendimi[] } | { esito: "errore"; messaggio: string };

/** Ciò che il componente chiede al server: ricerca, costruzione e Sorprendimi. In produzione sono azioni lato server. */
export interface ServizioDestinazioni {
  cerca(testo: string): Promise<Suggerimento[]>;
  costruisci(area: Suggerimento): Promise<EsitoCostruzioneWeb>;
  sorprendimi(richiesta: RichiestaSorprendimi): Promise<EsitoSorprendimi>;
}

/** Le attribuzioni di un'attività nel suo dettaglio: tutto ciò che i dati registrano, nient'altro. */
export interface AttribuzioniAttivita {
  /** I dati del luogo vengono da OpenStreetMap. */
  osm: boolean;
  /** Autore e licenza dell'immagine, in una frase; `null` se l'attività non ha immagine. */
  immagine: string | null;
  /** Da dove viene la descrizione del luogo; `null` se non è registrata. */
  fonteDescrizione: string | null;
}
