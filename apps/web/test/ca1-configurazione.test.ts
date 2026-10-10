import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function leggi(percorso: string): string {
  return readFileSync(new URL(percorso, import.meta.url), "utf8");
}

interface Pacchetto {
  name: string;
  workspaces?: string[];
  scripts: Record<string, string>;
  dependencies?: Record<string, string>;
}

const radice = JSON.parse(leggi("../../../package.json")) as Pacchetto;
const web = JSON.parse(leggi("../package.json")) as Pacchetto;

describe("CA-1 avvio, build e integrazione continua", () => {
  it("CA-1 la web app è un workspace del monorepo con build, test e dev server", () => {
    expect(web.name).toBe("@travelops/web");
    expect(radice.workspaces).toContain("apps/*");
    expect(Object.keys(web.scripts)).toEqual(expect.arrayContaining(["dev", "build", "start", "test"]));
    expect(web.dependencies).toHaveProperty("@travelops/engine");
    expect(web.dependencies).toHaveProperty("next");
    expect(web.dependencies).toHaveProperty("leaflet");
  });

  it("CA-1 dalla radice `npm run dev` compila il motore, le sorgenti e gli agenti e avvia la web app in sviluppo", () => {
    expect(radice.scripts.dev).toBe(
      "npm run build --workspace @travelops/engine && npm run build --workspace @travelops/sources && npm run build --workspace @travelops/agents && npm run dev --workspace @travelops/web",
    );
  });

  it("CA-1 dalla radice `npm run build` e `npm test` comprendono tutti i workspace, quindi anche la web app", () => {
    expect(radice.scripts.build).toBe("npm run build --workspaces --if-present");
    expect(radice.scripts.test).toBe("npm test --workspaces --if-present");
    // Il motore va compilato prima della web app: i workspace sono elencati con packages/* prima di apps/*.
    expect(radice.workspaces).toEqual(["packages/*", "apps/*"]);
  });

  it("CA-1 la CI compila e prova tutto il monorepo a ogni push", () => {
    const ci = leggi("../../../.github/workflows/ci.yml");
    expect(ci).toMatch(/^on:\s*\n\s+push:/m);
    expect(ci).toContain("run: npm ci");
    expect(ci).toContain("run: npm run build");
    expect(ci).toContain("run: npm test");
  });
});
