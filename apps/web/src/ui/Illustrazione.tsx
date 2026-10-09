import type { LucideIcon } from "lucide-react";
import type { StileViaggio } from "../testi";
import { ICONE_STILI } from "./stili";

interface Proprieta {
  /** Lo stile dà i colori del gradiente e l'icona predefinita. */
  stile?: StileViaggio | undefined;
  /** Icona Lucide al posto di quella dello stile. */
  icona?: LucideIcon | undefined;
  /** `ampia` per le schede dei viaggi, `quadrata` per le attività. */
  forma?: "ampia" | "quadrata" | undefined;
}

/**
 * Illustrazione generata (gradiente e icona) al posto di una fotografia: nessuna immagine senza licenza e nessuna
 * risorsa da scaricare (REQ-UX-001 §6.1). È decorativa: il nome dell'attività o del viaggio è sempre nel testo.
 */
export function Illustrazione({ stile, icona, forma = "ampia" }: Proprieta) {
  const Icona = icona ?? (stile === undefined ? null : ICONE_STILI[stile]);
  return (
    <div className={`ui-illustrazione ui-illustrazione--${forma}`} data-stile={stile} aria-hidden="true">
      <svg className="ui-illustrazione__onde" viewBox="0 0 200 60" preserveAspectRatio="none" focusable="false">
        <path d="M0 40 C 40 20, 80 60, 120 38 S 180 20, 200 34 L 200 60 L 0 60 Z" />
      </svg>
      {Icona !== null && <Icona className="ui-illustrazione__icona" strokeWidth={1.6} />}
    </div>
  );
}
