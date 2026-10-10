/**
 * La funzione unica per la chat (REQ-ORCH-001 revisione 2, ST-ORCH-001C; la usa ST-CHAT-001C lato server).
 *
 * `rispondiAlMessaggio` riceve il messaggio del viaggiatore e la conversazione salvata, sceglie l'agente
 * (orchestratore), esegue il ciclo degli strumenti dell'agente sul viaggio dell'archivio e restituisce gli eventi in
 * streaming: l'agente scelto, i pezzi di testo, i passi, le azioni fatte, le proposte. Prima della fine controlla il
 * testo (CA-2): se cita luoghi che non vengono dai dati o dice di aver prenotato qualcosa, lo sostituisce.
 */
import { MESSAGGIO_AI_NON_DISPONIBILE, ErroreAiNonDisponibile, type CausaAiNonDisponibile } from "../errori.js";
import { eseguiCiclo, type EventoCicloRisultato, type MotivoFineCiclo } from "../ciclo.js";
import type { ChiamataStrumento, ClienteModello, Messaggio } from "../modello.js";
import type { ArchivioViaggio } from "../strumenti/archivio.js";
import type { OperatoreBozza } from "../strumenti/bozza.js";
import { creaStrumentiMotore, type ContestoMotore, type NomeStrumento } from "../strumenti/strumenti.js";
import type { SorgenteDestinazioni } from "@travelops/sources";
import { AGENTI, istruzioniPer, leggiSituazioneViaggio, strumentiDellAgente, type Adesso, type NomeAgente } from "./agenti.js";
import { controllaRisposta, TESTO_RISPOSTA_SOSTITUITA, type ProblemaRisposta } from "./controllo.js";
import { scegliAgente, type ModoScelta } from "./instradamento.js";

/** Massimo predefinito di risposte del modello per messaggio (un messaggio può preparare destinazione e bozza). */
export const MAX_ITERAZIONI_CHAT = 10;

export interface OpzioniRisposta {
  readonly cliente: ClienteModello;
  /** Il viaggio della conversazione. */
  readonly archivio: ArchivioViaggio;
  /** La sorgente delle destinazioni (registrata nei test, reale nella web app). */
  readonly sorgente: SorgenteDestinazioni;
  /** La conversazione salvata, senza il messaggio nuovo. */
  readonly conversazione: readonly Messaggio[];
  /** Il messaggio nuovo del viaggiatore. */
  readonly messaggio: string;
  /** L'agente che ha risposto al messaggio precedente (dall'evento `fine`), per le risposte brevi come "Sì". */
  readonly ultimoAgente?: NomeAgente | null;
  /** Data e ora attuali, per "oggi" e "adesso" (nella demo: l'orologio simulato). */
  readonly adesso?: Adesso | null;
  /** Dati di contesto del motore; predefiniti i tempi dell'istantanea. */
  readonly contesto?: ContestoMotore;
  /** Le operazioni sulla bozza: la web app passa quelle dei pulsanti (REQ-PLAN-003); predefinito il motore sull'archivio. */
  readonly bozza?: OperatoreBozza;
  readonly maxIterazioni?: number;
  readonly segnale?: AbortSignal;
}

/** L'agente scelto per il messaggio: sempre il primo evento. */
export interface EventoChatAgente {
  readonly tipo: "agente";
  readonly agente: NomeAgente;
  /** Il nome da mostrare ("Consulente", "Planner", "Gestione imprevisti"). */
  readonly titolo: string;
  readonly modo: ModoScelta;
  readonly motivo: string;
}

/** Un pezzo del testo dell'agente, da mostrare subito. */
export interface EventoChatTesto {
  readonly tipo: "testo";
  readonly testo: string;
}

/** Uno strumento sta lavorando ("Preparo la bozza…"): per l'indicatore di avanzamento. */
export interface EventoChatPasso {
  readonly tipo: "passo";
  readonly strumento: NomeStrumento;
  readonly testo: string;
}

/** Un'azione fatta sul viaggio (profilo, destinazione, bozza, modifica, conferma): la vista si aggiorna. */
export interface EventoChatAzione {
  readonly tipo: "azione";
  readonly strumento: NomeStrumento;
  /** Che cosa è cambiato, in parole semplici ("Bozza creata"). */
  readonly testo: string;
  /** Il risultato dello strumento (JSON già letto). */
  readonly dati: unknown;
}

/** Una proposta salvata (modifica, ripianificazione o cambio di durata), da mostrare con Accetta e Rifiuta. */
export interface EventoChatProposta {
  readonly tipo: "proposta";
  readonly strumento: "proponi_modifica" | "proponi_ripianificazione" | "proponi_cambio_durata";
  readonly tipoProposta: "modifica" | "ripianificazione";
  readonly propostaId: number;
  readonly fattibile: boolean;
  readonly dati: unknown;
}

/** Il risultato di uno strumento che non cambia il viaggio (per esempio le destinazioni di "sorprendimi"). */
export interface EventoChatRisultato {
  readonly tipo: "risultato";
  readonly strumento: NomeStrumento;
  readonly dati: unknown;
}

/** Uno strumento non ha funzionato; il modello ha ricevuto il messaggio e può correggersi. Per i log del server. */
export interface EventoChatStrumentoFallito {
  readonly tipo: "strumento_fallito";
  readonly strumento: string;
  /** Il messaggio ricevuto dal modello. */
  readonly messaggio: string;
  readonly eccezione?: unknown;
}

/** Il controllo ha sostituito il testo già mostrato (CA-2): la chat rimpiazza la bolla con `testo`. */
export interface EventoChatTestoCorretto {
  readonly tipo: "testo_corretto";
  readonly testo: string;
  readonly problemi: readonly ProblemaRisposta[];
}

/** L'AI non risponde: la chat mostra `messaggio` e il resto dell'app continua. */
export interface EventoChatNonDisponibile {
  readonly tipo: "non_disponibile";
  readonly causa: CausaAiNonDisponibile;
  readonly messaggio: string;
}

/** Sempre l'ultimo evento. */
export interface EventoChatFine {
  readonly tipo: "fine";
  readonly agente: NomeAgente;
  /** Il testo finale dell'agente, già controllato. */
  readonly testo: string;
  readonly motivo: MotivoFineCiclo | "non_disponibile";
  /** Da aggiungere alla conversazione salvata: il messaggio del viaggiatore e quelli dell'agente (testi controllati). */
  readonly messaggiNuovi: readonly Messaggio[];
  readonly chiamate: readonly ChiamataStrumento[];
}

export type EventoChat =
  | EventoChatAgente
  | EventoChatTesto
  | EventoChatPasso
  | EventoChatAzione
  | EventoChatProposta
  | EventoChatRisultato
  | EventoChatStrumentoFallito
  | EventoChatTestoCorretto
  | EventoChatNonDisponibile
  | EventoChatFine;

/** Il testo dei passi, per strumento. */
export const TESTO_PASSO: Readonly<Record<NomeStrumento, string>> = {
  cerca_destinazione: "Cerco la destinazione…",
  prepara_destinazione: "Sto esplorando la destinazione…",
  proponi_destinazioni: "Cerco le destinazioni più adatte…",
  aggiorna_profilo: "Aggiorno le preferenze…",
  genera_bozza: "Preparo la bozza…",
  opera_bozza: "Modifico la bozza…",
  cambia_preferenze_bozza: "Cambio le preferenze della bozza…",
  conferma_viaggio: "Confermo il viaggio…",
  proponi_modifica: "Preparo la proposta…",
  proponi_ripianificazione: "Preparo la proposta per l'imprevisto…",
  proponi_cambio_durata: "Preparo la proposta per le date…",
  cerca_catalogo: "Cerco tra le attività…",
  leggi_viaggio: "Leggo il viaggio…",
  alternative_bozza: "Cerco le alternative…",
  confronta_bozza: "Confronto le revisioni…",
};

/** Il testo delle azioni fatte, per strumento che scrive. */
const TESTO_AZIONE: Partial<Record<NomeStrumento, string>> = {
  prepara_destinazione: "Destinazione pronta",
  aggiorna_profilo: "Preferenze aggiornate",
  genera_bozza: "Bozza creata",
  opera_bozza: "Bozza modificata",
  cambia_preferenze_bozza: "Preferenze della bozza cambiate",
  conferma_viaggio: "Viaggio confermato",
};

/**
 * Risponde a un messaggio del viaggiatore. Gli eventi arrivano nell'ordine: `agente`, poi testo, passi, azioni e
 * proposte mentre l'agente lavora, eventualmente `testo_corretto`, e infine `fine`. Se l'AI non risponde: evento
 * `non_disponibile` e `fine` con il solo messaggio del viaggiatore (le azioni già fatte restano nel viaggio).
 */
export async function* rispondiAlMessaggio(opzioni: OpzioniRisposta): AsyncGenerator<EventoChat> {
  const messaggioUtente: Messaggio = { ruolo: "utente", testo: opzioni.messaggio };
  const conSegnale = opzioni.segnale === undefined ? {} : { segnale: opzioni.segnale };
  let agente: NomeAgente = opzioni.ultimoAgente ?? "consulente";
  try {
    const stato = await leggiSituazioneViaggio(opzioni.archivio);
    const scelta = await scegliAgente({
      cliente: opzioni.cliente,
      stato,
      conversazione: opzioni.conversazione,
      messaggio: opzioni.messaggio,
      ...(opzioni.ultimoAgente === undefined ? {} : { ultimoAgente: opzioni.ultimoAgente }),
      ...(opzioni.adesso === undefined ? {} : { adesso: opzioni.adesso }),
      ...conSegnale,
    });
    agente = scelta.agente;
    yield { tipo: "agente", agente, titolo: AGENTI[agente].titolo, modo: scelta.modo, motivo: scelta.motivo };

    // REQ-IMPR-001 CA-3: Gestione imprevisti prepara una proposta solo dopo il sì del viaggiatore al suo riepilogo.
    const confermato = haConfermato(opzioni.conversazione, opzioni.messaggio);
    const registro = creaStrumentiMotore({
      archivio: opzioni.archivio,
      sorgente: opzioni.sorgente,
      ...(opzioni.contesto === undefined ? {} : { contesto: opzioni.contesto }),
      ...(opzioni.bozza === undefined ? {} : { bozza: opzioni.bozza }),
      ...(agente === "imprevisti" ? { propostaConfermata: () => confermato } : {}),
    });
    const messaggi = [...opzioni.conversazione, messaggioUtente];
    for await (const evento of eseguiCiclo({
      cliente: opzioni.cliente,
      istruzioni: istruzioniPer(agente, stato, opzioni.adesso),
      messaggi,
      strumenti: strumentiDellAgente(agente, registro),
      maxIterazioni: opzioni.maxIterazioni ?? MAX_ITERAZIONI_CHAT,
      ...conSegnale,
    })) {
      if (evento.tipo === "testo") yield evento;
      else if (evento.tipo === "chiamata_strumento") {
        const testo = TESTO_PASSO[evento.chiamata.nome as NomeStrumento];
        if (testo !== undefined) yield { tipo: "passo", strumento: evento.chiamata.nome as NomeStrumento, testo };
      } else if (evento.tipo === "risultato_strumento") yield eventoDelRisultato(evento);
      else {
        // CA-2: il testo dell'agente in questo turno deve citare solo nomi delle fonti ammesse.
        const { esito } = evento;
        const statoDopo = await leggiSituazioneViaggio(opzioni.archivio);
        const scritto = esito.messaggiNuovi.flatMap((m) => (m.ruolo === "assistente" && m.testo !== "" ? [m.testo] : [])).join("\n");
        const problemi = controllaRisposta(scritto, { istantanea: statoDopo.istantanea, conversazione: [...messaggi, ...esito.messaggiNuovi] });
        let testo = esito.testo;
        let nuovi = esito.messaggiNuovi;
        if (problemi.length > 0) {
          testo = TESTO_RISPOSTA_SOSTITUITA;
          nuovi = sostituisciTesti(esito.messaggiNuovi, testo);
          yield { tipo: "testo_corretto", testo, problemi };
        }
        yield { tipo: "fine", agente, testo, motivo: esito.motivo, messaggiNuovi: [messaggioUtente, ...nuovi], chiamate: esito.chiamate };
        return;
      }
    }
    throw new Error("Il ciclo dell'agente è finito senza l'evento \"fine\".");
  } catch (errore) {
    if (!(errore instanceof ErroreAiNonDisponibile)) throw errore;
    yield { tipo: "non_disponibile", causa: errore.causa, messaggio: MESSAGGIO_AI_NON_DISPONIBILE };
    yield { tipo: "fine", agente, testo: MESSAGGIO_AI_NON_DISPONIBILE, motivo: "non_disponibile", messaggiNuovi: [messaggioUtente], chiamate: [] };
  }
}

function normalizza(testo: string): string {
  return testo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/** Le risposte che valgono come "sì" alla domanda di conferma. */
const AFFERMATIVA = /^(si|sì|ok|okay|va bene|procedi|procedere|confermo|conferma|certo|d'accordo|daccordo|vai|perfetto|esatto|giusto)\b/u;

/**
 * Vero se il viaggiatore ha confermato (REQ-IMPR-001 CA-3): l'ultimo messaggio di TravelOps finisce con una domanda
 * (il riepilogo, per esempio "Ho capito: ritardo di 2 ore da adesso. Procedo?") e il messaggio nuovo è un sì.
 */
export function haConfermato(conversazione: readonly Messaggio[], messaggio: string): boolean {
  let precedente: string | null = null;
  for (let i = conversazione.length - 1; i >= 0 && precedente === null; i -= 1) {
    const m = conversazione[i];
    if (m?.ruolo === "utente") return false;
    if (m?.ruolo === "assistente" && m.testo.trim() !== "") precedente = m.testo.trim();
  }
  return precedente !== null && precedente.endsWith("?") && AFFERMATIVA.test(normalizza(messaggio));
}

/** Raccoglie tutti gli eventi di una risposta (per i test e per chi non usa lo streaming). */
export async function rispondiAlMessaggioCompleto(opzioni: OpzioniRisposta): Promise<{ eventi: EventoChat[]; fine: EventoChatFine }> {
  const eventi: EventoChat[] = [];
  for await (const evento of rispondiAlMessaggio(opzioni)) eventi.push(evento);
  const fine = eventi.at(-1);
  if (fine?.tipo !== "fine") throw new Error("La risposta è finita senza l'evento \"fine\".");
  return { eventi, fine };
}

function eventoDelRisultato(evento: EventoCicloRisultato): EventoChat {
  const strumento = evento.chiamata.nome as NomeStrumento;
  const dati = leggiJson(evento.risultato);
  if (evento.errore) {
    const messaggio = typeof dati === "object" && dati !== null && typeof (dati as { errore?: unknown }).errore === "string" ? (dati as { errore: string }).errore : evento.risultato;
    return { tipo: "strumento_fallito", strumento: evento.chiamata.nome, messaggio, ...(evento.eccezione === undefined ? {} : { eccezione: evento.eccezione }) };
  }
  const campi = (typeof dati === "object" && dati !== null ? dati : {}) as Record<string, unknown>;
  if (strumento === "proponi_modifica" || strumento === "proponi_ripianificazione" || strumento === "proponi_cambio_durata") {
    return {
      tipo: "proposta",
      strumento,
      tipoProposta: strumento === "proponi_ripianificazione" ? "ripianificazione" : "modifica",
      propostaId: typeof campi.propostaId === "number" ? campi.propostaId : 0,
      fattibile: campi.fattibile === true,
      dati,
    };
  }
  const testo = TESTO_AZIONE[strumento];
  // Uno strumento che scrive ma non ha cambiato nulla (modifica non fattibile, alternativa uguale, …) è solo un risultato.
  const nienteFatto = campi.applicata === false || campi.pronta === false || campi.nuovaRevisione === false || campi.rigenerata === false || campi.salvato === false;
  if (testo !== undefined && !nienteFatto) return { tipo: "azione", strumento, testo, dati };
  return { tipo: "risultato", strumento, dati };
}

/** I messaggi dell'agente con il testo sostituito: quello finale diventa `testo`, quelli intermedi vuoti. */
function sostituisciTesti(messaggi: readonly Messaggio[], testo: string): Messaggio[] {
  const ultimo = messaggi.reduce((indice, m, i) => (m.ruolo === "assistente" ? i : indice), -1);
  return messaggi.map((m, i) => (m.ruolo !== "assistente" ? m : { ...m, testo: i === ultimo ? testo : "" }));
}

function leggiJson(testo: string): unknown {
  try {
    return JSON.parse(testo);
  } catch {
    return testo;
  }
}
