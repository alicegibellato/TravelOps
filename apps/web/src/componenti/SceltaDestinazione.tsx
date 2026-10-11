"use client";

import { MapPin } from "lucide-react";
import { useEffect, useId, useState } from "react";
import {
  ATTESA_RICERCA_MS,
  LUNGHEZZA_MINIMA_RICERCA,
  type EsitoCostruzioneWeb,
  type ServizioDestinazioni,
  type Suggerimento,
} from "../destinazioni/tipi";
import { Avviso } from "../ui/Avviso";
import { Pulsante } from "../ui/Pulsante";
import { AttribuzioniDiDestinazione } from "./Attribuzioni";
import { AvanzamentoCostruzione } from "./AvanzamentoCostruzione";
import { Sorprendimi, type OpzioneMese } from "./Sorprendimi";

type StatoRicerca = "ferma" | "attesa" | "cerco" | "fatta";

/**
 * Il nome accessibile di una destinazione proposta (TB-NEW-D9): il nome visibile seguito dalla descrizione, così due
 * risultati omonimi («Trento» in Italia e nelle Filippine) non suonano uguali a un lettore di schermo. Il nome inizia con
 * il testo visibile del pulsante (WCAG 2.5.3); se la descrizione lo ripete già (Nominatim: «Trento, Provincia…») si usa lei.
 */
export function nomeAccessibileDestinazione({ nome, descrizione }: Pick<Suggerimento, "nome" | "descrizione">): string {
  const dettaglio = descrizione.trim();
  if (dettaglio === "" || dettaglio === nome) return nome;
  return dettaglio.toLowerCase().startsWith(nome.toLowerCase()) ? dettaglio : `${nome}, ${dettaglio}`;
}

interface Proprieta {
  servizio: ServizioDestinazioni;
  mesi: readonly OpzioneMese[];
}

/**
 * La scelta della destinazione (REQ-CAT-002): ricerca con suggerimenti mentre si scrive (si aspettano almeno
 * `ATTESA_RICERCA_MS` millisecondi dall'ultima battuta), costruzione con l'avanzamento, messaggio gentile con le
 * destinazioni vicine quando una è troppo piccola, attribuzioni e Sorprendimi. Tutto passa dal `servizio`: nel
 * browser non c'è nessuna chiamata a servizi esterni.
 */
export function SceltaDestinazione({ servizio, mesi }: Proprieta) {
  const id = useId();
  const [testo, setTesto] = useState("");
  const [suggerimenti, setSuggerimenti] = useState<Suggerimento[]>([]);
  const [stato, setStato] = useState<StatoRicerca>("ferma");
  const [scelta, setScelta] = useState<Suggerimento | null>(null);
  const [esito, setEsito] = useState<EsitoCostruzioneWeb | null>(null);
  const [inCostruzione, setInCostruzione] = useState(false);

  useEffect(() => {
    const cercato = testo.trim();
    if (cercato.length < LUNGHEZZA_MINIMA_RICERCA) {
      setSuggerimenti([]);
      setStato("ferma");
      return;
    }
    let attuale = true;
    setStato("attesa");
    const timer = setTimeout(() => {
      setStato("cerco");
      servizio.cerca(cercato).then(
        (trovati) => {
          if (!attuale) return;
          setSuggerimenti(trovati);
          setStato("fatta");
        },
        () => {
          if (!attuale) return;
          setSuggerimenti([]);
          setStato("fatta");
        },
      );
    }, ATTESA_RICERCA_MS);
    return () => {
      attuale = false;
      clearTimeout(timer);
    };
  }, [testo, servizio]);

  const costruisci = (area: Suggerimento) => {
    setScelta(area);
    setEsito(null);
    setInCostruzione(true);
    servizio.costruisci(area).then(
      (risposta) => {
        setEsito(risposta);
        setInCostruzione(false);
      },
      () => {
        setEsito({ esito: "non_disponibile", messaggio: "Al momento non riesco a preparare questa destinazione. Riprova tra un attimo." });
        setInCostruzione(false);
      },
    );
  };

  return (
    <div className="scelta-destinazione">
      <section aria-labelledby={`${id}-dove`}>
        <h2 id={`${id}-dove`}>Dove vuoi andare?</h2>
        <label className="ui-campo scelta-destinazione__campo">
          <span className="ui-campo__etichetta">Scrivi il nome di una città o di una zona</span>
          <input
            className="ui-campo__controllo"
            type="search"
            name="destinazione"
            autoComplete="off"
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            aria-describedby={`${id}-stato`}
          />
        </label>
        <p id={`${id}-stato`} className="scelta-destinazione__stato" role="status" aria-live="polite">
          {stato === "cerco" && "Cerco…"}
          {stato === "fatta" && suggerimenti.length > 0 && `${suggerimenti.length === 1 ? "Ho trovato 1 destinazione" : `Ho trovato ${suggerimenti.length} destinazioni`}.`}
          {stato === "fatta" && suggerimenti.length === 0 && "Non trovo destinazioni con questo nome. Controlla come l'hai scritto o prova con una città vicina."}
        </p>
        {suggerimenti.length > 0 && (
          <ul className="scelta-destinazione__suggerimenti" aria-label="Destinazioni trovate">
            {suggerimenti.map((suggerimento) => (
              <li key={suggerimento.id}>
                <Pulsante
                  variante="secondario"
                  icona={<MapPin size={18} />}
                  onClick={() => costruisci(suggerimento)}
                  disabled={inCostruzione}
                  aria-label={nomeAccessibileDestinazione(suggerimento)}
                >
                  {suggerimento.nome}
                </Pulsante>
                <span className="scelta-destinazione__descrizione" aria-hidden="true">
                  {suggerimento.descrizione}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {inCostruzione && scelta !== null && (
        <AvanzamentoCostruzione passi={[]} inCorso titolo={`Sto preparando ${scelta.nome}… ci vuole un attimo.`} />
      )}

      {!inCostruzione && esito?.esito === "pronta" && (
        <section className="scelta-destinazione__esito" aria-label="Destinazione pronta" data-esito="pronta">
          <AvanzamentoCostruzione passi={esito.avanzamento} titolo={`Ho fatto tutti i passi per ${esito.destinazione.nome}.`} />
          <Avviso tono="successo" titolo={`${esito.destinazione.nome}: tutto pronto`}>
            Ho trovato {esito.destinazione.luoghi} luoghi e {esito.destinazione.attivita} attività da cui costruire il programma.
          </Avviso>
          <AttribuzioniDiDestinazione attribuzioni={esito.attribuzioni} />
        </section>
      )}

      {!inCostruzione && esito?.esito === "troppo_piccola" && (
        <section className="scelta-destinazione__esito" aria-label="Destinazione troppo piccola" data-esito="troppo-piccola">
          <AvanzamentoCostruzione passi={esito.avanzamento} titolo="Ho controllato che ci fosse tutto." />
          <Avviso tono="info" titolo="Qui c'è poco da fare">
            {esito.messaggio}
          </Avviso>
          {esito.vicine.length > 0 && (
            <>
              <p className="ui-campo__etichetta">Ti suggerisco queste destinazioni vicine, più grandi:</p>
              <ul className="scelta-destinazione__vicine" aria-label="Destinazioni vicine">
                {esito.vicine.map((vicina) => (
                  <li key={vicina.id}>
                    <Pulsante
                      variante="secondario"
                      icona={<MapPin size={18} />}
                      onClick={() => costruisci(vicina)}
                      aria-label={nomeAccessibileDestinazione(vicina)}
                    >
                      {vicina.nome}
                    </Pulsante>
                    <span className="scelta-destinazione__descrizione" aria-hidden="true">
                      {vicina.descrizione}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {!inCostruzione && esito?.esito === "non_disponibile" && (
        <Avviso tono="attenzione" titolo="Non riesco a prepararla">
          {esito.messaggio}
        </Avviso>
      )}

      <Sorprendimi servizio={servizio} mesi={mesi} onScegli={(proposta) => setTesto(proposta.nome)} />
    </div>
  );
}
