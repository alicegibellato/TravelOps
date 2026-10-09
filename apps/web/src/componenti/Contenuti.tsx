/**
 * Contenuto delle pagine: con dati validi la vista richiesta, con dati non validi gli errori del motore (CA-5).
 * Le pagine di `app/` scelgono solo quale viaggio caricare; tutto il resto è qui, così i test lo verificano
 * senza avviare Next.js.
 */
import type { EsitoDati } from "../dati/carica";
import { dettaglioElemento } from "../viste/elemento";
import { vistaGiorno } from "../viste/giorno";
import { datiMappa } from "../viste/mappa";
import { vistaViaggio } from "../viste/viaggio";
import { DettaglioElemento } from "./DettaglioElemento";
import { LayoutViaggio } from "../ui/LayoutViaggio";
import { dataEstesa } from "../viste/etichette";
import { ErroriDati } from "./ErroriDati";
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

export function ContenutoViaggio({ chiave, esito }: { chiave: string; esito: EsitoDati }) {
  return (
    <>
      <SceltaViaggio attiva={chiave} />
      {esito.ok ? <VistaViaggio chiave={chiave} vista={vistaViaggio(esito.viaggio, esito.catalogo)} /> : <ErroriDati errori={esito.errori} />}
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
        <LayoutViaggio itinerario={<VistaGiorno chiave={chiave} vista={vista} />} mappa={<SezioneMappa dati={mappa} />} />
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
