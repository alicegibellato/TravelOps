/** Modulo feasibility: controllo di fattibilità (REQ-FEAS-001) con l'avviso degli orari da verificare (REQ-CAT-001). */
export const MODULO_FEASIBILITY = "feasibility" as const;

export {
  CODICI_AVVISO_CATALOGO,
  CODICI_PROBLEMA_FATTIBILITA,
  ErroreDatiNonValidi,
  GRAVITA_PROBLEMI_FATTIBILITA,
  controllaFattibilita,
  eFattibile,
  type CodiceProblemaFattibilita,
  type ProblemaFattibilita,
} from "./controllo.js";
