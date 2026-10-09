/** Modulo history: versioni e storico dell'itinerario (REQ-ITIN-002). */
export const MODULO_HISTORY = "history" as const;

export {
  CAMPI_ELEMENTO,
  CAUSA_ITINERARIO_INIZIALE,
  CODICI_STORICO,
  type CampoCambiato,
  type CampoElemento,
  type CodiceStorico,
  type ConfrontoVersioni,
  type DifferenzaItinerari,
  type ElementoCambiato,
  type ElementoDatato,
  type EsitoApplicazione,
  type EsitoConfronto,
  type EsitoLettura,
  type EsitoRifiuto,
  type EsitoStorico,
  type Momento,
  type SegnalazioneStorico,
  type Storico,
  type ValoreCampo,
  type Versione,
  type VoceStorico,
} from "./tipi.js";
export { causaVersione, descriviModifica, type OrigineConDescrizione } from "./causa.js";
export { confrontaItinerari } from "./confronto.js";
export {
  applicaProposta,
  confrontaVersioni,
  creaStorico,
  elencaVersioni,
  leggiVersione,
  rifiutaProposta,
  versioneCorrente,
  viaggioCorrente,
} from "./storico.js";
export { esportaStorico, importaStorico } from "./esporta.js";
