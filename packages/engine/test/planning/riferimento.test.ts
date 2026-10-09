/**
 * CA-1 (nessun problema bloccante per PR-1…PR-4) e CA-6 (bozza di PR-1 salvata come istantanea di riferimento).
 *
 * I casi sono in `CASI_ISTANTANEE` (`supporto.ts`). Oggi coprono solo l'istantanea di prova (DATO DI TEST): sulle
 * 3 istantanee precaricate si completano aggiungendo le loro righe a quell'elenco dopo il merge di ST-CAT-002.
 */
import { basename } from "node:path";
import { describe, expect, it } from "vitest";
import { generaBozza, validaItinerario } from "../../src/index.js";
import { CASI_ISTANTANEE, esisteFile, leggiIstantanea, profiloDiRiferimento } from "./supporto.js";

const nome = (file: string): string => basename(file, ".json");

describe("CA-1 — la bozza non ha problemi bloccanti", () => {
  it.each(CASI_ISTANTANEE.map((c) => [c.profilo, nome(c.file), c] as const))("%s su %s", (_, __, caso) => {
    expect(esisteFile(caso.file), `istantanea assente: ${caso.file}`).toBe(true);
    const istantanea = leggiIstantanea(caso.file);
    const bozza = generaBozza(profiloDiRiferimento(caso.profilo), istantanea);
    expect(bozza.problemi.filter((p) => p.gravita === "bloccante")).toEqual([]);
    expect(bozza.fattibile).toBe(true);
    expect(bozza.tolte).toEqual([]);
    expect(validaItinerario(bozza.viaggio, istantanea)).toEqual([]);
  });
});

describe("CA-6 — la bozza di PR-1 è l'istantanea di riferimento", () => {
  it.each(CASI_ISTANTANEE.filter((c) => c.profilo === "PR-1").map((c) => [nome(c.file), c] as const))(
    "PR-1 su %s",
    async (id, caso) => {
      const bozza = generaBozza(profiloDiRiferimento("PR-1"), leggiIstantanea(caso.file));
      await expect(`${JSON.stringify(bozza, null, 2)}\n`).toMatchFileSnapshot(`./riferimento/bozza-PR-1-${id}.json`);
    },
  );
});
