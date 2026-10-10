// @vitest-environment jsdom
/**
 * ST-PLAN-002-FIX-TB-PLAN-016: nella bozza le durate degli spostamenti hanno un solo formato («20 min», «1 h 10 min»),
 * mai «5 minuti» accanto a «20 min».
 */
import { describe, expect, it } from "vitest";
import { montaBozza, nuovaBozza } from "./supporto-bozza";
import { preparaChat } from "./supporto-chat";

preparaChat();

describe("TB-PLAN-016 durate degli spostamenti", () => {
  it("tutti gli spostamenti usano il formato breve", () => {
    const vista = montaBozza(nuovaBozza());
    const testi = [...vista.querySelectorAll("[data-tipo='spostamento']")].map((e) => e.textContent ?? "");
    expect(testi.length).toBeGreaterThan(3);
    for (const t of testi) {
      expect(t).not.toMatch(/minuti\)/);
      expect(t).toMatch(/\d+ (min|h)/);
    }
  });
});
