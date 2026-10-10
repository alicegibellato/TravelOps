/**
 * I tre agenti di TravelOps (REQ-ORCH-001 revisione 2, ST-ORCH-001C): Consulente, Planner e Gestione imprevisti.
 *
 * Un agente è solo una configurazione del ciclo degli strumenti (`eseguiCiclo`): istruzioni di sistema in italiano e un
 * sottoinsieme degli strumenti del motore. Nessun agente ha altri modi di cambiare un viaggio (CA-2).
 */
import type { IstantaneaCatalogo } from "@travelops/engine";
import type { RegistroStrumenti } from "../ciclo.js";
import type { ArchivioViaggio } from "../strumenti/archivio.js";
import { NOMI_STRUMENTI, type NomeStrumento } from "../strumenti/strumenti.js";
import { REGOLE_COMUNI, RUOLO_CONSULENTE, RUOLO_IMPREVISTI, RUOLO_PLANNER } from "./istruzioni.js";

export const NOMI_AGENTI = ["consulente", "planner", "imprevisti"] as const;
export type NomeAgente = (typeof NOMI_AGENTI)[number];

export interface DefinizioneAgente {
  readonly nome: NomeAgente;
  /** Il nome da mostrare al viaggiatore. */
  readonly titolo: string;
  /** Istruzioni di sistema fisse (ruolo e regole comuni); la situazione del momento si aggiunge a ogni messaggio. */
  readonly istruzioni: string;
  /** Gli strumenti dell'agente, nell'ordine di `NOMI_STRUMENTI`. */
  readonly strumenti: readonly NomeStrumento[];
}

const nellOrdine = (nomi: readonly NomeStrumento[]): NomeStrumento[] => NOMI_STRUMENTI.filter((n) => nomi.includes(n));
const istruzioni = (ruolo: string): string => `${ruolo}\n\n${REGOLE_COMUNI}`;

export const AGENTI: Readonly<Record<NomeAgente, DefinizioneAgente>> = {
  consulente: {
    nome: "consulente",
    titolo: "Consulente",
    istruzioni: istruzioni(RUOLO_CONSULENTE),
    strumenti: nellOrdine(["cerca_destinazione", "prepara_destinazione", "proponi_destinazioni", "aggiorna_profilo", "genera_bozza", "cerca_catalogo", "leggi_viaggio"]),
  },
  planner: {
    nome: "planner",
    titolo: "Planner",
    istruzioni: istruzioni(RUOLO_PLANNER),
    strumenti: nellOrdine([
      "aggiorna_profilo",
      "genera_bozza",
      "opera_bozza",
      "cambia_preferenze_bozza",
      "conferma_viaggio",
      "proponi_modifica",
      "cerca_catalogo",
      "leggi_viaggio",
      "alternative_bozza",
      "confronta_bozza",
    ]),
  },
  imprevisti: {
    nome: "imprevisti",
    titolo: "Gestione imprevisti",
    istruzioni: istruzioni(RUOLO_IMPREVISTI),
    strumenti: nellOrdine(["proponi_modifica", "proponi_ripianificazione", "proponi_cambio_durata", "cerca_catalogo", "leggi_viaggio"]),
  },
};

/** Gli strumenti di un agente, presi dal registro completo del motore. */
export function strumentiDellAgente(agente: NomeAgente, registro: RegistroStrumenti): RegistroStrumenti {
  const nomi = new Set<string>(AGENTI[agente].strumenti);
  return registro.filter((s) => nomi.has(s.definizione.nome));
}

// --- la situazione del viaggio --------------------------------------------------------------------------------------

/**
 * In che fase è il viaggio della conversazione:
 * - `nuovo`: nessuna destinazione preparata;
 * - `destinazione`: destinazione pronta, nessuna bozza;
 * - `bozza`: c'è almeno una revisione della bozza, non confermata;
 * - `confermato`: c'è lo storico delle versioni.
 */
export type FaseViaggio = "nuovo" | "destinazione" | "bozza" | "confermato";

/** Data e ora attuali (nella demo l'orologio è simulato). */
export interface Adesso {
  /** `AAAA-MM-GG` */
  readonly data: string;
  /** `HH:mm` */
  readonly ora: string;
}

export interface SituazioneViaggio {
  readonly fase: FaseViaggio;
  readonly destinazione: string | null;
  /** L'istantanea del viaggio, se c'è: serve al controllo dei nomi (CA-2). */
  readonly istantanea: IstantaneaCatalogo | null;
}

/** Legge dall'archivio la fase del viaggio, la destinazione e l'istantanea. Non scrive nulla. */
export async function leggiSituazioneViaggio(archivio: ArchivioViaggio): Promise<SituazioneViaggio> {
  const scheda = await archivio.leggiScheda();
  const istantanea = scheda?.istantaneaId == null ? null : await archivio.leggiIstantanea(scheda.istantaneaId);
  const destinazione = istantanea?.destinazione ?? scheda?.destinazione ?? null;
  if ((await archivio.leggiStorico()) !== null) return { fase: "confermato", destinazione, istantanea };
  if ((await archivio.leggiRevisioniBozza()).length > 0) return { fase: "bozza", destinazione, istantanea };
  return { fase: istantanea === null ? "nuovo" : "destinazione", destinazione, istantanea };
}

const GIORNI = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];

const TESTO_FASE: Readonly<Record<FaseViaggio, string>> = {
  nuovo: "Il viaggio è appena iniziato: la destinazione non è ancora pronta.",
  destinazione: "La destinazione è pronta, la bozza non c'è ancora.",
  bozza: "C'è una bozza non ancora confermata: si può cambiare direttamente.",
  confermato: "Il viaggio è confermato: ogni cambiamento è una proposta che il viaggiatore accetta o rifiuta.",
};

/** La parte delle istruzioni che descrive il momento: data e ora, fase del viaggio e destinazione. */
export function testoSituazione(stato: SituazioneViaggio, adesso?: Adesso | null): string {
  const righe = ["Situazione:"];
  if (adesso != null) {
    const giorno = GIORNI[new Date(`${adesso.data}T12:00:00Z`).getUTCDay()] ?? "";
    righe.push(`- Adesso è ${giorno} ${adesso.data}, ore ${adesso.ora}.`);
  }
  righe.push(`- ${TESTO_FASE[stato.fase]}`);
  if (stato.destinazione !== null) righe.push(`- Destinazione: ${stato.destinazione}.`);
  return righe.join("\n");
}

/** Le istruzioni complete di un agente per questo messaggio: fisse più la situazione. */
export function istruzioniPer(agente: NomeAgente, stato: SituazioneViaggio, adesso?: Adesso | null): string {
  return `${AGENTI[agente].istruzioni}\n\n${testoSituazione(stato, adesso)}`;
}
