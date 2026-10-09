/**
 * Da dove arrivano le risposte della chat. La chat parla solo con questa interfaccia: oggi c'è la sorgente finta
 * (risposte scritte in anticipo, nessuna rete), con ST-CHAT-001C ne arriverà una con l'assistente vero che la
 * sostituisce senza toccare il pannello.
 */
import type { Benvenuto, RispostaChat, TurnoChat } from "./tipi";

export type CodiceErroreSorgente = "non-disponibile" | "errore";

/**
 * L'errore di una sorgente: "non-disponibile" quando l'assistente non c'è (la chat si spegne con un messaggio
 * gentile), "errore" quando solo questa richiesta è fallita (si può riprovare).
 */
export class ErroreSorgente extends Error {
  readonly codice: CodiceErroreSorgente;

  constructor(codice: CodiceErroreSorgente, messaggio: string = codice) {
    super(messaggio);
    this.name = "ErroreSorgente";
    this.codice = codice;
  }
}

export interface SorgenteRisposte {
  /** Il messaggio di benvenuto con i suggerimenti. */
  benvenuto(): Promise<Benvenuto>;
  /** La risposta al messaggio del viaggiatore; `storia` è la conversazione fino a quel messaggio compreso. */
  rispondi(testo: string, storia: readonly TurnoChat[]): Promise<RispostaChat>;
}

/** Una risposta scritta in anticipo: vale se il messaggio contiene una delle parole (senza badare alle maiuscole). */
export interface RispostaPrevista {
  parole: readonly string[];
  risposta: RispostaChat;
}

/** Le risposte della sorgente finta. */
export interface Copione {
  benvenuto: Benvenuto;
  /** Si prova nell'ordine: vale la prima che corrisponde. */
  risposte: readonly RispostaPrevista[];
  /** Quando nessuna corrisponde. */
  altrimenti: RispostaChat;
}

export interface OpzioniSorgenteFinta {
  copione: Copione;
  /** Quanto "scrive" prima di rispondere, in millisecondi. */
  ritardoMs?: number;
}

/** Il tempo di scrittura predefinito: abbastanza lungo da far vedere "sta scrivendo". */
export const RITARDO_PREDEFINITO_MS = 900;

function attendi(millisecondi: number): Promise<void> {
  return new Promise((risolvi) => setTimeout(risolvi, millisecondi));
}

function normalizza(testo: string): string {
  return testo.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/** La sorgente finta: sceglie la risposta dal copione, senza AI e senza rete. */
export function creaSorgenteFinta({ copione, ritardoMs = RITARDO_PREDEFINITO_MS }: OpzioniSorgenteFinta): SorgenteRisposte {
  return {
    benvenuto: () => Promise.resolve(copione.benvenuto),
    async rispondi(testo) {
      await attendi(ritardoMs);
      const cercato = normalizza(testo);
      const trovata = copione.risposte.find(({ parole }) => parole.some((parola) => cercato.includes(normalizza(parola))));
      return trovata?.risposta ?? copione.altrimenti;
    },
  };
}
