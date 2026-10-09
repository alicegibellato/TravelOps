/** Modulo editing: modifiche richieste dal viaggiatore (REQ-EDIT-001). */
export const MODULO_EDITING = "editing" as const;

export {
  proponiModifica,
  type EsitoModifica,
  type OrigineModifica,
  type PropostaModifica,
} from "./proposta.js";
export {
  CODICI_ERRORE_MODIFICA,
  type CodiceErroreModifica,
  type ErroreModifica,
} from "./errori.js";
export { PRIORITA_AGGIUNTA } from "./operazioni.js";
