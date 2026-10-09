import { CalendarCheck, CircleCheck, NotebookPen, Plane } from "lucide-react";
import type { ReactNode } from "react";
import { TESTI_STATO_VIAGGIO, type StatoViaggio } from "../testi-ui";

export type TonoBadge = "neutro" | "primario" | "successo" | "attenzione" | "errore" | "accento";

/** Un'etichetta breve colorata. Il significato è sempre nel testo, mai solo nel colore. */
export function Badge({ tono = "neutro", icona, children }: { tono?: TonoBadge | undefined; icona?: ReactNode; children: ReactNode }) {
  return (
    <span className={`ui-badge ui-badge--${tono}`}>
      {icona !== undefined && (
        <span className="ui-badge__icona" aria-hidden="true">
          {icona}
        </span>
      )}
      {children}
    </span>
  );
}

const ASPETTO_STATO: Readonly<Record<StatoViaggio, { tono: TonoBadge; icona: ReactNode }>> = {
  bozza: { tono: "accento", icona: <NotebookPen size={14} /> },
  confermato: { tono: "primario", icona: <CalendarCheck size={14} /> },
  in_corso: { tono: "successo", icona: <Plane size={14} /> },
  concluso: { tono: "neutro", icona: <CircleCheck size={14} /> },
};

/** Lo stato di un viaggio: Bozza, Confermato, In corso, Concluso. */
export function BadgeStato({ stato }: { stato: StatoViaggio }) {
  const { tono, icona } = ASPETTO_STATO[stato];
  return (
    <span className={`ui-badge ui-badge--${tono}`} data-stato={stato}>
      <span className="ui-badge__icona" aria-hidden="true">
        {icona}
      </span>
      {TESTI_STATO_VIAGGIO[stato]}
    </span>
  );
}
