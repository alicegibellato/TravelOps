import type { Metadata } from "next";
import { ContenutoVersioneViaggio } from "../../../src/componenti/ContenutiStato";
import { cartellaDati, leggiStato } from "../../../src/stato/archivio";
import { numeroDaParametro } from "../../../src/percorsi";
import { ripristinaAzione } from "../../demo/azioni";

/** Legge lo stato locale a ogni richiesta. */
export const dynamic = "force-dynamic";

interface Parametri {
  params: Promise<{ numero: string }>;
}

export async function generateMetadata({ params }: Parametri): Promise<Metadata> {
  const { numero } = await params;
  return { title: `Versione ${numero}` };
}

/** Vista viaggio di una versione. */
export default async function Versione({ params }: Parametri) {
  const { numero } = await params;
  return <ContenutoVersioneViaggio esito={leggiStato(cartellaDati())} numero={numeroDaParametro(numero)} ripristina={ripristinaAzione} />;
}
