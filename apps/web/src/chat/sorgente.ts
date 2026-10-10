/**
 * Da dove arrivano le risposte della chat. La chat parla solo con questa interfaccia: oggi c'è la sorgente finta
 * (risposte scritte in anticipo, nessuna rete), con ST-CHAT-001C ne arriverà una con l'assistente vero che la
 * sostituisce senza toccare il pannello.
 */
import type { Benvenuto, RispostaChat, SchedaChat, SchedaConfermaChat, TurnoChat } from "./tipi";

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

/** Chi ascolta la risposta mentre si forma (la sorgente con gli agenti, ST-CHAT-001C). */
export interface AscoltoRisposta {
  /** Il testo arrivato finora (sostituisce quello di prima: vale anche per il testo corretto). */
  testo?(testo: string): void;
  /** Il passo in corso ("Preparo la bozza…"). */
  passo?(testo: string): void;
  /** Un'azione fatta sul viaggio: la vista a lato si aggiorna. */
  azione?(testo: string, viaggio: string | null): void;
}

/** Un messaggio già salvato della conversazione. */
export interface MessaggioSalvato {
  autore: "viaggiatore" | "travelops";
  testo: string;
  scheda?: SchedaChat | undefined;
}

/** L'esito di Accetta o Rifiuta deciso dalla sorgente (sul server, con gli agenti). */
export interface EsitoDecisioneSorgente {
  testo: string;
  scheda?: SchedaConfermaChat | undefined;
  /** Vero se il viaggio è cambiato (nuova versione). */
  cambiato: boolean;
}

export interface SorgenteRisposte {
  /** Il messaggio di benvenuto con i suggerimenti. */
  benvenuto(): Promise<Benvenuto>;
  /** La risposta al messaggio del viaggiatore; `storia` è la conversazione fino a quel messaggio compreso. */
  rispondi(testo: string, storia: readonly TurnoChat[], ascolta?: AscoltoRisposta): Promise<RispostaChat>;
  /** I messaggi già salvati della conversazione, per riprenderla (solo le sorgenti che la salvano). */
  conversazioneSalvata?(): Promise<readonly MessaggioSalvato[]>;
  /** Accetta o rifiuta una proposta salvata (solo le sorgenti che salvano le proposte). */
  decidi?(propostaId: number, decisione: "accetta" | "rifiuta"): Promise<EsitoDecisioneSorgente>;
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
