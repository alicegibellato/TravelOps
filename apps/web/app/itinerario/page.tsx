import { redirect } from "next/navigation";
import { versioneCorrente } from "@travelops/engine";
import { PERCORSO_DEMO, percorsoVersione } from "../../src/percorsi";
import { cartellaDati, leggiStato } from "../../src/stato/archivio";

/** Legge lo stato locale a ogni richiesta. */
export const dynamic = "force-dynamic";

/** L'itinerario corrente: la versione corrente dello stato locale (con uno stato non valido, la Demo). */
export default function ItinerarioCorrente() {
  const esito = leggiStato(cartellaDati());
  redirect(esito.ok ? percorsoVersione(versioneCorrente(esito.stato.storico).numero) : PERCORSO_DEMO);
}
