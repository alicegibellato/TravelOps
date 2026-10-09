import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Catalogo, DatiContesto, Proposta, Viaggio } from "../src/index.js";

const leggi = <T>(file: string): T =>
  JSON.parse(readFileSync(new URL(`../data/reference/${file}`, import.meta.url), "utf8")) as T;

interface Scenario {
  id: string;
  itinerario: string;
}

describe("dati di riferimento", () => {
  const catalogo = leggi<Catalogo>("catalogo.json");
  const contesto = leggi<DatiContesto>("contesto.json");
  const versione1 = leggi<Viaggio>("versione-1.json");
  const imprevisti = leggi<Scenario[]>("scenari-imprevisti.json");
  const modifiche = leggi<Scenario[]>("scenari-modifiche.json");

  it("il catalogo ha 4 zone, 11 luoghi e 8 attività", () => {
    expect(catalogo.zone).toHaveLength(4);
    expect(catalogo.luoghi).toHaveLength(11);
    expect(catalogo.attivita).toHaveLength(8);
  });

  it("i dati di contesto hanno 15 tempi di percorrenza, nessuna previsione e nessuna chiusura", () => {
    expect(contesto.tempiPercorrenza).toHaveLength(15);
    expect(contesto.previsioni).toHaveLength(0);
    expect(contesto.chiusure).toHaveLength(0);
  });

  it("la versione 1 ha 3 giorni e 15 elementi", () => {
    expect(versione1.giorni).toHaveLength(3);
    expect(versione1.giorni.flatMap((g) => g.elementi)).toHaveLength(15);
  });

  it("ci sono 8 scenari di imprevisto e 6 scenari di modifica", () => {
    expect(imprevisti.map((s) => s.id)).toEqual(["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"]);
    expect(modifiche.map((s) => s.id)).toEqual(["M1", "M2", "M3", "M4", "M5", "M6"]);
  });

  it("ogni variante e la proposta P-S1 sono presenti", () => {
    expect(leggi<Viaggio>("variante-v-irr.json").id).toBe("TRIP-GARDA");
    expect(leggi<Viaggio>("variante-v-fisso.json").id).toBe("TRIP-GARDA");
    expect(leggi<Viaggio>("variante-v-volo.json").giorni[2]?.elementi).toHaveLength(9);
    expect(leggi<Proposta>("proposta-p-s1.json").versioneBase).toBe(1);
  });
});
