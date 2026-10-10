/**
 * Chi risponde ai messaggi della chat lato server (REQ-CHAT-001, ST-CHAT-001A). Il servizio della chat parla solo
 * con questa interfaccia: c'è la versione con il modello linguistico (`@travelops/agents`, chiave OpenAI solo sul
 * server) e la versione finta per i test e per la demo senza rete. Con la chiave risponde l'assistente con gli agenti
 * e gli strumenti del motore (ST-ORCH-001C, collegati da ST-CHAT-001C in `agenti.ts`), senza cambiare gli endpoint.
 */
import {
  creaClienteDaAmbiente,
  ErroreAiNonDisponibile,
  eseguiCiclo,
  type Ambiente,
  type CausaAiNonDisponibile,
  type ClienteModello,
  type Messaggio as MessaggioModello,
} from "@travelops/agents";
import { sorgenteDestinazioniLocale } from "../../destinazioni/sorgente";
import { serviziEsterni } from "../../servizi/esterni";
import type { CodiceErroreChat } from "../protocollo";
import { creaSorgenteFinta, type Copione } from "../sorgente";
import type { RispostaChat, TurnoChat } from "../tipi";
import { assistenteDaAgenti } from "./agenti";
import { COPIONE_ASSISTENTE_FINTO } from "./copione-finto";

export type EventoAssistente =
  /** Un pezzo del testo, mentre la risposta si forma. */
  | { tipo: "testo"; testo: string }
  /** L'agente che risponde (solo con gli agenti). */
  | { tipo: "agente"; agente: string; titolo: string }
  /** Un passo in corso ("Preparo la bozza…"). */
  | { tipo: "passo"; testo: string }
  /** Un'azione fatta sul viaggio della conversazione. */
  | { tipo: "azione"; testo: string; viaggio: string | null }
  /** Il testo mostrato finora è stato sostituito dal controllo delle risposte. */
  | { tipo: "testo_corretto"; testo: string }
  /** La risposta completa: l'ultimo evento. */
  | { tipo: "risposta"; risposta: RispostaChat };

/** Dove risponde l'assistente: la base dati e la conversazione (gli agenti lavorano sul suo viaggio). */
export interface ContestoRisposta {
  cartella: string;
  conversazioneId: number;
  /** L'agente che ha risposto al messaggio precedente, se c'è. */
  ultimoAgente?: string | null | undefined;
}

export interface AssistenteChat {
  /** Risponde all'ultimo messaggio di `storia` (la conversazione fino a quel messaggio compreso). */
  rispondi(storia: readonly TurnoChat[], segnale?: AbortSignal, contesto?: ContestoRisposta): AsyncIterable<EventoAssistente>;
}

export type StatoAssistente =
  | { disponibile: true; assistente: AssistenteChat }
  | { disponibile: false; messaggio: string };

/** Le istruzioni del modello per la chat senza agenti (`assistenteDaModello`): risponde e basta, non cambia il viaggio. */
export const ISTRUZIONI_CHAT = [
  "Sei l'assistente di viaggio di TravelOps e parli con un viaggiatore in italiano semplice e cordiale.",
  "Rispondi in poche frasi. Aiuta a raccontare il viaggio: destinazione, date, con chi si viaggia, ritmo e interessi.",
  "Non inventare orari, prezzi o prenotazioni e non dire di aver cambiato l'itinerario: le modifiche si fanno con i pulsanti.",
  "Non mostrare codici tecnici, identificativi o JSON.",
].join(" ");

/**
 * Le cause per cui l'assistente manca del tutto (la chat si spegne con il messaggio gentile). Le altre (rete, servizio,
 * limite, richiesta, annullata) riguardano solo la richiesta in corso: il viaggiatore può riprovare.
 */
const CAUSE_NON_DISPONIBILE: readonly CausaAiNonDisponibile[] = ["chiave_mancante", "autenticazione"];

/** Il codice dell'errore per il viaggiatore, a partire da quello sollevato dall'assistente. */
export function codiceErrore(errore: unknown): CodiceErroreChat {
  return errore instanceof ErroreAiNonDisponibile && CAUSE_NON_DISPONIBILE.includes(errore.causa) ? "non-disponibile" : "errore";
}

function messaggiPerIlModello(storia: readonly TurnoChat[]): MessaggioModello[] {
  return storia.map((turno) =>
    turno.autore === "viaggiatore" ? { ruolo: "utente", testo: turno.testo } : { ruolo: "assistente", testo: turno.testo },
  );
}

/** L'assistente che risponde con il modello linguistico, in streaming. */
export function assistenteDaModello(cliente: ClienteModello, istruzioni: string = ISTRUZIONI_CHAT): AssistenteChat {
  return {
    async *rispondi(storia, segnale) {
      const ciclo = eseguiCiclo({ cliente, istruzioni, messaggi: messaggiPerIlModello(storia), ...(segnale ? { segnale } : {}) });
      for await (const evento of ciclo) {
        if (evento.tipo === "testo" && evento.testo !== "") yield { tipo: "testo", testo: evento.testo };
        if (evento.tipo === "fine") yield { tipo: "risposta", risposta: { testo: evento.esito.testo.trim() } };
      }
    },
  };
}

/**
 * L'assistente dall'ambiente del server: con `OPENAI_API_KEY` rispondono gli agenti di TravelOps con il modello
 * (`TRAVELOPS_MODEL`, predefinito gpt-6-luna) e le destinazioni della web app; senza chiave è "non disponibile" con il
 * messaggio per il viaggiatore. Non fa chiamate di rete.
 */
export function assistenteDaAmbiente(ambiente: Ambiente = process.env): StatoAssistente {
  const stato = creaClienteDaAmbiente(ambiente);
  return stato.disponibile
    ? { disponibile: true, assistente: assistenteDaAgenti({ cliente: stato.cliente, sorgente: sorgenteDestinazioniLocale, orchestrazione: "modello", percorsi: serviziEsterni(ambiente).percorsi }) }
    : { disponibile: false, messaggio: stato.messaggio };
}

/** Il testo diviso in pezzi di una parola, come arriverebbe in streaming. */
export function pezziDiTesto(testo: string): string[] {
  return testo.match(/\S+\s*|\s+/g) ?? [];
}

/** L'assistente finto: sceglie la risposta dal copione (come la sorgente finta del pannello), senza AI e senza rete. */
export function assistenteFinto(copione: Copione): AssistenteChat {
  const sorgente = creaSorgenteFinta({ copione, ritardoMs: 0 });
  return {
    async *rispondi(storia) {
      const ultimo = storia.at(-1);
      const risposta = await sorgente.rispondi(ultimo?.testo ?? "", storia);
      for (const pezzo of pezziDiTesto(risposta.testo)) yield { tipo: "testo", testo: pezzo };
      yield { tipo: "risposta", risposta };
    },
  };
}

/** Il valore di `TRAVELOPS_ASSISTENTE` che sceglie l'assistente finto al posto del modello. */
export const ASSISTENTE_FINTO = "finto";

/**
 * Come `assistenteDaAmbiente`, ma con `TRAVELOPS_ASSISTENTE=finto` risponde l'assistente finto (copione, nessuna rete):
 * serve alle prove nel browser e alle demo senza chiave.
 */
export function assistenteDaAmbienteConFinto(ambiente: Ambiente = process.env): StatoAssistente {
  if (ambiente.TRAVELOPS_ASSISTENTE?.trim() === ASSISTENTE_FINTO) return { disponibile: true, assistente: assistenteFinto(COPIONE_ASSISTENTE_FINTO) };
  return assistenteDaAmbiente(ambiente);
}
