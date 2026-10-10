"use client";

import { RotateCcw } from "lucide-react";
import { Avviso } from "../src/ui/Avviso";
import { Pulsante, PulsanteLink } from "../src/ui/Pulsante";

/** Se una pagina non riesce a prepararsi: dice cosa è successo, senza codici, e come ripartire. */
export default function Errore({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="pagina-vuota">
      <Avviso
        tono="errore"
        titolo="Qualcosa non ha funzionato"
        azione={
          <>
            <Pulsante variante="secondario" icona={<RotateCcw size={18} />} onClick={reset}>
              Riprova
            </Pulsante>{" "}
            <PulsanteLink href="/" variante="testo">
              Torna ai miei viaggi
            </PulsanteLink>
          </>
        }
      >
        Non sono riuscito a preparare questa pagina. Riprova tra un attimo: i tuoi viaggi non sono stati toccati.
      </Avviso>
    </section>
  );
}
