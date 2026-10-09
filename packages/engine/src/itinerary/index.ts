/**
 * Modulo itinerary: caricamento, validazione ed esportazione di viaggio e catalogo, interrogazione
 * del catalogo (REQ-ITIN-001), con i campi e i valori del catalogo esteso (REQ-CAT-001).
 */
export const MODULO_ITINERARY = "itinerary" as const;

export { CODICI_ERRORE, type CodiceErrore, type ErroreValidazione, type RisultatoCaricamento } from "./errori.js";
export { controllaCondizioneMeteo, PRIORITA_PREDEFINITA, VALORI_AMMESSI } from "./valori.js";
export {
  attivitaDellaZona,
  caricaCatalogo,
  caricaCatalogoEsteso,
  trovaAttivita,
  trovaLuogo,
  trovaNelCatalogo,
  trovaZona,
  type VoceCatalogo,
} from "./catalogo.js";
export { caricaViaggio, validaItinerario } from "./viaggio.js";
export { esportaCatalogo, esportaViaggio } from "./esporta.js";
