/**
 * Chi risponde ai messaggi della chat lato server (REQ-CHAT-001, ST-CHAT-001A). Il servizio della chat parla solo
 * con questa interfaccia: c'è la versione con il modello linguistico (`@travelops/agents`, chiave OpenAI solo sul
 * server) e la versione finta per i test e per la demo senza rete. Gli agenti con gli strumenti del motore
 * (ST-ORCH-001C) si collegano qui con ST-CHAT-001C, senza cambiare gli endpoint.
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
import type { CodiceErroreChat } from "../protocollo";
import { creaSorgenteFinta, type Copione } from "../sorgente";
import type { RispostaChat, TurnoChat } from "../tipi";

export type EventoAssistente =
  /** Un pezzo del testo, mentre la risposta si forma. */
  | { tipo: "testo"; testo: string }
  /** La risposta completa: l'ultimo evento. */
  | { tipo: "risposta"; risposta: RispostaChat };

export interface AssistenteChat {
  /** Risponde all'ultimo messaggio di `storia` (la conversazione fino a quel messaggio compreso). */
  rispondi(storia: readonly TurnoChat[], segnale?: AbortSignal): AsyncIterable<EventoAssistente>;
}

export type StatoAssistente =
  | { disponibile: true; assistente: AssistenteChat }
  | { disponibile: false; messaggio: string };

/** Le istruzioni del modello per la chat, finché non arrivano gli agenti di ST-ORCH-001C. */
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
 * L'assistente dall'ambiente del server: con `OPENAI_API_KEY` risponde il modello (`TRAVELOPS_MODEL`, predefinito
 * gpt-6-luna), senza chiave è "non disponibile" con il messaggio per il viaggiatore. Non fa chiamate di rete.
 */
export function assistenteDaAmbiente(ambiente: Ambiente = process.env): StatoAssistente {
  const stato = creaClienteDaAmbiente(ambiente);
  return stato.disponibile ? { disponibile: true, assistente: assistenteDaModello(stato.cliente) } : { disponibile: false, messaggio: stato.messaggio };
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
