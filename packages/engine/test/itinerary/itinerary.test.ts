import { describe, expect, it } from "vitest";
import { MODULO_ITINERARY } from "../../src/itinerary/index.js";

describe("modulo itinerary", () => {
  it("è disponibile nel pacchetto del motore", () => {
    expect(MODULO_ITINERARY).toBe("itinerary");
  });
});
