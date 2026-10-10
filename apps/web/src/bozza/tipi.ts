/**
 * Tipi condivisi tra il servizio della bozza (lato server) e la pagina della bozza nel browser (REQ-PLAN-002). Solo
 * tipi: il browser non carica il motore. Le operazioni sono quelle del motore (`OperazioneBozza`), le stesse per i
 * pulsanti e per la chat.
 */
import type { OperazioneBozza, StileViaggio } from "@travelops/engine";

export type { OperazioneBozza };

/** Un'attività (o un pasto) della bozza come la vede il viaggiatore. */
export interface AttivitaBozzaVista {
  tipo: "attivita";
  /** L'`id` dell'elemento: solo per le azioni e negli attributi `data-*`, mai a vista. */
  id: string;
  nome: string;
  orario: string;
  durata: string | null;
  stile: StileViaggio | null;
  costo: string | null;
  allAperto: boolean | null;
  descrizione: string | null;
  /** I pasti non si bloccano né si sostituiscono dalla scheda. */
  pasto: boolean;
  bloccata: boolean;
  /** Le azioni suggerite per i problemi che la coinvolgono. */
  suggerimenti: string[];
}

export interface SpostamentoBozzaVista {
  tipo: "spostamento";
  id: string;
  orario: string;
  /** Per esempio "A piedi da «Hotel» a «Castello»". */
  testo: string;
  /** Durata dello spostamento in minuti: sotto la soglia breve la pagina lo mostra come connettore compatto. */
  minuti: number;
}

export type VoceBozzaVista = AttivitaBozzaVista | SpostamentoBozzaVista;

export interface GiornoBozzaVista {
  data: string;
  /** Per esempio "sabato 13 giugno 2026". */
  titolo: string;
  voci: VoceBozzaVista[];
  /** Azioni suggerite per i problemi del giorno che non riguardano un'attività. */
  suggerimenti: string[];
}

export interface RevisioneBozzaVista {
  numero: number;
  /** Breve e leggibile, per esempio "Più leggera lunedì" (ST-UX-004A CA-3). */
  etichetta: string;
  causa: string;
}

/** Una proposta nata dopo la conferma (REQ-EDIT-002): si accetta o si rifiuta. */
export interface PropostaBozzaVista {
  id: number;
  /** Per esempio "Togliere «Visita al castello» dal 13 giugno 2026". */
  titolo: string;
  spiegazione: string;
  fattibile: boolean;
  decisione: "in_attesa" | "accettata" | "rifiutata";
}

export interface OpzioneData {
  valore: string;
  etichetta: string;
}

export interface VistaBozza {
  viaggioId: string;
  titolo: string;
  stato: "bozza" | "confermato";
  /** Il numero della revisione corrente (1, 2, …): serve a «Torna a…», non si mostra. */
  revisione: number;
  /** L'etichetta della revisione corrente, per esempio "Sostituita degustazione". */
  etichettaRevisione: string;
  revisioni: RevisioneBozzaVista[];
  /** C'è una modifica da annullare. */
  annullabile: boolean;
  giorni: GiornoBozzaVista[];
  /** Note dell'ultima operazione e problemi da tenere d'occhio, in parole semplici. */
  avvisi: string[];
  /** Le attività che si possono aggiungere, in ordine di punteggio. */
  suggerite: { attivitaId: string; nome: string }[];
  date: OpzioneData[];
  /** Ritmo e stili del profilo della revisione corrente, da cui parte "Cambia preferenze". */
  preferenze: { ritmo: NonNullable<CambioPreferenze["ritmo"]>; stili: StileViaggio[] };
  /** Dopo la conferma: la versione corrente dello storico e le proposte. */
  versione: number | null;
  proposte: PropostaBozzaVista[];
}

export interface AlternativaVista {
  attivitaId: string;
  nome: string;
}

export interface ConfrontoBozzaVista {
  da: number;
  a: number;
  /** Frasi brevi: "Aggiunto «…» il …", "Tolto «…»", "Cambiato l'orario di «…»". */
  cambi: string[];
}

/** Le preferenze che si cambiano dalla pagina della bozza ("Cambia preferenze"). */
export interface CambioPreferenze {
  ritmo?: "lento" | "bilanciato" | "intenso";
  stili?: StileViaggio[];
}

export type EsitoBozza = { ok: true; vista: VistaBozza; messaggio: string | null } | { ok: false; messaggio: string };

export type EsitoCreaBozza = { esito: "creata"; indirizzo: string } | { esito: "errore"; messaggio: string };

/** Ciò che la pagina della bozza chiede al server. In produzione sono azioni lato server. */
export interface AzioniBozza {
  /** Una qualsiasi operazione sulla bozza (CA-1: la stessa che userà lo strumento della chat). */
  opera(operazione: OperazioneBozza): Promise<EsitoBozza>;
  cambiaPreferenze(cambio: CambioPreferenze): Promise<EsitoBozza>;
  alternative(elementoId: string): Promise<AlternativaVista[]>;
  confronta(da: number, a: number): Promise<ConfrontoBozzaVista | null>;
  conferma(): Promise<EsitoBozza>;
  accetta(proposta: number): Promise<EsitoBozza>;
  rifiuta(proposta: number): Promise<EsitoBozza>;
}
