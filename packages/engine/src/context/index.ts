/**
 * Modulo context: sorgenti dei dati di contesto (REQ-FEAS-001, `modello-dominio.md` §2.3).
 * Tutte implementano `SorgenteDatiContesto`; chi le usa non sa da dove vengono i dati.
 */
export { FILE_DATI_CONTESTO, creaSorgenteDaFile } from "./sorgente-file.js";
export { conPrevisioni, creaSorgenteDaDati } from "./sorgente-memoria.js";
export { ErroreDatiContesto, validaDatiContesto } from "./validazione.js";
