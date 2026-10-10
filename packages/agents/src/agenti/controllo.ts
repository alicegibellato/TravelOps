/**
 * Il controllo delle risposte degli agenti (REQ-ORCH-001 CA-2, ST-ORCH-001C): nessun itinerario che non viene dal
 * motore.
 *
 * Prima di salvare la risposta finale di un agente, la chat cerca nel testo i nomi propri (parole con l'iniziale
 * maiuscola, anche di più parole come "Castello del Buonconsiglio") e controlla che ognuno venga da una fonte ammessa:
 * - l'istantanea del viaggio (attività, luoghi, zone, destinazione);
 * - i risultati degli strumenti nella conversazione (motore e sorgente delle destinazioni);
 * - i messaggi del viaggiatore (può citare un luogo, e l'agente lo può ripetere).
 * I testi dell'assistente non sono una fonte: un nome inventato in un turno non diventa ammesso nel turno dopo.
 * Il controllo segnala anche le frasi in cui l'agente dice di aver prenotato, pagato o cancellato qualcosa.
 *
 * Limiti dichiarati: una sola parola con l'iniziale maiuscola a inizio frase non si controlla (in italiano è quasi
 * sempre una parola comune); un nome è ammesso se tutte le sue parole stanno in un solo nome o testo delle fonti.
 */
import type { IstantaneaCatalogo } from "@travelops/engine";
import type { Messaggio } from "../modello.js";

export type TipoProblemaRisposta = "luogo_sconosciuto" | "prenotazione_dichiarata";

export interface ProblemaRisposta {
  readonly tipo: TipoProblemaRisposta;
  /** Il nome o la frase trovati nel testo. */
  readonly testo: string;
}

/** Il testo che sostituisce una risposta che non supera il controllo. */
export const TESTO_RISPOSTA_SOSTITUITA =
  "Scusa, nella mia risposta c'erano informazioni che non posso garantire, quindi non te la mostro. " +
  "Le azioni fatte e le proposte che vedi qui sopra vengono dal motore e sono valide: chiedimi pure di nuovo.";

export interface FontiNomi {
  /** L'istantanea del viaggio, se c'è. */
  readonly istantanea?: IstantaneaCatalogo | null;
  /** La conversazione fino alla risposta da controllare (risultati degli strumenti e messaggi del viaggiatore). */
  readonly conversazione?: readonly Messaggio[];
  /** Altri testi ammessi. */
  readonly altri?: readonly string[];
}

/** Parole che legano un nome di più parole ("Lago di Garda", "Riva del Garda"). */
const CONNETTORI = new Set([
  "di", "del", "della", "dello", "dei", "degli", "delle", "dell", "d", "da", "dal", "dalla", "dalle", "al", "alla", "allo", "ai", "all",
  "sul", "sulla", "sull", "nel", "nella", "nell", "de", "s", "of", "the",
]);

/** Parole con l'iniziale maiuscola che non sono luoghi: interfaccia, giorni, mesi, il nome del prodotto. */
const GENERICHE = new Set([
  "travelops", "accetta", "rifiuta", "annulla", "apri", "confronta", "versioni", "oggi", "ok",
  "lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato", "domenica",
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
  "openstreetmap", "contributors",
]);

/** Frasi in cui l'agente dice di aver fatto qualcosa presso un fornitore. */
const PRENOTAZIONE_DICHIARATA =
  /\b(?:ho|abbiamo|t[iì] ho|vi ho|l'ho|li ho|le ho)\s+(?:gi[aà]\s+|anche\s+|appena\s+)?(?:prenotat|cancellat|disdett|pagat|acquistat|comprat|riservat)\w*/giu;

/** Normalizza per il confronto: minuscole, senza accenti. */
function normalizza(testo: string): string {
  return testo.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function parole(testo: string): string[] {
  return normalizza(testo).split(/[^\p{L}\p{N}]+/u).filter((p) => p !== "");
}

/** I testi ammessi, ognuno come insieme di parole. */
export function raccogliFonti(fonti: FontiNomi): Set<string>[] {
  const testi: string[] = [...(fonti.altri ?? [])];
  const ist = fonti.istantanea;
  if (ist != null) {
    testi.push(ist.destinazione);
    for (const z of ist.zone) testi.push(z.nome);
    for (const l of ist.luoghi) testi.push(l.nome);
    for (const a of ist.attivita) testi.push(a.nome, ...(a.descrizioneBreve === undefined ? [] : [a.descrizioneBreve]));
    const area = (ist as { area?: { nome?: unknown; descrizione?: unknown } }).area;
    if (typeof area?.nome === "string") testi.push(area.nome);
    if (typeof area?.descrizione === "string") testi.push(area.descrizione);
  }
  for (const m of fonti.conversazione ?? []) {
    if (m.ruolo === "utente") testi.push(m.testo);
    else if (m.ruolo === "strumento") raccogliTesti(leggiJson(m.risultato), testi);
  }
  return testi.map((t) => new Set(parole(t))).filter((s) => s.size > 0);
}

function raccogliTesti(valore: unknown, testi: string[]): void {
  if (typeof valore === "string") testi.push(valore);
  else if (Array.isArray(valore)) for (const v of valore) raccogliTesti(v, testi);
  else if (typeof valore === "object" && valore !== null) for (const v of Object.values(valore)) raccogliTesti(v, testi);
}

function leggiJson(testo: string): unknown {
  try {
    return JSON.parse(testo);
  } catch {
    return testo;
  }
}

interface Parola {
  readonly testo: string;
  readonly maiuscola: boolean;
  /** Vero se la parola apre una frase (o una riga, o una voce di elenco). */
  readonly inizioFrase: boolean;
  /** Vero se tra questa parola e la precedente c'è solo spazio, apostrofo o trattino (stesso nome). */
  readonly unitaAllaPrecedente: boolean;
}

function dividi(testo: string): Parola[] {
  const risultato: Parola[] = [];
  let fine = 0;
  for (const corrispondenza of testo.matchAll(/[\p{L}\p{N}]+/gu)) {
    const inizio = corrispondenza.index ?? 0;
    const separatore = testo.slice(fine, inizio);
    const precedente = risultato.at(-1);
    const parola = corrispondenza[0];
    risultato.push({
      testo: parola,
      maiuscola: /^\p{Lu}/u.test(parola),
      inizioFrase: precedente === undefined || /[.!?:;\n•]/.test(separatore) || (/^\d+$/.test(precedente.testo) && /\./.test(separatore)),
      unitaAllaPrecedente: /^[ \t'’\-–]*$/.test(separatore),
    });
    fine = inizio + parola.length;
  }
  return risultato;
}

/** I nomi propri del testo: sequenze di parole con l'iniziale maiuscola, con i connettori in mezzo. */
export function estraiNomiPropri(testo: string): { parole: string[]; inizioFrase: boolean }[] {
  const tutte = dividi(testo);
  const nomi: { parole: string[]; inizioFrase: boolean }[] = [];
  let i = 0;
  while (i < tutte.length) {
    const prima = tutte[i]!;
    if (!prima.maiuscola || /^\d/.test(prima.testo)) {
      i += 1;
      continue;
    }
    const gruppo = [prima.testo];
    let j = i + 1;
    while (j < tutte.length && tutte[j]!.unitaAllaPrecedente && !tutte[j]!.inizioFrase) {
      // Connettori minuscoli solo se dopo arriva un'altra parola maiuscola dello stesso nome.
      let k = j;
      while (k < tutte.length && !tutte[k]!.maiuscola && CONNETTORI.has(normalizza(tutte[k]!.testo)) && tutte[k]!.unitaAllaPrecedente) k += 1;
      const dopo = tutte[k];
      if (dopo === undefined || !dopo.maiuscola || !dopo.unitaAllaPrecedente || dopo.inizioFrase) break;
      for (let x = j; x <= k; x += 1) gruppo.push(tutte[x]!.testo);
      j = k + 1;
    }
    nomi.push({ parole: gruppo, inizioFrase: prima.inizioFrase });
    i = j;
  }
  return nomi;
}

function significative(gruppo: readonly string[]): string[] {
  return gruppo.map(normalizza).filter((p) => !CONNETTORI.has(p) && !GENERICHE.has(p) && !/^\d+$/.test(p));
}

function ammesso(gruppo: readonly string[], fonti: readonly Set<string>[]): boolean {
  const da = significative(gruppo);
  if (da.length === 0) return true;
  return fonti.some((fonte) => da.every((p) => fonte.has(p)));
}

/**
 * Controlla il testo di una risposta: nomi propri che non vengono dalle fonti ammesse e frasi in cui l'agente dice di
 * aver prenotato, pagato o cancellato qualcosa. Restituisce i problemi trovati (vuoto se va tutto bene).
 */
export function controllaRisposta(testo: string, fonti: FontiNomi | readonly Set<string>[]): ProblemaRisposta[] {
  const ammessi = Array.isArray(fonti) ? (fonti as readonly Set<string>[]) : raccogliFonti(fonti as FontiNomi);
  const problemi: ProblemaRisposta[] = [];
  for (const { parole: gruppo, inizioFrase } of estraiNomiPropri(testo)) {
    if (ammesso(gruppo, ammessi)) continue;
    // A inizio frase la prima parola può essere una parola comune ("Domani", "Ecco"): si riprova senza.
    if (inizioFrase) {
      const resto = gruppo.slice(1);
      while (resto.length > 0 && CONNETTORI.has(normalizza(resto[0]!))) resto.shift();
      if (ammesso(resto, ammessi)) continue;
    }
    const nome = gruppo.join(" ");
    if (!problemi.some((p) => p.testo === nome)) problemi.push({ tipo: "luogo_sconosciuto", testo: nome });
  }
  for (const frase of testo.matchAll(PRENOTAZIONE_DICHIARATA)) problemi.push({ tipo: "prenotazione_dichiarata", testo: frase[0] });
  return problemi;
}
