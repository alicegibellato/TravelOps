/**
 * REQ-UX-001 CA-6: nessun codice tecnico del motore (id degli elementi come D2-E4 o N1, codici dei problemi) compare
 * nel testo visibile delle pagine principali. I codici restano solo negli attributi `data-*` e negli indirizzi.
 */
import catalogoJson from "@travelops/engine/data/reference/catalogo.json";
import {
  CODICI_AVVISO_CATALOGO,
  CODICI_ERRORE,
  CODICI_ERRORE_MODIFICA,
  CODICI_PROBLEMA_FATTIBILITA,
  CODICI_STORICO,
  creaSorgenteDaFile,
  descriviImprevisto,
  proponiRipianificazione,
  type Catalogo,
  type Imprevisto,
  type Viaggio,
} from "@travelops/engine";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generateMetadata as titoloElemento } from "../app/viaggi/[viaggio]/elementi/[elemento]/page";
import { generateMetadata as titoloGiorno } from "../app/viaggi/[viaggio]/giorni/[data]/page";
import { generateMetadata as titoloElementoVersione } from "../app/versioni/[numero]/elementi/[elemento]/page";
import { VIAGGI } from "../src/dati/viaggi";
import { contestoTesti, inParole, TESTI_ALTERNATIVE, TESTI_CODICI, TESTI_IMPREVISTI } from "../src/testi";
import { leggiApp, paginaCompleta, paginePrincipali, testoVisibile } from "./supporto-ux";

const CARTELLA_DATI_MOTORE = fileURLToPath(new URL("../../../packages/engine/data/reference/", import.meta.url));

interface CatalogoGrezzo {
  zone: { id: string; nome: string }[];
  luoghi: { id: string; nome: string }[];
  attivita: { id: string; nome: string }[];
}

/**
 * Gli id del catalogo che, scritti in maiuscolo come parola intera, sarebbero un codice a vista. Restano fuori gli id
 * che sono anche parte di un nome (per esempio "MUSE" in "Visita al MUSE").
 */
function idCatalogoDaCercare(): string[] {
  const catalogo = catalogoJson as CatalogoGrezzo;
  const nomi = [...catalogo.zone, ...catalogo.luoghi, ...catalogo.attivita].map((v) => v.nome);
  return [...catalogo.zone, ...catalogo.luoghi, ...catalogo.attivita]
    .map((v) => v.id)
    .filter((id) => !nomi.some((nome) => new RegExp(`(^|[^\\w-])${id}([^\\w-]|$)`).test(nome)));
}

/** I codici tecnici del motore che non devono mai comparire nel testo visibile. */
function modelliVietati(): { nome: string; modello: RegExp }[] {
  const parole = (elenco: readonly string[]) => new RegExp(`(^|[^\\w-])(${elenco.join("|")})([^\\w-]|$)`);
  return [
    { nome: "id degli elementi (D2-E4)", modello: /\bD\d+-E\d+\b/ },
    { nome: "id degli elementi nuovi (N1)", modello: /\bN\d+\b/ },
    { nome: "codici dei problemi di fattibilità", modello: parole([...CODICI_PROBLEMA_FATTIBILITA, ...CODICI_AVVISO_CATALOGO]) },
    { nome: "codici dello storico", modello: parole(CODICI_STORICO) },
    { nome: "codici degli errori dei dati", modello: parole(CODICI_ERRORE) },
    { nome: "codici degli errori delle modifiche", modello: parole(CODICI_ERRORE_MODIFICA) },
    { nome: "tipi di imprevisto", modello: parole(Object.keys(TESTI_IMPREVISTI)) },
    { nome: "tipi di alternativa", modello: parole(Object.keys(TESTI_ALTERNATIVE)) },
    { nome: "id del catalogo", modello: parole(idCatalogoDaCercare()) },
    { nome: "id del viaggio e delle varianti", modello: /\bTRIP-[A-Z]+\b|\bV-(IRR|FISSO|VOLO)\b/ },
  ];
}

function codiciTrovati(testo: string): string[] {
  const trovati: string[] = [];
  for (const riga of testo.split("\n")) {
    for (const { nome, modello } of modelliVietati()) {
      const trovato = modello.exec(riga);
      if (trovato !== null) trovati.push(`${nome}: «${riga.trim().slice(0, 140)}»`);
    }
  }
  return trovati;
}

/**
 * Tempo massimo di ogni prova sulle pagine: ognuna renderizza e analizza decine di pagine (circa 5 s a macchina scarica)
 * e con tutta la suite in parallelo il carico le rallenta oltre i 5 s predefiniti.
 */
const PAUSA_PROVA_MS = 90_000;

describe("CA-6 nessun codice tecnico del motore nel testo visibile delle pagine principali", { timeout: PAUSA_PROVA_MS }, () => {
  it("CA-6 il controllo riconosce i codici: id degli elementi, codici dei problemi, id del catalogo", () => {
    expect(codiciTrovati("Pranzo D2-E4 alle 13")).toHaveLength(1);
    expect(codiciTrovati("Aggiunto N1")).toHaveLength(1);
    expect(codiciTrovati("FUORI_ORARIO (bloccante)")).toHaveLength(1);
    expect(codiciTrovati("[PROPOSTA_SUPERATA] la proposta…")).toHaveLength(1);
    expect(codiciTrovati("pioggia in GARDA_NORD")).toHaveLength(1);
    expect(codiciTrovati("Visita al MUSE, Pranzo sul lago, XY123, 13 giugno 2026")).toEqual([]);
  });

  it("CA-6 il testo visibile non tiene conto del contenuto dei dettagli chiusi e degli attributi data-*", () => {
    const html = paginaCompleta(
      <div>
        <p data-elemento="D2-E4">Pranzo sul lago</p>
        <details>
          <summary>Dettagli tecnici</summary>
          <code>FUORI_ORARIO</code>
        </details>
        <button type="button" aria-label="Apri D2-E4">
          Apri
        </button>
      </div>,
    );
    const testo = testoVisibile(html);
    expect(testo).toContain("Pranzo sul lago");
    expect(testo).toContain("Dettagli tecnici");
    expect(testo).not.toContain("FUORI_ORARIO");
    // Le etichette per i lettori di schermo contano come testo.
    expect(codiciTrovati(testo)).toHaveLength(1);
  });

  it("CA-6 home, /stile, viaggi, giorni, elementi, Demo, proposte S1–S8, versioni ed esiti: nessun codice a vista", () => {
    const pagine = paginePrincipali();
    expect(pagine.length).toBeGreaterThan(150);
    const trovati: string[] = [];
    for (const { nome, contenuto } of pagine) {
      for (const codice of codiciTrovati(testoVisibile(paginaCompleta(contenuto)))) trovati.push(`${nome} → ${codice}`);
    }
    expect(trovati).toEqual([]);
    // Al posto dei codici c'è il testo in parole.
    const testoDi = (nome: string): string => {
      const pagina = pagine.find((p) => p.nome === nome);
      if (pagina === undefined) throw new Error(`pagina ${nome} mancante`);
      return testoVisibile(paginaCompleta(pagina.contenuto));
    };
    expect(testoDi("proposta S6")).toContain(TESTI_CODICI.FUORI_ORARIO);
    expect(testoDi("proposta S1")).toContain("Visita al MAG");
    expect(testoDi("proposta S1 decisa")).toContain(TESTI_CODICI.PROPOSTA_SUPERATA);
    expect(testoDi("versione 1 giorno 2026-06-13 con S1")).toContain(TESTI_CODICI.METEO_AVVERSO);
  }, 120_000);

  it("CA-6 le pagine hanno comunque gli id negli attributi data-*: il codice non è sparito, è solo nascosto", () => {
    const pagine = paginePrincipali({ tuttiGliElementi: false });
    const giorno = pagine.find((p) => p.nome === "giorno versione-1 2026-06-13");
    const proposta = pagine.find((p) => p.nome === "proposta S6");
    if (giorno === undefined || proposta === undefined) throw new Error("pagine mancanti");
    expect(paginaCompleta(giorno.contenuto)).toContain('data-elemento="D2-E4"');
    expect(paginaCompleta(proposta.contenuto)).toContain('data-problema="FUORI_ORARIO"');
  });

  it("CA-6 nemmeno il titolo della scheda del browser mostra gli id", async () => {
    const titoli: string[] = [];
    for (const voce of VIAGGI) {
      titoli.push(String((await titoloGiorno({ params: Promise.resolve({ viaggio: voce.chiave, data: "2026-06-14" }) })).title));
      titoli.push(String((await titoloElemento({ params: Promise.resolve({ viaggio: voce.chiave, elemento: "D3-E2" }) })).title));
    }
    titoli.push(String((await titoloElementoVersione({ params: Promise.resolve({ numero: "2", elemento: "N1" }) })).title));
    expect(titoli).toContain("Visita al Castello del Buonconsiglio · Itinerario di riferimento");
    expect(codiciTrovati(titoli.join("\n"))).toEqual([]);
  });

  it("CA-6 sulla mappa, popup e suggerimenti mostrano nomi e orari, mai gli id degli elementi", () => {
    const mappa = leggiApp("src/componenti/MappaGiorno.tsx");
    const testiMappa = [...mappa.matchAll(/bind(?:Tooltip|Popup)\(([\s\S]*?)\)\s*\n/g)].map((t) => t[1] ?? "");
    expect(testiMappa).toHaveLength(2);
    for (const testo of testiMappa) expect(testo).not.toContain("elementoId");
  });
});

describe("CA-6 il modulo dei testi traduce in parole tutti i codici del motore", () => {
  const leggi = <T,>(file: string): T => JSON.parse(readFileSync(join(CARTELLA_DATI_MOTORE, file), "utf8")) as T;
  const FILE: Record<string, string> = {
    "versione-1": "versione-1.json",
    "V-IRR": "variante-v-irr.json",
    "V-FISSO": "variante-v-fisso.json",
    "V-VOLO": "variante-v-volo.json",
  };

  it("CA-6 ogni codice di problemi, errori, storico e modifiche ha la sua traduzione, senza codici dentro", () => {
    const tutti = [
      ...new Set([...CODICI_PROBLEMA_FATTIBILITA, ...CODICI_AVVISO_CATALOGO, ...CODICI_ERRORE, ...CODICI_STORICO, ...CODICI_ERRORE_MODIFICA]),
    ];
    expect(Object.keys(TESTI_CODICI).sort()).toEqual(tutti.sort());
    for (const testo of [...Object.values(TESTI_CODICI), ...Object.values(TESTI_IMPREVISTI), ...Object.values(TESTI_ALTERNATIVE)]) {
      expect(testo).toMatch(/^[A-ZÈ][a-zàèéìòù' ]/);
      expect(codiciTrovati(testo)).toEqual([]);
    }
  });

  it("CA-6 i messaggi del motore con il codice tra parentesi quadre diventano frasi", () => {
    expect(inParole("[PROPOSTA_SUPERATA] la proposta è costruita sulla versione 1")).toBe(
      "Questa proposta non è più aggiornata: la proposta è costruita sulla versione 1",
    );
    expect(inParole("[FUORI_GIORNATA] D2-E2: l'orario finisce dopo la mezzanotte")).toBe(
      "Fuori dalla giornata: un elemento del programma: l'orario finisce dopo la mezzanotte",
    );
  });

  const scenari = leggi<{ id: string; itinerario: string; imprevisto: Imprevisto }[]>("scenari-imprevisti.json");

  it.each(scenari.map((s) => [s.id, s] as const))(
    "CA-6 %s: imprevisto, spiegazione, impatto, problemi, alternative e causa in parole, con i nomi al posto degli id",
    (_id, scenario) => {
      const catalogo = leggi<Catalogo>("catalogo.json");
      const viaggio = leggi<Viaggio>(FILE[scenario.itinerario] ?? "");
      const proposta = proponiRipianificazione(viaggio, 1, catalogo, creaSorgenteDaFile(CARTELLA_DATI_MOTORE), scenario.imprevisto);
      const contesto = contestoTesti(catalogo, [viaggio, proposta.itinerario], proposta.modifiche.rimossi);
      const testi = [
        descriviImprevisto(scenario.imprevisto, viaggio, catalogo),
        ...proposta.spiegazione.split("\n"),
        ...proposta.impatto.elementiColpiti.map((c) => c.motivo),
        ...proposta.problemi.map((p) => p.messaggio),
        ...proposta.alternative.map((a) => a.etichetta),
      ];
      const originali = testi.join("\n");
      const riscritti = testi.map((t) => inParole(t, contesto)).join("\n");
      // Il motore usa i codici (per questo serve il modulo dei testi); dopo la riscrittura non ce n'è più nessuno.
      if (/\bD\d+-E\d+\b/.test(originali)) expect(codiciTrovati(originali).length).toBeGreaterThan(0);
      // Gli indirizzi delle alternative restano identici (contengono date AAAA-MM-GG, che non vanno toccate).
      const senzaIndirizzi = riscritti.replace(/https?:\/\/\S+/g, "");
      expect(codiciTrovati(senzaIndirizzi)).toEqual([]);
      expect(senzaIndirizzi).not.toMatch(/\b\d{4}-\d{2}-\d{2}\b/);
      for (const a of proposta.alternative) expect(riscritti).toContain(a.indirizzo);
    },
  );
});
