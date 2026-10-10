"use client";

import { RefreshCw } from "lucide-react";
import { PulsanteLink, Pulsante } from "../../../src/ui/Pulsante";
import { StatoVuoto } from "../../../src/ui/StatoVuoto";

/** Se la bozza non si apre: cosa è successo, riprovare o tornare ai viaggi. */
export default function BozzaNonDisponibile({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="pagina-vuota" role="alert">
      <StatoVuoto
        livello={1}
        titolo="Non riesco ad aprire la bozza"
        descrizione="Qualcosa è andato storto mentre la preparavo. Le tue modifiche non sono perse: riprova tra un attimo."
        azione={
          <>
            <Pulsante icona={<RefreshCw size={18} />} onClick={reset}>
              Riprova
            </Pulsante>{" "}
            <PulsanteLink href="/" variante="secondario">
              Torna ai miei viaggi
            </PulsanteLink>
          </>
        }
      />
    </section>
  );
}
