/**
 * Contenuto delle pagine: con dati validi la vista richiesta, con dati non validi gli errori del motore (CA-5).
 * Le pagine di `app/` scelgono solo quale viaggio caricare; tutto il resto è qui, così i test lo verificano
 * senza avviare Next.js.
 */
import Link from "next/link";
import type { MeteoViaggio } from "@travelops/sources";
import type { EsitoDati } from "../dati/carica";
import { trovaVoceViaggio } from "../dati/viaggi";
import { percorsoImprevisti } from "../imprevisti/schede";
import { dettagliDelGiorno, dettaglioElemento } from "../viste/elemento";
import { vistaGiorno } from "../viste/giorno";
import { datiMappa } from "../viste/mappa";
import { vistaViaggio } from "../viste/viaggio";
import { ChatDelViaggio } from "../chat/ChatDelViaggio";
import { DettaglioElemento } from "./DettaglioElemento";
import { LayoutViaggio } from "../ui/LayoutViaggio";
import { dataEstesa } from "../viste/etichette";
import { ErroriDati } from "./ErroriDati";
import { EvidenziazioneGiorno } from "./Evidenziazione";
import { SceltaViaggio } from "./SceltaViaggio";
import { SezioneMappa } from "./SezioneMappa";
import { VistaGiorno } from "./VistaGiorno";
import { VistaViaggio } from "./VistaViaggio";

function NonTrovato({ cosa }: { cosa: string }) {
  return (
    <section className="errori" role="alert">
      <h1>Non trovato</h1>
      <p>{cosa}</p>
    </section>
  );
}

export function ContenutoViaggio({ chiave, esito, meteo }: { chiave: string; esito: EsitoDati; meteo?: MeteoViaggio }) {
  return (
    <>
      <SceltaViaggio attiva={chiave} />
      {/* ST-QA-FIX-018B: dal viaggio dell'utente «Ho un imprevisto» lavora su questo viaggio. */}
      {esito.ok && trovaVoceViaggio(chiave) === null && (
        <p className="viaggio__imprevisto">
          <Link href={percorsoImprevisti(chiave)}>Ho un imprevisto</Link>
        </p>
      )}
      {esito.ok ? <VistaViaggio chiave={chiave} vista={vistaViaggio(esito.viaggio, esito.catalogo)} {...(meteo === undefined ? {} : { meteo })} /> : <ErroriDati errori={esito.errori} />}
    </>
  );
}

/**
 * Il giorno del viaggio con mappa e chat. La chat parla con gli agenti sul server (REQ-CHAT-003, CA-3): `conversazione`
 * è l'ultima conversazione del viaggio, se c'è, così la chat la riprende.
 */
export function ContenutoGiorno({ chiave, esito, data, conversazione = null }: { chiave: string; esito: EsitoDati; data: string; conversazione?: number | null }) {
  if (!esito.ok) {
    return (
      <>
        <SceltaViaggio attiva={chiave} />
        <ErroriDati errori={esito.errori} />
      </>
    );
  }
  const vista = vistaGiorno(esito.viaggio, esito.catalogo, data);
  const mappa = datiMappa(esito.viaggio, esito.catalogo, data);
  return (
    <>
      <SceltaViaggio attiva={chiave} data={data} />
      {vista === null || mappa === null ? (
        <NonTrovato cosa={`Il viaggio non ha il giorno ${dataEstesa(data)}.`} />
      ) : (
        <EvidenziazioneGiorno>
          <LayoutViaggio
            itinerario={<VistaGiorno chiave={chiave} vista={vista} dettagli={dettagliDelGiorno(esito.viaggio, esito.catalogo, data)} />}
            mappa={<SezioneMappa dati={mappa} />}
            chat={<ChatDelViaggio viaggio={chiave} conversazione={conversazione} />}
          />
        </EvidenziazioneGiorno>
      )}
    </>
  );
}

export function ContenutoElemento({ chiave, esito, id }: { chiave: string; esito: EsitoDati; id: string }) {
  if (!esito.ok) {
    return (
      <>
        <SceltaViaggio attiva={chiave} />
        <ErroriDati errori={esito.errori} />
      </>
    );
  }
  const dettaglio = dettaglioElemento(esito.viaggio, esito.catalogo, id);
  return (
    <>
      <SceltaViaggio attiva={chiave} />
      {dettaglio === null ? (
        <NonTrovato cosa="Questo elemento non fa parte del viaggio." />
      ) : (
        <DettaglioElemento chiave={chiave} dettaglio={dettaglio} />
      )}
    </>
  );
}
