/**
 * Contenuto delle pagine: con dati validi la vista richiesta, con dati non validi gli errori del motore (CA-5).
 * Le pagine di `app/` scelgono solo quale viaggio caricare; tutto il resto è qui, così i test lo verificano
 * senza avviare Next.js.
 */
import type { MeteoViaggio } from "@travelops/sources";
import type { EsitoDati } from "../dati/carica";
import { dettagliDelGiorno, dettaglioElemento } from "../viste/elemento";
import { vistaGiorno } from "../viste/giorno";
import { datiMappa } from "../viste/mappa";
import { vistaViaggio } from "../viste/viaggio";
import { ChatViaggio } from "../chat/ChatViaggio";
import { copioneViaggio } from "../chat/copione";
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
      {esito.ok ? <VistaViaggio chiave={chiave} vista={vistaViaggio(esito.viaggio, esito.catalogo)} {...(meteo === undefined ? {} : { meteo })} /> : <ErroriDati errori={esito.errori} />}
    </>
  );
}

export function ContenutoGiorno({ chiave, esito, data }: { chiave: string; esito: EsitoDati; data: string }) {
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
            chat={<ChatViaggio copione={copioneViaggio(chiave, esito)} />}
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
