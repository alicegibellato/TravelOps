import type { Metadata } from "next";
import { PaginaPreferenze } from "../../src/componenti/PaginaPreferenze";
import { opzioniPercorso } from "../../src/preferenze/opzioni";
import { destinazioniPrecaricate } from "../../src/preferenze/precaricate";
import { OROLOGIO_PREDEFINITO } from "../../src/stato/stato";
import { cartellaDati, leggiStato } from "../../src/stato/archivio";
import { opzioniMesi } from "../../src/viste/etichette";
import { cercaDestinazioniAzione, sorprendimiAzione } from "../destinazione/azioni";
import { salvaPreferenzeAzione, validaPreferenzeAzione } from "./azioni";

/** Il momento è l'orologio simulato dello stato locale: la pagina si rigenera a ogni richiesta. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Preferenze" };

const preferenze = { valida: validaPreferenzeAzione, salva: salvaPreferenzeAzione };
const destinazioni = { cerca: cercaDestinazioniAzione, sorprendimi: sorprendimiAzione };

/** Percorso guidato delle preferenze: destinazione, date, chi, che viaggio, dettagli (REQ-PREF-001). */
export default function Preferenze() {
  const cartella = cartellaDati();
  const letto = leggiStato(cartella);
  const oggi = letto.ok ? letto.stato.orologio.data : OROLOGIO_PREDEFINITO.data;
  const precaricate = destinazioniPrecaricate(cartella);
  return <PaginaPreferenze preferenze={preferenze} destinazioni={destinazioni} opzioni={opzioniPercorso()} mesi={opzioniMesi(oggi)} precaricate={precaricate} />;
}
