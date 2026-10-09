/**
 * L'interfaccia unica "sorgente di destinazioni" (REQ-CAT-002) e i contratti che la realizzazione reale dovrà
 * rispettare (ST-CAT-002). Chi la usa (web app, agenti) non sa se i dati vengono dalla rete o dal repository.
 *
 * Due realizzazioni:
 * - **registrata** (`creaSorgenteRegistrata`, in questo pacchetto): legge istantanee e risposte salvate nel
 *   repository; per i test e per lavorare senza rete;
 * - **reale** (ST-CAT-002): Nominatim, Overpass, Wikipedia e Wikivoyage, Wikimedia Commons e OSRM. Qui c'è solo il
 *   suo contratto: `CreaSorgenteReale`, `OpzioniSorgenteReale`, `ClienteFonti` e `Orologio`.
 */
import type { AreaDestinazione, IstantaneaDestinazione, RiepilogoIstantanea } from "./formato.js";
import type { MancanzaMinimo } from "./minimi.js";

/** I passi della costruzione di una destinazione, nell'ordine in cui avvengono (REQ-CAT-002). */
export const PASSI_COSTRUZIONE = [
  "luoghi",
  "classificazione",
  "ristoranti",
  "descrizioni",
  "immagini",
  "percorsi",
  "minimi",
] as const;

export type PassoCostruzione = (typeof PASSI_COSTRUZIONE)[number];

/** Il messaggio di avanzamento di ogni passo, per il viaggiatore. */
export const MESSAGGI_AVANZAMENTO: Readonly<Record<PassoCostruzione, string>> = {
  luoghi: "Cerco i luoghi…",
  classificazione: "Scelgo le attività…",
  ristoranti: "Scelgo i ristoranti…",
  descrizioni: "Preparo le descrizioni…",
  immagini: "Cerco le immagini…",
  percorsi: "Calcolo i percorsi…",
  minimi: "Controllo che ci sia tutto…",
};

/** Un passo di avanzamento: quale passo, il suo messaggio e quanti passi ci sono in tutto. */
export interface Avanzamento {
  passo: PassoCostruzione;
  messaggio: string;
  /** Posizione del passo, da 1 a `totale`. */
  numero: number;
  totale: number;
}

export interface OpzioniRicerca {
  /** Quanti risultati al massimo (predefinito 5). */
  limite?: number;
  /** Per annullare una ricerca superata da una battuta successiva. */
  segnale?: AbortSignal;
}

export interface OpzioniCostruzione {
  /** Chiamata a ogni passo della costruzione, nell'ordine di `PASSI_COSTRUZIONE`. */
  avanzamento?: (avanzamento: Avanzamento) => void;
  segnale?: AbortSignal;
}

/** Quanti risultati restituisce la ricerca se non si indica `limite`. */
export const LIMITE_RICERCA_PREDEFINITO = 5;

/**
 * Esito della costruzione di una destinazione:
 * - `ok`: l'istantanea, valida e con i minimi della §8.1 rispettati;
 * - `minimi_non_rispettati`: la destinazione è troppo piccola; c'è un messaggio gentile per il viaggiatore, le
 *   mancanze e 2 o 3 destinazioni vicine più grandi da proporre (CA-5, realizzato in ST-CAT-002);
 * - `non_disponibile`: la sorgente non può costruirla (per esempio la sorgente registrata non ha quell'area, o la
 *   rete non risponde); c'è un messaggio per il viaggiatore.
 */
export type EsitoCostruzione =
  | { ok: true; istantanea: IstantaneaDestinazione }
  | {
      ok: false;
      motivo: "minimi_non_rispettati";
      messaggio: string;
      mancanze: MancanzaMinimo[];
      alternative: AreaDestinazione[];
    }
  | { ok: false; motivo: "non_disponibile"; messaggio: string };

/** La sorgente di destinazioni: un'interfaccia sola per la realizzazione reale e per quella registrata. */
export interface SorgenteDestinazioni {
  readonly tipo: "reale" | "registrata";
  /**
   * Suggerimenti mentre il viaggiatore scrive: le aree che corrispondono al testo, al massimo `limite`, in ordine
   * di pertinenza. Un testo vuoto (o di un solo carattere) non dà risultati. L'attesa tra una battuta e la ricerca
   * (300 ms) spetta all'interfaccia; il limite di 1 richiesta al secondo verso Nominatim alla sorgente reale.
   */
  cercaDestinazioni(testo: string, opzioni?: OpzioniRicerca): Promise<AreaDestinazione[]>;
  /** Costruisce l'istantanea di un'area trovata dalla ricerca, segnalando l'avanzamento passo per passo. */
  costruisciIstantanea(area: AreaDestinazione, opzioni?: OpzioniCostruzione): Promise<EsitoCostruzione>;
  /** Un'istantanea già costruita, dal suo identificativo; `null` se la sorgente non la conosce. */
  leggiIstantanea(id: string): Promise<IstantaneaDestinazione | null>;
  /** Le istantanee che la sorgente conosce già, ordinate per identificativo. */
  elencaIstantanee(): Promise<RiepilogoIstantanea[]>;
}

// Contratto della realizzazione reale (ST-CAT-002)

/** I servizi esterni della §5.3 di REQ-CAT-002. */
export const SERVIZI_FONTE = ["nominatim", "overpass", "wikipedia", "wikivoyage", "commons", "osrm"] as const;
export type ServizioFonte = (typeof SERVIZI_FONTE)[number];

/** Una richiesta a un servizio esterno. Nessun segreto: i servizi della §5.3 non hanno chiavi. */
export interface RichiestaFonte {
  servizio: ServizioFonte;
  /** Indirizzo completo, parametri inclusi, in forma canonica (parametri in ordine) così la cache e le registrazioni lo ritrovano. */
  url: string;
  /** Predefinito `GET`. Overpass accetta anche `POST` con la query nel corpo. */
  metodo?: "GET" | "POST";
  corpo?: string;
}

/** La risposta di un servizio esterno: codice HTTP e corpo JSON già decodificato. */
export interface RispostaFonte {
  stato: number;
  corpo: unknown;
}

/**
 * Il cliente che parla con i servizi esterni. La sorgente reale lo riceve dall'esterno: in produzione fa le
 * richieste HTTP (con User-Agent di TravelOps e cache), nei test è `creaClienteRegistrato`, che risponde con le
 * risposte salvate e non usa mai la rete (CA-7).
 */
export interface ClienteFonti {
  richiedi(richiesta: RichiestaFonte, opzioni?: { segnale?: AbortSignal }): Promise<RispostaFonte>;
}

/** L'orologio della sorgente reale, sostituibile con uno finto nei test del limite di 1 richiesta al secondo (CA-4). */
export interface Orologio {
  /** Millisecondi da un'origine qualsiasi, crescenti. */
  adesso(): number;
  attendi(millisecondi: number): Promise<void>;
}

/** Le opzioni con cui si crea la sorgente reale. */
export interface OpzioniSorgenteReale {
  cliente: ClienteFonti;
  /** User-Agent che identifica TravelOps, obbligatorio per Nominatim. */
  userAgent: string;
  orologio: Orologio;
  /** Le istantanee già costruite (per esempio quelle del database): una destinazione già vista è immediata. */
  istantaneeNote?: (areaId: string) => IstantaneaDestinazione | null;
  /** Data di creazione delle istantanee nuove (`AAAA-MM-GG`), data dall'esterno: la sorgente non legge l'orologio di sistema per i dati. */
  dataCreazione: () => string;
}

/** La firma della funzione che ST-CAT-002 dovrà esportare da questo pacchetto. */
export type CreaSorgenteReale = (opzioni: OpzioniSorgenteReale) => SorgenteDestinazioni;
