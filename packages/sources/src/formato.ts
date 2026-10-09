/**
 * Formato dell'istantanea del catalogo di una destinazione (REQ-CAT-002, `modello-dominio-estensioni.md` §7.8).
 *
 * Un'istantanea è il catalogo completo di una destinazione (zone, luoghi, attività, tempi di percorrenza) in un
 * unico JSON, con identificativo, destinazione, data di creazione, fonti usate e loro attribuzioni. Non cambia mai:
 * aggiornare una destinazione crea un'istantanea nuova.
 *
 * Il formato è un `IstantaneaCatalogo` del motore con qualche campo in più, tutti dichiarati qui (il motore non
 * cambia): la versione del formato, l'area trovata dalla ricerca, gli stili dichiarati scarsi (§8.1), autore e
 * licenza di ogni immagine (CA-6) e la marcatura dei tempi stimati (mezzi pubblici). Il motore riceve l'istantanea
 * come un normale catalogo esteso e i tempi come dati di contesto: i campi in più non lo riguardano.
 */
import type {
  AttivitaCatalogoEstesa,
  Coordinate,
  Data,
  FonteIstantanea,
  Immagine,
  IstantaneaCatalogo,
  StileViaggio,
  TempoPercorrenza,
} from "@travelops/engine";

/** La versione del formato scritta in ogni istantanea (`"formato": 1`). */
export const VERSIONE_FORMATO = 1 as const;

/** Attribuzione obbligatoria dei dati OpenStreetMap (licenza ODbL), da mostrare sulla mappa e nei dettagli. */
export const ATTRIBUZIONE_OSM = "© OpenStreetMap contributors" as const;

/**
 * Identificativo di un'istantanea: lettere minuscole, cifre e trattini, senza trattino iniziale.
 * È anche il nome del file nel repository (`<id>.json`) e la chiave nel database.
 */
export const FORMATO_ID_ISTANTANEA = /^[a-z0-9][a-z0-9-]*$/;

/**
 * L'area di una destinazione, come la restituisce la ricerca (Nominatim nella sorgente reale) e come resta
 * registrata nell'istantanea costruita su di essa.
 */
export interface AreaDestinazione {
  /** Identificativo stabile dell'area, per esempio `osm:relation/44915`: è la chiave per ritrovarne le istantanee. */
  id: string;
  /** Nome breve da mostrare, per esempio `Roma`. */
  nome: string;
  /** Descrizione completa (per esempio il `display_name` di Nominatim), per distinguere luoghi omonimi. */
  descrizione: string;
  /** Il centro dell'area: da qui si cercano i luoghi (circa 60 minuti). */
  centro: Coordinate;
  /** Identificativo OpenStreetMap dell'area (`node/…`, `way/…`, `relation/…`), se c'è. */
  osmId?: string;
}

/** Uno stile che la destinazione non ha abbastanza (meno di 2 attività), dichiarato come chiede la §8.1. */
export interface StileScarso {
  stile: StileViaggio;
  /** Perché la destinazione non ne ha abbastanza, in italiano per il viaggiatore. */
  motivo: string;
}

/** Immagine di un'attività con autore e licenza separati (CA-6), oltre all'attribuzione completa del motore. */
export interface ImmagineIstantanea extends Immagine {
  autore: string;
  /** Nome della licenza, per esempio `CC BY-SA 4.0`. */
  licenza: string;
  /** Indirizzo del testo della licenza, se noto. */
  urlLicenza?: string;
  /** Pagina della fonte dell'immagine (per esempio la pagina del file su Wikimedia Commons), se nota. */
  urlFonte?: string;
}

/** Attività di un'istantanea: un'attività del catalogo esteso con l'immagine completa di autore e licenza. */
export interface AttivitaIstantanea extends Omit<AttivitaCatalogoEstesa, "immagine"> {
  immagine?: ImmagineIstantanea;
}

/**
 * Tempo di percorrenza di un'istantanea. `stima: true` marca un tempo stimato e non misurato: per i mezzi pubblici
 * è sempre così (tempo in auto × 1,5 + 10 minuti, REQ-CAT-002), perché gli orari reali sono fuori perimetro.
 */
export interface TempoPercorrenzaIstantanea extends TempoPercorrenza {
  stima?: true;
}

/** Fonte usata per costruire l'istantanea: nome, attribuzione da mostrare e, se nota, licenza dei dati. */
export interface FonteIstantaneaDestinazione extends FonteIstantanea {
  licenza?: string;
}

/**
 * Istantanea di una destinazione, come la scrive la sorgente e la legge `leggiIstantanea`. È anche un
 * `IstantaneaCatalogo` del motore: si passa così com'è a chi si aspetta un catalogo esteso.
 */
export interface IstantaneaDestinazione extends Omit<IstantaneaCatalogo, "attivita" | "tempiPercorrenza" | "fonti"> {
  formato: typeof VERSIONE_FORMATO;
  id: string;
  /** Nome della destinazione da mostrare, per esempio `Lago di Garda (Riva del Garda e dintorni)`. */
  destinazione: string;
  area: AreaDestinazione;
  /** Data di creazione `AAAA-MM-GG`: è un dato dell'istantanea, mai letta dall'orologio. */
  dataCreazione: Data;
  fonti: FonteIstantaneaDestinazione[];
  /** Stili con meno di 2 attività, dichiarati (§8.1). Assente vale nessuno. */
  stiliScarsi?: StileScarso[];
  attivita: AttivitaIstantanea[];
  tempiPercorrenza: TempoPercorrenzaIstantanea[];
}

/** Riepilogo di un'istantanea, senza il catalogo: per elenchi e scelte. */
export interface RiepilogoIstantanea {
  id: string;
  destinazione: string;
  area: AreaDestinazione;
  dataCreazione: Data;
}

export function riepilogoIstantanea(istantanea: IstantaneaDestinazione): RiepilogoIstantanea {
  return {
    id: istantanea.id,
    destinazione: istantanea.destinazione,
    area: istantanea.area,
    dataCreazione: istantanea.dataCreazione,
  };
}

/** Controllo a tempo di compilazione: un'istantanea si usa dove il motore vuole un `IstantaneaCatalogo`. */
export function comeIstantaneaCatalogo(istantanea: IstantaneaDestinazione): IstantaneaCatalogo {
  return istantanea;
}
