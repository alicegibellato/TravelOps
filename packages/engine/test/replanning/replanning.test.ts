import { describe, expect, it } from "vitest";
import { MODULO_REPLANNING } from "../../src/replanning/index.js";

describe("modulo replanning", () => {
  it("è disponibile nel pacchetto del motore", () => {
    expect(MODULO_REPLANNING).toBe("replanning");
  });
});
