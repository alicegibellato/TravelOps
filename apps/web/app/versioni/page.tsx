import type { Metadata } from "next";
import { ContenutoVersioni } from "../../src/componenti/ContenutiStato";
import { cartellaDati, leggiStato } from "../../src/stato/archivio";
import { numeroDaParametro } from "../../src/percorsi";
import { ripristinaAzione } from "../demo/azioni";

/** Legge lo stato locale a ogni richiesta. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Versioni" };

interface Parametri {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Elenco delle versioni e confronto tra due versioni (`?a=1&b=2`). */
export default async function Versioni({ searchParams }: Parametri) {
  const { a, b } = await searchParams;
  return <ContenutoVersioni esito={leggiStato(cartellaDati())} a={numeroDaParametro(a)} b={numeroDaParametro(b)} ripristina={ripristinaAzione} />;
}
