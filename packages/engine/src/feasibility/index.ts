/** Modulo feasibility: controllo di fattibilità (REQ-FEAS-001). */
export const MODULO_FEASIBILITY = "feasibility" as const;

export {
  CODICI_PROBLEMA_FATTIBILITA,
  ErroreDatiNonValidi,
  GRAVITA_PROBLEMI_FATTIBILITA,
  controllaFattibilita,
  eFattibile,
  type CodiceProblemaFattibilita,
  type ProblemaFattibilita,
} from "./controllo.js";
