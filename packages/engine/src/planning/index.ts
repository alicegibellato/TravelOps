/**
 * Modulo planning: generatore della prima bozza dell'itinerario dal profilo delle preferenze e dall'istantanea
 * della destinazione, con la spiegazione di ogni giornata e l'alternativa (REQ-PLAN-001); revisioni e conferma della
 * bozza (REQ-PLAN-002).
 */
export const MODULO_PLANNING = "planning" as const;

export {
  ErroreBozza,
  FINESTRE_PASTI,
  FUSO_ORARIO_PREDEFINITO,
  ORARIO_ARRIVO_PREDEFINITO,
  ORARIO_PARTENZA_PREDEFINITO,
  TENTATIVI_MASSIMI,
  type AttivitaDaMantenere,
  type AttivitaTolta,
  type BozzaItinerario,
  type GiornoBozza,
  type OpzioniBozza,
  type Pasto,
} from "./tipi.js";
export {
  attivitaCandidate,
  attivitaDaSostituire,
  attivitaPrevistePerGiorno,
  generaAlternativa,
  generaBozza,
  ricostruisciGiornata,
  scegliAlloggio,
  type GiornataBozza,
  type RichiestaGiornataBozza,
} from "./generatore.js";
export {
  ALTERNATIVE_SOSTITUZIONE,
  CAUSA_BOZZA_INIZIALE,
  OPERAZIONI_BOZZA,
  alternativeSostituzione,
  applicaOperazioneBozza,
  attivitaSuggerite,
  avviaBozza,
  bloccateDelViaggio,
  confermaBozza,
  confrontaRevisioni,
  propostaDopoConferma,
  revisioneCorrente,
  ricostruisciStatoBozza,
  type AlternativaSostituzione,
  type ContestoBozza,
  type EsitoConfermaBozza,
  type EsitoOperazioneBozza,
  type EsitoPropostaBozza,
  type OperazioneBozza,
  type RevisioneBozza,
  type RevisioneSalvata,
  type StatoBozza,
  type SuggerimentoBozza,
  type TipoOperazioneBozza,
} from "./revisioni.js";
