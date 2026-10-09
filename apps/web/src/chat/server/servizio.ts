/**
 * Il servizio della chat lato server (REQ-CHAT-001, ST-CHAT-001A): crea e legge le conversazioni salvate
 * (REQ-DATA-001), risponde a un messaggio in streaming e accetta o rifiuta dalla chat una proposta.
 *
 * Non dipende da Next.js: gli endpoint (`app/api/chat`) leggono la richiesta e chiamano queste funzioni.
 * Nessuna regola del motore qui: accettare e rifiutare usano le stesse operazioni del pulsante della pagina Demo
 * (`src/stato/operazioni.ts`), quindi creano la stessa versione (CA-2).
 */
import {
  aggiungiMessaggio,
  creaConversazione,
  inTransazione,
  leggiConversazione,
  trovaViaggio,
  type Conversazione,
  type Messaggio,
} from "../../basedati";
import { usaBaseDati } from "../../stato/avvio";
import { accettaProposta, rifiutaPropostaSalvata } from "../../stato/operazioni";
import type { EsitoAzione } from "../../stato/stato";
import type { EventoChat } from "../protocollo";
import type { RispostaChat, SchedaChat, TurnoChat } from "../tipi";
import { codiceErrore, type StatoAssistente } from "./assistente";

/** Il messaggio più lungo che il viaggiatore può mandare, in caratteri. */
export const LUNGHEZZA_MASSIMA_MESSAGGIO = 2000;

/** Il messaggio per il viaggiatore quando una sola richiesta fallisce. */
export const MESSAGGIO_ERRORE_RICHIESTA = "Non sono riuscito a rispondere: riprova tra poco.";

export type CodiceErroreRichiesta = "messaggio-non-valido" | "conversazione-inesistente" | "viaggio-inesistente" | "richiesta-non-valida";

const STATO_HTTP: Record<CodiceErroreRichiesta, 400 | 404> = {
  "messaggio-non-valido": 400,
  "richiesta-non-valida": 400,
  "conversazione-inesistente": 404,
  "viaggio-inesistente": 404,
};

/** Una richiesta che non si può soddisfare: gli endpoint rispondono con lo stato HTTP e il messaggio. */
export class ErroreRichiestaChat extends Error {
  override readonly name = "ErroreRichiestaChat";
  readonly codice: CodiceErroreRichiesta;
  readonly statoHttp: 400 | 404;

  constructor(codice: CodiceErroreRichiesta, messaggio: string) {
    super(messaggio);
    this.codice = codice;
    this.statoHttp = STATO_HTTP[codice];
  }
}

/** Un messaggio della conversazione come lo mostra la chat. */
export interface MessaggioChat {
  numero: number;
  autore: TurnoChat["autore"];
  testo: string;
  scheda?: SchedaChat | undefined;
  risposteRapide?: readonly string[] | undefined;
}

export interface ConversazioneChat {
  id: number;
  viaggioId: string | null;
  messaggi: MessaggioChat[];
}

/** I dati di un messaggio di TravelOps salvati con il testo: la scheda e le risposte rapide. */
interface DatiRisposta {
  scheda?: SchedaChat;
  risposteRapide?: readonly string[];
}

function datiRisposta(risposta: RispostaChat): DatiRisposta | null {
  const dati: DatiRisposta = {};
  if (risposta.scheda !== undefined) dati.scheda = risposta.scheda;
  if (risposta.risposteRapide !== undefined && risposta.risposteRapide.length > 0) dati.risposteRapide = risposta.risposteRapide;
  return Object.keys(dati).length === 0 ? null : dati;
}

function comeMessaggioChat(messaggio: Messaggio): MessaggioChat {
  const autore = messaggio.ruolo === "viaggiatore" ? "viaggiatore" : "travelops";
  const dati = (typeof messaggio.dati === "object" && messaggio.dati !== null ? messaggio.dati : {}) as DatiRisposta;
  return {
    numero: messaggio.numero,
    autore,
    testo: messaggio.testo,
    ...(dati.scheda !== undefined ? { scheda: dati.scheda } : {}),
    ...(dati.risposteRapide !== undefined ? { risposteRapide: dati.risposteRapide } : {}),
  };
}

function comeConversazioneChat(conversazione: Conversazione): ConversazioneChat {
  return { id: conversazione.id, viaggioId: conversazione.viaggioId, messaggi: conversazione.messaggi.map(comeMessaggioChat) };
}

function conversazioneEsistente(cartella: string, id: number): Conversazione {
  const conversazione = usaBaseDati(cartella, (db) => leggiConversazione(db, id));
  if (conversazione === null) throw new ErroreRichiestaChat("conversazione-inesistente", "Questa conversazione non esiste più.");
  return conversazione;
}

/** Crea una conversazione vuota, collegata al viaggio o a nessun viaggio (quando il viaggio nasce in chat). */
export function creaConversazioneChat(cartella: string, viaggioId: string | null): ConversazioneChat {
  return usaBaseDati(cartella, (db) => {
    if (viaggioId !== null && trovaViaggio(db, viaggioId) === null) {
      throw new ErroreRichiestaChat("viaggio-inesistente", "Il viaggio indicato non esiste.");
    }
    return { id: creaConversazione(db, viaggioId), viaggioId, messaggi: [] };
  });
}

/** La conversazione salvata, con i messaggi nell'ordine. */
export function leggiConversazioneChat(cartella: string, id: number): ConversazioneChat {
  return comeConversazioneChat(conversazioneEsistente(cartella, id));
}

/** Il testo del messaggio pronto da inviare: senza spazi ai bordi, non vuoto, non troppo lungo. */
export function testoValido(testo: unknown): string {
  if (typeof testo !== "string" || testo.trim() === "") throw new ErroreRichiestaChat("messaggio-non-valido", "Scrivi un messaggio prima di inviarlo.");
  const pulito = testo.trim();
  if (pulito.length > LUNGHEZZA_MASSIMA_MESSAGGIO) {
    throw new ErroreRichiestaChat("messaggio-non-valido", `Il messaggio è troppo lungo: al massimo ${LUNGHEZZA_MASSIMA_MESSAGGIO} caratteri.`);
  }
  return pulito;
}

/** La risposta a un messaggio, pronta da mandare in streaming. */
export interface InvioPreparato {
  conversazioneId: number;
  testo: string;
  /** La conversazione fino al nuovo messaggio compreso. */
  storia: TurnoChat[];
}

/**
 * Controlla la richiesta prima dello streaming: conversazione esistente e testo valido. Solleva
 * `ErroreRichiestaChat`, così l'endpoint risponde con 400 o 404 invece di aprire il flusso.
 */
export function preparaInvio(cartella: string, conversazioneId: number, testo: unknown): InvioPreparato {
  const valido = testoValido(testo);
  const conversazione = comeConversazioneChat(conversazioneEsistente(cartella, conversazioneId));
  const storia: TurnoChat[] = conversazione.messaggi.map(({ autore, testo }) => ({ autore, testo }));
  storia.push({ autore: "viaggiatore", testo: valido });
  return { conversazioneId, testo: valido, storia };
}

/**
 * Gli eventi della risposta. I pezzi di testo passano man mano; alla fine il messaggio del viaggiatore e quello di
 * TravelOps si salvano insieme e l'ultimo evento è la risposta con il suo numero. Se l'assistente non c'è o non
 * risponde, l'ultimo evento è l'errore e la conversazione non cambia: il viaggiatore può riprovare con lo stesso testo.
 */
export async function* rispondiInStreaming(
  cartella: string,
  invio: InvioPreparato,
  statoAssistente: StatoAssistente,
  segnale?: AbortSignal,
): AsyncGenerator<EventoChat> {
  if (!statoAssistente.disponibile) {
    yield { tipo: "errore", codice: "non-disponibile", messaggio: statoAssistente.messaggio };
    return;
  }
  let risposta: RispostaChat | null = null;
  try {
    for await (const evento of statoAssistente.assistente.rispondi(invio.storia, segnale)) {
      if (evento.tipo === "testo") yield evento;
      else risposta = evento.risposta;
    }
  } catch (errore) {
    const codice = codiceErrore(errore);
    const messaggio =
      codice === "errore" ? MESSAGGIO_ERRORE_RICHIESTA : (errore as { messaggioUtente?: string }).messaggioUtente ?? MESSAGGIO_ERRORE_RICHIESTA;
    yield { tipo: "errore", codice, messaggio };
    return;
  }
  if (risposta === null || risposta.testo.trim() === "") {
    yield { tipo: "errore", codice: "errore", messaggio: MESSAGGIO_ERRORE_RICHIESTA };
    return;
  }
  const completa = risposta;
  const numero = usaBaseDati(cartella, (db) =>
    inTransazione(db, () => {
      if (leggiConversazione(db, invio.conversazioneId) === null) {
        throw new ErroreRichiestaChat("conversazione-inesistente", "Questa conversazione non esiste più.");
      }
      aggiungiMessaggio(db, invio.conversazioneId, { ruolo: "viaggiatore", testo: invio.testo, dati: null });
      return aggiungiMessaggio(db, invio.conversazioneId, { ruolo: "assistente", testo: completa.testo, dati: datiRisposta(completa) });
    }),
  );
  yield { tipo: "risposta", numero, risposta: completa };
}

export type DecisioneProposta = "accetta" | "rifiuta";

export interface EsitoDecisione {
  /** L'esito dell'operazione, lo stesso del pulsante. */
  esito: EsitoAzione;
  /** Il messaggio di TravelOps salvato nella conversazione, con la scheda di conferma. */
  messaggio: MessaggioChat;
}

/** Il titolo della scheda di conferma, per l'esito dell'operazione. */
function titoloConferma(decisione: DecisioneProposta, esito: EsitoAzione): string {
  if (esito.livello === "errore") return "Non è stato possibile applicare la proposta";
  return decisione === "accetta" ? "Proposta accettata" : "Proposta rifiutata";
}

/**
 * Accetta o rifiuta dalla chat la proposta salvata con quell'id. L'operazione è la stessa del pulsante della pagina
 * Demo (`accettaProposta` / `rifiutaPropostaSalvata`): stessa versione, stesso autore, stesso momento (CA-2).
 * L'esito si salva nella conversazione come messaggio di TravelOps con la scheda di conferma.
 */
export function decidiPropostaDallaChat(
  cartella: string,
  conversazioneId: number,
  idProposta: number,
  decisione: DecisioneProposta,
  nome: string,
): EsitoDecisione {
  conversazioneEsistente(cartella, conversazioneId);
  const risultato = decisione === "accetta" ? accettaProposta(cartella, idProposta, nome) : rifiutaPropostaSalvata(cartella, idProposta);
  const esito: EsitoAzione = risultato.ok ? risultato.esito : { livello: "errore", messaggio: risultato.messaggio };
  const scheda: SchedaChat = { tipo: "conferma", titolo: titoloConferma(decisione, esito), testo: esito.messaggio };
  const numero = usaBaseDati(cartella, (db) =>
    aggiungiMessaggio(db, conversazioneId, { ruolo: "assistente", testo: esito.messaggio, dati: { scheda } }),
  );
  return { esito, messaggio: { numero, autore: "travelops", testo: esito.messaggio, scheda } };
}
