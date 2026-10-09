"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { applicaTema, temaCorrente, type SceltaTema } from "./tema";

const SCELTE: readonly { valore: SceltaTema; etichetta: string; icona: LucideIcon }[] = [
  { valore: "sistema", etichetta: "Come il sistema", icona: Monitor },
  { valore: "chiaro", etichetta: "Chiaro", icona: Sun },
  { valore: "scuro", etichetta: "Scuro", icona: Moon },
];

/**
 * Selettore del tema: tre pulsanti di scelta nativi (frecce per cambiare, Tab per uscire). Le icone hanno il nome
 * per i lettori di schermo e il suggerimento al passaggio del mouse.
 */
export function SelettoreTema() {
  const nome = useId();
  const [scelta, setScelta] = useState<SceltaTema>("sistema");
  useEffect(() => setScelta(temaCorrente()), []);
  return (
    <fieldset className="ui-selettore-tema">
      <legend className="ui-solo-lettori">Tema</legend>
      {SCELTE.map(({ valore, etichetta, icona: Icona }) => (
        <label key={valore} className="ui-selettore-tema__voce" title={`Tema: ${etichetta.toLowerCase()}`}>
          <input
            type="radio"
            name={nome}
            value={valore}
            checked={scelta === valore}
            onChange={() => {
              setScelta(valore);
              applicaTema(valore);
            }}
          />
          <Icona size={18} aria-hidden="true" />
          <span className="ui-solo-lettori">{etichetta}</span>
        </label>
      ))}
    </fieldset>
  );
}
