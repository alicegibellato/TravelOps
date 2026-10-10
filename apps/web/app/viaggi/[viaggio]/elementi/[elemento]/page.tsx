import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContenutoElemento } from "../../../../../src/componenti/Contenuti";
import { caricaViaggioScelto, VIAGGI } from "../../../../../src/dati/viaggi";
import { caricaViaggioDellApp } from "../../../../../src/dati/viaggi-salvati";
import { cartellaDati } from "../../../../../src/stato/archivio";
import { dettaglioElemento } from "../../../../../src/viste/elemento";

interface Parametri {
  params: Promise<{ viaggio: string; elemento: string }>;
}

/** Oltre ai viaggi di riferimento, i viaggi confermati della base dati (REQ-UX-003, CA-2): si cercano a ogni richiesta. */
export const dynamicParams = true;

/** Un viaggio della base dati cambia (nuove versioni): la pagina si rigenera a ogni richiesta. */
export const dynamic = "force-dynamic";

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
  const caricato = caricaViaggioDellApp(cartellaDati(), decodeURIComponent(viaggio));
  const esito = caricato?.esito;
  const titolo = esito?.ok === true ? dettaglioElemento(esito.viaggio, esito.catalogo, decodeURIComponent(elemento))?.titolo : undefined;
  return { title: `${titolo ?? "Dettaglio"} · ${caricato?.titolo ?? "Viaggio"}` };
}

/** Dettaglio di un elemento. */
export default async function PaginaElemento({ params }: Parametri) {
  const { viaggio, elemento } = await params;
  const caricato = caricaViaggioDellApp(cartellaDati(), decodeURIComponent(viaggio));
  if (caricato === null) notFound();
  const { esito } = caricato;
  return <ContenutoElemento chiave={viaggio} esito={esito} id={decodeURIComponent(elemento)} />;
}
