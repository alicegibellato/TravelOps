import type { Metadata } from "next";
import { conversazioniTracciate, tracceDelViaggio, tracceDellaConversazione } from "../../src/basedati";
import { PaginaAgenti, type SelezioneAgenti } from "../../src/componenti/PaginaAgenti";
import { numeroDaParametro } from "../../src/percorsi";
import { fusoOrario } from "../../src/qualita/rapporto";
import { usaBaseDati } from "../../src/stato/avvio";
import { cartellaDati } from "../../src/stato/archivio";

/** Legge le tracce a ogni richiesta: dopo una risposta della chat basta ricaricare. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Cosa hanno fatto gli agenti" };

interface Parametri {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Le tracce runtime degli agenti (REQ-OBS-001 CA-3), per conversazione (`?conversazione=N`) o per viaggio (`?viaggio=id`). */
export default async function Agenti({ searchParams }: Parametri) {
  const parametri = await searchParams;
  const conversazione = numeroDaParametro(parametri.conversazione);
  const viaggio = typeof parametri.viaggio === "string" && parametri.viaggio !== "" ? parametri.viaggio : null;
  const { elenco, selezione } = usaBaseDati(cartellaDati(), (db) => {
    const selezione: SelezioneAgenti =
      conversazione !== null
        ? { tipo: "conversazione", id: conversazione, risposte: tracceDellaConversazione(db, conversazione) }
        : viaggio !== null
          ? { tipo: "viaggio", id: viaggio, risposte: tracceDelViaggio(db, viaggio) }
          : { tipo: "nessuna" };
    return { elenco: conversazioniTracciate(db), selezione };
  });
  return <PaginaAgenti elenco={elenco} selezione={selezione} fuso={fusoOrario()} />;
}
