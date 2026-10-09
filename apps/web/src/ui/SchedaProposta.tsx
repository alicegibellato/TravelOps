import { ArrowRight, ExternalLink, Minus, MoveRight, Plus, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { TESTI_LIVELLI, type LivelloRipianificazione } from "../testi";
import { Badge } from "./Badge";
import { Pulsante } from "./Pulsante";

export type TipoCambio = "rimosso" | "aggiunto" | "spostato";

export interface CambioProposta {
  tipo: TipoCambio;
  /** Che cosa cambia, per esempio "Trekking sul Sentiero del Ponale". */
  testo: string;
  /** Per gli spostamenti: prima e dopo, per esempio "09:00–13:00" e "10:00–12:00". */
  prima?: string | undefined;
  dopo?: string | undefined;
}

const CAMBI: Readonly<Record<TipoCambio, { etichetta: string; icona: ReactNode }>> = {
  rimosso: { etichetta: "Tolto", icona: <Minus size={16} /> },
  aggiunto: { etichetta: "Aggiunto", icona: <Plus size={16} /> },
  spostato: { etichetta: "Spostato", icona: <MoveRight size={16} /> },
};

interface Proprieta {
  /** In parole semplici, per esempio "Pioggia sabato mattina: ti propongo il MAG al posto del trekking". */
  titolo: string;
  livello: LivelloRipianificazione;
  cambi: readonly CambioProposta[];
  /** Un avviso chiaro sugli elementi a rischio. */
  avviso?: string | undefined;
  alternative?: readonly { etichetta: string; indirizzo: string }[] | undefined;
  /** Accetta e Rifiuta: se mancano, due pulsanti senza azione (per la pagina /stile). */
  azioni?: ReactNode;
}

/**
 * Scheda di una proposta: titolo in parole semplici, livello di ripianificazione, cambi "prima → dopo" (tolti
 * barrati in rosso, aggiunti in verde, spostati in giallo, sempre anche con la parola), avviso, alternative come link
 * e i pulsanti Accetta e Rifiuta.
 */
export function SchedaProposta({ titolo, livello, cambi, avviso, alternative = [], azioni }: Proprieta) {
  return (
    <article className="ui-proposta">
      <div className="ui-proposta__testa">
        <h3 className="ui-proposta__titolo">{titolo}</h3>
        <Badge tono="primario">{TESTI_LIVELLI[livello]}</Badge>
      </div>
      <ul className="ui-proposta__cambi">
        {cambi.map((cambio, indice) => (
          <li key={indice} className={`ui-proposta__cambio ui-proposta__cambio--${cambio.tipo}`}>
            <span className="ui-proposta__tipo">
              <span aria-hidden="true">{CAMBI[cambio.tipo].icona}</span>
              {CAMBI[cambio.tipo].etichetta}
            </span>
            <span className="ui-proposta__testo">{cambio.testo}</span>
            {cambio.prima !== undefined && cambio.dopo !== undefined && (
              <span className="ui-proposta__prima-dopo">
                <span className="ui-proposta__prima">{cambio.prima}</span>
                <ArrowRight size={14} aria-label="diventa" role="img" />
                <span className="ui-proposta__dopo">{cambio.dopo}</span>
              </span>
            )}
          </li>
        ))}
      </ul>
      {avviso !== undefined && (
        <p className="ui-proposta__avviso">
          <TriangleAlert size={18} aria-hidden="true" />
          <span>{avviso}</span>
        </p>
      )}
      {alternative.length > 0 && (
        <ul className="ui-proposta__alternative">
          {alternative.map((alternativa) => (
            <li key={alternativa.indirizzo}>
              <a className="ui-pulsante ui-pulsante--secondario" href={alternativa.indirizzo} target="_blank" rel="noopener noreferrer">
                <span>{alternativa.etichetta}</span>
                <ExternalLink size={16} aria-label="(si apre in una nuova scheda)" role="img" />
              </a>
            </li>
          ))}
        </ul>
      )}
      <div className="ui-proposta__azioni">
        {azioni ?? (
          <>
            <Pulsante variante="primario">Accetta</Pulsante>
            <Pulsante variante="secondario">Rifiuta</Pulsante>
          </>
        )}
      </div>
    </article>
  );
}
