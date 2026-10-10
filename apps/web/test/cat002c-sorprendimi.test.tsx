// @vitest-environment jsdom
/**
 * ST-CAT-002C, criterio 4: Sorprendimi usa l'elenco configurabile di 20 destinazioni candidate di
 * `packages/sources/candidates.json`, ordinate col punteggio del profilo (motore), e ne propone le prime 3
 * (REQ-PREF-001 CA-7). L'elenco sta solo nel file: nel codice non c'è nessuna destinazione.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { validaProfilo } from "@travelops/engine";
import { ordinaCandidati } from "@travelops/sources";
import { describe, expect, it } from "vitest";
import { Sorprendimi } from "../src/componenti/Sorprendimi";
import { SceltaDestinazione } from "../src/componenti/SceltaDestinazione";
import { candidateConfigurate } from "../src/destinazioni/candidati";
import { creaServizioDestinazioni } from "../src/destinazioni/servizio";
import { attendi, clic, monta, preparaChat, pulsante } from "./supporto-chat";
import { MESI_DI_PROVA, servizioDiProva } from "./supporto-destinazioni";

preparaChat();

const CARTELLA_APP = process.cwd();
const FILE_CANDIDATE = join(CARTELLA_APP, "..", "..", "packages", "sources", "candidates.json");

function profiloDiRiferimento() {
  // PR-4 "Sorprendimi": relax e gastronomia, da evitare l'avventura, a maggio.
  const esito = validaProfilo({
    destinazione: { tipo: "sorprendimi" },
    date: { tipo: "mese", mese: "2026-05" },
    durata: 3,
    stili: ["relax", "gastronomia"],
    daEvitare: { stili: ["avventura"] },
  });
  if (!esito.ok) throw new Error("profilo non valido");
  return esito.profilo;
}

describe("CA-4 l'elenco delle candidate", () => {
  it("candidates.json ha 20 destinazioni, lette dalla web app senza valori nel codice", () => {
    const file = JSON.parse(readFileSync(FILE_CANDIDATE, "utf8")) as { candidati: unknown[] };
    expect(file.candidati).toHaveLength(20);
    expect(candidateConfigurate()).toHaveLength(20);
  });

  it("nessun nome delle candidate compare nel codice della web app (app/ e src/)", () => {
    const nomi = candidateConfigurate().map((c) => c.nome);
    const colpevoli: string[] = [];
    const visita = (cartella: string): void => {
      for (const nome of readdirSync(cartella)) {
        const percorso = join(cartella, nome);
        if (statSync(percorso).isDirectory()) visita(percorso);
        else if (/\.(ts|tsx|mjs|css)$/.test(nome)) {
          const testo = readFileSync(percorso, "utf8");
          for (const candidata of nomi) if (testo.includes(candidata)) colpevoli.push(`${relative(CARTELLA_APP, percorso)}: ${candidata}`);
        }
      }
    };
    for (const cartella of ["app", "src"]) visita(join(CARTELLA_APP, cartella));
    expect(colpevoli).toEqual([]);
  });
});

describe("CA-4 Sorprendimi propone le prime 3 per punteggio", () => {
  it("il servizio restituisce esattamente 3 proposte, le prime dell'ordine col punteggio del profilo", async () => {
    const esito = await servizioDiProva().sorprendimi({ stili: ["relax", "gastronomia"], daEvitare: ["avventura"], mese: "2026-05" });
    expect(esito.esito).toBe("proposte");
    if (esito.esito !== "proposte") return;
    expect(esito.proposte).toHaveLength(3);
    const attese = ordinaCandidati(candidateConfigurate(), profiloDiRiferimento())
      .slice(0, 3)
      .map((o) => o.candidata.id);
    expect(esito.proposte.map((p) => p.id)).toEqual(attese);
    // Nessuna proposta ha lo stile da evitare, e tutte hanno almeno uno stile in comune col profilo.
    for (const proposta of esito.proposte) {
      expect(proposta.stili).not.toContain("avventura");
      expect(proposta.stiliInComune.length).toBeGreaterThan(0);
    }
  });

  it("un elenco diverso dà proposte diverse: l'elenco viene dal file, non dal codice", async () => {
    const candidate = candidateConfigurate().filter((c) => c.stili.includes("natura")).slice(0, 4);
    const esito = await creaServizioDestinazioni({
      sorgente: {
        tipo: "registrata",
        cercaDestinazioni: () => Promise.resolve([]),
        costruisciIstantanea: () => Promise.reject(new Error("non serve")),
        leggiIstantanea: () => Promise.resolve(null),
        elencaIstantanee: () => Promise.resolve([]),
      },
      candidate,
    }).sorprendimi({ stili: ["natura"], daEvitare: [], mese: "2026-07" });
    expect(esito.esito === "proposte" && esito.proposte.every((p) => candidate.some((c) => c.id === p.id))).toBe(true);
    expect(esito.esito === "proposte" && esito.proposte).toHaveLength(3);
  });

  it("nella pagina: scelti gli stili e il mese, il pulsante mostra 3 proposte; sceglierne una riempie la ricerca", async () => {
    const vista = monta(<SceltaDestinazione servizio={servizioDiProva()} mesi={MESI_DI_PROVA} />);
    clic(pulsante(vista, "Relax"));
    clic(pulsante(vista, "Gastronomia"));
    // «Avventura» compare due volte (cosa ti piace / cosa evitare): la seconda è nel gruppo «da evitare».
    const evitare = vista.querySelector("[role='group'][aria-label='Cosa preferisci evitare']");
    clic(pulsante(evitare as HTMLElement, "Avventura"));
    clic(pulsante(vista, "Sorprendimi"));
    await attendi();
    const proposte = [...vista.querySelectorAll<HTMLElement>(".sorprendimi__proposta")];
    expect(proposte).toHaveLength(3);
    const attese = ordinaCandidati(candidateConfigurate(), profiloDiRiferimento())
      .slice(0, 3)
      .map((o) => o.candidata.id);
    expect(proposte.map((p) => p.dataset["proposta"])).toEqual(attese);

    const nome = proposte[1]?.querySelector("h3")?.textContent ?? "";
    clic(pulsante(proposte[1] as HTMLElement, `Scegli ${nome}`));
    expect(vista.querySelector<HTMLInputElement>("input[name='destinazione']")?.value).toBe(nome);
  });

  it("il componente da solo: se il server non risponde dice di riprovare", async () => {
    const vista = monta(
      <Sorprendimi servizio={{ sorprendimi: () => Promise.reject(new Error("giù")) }} mesi={MESI_DI_PROVA} onScegli={() => undefined} />,
    );
    clic(pulsante(vista, "Sorprendimi"));
    await attendi();
    expect(vista.querySelector(".ui-avviso")?.textContent).toContain("Riprova tra un attimo.");
  });
});
