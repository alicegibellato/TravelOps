"use client";

import type { IndicatoreMappa } from "../viste/mappa";
import { useEvidenziazione } from "./Evidenziazione";

/**
 * La legenda delle attività numerate sulla mappa: una voce per ogni indicatore. Si accende insieme alla scheda e al
 * punto sulla mappa (REQ-WEB-003, CA-3).
 */
export function LegendaMappa({ indicatori }: { indicatori: readonly IndicatoreMappa[] }) {
  const { evidenziato, evidenzia } = useEvidenziazione();
  return (
    <ol className="legenda" aria-label="Attività sulla mappa">
      {indicatori.map((indicatore) => (
        <li
          key={indicatore.elementoId}
          data-elemento={indicatore.elementoId}
          data-evidenziata={evidenziato === indicatore.elementoId ? "si" : undefined}
          onMouseEnter={() => evidenzia(indicatore.elementoId)}
          onMouseLeave={() => evidenzia(null)}
          onClick={() => evidenzia(indicatore.elementoId)}
        >
          <span className="indicatore indicatore--legenda" aria-hidden="true">
            <span>{indicatore.numero}</span>
          </span>
          <span>
            {indicatore.attivita} <span className="assente">· {indicatore.orario} · {indicatore.nome}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
