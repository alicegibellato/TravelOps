import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import * as motore from "@travelops/engine";
import {
  applicaProposta,
  CODICI_PROBLEMA_FATTIBILITA,
  CODICI_STORICO,
  creaSorgenteDaFile,
  creaStorico,
  esportaStorico,
  proponiRipianificazione,
  type Catalogo,
  type Imprevisto,
  type Viaggio,
} from "@travelops/engine";
import { describe, expect, it } from "vitest";
import { accettaProposta, avviaScenario, impostaOrologio } from "../src/stato/operazioni";
import { nuovaCartella, statoSalvato } from "./supporto-stato";

const CARTELLA_APP = fileURLToPath(new URL("..", import.meta.url));
const CARTELLA_DATI_MOTORE = fileURLToPath(new URL("../../../packages/engine/data/reference/", import.meta.url));

/** I sorgenti della web app (pagine, componenti, logica): niente test. */
function sorgenti(): { file: string; testo: string }[] {
  const trovati: { file: string; testo: string }[] = [];
  const visita = (cartella: string): void => {
    for (const nome of readdirSync(cartella)) {
      const percorso = join(cartella, nome);
      if (statSync(percorso).isDirectory()) visita(percorso);
      else if (/\.(ts|tsx|mjs)$/.test(nome)) {
        trovati.push({ file: relative(CARTELLA_APP, percorso).replaceAll("\\", "/"), testo: readFileSync(percorso, "utf8") });
      }
    }
  };
  for (const cartella of ["app", "src"]) visita(join(CARTELLA_APP, cartella));
  return trovati;
}

/** Il codice senza commenti (le parole dei commenti non sono logica). */
function senzaCommenti(testo: string): string {
  return testo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Gli specificatori di tutte le importazioni di un file. */
function importazioni(testo: string): string[] {
  return [...testo.matchAll(/(?:from|import)\s+"([^"]+)"/g)].map((t) => t[1] ?? "");
}

/** I nomi importati da "@travelops/engine" in un file. */
function importatiDalMotore(testo: string): Set<string> {
  const nomi = new Set<string>();
  for (const [, elenco] of testo.matchAll(/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*"@travelops\/engine"/g)) {
    for (const voce of (elenco ?? "").split(",")) {
      const nome = voce.replace(/^\s*type\s+/, "").trim();
      if (nome !== "") nomi.add(nome);
    }
  }
  return nomi;
}

/** Le operazioni del motore che fanno proposte, controlli e versioni. */
const OPERAZIONI_DEL_MOTORE = [
  "proponiRipianificazione",
  "applicaProposta",
  "rifiutaProposta",
  "creaStorico",
  "versioneCorrente",
  "elencaVersioni",
  "leggiVersione",
  "confrontaVersioni",
  "esportaStorico",
  "importaStorico",
  "controllaFattibilita",
  "arricchisciSorgente",
  "descriviImprevisto",
] as const;

describe("CA-9 la web app non contiene logica di ripianificazione: proposte, controlli e versioni vengono dal motore", () => {
  it("CA-9 la web app usa il motore solo come pacchetto: \"@travelops/engine\" e i suoi dati di riferimento", () => {
    const vietate: string[] = [];
    for (const { file, testo } of sorgenti()) {
      for (const specificatore of importazioni(testo)) {
        const delMotore = specificatore.includes("engine") || specificatore.includes("packages/");
        const ammessa = specificatore === "@travelops/engine" || /^@travelops\/engine\/data\/reference\/[\w-]+\.json$/.test(specificatore);
        if (delMotore && !ammessa) vietate.push(`${file}: ${specificatore}`);
      }
    }
    expect(vietate).toEqual([]);
  });

  it("CA-9 ogni operazione su proposte, controlli e versioni è importata dal motore dove si usa, e tutte sono usate", () => {
    const usate = new Set<string>();
    const senzaImport: string[] = [];
    for (const { file, testo } of sorgenti()) {
      const codice = senzaCommenti(testo);
      const importati = importatiDalMotore(testo);
      for (const operazione of OPERAZIONI_DEL_MOTORE) {
        if (!new RegExp(`\\b${operazione}\\(`).test(codice)) continue;
        usate.add(operazione);
        if (!importati.has(operazione)) senzaImport.push(`${file}: ${operazione}`);
      }
    }
    expect(senzaImport).toEqual([]);
    expect([...usate].sort()).toEqual([...OPERAZIONI_DEL_MOTORE].sort());
    for (const operazione of OPERAZIONI_DEL_MOTORE) expect(motore).toHaveProperty(operazione);
  });

  it("CA-9 la web app non ridefinisce funzioni o valori del motore", () => {
    const delMotore = new Set(Object.keys(motore));
    const ridefiniti: string[] = [];
    for (const { file, testo } of sorgenti()) {
      for (const [, nome] of senzaCommenti(testo).matchAll(/\b(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)) {
        if (nome !== undefined && delMotore.has(nome)) ridefiniti.push(`${file}: ${nome}`);
      }
    }
    expect(ridefiniti).toEqual([]);
  });

  it("CA-9 nel codice della web app non compaiono i codici dei problemi e dello storico: esiti e messaggi sono del motore", () => {
    const codici = [...CODICI_PROBLEMA_FATTIBILITA, ...CODICI_STORICO];
    const trovati: string[] = [];
    // REQ-UX-001 chiede un unico modulo di testi che traduce in parole tutti i codici del motore (CA-6): è l'unico
    // file in cui i codici compaiono, come chiavi delle traduzioni; esiti e messaggi restano quelli del motore.
    for (const { file, testo } of sorgenti().filter(({ file }) => file !== "src/testi.ts")) {
      const codice = senzaCommenti(testo);
      for (const c of codici) if (codice.includes(c)) trovati.push(`${file}: ${c}`);
    }
    expect(trovati).toEqual([]);
  });

  it("CA-9 nessun calcolo sugli orari e nessun orologio di sistema: il momento è l'orologio simulato", () => {
    const vietati = /split\(\s*["']:["']\s*\)|\*\s*60\b|Date\.now\(|new Date\(\s*\)|performance\.now\(/;
    const colpevoli = sorgenti()
      .filter(({ testo }) => vietati.test(senzaCommenti(testo)))
      .map(({ file }) => file);
    expect(colpevoli).toEqual([]);
  });

  // REQ-DATA-001 aggiunge better-sqlite3 (e i suoi tipi): la base dati SQLite richiesta dal requisito.
  // REQ-UX-001 aggiunge il design system: nessuna di queste dipendenze fa logica di viaggio.
  it("CA-9 nessuna dipendenza che faccia ripianificazione: oltre al motore solo Next.js, React, Leaflet, better-sqlite3 (REQ-DATA-001) e il design system (REQ-UX-001)", () => {
    const pacchetto = JSON.parse(readFileSync(join(CARTELLA_APP, "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    // REQ-UX-001 ha aggiunto componenti accessibili (Radix UI), icone (Lucide) e i caratteri in file locali; per i test
    // di accessibilità e di impaginazione axe-core, jsdom e playwright-core. Nessuna di queste fa logica di viaggio.
    expect(Object.keys(pacchetto.dependencies).sort()).toEqual([
      "@fontsource-variable/inter",
      "@fontsource-variable/plus-jakarta-sans",
      "@travelops/engine",
      "better-sqlite3",
      "leaflet",
      "lucide-react",
      "next",
      "radix-ui",
      "react",
      "react-dom",
    ]);
    expect(Object.keys(pacchetto.devDependencies).sort()).toEqual([
      "@types/better-sqlite3",
      "@types/jsdom",
      "@types/leaflet",
      "@types/react",
      "@types/react-dom",
      "axe-core",
      "jsdom",
      "playwright-core",
    ]);
  });

  describe("CA-9 quello che la web app salva e mostra coincide con quello che restituisce il motore", () => {
    const leggi = <T>(file: string): T => JSON.parse(readFileSync(join(CARTELLA_DATI_MOTORE, file), "utf8")) as T;
    const FILE: Record<string, string> = { "versione-1": "versione-1.json", "V-IRR": "variante-v-irr.json", "V-VOLO": "variante-v-volo.json" };
    const catalogo = leggi<Catalogo>("catalogo.json");
    const sorgente = creaSorgenteDaFile(CARTELLA_DATI_MOTORE);
    const scenari = leggi<{ id: string; itinerario: string; imprevisto: Imprevisto }[]>("scenari-imprevisti.json");

    it.each(scenari.map((s) => [s.id, s] as const))("CA-9 %s: la proposta salvata è quella di proponiRipianificazione", (id, scenario) => {
      const viaggio = leggi<Viaggio>(FILE[scenario.itinerario] ?? "");
      const attesa = proponiRipianificazione(viaggio, 1, catalogo, sorgente, scenario.imprevisto);
      const cartella = nuovaCartella();
      avviaScenario(cartella, id);
      expect(statoSalvato(cartella).proposte[0]?.proposta).toEqual(JSON.parse(JSON.stringify(attesa)));
    });

    it("CA-9 la versione 2 salvata è quella di applicaProposta", () => {
      const viaggio = leggi<Viaggio>("versione-1.json");
      const creato = creaStorico(viaggio);
      if (!creato.ok) throw new Error(creato.errore.messaggio);
      const proposta = proponiRipianificazione(viaggio, 1, catalogo, sorgente, scenari[0]?.imprevisto as Imprevisto);
      const attesa = applicaProposta(creato.storico, proposta, "Alice", { data: "2026-06-13", ora: "07:30" });
      const cartella = nuovaCartella();
      avviaScenario(cartella, "S1");
      impostaOrologio(cartella, "2026-06-13", "07:30");
      accettaProposta(cartella, 1, "Alice");
      expect(esportaStorico(statoSalvato(cartella).storico)).toBe(esportaStorico(attesa.storico));
    });
  });
});
