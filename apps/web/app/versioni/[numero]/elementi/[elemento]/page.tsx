import type { Metadata } from "next";
import { ContenutoVersioneElemento } from "../../../../../src/componenti/ContenutiStato";
import { cartellaDati, leggiStato } from "../../../../../src/stato/archivio";
import { numeroDaParametro } from "../../../../../src/percorsi";
import { ripristinaAzione } from "../../../../demo/azioni";

/** Legge lo stato locale a ogni richiesta. */
export const dynamic = "force-dynamic";

interface Parametri {
  params: Promise<{ numero: string; elemento: string }>;
}

export async function generateMetadata({ params }: Parametri): Promise<Metadata> {
  const { numero, elemento } = await params;
  return { title: `${decodeURIComponent(elemento)} · Versione ${numero}` };
}

/** Dettaglio di un elemento in una versione. */
export default async function ElementoVersione({ params }: Parametri) {
  const { numero, elemento } = await params;
  return (
    <ContenutoVersioneElemento
      esito={leggiStato(cartellaDati())}
      numero={numeroDaParametro(numero)}
      id={decodeURIComponent(elemento)}
      ripristina={ripristinaAzione}
    />
  );
}
