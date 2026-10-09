"use client";

import { Sparkles } from "lucide-react";
import { ChiudiFinestra, FinestraModale } from "../ui/Finestra";
import { Pulsante } from "../ui/Pulsante";

/**
 * Il pulsante principale della home. La pianificazione guidata arriva con REQ-PREF-001: per ora apre una finestra
 * che lo dice in modo gentile e invita a esplorare i viaggi già pronti.
 */
export function PianificaViaggio() {
  return (
    <FinestraModale
      titolo="Pianifica un viaggio"
      descrizione="Presto potrai raccontarmi il viaggio che hai in mente, con i pulsanti o in chat, e preparerò io la prima bozza."
      attivatore={
        <Pulsante variante="primario" dimensione="grande" icona={<Sparkles size={20} />}>
          Pianifica un viaggio
        </Pulsante>
      }
      azioni={
        <ChiudiFinestra>
          <Pulsante variante="primario">Esplora i viaggi pronti</Pulsante>
        </ChiudiFinestra>
      }
    >
      <p>Intanto puoi aprire il weekend sul Garda qui sotto: giorno per giorno, con la mappa e le proposte per gli imprevisti.</p>
    </FinestraModale>
  );
}
