/**
 * Tipi del monitoraggio dei viaggi confermati (REQ-MONITOR-001).
 *
 * Il monitoraggio non conosce i servizi esterni: legge meteo ed eventi da una `SorgenteCondizioni`, un'interfaccia
 * minima che chi usa il motore realizza con i propri adattatori (la web app la collega in un solo file, vedi
 * `apps/web/src/monitoraggio/collegamento.ts`). Orologio e registro dei controlli sono iniettati: nessuna rete,
 * nessuna ora di sistema, nessun archivio qui dentro.
 */
import type {
  Catalogo,
  CondizioneMeteo,
  Coordinate,
  Data,
  Imprevisto,
  Orario,
  SorgenteDatiContesto,
  Viaggio,
} from "../model/index.js";
import type { Momento } from "../history/index.js";
import type { ProfiloPreferenze } from "../preferences/tipi.js";
import type { PropostaRipianificazione } from "../replanning/index.js";

/** Risposta di una sorgente: i dati, oppure il motivo per cui mancano (mai un'eccezione). */
export type RisultatoCondizioni<T> = { disponibile: true; dati: T } | { disponibile: false; messaggio: string };

/** Una fascia della giornata con la stessa condizione meteo (orari locali `HH:mm`, la fine può essere `24:00`). */
export interface FasciaCondizione {
  inizio: Orario;
  fine: Orario;
  condizione: CondizioneMeteo;
}

/** Un evento locale. Solo quelli che `chiudeLuogo` toccano le attività: gli altri sono informativi. */
export interface EventoLocale {
  id: string;
  titolo: string;
  data: Data;
  inizio: Orario;
  fine: Orario;
  /** Il luogo del catalogo che l'evento rende inaccessibile in quella fascia. */
  luogoId: string;
  chiudeLuogo: boolean;
}

export interface RichiestaMeteoCondizioni {
  zonaId: string;
  coordinate: Coordinate | null;
  data: Data;
}

export interface RichiestaEventiCondizioni {
  luogoId: string;
  coordinate: Coordinate | null;
  data: Data;
}

/** Cosa serve al monitoraggio dai servizi esterni. */
export interface SorgenteCondizioni {
  meteo(richiesta: RichiestaMeteoCondizioni): Promise<RisultatoCondizioni<readonly FasciaCondizione[]>>;
  eventi(richiesta: RichiestaEventiCondizioni): Promise<RisultatoCondizioni<readonly EventoLocale[]>>;
}

/** L'orologio del controllo (di norma quello simulato della web app). */
export interface Orologio {
  adesso(): Momento;
}

/** Il registro dei controlli: ricorda quali condizioni sono già state segnalate (idempotenza). */
export interface RegistroControlli {
  ha(chiave: string): boolean;
  registra(chiave: string): void;
}

/** Configurazione del monitoraggio, già validata (`leggiConfigMonitoraggio`). */
export interface ConfigMonitoraggio {
  /** Se falso il controllo periodico non parte; resta quello su richiesta. */
  attivo: boolean;
  intervalloSecondi: number;
  /** Quanti giorni, a partire da oggi, si guardano avanti. */
  orizzonteGiorni: number;
}

/** Un viaggio confermato da controllare, con tutto ciò che serve al motore per stimare impatto e proposta. */
export interface ViaggioMonitorato {
  id: string;
  viaggio: Viaggio;
  /** Numero della versione corrente: su di essa si costruisce la proposta. */
  versioneBase: number;
  catalogo: Catalogo;
  contesto: SorgenteDatiContesto;
  profilo?: ProfiloPreferenze;
}

/** Un'attività colpita da un imprevisto rilevato. */
export interface AttivitaColpita {
  elementoId: string;
  attivitaId: string;
  nome: string;
  data: Data;
  inizio: Orario;
  fine: Orario;
}

/** Un nuovo imprevisto con la sua proposta di ripianificazione minima. */
export interface ImprevistoRilevato {
  viaggioId: string;
  versioneBase: number;
  imprevisto: Imprevisto;
  /** La condizione in forma stabile, per esempio `meteo:pioggia` o `chiusura:EV-1`. */
  condizione: string;
  data: Data;
  attivita: AttivitaColpita[];
  /** Le chiavi di idempotenza (`viaggio|attivita|condizione|data`) di questo imprevisto. */
  chiavi: string[];
  /** La frase per la notifica, per esempio «Nuovo imprevisto: pioggia prevista sabato alle 09:00 per «…»». */
  descrizione: string;
  proposta: PropostaRipianificazione;
}

export interface EsitoControllo {
  momento: Momento;
  viaggiControllati: number;
  /** Gli imprevisti nuovi, ognuno con la sua proposta. */
  nuovi: ImprevistoRilevato[];
  /** Condizioni che toccano attività ma già segnalate in precedenza. */
  giaSegnalate: number;
  /** Condizioni avverse che non toccano nessuna attività. */
  senzaImpatto: number;
  /** Messaggi delle sorgenti non disponibili: quella condizione è ignorata, non genera nulla. */
  nonDisponibili: string[];
}

export interface ParametriControllo {
  viaggi: readonly ViaggioMonitorato[];
  sorgente: SorgenteCondizioni;
  orologio: Orologio;
  registro: RegistroControlli;
  config: Pick<ConfigMonitoraggio, "orizzonteGiorni">;
}
