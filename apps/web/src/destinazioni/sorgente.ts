/**
 * La sorgente delle destinazioni della web app. Di predefinito è la realizzazione registrata (nessuna rete), sulle
 * istantanee salvate nel database locale (quelle del repository, caricate al primo avvio). Con `TRAVELOPS_GEOCODING=reale`
 * (o `TRAVELOPS_PERCORSI=reale`, da cui il geocoding dipende se non è indicato) è la sorgente reale di ST-CAT-002: ricerca
 * con Nominatim e costruzione con Overpass, Wikipedia, Commons e OSRM (REQ-INTEG-001). Azioni e componenti parlano con
 * l'interfaccia `SorgenteDestinazioni`.
 */
import {
  creaSorgenteDestinazioniReale,
  creaSorgenteRegistrata,
  leggiConfigurazioneServizi,
  leggiIstantaneaOppureErrore,
  type Ambiente,
  type IstantaneaDestinazione,
  type SorgenteDestinazioni,
} from "@travelops/sources";
import { elencaIstantanee, leggiIstantanea as leggiIstantaneaSalvata } from "../basedati";
import { cartellaDati } from "../stato/archivio";
import { usaBaseDati } from "../stato/avvio";
import { SUFFISSO_ISTANTANEA_DEMO } from "../stato/viaggi-demo-bozza";

function istantaneeSalvate(cartella: string): IstantaneaDestinazione[] {
  return usaBaseDati(cartella, (db) =>
    elencaIstantanee(db)
      .filter(({ id }) => !id.endsWith(SUFFISSO_ISTANTANEA_DEMO))
      .flatMap(({ id }) => {
        const salvata = leggiIstantaneaSalvata(db, id);
        return salvata === null ? [] : [leggiIstantaneaOppureErrore(salvata.contenuto)];
      }),
  );
}

/** La sorgente reale è una per processo: tiene il ritmo di 1 richiesta al secondo verso Nominatim e le sue cache. */
let reale: SorgenteDestinazioni | null = null;

function sorgenteReale(cartella: string, userAgent: string): SorgenteDestinazioni {
  reale ??= creaSorgenteDestinazioniReale({
    userAgent,
    istantaneeNote: (areaId) => istantaneeSalvate(cartella).find((i) => i.area.id === areaId) ?? null,
  });
  return reale;
}

export function sorgenteDestinazioniLocale(cartella: string = cartellaDati(), ambiente: Ambiente = process.env): SorgenteDestinazioni {
  const configurazione = leggiConfigurazioneServizi(ambiente);
  if (configurazione.modalita.geocoding === "reale") return sorgenteReale(cartella, configurazione.userAgent);
  return creaSorgenteRegistrata({ istantanee: istantaneeSalvate(cartella) });
}
