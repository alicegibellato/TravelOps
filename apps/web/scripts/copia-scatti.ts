/**
 * Copia, su richiesta esplicita, gli screenshot delle prove end-to-end da `test-results/e2e/screenshots/<story>`
 * a `evidence/<story>/screenshots`. Le prove non scrivono mai in `evidence/`: questa copia è l'unico passaggio.
 * Uso: `npm run e2e:copia-scatti -- <ST-ID>`.
 */
import { cpSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const storia = process.argv[2];
if (storia === undefined || !/^ST-[A-Z0-9-]+$/.test(storia)) {
  console.error("Uso: npm run e2e:copia-scatti -- <ST-ID>   (per esempio ST-UX-003B)");
  process.exit(1);
}
const app = join(dirname(fileURLToPath(import.meta.url)), "..");
const origine = join(app, "test-results", "e2e", "screenshots", storia);
const destinazione = join(app, "..", "..", "evidence", storia, "screenshots");
if (!existsSync(origine)) {
  console.error(`Nessuno screenshot in ${origine}: lancia prima \`npm run e2e\`.`);
  process.exit(1);
}
cpSync(origine, destinazione, { recursive: true });
console.log(`Copiati gli screenshot di ${storia} in ${destinazione}`);
