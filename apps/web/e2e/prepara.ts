/**
 * Preparazione delle prove end-to-end (REQ-E2E-001), una volta sola prima dei flussi: compila la web app solo se manca
 * la build o se è cambiato il contenuto dei sorgenti che finiscono nella build. L'impronta (SHA-256 di percorsi e
 * contenuti degli ingressi elencati in `e2e.config.json`) è salvata in `.next/.e2e-hash` dopo ogni build riuscita.
 * `TRAVELOPS_E2E_SENZA_BUILD=1` salta il controllo.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import configurazione from "./e2e.config.json";
import { CARTELLA_APP } from "./supporto";

const RADICE = join(CARTELLA_APP, "..", "..");
const { ingressi, esclusi, fileHash } = configurazione.build;
const FILE_HASH = join(RADICE, fileHash);
const ESCLUSI = new Set(esclusi);

function elencaFile(percorso: string, file: string[]): void {
  if (!existsSync(percorso)) return;
  if (!statSync(percorso).isDirectory()) {
    file.push(percorso);
    return;
  }
  for (const nome of readdirSync(percorso).sort()) {
    if (!ESCLUSI.has(nome)) elencaFile(join(percorso, nome), file);
  }
}

/** L'impronta del contenuto degli ingressi della build: cambia solo se cambia un file (o il suo percorso). */
export function impronta(): string {
  const file: string[] = [];
  for (const ingresso of ingressi) elencaFile(join(RADICE, ingresso), file);
  const hash = createHash("sha256");
  for (const percorso of file) {
    hash.update(relative(RADICE, percorso).split(sep).join("/"));
    hash.update("\0");
    hash.update(readFileSync(percorso));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function buildAggiornata(attuale: string): boolean {
  if (!existsSync(join(CARTELLA_APP, ".next", "BUILD_ID")) || !existsSync(FILE_HASH)) return false;
  return readFileSync(FILE_HASH, "utf8").trim() === attuale;
}

export default function prepara(): void {
  if (process.env.TRAVELOPS_E2E_SENZA_BUILD === "1") return;
  const attuale = impronta();
  if (buildAggiornata(attuale)) {
    console.log("[e2e] build già aggiornata (stessa impronta dei sorgenti): nessuna compilazione.");
    return;
  }
  console.log("[e2e] build mancante o sorgenti cambiati: compilo la web app (npm run build)...");
  const esito = spawnSync("npm", ["run", "build"], { cwd: RADICE, stdio: "inherit", shell: process.platform === "win32" });
  if (esito.status !== 0) throw new Error("la build è fallita: le prove end-to-end non partono");
  writeFileSync(FILE_HASH, `${attuale}\n`);
}
