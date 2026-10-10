/** Genera `docs/demo/copione-demo.md` da `src/demo/copione.json` (l'unica fonte del copione). */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { copioneInMarkdown } from "../src/demo/copione";

const file = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "docs", "demo", "copione-demo.md");
mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, copioneInMarkdown());
console.log(`Scritto ${file}`);
