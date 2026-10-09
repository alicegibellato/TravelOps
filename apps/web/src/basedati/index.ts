/**
 * Lo strato di accesso ai dati della web app (REQ-DATA-001): l'unico punto in cui si scrive SQL.
 * Pagine, componenti e operazioni usano solo queste funzioni.
 */
export { apriBaseDati, CHIAVE_PRIMO_AVVIO, conBaseDati } from "./apertura";
export { fileBaseDati, inTransazione, NOME_FILE_BASE_DATI, type BaseDati } from "./connessione";
export {
  aggiungiMessaggio,
  collegaConversazione,
  conversazioniDelViaggio,
  creaConversazione,
  leggiConversazione,
  RUOLI_MESSAGGIO,
  type Conversazione,
  type Messaggio,
  type RuoloMessaggio,
} from "./conversazioni";
export { eliminaImpostazione, leggiImpostazione, scriviImpostazione } from "./impostazioni";
export { elencaIstantanee, leggiIstantanea, salvaIstantanea, type Istantanea } from "./istantanee";
export { applicaMigrazioni, MIGRAZIONI, migrazioniApplicate, type Migrazione } from "./migrazioni";
export { esportaViaggioSalvato, FORMATO_ESPORTAZIONE, importaViaggioSalvato, type EsitoImportazione } from "./trasferimento";
export {
  aggiungiRevisioneBozza,
  elencaProposteDelViaggio,
  elencaRevisioniBozza,
  elencaViaggi,
  eliminaViaggio,
  leggiProfilo,
  leggiStoricoDelViaggio,
  salvaProfilo,
  salvaStoricoDelViaggio,
  salvaViaggio,
  sostituisciProposteDelViaggio,
  STATI_VIAGGIO,
  testoStoricoDelViaggio,
  trovaViaggio,
  type EsitoRevisioni,
  type PropostaRegistrata,
  type RevisioneBozza,
  type StatoViaggio,
  type ViaggioSalvato,
} from "./viaggi";
