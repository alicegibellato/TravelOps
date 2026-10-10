"use client";

import { MessageCircle, Send } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Avviso } from "./Avviso";
import { Pulsante } from "./Pulsante";
import { Scheletro } from "./Scheletro";

export interface MessaggioChat {
  autore: "viaggiatore" | "travelops";
  testo: string;
  /** Una scheda ricca (preferenze, bozza, proposta, conferma) sotto il testo. */
  scheda?: ReactNode;
}

export interface BenvenutoChat {
  testo: string;
  /** I suggerimenti da toccare per cominciare: inviano il loro testo. */
  suggerimenti: readonly string[];
}

export interface ErroreChat {
  testo: string;
  /** Se c'è, l'avviso ha il pulsante "Riprova". */
  onRiprova?: (() => void) | undefined;
}

interface Proprieta {
  messaggi: readonly MessaggioChat[];
  /** Risposte rapide da toccare invece di scrivere: con `onInvia` inviano il loro testo. */
  risposteRapide?: readonly string[] | undefined;
  /** Senza AI la chat mostra un messaggio gentile e il campo è disattivato (REQ-UX-001 §6.4). */
  disponibile?: boolean | undefined;
  /** Il titolo del pannello (diverso se la pagina ne mostra più di uno). */
  titolo?: string | undefined;
  /** Mostra "sta scrivendo" in coda ai messaggi. */
  inScrittura?: boolean | undefined;
  /** Mostra lo scheletro al posto dei messaggi, mentre la chat si prepara. */
  caricamento?: boolean | undefined;
  /** Il benvenuto con i suggerimenti, finché la conversazione è vuota. */
  benvenuto?: BenvenutoChat | undefined;
  /**
   * La risposta mentre si forma (con gli agenti): il testo arrivato finora e il passo in corso ("Preparo la bozza…"),
   * mostrati nella bolla di "sta scrivendo".
   */
  inCorso?: { testo: string; passo: string | null } | undefined;
  /** Un errore della richiesta: avviso con cosa fare. */
  errore?: ErroreChat | undefined;
  /** Chiamata con il testo scritto o toccato. Senza, il pannello è solo l'aspetto. */
  onInvia?: ((testo: string) => void) | undefined;
}

/**
 * Pannello della chat: bolle del viaggiatore e di TravelOps (con le schede ricche), "sta scrivendo", benvenuto con
 * suggerimenti, risposte rapide come pulsanti, stati di caricamento, errore e AI non disponibile, e il campo per
 * scrivere. È solo l'aspetto: le risposte le decide chi lo usa (`src/chat`). Sul telefono occupa lo schermo e segue
 * l'area visibile, così la tastiera non copre il campo.
 */
/**
 * Il testo di un messaggio: gli a capo restano (CSS) e il grassetto scritto come `**parola**` (come lo scrivono i
 * modelli linguistici) si mostra in grassetto invece che con gli asterischi. Nient'altro: nessun HTML dal testo.
 */
export function TestoMessaggio({ testo }: { testo: string }) {
  const parti = testo.split(/\*\*(.+?)\*\*/g);
  return <span className="ui-chat__testo">{parti.map((parte, i) => (i % 2 === 1 ? <strong key={i}>{parte}</strong> : parte))}</span>;
}

export function PannelloChat({
  messaggi,
  risposteRapide = [],
  disponibile = true,
  titolo = "Chat con TravelOps",
  inScrittura = false,
  caricamento = false,
  benvenuto,
  inCorso,
  errore,
  onInvia,
}: Proprieta) {
  const id = useId();
  const [testo, setTesto] = useState("");
  const radice = useRef<HTMLElement>(null);
  const corpo = useRef<HTMLDivElement>(null);
  const occupato = inScrittura || caricamento;
  const vuoto = messaggi.length === 0 && benvenuto === undefined && !caricamento;

  // In fondo ai messaggi: l'ultimo messaggio, "sta scrivendo" o l'errore restano sempre in vista.
  useEffect(() => {
    const area = corpo.current;
    if (area !== null) area.scrollTop = area.scrollHeight;
  }, [messaggi.length, inScrittura, errore, caricamento, inCorso?.testo, inCorso?.passo]);

  // Con la tastiera aperta (telefono) l'area visibile si accorcia: il pannello la segue e il campo resta in vista.
  useEffect(() => {
    // Le misure vanno sul contenitore a tutto schermo del layout (o sul pannello, fuori dal layout).
    const area = radice.current?.closest<HTMLElement>(".ui-layout-viaggio__chat") ?? radice.current;
    const visibile = typeof window === "undefined" ? undefined : window.visualViewport ?? undefined;
    if (area === null || visibile === undefined) return;
    const aggiorna = () => {
      area.style.setProperty("--altezza-visibile", `${visibile.height}px`);
      area.style.setProperty("--scostamento-visibile", `${visibile.offsetTop}px`);
    };
    aggiorna();
    visibile.addEventListener("resize", aggiorna);
    visibile.addEventListener("scroll", aggiorna);
    return () => {
      visibile.removeEventListener("resize", aggiorna);
      visibile.removeEventListener("scroll", aggiorna);
      area.style.removeProperty("--altezza-visibile");
      area.style.removeProperty("--scostamento-visibile");
    };
  }, []);

  const invia = (valore: string) => {
    const pulito = valore.trim();
    if (pulito === "" || occupato || !disponibile) return;
    onInvia?.(pulito);
  };

  return (
    <section ref={radice} className="ui-chat" aria-labelledby={`${id}-titolo`} aria-busy={occupato}>
      <h2 id={`${id}-titolo`} className="ui-chat__titolo">
        <MessageCircle size={18} aria-hidden="true" /> {titolo}
      </h2>
      <div ref={corpo} className="ui-chat__corpo" role="log" aria-label="Conversazione" aria-live="polite" tabIndex={0}>
        {caricamento && <Scheletro righe={2} conImmagine={false} testo="Sto aprendo la chat…" />}
        {!caricamento && benvenuto !== undefined && (
          <div className="ui-chat__benvenuto">
            <p className="ui-chat__bolla ui-chat__bolla--travelops">
              <span className="ui-solo-lettori">TravelOps: </span>
              {benvenuto.testo}
            </p>
            {messaggi.length === 0 && benvenuto.suggerimenti.length > 0 && (
              <div className="ui-chat__rapide" role="group" aria-label="Suggerimenti per cominciare">
                {benvenuto.suggerimenti.map((suggerimento) => (
                  <button key={suggerimento} type="button" className="ui-chip" disabled={!disponibile || occupato} onClick={() => invia(suggerimento)}>
                    {suggerimento}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {vuoto && <p className="ui-chat__vuoto">Nessun messaggio per ora: scrivimi qui sotto e ti rispondo.</p>}
        {(messaggi.length > 0 || inScrittura) && (
          <ol className="ui-chat__messaggi" aria-label="Messaggi">
            {messaggi.map((messaggio, indice) => (
              <li
                key={indice}
                className={`ui-chat__bolla ui-chat__bolla--${messaggio.autore}${messaggio.scheda === undefined ? "" : " ui-chat__bolla--con-scheda"}`}
              >
                <span className="ui-solo-lettori">{messaggio.autore === "viaggiatore" ? "Tu: " : "TravelOps: "}</span>
                <TestoMessaggio testo={messaggio.testo} />
                {messaggio.scheda}
              </li>
            ))}
            {inScrittura && (
              <li className="ui-chat__bolla ui-chat__bolla--travelops ui-chat__scrive">
                {inCorso !== undefined && inCorso.testo !== "" && (
                  <span className="ui-chat__in-corso">
                    <TestoMessaggio testo={inCorso.testo} />
                  </span>
                )}
                {inCorso?.passo != null ? (
                  <span className="ui-chat__passo" role="status">
                    {inCorso.passo}
                  </span>
                ) : (
                  <span className="ui-solo-lettori" role="status">
                    TravelOps sta scrivendo…
                  </span>
                )}
                <span className="ui-chat__punti" aria-hidden="true">
                  <span className="ui-chat__punto" />
                  <span className="ui-chat__punto" />
                  <span className="ui-chat__punto" />
                </span>
              </li>
            )}
          </ol>
        )}
      </div>
      {errore !== undefined && (
        <Avviso
          tono="errore"
          titolo="Non sono riuscito a rispondere"
          azione={
            errore.onRiprova === undefined ? undefined : (
              <Pulsante variante="secondario" onClick={errore.onRiprova}>
                Riprova
              </Pulsante>
            )
          }
        >
          {errore.testo}
        </Avviso>
      )}
      {!disponibile && (
        <p className="ui-chat__non-disponibile" role="status">
          La chat non è disponibile in questo momento: puoi fare tutto anche con i pulsanti.
        </p>
      )}
      {risposteRapide.length > 0 && (
        <div className="ui-chat__rapide" role="group" aria-label="Risposte rapide">
          {risposteRapide.map((risposta) => (
            <button key={risposta} type="button" className="ui-chip" disabled={!disponibile || occupato} onClick={() => invia(risposta)}>
              {risposta}
            </button>
          ))}
        </div>
      )}
      <form
        className="ui-chat__scrivi"
        onSubmit={(evento) => {
          evento.preventDefault();
          if (onInvia === undefined) return;
          invia(testo);
          if (testo.trim() !== "" && !occupato && disponibile) setTesto("");
        }}
      >
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
          enterKeyHint="send"
          value={testo}
          onChange={(evento) => setTesto(evento.target.value)}
          onFocus={(evento) => evento.currentTarget.scrollIntoView?.({ block: "nearest" })}
          disabled={!disponibile}
        />
        <button type="submit" className="ui-pulsante ui-pulsante--primario ui-pulsante--icona" aria-label="Invia" disabled={!disponibile || occupato}>
          <Send size={18} aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}
