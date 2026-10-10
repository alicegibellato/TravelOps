import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContenutoOggi } from "../../../../src/componenti/ContenutiOggi";
import { datiOggi } from "../../../../src/oggi/operazioni";
import { erroreOggi } from "../../../../src/oggi/ritardi";
import { attesaMassimaApertura, contestoDaAmbiente } from "../../../../src/monitoraggio/collegamento";
import { controlloAllApertura } from "../../../../src/monitoraggio/servizio";
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
  // All'apertura di Oggi si controllano meteo ed eventi (REQ-MONITOR-001); se la sorgente tarda si mostra ciò che già c'è.
  const cartella = cartellaDati();
  const controllo = controlloAllApertura(cartella, viaggio, contestoDaAmbiente());
  const notifiche = await Promise.race([controllo, new Promise<null>((r) => setTimeout(() => r(null), attesaMassimaApertura()).unref())]);
  const dati = datiOggi(cartella, viaggio);
  if (dati === null) notFound();
  return (
    <ContenutoOggi
      chiave={viaggio}
      dati={dati}
      azioni={{ segnalaRitardo: segnalaRitardoAzione }}
      errore={erroreOggi(errore)}
      notifiche={(notifiche ?? []).map((n) => ({ id: n.id, testo: n.testo, proposta: n.proposta }))}
    />
  );
}
