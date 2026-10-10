import { redirect } from "next/navigation";
import { percorsoOggi } from "../../src/percorsi";
import { cartellaDati, leggiStato } from "../../src/stato/archivio";
import { PARTENZA_PREDEFINITA } from "../../src/stato/stato";

/** Legge lo stato locale a ogni richiesta. */
export const dynamic = "force-dynamic";

/** La vista Oggi del viaggio della modalità presentazione. */
export default function Oggi() {
  const esito = leggiStato(cartellaDati());
  redirect(percorsoOggi(esito.ok ? esito.stato.partenza : PARTENZA_PREDEFINITA));
}
