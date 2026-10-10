"use client";

import { useId } from "react";
import type { VoceRiepilogo } from "../preferenze/percorso";
import type { NumeroPasso } from "../preferenze/percorso";
import type { ProblemaProfilo } from "../preferenze/tipi";
import { Avviso } from "../ui/Avviso";

interface Proprieta {
  voci: readonly VoceRiepilogo[];
  problemi: readonly ProblemaProfilo[];
  /** Porta al passo in cui si modifica la voce. */
  onVai: (passo: NumeroPasso) => void;
}

/**
 * Il riepilogo vivo delle preferenze: a lato su schermo largo, in alto e comprimibile su telefono. Ogni voce è un
 * pulsante che riporta al passo in cui si modifica; sotto, in parole semplici, cosa manca.
 */
export function RiepilogoPreferenze({ voci, problemi, onVai }: Proprieta) {
  const id = useId();
  return (
    <aside className="riepilogo" aria-labelledby={`${id}-titolo`}>
      <details open>
        <summary id={`${id}-titolo`} className="riepilogo__titolo">
          Il tuo viaggio finora
        </summary>
        <ul className="riepilogo__voci">
          {voci.map((voce) => (
            <li key={voce.campo}>
              <button type="button" className="riepilogo__voce" data-campo={voce.campo} data-mancante={voce.mancante} onClick={() => onVai(voce.passo)}>
                <span className="riepilogo__etichetta">{voce.etichetta}</span>
                <span className="riepilogo__valore">{voce.valore}</span>
                <span className="ui-solo-lettori">: modifica</span>
              </button>
            </li>
          ))}
        </ul>
        {problemi.length > 0 && (
          <Avviso tono="info" titolo="Cosa manca">
            <ul className="riepilogo__mancano">
              {problemi.map((problema) => (
                <li key={`${problema.campo}-${problema.testo}`}>{problema.testo}</li>
              ))}
            </ul>
          </Avviso>
        )}
      </details>
    </aside>
  );
}
