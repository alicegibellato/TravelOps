"use client";

import { MessageCircle, Send } from "lucide-react";
import { useId } from "react";

export interface MessaggioChat {
  autore: "viaggiatore" | "travelops";
  testo: string;
}

interface Proprieta {
  messaggi: readonly MessaggioChat[];
  /** Risposte rapide da toccare invece di scrivere. */
  risposteRapide?: readonly string[] | undefined;
  /** Senza AI la chat mostra un messaggio gentile e il campo è disattivato (REQ-UX-001 §6.4). */
  disponibile?: boolean | undefined;
  /** Il titolo del pannello (diverso se la pagina ne mostra più di uno). */
  titolo?: string | undefined;
}

/**
 * Pannello della chat: bolle del viaggiatore e di TravelOps, risposte rapide come pulsanti e il campo per scrivere.
 * È solo l'aspetto: la chat vera arriva con REQ-CHAT-001.
 */
export function PannelloChat({ messaggi, risposteRapide = [], disponibile = true, titolo = "Chat con TravelOps" }: Proprieta) {
  const id = useId();
  return (
    <section className="ui-chat" aria-labelledby={`${id}-titolo`}>
      <h3 id={`${id}-titolo`} className="ui-chat__titolo">
        <MessageCircle size={18} aria-hidden="true" /> {titolo}
      </h3>
      <ol className="ui-chat__messaggi" aria-label="Messaggi">
        {messaggi.map((messaggio, indice) => (
          <li key={indice} className={`ui-chat__bolla ui-chat__bolla--${messaggio.autore}`}>
            <span className="ui-solo-lettori">{messaggio.autore === "viaggiatore" ? "Tu: " : "TravelOps: "}</span>
            {messaggio.testo}
          </li>
        ))}
      </ol>
      {!disponibile && (
        <p className="ui-chat__non-disponibile" role="status">
          La chat non è disponibile in questo momento: puoi fare tutto anche con i pulsanti.
        </p>
      )}
      {risposteRapide.length > 0 && (
        <div className="ui-chat__rapide" role="group" aria-label="Risposte rapide">
          {risposteRapide.map((risposta) => (
            <button key={risposta} type="button" className="ui-chip" disabled={!disponibile}>
              {risposta}
            </button>
          ))}
        </div>
      )}
      <form className="ui-chat__scrivi" onSubmit={(evento) => evento.preventDefault()}>
        <label className="ui-solo-lettori" htmlFor={`${id}-messaggio`}>
          Scrivi un messaggio
        </label>
        <input
          id={`${id}-messaggio`}
          className="ui-campo__controllo"
          type="text"
          name="messaggio"
          placeholder="Scrivi qui…"
          autoComplete="off"
          disabled={!disponibile}
        />
        <button type="submit" className="ui-pulsante ui-pulsante--primario ui-pulsante--icona" aria-label="Invia" disabled={!disponibile}>
          <Send size={18} aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}
