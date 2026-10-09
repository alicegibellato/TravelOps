/**
 * Supporto ai test della chat lato server (REQ-CHAT-001, ST-CHAT-001A): i gestori con una cartella temporanea e un
 * assistente scelto dal test, le richieste HTTP come le manda il browser e la lettura degli eventi dello streaming.
 * Nessuna chiamata di rete: `fetch` è bloccato per tutto il test.
 */
import { afterEach, beforeEach, vi } from "vitest";
import { leggiEventi, type EventoChat } from "../src/chat/protocollo";
import type { AssistenteChat, StatoAssistente } from "../src/chat/server/assistente";
import { assistenteFinto } from "../src/chat/server/assistente";
import { creaGestoriChat, type GestoriChat } from "../src/chat/server/gestori";
import type { ConversazioneChat } from "../src/chat/server/servizio";
import type { Copione } from "../src/chat/sorgente";
import { nuovaCartella } from "./supporto-stato";

beforeEach(() => {
  vi.stubGlobal("fetch", () => {
    throw new Error("rete vietata nei test della chat");
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Un copione piccolo: una risposta con scheda e risposte rapide, una semplice, e quella di riserva. */
export const COPIONE_DI_PROVA: Copione = {
  benvenuto: { testo: "Ciao! Raccontami il viaggio.", suggerimenti: ["Lago", "Città", "Montagna"] },
  risposte: [
    {
      parole: ["lago"],
      risposta: {
        testo: "Bella idea, il lago di Garda a giugno è perfetto. Con chi viaggi?",
        scheda: { tipo: "preferenze", titolo: "Le tue preferenze", voci: [{ etichetta: "Destinazione", valore: "Lago di Garda" }] },
        risposteRapide: ["Coppia", "Famiglia", "Da solo"],
      },
    },
    { parole: ["coppia"], risposta: { testo: "Perfetto, un viaggio in due." } },
  ],
  altrimenti: { testo: "Dimmi qualcosa in più sul viaggio." },
};

export function disponibile(assistente: AssistenteChat): StatoAssistente {
  return { disponibile: true, assistente };
}

export interface Ambiente {
  cartella: string;
  gestori: GestoriChat;
  /** Quante volte le pagine sono state rigenerate dopo una decisione. */
  rigenerazioni: () => number;
}

/** I gestori su una cartella nuova; l'assistente predefinito è quello finto con `COPIONE_DI_PROVA`. */
export function ambienteChat(assistente: () => StatoAssistente = () => disponibile(assistenteFinto(COPIONE_DI_PROVA)), cartella = nuovaCartella()): Ambiente {
  let rigenerazioni = 0;
  const gestori = creaGestoriChat({
    cartella: () => cartella,
    assistente,
    dopoDecisione: () => {
      rigenerazioni += 1;
    },
  });
  return { cartella, gestori, rigenerazioni: () => rigenerazioni };
}

const BASE = "http://localhost/api/chat/conversazioni";

export function richiesta(percorso: string, corpo?: unknown, metodo = "POST"): Request {
  const testo = corpo === undefined ? undefined : typeof corpo === "string" ? corpo : JSON.stringify(corpo);
  return new Request(`${BASE}${percorso}`, {
    method: metodo,
    headers: { "content-type": "application/json" },
    ...(testo === undefined ? {} : { body: testo }),
  });
}

export function contesto<P>(params: P): { params: Promise<P> } {
  return { params: Promise.resolve(params) };
}

/** Crea una conversazione con l'endpoint e la restituisce. */
export async function nuovaConversazione(ambiente: Ambiente, viaggio?: string): Promise<ConversazioneChat> {
  const risposta = await ambiente.gestori.creaConversazione(richiesta("", viaggio === undefined ? undefined : { viaggio }));
  if (risposta.status !== 201) throw new Error(`creazione fallita: ${risposta.status} ${await risposta.text()}`);
  return ((await risposta.json()) as { conversazione: ConversazioneChat }).conversazione;
}

/** Legge la conversazione con l'endpoint. */
export async function conversazioneSalvata(ambiente: Ambiente, id: number): Promise<ConversazioneChat> {
  const risposta = await ambiente.gestori.leggiConversazione(richiesta(`/${id}`, undefined, "GET"), contesto({ id: String(id) }));
  if (risposta.status !== 200) throw new Error(`lettura fallita: ${risposta.status}`);
  return ((await risposta.json()) as { conversazione: ConversazioneChat }).conversazione;
}

/** Invia un messaggio e restituisce la risposta HTTP (lo streaming non è ancora letto). */
export function invia(ambiente: Ambiente, id: number, corpo: unknown): Promise<Response> {
  return ambiente.gestori.inviaMessaggio(richiesta(`/${id}/messaggi`, corpo), contesto({ id: String(id) }));
}

/** Tutti gli eventi dello streaming, nell'ordine. */
export async function eventi(risposta: Response): Promise<EventoChat[]> {
  if (risposta.body === null) throw new Error("risposta senza corpo");
  const letti: EventoChat[] = [];
  for await (const evento of leggiEventi(risposta.body)) letti.push(evento);
  return letti;
}

/** Invia un messaggio e legge tutti gli eventi. */
export async function inviaELeggi(ambiente: Ambiente, id: number, testo: string): Promise<EventoChat[]> {
  const risposta = await invia(ambiente, id, { testo });
  if (risposta.status !== 200) throw new Error(`invio fallito: ${risposta.status} ${await risposta.text()}`);
  return eventi(risposta);
}

/** Il corpo JSON di una risposta di errore. */
export async function erroreDi(risposta: Response): Promise<{ codice: string; messaggio: string }> {
  return ((await risposta.json()) as { errore: { codice: string; messaggio: string } }).errore;
}
