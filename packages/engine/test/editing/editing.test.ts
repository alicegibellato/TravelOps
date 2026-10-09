import { describe, expect, it } from "vitest";
import { MODULO_EDITING } from "../../src/editing/index.js";

describe("modulo editing", () => {
  it("è disponibile nel pacchetto del motore", () => {
    expect(MODULO_EDITING).toBe("editing");
  });
});
