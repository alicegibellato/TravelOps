/**
 * Interfaccia neutra verso il modello linguistico (REQ-ORCH-001, ST-ORCH-001A).
 *
 * Nessun tipo dell'SDK `openai` esce da questo file: agenti, ciclo degli strumenti e chat lavorano solo con
 * questi tipi, e il client vero (OpenAI) e quello finto (conversazioni registrate) li realizzano entrambi.
 * Tutti i tipi sono dati JSON semplici, così una conversazione si salva e si confronta così com'è.
 */

/** Una chiamata a uno strumento chiesta dal modello. */
export interface ChiamataStrumento {
  /** Identificativo della chiamata, scelto dal modello: il risultato lo deve riportare (`idChiamata`). */
  readonly id: string;
  /** Nome dello strumento, uguale a `DefinizioneStrumento.nome`. */
  readonly nome: string;
  /**
   * Argomenti come testo JSON, così come li ha scritti il modello: possono essere JSON non valido o non
   * rispettare lo schema, quindi chi esegue lo strumento li deve controllare (il ciclo li analizza per lui).
   */
  readonly argomenti: string;
}

/** Messaggio del viaggiatore. */
export interface MessaggioUtente {
  readonly ruolo: "utente";
  readonly testo: string;
}

/** Risposta del modello: testo, chiamate agli strumenti o entrambi. */
export interface MessaggioAssistente {
  readonly ruolo: "assistente";
  /** Testo della risposta; stringa vuota se il modello ha solo chiamato strumenti. */
  readonly testo: string;
  /** Chiamate agli strumenti chieste in questa risposta (assenti o vuote se nessuna). */
  readonly chiamate?: readonly ChiamataStrumento[];
}

/** Risultato di uno strumento, che torna al modello. */
export interface MessaggioStrumento {
  readonly ruolo: "strumento";
  /** `ChiamataStrumento.id` della chiamata a cui risponde. */
  readonly idChiamata: string;
  /** Nome dello strumento (per chi legge la conversazione; il modello usa `idChiamata`). */
  readonly nome: string;
  /** Risultato come testo, di solito JSON. */
  readonly risultato: string;
}

/** Un messaggio della conversazione. Le istruzioni di sistema non sono messaggi: vanno in `RichiestaModello.istruzioni`. */
export type Messaggio = MessaggioUtente | MessaggioAssistente | MessaggioStrumento;

/** Schema JSON dei parametri di uno strumento (JSON Schema, oggetto alla radice). */
export type SchemaJson = { readonly [chiave: string]: unknown };

/** Uno strumento come lo vede il modello: nome, descrizione e schema dei parametri. */
export interface DefinizioneStrumento {
  /** Nome univoco, solo lettere, cifre, `_` e `-` (regola dei fornitori), al massimo 64 caratteri. */
  readonly nome: string;
  /** Quando e perché usarlo: il modello sceglie lo strumento da qui. */
  readonly descrizione: string;
  /** Schema JSON dei parametri, con `type: "object"` alla radice. */
  readonly parametri: SchemaJson;
  /**
   * Chiede al fornitore di rispettare lo schema in modo rigoroso (OpenAI `strict`): in quel caso lo schema deve avere
   * tutte le proprietà in `required` e `additionalProperties: false`. Predefinito `false`.
   */
  readonly rigoroso?: boolean;
}

/** Una richiesta al modello. */
export interface RichiestaModello {
  /** Istruzioni di sistema dell'agente (in italiano). */
  readonly istruzioni?: string;
  /** La conversazione fin qui, dal messaggio più vecchio al più recente. */
  readonly messaggi: readonly Messaggio[];
  /** Strumenti che il modello può chiamare in questa risposta. */
  readonly strumenti?: readonly DefinizioneStrumento[];
  /** Per interrompere la risposta (per esempio quando il viaggiatore chiude la chat). */
  readonly segnale?: AbortSignal;
}

/** Perché il modello ha smesso di rispondere. */
export type MotivoFine =
  /** Risposta finale completa. */
  | "completata"
  /** Il modello aspetta i risultati degli strumenti che ha chiamato. */
  | "strumenti"
  /** Risposta interrotta dal fornitore (limite di lunghezza o filtro dei contenuti). */
  | "troncata";

/** Consumo della risposta, se il fornitore lo comunica. */
export interface UsoModello {
  readonly ingresso: number;
  readonly uscita: number;
}

/** Un pezzo di testo della risposta, da mostrare subito (streaming). */
export interface EventoTesto {
  readonly tipo: "testo";
  readonly testo: string;
}

/** Una chiamata a uno strumento, completa di argomenti. */
export interface EventoChiamataStrumento {
  readonly tipo: "chiamata_strumento";
  readonly chiamata: ChiamataStrumento;
}

/** Fine della risposta: sempre l'ultimo evento, una volta sola. */
export interface EventoFine {
  readonly tipo: "fine";
  readonly motivo: MotivoFine;
  readonly uso?: UsoModello;
}

/** Gli eventi di una risposta in streaming. */
export type EventoModello = EventoTesto | EventoChiamataStrumento | EventoFine;

/**
 * Un modello linguistico, vero o finto.
 *
 * `rispondi` restituisce gli eventi della risposta come iterabile asincrono: pezzi di testo e chiamate agli strumenti
 * nell'ordine in cui arrivano, poi un solo evento `fine`. Se il servizio non risponde, l'iterazione solleva
 * `ErroreAiNonDisponibile` (mai errori dell'SDK, mai la chiave).
 */
export interface ClienteModello {
  /** Chi realizza il client: `"openai"`, `"finto"`, … (per i log, senza segreti). */
  readonly fornitore: string;
  /** Il modello usato (per esempio `gpt-6-luna`). */
  readonly modello: string;
  rispondi(richiesta: RichiestaModello): AsyncIterable<EventoModello>;
}

/** Il risultato raccolto di una risposta: testo completo, chiamate e motivo della fine. */
export interface RispostaRaccolta {
  readonly testo: string;
  readonly chiamate: readonly ChiamataStrumento[];
  readonly motivo: MotivoFine;
  readonly uso?: UsoModello;
}

/** Consuma tutti gli eventi di una risposta e la restituisce raccolta (per chi non ha bisogno dello streaming). */
export async function raccogliRisposta(eventi: AsyncIterable<EventoModello>): Promise<RispostaRaccolta> {
  let testo = "";
  const chiamate: ChiamataStrumento[] = [];
  for await (const evento of eventi) {
    if (evento.tipo === "testo") testo += evento.testo;
    else if (evento.tipo === "chiamata_strumento") chiamate.push(evento.chiamata);
    else return evento.uso === undefined ? { testo, chiamate, motivo: evento.motivo } : { testo, chiamate, motivo: evento.motivo, uso: evento.uso };
  }
  throw new Error("La risposta del modello è finita senza l'evento \"fine\".");
}

/** Il messaggio dell'assistente che corrisponde a una risposta (da aggiungere alla conversazione). */
export function messaggioAssistente(testo: string, chiamate: readonly ChiamataStrumento[]): MessaggioAssistente {
  return chiamate.length === 0 ? { ruolo: "assistente", testo } : { ruolo: "assistente", testo, chiamate: [...chiamate] };
}
