/**
 * Reporter di Vitest che scrive l'esito della suite nel report dei test (ST-OBS-001A).
 *
 * Si affianca al reporter predefinito (`--reporter=default --reporter=<questo file>`) ed è attivo solo se
 * `TRAVELOPS_RAPPORTO_SUITE` descrive la suite in corso (lo imposta `scripts/esegui-test.ts`): in ogni altro caso non fa nulla.
 */
import { fileURLToPath } from "node:url";
import type { Reporter, TestModule } from "vitest/node";
import {
  VARIABILE_SUITE,
  percorsoRapporto,
  registraSuite,
  type Conteggi,
  type DescrizioneSuite,
  type EsitoSuite,
  type SuiteRapporto,
} from "./rapporto-test";

type Ambiente = Readonly<Record<string, string | undefined>>;

/** La descrizione della suite dall'ambiente, o `null` se manca o non è valida. */
export function suiteDaAmbiente(ambiente: Ambiente): DescrizioneSuite | null {
  const grezzo = ambiente[VARIABILE_SUITE];
  if (grezzo === undefined || grezzo.trim() === "") return null;
  try {
    const d = JSON.parse(grezzo) as Partial<DescrizioneSuite>;
    if (typeof d.id !== "string" || typeof d.nome !== "string" || (d.tipo !== "unit" && d.tipo !== "e2e")) return null;
    return { id: d.id, nome: d.nome, tipo: d.tipo, log: typeof d.log === "string" ? d.log : null };
  } catch {
    return null;
  }
}

/** Ciò che serve di un `TestModule` per contare: lo stato del file e lo stato di ogni test. */
export interface ModuloContabile {
  state(): string;
  children: { allTests(): Iterable<{ result(): { state: string } }> };
}

/** Conta i test dei moduli: un file che non si carica (errore di importazione) vale un test fallito. */
export function contaModuli(moduli: ReadonlyArray<ModuloContabile>): Conteggi {
  const c: Conteggi = { totali: 0, superati: 0, falliti: 0, saltati: 0 };
  for (const modulo of moduli) {
    let fallitiNelModulo = 0;
    for (const prova of modulo.children.allTests()) {
      const stato = prova.result().state;
      c.totali += 1;
      if (stato === "passed") c.superati += 1;
      else if (stato === "failed") {
        c.falliti += 1;
        fallitiNelModulo += 1;
      } else c.saltati += 1;
    }
    if (modulo.state() === "failed" && fallitiNelModulo === 0) {
      c.totali += 1;
      c.falliti += 1;
    }
  }
  return c;
}

/** La radice del repository (la cartella sopra `scripts/`): vi sta il report predefinito. */
const RADICE_REPOSITORY = fileURLToPath(new URL("..", import.meta.url));

export default class ReporterRapporto implements Reporter {
  private inizio = Date.now();
  private readonly ambiente: Ambiente;
  private readonly radice: string;

  /** Vitest lo crea senza argomenti; i test passano un ambiente e una radice propri. */
  constructor(opzioni: { ambiente?: Ambiente; radice?: string } = {}) {
    this.ambiente = opzioni.ambiente ?? process.env;
    this.radice = opzioni.radice ?? RADICE_REPOSITORY;
  }

  onTestRunStart(): void {
    this.inizio = Date.now();
  }

  onTestRunEnd(moduli: ReadonlyArray<TestModule>, errori: ReadonlyArray<unknown>): void {
    const suite = suiteDaAmbiente(this.ambiente);
    if (suite === null) return;
    const conteggi = contaModuli(moduli);
    const esito: EsitoSuite = conteggi.falliti > 0 || errori.length > 0 ? "fallita" : "superata";
    const voce: SuiteRapporto = {
      ...suite,
      ...conteggi,
      durataMs: Date.now() - this.inizio,
      avviata: new Date(this.inizio).toISOString(),
      esito,
      ...(errori.length > 0 ? { errore: `${errori.length} errori non gestiti durante l'esecuzione` } : {}),
    };
    registraSuite(percorsoRapporto(this.radice, this.ambiente), voce);
  }
}
