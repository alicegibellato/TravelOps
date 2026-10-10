import { percorsoProposta } from "../percorsi";
import { Avviso } from "../ui/Avviso";
import { PulsanteLink } from "../ui/Pulsante";

/** Una notifica del monitoraggio come la vede il viaggiatore (REQ-MONITOR-001, CA-3). */
export interface NotificaVista {
  id: number;
  testo: string;
  /** Numero della proposta di ripianificazione da aprire. */
  proposta: number;
}

/**
 * Le notifiche del monitoraggio nella pagina Oggi: ogni imprevisto nuovo con il link alla sua proposta. Senza notifiche
 * non si mostra niente (nessun banner vuoto).
 */
export function NotificheMonitoraggio({ notifiche }: { notifiche: readonly NotificaVista[] }) {
  if (notifiche.length === 0) return null;
  return (
    <section className="oggi-notifiche" aria-label="Nuovi imprevisti" data-notifiche={notifiche.length}>
      {notifiche.map((n) => (
        <Avviso
          key={n.id}
          tono="attenzione"
          dati={{ "data-notifica": String(n.id), "data-proposta": String(n.proposta) }}
          azione={
            <PulsanteLink href={percorsoProposta(n.proposta)} variante="secondario">
              Vedi la proposta
            </PulsanteLink>
          }
        >
          {n.testo}
        </Avviso>
      ))}
    </section>
  );
}
