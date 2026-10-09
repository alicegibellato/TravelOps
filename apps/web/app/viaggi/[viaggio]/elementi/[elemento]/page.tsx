import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContenutoElemento } from "../../../../../src/componenti/Contenuti";
import { caricaViaggioScelto, trovaVoceViaggio, VIAGGI } from "../../../../../src/dati/viaggi";

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
  return { title: `${decodeURIComponent(elemento)} · ${trovaVoceViaggio(viaggio)?.etichetta ?? "Viaggio"}` };
}

/** Dettaglio di un elemento. */
export default async function PaginaElemento({ params }: Parametri) {
  const { viaggio, elemento } = await params;
  const esito = caricaViaggioScelto(viaggio);
  if (esito === null) notFound();
  return <ContenutoElemento chiave={viaggio} esito={esito} id={decodeURIComponent(elemento)} />;
}
