/**
 * Supporto ai test di @travelops/sources: l'istantanea di prova e copie modificabili.
 *
 * `test/dati/prova-dato-di-test.json` è un DATO DI TEST: un borgo inventato ("Borgo di Prova"), piccolo ma con
 * tutti i minimi della §8.1. Non è una delle 3 destinazioni precaricate (ST-CAT-002) e non sta in `snapshots/`,
 * quindi la web app non la carica mai nel suo database.
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach } from "vitest";

export const FILE_ISTANTANEA_DI_PROVA = fileURLToPath(new URL("./dati/prova-dato-di-test.json", import.meta.url));
export const ID_ISTANTANEA_DI_PROVA = "prova-dato-di-test";

type Json = Record<string, unknown>;

/** Il JSON dell'istantanea di prova, appena letto dal file (una copia nuova a ogni chiamata). */
export function istantaneaDiProva(): Json & { luoghi: Json[]; attivita: Json[]; tempiPercorrenza: Json[]; fonti: Json[] } {
  return JSON.parse(readFileSync(FILE_ISTANTANEA_DI_PROVA, "utf8")) as never;
}

/** L'istantanea di prova modificata da `modifica`. */
export function conModifica(modifica: (json: ReturnType<typeof istantaneaDiProva>) => void): ReturnType<typeof istantaneaDiProva> {
  const json = istantaneaDiProva();
  modifica(json);
  return json;
}

export function trova(elenco: Json[], id: string): Json {
  const voce = elenco.find((v) => v["id"] === id);
  if (voce === undefined) throw new Error(`nessuna voce ${id}`);
  return voce;
}

const create: string[] = [];

afterEach(() => {
  for (const cartella of create.splice(0)) rmSync(cartella, { recursive: true, force: true });
});

/** Una cartella temporanea vuota, cancellata alla fine del test. */
export function nuovaCartella(): string {
  const cartella = mkdtempSync(join(tmpdir(), "travelops-sources-"));
  create.push(cartella);
  return cartella;
}
