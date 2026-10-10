/**
 * L'orchestratore: sceglie l'agente che risponde a un messaggio (REQ-ORCH-001 revisione 2, ST-ORCH-001C).
 *
 * Due livelli, dal più semplice:
 * 1. **Regole** sulla fase del viaggio, che bastano quasi sempre: senza bozza risponde il Consulente (raccoglie le
 *    preferenze e crea la prima bozza), con una bozza non confermata il Planner (la rifinisce e la conferma). Una
 *    risposta breve di conferma ("Sì, procedi") torna all'agente che ha fatto la domanda.
 * 2. **Modello**, solo per un viaggio confermato, dove lo stesso stato ammette una modifica richiesta (Planner) o un
 *    imprevisto (Gestione imprevisti): una richiesta al modello con il solo strumento `scegli_agente` e gli ultimi
 *    messaggi di testo. Se il modello non sceglie un agente valido, un **ripiego** a parole chiave.
 *
 * Così l'instradamento è deterministico e senza costi in tutte le fasi tranne una, ed è provato con il client finto
 * come il resto (un turno registrato con la chiamata a `scegli_agente`).
 */
import type { ClienteModello, DefinizioneStrumento, Messaggio } from "../modello.js";
import { raccogliRisposta } from "../modello.js";
import { ErroreAiNonDisponibile } from "../errori.js";
import { NOMI_AGENTI, testoSituazione, type Adesso, type NomeAgente, type SituazioneViaggio } from "./agenti.js";
import { ISTRUZIONI_ORCHESTRATORE } from "./istruzioni.js";

/** Come è stato scelto l'agente. */
export type ModoScelta = "regole" | "modello" | "ripiego";

export interface SceltaAgente {
  readonly agente: NomeAgente;
  readonly modo: ModoScelta;
  /** Perché, in breve (per i log del server, non per il viaggiatore). */
  readonly motivo: string;
}

/** Lo strumento dell'orchestratore: l'unico che il modello vede quando sceglie l'agente. */
export const STRUMENTO_SCEGLI_AGENTE: DefinizioneStrumento = {
  nome: "scegli_agente",
  descrizione: "Sceglie l'agente che risponde all'ultimo messaggio del viaggiatore.",
  parametri: {
    type: "object",
    properties: {
      agente: { type: "string", enum: [...NOMI_AGENTI], description: "consulente, planner, logistica o imprevisti" },
      motivo: { type: "string", description: "perché, in poche parole" },
    },
    required: ["agente", "motivo"],
    additionalProperties: false,
  },
  rigoroso: true,
};

/** Quanti messaggi di testo precedenti vede l'orchestratore. */
export const MESSAGGI_PER_ORCHESTRATORE = 6;

/** Una risposta breve che conferma, nega o accetta ciò che l'agente ha appena chiesto. */
const CONFERMA_BREVE = /^\s*(s[iì]|ok|okay|va bene|vai|procedi|certo|d'accordo|esatto|giusto|confermo|perfetto|no|non ancora|lascia stare)(?=$|[\s,.!;])[^?]{0,40}$/i;

/** Parole di un imprevisto, per il ripiego se il modello non sceglie. */
const PAROLE_IMPREVISTO =
  /piov|pioggia|temporal|grandin|neve|nevica|ritard|cancellat|sciopero|chius[oa]|rubat|furto|pers[oi] (il|la|i|le)|smarrit|slogat|caviglia|febbre|ferit|infortun|sto male|stiamo male|stanc|distrutt|bucat|gomma|guast|restare|tornare prima|imprevist/i;

/** Parole di una domanda sugli spostamenti, per il ripiego verso la Logistica. */
const PAROLE_LOGISTICA = /quanto ci (vuole|metto|mettiamo)|come (arrivo|arriviamo|ci arrivo|ci si arriva|mi sposto|ci spostiamo)|che mezzo|quale mezzo|distanz|quanto (dista|è lontano|e lontano)|trasferiment|taxi|navetta|parcheggi|a piedi o|in auto o/i;

/** La scelta con le sole regole, o `null` se serve il modello (viaggio confermato). */
export function scegliConRegole(stato: SituazioneViaggio, messaggio: string, ultimoAgente?: NomeAgente | null): SceltaAgente | null {
  if (stato.fase === "nuovo" || stato.fase === "destinazione") {
    return { agente: "consulente", modo: "regole", motivo: "Il viaggio non ha ancora una bozza." };
  }
  if (stato.fase === "bozza") return { agente: "planner", modo: "regole", motivo: "C'è una bozza da rifinire." };
  if (ultimoAgente != null && messaggio.length <= 60 && CONFERMA_BREVE.test(messaggio)) {
    return { agente: ultimoAgente, modo: "regole", motivo: "Risposta breve all'ultimo agente." };
  }
  return null;
}

/** Il ripiego a parole chiave per un viaggio confermato. */
export function scegliPerRipiego(messaggio: string): SceltaAgente {
  if (PAROLE_LOGISTICA.test(messaggio)) return { agente: "logistica", modo: "ripiego", motivo: "Il messaggio chiede come spostarsi." };
  return PAROLE_IMPREVISTO.test(messaggio)
    ? { agente: "imprevisti", modo: "ripiego", motivo: "Il messaggio parla di un imprevisto." }
    : { agente: "planner", modo: "ripiego", motivo: "Nessun imprevisto riconosciuto: modifica richiesta." };
}

/** Gli ultimi messaggi di testo (senza strumenti), più il messaggio nuovo: ciò che l'orchestratore legge. */
export function messaggiPerOrchestratore(conversazione: readonly Messaggio[], messaggio: string): Messaggio[] {
  const testi: Messaggio[] = [];
  for (const m of conversazione) {
    if (m.ruolo === "utente") testi.push(m);
    else if (m.ruolo === "assistente" && m.testo.trim() !== "") testi.push({ ruolo: "assistente", testo: m.testo });
  }
  return [...testi.slice(-MESSAGGI_PER_ORCHESTRATORE), { ruolo: "utente", testo: messaggio }];
}

export interface OpzioniInstradamento {
  readonly cliente: ClienteModello;
  readonly stato: SituazioneViaggio;
  readonly conversazione: readonly Messaggio[];
  readonly messaggio: string;
  readonly ultimoAgente?: NomeAgente | null;
  readonly adesso?: Adesso | null;
  readonly segnale?: AbortSignal;
  /**
   * REQ-ORCH-002: con "modello" l'orchestratore chiede al modello per ogni messaggio a quale agente delegare (CA-1); se
   * il modello non risponde o non sceglie un agente valido ripiega in modo deterministico sulle regole (CA-3). Con
   * "regole" (predefinito) il modello decide solo per un viaggio confermato, come in REQ-ORCH-001.
   */
  readonly orchestrazione?: "regole" | "modello";
}

/** La scelta deterministica: le regole e, se non bastano, le parole chiave. */
export function scegliSenzaModello(stato: SituazioneViaggio, messaggio: string, ultimoAgente?: NomeAgente | null): SceltaAgente {
  const perRegole = scegliConRegole(stato, messaggio, ultimoAgente);
  return perRegole === null ? scegliPerRipiego(messaggio) : { ...perRegole, modo: "ripiego" };
}

/**
 * Sceglie l'agente. Con un viaggio confermato fa una richiesta al modello: se l'AI non risponde, solleva
 * `ErroreAiNonDisponibile` come il resto della chat.
 */
export async function scegliAgente(opzioni: OpzioniInstradamento): Promise<SceltaAgente> {
  if (opzioni.orchestrazione === "modello") {
    try {
      const scelta = await chiediAlModello(opzioni);
      if (scelta !== null) return scelta;
    } catch (errore) {
      // CA-3: senza modello (chiave assente, rifiutata, rete) l'orchestratore ripiega sulle regole.
      if (!(errore instanceof ErroreAiNonDisponibile)) throw errore;
    }
    return scegliSenzaModello(opzioni.stato, opzioni.messaggio, opzioni.ultimoAgente);
  }
  const perRegole = scegliConRegole(opzioni.stato, opzioni.messaggio, opzioni.ultimoAgente);
  if (perRegole !== null) return perRegole;
  return (await chiediAlModello(opzioni)) ?? scegliPerRipiego(opzioni.messaggio);
}

/** La richiesta al modello con il solo strumento `scegli_agente`; `null` se non sceglie un agente valido. */
async function chiediAlModello(opzioni: OpzioniInstradamento): Promise<SceltaAgente | null> {
  const risposta = await raccogliRisposta(
    opzioni.cliente.rispondi({
      istruzioni: `${ISTRUZIONI_ORCHESTRATORE}\n\n${testoSituazione(opzioni.stato, opzioni.adesso)}`,
      messaggi: messaggiPerOrchestratore(opzioni.conversazione, opzioni.messaggio),
      strumenti: [STRUMENTO_SCEGLI_AGENTE],
      ...(opzioni.segnale === undefined ? {} : { segnale: opzioni.segnale }),
    }),
  );
  for (const chiamata of risposta.chiamate) {
    if (chiamata.nome !== STRUMENTO_SCEGLI_AGENTE.nome) continue;
    const argomenti = leggiJson(chiamata.argomenti);
    const agente = argomenti?.agente;
    if (typeof agente === "string" && (NOMI_AGENTI as readonly string[]).includes(agente)) {
      const motivo = typeof argomenti?.motivo === "string" && argomenti.motivo.trim() !== "" ? argomenti.motivo : "Scelto dal modello.";
      return { agente: agente as NomeAgente, modo: "modello", motivo };
    }
  }
  return null;
}

function leggiJson(testo: string): Record<string, unknown> | null {
  try {
    const valore: unknown = JSON.parse(testo);
    return typeof valore === "object" && valore !== null && !Array.isArray(valore) ? (valore as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
