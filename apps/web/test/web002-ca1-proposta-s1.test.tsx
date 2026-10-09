import propostaPS1 from "@travelops/engine/data/reference/proposta-p-s1.json";
import type { Proposta } from "@travelops/engine";
import { afterEach, describe, expect, it, vi } from "vitest";
import { avviaScenarioAzione } from "../app/demo/azioni";
import { ContenutoDemo, ContenutoProposta } from "../src/componenti/ContenutiStato";
import { leggiStato } from "../src/stato/archivio";
import { catalogoDiRiferimento } from "../src/dati/scenari";
import { avviaScenario } from "../src/stato/operazioni";
import { inParole } from "../src/testi";
import { contestoProposta } from "../src/viste/proposta";
import { html, valoriAttributo } from "./supporto";
import { AZIONI_DEMO, AZIONI_PROPOSTA, comeHtml, frammento, modulo, nuovaCartella, RIPRISTINA, statoSalvato } from "./supporto-stato";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((indirizzo: string) => {
    throw new Error(`REDIRECT ${indirizzo}`);
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

afterEach(() => {
  vi.restoreAllMocks();
});

/** P-S1 (dati-di-riferimento.md §8), dal file del motore. */
const P_S1 = propostaPS1 as unknown as Proposta;

describe("CA-1 avviando S1 dalla Demo la proposta coincide con P-S1, con la spiegazione e l'esito \"fattibile\"", () => {
  it("CA-1 la Demo offre S1 con il suo itinerario di partenza e il pulsante per avviarlo", () => {
    const markup = html(<ContenutoDemo esito={leggiStato(nuovaCartella())} azioni={AZIONI_DEMO} />);
    const s1 = frammento(markup, "data-scenario", "S1", "</li>");
    expect(s1).toContain("S1 — Pioggia sul trekking");
    // REQ-UX-001 CA-6: etichette e testi del motore in parole (date estese, niente codici).
    expect(s1).toContain("Itinerario di riferimento");
    expect(s1).toContain("Meteo avverso: pioggia in zona Alto Garda il 13 giugno 2026 dalle 08:00 alle 13:00");
    expect(s1).toContain('<input type="hidden" name="scenario" value="S1"/>');
    expect(s1).toContain("Avvia S1");
  });

  it("CA-1 l'azione Avvia S1 salva la proposta e porta alla sua pagina", async () => {
    const cartella = nuovaCartella();
    vi.spyOn(process, "cwd").mockReturnValue(cartella);
    await expect(avviaScenarioAzione(modulo({ scenario: "S1" }))).rejects.toThrow("REDIRECT /demo/proposte/1");
    // La web app scrive in `.data` dentro la sua cartella di lavoro (qui quella temporanea).
    const stato = statoSalvato(`${cartella}/.data`);
    expect(stato.scenario).toBe("S1");
    expect(stato.proposte.map((p) => p.id)).toEqual([1]);
  });

  it("CA-1 la proposta salvata coincide con P-S1: versione base, origine, modifiche, itinerario, esito fattibile", () => {
    const cartella = nuovaCartella();
    const avvio = avviaScenario(cartella, "S1");
    if (!avvio.ok) throw new Error(avvio.messaggio);
    for (const p of [avvio.proposta.proposta, statoSalvato(cartella).proposte[0]?.proposta]) {
      expect(p?.versioneBase).toBe(P_S1.versioneBase);
      expect(p?.origine).toEqual(P_S1.origine);
      expect(p?.impatto.elementiColpiti.map((c) => c.elementoId)).toEqual(["D2-E2"]);
      expect(p?.modifiche).toEqual(P_S1.modifiche);
      expect(p?.itinerario).toEqual(P_S1.itinerario);
      expect(p?.fattibile).toBe(true);
      expect(p?.problemi).toEqual([]);
      expect(p?.elementiARischio).toEqual([]);
      expect(p?.alternative).toEqual([]);
    }
  });

  it("CA-1 la pagina della proposta mostra modifiche, giorno risultante, spiegazione ed esito \"Fattibile\"", () => {
    const cartella = nuovaCartella();
    const avvio = avviaScenario(cartella, "S1");
    if (!avvio.ok) throw new Error(avvio.messaggio);
    const markup = html(<ContenutoProposta esito={leggiStato(cartella)} id={1} azioni={AZIONI_PROPOSTA} ripristina={RIPRISTINA} />);

    expect(markup).toContain("Proposta per S1 — Pioggia sul trekking");
    expect(markup).toContain('data-esito="fattibile"');
    expect(markup).toContain("Esito: <strong>Fattibile</strong>");
    expect(markup).toContain("Meteo avverso: pioggia in zona Alto Garda il 13 giugno 2026 dalle 08:00 alle 13:00");
    expect(markup).toContain('data-colpito="D2-E2"');

    // Modifiche (prima → dopo), come in P-S1.
    expect(valoriAttributo(markup, "data-modifica")).toEqual(["D2-E2", "N1", "D2-E1", "D2-E3"]);
    expect(valoriAttributo(markup, "data-tipo")).toEqual(["rimosso", "aggiunto", "modificato", "modificato"]);
    const d2e1 = frammento(markup, "data-modifica", "D2-E1", "</tr>");
    expect(d2e1).toContain("08:40–09:00 · Hotel sul lago, Riva del Garda → Sentiero del Ponale, partenza · A piedi");
    expect(d2e1).toContain("09:50–10:00 · Hotel sul lago, Riva del Garda → MAG Museo Alto Garda · A piedi");
    expect(frammento(markup, "data-modifica", "N1", "</tr>")).toContain("10:00–12:00 · Visita al MAG");

    // Itinerario risultante del giorno: quello di P-S1.
    const giornoAtteso = P_S1.itinerario.giorni[1]?.elementi ?? [];
    expect(valoriAttributo(markup, "data-elemento")).toEqual(giornoAtteso.map((e) => e.id));
    for (const e of giornoAtteso) {
      expect(frammento(markup, "data-elemento", e.id, "</tr>")).toContain(`<time>${e.inizio}</time>–<time>${e.fine}</time>`);
    }
    expect(frammento(markup, "data-elemento", "N1", "</tr>")).toContain("Aggiunto");

    // La spiegazione è quella del motore, riga per riga, messa in parole (REQ-UX-001 CA-6: nomi al posto degli id).
    const spiegazione = frammento(markup, "data-spiegazione", "", "</div>");
    const stato = leggiStato(cartella);
    if (!stato.ok) throw new Error(stato.motivo);
    const contesto = contestoProposta(avvio.proposta, stato.stato, catalogoDiRiferimento());
    for (const riga of avvio.proposta.proposta.spiegazione.split("\n")) {
      expect(spiegazione).toContain(`<p>${comeHtml(inParole(riga, contesto))}</p>`);
    }
    expect(spiegazione).not.toMatch(/D\d-E\d|\bN1\b/);
    expect(spiegazione).toContain("Visita al MAG");
    expect(markup).toContain("Nessun problema di fattibilità.");
    expect(markup).toContain("Nessun elemento a rischio.");
    expect(markup).toContain("Nessuna alternativa.");
  });

  it("CA-1 dopo l'avvio la Demo indica S1 come scenario in corso e porta alla proposta in attesa di decisione", () => {
    const cartella = nuovaCartella();
    avviaScenario(cartella, "S1");
    const markup = html(<ContenutoDemo esito={leggiStato(cartella)} azioni={AZIONI_DEMO} />);
    expect(markup).toContain("S1 — Pioggia sul trekking</dd>");
    expect(markup).toContain('href="/demo/proposte/1"');
    expect(markup).toContain("In attesa di decisione");
    expect(frammento(markup, "data-scenario", "S1", "</li>")).toContain("scenario--attivo");
  });
});
