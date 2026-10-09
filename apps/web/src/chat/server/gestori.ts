/**
 * I gestori HTTP degli endpoint della chat (REQ-CHAT-001, ST-CHAT-001A). Ricevono una `Request` standard e
 * restituiscono una `Response`: i file `app/api/chat/.../route.ts` li espongono a Next.js, i test li chiamano
 * direttamente con una cartella temporanea e un assistente finto.
 *
 * - `POST /api/chat/conversazioni` `{ viaggio?: string }` → 201 `{ conversazione }`
 * - `GET /api/chat/conversazioni/:id` → 200 `{ conversazione }`
 * - `POST /api/chat/conversazioni/:id/messaggi` `{ testo }` → 200, eventi JSON per riga (`protocollo.ts`)
 * - `POST /api/chat/conversazioni/:id/proposte/:proposta` `{ decisione: "accetta" | "rifiuta", nome? }` → 200 `{ esito, messaggio }`
 *
 * Gli errori della richiesta rispondono `{ errore: { codice, messaggio } }` con 400 o 404; gli errori della risposta
 * dell'assistente arrivano come ultimo evento del flusso. Nessun dettaglio tecnico arriva al viaggiatore.
 */
import { NOME_PREDEFINITO } from "../../stato/stato";
import { flussoDaEventi, TIPO_CONTENUTO_EVENTI } from "../protocollo";
import type { StatoAssistente } from "./assistente";
import {
  creaConversazioneChat,
  decidiPropostaDallaChat,
  ErroreRichiestaChat,
  leggiConversazioneChat,
  preparaInvio,
  rispondiInStreaming,
} from "./servizio";

export interface DipendenzeChat {
  /** La cartella della base dati. */
  cartella: () => string;
  /** L'assistente, letto a ogni messaggio (l'ambiente del server può cambiare). */
  assistente: () => StatoAssistente;
  /** Dopo una decisione su una proposta: le pagine che mostrano l'itinerario si rigenerano. */
  dopoDecisione?: () => void;
}

/** I parametri dinamici dell'indirizzo, come li passa Next.js. */
export interface ContestoRotta<P> {
  params: Promise<P>;
}

/** Come il campo "nome" del modulo della proposta (`PaginaProposta.tsx`). */
export const LUNGHEZZA_MASSIMA_NOME = 80;

const INTESTAZIONI_JSON ={ "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

function json(corpo: unknown, stato = 200): Response {
  return new Response(JSON.stringify(corpo), { status: stato, headers: INTESTAZIONI_JSON });
}

function rispostaDiErrore(errore: unknown): Response {
  if (errore instanceof ErroreRichiestaChat) return json({ errore: { codice: errore.codice, messaggio: errore.message } }, errore.statoHttp);
  throw errore;
}

/** Il corpo JSON della richiesta come oggetto; corpo assente o non JSON valgono come richiesta non valida. */
async function corpoJson(richiesta: Request, obbligatorio: boolean): Promise<Record<string, unknown>> {
  const testo = await richiesta.text();
  if (testo.trim() === "" && !obbligatorio) return {};
  try {
    const valore = JSON.parse(testo) as unknown;
    if (typeof valore === "object" && valore !== null && !Array.isArray(valore)) return valore as Record<string, unknown>;
  } catch {
    // Ricade sull'errore qui sotto.
  }
  throw new ErroreRichiestaChat("richiesta-non-valida", "La richiesta non è valida.");
}

/** Un numero intero positivo dall'indirizzo, altrimenti l'errore indicato. */
function numeroDaIndirizzo(valore: string, errore: ErroreRichiestaChat): number {
  if (!/^[1-9]\d{0,9}$/.test(valore)) throw errore;
  return Number(valore);
}

function idConversazione(valore: string): number {
  return numeroDaIndirizzo(valore, new ErroreRichiestaChat("conversazione-inesistente", "Questa conversazione non esiste più."));
}

export function creaGestoriChat(dipendenze: DipendenzeChat) {
  return {
    async creaConversazione(richiesta: Request): Promise<Response> {
      try {
        const corpo = await corpoJson(richiesta, false);
        const viaggio = corpo.viaggio;
        if (viaggio !== undefined && viaggio !== null && typeof viaggio !== "string") {
          throw new ErroreRichiestaChat("richiesta-non-valida", "La richiesta non è valida.");
        }
        return json({ conversazione: creaConversazioneChat(dipendenze.cartella(), viaggio ?? null) }, 201);
      } catch (errore) {
        return rispostaDiErrore(errore);
      }
    },

    async leggiConversazione(_richiesta: Request, contesto: ContestoRotta<{ id: string }>): Promise<Response> {
      try {
        const { id } = await contesto.params;
        return json({ conversazione: leggiConversazioneChat(dipendenze.cartella(), idConversazione(id)) });
      } catch (errore) {
        return rispostaDiErrore(errore);
      }
    },

    async inviaMessaggio(richiesta: Request, contesto: ContestoRotta<{ id: string }>): Promise<Response> {
      try {
        const { id } = await contesto.params;
        const corpo = await corpoJson(richiesta, true);
        const cartella = dipendenze.cartella();
        const invio = preparaInvio(cartella, idConversazione(id), corpo.testo);
        const eventi = rispondiInStreaming(cartella, invio, dipendenze.assistente(), richiesta.signal);
        return new Response(flussoDaEventi(eventi), {
          status: 200,
          headers: { "content-type": TIPO_CONTENUTO_EVENTI, "cache-control": "no-store", "x-accel-buffering": "no" },
        });
      } catch (errore) {
        return rispostaDiErrore(errore);
      }
    },

    async decidiProposta(richiesta: Request, contesto: ContestoRotta<{ id: string; proposta: string }>): Promise<Response> {
      try {
        const { id, proposta } = await contesto.params;
        const conversazione = idConversazione(id);
        const idProposta = numeroDaIndirizzo(proposta, new ErroreRichiestaChat("richiesta-non-valida", "La proposta indicata non è valida."));
        const corpo = await corpoJson(richiesta, true);
        if (corpo.decisione !== "accetta" && corpo.decisione !== "rifiuta") {
          throw new ErroreRichiestaChat("richiesta-non-valida", "Indica se accettare o rifiutare la proposta.");
        }
        // Il nome passa così com'è, come dal modulo del pulsante (obbligatorio, al massimo 80 caratteri):
        // se manca, quello predefinito del modulo.
        const nome = corpo.nome === undefined ? NOME_PREDEFINITO : corpo.nome;
        if (typeof nome !== "string" || nome.trim() === "" || nome.length > LUNGHEZZA_MASSIMA_NOME) {
          throw new ErroreRichiestaChat("richiesta-non-valida", `Indica il tuo nome, al massimo ${LUNGHEZZA_MASSIMA_NOME} caratteri.`);
        }
        const esito = decidiPropostaDallaChat(dipendenze.cartella(), conversazione, idProposta, corpo.decisione, nome);
        dipendenze.dopoDecisione?.();
        return json(esito);
      } catch (errore) {
        return rispostaDiErrore(errore);
      }
    },
  };
}

export type GestoriChat = ReturnType<typeof creaGestoriChat>;
