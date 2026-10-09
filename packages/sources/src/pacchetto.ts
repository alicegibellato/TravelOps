/**
 * Punto d'ingresso `@travelops/sources/pacchetto`, solo per Node.js (test, script): la posizione della cartella
 * delle istantanee dentro il pacchetto. Sta fuori dal punto d'ingresso principale perché ricava la posizione dal
 * modulo (`import.meta.url`), che un bundler come Turbopack (Next.js) prova a risolvere come file: la web app
 * calcola la cartella da sé (`apps/web/src/stato/istantanee.ts`).
 */
import { fileURLToPath } from "node:url";
import { NOME_CARTELLA_ISTANTANEE } from "./cartella.js";

/** La cartella delle istantanee del repository, `packages/sources/snapshots` (vale da `src/` e da `dist/`). */
export function cartellaIstantaneeDelPacchetto(): string {
  return fileURLToPath(new URL(`../${NOME_CARTELLA_ISTANTANEE}`, import.meta.url));
}
