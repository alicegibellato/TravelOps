/**
 * Avvia la CLI di Next.js (`dev`, `build`, `start`) con la telemetria disattivata:
 * né la build né la dev server inviano dati di utilizzo in rete (REQ-WEB-001, CA-6).
 * Una variabile d'ambiente impostata qui funziona allo stesso modo su Windows, macOS e Linux.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const cliNext = require.resolve("next/dist/bin/next");
const cartellaApp = dirname(dirname(fileURLToPath(import.meta.url)));

const figlio = spawn(process.execPath, [cliNext, ...process.argv.slice(2)], {
  cwd: cartellaApp,
  stdio: "inherit",
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
});

for (const segnale of ["SIGINT", "SIGTERM"]) {
  process.on(segnale, () => figlio.kill(segnale));
}

figlio.on("exit", (codice, segnale) => {
  process.exitCode = codice ?? (segnale === null ? 0 : 1);
});
