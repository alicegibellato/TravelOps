"use client";

import { CircleCheck, Info, X } from "lucide-react";
import { Toast } from "radix-ui";
import { useState, type ReactNode } from "react";
import { Pulsante } from "./Pulsante";

/** Il contenitore delle notifiche brevi: va messo una volta attorno alla parte di pagina che le usa. */
export function ProviderNotifiche({ children, etichetta = "Notifiche" }: { children: ReactNode; etichetta?: string }) {
  return (
    <Toast.Provider label="Notifica" swipeDirection="down" duration={5000}>
      {children}
      {/* La regione delle notifiche ha un nome in italiano; F8 la raggiunge da tastiera. */}
      <Toast.Viewport className="ui-notifiche" label={`${etichetta} (F8)`} />
    </Toast.Provider>
  );
}

interface Proprieta {
  aperta: boolean;
  onCambia: (aperta: boolean) => void;
  titolo: string;
  descrizione?: string | undefined;
  tono?: "info" | "successo" | undefined;
  /** Per esempio "Annulla": ogni azione importante si può annullare (REQ-UX-001 §6.4). */
  azione?: { etichetta: string; alternativa: string; onAzione: () => void } | undefined;
}

/**
 * Notifica breve (toast, Radix UI): riscontro di un'azione, annunciato ai lettori di schermo, chiudibile e con
 * un'azione facoltativa. Sparisce da sola dopo qualche secondo (F8 la raggiunge da tastiera).
 */
export function Notifica({ aperta, onCambia, titolo, descrizione, tono = "successo", azione }: Proprieta) {
  const Icona = tono === "successo" ? CircleCheck : Info;
  return (
    <Toast.Root className={`ui-notifica ui-notifica--${tono}`} open={aperta} onOpenChange={onCambia}>
      <Icona className="ui-notifica__icona" size={20} aria-hidden="true" />
      <div className="ui-notifica__corpo">
        <Toast.Title className="ui-notifica__titolo">{titolo}</Toast.Title>
        {descrizione !== undefined && <Toast.Description className="ui-notifica__descrizione">{descrizione}</Toast.Description>}
      </div>
      {azione !== undefined && (
        <Toast.Action asChild altText={azione.alternativa}>
          <button type="button" className="ui-pulsante ui-pulsante--testo" onClick={azione.onAzione}>
            {azione.etichetta}
          </button>
        </Toast.Action>
      )}
      <Toast.Close className="ui-pulsante ui-pulsante--testo ui-pulsante--icona" aria-label="Chiudi la notifica">
        <X size={18} aria-hidden="true" />
      </Toast.Close>
    </Toast.Root>
  );
}

/** Esempio per la pagina /stile: un pulsante che mostra una notifica con "Annulla". */
export function EsempioNotifica({ etichetta = "Notifiche" }: { etichetta?: string }) {
  const [aperta, setAperta] = useState(false);
  return (
    <ProviderNotifiche etichetta={etichetta}>
      <Pulsante variante="secondario" onClick={() => setAperta(true)}>
        Mostra una notifica
      </Pulsante>
      <Notifica
        aperta={aperta}
        onCambia={setAperta}
        titolo="Ho sostituito il trekking con la visita al MAG"
        descrizione="Il nuovo programma di sabato è pronto."
        azione={{ etichetta: "Annulla", alternativa: "Annulla la sostituzione", onAzione: () => setAperta(false) }}
      />
    </ProviderNotifiche>
  );
}
