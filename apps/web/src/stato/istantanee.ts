/**
 * Le istantanee delle destinazioni salvate nel repository (`packages/sources/snapshots/`, REQ-CAT-002 §7.8): al primo
 * avvio la web app le carica nel suo database con lo strato di REQ-DATA-001 (`salvaIstantanea`). La lettura e la
 * validazione, minimi della §8.1 compresi, sono di `@travelops/sources`: la web app non controlla nulla da sé.
 *
 * Nota: `@travelops/sources` è un pacchetto dello stesso monorepo (npm workspaces), risolto dal collegamento nella
 * radice. Non è ancora tra le dipendenze di `apps/web/package.json` perché il test CA-9 di REQ-WEB-002
 * (`test/web002-ca9-motore.test.ts`) elenca le dipendenze ammesse e non appartiene a questa storia: va dichiarata
 * quando quel test viene aggiornato (vedi `evidence/ST-CAT-002A.md`).
 */
import { join } from "node:path";
import { leggiCartellaIstantanee, NOME_CARTELLA_ISTANTANEE } from "@travelops/sources";
import { salvaIstantanea, type BaseDati } from "../basedati";

/**
 * La cartella delle istantanee del repository vista dalla web app: `packages/sources/snapshots`, a partire dalla
 * cartella della web app, che è la cartella di lavoro di Next.js (come `cartellaDati`).
 */
export function cartellaIstantaneeRepository(): string {
  return join(process.cwd(), "..", "..", "packages", "sources", NOME_CARTELLA_ISTANTANEE);
}

/**
 * Carica nel database tutte le istantanee della cartella e ne restituisce gli identificativi, in ordine di file.
 * Se la cartella non ha istantanee non succede niente. Un'istantanea già presente e identica non cambia nulla.
 * @throws se un'istantanea della cartella non è valida (con tutti i problemi), o se nel database ce n'è già una con
 * lo stesso identificativo e un contenuto diverso (un'istantanea non cambia mai).
 */
export function caricaIstantaneeDelRepository(db: BaseDati, cartella: string = cartellaIstantaneeRepository()): string[] {
  const lette = leggiCartellaIstantanee(cartella);
  for (const { istantanea } of lette) {
    salvaIstantanea(db, { id: istantanea.id, destinazione: istantanea.destinazione, contenuto: istantanea });
  }
  return lette.map(({ istantanea }) => istantanea.id);
}
