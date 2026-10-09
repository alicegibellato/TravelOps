import type { Metadata } from "next";
import { ContenutoProposta } from "../../../../src/componenti/ContenutiStato";
import { cartellaDati, leggiStato } from "../../../../src/stato/archivio";
import { numeroDaParametro } from "../../../../src/percorsi";
import { accettaAzione, rifiutaAzione, ripristinaAzione } from "../../azioni";

/** Legge lo stato locale a ogni richiesta. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Proposta" };

interface Parametri {
  params: Promise<{ id: string }>;
}

/** Vista della proposta, con Accetta e Rifiuta. */
export default async function Proposta({ params }: Parametri) {
  const { id } = await params;
  return (
    <ContenutoProposta
      esito={leggiStato(cartellaDati())}
      id={numeroDaParametro(id)}
      azioni={{ accetta: accettaAzione, rifiuta: rifiutaAzione }}
      ripristina={ripristinaAzione}
    />
  );
}
