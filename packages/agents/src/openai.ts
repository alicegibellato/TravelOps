/**
 * Client OpenAI: realizza `ClienteModello` con l'SDK ufficiale `openai` e la Responses API in streaming.
 *
 * Perché la Responses API e non Chat Completions: è l'interfaccia che OpenAI indica per i progetti nuovi e per gli
 * agenti, gli eventi dello streaming sono tipizzati (testo, chiamata a strumento completa, fine) e le chiamate agli
 * strumenti sono voci a sé con il proprio `call_id`, quindi la traduzione verso `EventoModello` è diretta, senza
 * ricomporre a mano i frammenti degli argomenti. Le richieste sono senza stato (`store: false`): la conversazione
 * intera viaggia ogni volta, come con il client finto, e niente resta salvato presso il fornitore.
 *
 * Sicurezza (REQ-ORCH-001 CA-4): la chiave entra solo dal parametro `chiaveApi`, finisce solo nell'intestazione
 * `Authorization` che l'SDK costruisce, e non esce mai: il log dell'SDK è spento (anche con `OPENAI_LOG`), il client
 * restituito non tiene riferimenti all'SDK, gli errori sono tradotti in `ErroreAiNonDisponibile` senza il messaggio
 * originale né la causa. Questo modulo non scrive mai log.
 */
import OpenAI, { APIConnectionError, APIError, APIUserAbortError } from "openai";
import { ErroreAiNonDisponibile, type CausaAiNonDisponibile } from "./errori.js";
import type { ClienteModello, DefinizioneStrumento, EventoModello, Messaggio, RichiestaModello } from "./modello.js";

/** Il modello predefinito (CR-001 D-7), se `TRAVELOPS_MODEL` non dice altro. */
export const MODELLO_PREDEFINITO = "gpt-6-luna";

/** Una funzione compatibile con `fetch`, per i test (nessuna rete, CA-5). */
export type FetchCompatibile = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

/** Opzioni del client OpenAI. */
export interface OpzioniClienteOpenAI {
  /** La chiave dell'API: solo lato server, mai nel codice né nei log. */
  readonly chiaveApi: string;
  /** Il modello; predefinito `MODELLO_PREDEFINITO`. */
  readonly modello?: string;
  /** `fetch` da usare al posto di quello globale (nei test: un fetch finto). */
  readonly fetch?: FetchCompatibile;
  /** Nuovi tentativi dell'SDK su errori temporanei; predefinito 1. */
  readonly maxTentativi?: number;
  /** Tempo massimo di una richiesta in millisecondi; predefinito 60 000. */
  readonly timeoutMs?: number;
  /** Indirizzo dell'API, se diverso da quello ufficiale. */
  readonly indirizzoBase?: string;
}

type VoceIngresso = OpenAI.Responses.ResponseInputItem;
type StrumentoOpenAI = OpenAI.Responses.FunctionTool;

/** Crea il client OpenAI. Non fa chiamate di rete: la prima avviene con `rispondi`. */
export function creaClienteOpenAI(opzioni: OpzioniClienteOpenAI): ClienteModello {
  if (opzioni.chiaveApi.trim() === "") throw new ErroreAiNonDisponibile("chiave_mancante");
  const modello = opzioni.modello?.trim() || MODELLO_PREDEFINITO;
  const nulla = (): void => undefined;
  const sdk = new OpenAI({
    apiKey: opzioni.chiaveApi.trim(),
    maxRetries: opzioni.maxTentativi ?? 1,
    timeout: opzioni.timeoutMs ?? 60_000,
    // Log dell'SDK spento: vince su OPENAI_LOG, e il logger muto è una seconda garanzia.
    logLevel: "off",
    logger: { error: nulla, warn: nulla, info: nulla, debug: nulla },
    ...(opzioni.fetch === undefined ? {} : { fetch: opzioni.fetch }),
    ...(opzioni.indirizzoBase === undefined ? {} : { baseURL: opzioni.indirizzoBase }),
  });

  async function* rispondi(richiesta: RichiestaModello): AsyncGenerator<EventoModello> {
    try {
      const flusso = await sdk.responses.create(
        {
          model: modello,
          input: comeIngresso(richiesta.messaggi),
          store: false,
          stream: true,
          ...(richiesta.istruzioni === undefined ? {} : { instructions: richiesta.istruzioni }),
          ...(richiesta.strumenti === undefined || richiesta.strumenti.length === 0 ? {} : { tools: richiesta.strumenti.map(comeStrumento) }),
        },
        richiesta.segnale === undefined ? {} : { signal: richiesta.segnale },
      );
      let chiamate = 0;
      for await (const evento of flusso) {
        switch (evento.type) {
          case "response.output_text.delta":
          case "response.refusal.delta":
            if (evento.delta !== "") yield { tipo: "testo", testo: evento.delta };
            break;
          case "response.output_item.done":
            if (evento.item.type === "function_call") {
              chiamate += 1;
              const { call_id, name, arguments: argomenti } = evento.item;
              yield { tipo: "chiamata_strumento", chiamata: { id: call_id, nome: name, argomenti } };
            }
            break;
          case "response.completed": {
            const uso = evento.response.usage;
            const motivo = chiamate > 0 ? "strumenti" : "completata";
            yield uso ? { tipo: "fine", motivo, uso: { ingresso: uso.input_tokens, uscita: uso.output_tokens } } : { tipo: "fine", motivo };
            return;
          }
          case "response.incomplete":
            yield { tipo: "fine", motivo: "troncata" };
            return;
          case "response.failed":
            throw new ErroreAiNonDisponibile("servizio", dettagliCodice(evento.response.error?.code));
          default:
            break;
        }
      }
      throw new ErroreAiNonDisponibile("servizio");
    } catch (errore) {
      throw traduciErrore(errore, richiesta.segnale);
    }
  }

  return { fornitore: "openai", modello, rispondi };
}

/** La conversazione nel formato della Responses API. */
function comeIngresso(messaggi: readonly Messaggio[]): VoceIngresso[] {
  const voci: VoceIngresso[] = [];
  for (const messaggio of messaggi) {
    switch (messaggio.ruolo) {
      case "utente":
        voci.push({ type: "message", role: "user", content: messaggio.testo });
        break;
      case "assistente":
        if (messaggio.testo !== "") voci.push({ type: "message", role: "assistant", content: messaggio.testo });
        for (const chiamata of messaggio.chiamate ?? []) {
          voci.push({ type: "function_call", call_id: chiamata.id, name: chiamata.nome, arguments: chiamata.argomenti });
        }
        break;
      case "strumento":
        voci.push({ type: "function_call_output", call_id: messaggio.idChiamata, output: messaggio.risultato });
        break;
    }
  }
  return voci;
}

function comeStrumento(definizione: DefinizioneStrumento): StrumentoOpenAI {
  return {
    type: "function",
    name: definizione.nome,
    description: definizione.descrizione,
    parameters: { ...definizione.parametri },
    strict: definizione.rigoroso ?? false,
  };
}

/** Solo codici brevi e "puliti" (`invalid_api_key`): mai testo libero del fornitore. */
function dettagliCodice(codice: unknown): { codice?: string } {
  return typeof codice === "string" && /^[A-Za-z0-9_.-]{1,64}$/.test(codice) ? { codice } : {};
}

/** Qualsiasi errore dell'SDK diventa `ErroreAiNonDisponibile`, senza messaggio originale né causa. */
export function traduciErrore(errore: unknown, segnale?: AbortSignal): ErroreAiNonDisponibile {
  if (errore instanceof ErroreAiNonDisponibile) return errore;
  if (errore instanceof APIUserAbortError || segnale?.aborted === true) return new ErroreAiNonDisponibile("annullata");
  if (errore instanceof APIConnectionError) return new ErroreAiNonDisponibile("rete");
  if (errore instanceof APIError) {
    const stato = typeof errore.status === "number" ? errore.status : undefined;
    const dettagli = { ...(stato === undefined ? {} : { stato }), ...dettagliCodice(errore.code) };
    return new ErroreAiNonDisponibile(causaDaStato(stato), dettagli);
  }
  return new ErroreAiNonDisponibile("servizio");
}

function causaDaStato(stato: number | undefined): CausaAiNonDisponibile {
  if (stato === 401 || stato === 403) return "autenticazione";
  if (stato === 429) return "limite";
  if (stato === 408) return "rete";
  if (stato !== undefined && stato >= 400 && stato < 500) return "richiesta";
  return "servizio";
}
