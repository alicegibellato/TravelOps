/**
 * Esportazione in JSON di viaggio e catalogo (REQ-ITIN-001, CA-4).
 * Il JSON esportato si ricarica con `caricaViaggio` e `caricaCatalogo` e restituisce dati identici.
 */
import type { CatalogoEsteso, Viaggio } from "../model/index.js";

/** Il viaggio in JSON, con rientro di due spazi; a parità di viaggio il testo è identico. */
export function esportaViaggio(viaggio: Viaggio): string {
  return JSON.stringify(viaggio, null, 2);
}

/** Il catalogo (anche esteso) in JSON, con rientro di due spazi; a parità di catalogo il testo è identico. */
export function esportaCatalogo(catalogo: CatalogoEsteso): string {
  return JSON.stringify(catalogo, null, 2);
}
