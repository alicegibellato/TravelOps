import type { Metadata } from "next";
import { ContenutoVersioni } from "../../src/componenti/ContenutiStato";
import { cartellaDati, leggiStato } from "../../src/stato/archivio";
import { redirect } from "next/navigation";
import { ultimoViaggioConfermato } from "../../src/dati/viaggi-salvati";
import { numeroDaParametro, percorsoVersioniViaggio } from "../../src/percorsi";
import { ripristinaAzione } from "../demo/azioni";

/** Legge lo stato locale a ogni richiesta. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Versioni" };

interface Parametri {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Elenco delle versioni e confronto tra due versioni (`?a=1&b=2`). */
export default async function Versioni({ searchParams }: Parametri) {
  const { a, b, presentazione } = await searchParams;
  // ST-QA-FIX-004: con un viaggio confermato dell'utente, «Versioni» mostra le sue (`?presentazione` per quelle della Demo).
  const proprio = presentazione === undefined && a === undefined && b === undefined ? ultimoViaggioConfermato(cartellaDati()) : null;
  if (proprio !== null) redirect(percorsoVersioniViaggio(proprio));
  return <ContenutoVersioni esito={leggiStato(cartellaDati())} a={numeroDaParametro(a)} b={numeroDaParametro(b)} ripristina={ripristinaAzione} />;
}
