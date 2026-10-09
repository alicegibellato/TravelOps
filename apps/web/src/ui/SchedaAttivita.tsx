import { Building, Clock, Euro, Hourglass, Trees } from "lucide-react";
import type { ReactNode } from "react";
import { TESTI_STILI, type StileViaggio } from "../testi";
import { Illustrazione } from "./Illustrazione";

export interface DatiSchedaAttivita {
  nome: string;
  /** Per esempio "10:00–12:00". */
  orario?: string | undefined;
  /** Per esempio "2 h". */
  durata?: string | undefined;
  stile?: StileViaggio | undefined;
  /** Per esempio "€", "€€" o "Gratis". */
  costo?: string | undefined;
  /** `true` all'aperto, `false` al coperto; senza valore non si mostra. */
  allAperto?: boolean | undefined;
  descrizione?: string | undefined;
}

/**
 * Scheda di un'attività: illustrazione, nome, orario, durata, stile colorato, costo e icona all'aperto o al
 * coperto. Le azioni (per esempio "Dettagli") si passano come figli.
 */
export function SchedaAttivita({
  nome,
  orario,
  durata,
  stile,
  costo,
  allAperto,
  descrizione,
  evidenziata = false,
  children,
}: DatiSchedaAttivita & { evidenziata?: boolean; children?: ReactNode }) {
  return (
    <article className="ui-scheda-attivita" data-stile={stile} data-evidenziata={evidenziata ? "si" : undefined}>
      <Illustrazione stile={stile} forma="quadrata" />
      <div className="ui-scheda-attivita__corpo">
        <h3 className="ui-scheda-attivita__nome">{nome}</h3>
        <ul className="ui-scheda-attivita__dati">
          {orario !== undefined && (
            <li>
              <Clock size={16} aria-hidden="true" />
              <span>{orario}</span>
            </li>
          )}
          {durata !== undefined && (
            <li>
              <Hourglass size={16} aria-hidden="true" />
              <span>{durata}</span>
            </li>
          )}
          {costo !== undefined && (
            <li>
              <Euro size={16} aria-hidden="true" />
              <span>{costo}</span>
            </li>
          )}
          {allAperto !== undefined && (
            <li>
              {allAperto ? <Trees size={16} aria-hidden="true" /> : <Building size={16} aria-hidden="true" />}
              <span>{allAperto ? "All'aperto" : "Al coperto"}</span>
            </li>
          )}
        </ul>
        {descrizione !== undefined && <p className="ui-scheda-attivita__descrizione">{descrizione}</p>}
        {stile !== undefined && (
          <span className="ui-badge ui-badge--stile" data-stile={stile}>
            {TESTI_STILI[stile]}
          </span>
        )}
        {children}
      </div>
    </article>
  );
}
