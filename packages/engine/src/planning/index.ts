/**
 * Modulo planning: generatore della prima bozza dell'itinerario dal profilo delle preferenze e dall'istantanea
 * della destinazione, con la spiegazione di ogni giornata e l'alternativa (REQ-PLAN-001).
 */
export const MODULO_PLANNING = "planning" as const;

export {
  ErroreBozza,
  FINESTRE_PASTI,
  FUSO_ORARIO_PREDEFINITO,
  ORARIO_ARRIVO_PREDEFINITO,
  ORARIO_PARTENZA_PREDEFINITO,
  TENTATIVI_MASSIMI,
  type AttivitaTolta,
  type BozzaItinerario,
  type GiornoBozza,
  type OpzioniBozza,
  type Pasto,
} from "./tipi.js";
export {
  attivitaDaSostituire,
  attivitaPrevistePerGiorno,
  generaAlternativa,
  generaBozza,
  scegliAlloggio,
} from "./generatore.js";
