"use client";

import { Slider as SliderRadix } from "radix-ui";
import { useId, useState } from "react";
import { inParoleConUnita, type Unita } from "./Contatore";

interface Proprieta {
  etichetta: string;
  min: number;
  max: number;
  passo?: number;
  predefinito: number;
  /** L'unità, per leggere il valore in parole: per esempio "3 attività al giorno". */
  unita?: Unita | undefined;
  onCambia?: ((valore: number) => void) | undefined;
}

/**
 * Slider accessibile (Radix UI): si sposta con le frecce, Pagina su/giù, Inizio e Fine; il lettore di schermo legge
 * il valore in parole (`aria-valuetext`).
 */
export function Cursore({ etichetta, min, max, passo = 1, predefinito, unita, onCambia }: Proprieta) {
  const testo = (valore: number): string => inParoleConUnita(valore, unita);
  const id = useId();
  const [valore, setValore] = useState(predefinito);
  return (
    <div className="ui-cursore">
      <div className="ui-cursore__testa">
        <span id={`${id}-etichetta`} className="ui-campo__etichetta">
          {etichetta}
        </span>
        <output className="ui-cursore__valore" htmlFor={`${id}-cursore`}>
          {testo(valore)}
        </output>
      </div>
      <SliderRadix.Root
        className="ui-cursore__radice"
        min={min}
        max={max}
        step={passo}
        value={[valore]}
        onValueChange={([nuovo]) => {
          if (nuovo === undefined) return;
          setValore(nuovo);
          onCambia?.(nuovo);
        }}
      >
        <SliderRadix.Track className="ui-cursore__binario">
          <SliderRadix.Range className="ui-cursore__intervallo" />
        </SliderRadix.Track>
        <SliderRadix.Thumb id={`${id}-cursore`} className="ui-cursore__pomello" aria-labelledby={`${id}-etichetta`} aria-valuetext={testo(valore)} />
      </SliderRadix.Root>
    </div>
  );
}
