/**
 * Stato locale della web app (REQ-WEB-002): il viaggio di partenza, lo scenario in corso, l'orologio simulato,
 * lo storico delle versioni e le proposte mostrate.
 *
 * Lo storico si salva e si rilegge con le funzioni del motore `esportaStorico` e `importaStorico` (REQ-ITIN-002),
 * che lo validano. Le proposte sono quelle restituite da `proponiRipianificazione`, salvate così come sono: quando il
 * viaggiatore le accetta, il motore le ricontrolla (`applicaProposta`). Nell'ondata 2 il file sarà sostituito dal
 * database.
 */
import {
  creaStorico,
  esportaStorico,
  importaStorico,
  type Momento,
  type PropostaRipianificazione,
  type Storico,
} from "@travelops/engine";
import { trovaScenario } from "../dati/scenari";
import { caricaViaggioScelto, trovaVoceViaggio } from "../dati/viaggi";

/** Versione del formato del file. */
export const FORMATO_STATO = 1;

/** Il viaggio di partenza quando non è stato avviato nessuno scenario. */
export const PARTENZA_PREDEFINITA = "versione-1";

/** Orologio simulato iniziale: il primo giorno del viaggio di riferimento, alle 08:00. */
export const OROLOGIO_PREDEFINITO: Momento = { data: "2026-06-12", ora: "08:00" };

/** Il nome proposto per chi accetta una proposta (modificabile). */
export const NOME_PREDEFINITO = "Viaggiatore";

/** Decisione presa sulla proposta. `versione` è `null` se l'accettazione non ha creato versioni (`NESSUNA_MODIFICA`). */
export type Decisione =
  | { tipo: "accettata"; versione: number | null; autore: string; momento: Momento }
  | { tipo: "rifiutata" };

/** Esito dell'ultima azione sulla proposta, da mostrare al viaggiatore. Avvisi ed errori sono i messaggi del motore. */
export interface EsitoAzione {
  livello: "successo" | "avviso" | "errore";
  messaggio: string;
}

export interface PropostaSalvata {
  /** Numero progressivo, mai riutilizzato: identifica la proposta negli indirizzi e nei moduli. */
  id: number;
  /** Lo scenario da cui nasce. */
  scenario: string;
  /** La proposta del motore, così come è stata restituita. */
  proposta: PropostaRipianificazione;
  decisione: Decisione | null;
  ultimoEsito: EsitoAzione | null;
}

export interface StatoDemo {
  /** Chiave del viaggio di partenza (versione 1 o variante). */
  partenza: string;
  /** Lo scenario avviato, con l'imprevisto in corso; `null` se non ne è stato avviato nessuno. */
  scenario: string | null;
  /** Orologio simulato: data e ora correnti del viaggio, usate come momento di accettazione. */
  orologio: Momento;
  storico: Storico;
  /** Le proposte dello scenario in corso (avviare uno scenario o ripristinare le scarta). */
  proposte: PropostaSalvata[];
  prossimaProposta: number;
}

/** Stato con il solo itinerario di partenza (versione 1 dello storico). */
export function statoIniziale(
  partenza: string = PARTENZA_PREDEFINITA,
  scenario: string | null = null,
  orologio: Momento = OROLOGIO_PREDEFINITO,
  prossimaProposta = 1,
): StatoDemo {
  const dati = caricaViaggioScelto(partenza);
  if (dati === null) throw new Error(`Viaggio di partenza sconosciuto: ${partenza}`);
  if (!dati.ok) throw new Error(`Il viaggio di partenza ${partenza} non è valido: ${dati.errori.map((e) => e.messaggio).join("; ")}`);
  const creato = creaStorico(dati.viaggio);
  if (!creato.ok) throw new Error(creato.errore.messaggio);
  return { partenza, scenario, orologio: { ...orologio }, storico: creato.storico, proposte: [], prossimaProposta };
}

/** Il testo del file: JSON con rientro di due spazi; lo storico è quello di `esportaStorico`. */
export function serializzaStato(stato: StatoDemo): string {
  const documento = {
    formato: FORMATO_STATO,
    partenza: stato.partenza,
    scenario: stato.scenario,
    orologio: stato.orologio,
    storico: JSON.parse(esportaStorico(stato.storico)) as unknown,
    proposte: stato.proposte,
    prossimaProposta: stato.prossimaProposta,
  };
  return `${JSON.stringify(documento, null, 2)}\n`;
}

export type EsitoLetturaStato = { ok: true; stato: StatoDemo } | { ok: false; motivo: string };

const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;
const FORMATO_ORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Vero se data e ora hanno il formato `AAAA-MM-GG` e `HH:mm`; la validità piena la controlla il motore all'accettazione. */
export function formatoMomento(valore: unknown): valore is Momento {
  if (typeof valore !== "object" || valore === null) return false;
  const { data, ora } = valore as Record<string, unknown>;
  return typeof data === "string" && FORMATO_DATA.test(data) && typeof ora === "string" && FORMATO_ORA.test(ora);
}

function oggetto(valore: unknown): valore is Record<string, unknown> {
  return typeof valore === "object" && valore !== null && !Array.isArray(valore);
}

function interoPositivo(valore: unknown): valore is number {
  return typeof valore === "number" && Number.isInteger(valore) && valore >= 1;
}

function propostaSalvata(valore: unknown): valore is PropostaSalvata {
  if (!oggetto(valore)) return false;
  return (
    interoPositivo(valore.id) &&
    typeof valore.scenario === "string" &&
    oggetto(valore.proposta) &&
    interoPositivo(valore.proposta.versioneBase) &&
    oggetto(valore.proposta.itinerario) &&
    (valore.decisione === null || oggetto(valore.decisione)) &&
    (valore.ultimoEsito === null || oggetto(valore.ultimoEsito))
  );
}

/** Rilegge il testo del file. Non solleva eccezioni: un file non valido dà il motivo. */
export function deserializzaStato(testo: string): EsitoLetturaStato {
  let documento: unknown;
  try {
    documento = JSON.parse(testo.replace(/^﻿/, ""));
  } catch {
    return { ok: false, motivo: "il file non contiene JSON valido" };
  }
  if (!oggetto(documento)) return { ok: false, motivo: "il file non contiene un oggetto" };
  if (documento.formato !== FORMATO_STATO) return { ok: false, motivo: `formato del file non supportato: ${String(documento.formato)}` };
  const { partenza, scenario, orologio, proposte, prossimaProposta } = documento;
  if (typeof partenza !== "string" || trovaVoceViaggio(partenza) === null) return { ok: false, motivo: "viaggio di partenza sconosciuto" };
  if (scenario !== null && (typeof scenario !== "string" || trovaScenario(scenario) === null)) {
    return { ok: false, motivo: "scenario sconosciuto" };
  }
  if (!formatoMomento(orologio)) return { ok: false, motivo: "orologio simulato non valido" };
  if (!Array.isArray(proposte) || !proposte.every(propostaSalvata)) return { ok: false, motivo: "proposte non valide" };
  if (!interoPositivo(prossimaProposta) || proposte.some((p) => p.id >= prossimaProposta)) {
    return { ok: false, motivo: "numero della prossima proposta non valido" };
  }
  const importato = importaStorico(documento.storico);
  if (!importato.ok) {
    return { ok: false, motivo: [importato.errore.messaggio, ...importato.errore.dettagli].join("; ") };
  }
  return {
    ok: true,
    stato: {
      partenza,
      scenario: scenario as string | null,
      orologio: { data: orologio.data, ora: orologio.ora },
      storico: importato.storico,
      proposte,
      prossimaProposta,
    },
  };
}
