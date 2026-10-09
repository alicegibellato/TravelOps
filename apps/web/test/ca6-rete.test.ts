import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import configurazione from "../next.config.mjs";
import { ATTRIBUZIONE_OSM, ORIGINE_TESSERE_OSM, politicaSicurezzaContenuti, URL_TESSERE_OSM } from "../src/rete";

const CARTELLA_APP = fileURLToPath(new URL("..", import.meta.url));

/** Tutti i file sorgente della web app (pagine, componenti, logica, configurazione, script). */
function sorgentiWebApp(): { file: string; testo: string }[] {
  const trovati: { file: string; testo: string }[] = [];
  const visita = (cartella: string): void => {
    for (const nome of readdirSync(cartella)) {
      const percorso = join(cartella, nome);
      if (statSync(percorso).isDirectory()) {
        visita(percorso);
      } else if (/\.(ts|tsx|mjs|js|css)$/.test(nome)) {
        trovati.push({ file: relative(CARTELLA_APP, percorso).replaceAll("\\", "/"), testo: readFileSync(percorso, "utf8") });
      }
    }
  };
  for (const cartella of ["app", "src", "scripts"]) visita(join(CARTELLA_APP, cartella));
  trovati.push({ file: "next.config.mjs", testo: readFileSync(join(CARTELLA_APP, "next.config.mjs"), "utf8") });
  return trovati;
}

/** Le direttive della CSP, come mappa nome → valori. */
function direttive(politica: string): Map<string, string[]> {
  return new Map(
    politica
      .split(";")
      .map((parte) => parte.trim().split(/\s+/))
      .filter((parti) => parti[0] !== undefined && parti[0] !== "")
      .map(([nome, ...valori]) => [nome ?? "", valori]),
  );
}

/** Indirizzi ammessi nel codice: l'origine delle tessere e la pagina dei diritti di OpenStreetMap (un link per chi legge). */
const INDIRIZZI_AMMESSI = new Set([ORIGINE_TESSERE_OSM, "https://www.openstreetmap.org/copyright"]);

describe("CA-6 nessuna chiamata di rete oltre alle tessere di OpenStreetMap", () => {
  it("CA-6 la mappa usa le tessere di OpenStreetMap con l'attribuzione richiesta", () => {
    expect(ORIGINE_TESSERE_OSM).toBe("https://tile.openstreetmap.org");
    expect(URL_TESSERE_OSM).toBe("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
    expect(ATTRIBUZIONE_OSM).toContain("OpenStreetMap");
  });

  it.each([false, true])(
    "CA-6 la politica di sicurezza (sviluppo: %s) ammette solo la stessa origine e, per le immagini, le tessere OSM",
    (sviluppo) => {
      const mappa = direttive(politicaSicurezzaContenuti(sviluppo));
      expect(mappa.get("default-src")).toEqual(["'self'"]);
      expect(mappa.get("connect-src")).toEqual(["'self'"]);
      expect(mappa.get("img-src")).toEqual(["'self'", "data:", "blob:", ORIGINE_TESSERE_OSM]);
      // Nessun'altra origine esterna in nessuna direttiva.
      const esterne = [...mappa.values()].flat().filter((valore) => /^(https?:|wss?:|\*)/.test(valore));
      expect(esterne).toEqual([ORIGINE_TESSERE_OSM]);
    },
  );

  it("CA-6 Next.js invia la stessa politica di sicurezza su tutte le pagine", async () => {
    expect(configurazione.headers).toBeTypeOf("function");
    const regole = (await configurazione.headers?.()) ?? [];
    expect(regole.map((regola) => regola.source)).toEqual(["/:percorso*"]);
    const csp = regole[0]?.headers.find((intestazione) => intestazione.key === "Content-Security-Policy")?.value;
    // Nei test NODE_ENV vale "test": la configurazione usa la variante di sviluppo.
    expect(csp).toBe(politicaSicurezzaContenuti(process.env.NODE_ENV !== "production"));
  });

  it("CA-6 il codice della web app non usa API di rete (fetch, XHR, WebSocket, EventSource, sendBeacon)", () => {
    const vietati = /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|next\/font\/google|navigator\.serviceWorker/;
    const colpevoli = sorgentiWebApp()
      .filter(({ testo }) => vietati.test(testo))
      .map(({ file }) => file);
    expect(colpevoli).toEqual([]);
  });

  it("CA-6 nel codice della web app compaiono solo gli indirizzi di OpenStreetMap", () => {
    const trovati = new Set<string>();
    for (const { testo } of sorgentiWebApp()) {
      for (const [indirizzo] of testo.matchAll(/(?:https?|wss?):\/\/[^\s"'`)<>{}]+/g)) {
        trovati.add(indirizzo.replace(/\/\{z\}.*$/, "").replace(/[.,;]+$/, ""));
      }
    }
    expect([...trovati].filter((indirizzo) => !INDIRIZZI_AMMESSI.has(indirizzo))).toEqual([]);
  });

  it("CA-6 la mappa non usa le icone predefinite di Leaflet (immagini da caricare): gli indicatori sono numeri in HTML", () => {
    const mappa = readFileSync(join(CARTELLA_APP, "src/componenti/MappaGiorno.tsx"), "utf8");
    expect(mappa).toContain("L.divIcon(");
    expect(mappa).not.toMatch(/Icon\.Default|iconUrl/);
  });

  it("CA-6 i dati di viaggio e catalogo sono importati nella build, non scaricati", () => {
    const viaggi = readFileSync(join(CARTELLA_APP, "src/dati/viaggi.ts"), "utf8");
    const importazioni = [...viaggi.matchAll(/from "([^"]+\.json)"/g)].map((trovato) => trovato[1]);
    expect(importazioni.sort()).toEqual([
      "@travelops/engine/data/reference/catalogo.json",
      "@travelops/engine/data/reference/variante-v-fisso.json",
      "@travelops/engine/data/reference/variante-v-irr.json",
      "@travelops/engine/data/reference/variante-v-volo.json",
      "@travelops/engine/data/reference/versione-1.json",
    ]);
  });

  it("CA-6 dev server, build e avvio passano dallo script che disattiva la telemetria di Next.js", () => {
    const pacchetto = JSON.parse(readFileSync(join(CARTELLA_APP, "package.json"), "utf8")) as { scripts: Record<string, string> };
    expect(pacchetto.scripts.dev).toBe("node scripts/next.mjs dev");
    expect(pacchetto.scripts.build).toBe("node scripts/next.mjs build");
    expect(pacchetto.scripts.start).toBe("node scripts/next.mjs start");
    const script = readFileSync(join(CARTELLA_APP, "scripts/next.mjs"), "utf8");
    expect(script).toContain('NEXT_TELEMETRY_DISABLED: "1"');
  });
});
