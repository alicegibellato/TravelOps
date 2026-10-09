import { describe, expect, it } from "vitest";
import { MODULO_HISTORY } from "../../src/history/index.js";

describe("modulo history", () => {
  it("è disponibile nel pacchetto del motore", () => {
    expect(MODULO_HISTORY).toBe("history");
  });
});
