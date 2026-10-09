/** Supporto ai test: fetch finto per l'API OpenAI (nessuna rete) e strumenti di prova. */
import { ErroreStrumento, type Strumento } from "../src/index.js";

/**
 * Una chiave finta, costruita a pezzi perché nessun file del repository contenga qualcosa che sembri una chiave
 * (lo controlla CA-4).
 */
export function chiaveFinta(): string {
  return ["sk", "proj", "FINTA", "0123456789abcdefABCDEF0123456789"].join("-");
}

/** Una richiesta ricevuta dal fetch finto. */
export interface RichiestaRicevuta {
  readonly url: string;
  readonly metodo: string;
  readonly intestazioni: Headers;
  readonly corpo: Record<string, unknown>;
}

/** Una risposta del fetch finto: eventi dello streaming (SSE) o un errore HTTP con corpo JSON. */
export type RispostaFinta =
  | { readonly eventi: readonly Record<string, unknown>[] }
  | { readonly stato: number; readonly corpo: unknown }
  | { readonly eccezione: Error };

/** Fetch finto: risponde con le risposte date, una per chiamata, e registra le richieste. */
export function creaFetchFinto(...risposte: RispostaFinta[]) {
  const richieste: RichiestaRicevuta[] = [];
  const fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    richieste.push({
      url,
      metodo: init?.method ?? "GET",
      intestazioni: new Headers(init?.headers),
      corpo: typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : {},
    });
    const risposta = risposte[richieste.length - 1];
    if (risposta === undefined) throw new Error("fetch finto: nessuna risposta preparata");
    if ("eccezione" in risposta) throw risposta.eccezione;
    if ("stato" in risposta) {
      return new Response(JSON.stringify(risposta.corpo), { status: risposta.stato, headers: { "content-type": "application/json" } });
    }
    const testo = risposta.eventi.map((e) => `event: ${String(e.type)}\ndata: ${JSON.stringify(e)}\n\n`).join("");
    return new Response(testo, { status: 200, headers: { "content-type": "text/event-stream" } });
  };
  return { fetch, richieste };
}

let sequenza = 0;
const evento = (tipo: string, dati: Record<string, unknown> = {}): Record<string, unknown> => ({ type: tipo, sequence_number: sequenza++, ...dati });

/** Gli eventi SSE di una risposta della Responses API con testo (a pezzi) e chiamate agli strumenti. */
export function eventiRisposta(
  pezzi: readonly string[],
  chiamate: readonly { id: string; nome: string; argomenti: string }[] = [],
  fine: "completed" | "incomplete" | "failed" = "completed",
): Record<string, unknown>[] {
  const risposta = { id: "resp_finta", object: "response", status: fine, output: [], usage: { input_tokens: 12, output_tokens: 7, total_tokens: 19 } };
  return [
    evento("response.created", { response: { ...risposta, status: "in_progress" } }),
    ...pezzi.map((delta) => evento("response.output_text.delta", { item_id: "msg_1", output_index: 0, content_index: 0, delta, logprobs: [] })),
    ...chiamate.map((c, i) =>
      evento("response.output_item.done", {
        output_index: i + 1,
        item: { type: "function_call", id: `fc_${i}`, call_id: c.id, name: c.nome, arguments: c.argomenti, status: "completed" },
      }),
    ),
    fine === "failed"
      ? evento("response.failed", { response: { ...risposta, error: { code: "server_error", message: "qualcosa non va" } } })
      : evento(`response.${fine}`, { response: risposta }),
  ];
}

/** Strumenti di prova (quelli veri sono di ST-ORCH-001B). */
export function strumentiDiProva(registro: { chiamate: { nome: string; argomenti: unknown }[] } = { chiamate: [] }): Strumento[] {
  return [
    {
      definizione: {
        nome: "meteo_di_prova",
        descrizione: "Il meteo simulato di una città (strumento di prova).",
        parametri: { type: "object", properties: { citta: { type: "string" } }, required: ["citta"], additionalProperties: false },
      },
      esegui(argomenti) {
        registro.chiamate.push({ nome: "meteo_di_prova", argomenti });
        const { citta } = argomenti as { citta?: unknown };
        if (typeof citta !== "string") throw new ErroreStrumento("Manca la città.");
        return { citta, cielo: "sereno", temperatura: 21 };
      },
    },
    {
      definizione: {
        nome: "somma_di_prova",
        descrizione: "Somma due numeri (strumento di prova).",
        parametri: { type: "object", properties: { a: { type: "number" }, b: { type: "number" } }, required: ["a", "b"] },
      },
      esegui(argomenti) {
        registro.chiamate.push({ nome: "somma_di_prova", argomenti });
        const { a, b } = argomenti as { a: number; b: number };
        return String(a + b);
      },
    },
    {
      definizione: { nome: "rotto_di_prova", descrizione: "Fallisce sempre (strumento di prova).", parametri: { type: "object", properties: {} } },
      esegui() {
        throw new Error("dettaglio interno da non mandare al modello");
      },
    },
  ];
}
