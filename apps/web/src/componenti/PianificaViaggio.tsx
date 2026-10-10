import { Sparkles } from "lucide-react";
import { PulsanteLink } from "../ui/Pulsante";

/** Dove si pianifica un viaggio: percorso guidato e chat con gli agenti sullo stesso schermo (REQ-PREF-001, REQ-CHAT-001). */
export const PERCORSO_PIANIFICA = "/pianifica";

/** Il pulsante principale della home: porta alla pagina Pianifica. */
export function PianificaViaggio() {
  return (
    <PulsanteLink variante="primario" dimensione="grande" icona={<Sparkles size={20} />} href={PERCORSO_PIANIFICA}>
      Pianifica un viaggio
    </PulsanteLink>
  );
}
