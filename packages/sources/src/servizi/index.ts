/**
 * Servizi esterni a porte e adattatori (REQ-INTEG-001): meteo, geocoding, percorsi, voli, eventi. Ogni porta ha un
 * adattatore finto (predefinito, senza rete) e uno reale scelto da variabile d'ambiente (`leggiConfigurazioneServizi`).
 */
export * from "./risultato.js";
export * from "./cache.js";
export * from "./configurazione.js";
export * from "./meteo.js";
export * from "./percorsi.js";
export * from "./voli.js";
export * from "./eventi.js";
export * from "./viaggio.js";
export * from "./registro.js";
