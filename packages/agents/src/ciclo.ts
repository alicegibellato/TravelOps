/**
 * Ciclo minimo di esecuzione degli strumenti: il modello chiede uno strumento → il codice lo esegue con il registro
 * passato da fuori → il risultato torna al modello → fino alla risposta finale, con un limite di iterazioni.
 *
 * Il ciclo non conosce gli strumenti veri (ST-ORCH-001B) né gli agenti (ST-ORCH-001C): riceve un client, le
 * istruzioni, la conversazione e un registro di strumenti. Gli strumenti si eseguono uno alla volta, nell'ordine in
 * cui il modello li ha chiesti, perché quelli del motore cambiano il viaggio.
 */
import {
  messaggioAssistente,
  type ChiamataStrumento,
  type ClienteModello,
  type DefinizioneStrumento,
  type Messaggio,
  type MessaggioStrumento,
} from "./modello.js";

/** Numero massimo predefinito di risposte del modello in un ciclo. */
export const MAX_ITERAZIONI_PREDEFINITO = 8;

/** Che cosa riceve uno strumento oltre agli argomenti. */
export interface ContestoStrumento {
  /** La chiamata del modello (id, nome, argomenti come testo). */
  readonly chiamata: ChiamataStrumento;
  readonly segnale?: AbortSignal;
}

/** Uno strumento eseguibile: la definizione per il modello e la funzione che lo esegue. */
export interface Strumento {
  readonly definizione: DefinizioneStrumento;
  /**
   * Esegue lo strumento. `argomenti` è il JSON già analizzato ma NON controllato rispetto allo schema: lo strumento lo
   * deve validare. Il valore restituito torna al modello: un testo così com'è, altrimenti come JSON. Per un errore da
   * far vedere al modello (che può correggersi) sollevare `ErroreStrumento`.
   */
  esegui(argomenti: unknown, contesto: ContestoStrumento): unknown;
}

/** Gli strumenti disponibili in un ciclo, con nomi univoci. */
export type RegistroStrumenti = readonly Strumento[];

/** Errore di uno strumento con un messaggio pensato per il modello (per esempio "data fuori dal viaggio"). */
export class ErroreStrumento extends Error {
  override readonly name = "ErroreStrumento";
}

/** Un pezzo di testo del modello, da mostrare subito. */
export interface EventoCicloTesto {
  readonly tipo: "testo";
  readonly testo: string;
}

/** Il modello ha chiesto uno strumento (prima che venga eseguito). */
export interface EventoCicloChiamata {
  readonly tipo: "chiamata_strumento";
  readonly chiamata: ChiamataStrumento;
}

/** Uno strumento ha finito; il risultato sta tornando al modello. */
export interface EventoCicloRisultato {
  readonly tipo: "risultato_strumento";
  readonly chiamata: ChiamataStrumento;
  readonly risultato: string;
  /** Vero se lo strumento è sconosciuto, gli argomenti non sono JSON o l'esecuzione è fallita. */
  readonly errore: boolean;
  /** L'eccezione originale, per i log del server (mai mandata al modello se non è `ErroreStrumento`). */
  readonly eccezione?: unknown;
}

/** Fine del ciclo: sempre l'ultimo evento. */
export interface EventoCicloFine {
  readonly tipo: "fine";
  readonly esito: EsitoCiclo;
}

export type EventoCiclo = EventoCicloTesto | EventoCicloChiamata | EventoCicloRisultato | EventoCicloFine;

/** Perché il ciclo si è fermato. */
export type MotivoFineCiclo =
  /** Il modello ha dato la risposta finale. */
  | "completata"
  /** La risposta del modello è stata interrotta dal fornitore. */
  | "troncata"
  /** Il modello chiedeva ancora strumenti dopo `maxIterazioni` risposte. */
  | "limite_iterazioni";

export interface EsitoCiclo {
  readonly motivo: MotivoFineCiclo;
  /** Il testo dell'ultima risposta del modello (la risposta finale, se `completata`). */
  readonly testo: string;
  /** I messaggi aggiunti dal ciclo (assistente e risultati degli strumenti), da salvare con la conversazione. */
  readonly messaggiNuovi: readonly Messaggio[];
  /** Tutte le chiamate agli strumenti, nell'ordine. */
  readonly chiamate: readonly ChiamataStrumento[];
  /** Quante risposte del modello sono state chieste. */
  readonly iterazioni: number;
}

export interface OpzioniCiclo {
  readonly cliente: ClienteModello;
  readonly istruzioni?: string;
  /** La conversazione fin qui; di solito l'ultimo è il messaggio del viaggiatore. */
  readonly messaggi: readonly Messaggio[];
  readonly strumenti?: RegistroStrumenti;
  /** Massimo numero di risposte del modello; predefinito `MAX_ITERAZIONI_PREDEFINITO`. */
  readonly maxIterazioni?: number;
  readonly segnale?: AbortSignal;
}

/**
 * Esegue il ciclo e ne restituisce gli eventi in streaming; l'ultimo è sempre `fine` con l'esito. Gli errori del
 * client (`ErroreAiNonDisponibile`) escono dall'iterazione così come sono.
 */
export async function* eseguiCiclo(opzioni: OpzioniCiclo): AsyncGenerator<EventoCiclo> {
  const strumenti = indicizza(opzioni.strumenti ?? []);
  const definizioni = [...strumenti.values()].map((s) => s.definizione);
  const maxIterazioni = opzioni.maxIterazioni ?? MAX_ITERAZIONI_PREDEFINITO;
  if (!Number.isInteger(maxIterazioni) || maxIterazioni < 1) throw new RangeError("maxIterazioni deve essere un intero maggiore di zero.");

  const conversazione: Messaggio[] = [...opzioni.messaggi];
  const messaggiNuovi: Messaggio[] = [];
  const tutteLeChiamate: ChiamataStrumento[] = [];
  const aggiungi = (messaggio: Messaggio): void => {
    conversazione.push(messaggio);
    messaggiNuovi.push(messaggio);
  };
  const esito = (motivo: MotivoFineCiclo, testo: string, iterazioni: number): EventoCicloFine => ({
    tipo: "fine",
    esito: { motivo, testo, messaggiNuovi: [...messaggiNuovi], chiamate: [...tutteLeChiamate], iterazioni },
  });

  for (let iterazione = 1; iterazione <= maxIterazioni; iterazione += 1) {
    let testo = "";
    const chiamate: ChiamataStrumento[] = [];
    let motivo: string | undefined;
    for await (const evento of opzioni.cliente.rispondi({
      ...(opzioni.istruzioni === undefined ? {} : { istruzioni: opzioni.istruzioni }),
      messaggi: [...conversazione],
      ...(definizioni.length === 0 ? {} : { strumenti: definizioni }),
      ...(opzioni.segnale === undefined ? {} : { segnale: opzioni.segnale }),
    })) {
      if (evento.tipo === "testo") {
        testo += evento.testo;
        yield evento;
      } else if (evento.tipo === "chiamata_strumento") {
        chiamate.push(evento.chiamata);
      } else {
        motivo = evento.motivo;
        break;
      }
    }
    if (motivo === undefined) throw new Error("La risposta del modello è finita senza l'evento \"fine\".");

    // Una risposta troncata può avere chiamate a metà: non si eseguono, e non restano senza risultato nella conversazione.
    if (motivo === "troncata") {
      aggiungi(messaggioAssistente(testo, []));
      yield esito("troncata", testo, iterazione);
      return;
    }
    aggiungi(messaggioAssistente(testo, chiamate));
    if (chiamate.length === 0) {
      yield esito("completata", testo, iterazione);
      return;
    }

    for (const chiamata of chiamate) {
      tutteLeChiamate.push(chiamata);
      yield { tipo: "chiamata_strumento", chiamata };
      const risultato = await esegui(strumenti, chiamata, opzioni.segnale);
      const messaggio: MessaggioStrumento = { ruolo: "strumento", idChiamata: chiamata.id, nome: chiamata.nome, risultato: risultato.risultato };
      aggiungi(messaggio);
      yield { tipo: "risultato_strumento", chiamata, ...risultato };
    }
    // Ogni chiamata ha il suo risultato anche quando ci si ferma: la conversazione resta valida per il turno dopo.
    if (iterazione === maxIterazioni) {
      yield esito("limite_iterazioni", testo, iterazione);
      return;
    }
  }
}

/** Esegue il ciclo fino alla fine e restituisce solo l'esito (senza streaming). */
export async function eseguiCicloCompleto(opzioni: OpzioniCiclo): Promise<EsitoCiclo> {
  for await (const evento of eseguiCiclo(opzioni)) if (evento.tipo === "fine") return evento.esito;
  throw new Error("Il ciclo è finito senza l'evento \"fine\".");
}

function indicizza(registro: RegistroStrumenti): Map<string, Strumento> {
  const mappa = new Map<string, Strumento>();
  for (const strumento of registro) {
    const { nome } = strumento.definizione;
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(nome)) throw new Error(`Nome di strumento non valido: "${nome}" (solo lettere, cifre, _ e -, al massimo 64).`);
    if (mappa.has(nome)) throw new Error(`Strumento registrato due volte: "${nome}".`);
    mappa.set(nome, strumento);
  }
  return mappa;
}

async function esegui(
  strumenti: ReadonlyMap<string, Strumento>,
  chiamata: ChiamataStrumento,
  segnale: AbortSignal | undefined,
): Promise<{ risultato: string; errore: boolean; eccezione?: unknown }> {
  const strumento = strumenti.get(chiamata.nome);
  if (strumento === undefined) return { risultato: comeErrore(`Strumento sconosciuto: "${chiamata.nome}".`), errore: true };
  let argomenti: unknown;
  try {
    argomenti = chiamata.argomenti.trim() === "" ? {} : JSON.parse(chiamata.argomenti);
  } catch {
    return { risultato: comeErrore("Gli argomenti non sono JSON valido."), errore: true };
  }
  try {
    const valore = await strumento.esegui(argomenti, segnale === undefined ? { chiamata } : { chiamata, segnale });
    return { risultato: typeof valore === "string" ? valore : (JSON.stringify(valore) ?? "null"), errore: false };
  } catch (eccezione) {
    const testo = eccezione instanceof ErroreStrumento ? eccezione.message : `Lo strumento "${chiamata.nome}" non ha funzionato.`;
    return { risultato: comeErrore(testo), errore: true, eccezione };
  }
}

function comeErrore(messaggio: string): string {
  return JSON.stringify({ errore: messaggio });
}
