"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface Valore {
  /** L'elemento del giorno evidenziato, sulla linea del tempo e sulla mappa; `null` se nessuno. */
  evidenziato: string | null;
  evidenzia: (elementoId: string | null) => void;
}

const SENZA_EVIDENZIAZIONE: Valore = { evidenziato: null, evidenzia: () => undefined };

const Contesto = createContext<Valore>(SENZA_EVIDENZIAZIONE);

/**
 * Tiene l'elemento evidenziato di un giorno: la scheda sulla linea del tempo e il punto sulla mappa (o la voce della
 * legenda) si accendono insieme al passaggio del mouse, al focus e al tocco (REQ-WEB-003, CA-3). Fuori da questo
 * contenitore le parti della pagina restano semplicemente spente.
 */
export function EvidenziazioneGiorno({ children }: { children: ReactNode }) {
  const [evidenziato, evidenzia] = useState<string | null>(null);
  const valore = useMemo(() => ({ evidenziato, evidenzia }), [evidenziato]);
  return <Contesto.Provider value={valore}>{children}</Contesto.Provider>;
}

export function useEvidenziazione(): Valore {
  return useContext(Contesto);
}
