import { Luggage } from "lucide-react";
import { PulsanteLink } from "../src/ui/Pulsante";
import { StatoVuoto } from "../src/ui/StatoVuoto";

export default function NonTrovata() {
  return (
    <section className="pagina-vuota" role="alert">
      <StatoVuoto
        livello={1}
        titolo="Pagina non trovata"
        descrizione="Il viaggio, il giorno o l'elemento che cerchi non esiste."
        azione={
          <PulsanteLink href="/" icona={<Luggage size={18} />}>
            Torna ai miei viaggi
          </PulsanteLink>
        }
      />
    </section>
  );
}
