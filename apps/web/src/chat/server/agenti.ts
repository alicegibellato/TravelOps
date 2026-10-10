/**
 * La chat collegata agli agenti (REQ-CHAT-001, ST-CHAT-001C): l'assistente della chat chiede la risposta
 * all'orchestratore di `@travelops/agents` (`rispondiAlMessaggio`), che sceglie l'agente e cambia il viaggio della
 * conversazione solo con gli strumenti del motore, sull'archivio nella base dati (`archivio-viaggio.ts`).
 *
 * Qui gli eventi degli agenti diventano quelli della chat: testo in streaming, l'agente che risponde, i passi
 * ("Preparo la bozza…"), le azioni fatte sul viaggio (la vista a lato si aggiorna) e, alla fine, la risposta con la
 * scheda ricca (preferenze, bozza o proposta con Accetta e Rifiuta) e le risposte rapide.
 */
import {
  ErroreAiNonDisponibile,
  NOMI_AGENTI,
  rispondiAlMessaggio,
  type Adesso,
  type ClienteModello,
  type EventoChat as EventoAgenti,
  type Messaggio as MessaggioModello,
  type NomeAgente,
} from "@travelops/agents";
import type { BozzaProfilo } from "@travelops/engine";
import type { SorgenteDestinazioni } from "@travelops/sources";
import { leggiImpostazione } from "../../basedati";
import { usaBaseDati } from "../../stato/avvio";
import { CHIAVE_PRESENTAZIONE } from "../../stato/presentazione";
import { OROLOGIO_PREDEFINITO } from "../../stato/stato";
import { leggiBozzaDalVivo } from "../bozza-dal-vivo";
import { vociPreferenze } from "../parole";
import type { CambioScheda, RispostaChat, SchedaChat, TurnoChat } from "../tipi";
import { creaArchivioConversazione, viaggioDellaConversazione } from "./archivio-viaggio";
import type { AssistenteChat, ContestoRisposta, EventoAssistente } from "./assistente";

export interface OpzioniAssistenteAgenti {
  cliente: ClienteModello;
  /** La sorgente delle destinazioni per la cartella dei dati (registrata nei test, quella della web app altrimenti). */
  sorgente: (cartella: string) => SorgenteDestinazioni;
  /** Data e ora attuali; predefinito l'orologio simulato della modalità presentazione. */
  adesso?: (cartella: string) => Adesso | null;
}

/** L'orologio simulato della modalità presentazione (pagina Demo): è il "adesso" della demo. */
export function orologioSimulato(cartella: string): Adesso {
  const impostazioni = usaBaseDati(cartella, (db) => leggiImpostazione(db, CHIAVE_PRESENTAZIONE)) as { orologio?: Adesso } | null;
  const orologio = impostazioni?.orologio;
  return typeof orologio?.data === "string" && typeof orologio.ora === "string" ? { data: orologio.data, ora: orologio.ora } : OROLOGIO_PREDEFINITO;
}

function messaggiPerGliAgenti(storia: readonly TurnoChat[]): MessaggioModello[] {
  return storia.map((turno) => ({ ruolo: turno.autore === "viaggiatore" ? "utente" : "assistente", testo: turno.testo }));
}

// --- le schede ricche dai risultati degli strumenti ---------------------------------------------------------------

interface VoceProgramma {
  id?: string;
  dalle?: string;
  alle?: string;
  attivita?: string;
  spostamento?: string;
}

function oggetto(valore: unknown): Record<string, unknown> {
  return typeof valore === "object" && valore !== null && !Array.isArray(valore) ? (valore as Record<string, unknown>) : {};
}

/**
 * La scheda della bozza, dalla bozza salvata (la stessa che si vede accanto alla chat): i giorni con le attività,
 * "Apri" porta al giorno nella pagina Pianifica.
 */
function schedaBozza(cartella: string, viaggioId: string, titolo: string): SchedaChat | null {
  const bozza = leggiBozzaDalVivo(cartella, viaggioId);
  if (bozza === null || bozza.giorni.length === 0) return null;
  return {
    tipo: "bozza",
    titolo,
    giorni: bozza.giorni.map((g) => ({
      titolo: g.titolo,
      attivita: g.voci.flatMap((v) => (v.spostamento ? [] : [v.testo])),
      href: `/pianifica?viaggio=${encodeURIComponent(viaggioId)}#giorno-${g.data}`,
    })),
  };
}

function testoVoce(voce: VoceProgramma): string {
  const orario = voce.dalle === undefined ? "" : `${voce.dalle} `;
  return `${orario}${voce.attivita ?? voce.spostamento ?? ""}`.trim();
}

/** La scheda di una proposta salvata: che cosa cambia, con Accetta e Rifiuta. */
function schedaProposta(evento: Extract<EventoAgenti, { tipo: "proposta" }>): SchedaChat {
  const dati = oggetto(evento.dati);
  const cambiamenti = oggetto(dati.cambiamenti);
  const lista = (chiave: string): VoceProgramma[] => (Array.isArray(cambiamenti[chiave]) ? (cambiamenti[chiave] as VoceProgramma[]) : []);
  const cambi: CambioScheda[] = [
    ...lista("rimossi").map((v): CambioScheda => ({ tipo: "rimosso", testo: testoVoce(v) })),
    ...lista("aggiunti").map((v): CambioScheda => ({ tipo: "aggiunto", testo: testoVoce(v) })),
    ...(Array.isArray(cambiamenti.modificati) ? (cambiamenti.modificati as { prima: VoceProgramma; dopo: VoceProgramma }[]) : []).map(
      (m): CambioScheda => ({ tipo: "spostato", testo: m.dopo.attivita ?? m.dopo.spostamento ?? "", prima: m.prima.dalle, dopo: m.dopo.dalle }),
    ),
  ];
  const spiegazione = typeof dati.spiegazione === "string" ? dati.spiegazione : undefined;
  const titolo = evento.tipoProposta === "ripianificazione" ? "Proposta per l'imprevisto" : "Proposta di modifica";
  return {
    tipo: "proposta",
    titolo,
    livello: "minimo",
    cambi,
    avviso: evento.fattibile ? spiegazione : (spiegazione ?? "Questa proposta non è fattibile così com'è."),
    propostaId: evento.propostaId,
    conferma: { titolo: "Proposta accettata", testo: "Ho aggiornato l'itinerario con una nuova versione." },
    rifiuto: "Va bene, lascio l'itinerario com'è.",
  };
}

/** Le risposte rapide: le tre destinazioni di "Sorprendimi" da scegliere con un tocco. */
function risposteRapide(eventi: readonly EventoAgenti[]): string[] {
  for (const evento of eventi) {
    if (evento.tipo !== "risultato" || evento.strumento !== "proponi_destinazioni") continue;
    const destinazioni = oggetto(evento.dati).destinazioni;
    if (Array.isArray(destinazioni)) {
      return destinazioni.flatMap((d) => (typeof oggetto(d).destinazione === "string" ? [`Andiamo a ${String(oggetto(d).destinazione)}`] : [])).slice(0, 3);
    }
  }
  return [];
}

const TITOLO_BOZZA: Readonly<Record<string, string>> = {
  genera_bozza: "La tua bozza",
  genera_alternativa: "L'alternativa",
  modifica_bozza: "La bozza aggiornata",
  rigenera_giornata: "La bozza aggiornata",
};

/** L'ultimo elemento che soddisfa la condizione. */
function ultimo<T>(elementi: readonly T[], condizione: (elemento: T) => boolean): T | undefined {
  for (let i = elementi.length - 1; i >= 0; i -= 1) if (condizione(elementi[i] as T)) return elementi[i];
  return undefined;
}

/** La scheda della risposta: la proposta, altrimenti la bozza, altrimenti il riepilogo delle preferenze. */
function schedaDellaRisposta(cartella: string, eventi: readonly EventoAgenti[], viaggioId: string | null): SchedaChat | undefined {
  const proposta = ultimo(eventi, (e) => e.tipo === "proposta");
  if (proposta?.tipo === "proposta") return schedaProposta(proposta);
  const bozza = ultimo(eventi, (e) => e.tipo === "azione" && TITOLO_BOZZA[e.strumento] !== undefined);
  if (bozza?.tipo === "azione" && viaggioId !== null) {
    const scheda = schedaBozza(cartella, viaggioId, TITOLO_BOZZA[bozza.strumento] ?? "La tua bozza");
    if (scheda !== null) return scheda;
  }
  const profilo = ultimo(eventi, (e) => e.tipo === "azione" && e.strumento === "aggiorna_profilo");
  if (profilo?.tipo === "azione") {
    const voci = vociPreferenze(oggetto(profilo.dati).profilo as BozzaProfilo);
    if (voci.length > 0) return { tipo: "preferenze", titolo: "Le tue preferenze", voci };
  }
  return undefined;
}

/** L'assistente della chat con gli agenti di TravelOps. */
export function assistenteDaAgenti(opzioni: OpzioniAssistenteAgenti): AssistenteChat {
  return {
    async *rispondi(storia, segnale, contesto?: ContestoRisposta): AsyncIterable<EventoAssistente> {
      if (contesto === undefined) throw new Error("gli agenti hanno bisogno della conversazione e della cartella dei dati");
      const ultimo = storia.at(-1);
      if (ultimo === undefined || ultimo.autore !== "viaggiatore") throw new Error("manca il messaggio del viaggiatore");
      const { cartella, conversazioneId } = contesto;
      const adesso = opzioni.adesso === undefined ? orologioSimulato(cartella) : opzioni.adesso(cartella);
      const eventi: EventoAgenti[] = [];
      const precedente = contesto.ultimoAgente;
      let agente: NomeAgente | null = (NOMI_AGENTI as readonly string[]).includes(precedente ?? "") ? (precedente as NomeAgente) : null;
      const viaggio = () => usaBaseDati(cartella, (db) => viaggioDellaConversazione(db, conversazioneId));

      for await (const evento of rispondiAlMessaggio({
        cliente: opzioni.cliente,
        archivio: creaArchivioConversazione(cartella, conversazioneId),
        sorgente: opzioni.sorgente(cartella),
        conversazione: messaggiPerGliAgenti(storia.slice(0, -1)),
        messaggio: ultimo.testo,
        ultimoAgente: agente,
        adesso,
        ...(segnale === undefined ? {} : { segnale }),
      })) {
        eventi.push(evento);
        switch (evento.tipo) {
          case "agente":
            agente = evento.agente;
            yield { tipo: "agente", agente: evento.agente, titolo: evento.titolo };
            break;
          case "testo":
            if (evento.testo !== "") yield { tipo: "testo", testo: evento.testo };
            break;
          case "passo":
            yield { tipo: "passo", testo: evento.testo };
            break;
          case "azione":
            yield { tipo: "azione", testo: evento.testo, viaggio: viaggio() };
            break;
          case "proposta":
            yield { tipo: "azione", testo: "Proposta pronta", viaggio: viaggio() };
            break;
          case "testo_corretto":
            yield { tipo: "testo_corretto", testo: evento.testo };
            break;
          case "non_disponibile":
            // L'AI non risponde: la chat lo mostra come "AI non disponibile" (chiave assente o rifiutata) o come errore.
            throw new ErroreAiNonDisponibile(evento.causa);
          case "fine": {
            const risposta: RispostaChat = { testo: evento.testo.trim(), agente: evento.agente };
            const scheda = schedaDellaRisposta(cartella, eventi, viaggio());
            if (scheda !== undefined) risposta.scheda = scheda;
            const rapide = risposteRapide(eventi);
            if (rapide.length > 0) risposta.risposteRapide = rapide;
            yield { tipo: "risposta", risposta };
            break;
          }
          default:
            break;
        }
      }
    },
  };
}
