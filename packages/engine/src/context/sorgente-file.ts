/**
 * Sorgente dei dati di contesto che legge i file simulati dell'ondata 1 (REQ-FEAS-001).
 * Legge e valida il file una sola volta, alla creazione: le interrogazioni successive
 * non toccano più il disco.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SorgenteDatiContesto } from "../model/index.js";
import { costruisciSorgente } from "./sorgente-memoria.js";
import { ErroreDatiContesto, validaDatiContesto } from "./validazione.js";

/** Nome del file dei dati di contesto nella cartella dei dati simulati (come in `data/reference`). */
export const FILE_DATI_CONTESTO = "contesto.json";

/**
 * Crea la sorgente leggendo `<cartella>/<nomeFile>` (formato `DatiContesto`).
 * @throws ErroreDatiContesto se il file manca, non è JSON o non rispetta il modello.
 */
export function creaSorgenteDaFile(cartella: string, nomeFile: string = FILE_DATI_CONTESTO): SorgenteDatiContesto {
  const percorso = join(cartella, nomeFile);
  let testo: string;
  try {
    testo = readFileSync(percorso, "utf8");
  } catch (causa) {
    throw new ErroreDatiContesto([`impossibile leggere il file ${percorso}`], { cause: causa });
  }
  let contenuto: unknown;
  try {
    contenuto = JSON.parse(testo.replace(/^﻿/, ""));
  } catch (causa) {
    throw new ErroreDatiContesto([`il file ${percorso} non contiene JSON valido`], { cause: causa });
  }
  return costruisciSorgente(validaDatiContesto(contenuto));
}
