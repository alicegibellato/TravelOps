/**
 * ST-WEB-001-FIX-TB-NEW-D1 (TB-NEW-D1): `/favicon.ico` esiste, così il browser non registra un 404 su ogni pagina.
 * Next.js serve da solo `app/favicon.ico` a quell'indirizzo.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("favicon", () => {
  it("app/favicon.ico è un'icona valida con almeno un'immagine", () => {
    const icona = readFileSync(new URL("../app/favicon.ico", import.meta.url));
    expect(icona.readUInt16LE(0)).toBe(0); // riservato
    expect(icona.readUInt16LE(2)).toBe(1); // tipo: icona
    expect(icona.readUInt16LE(4)).toBeGreaterThanOrEqual(1);
    const inizio = icona.readUInt32LE(18);
    expect(inizio + icona.readUInt32LE(14)).toBeLessThanOrEqual(icona.length);
  });
});
