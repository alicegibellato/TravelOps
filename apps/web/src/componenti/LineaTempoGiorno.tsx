"use client";

import { LineaTempo, type VoceLineaTempo } from "../ui/LineaTempo";
import { useEvidenziazione } from "./Evidenziazione";

/** La linea del tempo del giorno collegata all'evidenziazione condivisa con la mappa. */
export function LineaTempoGiorno({ voci, etichetta }: { voci: readonly VoceLineaTempo[]; etichetta: string }) {
  const { evidenziato, evidenzia } = useEvidenziazione();
  return <LineaTempo voci={voci} etichetta={etichetta} evidenziato={evidenziato} onEvidenzia={evidenzia} />;
}
