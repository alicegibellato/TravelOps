import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { creaStorico, esportaStorico } from "@travelops/engine";
import { afterEach, describe, expect, it, vi } from "vitest";
import { register } from "../instrumentation";
import {
  CHIAVE_PRIMO_AVVIO,
  elencaProposteDelViaggio,
  elencaRevisioniBozza,
  elencaViaggi,
  leggiImpostazione,
  leggiProfilo,
  migrazioniApplicate,
  MIGRAZIONI,
  NOME_FILE_BASE_DATI,
  testoStoricoDelViaggio,
} from "../src/basedati";
import { cartellaDati, fileBaseDati, leggiStato } from "../src/stato/archivio";
import { CHIAVE_IMPORTAZIONE } from "../src/stato/importazione";
import { CHIAVE_PRESENTAZIONE } from "../src/stato/presentazione";
import { VIAGGI_DEMO, VIAGGI_DEMO_PRODOTTO } from "../src/stato/viaggi-demo";
import { datiValidi } from "./supporto";
import { nuovaCartella, statoSalvato, sullaBaseDati } from "./supporto-stato";

const CARTELLA_APP = fileURLToPath(new URL("..", import.meta.url));
const RADICE = join(CARTELLA_APP, "../..");

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

/** Lo storico con la sola versione 1 del viaggio di riferimento con quella chiave, come lo crea il motore. */
function storicoDiPartenza(chiave: string): string {
  const creato = creaStorico(datiValidi(chiave).viaggio);
  if (!creato.ok) throw new Error(creato.errore.messaggio);
  return esportaStorico(creato.storico);
}

describe("CA-1 il primo avvio su un clone pulito crea il database con i viaggi demo", () => {
  it("CA-1 il database è apps/web/.data/travelops.db, escluso da Git e assente dal repository", () => {
    expect(NOME_FILE_BASE_DATI).toBe("travelops.db");
    expect(fileBaseDati(cartellaDati())).toBe(join(process.cwd(), ".data", "travelops.db"));
    const file = ["apps/web/.data/travelops.db", "apps/web/.data/travelops.db-journal", "apps/web/.data/travelops.db-wal"];
    expect(execFileSync("git", ["check-ignore", ...file], { cwd: RADICE, encoding: "utf8" }).trim().split(/\r?\n/)).toEqual(file);
    // Su un clone pulito non c'è nessun file di dati: il database nasce al primo avvio.
    expect(execFileSync("git", ["ls-files", "apps/web/.data"], { cwd: RADICE, encoding: "utf8" }).trim()).toBe("");
  }, 30_000);

  it("CA-1 all'avvio della web app (instrumentation) il database viene creato con i viaggi demo", async () => {
    const cartella = nuovaCartella();
    vi.spyOn(process, "cwd").mockReturnValue(cartella);
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    const dati = join(cartella, ".data");
    expect(existsSync(dati)).toBe(false);
    await register();
    expect(existsSync(join(dati, "travelops.db"))).toBe(true);
    expect(sullaBaseDati(dati, elencaViaggi).map((v) => v.id)).toEqual(["versione-1", "v-irr", "v-fisso", "v-volo"]); // la cartella è finta: senza le istantanee precaricate i viaggi della §8.3 non si costruiscono
  });

  it("CA-1 durante la build (next build) l'avvio non crea nessun database", async () => {
    const cartella = nuovaCartella();
    vi.spyOn(process, "cwd").mockReturnValue(cartella);
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    await register();
    expect(existsSync(join(cartella, ".data"))).toBe(false);
  });

  it("CA-1 anche la prima pagina letta crea il database: i viaggi demo, confermati, con la sola versione 1 del motore", () => {
    const cartella = nuovaCartella();
    expect(existsSync(fileBaseDati(cartella))).toBe(false);
    expect(leggiStato(cartella).ok).toBe(true);
    expect(existsSync(fileBaseDati(cartella))).toBe(true);

    const viaggi = sullaBaseDati(cartella, elencaViaggi);
    expect(viaggi.slice(0, VIAGGI_DEMO.length)).toEqual(
      VIAGGI_DEMO.map((demo, i) => ({
        id: demo.id,
        titolo: demo.titolo,
        stato: "confermato",
        demo: true,
        ordine: i + 1,
        destinazione: "Lago di Garda",
        istantanea: null,
      })),
    );
    expect(viaggi.slice(VIAGGI_DEMO.length).map((v) => [v.id, v.demo])).toEqual(VIAGGI_DEMO_PRODOTTO.map((id) => [id, true]));
    expect(viaggi.slice(0, VIAGGI_DEMO.length).map((v) => v.titolo)).toEqual([
      "Weekend sul Garda",
      "Weekend sul Garda, con il castello irrinunciabile",
      "Weekend sul Garda, con il pranzo sul lago a orario fisso",
      "Weekend sul Garda, con il volo di ritorno",
    ]);
    for (const { id } of viaggi.slice(0, VIAGGI_DEMO.length)) {
      sullaBaseDati(cartella, (db) => {
        expect(testoStoricoDelViaggio(db, id)).toBe(storicoDiPartenza(id));
        expect(elencaProposteDelViaggio(db, id)).toEqual([]);
        expect(elencaRevisioniBozza(db, id)).toEqual({ ok: true, revisioni: [] });
        expect(leggiProfilo(db, id)).toBeNull();
      });
    }
  });

  it("CA-1 il primo avvio applica le migrazioni, imposta la modalità presentazione e si registra come fatto", () => {
    const cartella = nuovaCartella();
    const stato = statoSalvato(cartella);
    expect([stato.partenza, stato.scenario, stato.orologio, stato.prossimaProposta]).toEqual([
      "versione-1",
      null,
      { data: "2026-06-12", ora: "08:00" },
      1,
    ]);
    expect(esportaStorico(stato.storico)).toBe(storicoDiPartenza("versione-1"));
    sullaBaseDati(cartella, (db) => {
      expect(migrazioniApplicate(db)).toEqual(MIGRAZIONI.map((m) => m.numero));
      expect(leggiImpostazione(db, CHIAVE_PRIMO_AVVIO)).toEqual({ fatto: true });
      expect(leggiImpostazione(db, CHIAVE_PRESENTAZIONE)).toEqual({
        partenza: "versione-1",
        scenario: null,
        orologio: { data: "2026-06-12", ora: "08:00" },
        prossimaProposta: 1,
      });
      // Su un clone pulito non c'è il vecchio file JSON di REQ-WEB-002.
      expect(leggiImpostazione(db, CHIAVE_IMPORTAZIONE)).toEqual({ esito: "nessun file" });
    });
  });

  it("CA-1 il database è SQLite, con better-sqlite3 come chiede il requisito", () => {
    const cartella = nuovaCartella();
    leggiStato(cartella);
    expect(readFileSync(fileBaseDati(cartella)).subarray(0, 16).toString("latin1")).toBe("SQLite format 3\u0000");
    const pacchetto = JSON.parse(readFileSync(join(CARTELLA_APP, "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
      engines: Record<string, string>;
    };
    expect(pacchetto.dependencies["better-sqlite3"]).toMatch(/^\^13\./);
    expect(pacchetto.devDependencies["@types/better-sqlite3"]).toBeDefined();
    // better-sqlite3 13 richiede Node.js 22, la versione della CI (.nvmrc).
    expect(pacchetto.engines.node).toBe(">=22.0.0");
    expect(readFileSync(join(RADICE, ".nvmrc"), "utf8").trim()).toBe("22");
  });
});
