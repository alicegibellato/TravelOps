/** Supporto ai test di ST-OBS-001A: report e suite di prova nel formato versione 1. */
import type { SuiteTest } from "../src/qualita/rapporto";

export function suiteDiProva(parti: Partial<SuiteTest> = {}): SuiteTest {
  return {
    id: "engine",
    nome: "Unit engine",
    tipo: "unit",
    esito: "superata",
    totali: 10,
    superati: 10,
    falliti: 0,
    saltati: 0,
    durataMs: 4_000,
    avviata: "2026-10-10T08:50:00.000Z",
    log: "logs/engine.log",
    errore: null,
    ...parti,
  };
}

/** Tre suite: una superata, una con due falli e un saltato, un'e2e non eseguita. Totali 15 / 12 / 2 / 1. */
export function rapportoDiProva(): { versione: 1; generato: string; durataMs: number; totali: object; suite: SuiteTest[] } {
  const suite = [
    suiteDiProva({ totali: 10, superati: 10, falliti: 0, saltati: 0, durataMs: 4_000 }),
    suiteDiProva({ id: "web", nome: "Unit web", esito: "fallita", totali: 5, superati: 2, falliti: 2, saltati: 1, durataMs: 21_000, log: "logs/web.log", avviata: "2026-10-10T08:51:00.000Z" }),
    suiteDiProva({ id: "e2e", nome: "E2E web (1280 px)", tipo: "e2e", esito: "errore", totali: 0, superati: 0, falliti: 0, saltati: 0, durataMs: 0, log: null, errore: "La suite si è fermata senza un esito (uscita 1): vedi il log.", avviata: "2026-10-10T08:52:00.000Z" }),
  ];
  return { versione: 1, generato: "2026-10-10T08:58:00.000Z", durataMs: 25_000, totali: { totali: 15, superati: 12, falliti: 2, saltati: 1 }, suite };
}
