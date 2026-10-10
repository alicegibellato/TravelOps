import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContenutoViaggio } from "../../../src/componenti/Contenuti";
import { ContenutoViaggioInCorso } from "../../../src/componenti/ContenutiOggi";
import { caricaViaggioScelto, trovaVoceViaggio, VIAGGI } from "../../../src/dati/viaggi";
import { datiOggi } from "../../../src/oggi/operazioni";
import { viaggioInCorso } from "../../../src/oggi/vista";
import { cartellaDati } from "../../../src/stato/archivio";
import { segnalaRitardoAzione } from "./oggi/azioni";

interface Parametri {
  params: Promise<{ viaggio: string }>;
}

export const dynamicParams = false;

/** Legge l'orologio simulato a ogni richiesta: un viaggio in corso si apre sulla scheda "Oggi" (REQ-TODAY-001). */
export const dynamic = "force-dynamic";

export function generateStaticParams(): { viaggio: string }[] {
  return VIAGGI.map((voce) => ({ viaggio: voce.chiave }));
}

export async function generateMetadata({ params }: Parametri): Promise<Metadata> {
  const { viaggio } = await params;
  return { title: trovaVoceViaggio(viaggio)?.etichetta ?? "Viaggio" };
}

/** Vista viaggio; se il viaggio è in corso, con la vista Oggi. */
export default async function PaginaViaggio({ params }: Parametri) {
  const { viaggio } = await params;
  const esito = caricaViaggioScelto(viaggio);
  if (esito === null) notFound();
  const oggi = datiOggi(cartellaDati(), viaggio);
  if (oggi !== null && viaggioInCorso(oggi.viaggio, oggi.momento)) {
    return <ContenutoViaggioInCorso chiave={viaggio} esito={esito} dati={oggi} azioni={{ segnalaRitardo: segnalaRitardoAzione }} />;
  }
  return <ContenutoViaggio chiave={viaggio} esito={esito} />;
}
