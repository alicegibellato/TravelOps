import { Badge } from "../ui/Badge";
import { TESTI_STILI } from "../testi";
import type { DettaglioElemento } from "../viste/elemento";
import { AttribuzioniDettaglio } from "./Attribuzioni";
import { RiepilogoPrenotazione } from "./GestisciPrenotazione";

/**
 * Il dettaglio di un elemento nel pannello: descrizione, luogo, orari di apertura in parole e, se c'è il link, il
 * pulsante "Gestisci prenotazione". Gli spostamenti mostrano partenza, arrivo e mezzo. REQ-WEB-003, CA-4.
 */
export function ContenutoPannello({ dettaglio }: { dettaglio: DettaglioElemento }) {
  const { attivita, tratta } = dettaglio;
  const quando = dettaglio.durata === null ? dettaglio.orario : `${dettaglio.orario} (${dettaglio.durata})`;
  return (
    <div className="dettaglio-pannello" data-dettaglio-tipo={dettaglio.tipo}>
      {attivita !== null && (
        <>
          <p className="dettaglio-pannello__descrizione">{attivita.descrizione}</p>
          <div className="dettaglio-pannello__etichette">
            <span className="ui-badge ui-badge--stile" data-stile={attivita.stile}>
              {TESTI_STILI[attivita.stile]}
            </span>
            <Badge tono="neutro">{attivita.ambiente}</Badge>
          </div>
          <dl className="campi">
            <div className="campo">
              <dt>Quando</dt>
              <dd>
                {quando}
              </dd>
            </div>
            <div className="campo">
              <dt>Luogo</dt>
              <dd>{attivita.luogo.zona === "" ? attivita.luogo.nome : `${attivita.luogo.nome}, ${attivita.luogo.zona}`}</dd>
            </div>
            {attivita.costo !== null && (
              <div className="campo">
                <dt>Costo</dt>
                <dd>{attivita.costo}</dd>
              </div>
            )}
          </dl>
          {attivita.orariApertura !== null && (
            <section className="dettaglio-pannello__orari" aria-label="Orari di apertura">
              <h3>Orari di apertura</h3>
              <p>{attivita.orariApertura.testo}</p>
            </section>
          )}
          <AttribuzioniDettaglio attribuzioni={attivita.attribuzioni} />
        </>
      )}
      {tratta !== null && (
        <dl className="campi">
          <div className="campo">
            <dt>Quando</dt>
            <dd>
              {quando}
            </dd>
          </div>
          <div className="campo">
            <dt>Da</dt>
            <dd>{tratta.partenza}</dd>
          </div>
          <div className="campo">
            <dt>A</dt>
            <dd>{tratta.arrivo}</dd>
          </div>
          <div className="campo">
            <dt>Mezzo</dt>
            <dd>{tratta.mezzo}</dd>
          </div>
        </dl>
      )}
      <RiepilogoPrenotazione prenotazione={dettaglio.prenotazione} />
    </div>
  );
}
