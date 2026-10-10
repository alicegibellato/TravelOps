/**
 * Supporto ai test degli agenti (ST-ORCH-001C): copioni della demo con le conversazioni registrate di
 * `conversazioni/`, il viaggio confermato dell'Atto 3 e la verifica delle risposte.
 *
 * Il viaggio dell'Atto 3 è la variante V-VOLO dei dati di riferimento (sabato 13 giugno con il trekking al Ponale la
 * mattina, volo di ritorno a orario fisso la domenica sera) con il catalogo esteso presentato come istantanea: lo
 * stesso modo in cui la web app collega un viaggio dell'ondata 1 (README, "ArchivioViaggio").
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { creaStorico, type IstantaneaCatalogo, type Viaggio } from "@travelops/engine";
import {
  caricaConversazioneRegistrata,
  creaArchivioInMemoria,
  creaClienteFinto,
  rispondiAlMessaggioCompleto,
  type Adesso,
  type ArchivioInMemoria,
  type ClienteFinto,
  type EventoChat,
  type EventoChatFine,
  type Messaggio,
  type NomeAgente,
} from "../../src/index.js";
import { sorgenteRegistrata } from "../strumenti/supporto.js";

const RIFERIMENTO = new URL("../../../engine/data/reference/", import.meta.url);
const leggi = <T>(file: string): T => JSON.parse(readFileSync(new URL(file, RIFERIMENTO), "utf8").replace(/^﻿/, "")) as T;

export const ISTANTANEA_RIFERIMENTO = "riferimento-garda";

/** Il catalogo esteso dell'ondata 1 presentato come istantanea, con i tempi di percorrenza del contesto. */
export function istantaneaRiferimento(): IstantaneaCatalogo {
  const catalogo = leggi<Pick<IstantaneaCatalogo, "zone" | "luoghi" | "attivita">>("estensioni/catalogo-esteso.json");
  const { tempiPercorrenza } = leggi<{ tempiPercorrenza: IstantaneaCatalogo["tempiPercorrenza"] }>("contesto.json");
  return { ...catalogo, id: ISTANTANEA_RIFERIMENTO, destinazione: "Lago di Garda", dataCreazione: "2026-06-01", fonti: [], tempiPercorrenza };
}

/** Il viaggio confermato dell'Atto 3: V-VOLO, versione 1. */
export function archivioViaggioConfermato(): ArchivioInMemoria {
  const creato = creaStorico(leggi<Viaggio>("variante-v-volo.json"));
  if (!creato.ok) throw new Error(creato.errore.messaggio);
  return creaArchivioInMemoria({
    scheda: { titolo: "Weekend sul Garda, con il volo di ritorno", stato: "confermato", destinazione: "Lago di Garda", istantaneaId: ISTANTANEA_RIFERIMENTO },
    istantanee: [istantaneaRiferimento()],
    storico: creato.storico,
  });
}

/** L'orologio simulato dell'Atto 3 (CR-001 §10). */
export const SABATO_MATTINA: Adesso = { data: "2026-06-13", ora: "08:00" };

export const conversazioneRegistrata = (nome: string): string => fileURLToPath(new URL(`./conversazioni/${nome}`, import.meta.url));

/** L'esito di un messaggio del copione. */
export interface EsitoMessaggio {
  readonly messaggio: string;
  readonly eventi: readonly EventoChat[];
  readonly fine: EventoChatFine;
  readonly agente: NomeAgente;
  /** I nomi degli strumenti chiamati, nell'ordine. */
  readonly strumenti: readonly string[];
}

export interface Copione {
  readonly cliente: ClienteFinto;
  readonly esiti: readonly EsitoMessaggio[];
  readonly conversazione: readonly Messaggio[];
}

/**
 * Esegue i messaggi del copione uno dopo l'altro, come la chat: conversazione salvata e ultimo agente passati al
 * messaggio dopo, un solo client finto per tutta la registrazione. Alla fine tutti i turni registrati devono essere usati.
 */
export async function eseguiCopione(opzioni: {
  file: string;
  messaggi: readonly string[];
  archivio: ArchivioInMemoria;
  adesso?: Adesso;
  conversazione?: readonly Messaggio[];
  ultimoAgente?: NomeAgente | null;
}): Promise<Copione> {
  const cliente = creaClienteFinto(caricaConversazioneRegistrata(conversazioneRegistrata(opzioni.file)));
  const sorgente = sorgenteRegistrata();
  let conversazione: Messaggio[] = [...(opzioni.conversazione ?? [])];
  let ultimoAgente: NomeAgente | null = opzioni.ultimoAgente ?? null;
  const esiti: EsitoMessaggio[] = [];
  for (const messaggio of opzioni.messaggi) {
    const { eventi, fine } = await rispondiAlMessaggioCompleto({
      cliente,
      archivio: opzioni.archivio,
      sorgente,
      conversazione,
      messaggio,
      ultimoAgente,
      ...(opzioni.adesso === undefined ? {} : { adesso: opzioni.adesso }),
    });
    conversazione = [...conversazione, ...fine.messaggiNuovi];
    ultimoAgente = fine.agente;
    esiti.push({ messaggio, eventi, fine, agente: fine.agente, strumenti: fine.chiamate.map((c) => c.nome) });
  }
  cliente.verificaCompletata();
  return { cliente, esiti, conversazione };
}

/** Il risultato JSON di uno strumento in una risposta. */
export function datiDi(esito: EsitoMessaggio, tipo: "azione" | "proposta" | "risultato", strumento?: string): any[] {
  return esito.eventi.filter((e) => e.tipo === tipo && (strumento === undefined || (e as { strumento: string }).strumento === strumento)).map((e) => (e as { dati: unknown }).dati);
}
