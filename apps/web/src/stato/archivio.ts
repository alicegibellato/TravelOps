/**
 * Il file dello stato locale: `apps/web/.data/stato.json`, escluso da Git (REQ-WEB-002).
 * Si rilegge a ogni richiesta, quindi lo stato sopravvive al riavvio della web app (CA-8).
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deserializzaStato, serializzaStato, statoIniziale, type EsitoLetturaStato, type StatoDemo } from "./stato";

export const NOME_FILE_STATO = "stato.json";

/**
 * La cartella dei dati locali: `.data` nella cartella della web app, che è la cartella di lavoro di Next.js
 * (`scripts/next.mjs` avvia la CLI da lì).
 */
export function cartellaDati(): string {
  return join(process.cwd(), ".data");
}

export function fileStato(cartella: string): string {
  return join(cartella, NOME_FILE_STATO);
}

/** Lo stato salvato; se il file non c'è ancora, lo stato iniziale (versione 1 di riferimento), senza scrivere nulla. */
export function leggiStato(cartella: string): EsitoLetturaStato {
  const file = fileStato(cartella);
  if (!existsSync(file)) return { ok: true, stato: statoIniziale() };
  let testo: string;
  try {
    testo = readFileSync(file, "utf8");
  } catch (errore) {
    return { ok: false, motivo: `il file ${NOME_FILE_STATO} non si può leggere (${(errore as Error).message})` };
  }
  return deserializzaStato(testo);
}

/** Salva lo stato: scrive un file temporaneo e lo rinomina, così il file non resta mai scritto a metà. */
export function salvaStato(cartella: string, stato: StatoDemo): void {
  mkdirSync(cartella, { recursive: true });
  const file = fileStato(cartella);
  const temporaneo = `${file}.${process.pid}.tmp`;
  writeFileSync(temporaneo, serializzaStato(stato), "utf8");
  renameSync(temporaneo, file);
}
