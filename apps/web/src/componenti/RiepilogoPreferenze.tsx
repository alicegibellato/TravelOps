"use client";

import { ChevronDown, Pencil } from "lucide-react";
import { useId, useState } from "react";
import type { NumeroPasso, VoceRiepilogo } from "../preferenze/percorso";
import type { ProblemaProfilo } from "../preferenze/tipi";
import { Avviso } from "../ui/Avviso";

interface Proprieta {
  voci: readonly VoceRiepilogo[];
  problemi: readonly ProblemaProfilo[];
  /** Porta al passo in cui si modifica la voce. */
  onVai: (passo: NumeroPasso) => void;
}

function Chip({ voce, onVai }: { voce: VoceRiepilogo; onVai: (passo: NumeroPasso) => void }) {
  return (
    <li>
      <button
        type="button"
        className="riepilogo__voce"
        data-campo={voce.campo}
        data-mancante={voce.mancante}
        data-predefinita={voce.predefinita}
        aria-label={`${voce.etichetta}: ${voce.valore}, modifica`}
        onClick={() => onVai(voce.passo)}
      >
        <span className="riepilogo__etichetta">{voce.etichetta}</span>
        <span className="riepilogo__valore">{voce.valore}</span>
        <Pencil className="riepilogo__matita" size={14} aria-hidden="true" />
      </button>
    </li>
  );
}

/**
 * Il riepilogo vivo delle preferenze, compatto (ST-UX-003B, CB-1): le scelte fatte sono chip modificabili e le voci
 * lasciate al valore predefinito stanno in un gruppo a parte, che si apre su richiesta. Ogni chip riporta al passo in cui
 * si modifica; sotto, in parole semplici, cosa manca.
 */
export function RiepilogoPreferenze({ voci, problemi, onVai }: Proprieta) {
  const id = useId();
  const [tutte, setTutte] = useState(false);
  const scelte = voci.filter((voce) => !voce.predefinita);
  const predefinite = voci.filter((voce) => voce.predefinita);
  return (
    <aside className="riepilogo" aria-labelledby={`${id}-titolo`}>
      <details open>
        <summary id={`${id}-titolo`} className="riepilogo__titolo">
          Il tuo viaggio finora
        </summary>
        <ul className="riepilogo__voci" aria-label="Le tue scelte">
          {scelte.map((voce) => (
            <Chip key={voce.campo} voce={voce} onVai={onVai} />
          ))}
        </ul>
        {predefinite.length > 0 && (
          <div className="riepilogo__altre">
            <button type="button" className="riepilogo__altre-comando" aria-expanded={tutte} aria-controls={`${id}-predefinite`} onClick={() => setTutte(!tutte)}>
              <ChevronDown size={16} aria-hidden="true" />
              {tutte ? "Nascondi le altre" : `Altre ${predefinite.length} preferenze (predefinite)`}
            </button>
            <ul id={`${id}-predefinite`} className="riepilogo__voci riepilogo__voci--predefinite" aria-label="Preferenze predefinite" hidden={!tutte}>
              {predefinite.map((voce) => (
                <Chip key={voce.campo} voce={voce} onVai={onVai} />
              ))}
            </ul>
          </div>
        )}
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
