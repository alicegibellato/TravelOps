import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContenutoViaggio } from "../../../src/componenti/Contenuti";
import { ContenutoViaggioInCorso } from "../../../src/componenti/ContenutiOggi";
import { ErroriDati } from "../../../src/componenti/ErroriDati";
import { VIAGGI } from "../../../src/dati/viaggi";
import { caricaViaggioDellApp, viaggioSalvatoNonLeggibile } from "../../../src/dati/viaggi-salvati";
import { datiOggi } from "../../../src/oggi/operazioni";
import { viaggioInCorso } from "../../../src/oggi/vista";
import { meteoDelViaggio } from "../../../src/servizi/meteo-viaggio";
import { cartellaDati } from "../../../src/stato/archivio";
import { segnalaRitardoAzione } from "./oggi/azioni";

interface Parametri {
  params: Promise<{ viaggio: string }>;
}

/** Oltre ai viaggi di riferimento, i viaggi confermati della base dati (REQ-UX-003, CA-2): si cercano a ogni richiesta. */
export const dynamicParams = true;

/** Legge l'orologio simulato a ogni richiesta: un viaggio in corso si apre sulla scheda "Oggi" (REQ-TODAY-001). */
export const dynamic = "force-dynamic";

export function generateStaticParams(): { viaggio: string }[] {
  return VIAGGI.map((voce) => ({ viaggio: voce.chiave }));
}

export async function generateMetadata({ params }: Parametri): Promise<Metadata> {
  const { viaggio } = await params;
  return { title: caricaViaggioDellApp(cartellaDati(), decodeURIComponent(viaggio))?.titolo ?? "Viaggio" };
}

/** Vista viaggio; se il viaggio è in corso, con la vista Oggi. */
export default async function PaginaViaggio({ params }: Parametri) {
  const viaggio = decodeURIComponent((await params).viaggio);
  const caricato = caricaViaggioDellApp(cartellaDati(), viaggio);
  if (caricato === null) {
    // Il viaggio è salvato ma non si legge (dati non validi): lo dice invece di "Pagina non trovata" (TB-TRIP-006, ST-QA-FIX-016).
    const salvato = viaggioSalvatoNonLeggibile(cartellaDati(), viaggio, false);
    if (salvato === null) notFound();
    const motivo = "I dati salvati di questo viaggio non superano i controlli del motore: riprendilo dalla chat o dai filtri di Pianifica, oppure eliminalo.";
    return (
      <section aria-labelledby="viaggio-non-valido" className="errori">
        <h1 id="viaggio-non-valido">{salvato.titolo}</h1>
        <ErroriDati errori={[{ codice: "VALORE_NON_VALIDO", id: salvato.id, percorso: "", motivo, messaggio: motivo, origine: "viaggio" }]} />
      </section>
    );
  }
  const { esito } = caricato;
  const oggi = datiOggi(cartellaDati(), viaggio);
  if (oggi !== null && viaggioInCorso(oggi.viaggio, oggi.momento)) {
    const meteoOggi = await meteoDelViaggio(oggi.viaggio, oggi.catalogo);
    return <ContenutoViaggioInCorso chiave={viaggio} esito={esito} dati={oggi} azioni={{ segnalaRitardo: segnalaRitardoAzione }} meteo={meteoOggi} />;
  }
  const meteo = esito.ok ? await meteoDelViaggio(esito.viaggio, esito.catalogo) : undefined;
  return <ContenutoViaggio chiave={viaggio} esito={esito} {...(meteo === undefined ? {} : { meteo })} />;
}
