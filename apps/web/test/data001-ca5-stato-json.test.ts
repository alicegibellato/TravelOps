import { VIAGGI_DEMO_PRODOTTO } from "../src/stato/viaggi-demo";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { esportaStorico } from "@travelops/engine";
import { describe, expect, it, vi } from "vitest";
import { elencaViaggi, leggiImpostazione, testoStoricoDelViaggio } from "../src/basedati";
import { CHIAVE_IMPORTAZIONE, fileStatoJson, NOME_FILE_STATO_JSON } from "../src/stato/importazione";
import { accettaProposta, avviaScenario, impostaOrologio, ripristina } from "../src/stato/operazioni";
import { serializzaStato, type StatoDemo } from "../src/stato/stato";
import { nuovaCartella, statoSalvato, sullaBaseDati } from "./supporto-stato";

const CARTELLA_APP = fileURLToPath(new URL("..", import.meta.url));

/** Uno stato di REQ-WEB-002 con qualcosa dentro: S8 su V-VOLO, orologio cambiato, proposta accettata (versione 2). */
function statoDiWeb002(): StatoDemo {
  const appoggio = nuovaCartella();
  avviaScenario(appoggio, "S8");
  impostaOrologio(appoggio, "2026-06-14", "09:15");
  accettaProposta(appoggio, 1, "Alice");
  return statoSalvato(appoggio);
}

/** Una cartella dei dati come la lasciava REQ-WEB-002: solo `stato.json`, nessuna base dati. */
function cartellaConStatoJson(testo: string): string {
  const cartella = nuovaCartella();
  mkdirSync(cartella, { recursive: true });
  writeFileSync(fileStatoJson(cartella), testo, "utf8");
  return cartella;
}

function confrontabile(stato: StatoDemo): unknown {
  return { ...stato, storico: esportaStorico(stato.storico) };
}

describe("CA-5 il file JSON locale di REQ-WEB-002, se presente, viene importato una volta e poi non è più usato", () => {
  it("CA-5 il file è apps/web/.data/stato.json, quello di REQ-WEB-002", () => {
    expect(NOME_FILE_STATO_JSON).toBe("stato.json");
    expect(fileStatoJson(join(CARTELLA_APP, ".data"))).toBe(join(CARTELLA_APP, ".data", "stato.json"));
  });

  it("CA-5 al primo avvio lo stato del file passa nella base dati, identico, insieme ai viaggi demo", () => {
    const vecchio = statoDiWeb002();
    const cartella = cartellaConStatoJson(serializzaStato(vecchio));
    const stato = statoSalvato(cartella);
    expect(confrontabile(stato)).toEqual(confrontabile(vecchio));
    expect([stato.partenza, stato.scenario, stato.orologio, stato.prossimaProposta]).toEqual([
      "v-volo",
      "S8",
      { data: "2026-06-14", ora: "09:15" },
      2,
    ]);
    sullaBaseDati(cartella, (db) => {
      expect(leggiImpostazione(db, CHIAVE_IMPORTAZIONE)).toEqual({ esito: "importato" });
      expect(testoStoricoDelViaggio(db, "v-volo")).toBe(esportaStorico(vecchio.storico));
      expect(elencaViaggi(db).map((v) => v.id)).toEqual(["versione-1", "v-irr", "v-fisso", "v-volo", ...VIAGGI_DEMO_PRODOTTO]);
    });
  });

  it("CA-5 dopo l'importazione il file non è più letto né scritto: lo stato vive solo nella base dati", async () => {
    const vecchio = statoDiWeb002();
    const testoOriginale = serializzaStato(vecchio);
    const cartella = cartellaConStatoJson(testoOriginale);
    statoSalvato(cartella); // primo avvio: importazione

    // Le operazioni lavorano sulla base dati e non toccano il file.
    ripristina(cartella);
    avviaScenario(cartella, "S1");
    expect(readFileSync(fileStatoJson(cartella), "utf8")).toBe(testoOriginale);
    const dopoLeOperazioni = statoSalvato(cartella);
    expect([dopoLeOperazioni.partenza, dopoLeOperazioni.scenario]).toEqual(["versione-1", "S1"]);

    // Il file cambia (o si rovina): la web app, anche riavviata, non lo guarda più.
    writeFileSync(fileStatoJson(cartella), serializzaStato({ ...vecchio, orologio: { data: "2026-06-15", ora: "10:00" } }), "utf8");
    expect(confrontabile(statoSalvato(cartella))).toEqual(confrontabile(dopoLeOperazioni));
    writeFileSync(fileStatoJson(cartella), "{ rovinato", "utf8");
    vi.resetModules();
    const archivio = await import("../src/stato/archivio");
    const riletto = archivio.leggiStato(cartella);
    if (!riletto.ok) throw new Error(riletto.motivo);
    expect(confrontabile(riletto.stato)).toEqual(confrontabile(dopoLeOperazioni));
    expect(sullaBaseDati(cartella, (db) => leggiImpostazione(db, CHIAVE_IMPORTAZIONE))).toEqual({ esito: "importato" });
  });

  it("CA-5 senza file al primo avvio non si importa nulla, e un file comparso dopo è ignorato", () => {
    const cartella = nuovaCartella();
    const iniziale = statoSalvato(cartella);
    writeFileSync(fileStatoJson(cartella), serializzaStato(statoDiWeb002()), "utf8");
    expect(confrontabile(statoSalvato(cartella))).toEqual(confrontabile(iniziale));
    expect(sullaBaseDati(cartella, (db) => leggiImpostazione(db, CHIAVE_IMPORTAZIONE))).toEqual({ esito: "nessun file" });
  });

  it("CA-5 un file non valido non si importa: si parte dai viaggi demo, il motivo resta registrato e il file non si usa più", () => {
    const cartella = cartellaConStatoJson("{ non è json");
    const stato = statoSalvato(cartella);
    expect([stato.partenza, stato.scenario, stato.storico.versioni.length]).toEqual(["versione-1", null, 1]);
    sullaBaseDati(cartella, (db) => {
      expect(leggiImpostazione(db, CHIAVE_IMPORTAZIONE)).toEqual({ esito: "non valido", motivo: "il file non contiene JSON valido" });
    });
    // Corretto dopo, il file non si importa più.
    writeFileSync(fileStatoJson(cartella), serializzaStato(statoDiWeb002()), "utf8");
    expect(statoSalvato(cartella).partenza).toBe("versione-1");
  });

  it("CA-5 un file con uno storico manomesso è rifiutato dal motore (importaStorico) e non si importa", () => {
    const documento = JSON.parse(serializzaStato(statoDiWeb002())) as { storico: { versioni: { causa: string }[] } };
    documento.storico.versioni[0]!.causa = "Altro";
    const cartella = cartellaConStatoJson(JSON.stringify(documento));
    expect(statoSalvato(cartella).storico.versioni).toHaveLength(1);
    const esito = sullaBaseDati(cartella, (db) => leggiImpostazione(db, CHIAVE_IMPORTAZIONE)) as { esito: string; motivo: string };
    expect(esito.esito).toBe("non valido");
    expect(esito.motivo).toMatch(/^\[STORICO_NON_VALIDO\]/);
  });

  it("CA-5 nel codice della web app solo l'importazione conosce il file JSON", () => {
    const trovati: string[] = [];
    const visita = (cartella: string): void => {
      for (const nome of readdirSync(cartella)) {
        const percorso = join(cartella, nome);
        if (statSync(percorso).isDirectory()) visita(percorso);
        else if (/\.(ts|tsx|mjs)$/.test(nome)) {
          const testo = readFileSync(percorso, "utf8");
          if (/stato\.json|NOME_FILE_STATO_JSON|fileStatoJson|deserializzaStato\(/.test(testo.replace(/\/\*[\s\S]*?\*\//g, ""))) {
            trovati.push(relative(CARTELLA_APP, percorso).replaceAll("\\", "/"));
          }
        }
      }
    };
    for (const cartella of ["app", "src"]) visita(join(CARTELLA_APP, cartella));
    expect(trovati.sort()).toEqual(["src/stato/importazione.ts", "src/stato/stato.ts"]);
  });
});
