/** Modulo monitoring: controllo dei viaggi confermati (REQ-MONITOR-001). */
export const MODULO_MONITORING = "monitoring" as const;

export { PREDEFINITI_MONITORAGGIO, leggiConfigMonitoraggio, type ConfigMonitoraggioLetta } from "./config.js";
export { aggiungiGiorni, eseguiControllo } from "./controllo.js";
export { creaSorgenteCondizioniFinta, leggiScenarioFinto, type MeteoFinto, type ScenarioFinto, type SorgenteCondizioniFinta } from "./finto.js";
export { creaPianificatore, timerDiSistema, type OpzioniPianificatore, type Pianificatore, type TimerPianificatore } from "./pianificatore.js";
export { chiaveControllo, creaRegistroInMemoria, type RegistroInMemoria } from "./registro.js";
export { descriviNotifica, giornoDellaSettimana } from "./testi.js";
export type {
  AttivitaColpita,
  ConfigMonitoraggio,
  EsitoControllo,
  EventoLocale,
  FasciaCondizione,
  ImprevistoRilevato,
  Orologio,
  ParametriControllo,
  RegistroControlli,
  RichiestaEventiCondizioni,
  RichiestaMeteoCondizioni,
  RisultatoCondizioni,
  SorgenteCondizioni,
  ViaggioMonitorato,
} from "./tipi.js";
