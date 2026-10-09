import type { ReactNode } from "react";

/** Una cronologia: le voci una sotto l'altra lungo una linea, dalla più vecchia alla più recente. */
export function Cronologia({ etichetta, children }: { etichetta: string; children: ReactNode }) {
  return (
    <ol className="ui-cronologia" aria-label={etichetta}>
      {children}
    </ol>
  );
}

interface ProprietaVoce {
  /** Quando è successo, in parole, per esempio "sabato 13 giugno 2026 alle 07:30". */
  quando: string;
  titolo: ReactNode;
  /** La voce più recente: ha il punto pieno. */
  attuale?: boolean | undefined;
  /** Attributi `data-*` per le viste e i test. */
  dati?: Readonly<Record<`data-${string}`, string>> | undefined;
  /** I pulsanti della voce (per esempio "Confronta"). */
  azioni?: ReactNode;
  children?: ReactNode;
}

export function VoceCronologia({ quando, titolo, attuale = false, dati, azioni, children }: ProprietaVoce) {
  return (
    <li className={attuale ? "ui-cronologia__voce ui-cronologia__voce--attuale" : "ui-cronologia__voce"} {...dati}>
      <span className="ui-cronologia__punto" aria-hidden="true" />
      <div className="ui-cronologia__corpo">
        <p className="ui-cronologia__quando">{quando}</p>
        <h3 className="ui-cronologia__titolo">{titolo}</h3>
        {children}
        {azioni !== undefined && <div className="ui-cronologia__azioni">{azioni}</div>}
      </div>
    </li>
  );
}
