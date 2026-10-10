import type { Metadata } from "next";
import { ContenutoVersioneGiorno } from "../../../../../src/componenti/ContenutiStato";
import { cartellaDati, leggiStato } from "../../../../../src/stato/archivio";
import { numeroDaParametro } from "../../../../../src/percorsi";
import { meteoDellaVersione } from "../../../../../src/servizi/meteo-viaggio";
import { dataEstesa } from "../../../../../src/viste/etichette";
import { ripristinaAzione } from "../../../../demo/azioni";

/** Legge lo stato locale a ogni richiesta. */
export const dynamic = "force-dynamic";

interface Parametri {
  params: Promise<{ numero: string; data: string }>;
}

export async function generateMetadata({ params }: Parametri): Promise<Metadata> {
  const { numero, data } = await params;
  return { title: `${dataEstesa(decodeURIComponent(data))} · Versione ${numero}` };
}

/** Vista giorno di una versione, con i problemi di fattibilità e la mappa. */
export default async function GiornoVersione({ params }: Parametri) {
  const { numero, data } = await params;
  const esito = leggiStato(cartellaDati());
  const n = numeroDaParametro(numero);
  const meteo = await meteoDellaVersione(esito, n);
  return (
    <ContenutoVersioneGiorno
      esito={esito}
      numero={n}
      data={decodeURIComponent(data)}
      ripristina={ripristinaAzione}
      {...(meteo === undefined ? {} : { meteo })}
    />
  );
}
