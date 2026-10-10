import type { Metadata } from "next";
import { PaginaDestinazione } from "../../src/componenti/PaginaDestinazione";
import { OROLOGIO_PREDEFINITO } from "../../src/stato/stato";
import { cartellaDati, leggiStato } from "../../src/stato/archivio";
import { opzioniMesi } from "../../src/viste/etichette";
import { cercaDestinazioniAzione, costruisciDestinazioneAzione, sorprendimiAzione } from "./azioni";

/** Il momento è l'orologio simulato dello stato locale: la pagina si rigenera a ogni richiesta. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Destinazione" };

const servizio = {
  cerca: cercaDestinazioniAzione,
  costruisci: costruisciDestinazioneAzione,
  sorprendimi: sorprendimiAzione,
};

/** Scelta della destinazione: ricerca con suggerimenti, avanzamento, attribuzioni e Sorprendimi (REQ-CAT-002). */
export default function Destinazione() {
  const letto = leggiStato(cartellaDati());
  const oggi = letto.ok ? letto.stato.orologio.data : OROLOGIO_PREDEFINITO.data;
  return <PaginaDestinazione servizio={servizio} mesi={opzioniMesi(oggi)} />;
}
