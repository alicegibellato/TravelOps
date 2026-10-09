/**
 * Client finto: riproduce conversazioni registrate (REQ-ORCH-001 CA-1, CA-5). Deterministico e senza rete.
 *
 * Una conversazione registrata è un elenco di turni; ogni turno dice che cosa il client si aspetta di ricevere
 * (istruzioni, messaggi, nomi degli strumenti offerti) e che cosa risponde il modello (testo, chiamate agli strumenti).
 * Le richieste devono arrivare nell'ordine dei turni: una richiesta diversa da quella registrata, o in più, fa
 * fallire subito con `ErroreConversazioneNonRegistrata` e un messaggio che dice dove sta la differenza.
 */
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { ErroreAiNonDisponibile, ErroreConversazioneNonRegistrata, ErroreConversazioneNonValida, type CausaAiNonDisponibile } from "./errori.js";
import {
  raccogliRisposta,
  type ChiamataStrumento,
  type ClienteModello,
  type EventoModello,
  type Messaggio,
  type MotivoFine,
  type RichiestaModello,
} from "./modello.js";

/** Versione del formato delle conversazioni registrate. */
export const VERSIONE_CONVERSAZIONE = 1;

/** Che cosa il client finto si aspetta di ricevere in un turno. I campi assenti non si controllano. */
export interface RichiestaAttesa {
  /** Le istruzioni di sistema, uguali. */
  readonly istruzioni?: string;
  /** Tutta la conversazione, uguale messaggio per messaggio. */
  readonly messaggi?: readonly Messaggio[];
  /** Solo gli ultimi messaggi della conversazione (in alternativa a `messaggi`, per registrazioni più corte). */
  readonly ultimiMessaggi?: readonly Messaggio[];
  /** I nomi degli strumenti offerti al modello, nello stesso ordine. */
  readonly strumenti?: readonly string[];
}

/** Che cosa risponde il modello in un turno. */
export interface RispostaRegistrata {
  /** Il testo; un elenco di pezzi produce un evento di testo per pezzo (per provare lo streaming). */
  readonly testo?: string | readonly string[];
  /** Le chiamate agli strumenti, con gli argomenti come testo JSON. */
  readonly chiamate?: readonly ChiamataStrumento[];
  /** Il motivo della fine; predefinito `strumenti` se ci sono chiamate, altrimenti `completata`. */
  readonly motivo?: MotivoFine;
  /** Se presente, il turno simula un errore dell'API invece di rispondere. */
  readonly errore?: CausaAiNonDisponibile;
}

export interface TurnoRegistrato {
  readonly atteso: RichiestaAttesa;
  readonly risposta: RispostaRegistrata;
}

export interface ConversazioneRegistrata {
  readonly versione: typeof VERSIONE_CONVERSAZIONE;
  /** A che cosa serve la conversazione (compare nei messaggi d'errore). */
  readonly descrizione?: string;
  readonly turni: readonly TurnoRegistrato[];
}

/** Il client finto, con quello che serve ai test per controllarlo. */
export interface ClienteFinto extends ClienteModello {
  /** Le richieste ricevute, nell'ordine (senza `segnale`). */
  readonly richieste: readonly RichiestaModello[];
  /** Quanti turni sono stati usati. */
  turniUsati(): number;
  /** Fallisce se restano turni registrati non usati. */
  verificaCompletata(): void;
}

/**
 * Crea il client finto da una conversazione registrata (oggetto già letto o dati JSON da validare).
 * Nel file JSON gli argomenti delle chiamate si possono scrivere come oggetto: diventano testo JSON.
 */
export function creaClienteFinto(conversazione: ConversazioneRegistrata | unknown): ClienteFinto {
  const registrata = leggiConversazioneRegistrata(conversazione);
  const nome = registrata.descrizione === undefined ? "conversazione registrata" : `«${registrata.descrizione}»`;
  const richieste: RichiestaModello[] = [];
  let prossimo = 0;

  function rispondi(richiesta: RichiestaModello): AsyncIterable<EventoModello> {
    const indice = prossimo;
    prossimo += 1;
    richieste.push(senzaSegnale(richiesta));
    const turno = registrata.turni[indice];
    return (async function* (): AsyncGenerator<EventoModello> {
      if (turno === undefined) {
        throw new ErroreConversazioneNonRegistrata(
          `Il client finto ha ricevuto una richiesta non registrata: ${nome} ha ${registrata.turni.length} turni e questa è la richiesta ${indice + 1}.\n` +
            `Ultimo messaggio ricevuto: ${JSON.stringify(richiesta.messaggi.at(-1))}`,
        );
      }
      const differenza = confronta(turno.atteso, richiesta);
      if (differenza !== undefined) {
        throw new ErroreConversazioneNonRegistrata(
          `Il client finto ha ricevuto una richiesta non registrata (${nome}, turno ${indice + 1} di ${registrata.turni.length}): ${differenza}`,
        );
      }
      if (richiesta.segnale?.aborted === true) throw new ErroreAiNonDisponibile("annullata");
      const { risposta } = turno;
      if (risposta.errore !== undefined) throw new ErroreAiNonDisponibile(risposta.errore);
      const pezzi = typeof risposta.testo === "string" ? [risposta.testo] : (risposta.testo ?? []);
      for (const pezzo of pezzi) if (pezzo !== "") yield { tipo: "testo", testo: pezzo };
      const chiamate = risposta.chiamate ?? [];
      for (const chiamata of chiamate) yield { tipo: "chiamata_strumento", chiamata: { ...chiamata } };
      yield { tipo: "fine", motivo: risposta.motivo ?? (chiamate.length > 0 ? "strumenti" : "completata") };
    })();
  }

  return {
    fornitore: "finto",
    modello: "finto",
    rispondi,
    richieste,
    turniUsati: () => Math.min(prossimo, registrata.turni.length),
    verificaCompletata(): void {
      if (prossimo < registrata.turni.length) {
        throw new ErroreConversazioneNonRegistrata(
          `${nome}: usati ${prossimo} turni su ${registrata.turni.length}; il turno ${prossimo + 1} non è mai stato richiesto.`,
        );
      }
    },
  };
}

/** Legge una conversazione registrata da un file JSON (validata). */
export function caricaConversazioneRegistrata(percorso: string | URL): ConversazioneRegistrata {
  let dati: unknown;
  try {
    dati = JSON.parse(readFileSync(percorso, "utf8"));
  } catch (errore) {
    throw new ErroreConversazioneNonValida(`Conversazione registrata illeggibile (${String(percorso)}): ${(errore as Error).message}`);
  }
  return leggiConversazioneRegistrata(dati);
}

/** Valida una conversazione registrata e ne normalizza gli argomenti delle chiamate (oggetto → testo JSON). */
export function leggiConversazioneRegistrata(dati: unknown): ConversazioneRegistrata {
  const errore = (dove: string, cosa: string): never => {
    throw new ErroreConversazioneNonValida(`Conversazione registrata non valida, ${dove}: ${cosa}`);
  };
  if (!oggetto(dati)) return errore("radice", "deve essere un oggetto");
  if (dati.versione !== VERSIONE_CONVERSAZIONE) errore("versione", `deve essere ${VERSIONE_CONVERSAZIONE}`);
  if (dati.descrizione !== undefined && typeof dati.descrizione !== "string") errore("descrizione", "deve essere un testo");
  if (!Array.isArray(dati.turni)) return errore("turni", "deve essere un elenco");

  const turni = dati.turni.map((turno: unknown, i): TurnoRegistrato => {
    const dove = `turno ${i + 1}`;
    if (!oggetto(turno) || !oggetto(turno.atteso) || !oggetto(turno.risposta)) return errore(dove, "servono gli oggetti \"atteso\" e \"risposta\"");
    const { atteso, risposta } = turno;
    if (atteso.messaggi !== undefined && atteso.ultimiMessaggi !== undefined) errore(dove, "usare \"messaggi\" oppure \"ultimiMessaggi\", non entrambi");
    if (atteso.istruzioni !== undefined && typeof atteso.istruzioni !== "string") errore(`${dove}, atteso.istruzioni`, "deve essere un testo");
    if (atteso.strumenti !== undefined && !elencoDiTesti(atteso.strumenti)) errore(`${dove}, atteso.strumenti`, "deve essere un elenco di nomi");
    const messaggi = (campo: "messaggi" | "ultimiMessaggi"): Messaggio[] | undefined => {
      const valore = atteso[campo];
      if (valore === undefined) return undefined;
      if (!Array.isArray(valore)) return errore(`${dove}, atteso.${campo}`, "deve essere un elenco");
      return valore.map((m: unknown, j) => leggiMessaggio(m, `${dove}, atteso.${campo}[${j}]`, errore));
    };
    const attesoLetto: RichiestaAttesa = {
      ...(atteso.istruzioni === undefined ? {} : { istruzioni: atteso.istruzioni as string }),
      ...(atteso.messaggi === undefined ? {} : { messaggi: messaggi("messaggi") ?? [] }),
      ...(atteso.ultimiMessaggi === undefined ? {} : { ultimiMessaggi: messaggi("ultimiMessaggi") ?? [] }),
      ...(atteso.strumenti === undefined ? {} : { strumenti: atteso.strumenti as string[] }),
    };

    const { testo, chiamate, motivo, errore: erroreApi } = risposta;
    if (testo !== undefined && typeof testo !== "string" && !elencoDiTesti(testo)) errore(`${dove}, risposta.testo`, "deve essere un testo o un elenco di testi");
    if (chiamate !== undefined && !Array.isArray(chiamate)) errore(`${dove}, risposta.chiamate`, "deve essere un elenco");
    if (motivo !== undefined && !["completata", "strumenti", "troncata"].includes(motivo as string)) errore(`${dove}, risposta.motivo`, "valore sconosciuto");
    if (erroreApi !== undefined && typeof erroreApi !== "string") errore(`${dove}, risposta.errore`, "deve essere una causa (per esempio \"servizio\")");
    const rispostaLetta: RispostaRegistrata = {
      ...(testo === undefined ? {} : { testo: testo as string | string[] }),
      ...(chiamate === undefined
        ? {}
        : { chiamate: (chiamate as unknown[]).map((c, j) => leggiChiamata(c, `${dove}, risposta.chiamate[${j}]`, errore)) }),
      ...(motivo === undefined ? {} : { motivo: motivo as MotivoFine }),
      ...(erroreApi === undefined ? {} : { errore: erroreApi as CausaAiNonDisponibile }),
    };
    return { atteso: attesoLetto, risposta: rispostaLetta };
  });

  return {
    versione: VERSIONE_CONVERSAZIONE,
    ...(typeof dati.descrizione === "string" ? { descrizione: dati.descrizione } : {}),
    turni,
  };
}

/**
 * Avvolge un client (di solito quello vero) e registra richieste e risposte, per scrivere le conversazioni
 * registrate dei test: `conversazione()` restituisce il JSON da salvare. Gli eventi passano invariati.
 */
export function creaClienteRegistratore(cliente: ClienteModello): ClienteModello & { conversazione(descrizione?: string): ConversazioneRegistrata } {
  const turni: TurnoRegistrato[] = [];
  return {
    fornitore: cliente.fornitore,
    modello: cliente.modello,
    async *rispondi(richiesta: RichiestaModello): AsyncGenerator<EventoModello> {
      const atteso: RichiestaAttesa = {
        ...(richiesta.istruzioni === undefined ? {} : { istruzioni: richiesta.istruzioni }),
        messaggi: structuredClone([...richiesta.messaggi]),
        strumenti: (richiesta.strumenti ?? []).map((s) => s.nome),
      };
      const eventi: EventoModello[] = [];
      // Gli eventi passano subito (lo streaming resta), e intanto si conservano per la registrazione.
      for await (const evento of cliente.rispondi(richiesta)) {
        eventi.push(evento);
        yield evento;
      }
      const raccolta = await raccogliRisposta(daElenco(eventi));
      turni.push({
        atteso,
        risposta: {
          ...(raccolta.testo === "" ? {} : { testo: raccolta.testo }),
          ...(raccolta.chiamate.length === 0 ? {} : { chiamate: raccolta.chiamate }),
          motivo: raccolta.motivo,
        },
      });
    },
    conversazione: (descrizione?: string) => ({ versione: VERSIONE_CONVERSAZIONE, ...(descrizione === undefined ? {} : { descrizione }), turni: structuredClone(turni) }),
  };
}

// --- confronto ---

/** La prima differenza tra la richiesta attesa e quella ricevuta, o `undefined` se coincidono. */
function confronta(atteso: RichiestaAttesa, ricevuta: RichiestaModello): string | undefined {
  if (atteso.istruzioni !== undefined && atteso.istruzioni !== ricevuta.istruzioni) {
    return `istruzioni diverse.\nAttese: ${JSON.stringify(atteso.istruzioni)}\nRicevute: ${JSON.stringify(ricevuta.istruzioni)}`;
  }
  if (atteso.strumenti !== undefined) {
    const nomi = (ricevuta.strumenti ?? []).map((s) => s.nome);
    if (!isDeepStrictEqual(nomi, [...atteso.strumenti])) {
      return `strumenti diversi.\nAttesi: ${JSON.stringify(atteso.strumenti)}\nRicevuti: ${JSON.stringify(nomi)}`;
    }
  }
  const attesi = atteso.messaggi ?? atteso.ultimiMessaggi;
  if (attesi === undefined) return undefined;
  const tutti = atteso.messaggi !== undefined;
  if (tutti && attesi.length !== ricevuta.messaggi.length) {
    return `numero di messaggi diverso: attesi ${attesi.length}, ricevuti ${ricevuta.messaggi.length}.\nUltimo ricevuto: ${JSON.stringify(ricevuta.messaggi.at(-1))}`;
  }
  if (!tutti && attesi.length > ricevuta.messaggi.length) {
    return `servono almeno ${attesi.length} messaggi, ricevuti ${ricevuta.messaggi.length}.`;
  }
  const inizio = ricevuta.messaggi.length - attesi.length;
  for (let i = 0; i < attesi.length; i += 1) {
    const a = canonico(attesi[i]);
    const r = canonico(ricevuta.messaggi[inizio + i]);
    if (!isDeepStrictEqual(a, r)) {
      return `messaggio ${inizio + i + 1} diverso.\nAtteso: ${JSON.stringify(attesi[i])}\nRicevuto: ${JSON.stringify(ricevuta.messaggi[inizio + i])}`;
    }
  }
  return undefined;
}

/** Forma confrontabile di un messaggio: chiamate vuote come assenti, argomenti JSON confrontati per valore. */
function canonico(messaggio: Messaggio | undefined): unknown {
  if (messaggio === undefined || messaggio.ruolo !== "assistente") return messaggio;
  const chiamate = (messaggio.chiamate ?? []).map((c) => ({ id: c.id, nome: c.nome, argomenti: valoreJson(c.argomenti) }));
  return chiamate.length === 0 ? { ruolo: "assistente", testo: messaggio.testo } : { ruolo: "assistente", testo: messaggio.testo, chiamate };
}

function valoreJson(testo: string): unknown {
  try {
    return JSON.parse(testo);
  } catch {
    return testo;
  }
}

// --- lettura ---

type Errore = (dove: string, cosa: string) => never;

function oggetto(valore: unknown): valore is Record<string, unknown> {
  return typeof valore === "object" && valore !== null && !Array.isArray(valore);
}

function elencoDiTesti(valore: unknown): valore is string[] {
  return Array.isArray(valore) && valore.every((v) => typeof v === "string");
}

function leggiChiamata(valore: unknown, dove: string, errore: Errore): ChiamataStrumento {
  if (!oggetto(valore) || typeof valore.id !== "string" || typeof valore.nome !== "string") return errore(dove, "servono \"id\" e \"nome\" (testi)");
  const { argomenti } = valore;
  if (argomenti === undefined) return { id: valore.id, nome: valore.nome, argomenti: "{}" };
  if (typeof argomenti === "string") return { id: valore.id, nome: valore.nome, argomenti };
  if (oggetto(argomenti)) return { id: valore.id, nome: valore.nome, argomenti: JSON.stringify(argomenti) };
  return errore(dove, "\"argomenti\" deve essere un oggetto o un testo JSON");
}

function leggiMessaggio(valore: unknown, dove: string, errore: Errore): Messaggio {
  if (!oggetto(valore)) return errore(dove, "deve essere un oggetto");
  switch (valore.ruolo) {
    case "utente":
      if (typeof valore.testo !== "string") return errore(dove, "serve \"testo\"");
      return { ruolo: "utente", testo: valore.testo };
    case "assistente": {
      if (typeof valore.testo !== "string") return errore(dove, "serve \"testo\" (anche vuoto)");
      if (valore.chiamate !== undefined && !Array.isArray(valore.chiamate)) return errore(dove, "\"chiamate\" deve essere un elenco");
      const chiamate = ((valore.chiamate as unknown[] | undefined) ?? []).map((c, k) => leggiChiamata(c, `${dove}.chiamate[${k}]`, errore));
      return chiamate.length === 0 ? { ruolo: "assistente", testo: valore.testo } : { ruolo: "assistente", testo: valore.testo, chiamate };
    }
    case "strumento":
      if (typeof valore.idChiamata !== "string" || typeof valore.nome !== "string" || typeof valore.risultato !== "string") {
        return errore(dove, "servono \"idChiamata\", \"nome\" e \"risultato\" (testi)");
      }
      return { ruolo: "strumento", idChiamata: valore.idChiamata, nome: valore.nome, risultato: valore.risultato };
    default:
      return errore(dove, "\"ruolo\" deve essere \"utente\", \"assistente\" o \"strumento\"");
  }
}

async function* daElenco<T>(elementi: readonly T[]): AsyncGenerator<T> {
  yield* elementi;
}

function senzaSegnale(richiesta: RichiestaModello): RichiestaModello {
  const { segnale: _segnale, ...resto } = richiesta;
  return { ...resto, messaggi: [...resto.messaggi] };
}
