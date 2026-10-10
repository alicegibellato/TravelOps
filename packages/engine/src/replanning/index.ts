/** Modulo replanning: impatto degli imprevisti e ripianificazione (REQ-REPLAN-001…REQ-REPLAN-004). */
export const MODULO_REPLANNING = "replanning" as const;

export { calcolaImpatto } from "./impatto.js";
export type { ElementoColpitoDettagliato, ImpattoDettagliato } from "./impatto.js";
export {
  proponiRipianificazione,
  type OpzioniRipianificazione,
  type PropostaRipianificazione,
  type PropostaRipianificazioneEstesa,
} from "./proposta.js";
export { arricchisciSorgente } from "./contesto.js";
export {
  INDIRIZZO_POLIZIA,
  INDIRIZZO_RICERCA_MAPPE,
  INDIRIZZO_RICERCA_TRENI,
  INDIRIZZO_RICERCA_VOLI,
  alternativaPolizia,
  alternativeSalute,
  costruisciAlternative,
} from "./alternative.js";
export { FINESTRA_NON_TROVATA, REGOLE_SERVIZIO } from "./ondata2.js";
export { descriviImprevisto } from "./spiegazione.js";
