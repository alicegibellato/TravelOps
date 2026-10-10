/**
 * La sorgente della chat che parla con il server (REQ-CHAT-001, ST-CHAT-001C): crea la conversazione alla prima
 * domanda, manda i messaggi a `POST /api/chat/conversazioni/:id/messaggi` e legge la risposta in streaming
 * (`protocollo.ts`): testo, passi degli agenti, azioni fatte sul viaggio e infine la risposta salvata. Accetta e
 * Rifiuta passano da `POST /api/chat/conversazioni/:id/proposte/:proposta`.
 *
 * Gira nel browser: nessuna chiave e nessuna regola del motore qui.
 */
import { leggiEventi } from "./protocollo";
import { ErroreSorgente, type AscoltoRisposta, type EsitoDecisioneSorgente, type MessaggioSalvato, type SorgenteRisposte } from "./sorgente";
import type { Benvenuto, RispostaChat, SchedaConfermaChat } from "./tipi";

export interface OpzioniSorgenteServer {
  benvenuto: Benvenuto;
  /** La conversazione già aperta, se c'è (per esempio dopo aver ricaricato la pagina). */
  conversazione?: number | null | undefined;
  /** Il viaggio a cui collegare una conversazione nuova; `null` se il viaggio nasce in chat. */
  viaggio?: string | null | undefined;
  /** Quando la conversazione viene creata: chi usa la sorgente può ricordarla (per esempio nell'indirizzo). */
  conversazioneCreata?: ((id: number) => void) | undefined;
  /** Per i test: la `fetch` da usare. */
  fetch?: typeof fetch | undefined;
}

const BASE = "/api/chat/conversazioni";
const INTESTAZIONI = { "content-type": "application/json" };

async function erroreDallaRisposta(risposta: Response): Promise<never> {
  let messaggio = "Qualcosa non ha funzionato.";
  try {
    const corpo = (await risposta.json()) as { errore?: { messaggio?: unknown } };
    if (typeof corpo.errore?.messaggio === "string") messaggio = corpo.errore.messaggio;
  } catch {
    // Il messaggio predefinito va bene.
  }
  throw new ErroreSorgente("errore", messaggio);
}

/** La sorgente collegata al server della chat. */
export function creaSorgenteServer(opzioni: OpzioniSorgenteServer): SorgenteRisposte & { conversazione(): number | null } {
  const chiama = opzioni.fetch ?? ((...argomenti: Parameters<typeof fetch>) => fetch(...argomenti));
  let conversazione = opzioni.conversazione ?? null;

  async function conversazioneAperta(): Promise<number> {
    if (conversazione !== null) return conversazione;
    const risposta = await chiama(BASE, { method: "POST", headers: INTESTAZIONI, body: JSON.stringify({ viaggio: opzioni.viaggio ?? null }) });
    if (!risposta.ok) return erroreDallaRisposta(risposta);
    const { conversazione: creata } = (await risposta.json()) as { conversazione: { id: number } };
    conversazione = creata.id;
    opzioni.conversazioneCreata?.(creata.id);
    return creata.id;
  }

  return {
    conversazione: () => conversazione,

    benvenuto: () => Promise.resolve(opzioni.benvenuto),

    async conversazioneSalvata(): Promise<readonly MessaggioSalvato[]> {
      if (conversazione === null) return [];
      const risposta = await chiama(`${BASE}/${conversazione}`, { method: "GET" });
      // Una conversazione che non c'è più (base dati ripristinata): si riparte da una nuova.
      if (risposta.status === 404) {
        conversazione = null;
        return [];
      }
      if (!risposta.ok) return erroreDallaRisposta(risposta);
      const { conversazione: salvata } = (await risposta.json()) as { conversazione: { messaggi: MessaggioSalvato[] } };
      return salvata.messaggi.map(({ autore, testo, scheda }) => ({ autore, testo, ...(scheda === undefined ? {} : { scheda }) }));
    },

    async rispondi(testo: string, _storia, ascolta?: AscoltoRisposta): Promise<RispostaChat> {
      const id = await conversazioneAperta();
      const risposta = await chiama(`${BASE}/${id}/messaggi`, { method: "POST", headers: INTESTAZIONI, body: JSON.stringify({ testo }) });
      if (!risposta.ok || risposta.body === null) return erroreDallaRisposta(risposta);
      let scritto = "";
      for await (const evento of leggiEventi(risposta.body)) {
        switch (evento.tipo) {
          case "testo":
            scritto += evento.testo;
            ascolta?.testo?.(scritto);
            break;
          case "testo_corretto":
            scritto = evento.testo;
            ascolta?.testo?.(scritto);
            break;
          case "passo":
            ascolta?.passo?.(evento.testo);
            break;
          case "azione":
            ascolta?.azione?.(evento.testo, evento.viaggio);
            break;
          case "agente":
            break;
          case "risposta":
            return evento.risposta;
          case "errore":
            throw new ErroreSorgente(evento.codice, evento.messaggio);
        }
      }
      throw new ErroreSorgente("errore", "La risposta si è interrotta.");
    },

    async decidi(propostaId: number, decisione: "accetta" | "rifiuta"): Promise<EsitoDecisioneSorgente> {
      const id = await conversazioneAperta();
      const risposta = await chiama(`${BASE}/${id}/proposte/${propostaId}`, { method: "POST", headers: INTESTAZIONI, body: JSON.stringify({ decisione }) });
      if (!risposta.ok) return erroreDallaRisposta(risposta);
      const corpo = (await risposta.json()) as { esito: { livello: string; messaggio: string }; messaggio: { testo: string; scheda?: SchedaConfermaChat } };
      return { testo: corpo.messaggio.testo, scheda: corpo.messaggio.scheda, cambiato: decisione === "accetta" && corpo.esito.livello === "successo" };
    },
  };
}
