import { describe, expect, it } from "vitest";
import { MODULO_FEASIBILITY } from "../../src/feasibility/index.js";

describe("modulo feasibility", () => {
  it("è disponibile nel pacchetto del motore", () => {
    expect(MODULO_FEASIBILITY).toBe("feasibility");
  });
});
