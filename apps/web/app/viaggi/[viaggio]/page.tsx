import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContenutoViaggio } from "../../../src/componenti/Contenuti";
import { caricaViaggioScelto, trovaVoceViaggio, VIAGGI } from "../../../src/dati/viaggi";

interface Parametri {
  params: Promise<{ viaggio: string }>;
}

export const dynamicParams = false;

export function generateStaticParams(): { viaggio: string }[] {
  return VIAGGI.map((voce) => ({ viaggio: voce.chiave }));
}

export async function generateMetadata({ params }: Parametri): Promise<Metadata> {
  const { viaggio } = await params;
  return { title: trovaVoceViaggio(viaggio)?.etichetta ?? "Viaggio" };
}

/** Vista viaggio. */
export default async function PaginaViaggio({ params }: Parametri) {
  const { viaggio } = await params;
  const esito = caricaViaggioScelto(viaggio);
  if (esito === null) notFound();
  return <ContenutoViaggio chiave={viaggio} esito={esito} />;
}
