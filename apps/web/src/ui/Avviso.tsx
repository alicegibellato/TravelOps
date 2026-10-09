import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type TonoAvviso = "info" | "successo" | "attenzione" | "errore";

const ICONE: Readonly<Record<TonoAvviso, LucideIcon>> = {
  info: Info,
  successo: CircleCheck,
  attenzione: TriangleAlert,
  errore: CircleAlert,
};

interface Proprieta {
  tono?: TonoAvviso | undefined;
  titolo?: string | undefined;
  children: ReactNode;
  /** Cosa fare (un pulsante o un link): ogni errore dice come uscirne (REQ-UX-001 §6.4). */
  azione?: ReactNode;
  /** Attributi `data-*` per i test e le viste (per esempio `data-livello`). */
  dati?: Readonly<Record<`data-${string}`, string>> | undefined;
}

/**
 * Avviso in linea: icona, titolo facoltativo, testo e azione. Gli errori e gli avvisi sono annunciati subito ai
 * lettori di schermo (`role="alert"`), le informazioni e le conferme con garbo (`role="status"`).
 */
export function Avviso({ tono = "info", titolo, children, azione, dati }: Proprieta) {
  const Icona = ICONE[tono];
  return (
    <div className={`ui-avviso ui-avviso--${tono}`} role={tono === "errore" || tono === "attenzione" ? "alert" : "status"} {...dati}>
      <Icona className="ui-avviso__icona" size={20} aria-hidden="true" />
      <div className="ui-avviso__corpo">
        {titolo !== undefined && <p className="ui-avviso__titolo">{titolo}</p>}
        <div className="ui-avviso__testo">{children}</div>
        {azione !== undefined && <div className="ui-avviso__azione">{azione}</div>}
      </div>
    </div>
  );
}
