/**
 * Lo stato su cui lavorano gli strumenti del motore (ST-ORCH-001B): un viaggio, passato da fuori.
 *
 * Gli strumenti non sanno dove stanno i dati: la web app collega `ArchivioViaggio` al proprio database
 * (ST-CHAT-001C, tabelle di REQ-DATA-001: viaggi, profili, istantanee, revisioni della bozza, storico, proposte),
 * i test usano `creaArchivioInMemoria`. Un archivio riguarda **un solo viaggio**: quello della conversazione. Se il
 * viaggio non esiste ancora (la conversazione nasce dalla home), è l'archivio a crearlo alla prima scrittura.
 *
 * L'archivio è l'unica strada con cui gli strumenti cambiano un viaggio, e gli strumenti sono l'unica strada con
 * cui un agente lo cambia (REQ-ORCH-001 CA-2). I metodi possono essere sincroni (better-sqlite3) o asincroni.
 */
import type { BozzaProfilo, IstantaneaCatalogo, Proposta, PropostaRipianificazioneEstesa, Storico, Viaggio } from "@travelops/engine";
import type { IstantaneaDestinazione } from "@travelops/sources";

/** Un valore subito o una promessa: l'archivio può essere sincrono o asincrono. */
export type ForseAsincrono<T> = T | Promise<T>;

/** Stati del viaggio (gli stessi della web app, REQ-DATA-001). */
export type StatoViaggio = "bozza" | "confermato" | "in_corso" | "concluso";

/** I dati del viaggio nell'elenco dei viaggi. L'identificativo lo decide l'archivio. */
export interface SchedaViaggio {
  readonly titolo: string;
  readonly stato: StatoViaggio;
  /** Nome della destinazione da mostrare, `null` finché non è scelta. */
  readonly destinazione: string | null;
  /** L'istantanea su cui il viaggio è costruito, `null` finché la destinazione non è preparata. */
  readonly istantaneaId: string | null;
}

/** Una revisione della bozza (B1, B2, …): il viaggio generato o rivisto prima della conferma. */
export interface RevisioneBozza {
  /** 1, 2, … */
  readonly numero: number;
  /** Per esempio "Prima bozza", "Alternativa", "Modifica: …". */
  readonly causa: string;
  readonly viaggio: Viaggio;
}

/** Il tipo di proposta salvata: una modifica richiesta (REQ-EDIT-001) o una ripianificazione (REQ-REPLAN-002). */
export type TipoProposta = "modifica" | "ripianificazione";

export interface ArchivioViaggio {
  /** La scheda del viaggio, `null` se il viaggio non esiste ancora. */
  leggiScheda(): ForseAsincrono<SchedaViaggio | null>;
  /** Crea il viaggio o ne aggiorna la scheda. */
  salvaScheda(scheda: SchedaViaggio): ForseAsincrono<void>;

  /** Il profilo raccolto finora (REQ-PREF-001), `null` se non c'è. */
  leggiProfilo(): ForseAsincrono<BozzaProfilo | null>;
  salvaProfilo(profilo: BozzaProfilo): ForseAsincrono<void>;

  /**
   * Un'istantanea salvata (anche un catalogo di riferimento presentato come `IstantaneaCatalogo`), `null` se non c'è.
   * Gli strumenti la leggono con l'`istantaneaId` della scheda.
   */
  leggiIstantanea(id: string): ForseAsincrono<IstantaneaCatalogo | null>;
  /** Salva un'istantanea preparata dalla sorgente (non cambia mai: stesso `id`, stesso contenuto). */
  salvaIstantanea(istantanea: IstantaneaDestinazione): ForseAsincrono<void>;

  /** Le revisioni della bozza, dalla prima; l'ultima è la bozza corrente. */
  leggiRevisioniBozza(): ForseAsincrono<readonly RevisioneBozza[]>;
  /** Aggiunge la revisione successiva della bozza e ne restituisce il numero. */
  aggiungiRevisioneBozza(causa: string, viaggio: Viaggio): ForseAsincrono<number>;

  /** Lo storico delle versioni (REQ-ITIN-002), `null` finché il viaggio non è confermato. */
  leggiStorico(): ForseAsincrono<Storico | null>;
  salvaStorico(storico: Storico): ForseAsincrono<void>;

  /**
   * Salva una proposta del motore (non cambia il viaggio: diventa una versione solo quando il viaggiatore la accetta
   * con il pulsante, fuori dagli strumenti) e ne restituisce il numero.
   */
  salvaProposta(tipo: TipoProposta, proposta: Proposta | PropostaRipianificazioneEstesa): ForseAsincrono<number>;
}

/** Una scrittura fatta sull'archivio in memoria, per i test (CA-2). */
export interface ScritturaArchivio {
  readonly metodo:
    | "salvaScheda"
    | "salvaProfilo"
    | "salvaIstantanea"
    | "aggiungiRevisioneBozza"
    | "salvaStorico"
    | "salvaProposta";
  readonly dettaglio: string;
}

/** Una proposta salvata nell'archivio in memoria. */
export interface PropostaArchiviata {
  readonly numero: number;
  readonly tipo: TipoProposta;
  readonly proposta: Proposta | PropostaRipianificazioneEstesa;
}

/** Il contenuto dell'archivio in memoria. */
export interface ContenutoArchivio {
  scheda: SchedaViaggio | null;
  profilo: BozzaProfilo | null;
  istantanee: Map<string, IstantaneaCatalogo>;
  revisioni: RevisioneBozza[];
  storico: Storico | null;
  proposte: PropostaArchiviata[];
}

/** L'archivio in memoria: per i test e per provare gli strumenti senza database. */
export interface ArchivioInMemoria extends ArchivioViaggio {
  /** Il contenuto attuale (copie: cambiarlo non cambia l'archivio). */
  contenuto(): ContenutoArchivio;
  /** Le scritture fatte, nell'ordine. */
  readonly scritture: readonly ScritturaArchivio[];
}

/**
 * Crea un archivio in memoria. Conserva copie dei dati (chi li riceve non può cambiare l'archivio) e registra ogni
 * scrittura in `scritture`.
 */
export function creaArchivioInMemoria(iniziale: Partial<Omit<ContenutoArchivio, "istantanee">> & { istantanee?: readonly IstantaneaCatalogo[] } = {}): ArchivioInMemoria {
  const stato: ContenutoArchivio = {
    scheda: copia(iniziale.scheda ?? null),
    profilo: copia(iniziale.profilo ?? null),
    istantanee: new Map((iniziale.istantanee ?? []).map((i) => [i.id, copia(i)])),
    revisioni: copia([...(iniziale.revisioni ?? [])]),
    storico: iniziale.storico ?? null,
    proposte: [...(iniziale.proposte ?? [])],
  };
  const scritture: ScritturaArchivio[] = [];
  const registra = (metodo: ScritturaArchivio["metodo"], dettaglio: string): void => {
    scritture.push({ metodo, dettaglio });
  };

  return {
    scritture,
    contenuto: () => ({
      scheda: copia(stato.scheda),
      profilo: copia(stato.profilo),
      istantanee: new Map(stato.istantanee),
      revisioni: copia(stato.revisioni),
      storico: stato.storico,
      proposte: [...stato.proposte],
    }),
    leggiScheda: () => copia(stato.scheda),
    salvaScheda(scheda) {
      stato.scheda = copia(scheda);
      registra("salvaScheda", `${scheda.stato}: ${scheda.titolo}`);
    },
    leggiProfilo: () => copia(stato.profilo),
    salvaProfilo(profilo) {
      stato.profilo = copia(profilo);
      registra("salvaProfilo", JSON.stringify(profilo));
    },
    leggiIstantanea: (id) => {
      const trovata = stato.istantanee.get(id);
      return trovata === undefined ? null : copia(trovata);
    },
    salvaIstantanea(istantanea) {
      stato.istantanee.set(istantanea.id, copia(istantanea) as unknown as IstantaneaCatalogo);
      registra("salvaIstantanea", istantanea.id);
    },
    leggiRevisioniBozza: () => copia(stato.revisioni),
    aggiungiRevisioneBozza(causa, viaggio) {
      const numero = stato.revisioni.length + 1;
      stato.revisioni.push({ numero, causa, viaggio: copia(viaggio) });
      registra("aggiungiRevisioneBozza", `B${numero}: ${causa}`);
      return numero;
    },
    // Lo storico del motore è congelato: si conserva così com'è.
    leggiStorico: () => stato.storico,
    salvaStorico(storico) {
      stato.storico = storico;
      registra("salvaStorico", `versioni: ${storico.versioni.length}`);
    },
    salvaProposta(tipo, proposta) {
      const numero = stato.proposte.length + 1;
      stato.proposte.push({ numero, tipo, proposta: copia(proposta) });
      registra("salvaProposta", `${tipo} ${numero}`);
      return numero;
    },
  };
}

function copia<T>(valore: T): T {
  return valore === null || valore === undefined ? valore : structuredClone(valore);
}
