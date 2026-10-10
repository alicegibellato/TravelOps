/**
 * ST-OBS-001A-FIX-TB-NEW-D7 (TB-NEW-D7): il prodotto è solo desktop, quindi il nome della suite E2E non cita 375 px.
 */
import { describe, expect, it } from "vitest";
import { leggiConfigurazione } from "../../../scripts/esegui-test";

describe("nomi delle suite", () => {
  it("la suite E2E dichiara solo la larghezza desktop", () => {
    const suite = leggiConfigurazione().suite;
    expect(suite.find((s) => s.id === "e2e")?.nome).toBe("E2E web (1280 px)");
    expect(suite.map((s) => s.nome).join(" ")).not.toMatch(/375/);
  });
});
