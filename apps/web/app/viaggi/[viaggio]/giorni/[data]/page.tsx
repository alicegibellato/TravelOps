import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContenutoGiorno } from "../../../../../src/componenti/Contenuti";
import { caricaViaggioScelto, VIAGGI } from "../../../../../src/dati/viaggi";
import { caricaViaggioDellApp } from "../../../../../src/dati/viaggi-salvati";
import { cartellaDati } from "../../../../../src/stato/archivio";
import { dataEstesa } from "../../../../../src/viste/etichette";

interface Parametri {
  params: Promise<{ viaggio: string; data: string }>;
}

/** Oltre ai viaggi di riferimento, i viaggi confermati della base dati (REQ-UX-003, CA-2): si cercano a ogni richiesta. */
export const dynamicParams = true;

/** Un viaggio della base dati cambia (nuove versioni): la pagina si rigenera a ogni richiesta. */
export const dynamic = "force-dynamic";

/** Una pagina per ogni giorno di ogni viaggio con dati validi. */
export function generateStaticParams(): { viaggio: string; data: string }[] {
  return VIAGGI.flatMap((voce) => {
    const esito = caricaViaggioScelto(voce.chiave);
    return esito?.ok === true ? esito.viaggio.giorni.map((giorno) => ({ viaggio: voce.chiave, data: giorno.data })) : [];
  });
}

export async function generateMetadata({ params }: Parametri): Promise<Metadata> {
  const { viaggio, data } = await params;
  return { title: `${dataEstesa(decodeURIComponent(data))} · ${caricaViaggioDellApp(cartellaDati(), decodeURIComponent(viaggio))?.titolo ?? "Viaggio"}` };
}

/** Vista giorno con la mappa. */
export default async function PaginaGiorno({ params }: Parametri) {
  const { viaggio, data } = await params;
  const caricato = caricaViaggioDellApp(cartellaDati(), decodeURIComponent(viaggio));
  if (caricato === null) notFound();
  const { esito } = caricato;
  return <ContenutoGiorno chiave={viaggio} esito={esito} data={decodeURIComponent(data)} />;
}
