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

export interface Luogo extends CampiLuogoEstesi {
  id: string;
  nome: string;
  zonaId: string;
  tipo: TipoLuogo;
  apertura: OrariApertura;
  coordinate?: Coordinate;
}

export type Categoria = "natura" | "cultura" | "gastronomia" | "pasto";

export interface AttivitaCatalogo extends CampiAttivitaEstesi {
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

// Estensioni del catalogo dell'ondata 2 (modello-dominio-estensioni.md §7.3, §7.8)
//
// I campi nuovi sono tutti facoltativi: un catalogo dell'ondata 1 resta valido e si comporta come prima.
// I valori nuovi di tipo di luogo e categoria stanno in tipi separati (`TipoLuogoEsteso`, `CategoriaEstesa`)
// e nel `CatalogoEsteso`: `Catalogo`, `TipoLuogo` e `Categoria` restano quelli dell'ondata 1, così chi li usa
// (per esempio con un'etichetta per ogni valore) non cambia.

/** Stili di viaggio (§7.2), nell'ordine canonico. */
export type StileViaggio = "relax" | "cultura" | "natura" | "avventura" | "gastronomia" | "romantico" | "famiglia";
export type Intensita = "facile" | "moderata" | "impegnativa";
/** Costo indicativo per persona: `gratis` oppure una fascia da `€` a `€€€`. */
export type Costo = "gratis" | "€" | "€€" | "€€€";
export type OpzioneAlimentare = "vegetariano" | "senza_glutine";
/** Da dove viene un luogo: dati di riferimento dell'ondata 1 oppure OpenStreetMap. */
export type OrigineLuogo = "riferimento" | "osm";

/** Immagine di un'attività: percorso locale e attribuzione (autore e licenza). */
export interface Immagine {
  percorso: string;
  attribuzione: string;
}

/** Campi del luogo aggiunti dalla §7.3, tutti facoltativi. */
export interface CampiLuogoEstesi {
  /** Costo indicativo, per i ristoranti. */
  costoIndicativo?: Costo;
  opzioniAlimentari?: OpzioneAlimentare[];
  origine?: OrigineLuogo;
  /** Identificativo OpenStreetMap (`node/123`, `way/123`, `relation/123`), solo con origine `osm`. */
  osmId?: string;
  /**
   * `true` se gli orari vengono dal tag `opening_hours` (o dai dati di riferimento), `false` se sono
   * orari predefiniti per tipo di luogo. Assente vale `true`: i luoghi dell'ondata 1 non cambiano.
   */
  orariVerificati?: boolean;
  fonteDescrizione?: string;
  attribuzioneImmagine?: string;
}

/** Campi dell'attività di catalogo aggiunti dalla §7.3, tutti facoltativi. */
export interface CampiAttivitaEstesi {
  /** Uno o più stili, senza ripetizioni. */
  stili?: StileViaggio[];
  intensita?: Intensita;
  costo?: Costo;
  adattaAiBambini?: boolean;
  accessibile?: boolean;
  /** Mesi consigliati, da 1 (gennaio) a 12 (dicembre). */
  mesiConsigliati?: number[];
  /** Una frase per il viaggiatore. */
  descrizioneBreve?: string;
  immagine?: Immagine;
}

export type TipoLuogoAggiunto =
  | "spiaggia"
  | "punto_panoramico"
  | "parco"
  | "impianto"
  | "negozio"
  | "farmacia"
  | "ospedale";
/** Tipi di luogo dell'ondata 1 più quelli aggiunti dalla §7.3. */
export type TipoLuogoEsteso = TipoLuogo | TipoLuogoAggiunto;

export type CategoriaAggiunta = "servizio";
/** Categorie dell'ondata 1 più `servizio` (§7.3, §8.5). */
export type CategoriaEstesa = Categoria | CategoriaAggiunta;

/** Luogo con i tipi della §7.3. */
export interface LuogoEsteso extends Omit<Luogo, "tipo"> {
  tipo: TipoLuogoEsteso;
}

/** Attività di catalogo con le categorie della §7.3. */
export interface AttivitaCatalogoEstesa extends Omit<AttivitaCatalogo, "categoria"> {
  categoria: CategoriaEstesa;
}

/** Catalogo con i valori della §7.3. Ogni `Catalogo` dell'ondata 1 è anche un `CatalogoEsteso`. */
export interface CatalogoEsteso {
  zone: Zona[];
  luoghi: LuogoEsteso[];
  attivita: AttivitaCatalogoEstesa[];
}

/** Una fonte usata per costruire un'istantanea, con la sua attribuzione (§7.8). */
export interface FonteIstantanea {
  nome: string;
  attribuzione: string;
}

/**
 * Istantanea del catalogo di una destinazione (§7.8): non cambia mai. Il motore la usa come un normale
 * catalogo (è un `CatalogoEsteso`) e i suoi tempi di percorrenza come dati di contesto.
 */
export interface IstantaneaCatalogo extends CatalogoEsteso {
  id: string;
  destinazione: string;
  /** Data di creazione `AAAA-MM-GG`: è un dato dell'istantanea, mai letta dall'orologio. */
  dataCreazione: Data;
  fonti: FonteIstantanea[];
  tempiPercorrenza: TempoPercorrenza[];
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

// §7.4 Imprevisti aggiunti dall'ondata 2 (modello-dominio-estensioni.md). Restano fuori da `Imprevisto`,
// così chi lo usa (storico, proposte, spiegazioni) non cambia; li accetta il calcolo dell'impatto.

/** Una data e un orario: l'arrivo previsto dopo un volo perso può cadere in un altro giorno. */
export interface MomentoDelViaggio {
  data: Data;
  orario: Orario;
}

export interface ImprevistoVoloPerso {
  tipo: "VOLO_PERSO";
  /** Id dello spostamento in volo o in treno perso. */
  elementoId: string;
  /** Arrivo previsto con il nuovo mezzo, facoltativo. */
  arrivoPrevisto?: MomentoDelViaggio;
}

export interface ImprevistoSalute {
  tipo: "SALUTE";
  dataInizio: Data;
  /** Numero di giorni consecutivi, almeno 1. Assente vale fino alla fine del viaggio. */
  giorni?: number;
  intensitaMassima: Intensita;
  mobilitaRidotta: boolean;
  descrizione: string;
}

/** I mezzi che possono essere colpiti da uno sciopero (§7.4). */
export type MezzoSciopero = "mezzi_pubblici" | "treno";

export interface ImprevistoSciopero {
  tipo: "SCIOPERO";
  mezzo: MezzoSciopero;
  data: Data;
  /** Facoltativa: senza zona lo sciopero vale per tutti gli spostamenti con quel mezzo. */
  zonaId?: string;
}

export interface ImprevistoBagaglioSmarrito {
  tipo: "BAGAGLIO_SMARRITO";
  data: Data;
  momento: Orario;
}

export interface ImprevistoDocumentiSmarriti {
  tipo: "DOCUMENTI_SMARRITI";
  data: Data;
  momento: Orario;
}

export interface ImprevistoStanchezza {
  tipo: "STANCHEZZA";
  data: Data;
}

/** Imprevisti della §7.4: `VOLO_PERSO` e `SALUTE` possono riguardare più giorni consecutivi. */
export type ImprevistoOndata2 =
  | ImprevistoVoloPerso
  | ImprevistoSalute
  | ImprevistoSciopero
  | ImprevistoBagaglioSmarrito
  | ImprevistoDocumentiSmarriti
  | ImprevistoStanchezza;

/** Tutti gli imprevisti: i quattro dell'ondata 1 e i sei della §7.4. */
export type ImprevistoEsteso = Imprevisto | ImprevistoOndata2;

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

/** Ritmo richiesto per un giorno (REQ-EDIT-002 R2-RIT). */
export type RitmoGiorno = "piu_leggero" | "piu_pieno";

/**
 * Modifiche richieste aggiunte da REQ-EDIT-002 (R2-PRO, R2-ACC, R2-RIT, R2-RIG). Sono un tipo separato da
 * `ModificaRichiesta`, come `ImprevistoEsteso`: le operazioni di REQ-EDIT-001 e i loro risultati (M1…M6) non cambiano.
 */
export type ModificaOndata2 =
  /** Prolunga il soggiorno di `giorni` giorni dopo la data `dopo`. */
  | { operazione: "prolunga"; dopo: Data; giorni: number }
  /** Accorcia il viaggio di `giorni` giorni, togliendo gli ultimi. */
  | { operazione: "accorcia"; giorni: number }
  | { operazione: "cambia_ritmo"; data: Data; ritmo: RitmoGiorno }
  | { operazione: "rigenera_giorno"; data: Data };

export type ModificaEstesa = ModificaRichiesta | ModificaOndata2;

/** Livello di ripianificazione di una proposta (`modello-dominio-estensioni.md` §7.6). */
export type LivelloRipianificazione = "minimo" | "giornata" | "resto";

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
  /** Livello di ripianificazione (§7.6); assente nelle proposte dell'ondata 1. */
  livello?: LivelloRipianificazione;
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
