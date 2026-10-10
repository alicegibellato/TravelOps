/**
 * Preparazione delle prove end-to-end (REQ-E2E-001), una volta sola prima dei flussi: compila la web app se manca la
 * build o se i sorgenti sono più recenti (`TRAVELOPS_E2E_SENZA_BUILD=1` salta il controllo).
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { CARTELLA_APP } from "./supporto";

const RADICE = join(CARTELLA_APP, "..", "..");

function ultimaModifica(cartella: string): number {
  let ultima = 0;
  if (!existsSync(cartella)) return ultima;
  for (const nome of readdirSync(cartella)) {
    if (nome === "node_modules" || nome === ".next" || nome === ".data" || nome === "test-results" || nome === "dist") continue;
    const percorso = join(cartella, nome);
    const stato = statSync(percorso);
    ultima = Math.max(ultima, stato.isDirectory() ? ultimaModifica(percorso) : stato.mtimeMs);
  }
  return ultima;
}

function buildAggiornata(): boolean {
  const marcatore = join(CARTELLA_APP, ".next", "BUILD_ID");
  if (!existsSync(marcatore)) return false;
  const sorgenti = [join(CARTELLA_APP, "app"), join(CARTELLA_APP, "src"), join(RADICE, "packages")];
  return Math.max(...sorgenti.map(ultimaModifica)) <= statSync(marcatore).mtimeMs;
}

export default function prepara(): void {
  if (process.env.TRAVELOPS_E2E_SENZA_BUILD !== "1" && !buildAggiornata()) {
    console.log("[e2e] build mancante o non aggiornata: compilo la web app (npm run build)...");
    const esito = spawnSync("npm", ["run", "build"], { cwd: RADICE, stdio: "inherit", shell: process.platform === "win32" });
    if (esito.status !== 0) throw new Error("la build è fallita: le prove end-to-end non partono");
  }
}
