/** Le destinazioni precaricate (istantanee salvate nella base dati locale), per le schede del primo passo. */
import { elencaIstantanee } from "../basedati";
import { SUFFISSO_ISTANTANEA_DEMO } from "../stato/viaggi-demo-bozza";
import { usaBaseDati } from "../stato/avvio";
import type { DestinazionePrecaricata } from "./tipi";

export function destinazioniPrecaricate(cartella: string): DestinazionePrecaricata[] {
  return usaBaseDati(cartella, (db) => elencaIstantanee(db))
    .filter(({ id }) => !id.endsWith(SUFFISSO_ISTANTANEA_DEMO))
    .map(({ id, destinazione }) => ({ id, nome: destinazione }));
}
