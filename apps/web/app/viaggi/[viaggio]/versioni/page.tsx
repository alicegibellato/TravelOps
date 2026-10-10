import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaginaVersioni } from "../../../../src/componenti/PaginaVersioni";
import { versioniDelViaggioSalvato } from "../../../../src/dati/viaggi-salvati";
import { numeroDaParametro } from "../../../../src/percorsi";
import { cartellaDati } from "../../../../src/stato/archivio";
import { vistaVersioni } from "../../../../src/viste/versioni";

/** Lo storico si rilegge a ogni richiesta: le proposte accettate creano versioni nuove. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Versioni" };

interface Parametri {
  params: Promise<{ viaggio: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** ST-QA-FIX-004: le versioni di un viaggio salvato (cronologia e confronto `?a=1&b=2`), come la pagina Versioni. */
export default async function VersioniDelViaggio({ params, searchParams }: Parametri) {
  const chiave = decodeURIComponent((await params).viaggio);
  const { a, b } = await searchParams;
  const caricato = versioniDelViaggioSalvato(cartellaDati(), chiave);
  if (caricato === null) notFound();
  const vista = vistaVersioni({ storico: caricato.storico }, caricato.catalogo, numeroDaParametro(a), numeroDaParametro(b));
  return <PaginaVersioni vista={vista} viaggio={{ chiave, titolo: caricato.titolo }} />;
}
