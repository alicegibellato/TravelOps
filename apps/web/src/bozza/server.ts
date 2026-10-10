/** Il servizio della bozza sulla base dati locale, per le azioni lato server e le pagine (REQ-PLAN-002). */
import { percorsoBozza } from "../percorsi";
import { cartellaDati } from "../stato/archivio";
import { usaBaseDati } from "../stato/avvio";
import { creaServizioBozza, type ServizioBozza } from "./servizio";

export function servizioBozza(cartella: string = cartellaDati()): ServizioBozza {
  return creaServizioBozza((lavoro) => usaBaseDati(cartella, lavoro), percorsoBozza);
}
