/** Modulo editing: modifiche richieste dal viaggiatore (REQ-EDIT-001, REQ-EDIT-002). */
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
export {
  CODICI_ERRORE_ONDATA2,
  GIORNI_MASSIMI_PROLUNGA,
  INIZIO_GIORNATA_VUOTA,
  PROBLEMA_ORARIO_FISSO_DA_RIPROGRAMMARE,
  descriviModificaOndata2,
  proponiModificaOndata2,
  type CodiceErroreOndata2,
  type ErroreModificaOndata2,
  type EsitoModificaOndata2,
  type OrigineModificaOndata2,
  type PropostaModificaOndata2,
} from "./ondata2.js";
export { TESTI_LIVELLO } from "./spiegazione.js";
