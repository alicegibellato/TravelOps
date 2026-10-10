/**
 * Modalità mirata delle prove end-to-end: esegue solo gli e2e legati ai file cambiati rispetto alla base
 * (`origin/main`, o `TRAVELOPS_E2E_BASE`), secondo la tabella cartella/glob -> e2e di `e2e/e2e.config.json`.
 * Un file cambiato che non è nella tabella fa girare la suite completa; un e2e cambiato gira sempre.
 * La suite completa (`npm run e2e`) resta il default e il gate di rilascio.
 * Uso: `npm run e2e:mirati` (`-- --elenco` stampa la scelta senza eseguire; `-- --file <percorso>`, ripetibile,
 * usa i file indicati, con percorso dalla radice del repository, invece di quelli cambiati).
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { basename, dirname, join, matchesGlob } from "node:path";
import { fileURLToPath } from "node:url";
import configurazione from "../e2e/e2e.config.json";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..");
const CARTELLA_E2E = join(APP, "e2e");
const PREFISSO_E2E = "apps/web/e2e/";
const SUFFISSO_E2E = ".e2e.ts";
const { base: BASE_PREDEFINITA, senzaE2e, mappa } = configurazione.mirati;

/** Glob come `path.matchesGlob`, ma `cartella/**` copre anche file e cartelle che iniziano con il punto. */
function corrisponde(file: string, glob: string): boolean {
  const prefisso = glob.endsWith("/**") ? glob.slice(0, -2) : null;
  if (prefisso !== null && !/[*?[{]/.test(prefisso)) return file.startsWith(prefisso);
  return matchesGlob(file, glob);
}

function git(...argomenti: string[]): string[] {
  const esito = spawnSync("git", argomenti, { cwd: APP, encoding: "utf8" });
  if (esito.status !== 0) throw new Error(`git ${argomenti.join(" ")} non riuscito: ${esito.stderr.trim()}`);
  return esito.stdout.split("\n").map((r) => r.trim()).filter(Boolean);
}

/** I file cambiati rispetto alla base: commit del ramo, modifiche non salvate e file nuovi (percorsi dalla radice). */
function fileCambiati(base: string): string[] {
  const [puntoComune] = git("merge-base", base, "HEAD");
  if (puntoComune === undefined) throw new Error(`nessun punto comune con ${base}`);
  const radice = git("rev-parse", "--show-toplevel")[0] as string;
  const nuovi = git("ls-files", "--others", "--exclude-standard", "--full-name", radice);
  return [...new Set([...git("diff", "--name-only", puntoComune), ...nuovi])].sort();
}

/** Gli e2e da eseguire: `null` vuol dire la suite completa. */
function scegli(cambiati: readonly string[], tutti: readonly string[]): { e2e: string[] | null; nonMappati: string[] } {
  const scelti = new Set<string>();
  const nonMappati: string[] = [];
  for (const file of cambiati) {
    if (senzaE2e.some((g) => corrisponde(file, g))) continue;
    if (file.startsWith(PREFISSO_E2E) && file.endsWith(SUFFISSO_E2E) && !file.slice(PREFISSO_E2E.length).includes("/")) {
      scelti.add(basename(file, SUFFISSO_E2E));
      continue;
    }
    const regole = mappa.filter((r) => corrisponde(file, r.glob));
    if (regole.length === 0) {
      nonMappati.push(file);
      continue;
    }
    for (const modello of regole.flatMap((r) => r.e2e)) {
      for (const nome of tutti) if (matchesGlob(nome, modello)) scelti.add(nome);
    }
  }
  if (nonMappati.length > 0) return { e2e: null, nonMappati };
  return { e2e: [...scelti].filter((n) => tutti.includes(n)).sort(), nonMappati };
}

function principale(): number {
  const base = process.env.TRAVELOPS_E2E_BASE ?? BASE_PREDEFINITA;
  const soloElenco = process.argv.includes("--elenco");
  const tutti = readdirSync(CARTELLA_E2E)
    .filter((n) => n.endsWith(SUFFISSO_E2E))
    .map((n) => basename(n, SUFFISSO_E2E));
  const indicati = process.argv.flatMap((a, i) => (process.argv[i - 1] === "--file" ? [a] : []));
  const cambiati = indicati.length > 0 ? indicati : fileCambiati(base);
  const { e2e, nonMappati } = scegli(cambiati, tutti);
  if (e2e === null) {
    console.log(`[e2e:mirati] file non nella tabella (${nonMappati.slice(0, 5).join(", ")}${nonMappati.length > 5 ? ", ..." : ""}): suite completa.`);
  } else if (e2e.length === 0) {
    console.log(`[e2e:mirati] nessun e2e legato ai ${cambiati.length} file cambiati rispetto a ${base}.`);
    return 0;
  } else {
    console.log(`[e2e:mirati] ${e2e.length} e2e su ${tutti.length} (base ${base}): ${e2e.join(", ")}`);
  }
  if (soloElenco) return 0;
  const filtri = e2e === null ? [] : e2e.map((n) => `e2e/${n}${SUFFISSO_E2E}`);
  const esito = spawnSync("npx", ["vitest", "run", "-c", "vitest.e2e.config.ts", ...filtri], {
    cwd: APP,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  return esito.status ?? 1;
}

process.exit(principale());
