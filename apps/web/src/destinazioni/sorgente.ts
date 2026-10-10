/**
 * La sorgente delle destinazioni della web app: oggi la realizzazione registrata (nessuna rete), sulle istantanee
 * salvate nel database locale (quelle del repository, caricate al primo avvio). Con la sorgente reale (ST-CAT-002)
 * si cambia solo questo file: azioni e componenti parlano con l'interfaccia `SorgenteDestinazioni`.
 */
import { creaSorgenteRegistrata, leggiIstantaneaOppureErrore, type SorgenteDestinazioni } from "@travelops/sources";
import { elencaIstantanee, leggiIstantanea as leggiIstantaneaSalvata } from "../basedati";
import { cartellaDati } from "../stato/archivio";
import { usaBaseDati } from "../stato/avvio";
import { SUFFISSO_ISTANTANEA_DEMO } from "../stato/viaggi-demo-bozza";

export function sorgenteDestinazioniLocale(cartella: string = cartellaDati()): SorgenteDestinazioni {
  const istantanee = usaBaseDati(cartella, (db) =>
    elencaIstantanee(db)
      .filter(({ id }) => !id.endsWith(SUFFISSO_ISTANTANEA_DEMO))
      .flatMap(({ id }) => {
      const salvata = leggiIstantaneaSalvata(db, id);
      return salvata === null ? [] : [leggiIstantaneaOppureErrore(salvata.contenuto)];
    }),
  );
  return creaSorgenteRegistrata({ istantanee });
}
