/**
 * L'istantanea di prova del generatore è un dato di test valido: la legge il lettore di `@travelops/sources`
 * con i minimi della §8.1 (REQ-CAT-002). Il motore non dipende da `@travelops/sources`: lo usa solo questo test.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { leggiIstantanea } from "../../../sources/src/index.js";
import { FILE_ISTANTANEA_DI_PROVA } from "./supporto.js";

describe("istantanea di prova del generatore (dato di test)", () => {
  it("rispetta formato e minimi della §8.1", () => {
    const esito = leggiIstantanea(readFileSync(FILE_ISTANTANEA_DI_PROVA, "utf8"));
    expect(esito.ok ? [] : esito.errori).toEqual([]);
  });

  it("è dichiarata come dato di test", () => {
    const json = JSON.parse(readFileSync(FILE_ISTANTANEA_DI_PROVA, "utf8")) as { id: string; destinazione: string };
    expect(json.id).toContain("dato-di-test");
    expect(json.destinazione).toContain("DATO DI TEST");
  });
});
