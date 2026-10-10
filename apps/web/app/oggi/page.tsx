import { redirect } from "next/navigation";
import { viaggioPerOggi } from "../../src/dati/viaggi-salvati";
import { percorsoOggi } from "../../src/percorsi";
import { cartellaDati, leggiStato } from "../../src/stato/archivio";
import { PARTENZA_PREDEFINITA } from "../../src/stato/stato";

/** Legge lo stato locale a ogni richiesta. */
export const dynamic = "force-dynamic";

/**
 * La vista Oggi: il viaggio confermato del viaggiatore in corso al suo orologio (REQ-UX-003, CA-2), altrimenti il
 * viaggio della modalità presentazione.
 */
export default function Oggi() {
  const cartella = cartellaDati();
  const proprio = viaggioPerOggi(cartella);
  if (proprio !== null) redirect(percorsoOggi(proprio));
  const esito = leggiStato(cartella);
  redirect(percorsoOggi(esito.ok ? esito.stato.partenza : PARTENZA_PREDEFINITA));
}
