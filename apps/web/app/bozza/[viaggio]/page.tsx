import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { servizioBozza } from "../../../src/bozza/server";
import { ErroriDati } from "../../../src/componenti/ErroriDati";
import { PaginaBozza } from "../../../src/componenti/PaginaBozza";
import { viaggioSalvatoNonLeggibile } from "../../../src/dati/viaggi-salvati";
import { meteoDelViaggio } from "../../../src/servizi/meteo-viaggio";
import { cartellaDati } from "../../../src/stato/archivio";
import {
  accettaPropostaBozzaAzione,
  alternativeBozzaAzione,
  cambiaPreferenzeBozzaAzione,
  confermaBozzaAzione,
  confrontaBozzaAzione,
  operaBozzaAzione,
  rifiutaPropostaBozzaAzione,
} from "../azioni";

interface Parametri {
  params: Promise<{ viaggio: string }>;
}

/** La bozza cambia a ogni operazione: la pagina si rigenera a ogni richiesta. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "La tua bozza" };

/** La bozza del viaggio: operazioni, revisioni, annulla, confronto e conferma (REQ-PLAN-002). */
export default async function Bozza({ params }: Parametri) {
  const { viaggio } = await params;
  const vista = servizioBozza().vista(viaggio);
  if (vista === null) {
    // La bozza c'è ma non si legge (dati non validi): lo dice invece di "Pagina non trovata" (TB-TRIP-006, ST-QA-FIX-016).
    const salvato = viaggioSalvatoNonLeggibile(cartellaDati(), decodeURIComponent(viaggio), true);
    if (salvato === null) notFound();
    const motivo = "L'ultima revisione salvata non supera i controlli del motore: riprendi la bozza dalla chat o dai filtri di Pianifica, oppure eliminala.";
    return (
      <section aria-labelledby="bozza-non-valida" className="errori">
        <h1 id="bozza-non-valida">{salvato.titolo}</h1>
        <ErroriDati errori={[{ codice: "VALORE_NON_VALIDO", id: salvato.id, percorso: "", motivo, messaggio: motivo, origine: "viaggio" }]} />
      </section>
    );
  }
  // La previsione per giorno (REQ-INTEG-001): non solleva mai errori, se il servizio non risponde lo dice giorno per giorno.
  const dati = servizioBozza().datiPerMeteo(viaggio);
  const meteo = dati === null ? undefined : (await meteoDelViaggio(dati.viaggio, dati.catalogo)).perGiorno;
  const azioni = {
    opera: operaBozzaAzione.bind(null, viaggio),
    cambiaPreferenze: cambiaPreferenzeBozzaAzione.bind(null, viaggio),
    alternative: alternativeBozzaAzione.bind(null, viaggio),
    confronta: confrontaBozzaAzione.bind(null, viaggio),
    conferma: confermaBozzaAzione.bind(null, viaggio),
    accetta: accettaPropostaBozzaAzione.bind(null, viaggio),
    rifiuta: rifiutaPropostaBozzaAzione.bind(null, viaggio),
  };
  return <PaginaBozza vista={vista} azioni={azioni} {...(meteo === undefined ? {} : { meteo })} />;
}
