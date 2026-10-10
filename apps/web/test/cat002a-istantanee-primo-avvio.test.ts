/**
 * ST-CAT-002A, criterio 4: il primo avvio della web app carica nel database le istantanee presenti nel repository
 * (`packages/sources/snapshots/`), con lo strato di REQ-DATA-001; se nel repository non ce n'è nessuna, non succede
 * niente.
 *
 * Per i test si usa l'istantanea di prova di `@travelops/sources` (`packages/sources/test/dati/prova-dato-di-test.json`):
 * un DATO DI TEST, un borgo inventato, copiato in una cartella temporanea che fa da cartella del repository. Non è
 * una delle 3 destinazioni precaricate.
 */
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { leggiCartellaIstantanee, leggiIstantanea } from "@travelops/sources";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CHIAVE_PRIMO_AVVIO,
  conBaseDati,
  elencaIstantanee,
  elencaViaggi,
  leggiImpostazione,
  leggiIstantanea as leggiIstantaneaSalvata,
} from "../src/basedati";
import { primoAvvio } from "../src/stato/avvio";
import { leggiStato } from "../src/stato/archivio";
import { caricaIstantaneeDelRepository, cartellaIstantaneeRepository } from "../src/stato/istantanee";
import { nuovaCartella, sullaBaseDati } from "./supporto-stato";

const CARTELLA_APP = fileURLToPath(new URL("..", import.meta.url));
const FILE_DI_PROVA = fileURLToPath(new URL("../../../packages/sources/test/dati/prova-dato-di-test.json", import.meta.url));
const ID_DI_PROVA = "prova-dato-di-test";
/** La cartella delle istantanee del repository. */
const SNAPSHOTS_DEL_REPOSITORY = resolve(CARTELLA_APP, "../../packages/sources/snapshots");

afterEach(() => {
  vi.restoreAllMocks();
});

/** Una cartella che fa da `packages/sources/snapshots`, con l'istantanea di prova. */
function cartellaConIstantaneaDiProva(): string {
  const cartella = join(nuovaCartella(), "snapshots");
  mkdirSync(cartella);
  copyFileSync(FILE_DI_PROVA, join(cartella, `${ID_DI_PROVA}.json`));
  return cartella;
}

/** Apre (e chiude) la base dati nella cartella con il primo avvio che legge le istantanee da `cartellaIstantanee`. */
function avvia(cartella: string, cartellaIstantanee: string): void {
  conBaseDati(cartella, () => undefined, primoAvvio(cartella, cartellaIstantanee));
}

describe("ST-CAT-002A criterio 4: istantanee del repository caricate al primo avvio", () => {
  it("la cartella del repository vista dalla web app è packages/sources/snapshots", () => {
    vi.spyOn(process, "cwd").mockReturnValue(CARTELLA_APP);
    expect(resolve(cartellaIstantaneeRepository())).toBe(SNAPSHOTS_DEL_REPOSITORY);
  });

  it("al primo avvio l'istantanea di prova finisce nel database, con lo strato di DATA-001, così com'è letta da @travelops/sources", () => {
    const dati = nuovaCartella();
    const snapshots = cartellaConIstantaneaDiProva();
    avvia(dati, snapshots);
    const attesa = leggiIstantanea(leggiCartellaIstantanee(snapshots)[0]?.istantanea);
    if (!attesa.ok) throw new Error("istantanea di prova non valida");
    sullaBaseDati(dati, (db) => {
      expect(elencaIstantanee(db)).toEqual([{ id: ID_DI_PROVA, destinazione: "Borgo di Prova (DATO DI TEST, non è una destinazione reale)" }]);
      const salvata = leggiIstantaneaSalvata(db, ID_DI_PROVA);
      expect(salvata?.contenuto).toEqual(attesa.istantanea);
      // Il contenuto salvato si rilegge ed è ancora un'istantanea valida, minimi compresi.
      expect(leggiIstantanea(salvata?.contenuto).ok).toBe(true);
      // Il resto del primo avvio non cambia: viaggi demo caricati e primo avvio registrato.
      expect(elencaViaggi(db).map((v) => v.id)).toEqual(["versione-1", "v-irr", "v-fisso", "v-volo"]);
      expect(leggiImpostazione(db, CHIAVE_PRIMO_AVVIO)).toEqual({ fatto: true });
    });
  });

  it("se nel repository non c'è nessuna istantanea non succede niente (cartella vuota, senza .json o assente)", () => {
    const vuota = join(nuovaCartella(), "snapshots");
    mkdirSync(vuota);
    writeFileSync(join(vuota, "README.md"), "# nessuna istantanea\n");
    for (const snapshots of [vuota, join(nuovaCartella(), "non-esiste")]) {
      const dati = nuovaCartella();
      avvia(dati, snapshots);
      sullaBaseDati(dati, (db) => {
        expect(elencaIstantanee(db)).toEqual([]);
        expect(elencaViaggi(db)).toHaveLength(4);
        expect(leggiImpostazione(db, CHIAVE_PRIMO_AVVIO)).toEqual({ fatto: true });
      });
    }
  });

  it("il primo avvio vero (leggiStato) carica le istantanee del repository, cioè quelle di packages/sources/snapshots", () => {
    vi.spyOn(process, "cwd").mockReturnValue(CARTELLA_APP);
    const dati = nuovaCartella();
    expect(leggiStato(dati).ok).toBe(true);
    const attese = leggiCartellaIstantanee(SNAPSHOTS_DEL_REPOSITORY).map((l) => l.istantanea.id);
    sullaBaseDati(dati, (db) => {
      // Oltre a quelle del repository ci sono le istantanee derivate dei viaggi demo (REQ-DEMO-001), che non sono destinazioni.
      expect(elencaIstantanee(db).map((i) => i.id).filter((id) => !id.endsWith("-demo"))).toEqual(attese);
      // L'istantanea di prova è un dato di test: non sta tra quelle del repository.
      expect(elencaIstantanee(db).map((i) => i.id)).not.toContain(ID_DI_PROVA);
    });
  });

  it("il caricamento avviene solo al primo avvio: le aperture successive non rileggono la cartella", () => {
    const dati = nuovaCartella();
    const vuota = join(nuovaCartella(), "snapshots");
    avvia(dati, vuota);
    avvia(dati, cartellaConIstantaneaDiProva());
    sullaBaseDati(dati, (db) => expect(elencaIstantanee(db)).toEqual([]));
  });

  it("caricare di nuovo la stessa istantanea non cambia nulla (un'istantanea non cambia mai)", () => {
    const dati = nuovaCartella();
    const snapshots = cartellaConIstantaneaDiProva();
    avvia(dati, snapshots);
    sullaBaseDati(dati, (db) => {
      expect(caricaIstantaneeDelRepository(db, snapshots)).toEqual([ID_DI_PROVA]);
      expect(elencaIstantanee(db)).toHaveLength(1);
    });
  });

  it("un'istantanea non valida nel repository blocca il primo avvio con un messaggio chiaro e il database resta com'era", () => {
    const dati = nuovaCartella();
    const snapshots = cartellaConIstantaneaDiProva();
    writeFileSync(join(snapshots, "rotta.json"), JSON.stringify({ formato: 1, id: "rotta" }));
    expect(() => avvia(dati, snapshots)).toThrow(/istantanee non valide in .*rotta\.json: destinazione: manca il campo obbligatorio "destinazione"/);
    // Il primo avvio è una transazione: non è stato registrato e non ha lasciato nulla a metà.
    sullaBaseDati(dati, (db) => {
      expect(leggiImpostazione(db, CHIAVE_PRIMO_AVVIO)).toBeUndefined();
      expect(elencaIstantanee(db)).toEqual([]);
      expect(elencaViaggi(db)).toEqual([]);
    });
  });
});
