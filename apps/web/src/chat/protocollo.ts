/**
 * Il protocollo dello streaming della chat (REQ-CHAT-001, ST-CHAT-001A): la risposta a un messaggio arriva come
 * eventi JSON, uno per riga (`application/x-ndjson`). Prima i pezzi di testo, poi la risposta completa (con la scheda
 * ricca e le risposte rapide) già salvata nella conversazione, oppure un errore.
 *
 * Il modulo non dipende da Node né dal server: lo usano il server per scrivere gli eventi e il browser per leggerli.
 */
import type { RispostaChat } from "./tipi";

/** "non-disponibile": l'assistente non c'è (la chat si spegne); "errore": solo questa richiesta è fallita (si riprova). */
export type CodiceErroreChat = "non-disponibile" | "errore";

export type EventoChat =
  /** Un pezzo del testo della risposta, nell'ordine. */
  | { tipo: "testo"; testo: string }
  /** La risposta completa, salvata nella conversazione con quel numero di messaggio: è sempre l'ultimo evento. */
  | { tipo: "risposta"; numero: number; risposta: RispostaChat }
  /** La risposta non è arrivata: nulla è stato salvato, è sempre l'ultimo evento. */
  | { tipo: "errore"; codice: CodiceErroreChat; messaggio: string };

export const TIPO_CONTENUTO_EVENTI = "application/x-ndjson; charset=utf-8";

/** Un evento come riga del flusso. */
export function codificaEvento(evento: EventoChat): string {
  return `${JSON.stringify(evento)}\n`;
}

function eTesto(valore: unknown): valore is string {
  return typeof valore === "string";
}

function oggetto(valore: unknown): Record<string, unknown> | null {
  return typeof valore === "object" && valore !== null && !Array.isArray(valore) ? (valore as Record<string, unknown>) : null;
}

/** Legge un evento dalla sua riga; una riga che non è un evento del protocollo solleva un errore. */
export function decodificaEvento(riga: string): EventoChat {
  let valore: unknown;
  try {
    valore = JSON.parse(riga) as unknown;
  } catch {
    throw new Error("evento della chat non valido: la riga non è JSON");
  }
  const evento = oggetto(valore);
  if (evento?.tipo === "testo" && eTesto(evento.testo)) return { tipo: "testo", testo: evento.testo };
  if (evento?.tipo === "risposta" && typeof evento.numero === "number" && eTesto(oggetto(evento.risposta)?.testo)) {
    return { tipo: "risposta", numero: evento.numero, risposta: evento.risposta as RispostaChat };
  }
  if (evento?.tipo === "errore" && (evento.codice === "non-disponibile" || evento.codice === "errore") && eTesto(evento.messaggio)) {
    return { tipo: "errore", codice: evento.codice, messaggio: evento.messaggio };
  }
  throw new Error("evento della chat non valido: tipo o campi sconosciuti");
}

/** Gli eventi come flusso di byte, una riga per evento. */
export function flussoDaEventi(eventi: AsyncIterable<EventoChat>): ReadableStream<Uint8Array> {
  const codificatore = new TextEncoder();
  const iteratore = eventi[Symbol.asyncIterator]();
  return new ReadableStream<Uint8Array>({
    async pull(controllo) {
      const { value, done } = await iteratore.next();
      if (done) controllo.close();
      else controllo.enqueue(codificatore.encode(codificaEvento(value)));
    },
    async cancel() {
      // Chi legge ha chiuso (per esempio il viaggiatore ha lasciato la pagina): si ferma anche chi produce.
      await iteratore.return?.();
    },
  });
}

/** Legge gli eventi da un flusso di byte, nell'ordine. */
export async function* leggiEventi(flusso: ReadableStream<Uint8Array>): AsyncGenerator<EventoChat> {
  const decodificatore = new TextDecoder();
  const lettore = flusso.getReader();
  let resto = "";
  try {
    for (;;) {
      const { value, done } = await lettore.read();
      resto += done ? decodificatore.decode() : decodificatore.decode(value, { stream: true });
      const righe = resto.split("\n");
      resto = righe.pop() ?? "";
      for (const riga of righe) if (riga.trim() !== "") yield decodificaEvento(riga);
      if (done) break;
    }
    if (resto.trim() !== "") yield decodificaEvento(resto);
  } finally {
    lettore.releaseLock();
  }
}
