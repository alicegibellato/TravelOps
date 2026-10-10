import { describe, expect, it } from "vitest";
import { ContenutoProposta } from "../src/componenti/ContenutiStato";
import { leggiStato } from "../src/stato/archivio";
import { catalogoDiRiferimento } from "../src/dati/scenari";
import { avviaScenario } from "../src/stato/operazioni";
import { inParole, TESTI_CODICI, type CodiceMotore } from "../src/testi";
import { contestoProposta } from "../src/viste/proposta";
import { html, valoriAttributo, voceElemento } from "./supporto";
import { AZIONI_PROPOSTA, comeHtml, frammento, nuovaCartella, RIPRISTINA } from "./supporto-stato";

/** I due link di REQ-REPLAN-002 per S7. */
const LINK_GESTIONE = "https://example.com/prenotazioni/XY123";
const LINK_VOLI =
  "https://www.google.com/travel/flights?q=Voli%20da%20Aeroporto%20di%20Verona%20a%20Aeroporto%20di%20Roma%20Fiumicino%20il%202026-06-14";

/** Avvia lo scenario e restituisce la pagina della proposta e la proposta del motore. */
function proposta(idScenario: string) {
  const cartella = nuovaCartella();
  const avvio = avviaScenario(cartella, idScenario);
  if (!avvio.ok) throw new Error(avvio.messaggio);
  const stato = leggiStato(cartella);
  const markup = html(<ContenutoProposta esito={stato} id={avvio.proposta.id} azioni={AZIONI_PROPOSTA} ripristina={RIPRISTINA} />);
  if (!stato.ok) throw new Error(stato.motivo);
  return { markup, p: avvio.proposta.proposta, contesto: contestoProposta(avvio.proposta, stato.stato, catalogoDiRiferimento()) };
}

describe("CA-4 avviando S7 la proposta mostra D3-E9 a rischio e i due link, cliccabili", () => {
  it("CA-4 la proposta del motore ha D3-E9 a rischio, la gestione della prenotazione e la ricerca su Google Flights", () => {
    const { p } = proposta("S7");
    expect(p.elementiARischio).toEqual(["D3-E9"]);
    expect(p.alternative.map((a) => [a.tipo, a.elementoId, a.indirizzo])).toEqual([
      ["gestione_prenotazione", "D3-E9", LINK_GESTIONE],
      ["ricerca_voli", "D3-E9", LINK_VOLI],
    ]);
    expect(p.fattibile).toBe(true);
  });

  it("CA-4 la pagina evidenzia D3-E9 a rischio, nell'elenco e accanto all'elemento nel giorno", () => {
    const { markup } = proposta("S7");
    expect(valoriAttributo(markup, "data-a-rischio")).toEqual(["D3-E9"]);
    expect(frammento(markup, "data-a-rischio", "D3-E9", "</li>")).toContain("Aeroporto di Verona → Aeroporto di Roma Fiumicino");
    const riga = voceElemento(markup, "D3-E9");
    expect(riga).toContain("elemento--a-rischio");
    expect(riga).toContain("A rischio");
    // Gli altri elementi del giorno non sono a rischio.
    expect(voceElemento(markup, "D3-E8")).not.toContain("A rischio");
    expect(markup).toContain('data-modifiche="nessuna"');
  });

  it("CA-4 i due link si aprono nel browser, in una nuova scheda, solo su clic", () => {
    const { markup } = proposta("S7");
    expect(valoriAttributo(markup, "data-alternativa")).toEqual(["gestione_prenotazione", "ricerca_voli"]);
    const gestione = frammento(markup, "data-alternativa", "gestione_prenotazione", "</li>");
    expect(gestione).toContain(
      `<a href="${LINK_GESTIONE}" target="_blank" rel="noopener noreferrer" class="ui-pulsante ui-pulsante--secondario link-esterno"><span>Gestisci la prenotazione XY123 (Compagnia aerea di esempio)</span>`,
    );
    const voli = frammento(markup, "data-alternativa", "ricerca_voli", "</li>");
    expect(voli).toContain(`<a href="${comeHtml(LINK_VOLI)}" target="_blank" rel="noopener noreferrer" class="ui-pulsante ui-pulsante--secondario link-esterno">`);
    expect(voli).toContain("Cerca voli da Aeroporto di Verona a Aeroporto di Roma Fiumicino il 14 giugno 2026");
    // Ogni link esterno della pagina ha target e rel: le due alternative e il link di gestione di D3-E9 nel giorno.
    const esterni = [...markup.matchAll(/<a href="https:[^"]*"[^>]*>/g)].map((t) => t[0]);
    expect(esterni).toHaveLength(3);
    for (const a of esterni) expect(a).toContain('target="_blank" rel="noopener noreferrer"');
  });
});

describe("CA-5 avviando S6 o S8 la proposta è indicata come non fattibile e mostra i suoi problemi", () => {
  it.each([
    ["S6", [["FUORI_ORARIO", "D3-E2"], ["FUORI_ORARIO", "D3-E4"]], ["D3-E2", "D3-E4"]],
    ["S8", [["SOVRAPPOSIZIONE", "D3-E8 D3-E9"]], ["D3-E8", "D3-E9"]],
  ])("CA-5 %s: non fattibile, con i problemi e gli elementi a rischio del motore", (id, attesi, aRischio) => {
    const { markup, p, contesto } = proposta(id);
    expect(p.fattibile).toBe(false);
    expect(markup).toContain('data-esito="non-fattibile"');
    expect(markup).toContain("Esito: <strong>Non fattibile</strong>");

    // I problemi della pagina sono quelli del motore, con codice, gravità, elementi e messaggio.
    const bloccanti = p.problemi.filter((x) => x.gravita === "bloccante");
    expect(bloccanti.map((x) => [x.codice, x.elementi.join(" ")])).toEqual(attesi);
    expect(valoriAttributo(markup, "data-elementi")).toEqual(p.problemi.map((x) => x.elementi.join(" ")));
    for (const problema of p.problemi) {
      // REQ-UX-001 CA-6: il codice resta solo nell'attributo; a vista il problema e il messaggio in parole.
      expect(markup).toContain(`data-problema="${problema.codice}"`);
      expect(markup).toContain(TESTI_CODICI[problema.codice as CodiceMotore]);
      expect(markup).toContain(comeHtml(inParole(problema.messaggio, contesto)));
    }

    // Problemi e rischio sono segnalati anche accanto agli elementi coinvolti nel giorno.
    expect(valoriAttributo(markup, "data-a-rischio")).toEqual(aRischio);
    for (const elemento of aRischio) {
      const riga = voceElemento(markup, elemento);
      expect(riga).toContain("elemento--a-rischio");
      expect(riga).toContain('data-problema="');
    }
    // La spiegazione chiede al viaggiatore come procedere.
    expect(markup).toContain("Come vuoi procedere?");
  });

  it("CA-5 S8 mostra anche le alternative per il volo a rischio", () => {
    const { markup } = proposta("S8");
    expect(valoriAttributo(markup, "data-alternativa")).toEqual(["gestione_prenotazione", "ricerca_voli"]);
    expect(markup).toContain(`href="${LINK_GESTIONE}" target="_blank" rel="noopener noreferrer"`);
  });
});
