import type { ReactNode } from "react";

/**
 * I pulsanti di una decisione (per esempio Accetta e Rifiuta). Sul telefono stanno in una barra fissa in basso, sempre
 * raggiungibili senza scorrere; sugli schermi larghi seguono il contenuto della pagina.
 */
export function BarraDecisione({ etichetta, children }: { etichetta: string; children: ReactNode }) {
  return (
    <div className="ui-barra-decisione" role="group" aria-label={etichetta}>
      {children}
    </div>
  );
}
