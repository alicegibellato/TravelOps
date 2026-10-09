/**
 * Importazione del vecchio file JSON di REQ-WEB-002 (`apps/web/.data/stato.json`) nella base dati (REQ-DATA-001,
 * CA-5). Avviene una volta sola, al primo avvio con la base dati: l'esito resta salvato nell'impostazione
 * `importazione_stato_json` e da lì in poi il file non si legge più. Il file non si cancella: resta come copia.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { scriviImpostazione, type BaseDati } from "../basedati";
import { salvaStatoDemo } from "./presentazione";
import { deserializzaStato } from "./stato";

/** Il nome del vecchio file dello stato. */
export const NOME_FILE_STATO_JSON = "stato.json";

/** L'impostazione con l'esito dell'importazione. */
export const CHIAVE_IMPORTAZIONE = "importazione_stato_json";

export type EsitoImportazioneStatoJson = { esito: "importato" } | { esito: "nessun file" } | { esito: "non valido"; motivo: string };

export function fileStatoJson(cartella: string): string {
  return join(cartella, NOME_FILE_STATO_JSON);
}

/**
 * Se nella cartella c'è il vecchio file dello stato ed è valido, lo porta nella base dati (viaggio di partenza,
 * scenario, orologio, storico, proposte); un file non valido non si importa. Registra l'esito e lo restituisce.
 */
export function importaStatoJson(db: BaseDati, cartella: string): EsitoImportazioneStatoJson {
  const file = fileStatoJson(cartella);
  let esito: EsitoImportazioneStatoJson;
  if (!existsSync(file)) {
    esito = { esito: "nessun file" };
  } else {
    let letto: ReturnType<typeof deserializzaStato>;
    try {
      letto = deserializzaStato(readFileSync(file, "utf8"));
    } catch (errore) {
      letto = { ok: false, motivo: `il file non si può leggere (${(errore as Error).message})` };
    }
    if (letto.ok) {
      salvaStatoDemo(db, letto.stato);
      esito = { esito: "importato" };
    } else {
      esito = { esito: "non valido", motivo: letto.motivo };
    }
  }
  scriviImpostazione(db, CHIAVE_IMPORTAZIONE, esito);
  return esito;
}
