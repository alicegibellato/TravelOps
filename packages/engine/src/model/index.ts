/**
 * Tipi del modello di TravelOps (docs/requirements/modello-dominio.md §2).
 *
 * Convenzioni comuni: date `AAAA-MM-GG`, orari `HH:mm` riferiti alla data del
 * giorno e al fuso del viaggio (`24:00` solo come fine), durate in minuti interi.
 */

/** Data nel formato `AAAA-MM-GG`. */
export type Data = string;
/** Orario nel formato `HH:mm`. */
export type Orario = string;

export interface Coordinate {
  lat: number;
  lon: number;
}

// §2.1 Viaggio, giorni, elementi

export type Priorita = "irrinunciabile" | "desiderata" | "opzionale";
export type Mezzo = "piedi" | "mezzi_pubblici" | "treno" | "auto" | "volo";

/** Ordine di preferenza tra mezzi con lo stesso tempo di percorrenza (§2.3). */
export const ORDINE_MEZZI: readonly Mezzo[] = ["piedi", "mezzi_pubblici", "treno", "auto", "volo"];

/** Prenotazione già fatta dal viaggiatore: TravelOps non la modifica mai. */
export interface Prenotazione {
  fornitore: string;
  codice: string;
  /** Link di gestione, solo indirizzi `https://`. */
  linkGestione?: string;
}

interface ElementoBase {
  /** Univoco e stabile tra le versioni; gli id nuovi sono `N<numero>`. */
  id: string;
  inizio: Orario;
  fine: Orario;
  /** Un elemento a orario fisso non viene mai spostato né rimosso. Assente vale `false`. */
  orarioFisso?: boolean;
  prenotazione?: Prenotazione;
}

export interface ElementoAttivita extends ElementoBase {
  tipo: "attivita";
  /** Riferimento all'attività del catalogo; il luogo è quello dell'attività. */
  attivitaId: string;
  /** Assente vale `desiderata`. */
  priorita?: Priorita;
}

export interface ElementoSpostamento extends ElementoBase {
  tipo: "spostamento";
  /** Luogo di partenza. */
  da: string;
  /** Luogo di arrivo. */
  a: string;
  mezzo: Mezzo;
}

export type Elemento = ElementoAttivita | ElementoSpostamento;

export interface Giorno {
  data: Data;
  luogoPartenza: string;
  /** Elementi in ordine di inizio. */
  elementi: Elemento[];
  /** Alloggio della notte; assente nell'ultimo giorno. */
  alloggio?: string;
}

export interface Viaggio {
  id: string;
  titolo: string;
  dataInizio: Data;
  dataFine: Data;
  /** Un solo fuso orario per viaggio, per esempio `Europe/Rome`. */
  fusoOrario: string;
  numeroViaggiatori: number;
  /** Prossimo numero per gli id nuovi (`N<numero>`), intero ≥ 1. */
  prossimoNumeroId: number;
  giorni: Giorno[];
}

// §2.2 Catalogo

export interface Zona {
  id: string;
  nome: string;
  coordinate?: Coordinate;
}

export type TipoLuogo =
  | "alloggio"
  | "ristorante"
  | "museo"
  | "sentiero"
  | "cantina"
  | "aeroporto"
  | "stazione"
  | "altro";

export type GiornoSettimana = "lun" | "mar" | "mer" | "gio" | "ven" | "sab" | "dom";

export interface FasciaOraria {
  apertura: Orario;
  chiusura: Orario;
}

/** Orari di apertura: sempre aperto, oppure fasce per giorno della settimana (nessuna fascia = chiuso). */
export type OrariApertura =
  | { sempre: true }
  | { settimana: Record<GiornoSettimana, FasciaOraria[]> };

export interface Luogo {
  id: string;
  nome: string;
  zonaId: string;
  tipo: TipoLuogo;
  apertura: OrariApertura;
  coordinate?: Coordinate;
}

export type Categoria = "natura" | "cultura" | "gastronomia" | "pasto";

export interface AttivitaCatalogo {
  id: string;
  nome: string;
  luogoId: string;
  categoria: Categoria;
  allAperto: boolean;
  /** Durata tipica in minuti. */
  durataTipica: number;
}

export interface Catalogo {
  zone: Zona[];
  luoghi: Luogo[];
  attivita: AttivitaCatalogo[];
}

// §2.3 Dati di contesto

export interface TempoPercorrenza {
  da: string;
  a: string;
  mezzo: Mezzo;
  /** Minuti necessari, validi in entrambe le direzioni. */
  minuti: number;
}

export type CondizioneMeteo = "sereno" | "nuvoloso" | "pioggia" | "temporale" | "neve";
export type CondizioneAvversa = "pioggia" | "temporale" | "neve";

export const CONDIZIONI_AVVERSE: readonly CondizioneAvversa[] = ["pioggia", "temporale", "neve"];

export interface PrevisioneMeteo {
  zonaId: string;
  data: Data;
  inizio: Orario;
  fine: Orario;
  condizione: CondizioneMeteo;
}

/** Chiusura che vale oltre agli orari di apertura del catalogo. */
export interface ChiusuraStraordinaria {
  luogoId: string;
  data: Data;
  inizio: Orario;
  fine: Orario;
}

/** Contenuto dei dati di contesto, come nei file simulati dell'ondata 1. */
export interface DatiContesto {
  tempiPercorrenza: TempoPercorrenza[];
  previsioni: PrevisioneMeteo[];
  chiusure: ChiusuraStraordinaria[];
}

export interface Percorso {
  mezzo: Mezzo;
  minuti: number;
}

/**
 * Sorgente sostituibile dei dati di contesto: chi la usa non sa se i dati
 * vengono da file simulati (ondata 1) o da servizi reali (ondata 3).
 */
export interface SorgenteDatiContesto {
  /** Minuti tra due luoghi con un mezzo, in entrambe le direzioni; `null` se il percorso non è noto. */
  tempoPercorrenza(da: string, a: string, mezzo: Mezzo): number | null;
  /** Il mezzo più veloce tra due luoghi; a parità di minuti vale `ORDINE_MEZZI`. `null` se non c'è percorso. */
  percorsoPiuVeloce(da: string, a: string): Percorso | null;
  /** Le previsioni di una zona in una data; dove non c'è previsione vale `sereno`. */
  previsioni(zonaId: string, data: Data): PrevisioneMeteo[];
  /** Le chiusure straordinarie di un luogo in una data. */
  chiusure(luogoId: string, data: Data): ChiusuraStraordinaria[];
}

// §2.4 Imprevisti

export interface ImprevistoMeteoAvverso {
  tipo: "METEO_AVVERSO";
  zonaId: string;
  data: Data;
  inizio: Orario;
  fine: Orario;
  condizione: CondizioneAvversa;
}

export interface ImprevistoRitardo {
  tipo: "RITARDO";
  data: Data;
  momento: Orario;
  minuti: number;
  motivo: string;
}

export interface ImprevistoChiusuraLuogo {
  tipo: "CHIUSURA_LUOGO";
  luogoId: string;
  data: Data;
  inizio: Orario;
  fine: Orario;
}

export interface ImprevistoCancellazioneSpostamento {
  tipo: "CANCELLAZIONE_SPOSTAMENTO";
  elementoId: string;
}

/** Ogni imprevisto riguarda un solo giorno. */
export type Imprevisto =
  | ImprevistoMeteoAvverso
  | ImprevistoRitardo
  | ImprevistoChiusuraLuogo
  | ImprevistoCancellazioneSpostamento;

export interface ElementoColpito {
  elementoId: string;
  motivo: string;
  /** Per i ritardi: l'orario a cui l'elemento slitterebbe. */
  inizioSlittato?: Orario;
  fineSlittata?: Orario;
}

export interface Impatto {
  elementiColpiti: ElementoColpito[];
}

// Modifiche richieste dal viaggiatore (glossario; operazioni in REQ-EDIT-001)

export type ModificaRichiesta =
  | { operazione: "aggiungi"; data: Data; attivitaId: string; inizio: Orario; priorita?: Priorita }
  | { operazione: "rimuovi"; elementoId: string }
  | { operazione: "sposta"; elementoId: string; data: Data; inizio: Orario }
  | { operazione: "cambia_priorita"; elementoId: string; priorita: Priorita }
  | { operazione: "imposta_orario_fisso"; elementoId: string; orarioFisso: boolean };

// §2.6 Problemi, proposte, alternative

export type Gravita = "bloccante" | "avviso";

export interface Problema {
  codice: string;
  gravita: Gravita;
  /** Id degli elementi coinvolti. */
  elementi: string[];
  messaggio: string;
}

export type TipoAlternativa = "gestione_prenotazione" | "ricerca_voli" | "ricerca_treni";

/** Link utile proposto al viaggiatore; il motore lo costruisce ma non lo apre. */
export interface Alternativa {
  tipo: TipoAlternativa;
  elementoId: string;
  etichetta: string;
  indirizzo: string;
}

export interface ElementoModificato {
  id: string;
  prima: Elemento;
  dopo: Elemento;
}

export interface Modifiche {
  aggiunti: Elemento[];
  rimossi: Elemento[];
  modificati: ElementoModificato[];
}

export type OrigineProposta =
  | { tipo: "imprevisto"; imprevisto: Imprevisto }
  | { tipo: "modifica"; modifica: ModificaRichiesta };

export interface Proposta {
  /** Numero della versione su cui è costruita. */
  versioneBase: number;
  origine: OrigineProposta;
  impatto: Impatto;
  modifiche: Modifiche;
  /** Itinerario risultante (viaggio completo). */
  itinerario: Viaggio;
  spiegazione: string;
  fattibile: boolean;
  problemi: Problema[];
  /** Id degli elementi a rischio. */
  elementiARischio: string[];
  alternative: Alternativa[];
}
