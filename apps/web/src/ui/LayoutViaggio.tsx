"use client";

import { CalendarDays, ListOrdered, Map as IconaMappa, MessageCircle, PanelLeftClose, PanelLeftOpen, type LucideIcon } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

type Riquadro = "itinerario" | "mappa" | "chat" | "oggi";

const SCHEDE: readonly { riquadro: Riquadro; etichetta: string; icona: LucideIcon }[] = [
  { riquadro: "itinerario", etichetta: "Itinerario", icona: ListOrdered },
  { riquadro: "mappa", etichetta: "Mappa", icona: IconaMappa },
  { riquadro: "chat", etichetta: "Chat", icona: MessageCircle },
  { riquadro: "oggi", etichetta: "Oggi", icona: CalendarDays },
];

interface Proprieta {
  itinerario: ReactNode;
  mappa: ReactNode;
  /** La chat (REQ-CHAT-001): a sinistra su schermo grande, a tutto schermo sul telefono. Senza chat non c'è la colonna. */
  chat?: ReactNode;
  /** La vista "Oggi" (REQ-TODAY-001): solo sul telefono, come scheda in basso. */
  oggi?: ReactNode;
}

/**
 * Layout delle pagine di un viaggio (REQ-UX-001 §6.3).
 * - Schermo grande: chat a sinistra (circa 1/3, si può chiudere), itinerario e mappa a destra.
 * - Telefono: un riquadro alla volta e le schede in basso ("Itinerario", "Mappa", "Chat", "Oggi"); la chat è a
 *   tutto schermo. Le schede sono pulsanti con `aria-pressed`; su schermo grande non si vedono.
 */
export function LayoutViaggio({ itinerario, mappa, chat, oggi }: Proprieta) {
  const id = useId();
  const [attivo, setAttivo] = useState<Riquadro>("itinerario");
  const [chatAperta, setChatAperta] = useState(true);
  const presenti: Record<Riquadro, ReactNode> = { itinerario, mappa, chat, oggi };
  const schede = SCHEDE.filter(({ riquadro }) => presenti[riquadro] !== undefined && presenti[riquadro] !== null);
  const conChat = chat !== undefined && chat !== null;

  return (
    <div className="ui-layout-viaggio" data-chat={conChat ? (chatAperta ? "aperta" : "chiusa") : "assente"} data-attivo={attivo}>
      {conChat && (
        <section id={`${id}-chat`} className="ui-layout-viaggio__chat" aria-label="Chat" data-riquadro="chat" data-attivo={attivo === "chat"}>
          <button type="button" className="ui-pulsante ui-pulsante--testo ui-layout-viaggio__chiudi-chat" aria-controls={`${id}-chat-corpo`} aria-expanded={chatAperta} onClick={() => setChatAperta(!chatAperta)}>
            {chatAperta ? <PanelLeftClose size={18} aria-hidden="true" /> : <PanelLeftOpen size={18} aria-hidden="true" />}
            <span>{chatAperta ? "Chiudi la chat" : "Apri la chat"}</span>
          </button>
          <div id={`${id}-chat-corpo`} className="ui-layout-viaggio__chat-corpo" hidden={!chatAperta}>
            {chat}
          </div>
        </section>
      )}
      <div className="ui-layout-viaggio__principale">
        <div id={`${id}-itinerario`} className="ui-layout-viaggio__riquadro" data-riquadro="itinerario" data-attivo={attivo === "itinerario"}>
          {itinerario}
        </div>
        <div id={`${id}-mappa`} className="ui-layout-viaggio__riquadro" data-riquadro="mappa" data-attivo={attivo === "mappa"}>
          {mappa}
        </div>
        {oggi !== undefined && oggi !== null && (
          <div id={`${id}-oggi`} className="ui-layout-viaggio__riquadro ui-layout-viaggio__oggi" data-riquadro="oggi" data-attivo={attivo === "oggi"}>
            {oggi}
          </div>
        )}
      </div>
      {schede.length > 1 && (
        <nav className="ui-schede-basso" aria-label="Parti del viaggio">
          {schede.map(({ riquadro, etichetta, icona: Icona }) => (
            <button
              key={riquadro}
              type="button"
              className="ui-schede-basso__voce"
              aria-pressed={attivo === riquadro}
              aria-controls={`${id}-${riquadro}`}
              onClick={() => {
                setAttivo(riquadro);
                if (riquadro === "chat") setChatAperta(true);
              }}
            >
              <Icona size={20} aria-hidden="true" />
              <span>{etichetta}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
