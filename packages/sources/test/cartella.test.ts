/**
 * Criteri 2 e 4: le istantanee salvate come file (`packages/sources/snapshots/`), lette e validate tutte insieme.
 * La web app usa questa lettura al primo avvio.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ErroreCartellaIstantanee, leggiCartellaIstantanee, leggiIstantanea } from "../src/index.js";
import { cartellaIstantaneeDelPacchetto } from "../src/pacchetto.js";
import { conModifica, FILE_ISTANTANEA_DI_PROVA, ID_ISTANTANEA_DI_PROVA, nuovaCartella, trova } from "./supporto.js";

const PACCHETTO = fileURLToPath(new URL("..", import.meta.url));

describe("cartella delle istantanee del repository", () => {
  it("è packages/sources/snapshots, esiste ed è inclusa nel pacchetto", () => {
    expect(resolve(cartellaIstantaneeDelPacchetto())).toBe(resolve(PACCHETTO, "snapshots"));
    expect(existsSync(cartellaIstantaneeDelPacchetto())).toBe(true);
    const pacchetto = JSON.parse(readFileSync(join(PACCHETTO, "package.json"), "utf8")) as { files: string[] };
    expect(pacchetto.files).toContain("snapshots");
  });

  it("CA-2 ogni istantanea nel repository è valida e rispetta i minimi della §8.1 (oggi la cartella non ne ha: arrivano con ST-CAT-002)", () => {
    const lette = leggiCartellaIstantanee(cartellaIstantaneeDelPacchetto());
    for (const { file, istantanea } of lette) {
      expect(file).toBe(`${istantanea.id}.json`);
      expect(leggiIstantanea(istantanea).ok).toBe(true);
    }
    // L'istantanea di prova è un dato di test: non sta mai tra quelle del repository.
    expect(lette.map((l) => l.istantanea.id)).not.toContain(ID_ISTANTANEA_DI_PROVA);
  });

  it("una cartella che non esiste, o senza file .json, dà un elenco vuoto", () => {
    const cartella = nuovaCartella();
    expect(leggiCartellaIstantanee(join(cartella, "non-esiste"))).toEqual([]);
    writeFileSync(join(cartella, "README.md"), "# niente\n");
    expect(leggiCartellaIstantanee(cartella)).toEqual([]);
  });

  it("legge i file .json in ordine di nome, ignorando gli altri", () => {
    const cartella = nuovaCartella();
    copyFileSync(FILE_ISTANTANEA_DI_PROVA, join(cartella, `${ID_ISTANTANEA_DI_PROVA}.json`));
    const seconda = conModifica((j) => {
      j["id"] = "a-prima-in-ordine";
    });
    writeFileSync(join(cartella, "a-prima-in-ordine.json"), JSON.stringify(seconda));
    writeFileSync(join(cartella, "note.txt"), "non è un'istantanea");
    mkdirSync(join(cartella, "sottocartella"));
    const lette = leggiCartellaIstantanee(cartella);
    expect(lette.map((l) => l.file)).toEqual(["a-prima-in-ordine.json", `${ID_ISTANTANEA_DI_PROVA}.json`]);
    expect(lette.map((l) => l.avvisi)).toEqual([[], []]);
  });

  it("un file che non si chiama come l'istantanea, o non valido, blocca la lettura con tutti i problemi file per file", () => {
    const cartella = nuovaCartella();
    copyFileSync(FILE_ISTANTANEA_DI_PROVA, join(cartella, "nome-sbagliato.json"));
    writeFileSync(join(cartella, "rotta.json"), "{ rotta");
    const senzaOspedale = conModifica((j) => {
      j["id"] = "senza-ospedale";
      j.luoghi = j.luoghi.filter((l) => l["id"] !== "PROVA-OSPEDALE");
      trova(j.luoghi, "PROVA-MUSEO")["origine"] = "riferimento";
      delete trova(j.luoghi, "PROVA-MUSEO")["osmId"];
    });
    writeFileSync(join(cartella, "senza-ospedale.json"), JSON.stringify(senzaOspedale));
    let errore: unknown;
    try {
      leggiCartellaIstantanee(cartella);
    } catch (e) {
      errore = e;
    }
    expect(errore).toBeInstanceOf(ErroreCartellaIstantanee);
    const problemi = (errore as ErroreCartellaIstantanee).problemi.map((p) => [p.file, p.problema?.codice ?? null]);
    expect(problemi).toEqual([
      ["nome-sbagliato.json", null],
      ["rotta.json", "JSON_NON_VALIDO"],
      ["senza-ospedale.json", "ORIGINE_NON_OSM"],
    ]);
    expect((errore as Error).message).toContain(`nome-sbagliato.json: il file dell'istantanea "${ID_ISTANTANEA_DI_PROVA}" deve chiamarsi ${ID_ISTANTANEA_DI_PROVA}.json`);
  });
});
