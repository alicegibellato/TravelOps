/**
 * I servizi esterni della web app (REQ-INTEG-001): meteo, geocoding, percorsi, voli, eventi. La modalità di ciascuno viene
 * da variabili d'ambiente (`TRAVELOPS_METEO`, `TRAVELOPS_PERCORSI`, `TRAVELOPS_GEOCODING`, `TRAVELOPS_VOLI`,
 * `TRAVELOPS_EVENTI`: `finto` o `reale`); se non sono impostate, tutto è finto e non esce nessuna richiesta di rete.
 * Solo lato server: le pagine passano ai componenti dati già pronti.
 */
import { creaServizi, leggiConfigurazioneServizi, type Ambiente, type ServiziEsterni } from "@travelops/sources";

let istanza: ServiziEsterni | null = null;

/** I servizi del processo, creati alla prima richiesta (la cache in memoria vive quanto il processo). */
export function serviziEsterni(ambiente: Ambiente = process.env): ServiziEsterni {
  if (ambiente === process.env) {
    istanza ??= creaServizi(leggiConfigurazioneServizi(ambiente));
    return istanza;
  }
  return creaServizi(leggiConfigurazioneServizi(ambiente));
}

/** Per i test: dimentica i servizi già creati. */
export function dimenticaServizi(): void {
  istanza = null;
}
