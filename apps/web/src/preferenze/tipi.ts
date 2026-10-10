/**
 * Tipi condivisi tra le azioni lato server e il percorso guidato nel browser (REQ-PREF-001). Solo tipi del motore:
 * il browser non carica il motore, che gira sul server (validazione e valori ammessi arrivano da lì).
 */
import type {
  BozzaProfilo,
  Budget,
  CampoProfilo,
  Esigenza,
  FormaFisica,
  MezzoProfilo,
  OrariProfilo,
  ProblemaProfilo,
  Ritmo,
  TipoGruppo,
} from "@travelops/engine";
import type { EsitoCreaBozza } from "../bozza/tipi";

export type { BozzaProfilo, EsitoCreaBozza, ProblemaProfilo };

export interface OpzioneScelta<T extends string = string> {
  valore: T;
  etichetta: string;
  descrizione?: string;
}

/** Valori ammessi, etichette e predefiniti del profilo, letti dal motore sul server. */
export interface OpzioniPercorso {
  tipiGruppo: OpzioneScelta<TipoGruppo>[];
  ritmi: OpzioneScelta<Ritmo>[];
  formeFisiche: OpzioneScelta<FormaFisica>[];
  budget: OpzioneScelta<Budget>[];
  orari: OpzioneScelta<OrariProfilo>[];
  mezzi: OpzioneScelta<MezzoProfilo>[];
  esigenze: OpzioneScelta<Esigenza>[];
  etichetteCampo: Record<CampoProfilo, string>;
  durataMinima: number;
  durataMassima: number;
  etaMassimaBambino: number;
  predefiniti: {
    adulti: number;
    stili: string[];
    ritmo: Ritmo;
    formaFisica: FormaFisica;
    budget: Budget;
    orari: OrariProfilo;
    pasti: { pranzo: boolean; cena: boolean };
    mezzi: MezzoProfilo[];
  };
}

/** Una destinazione precaricata, mostrata come scheda. */
export interface DestinazionePrecaricata {
  id: string;
  nome: string;
}

export type EsitoSalvataggio =
  | { esito: "salvato" }
  | { esito: "incompleto"; problemi: ProblemaProfilo[] }
  | { esito: "errore"; messaggio: string };

/** Ciò che il percorso chiede al server. In produzione sono azioni lato server. */
export interface ServizioPreferenze {
  valida(bozza: BozzaProfilo): Promise<ProblemaProfilo[]>;
  salva(bozza: BozzaProfilo): Promise<EsitoSalvataggio>;
  /** Prepara la prima bozza dal profilo salvato (REQ-PLAN-002) e restituisce l'indirizzo della sua pagina. */
  creaBozza?(bozza: BozzaProfilo): Promise<EsitoCreaBozza>;
}
