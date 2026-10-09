import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContenutoGiorno } from "../../../../../src/componenti/Contenuti";
import { caricaViaggioScelto, trovaVoceViaggio, VIAGGI } from "../../../../../src/dati/viaggi";
import { dataEstesa } from "../../../../../src/viste/etichette";

interface Parametri {
  params: Promise<{ viaggio: string; data: string }>;
}

export const dynamicParams = false;

/** Una pagina per ogni giorno di ogni viaggio con dati validi. */
export function generateStaticParams(): { viaggio: string; data: string }[] {
  return VIAGGI.flatMap((voce) => {
    const esito = caricaViaggioScelto(voce.chiave);
    return esito?.ok === true ? esito.viaggio.giorni.map((giorno) => ({ viaggio: voce.chiave, data: giorno.data })) : [];
  });
}

export async function generateMetadata({ params }: Parametri): Promise<Metadata> {
  const { viaggio, data } = await params;
  return { title: `${dataEstesa(decodeURIComponent(data))} · ${trovaVoceViaggio(viaggio)?.etichetta ?? "Viaggio"}` };
}

/** Vista giorno con la mappa. */
export default async function PaginaGiorno({ params }: Parametri) {
  const { viaggio, data } = await params;
  const esito = caricaViaggioScelto(viaggio);
  if (esito === null) notFound();
  return <ContenutoGiorno chiave={viaggio} esito={esito} data={decodeURIComponent(data)} />;
}
