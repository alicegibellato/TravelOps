/**
 * Modulo preferences: profilo delle preferenze del viaggio (§7.2), validazione con i problemi in parole semplici
 * e punteggio delle attività rispetto al profilo (§7.7) (REQ-PREF-001, parte del motore).
 */
export const MODULO_PREFERENCES = "preferences" as const;

export {
  ATTIVITA_PER_RITMO,
  BUDGET,
  CAMPI_OBBLIGATORI,
  CAMPI_PROFILO,
  DURATA_MASSIMA,
  DURATA_MINIMA,
  ESIGENZE,
  ETA_MASSIMA_BAMBINO,
  ETICHETTE_PROFILO,
  FINESTRA_GIORNATA,
  FORME_FISICHE,
  gruppoDaViaggiatori,
  INTENSITA_MASSIMA,
  MEZZI_PROFILO,
  ORARI_PROFILO,
  PASSO_DEL_CAMPO,
  PROFILO_PREDEFINITO,
  RITMI,
  TIPI_GRUPPO,
  type BozzaProfilo,
  type Budget,
  type CampoObbligatorio,
  type CampoProfilo,
  type DaEvitare,
  type DateProfilo,
  type DestinazioneProfilo,
  type Esigenza,
  type FormaFisica,
  type Irrinunciabili,
  type MezzoProfilo,
  type OrariProfilo,
  type PastiNelPiano,
  type ProfiloPreferenze,
  type Ritmo,
  type TipoGruppo,
  type Viaggiatori,
} from "./tipi.js";
export {
  cosaManca,
  daEvitareComprende,
  validaProfilo,
  type EsitoProfilo,
  type OpzioniValidazione,
  type ProblemaProfilo,
} from "./validazione.js";
export {
  classificaAttivita,
  confrontaValutazioni,
  MOTIVI_ESCLUSIONE,
  PUNTI,
  punteggioAttivita,
  TESTO_ESCLUSIONE,
  valutaAttivita,
  type ClassificaAttivita,
  type MotivoEsclusione,
  type ValutazioneAttivita,
} from "./punteggio.js";
