"use client";

import { Minus, Plus } from "lucide-react";
import { useId, useState } from "react";

/** Singolare e plurale di un'unità, per esempio adulto e adulti. */
export interface Unita {
  singolare: string;
  plurale: string;
}

/** Un numero con la sua unità: "1 adulto", "3 adulti"; senza unità solo il numero. */
export function inParoleConUnita(valore: number, unita: Unita | undefined): string {
  if (unita === undefined) return String(valore);
  return `${valore} ${valore === 1 ? unita.singolare : unita.plurale}`;
}

interface Proprieta {
  etichetta: string;
  min?: number;
  max?: number;
  predefinito?: number;
  /** L'unità, per leggere il valore in parole: per esempio "1 adulto", "2 adulti". */
  unita?: Unita | undefined;
  onCambia?: ((valore: number) => void) | undefined;
}

/**
 * Contatore con i pulsanti − e +: due pulsanti veri (Tab, Invio, Spazio) e il valore annunciato ai lettori di
 * schermo a ogni cambio. Ai limiti il pulsante corrispondente si disattiva.
 */
export function Contatore({ etichetta, min = 0, max = 99, predefinito = min, unita, onCambia }: Proprieta) {
  const id = useId();
  const [valore, setValore] = useState(predefinito);
  const cambia = (nuovo: number): void => {
    const limitato = Math.min(max, Math.max(min, nuovo));
    setValore(limitato);
    onCambia?.(limitato);
  };
  return (
    <div className="ui-contatore" role="group" aria-labelledby={`${id}-etichetta`}>
      <span id={`${id}-etichetta`} className="ui-campo__etichetta">
        {etichetta}
      </span>
      <div className="ui-contatore__controlli">
        <button
          type="button"
          className="ui-contatore__pulsante"
          aria-label={`Togli uno: ${etichetta}`}
          disabled={valore <= min}
          onClick={() => cambia(valore - 1)}
        >
          <Minus size={18} aria-hidden="true" />
        </button>
        <output className="ui-contatore__valore" aria-live="polite" data-valore={valore}>
          {inParoleConUnita(valore, unita)}
        </output>
        <button
          type="button"
          className="ui-contatore__pulsante"
          aria-label={`Aggiungi uno: ${etichetta}`}
          disabled={valore >= max}
          onClick={() => cambia(valore + 1)}
        >
          <Plus size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
