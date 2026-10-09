/**
 * Modulo catalog: tabella e regole deterministiche che trasformano un luogo reale di OpenStreetMap in un luogo
 * e in un'attività del catalogo esteso, orari predefiniti e lettura di `opening_hours` (REQ-CAT-001).
 */
export const MODULO_CATALOG = "catalog" as const;

export {
  ORARI_PREDEFINITI,
  REGOLE_PREZZO,
  REGOLE_SENTIERI,
  TABELLA_CLASSIFICAZIONE,
  type CondizioneTag,
  type RegolaAttivita,
  type RegolaClassificazione,
} from "./tabella.js";
export { leggiOrariOsm } from "./orari-osm.js";
export {
  classificaLuogoOsm,
  costoDaPrezzo,
  durataSentiero,
  idLuogoOsm,
  intensitaSentiero,
  orariDelLuogo,
  regolaPerTag,
  type ElementoOsm,
  type LuogoClassificato,
  type OrariLuogo,
} from "./classifica.js";
