import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContenutoOggi } from "../../../../src/componenti/ContenutiOggi";
import { datiOggi } from "../../../../src/oggi/operazioni";
import { erroreOggi } from "../../../../src/oggi/ritardi";
import { cartellaDati } from "../../../../src/stato/archivio";
import { segnalaRitardoAzione } from "./azioni";

/** Legge l'orologio simulato e lo stato locale a ogni richiesta. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Oggi" };

interface Parametri {
  params: Promise<{ viaggio: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** La vista Oggi di un viaggio, al momento dell'orologio simulato. */
export default async function PaginaOggi({ params, searchParams }: Parametri) {
  const { viaggio } = await params;
  const { errore } = await searchParams;
  const dati = datiOggi(cartellaDati(), viaggio);
  if (dati === null) notFound();
  return <ContenutoOggi chiave={viaggio} dati={dati} azioni={{ segnalaRitardo: segnalaRitardoAzione }} errore={erroreOggi(errore)} />;
}
