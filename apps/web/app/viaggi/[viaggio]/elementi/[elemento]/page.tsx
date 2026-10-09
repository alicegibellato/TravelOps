import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContenutoElemento } from "../../../../../src/componenti/Contenuti";
import { caricaViaggioScelto, trovaVoceViaggio, VIAGGI } from "../../../../../src/dati/viaggi";
import { dettaglioElemento } from "../../../../../src/viste/elemento";

interface Parametri {
  params: Promise<{ viaggio: string; elemento: string }>;
}

export const dynamicParams = false;

/** Una pagina per ogni elemento di ogni viaggio con dati validi. */
export function generateStaticParams(): { viaggio: string; elemento: string }[] {
  return VIAGGI.flatMap((voce) => {
    const esito = caricaViaggioScelto(voce.chiave);
    if (esito?.ok !== true) return [];
    return esito.viaggio.giorni.flatMap((giorno) => giorno.elementi.map((elemento) => ({ viaggio: voce.chiave, elemento: elemento.id })));
  });
}

export async function generateMetadata({ params }: Parametri): Promise<Metadata> {
  const { viaggio, elemento } = await params;
  // Il titolo della scheda del browser è testo visibile: il nome dell'elemento, non il suo `id` (REQ-UX-001, CA-6).
  const esito = caricaViaggioScelto(viaggio);
  const titolo = esito?.ok === true ? dettaglioElemento(esito.viaggio, esito.catalogo, decodeURIComponent(elemento))?.titolo : undefined;
  return { title: `${titolo ?? "Dettaglio"} · ${trovaVoceViaggio(viaggio)?.etichetta ?? "Viaggio"}` };
}

/** Dettaglio di un elemento. */
export default async function PaginaElemento({ params }: Parametri) {
  const { viaggio, elemento } = await params;
  const esito = caricaViaggioScelto(viaggio);
  if (esito === null) notFound();
  return <ContenutoElemento chiave={viaggio} esito={esito} id={decodeURIComponent(elemento)} />;
}
