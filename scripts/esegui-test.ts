/**
 * Esegue le suite di test elencate in `scripts/suite-test.json` e ne aggiorna il report (ST-OBS-001A).
 *
 *   tsx scripts/esegui-test.ts --tipo unit      # unit
 *   tsx scripts/esegui-test.ts --tipo e2e       # e2e
 *   tsx scripts/esegui-test.ts engine web       # suite scelte per id
 *
 * Per ogni suite: lancia lo script del workspace con il reporter del report accanto a quello predefinito, salva l'output
 * completo in `<cartella del report>/logs/<id>.log` (il link dei log nella pagina Qualità) e, se la suite si ferma
 * prima di produrre un esito (build rotta, comando mancante), registra un esito «errore». Esce con 1 se una suite non passa.
 */
import { spawn } from "node:child_process";
import { createWriteStream, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  VARIABILE_PERCORSO,
  VARIABILE_SUITE,
  leggiRapportoScritto,
  percorsoRapporto,
  registraSuite,
  type DescrizioneSuite,
  type TipoSuite,
} from "./rapporto-test";

interface SuiteConfigurata {
  id: string;
  nome: string;
  tipo: TipoSuite;
  workspace: string;
  script: string;
}

interface Configurazione {
  suite: SuiteConfigurata[];
}

const RADICE = fileURLToPath(new URL("..", import.meta.url));
const REPORTER = join(RADICE, "scripts", "reporter-test.ts");

export function leggiConfigurazione(file = join(RADICE, "scripts", "suite-test.json")): Configurazione {
  return JSON.parse(readFileSync(file, "utf8")) as Configurazione;
}

/** Le suite da eseguire: per tipo (`--tipo`) o per id; senza filtri, tutte. */
export function scegliSuite(config: Configurazione, argomenti: readonly string[]): SuiteConfigurata[] {
  const posizione = argomenti.indexOf("--tipo");
  const tipo = posizione >= 0 ? argomenti[posizione + 1] : undefined;
  const ids = argomenti.filter((a, i) => !a.startsWith("--") && argomenti[i - 1] !== "--tipo");
  const scelte = config.suite.filter((s) => (tipo === undefined || s.tipo === tipo) && (ids.length === 0 || ids.includes(s.id)));
  if (scelte.length === 0) throw new Error(`Nessuna suite corrisponde a: ${argomenti.join(" ") || "(tutte)"}`);
  return scelte;
}

function eseguiNpm(argomenti: string[], ambiente: NodeJS.ProcessEnv, log: NodeJS.WritableStream): Promise<number> {
  const percorsoNpm = process.env.npm_execpath;
  const [comando, args, shell] = percorsoNpm?.endsWith(".js")
    ? [process.execPath, [percorsoNpm, ...argomenti], false]
    : ["npm", argomenti, process.platform === "win32"];
  return new Promise((risolvi) => {
    const figlio = spawn(comando as string, args as string[], { cwd: RADICE, env: ambiente, shell: shell as boolean, stdio: ["ignore", "pipe", "pipe"] });
    const inoltra = (flusso: NodeJS.WriteStream) => (dati: Buffer) => {
      flusso.write(dati);
      log.write(dati);
    };
    figlio.stdout?.on("data", inoltra(process.stdout));
    figlio.stderr?.on("data", inoltra(process.stderr));
    figlio.once("error", (errore) => {
      log.write(`${errore.message}\n`);
      risolvi(1);
    });
    figlio.once("close", (codice) => risolvi(codice ?? 1));
  });
}

async function eseguiSuite(suite: SuiteConfigurata, percorso: string): Promise<boolean> {
  const cartella = dirname(percorso);
  const logRelativo = `logs/${suite.id}.log`;
  mkdirSync(join(cartella, "logs"), { recursive: true });
  const log = createWriteStream(join(cartella, logRelativo));
  const descrizione: DescrizioneSuite = { id: suite.id, nome: suite.nome, tipo: suite.tipo, log: logRelativo };
  const inizio = new Date();
  log.write(`# ${suite.nome}: npm run ${suite.script} --workspace ${suite.workspace}\n# Avviata ${inizio.toISOString()}\n\n`);
  const codice = await eseguiNpm(
    ["run", suite.script, "--workspace", suite.workspace, "--", "--reporter=default", `--reporter=${REPORTER}`],
    { ...process.env, [VARIABILE_PERCORSO]: percorso, [VARIABILE_SUITE]: JSON.stringify(descrizione), NO_COLOR: "1", FORCE_COLOR: "0" },
    log,
  );
  await new Promise((r) => log.end(r));
  // La suite si è fermata prima del reporter (build rotta, comando mancante): l'esito si registra qui.
  const scritto = leggiRapportoScritto(percorso)?.suite.find((s) => s.id === suite.id);
  if (scritto === undefined || Date.parse(scritto.avviata) < inizio.getTime()) {
    registraSuite(percorso, {
      ...descrizione,
      totali: 0,
      superati: 0,
      falliti: 0,
      saltati: 0,
      durataMs: Date.now() - inizio.getTime(),
      avviata: inizio.toISOString(),
      esito: "errore",
      errore: `La suite si è fermata senza un esito (uscita ${codice}): vedi il log.`,
    });
  }
  return codice === 0;
}

async function principale(): Promise<number> {
  const suite = scegliSuite(leggiConfigurazione(), process.argv.slice(2));
  const percorso = percorsoRapporto(RADICE);
  let tutteOk = true;
  for (const s of suite) {
    tutteOk = (await eseguiSuite(s, percorso)) && tutteOk;
  }
  console.log(`\nReport dei test: ${percorso}`);
  return tutteOk ? 0 : 1;
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  principale().then(
    (codice) => process.exit(codice),
    (errore: unknown) => {
      console.error(errore instanceof Error ? errore.message : errore);
      process.exit(1);
    },
  );
}
