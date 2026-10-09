"use client";

import { Check } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { StileViaggio } from "../testi";
import { ICONE_STILI } from "./stili";

interface Proprieta {
  etichetta: string;
  /** Lo stile di viaggio dà colore e icona al chip. */
  stile?: StileViaggio;
  /** Se indicato, il chip è controllato da chi lo usa. */
  selezionato?: boolean;
  predefinito?: boolean;
  onCambia?: (selezionato: boolean) => void;
}

/**
 * Chip selezionabile: un pulsante con `aria-pressed`, quindi si usa con Tab, Invio e Spazio e il lettore di schermo
 * annuncia se è scelto. Il segno di spunta rende la scelta visibile anche senza colore.
 */
export function ChipSelezionabile({ etichetta, stile, selezionato, predefinito = false, onCambia }: Proprieta) {
  const [interno, setInterno] = useState(predefinito);
  const attivo = selezionato ?? interno;
  const Icona = stile === undefined ? null : ICONE_STILI[stile];
  return (
    <button
      type="button"
      className="ui-chip"
      aria-pressed={attivo}
      data-stile={stile}
      onClick={() => {
        setInterno(!attivo);
        onCambia?.(!attivo);
      }}
    >
      <span className="ui-chip__icona" aria-hidden="true">
        {attivo ? <Check size={16} /> : Icona !== null ? <Icona size={16} /> : null}
      </span>
      {etichetta}
    </button>
  );
}

/** Un gruppo di chip con il suo nome per i lettori di schermo. */
export function GruppoChip({ etichetta, children }: { etichetta: string; children: ReactNode }) {
  return (
    <div className="ui-gruppo-chip" role="group" aria-label={etichetta}>
      {children}
    </div>
  );
}
