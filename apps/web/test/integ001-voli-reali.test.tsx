/**
 * TB-REAL-005 (ST-INTEG-001): con i voli reali la proposta di un volo cancellato non rimanda a un link segnaposto dei dati
 * di esempio e dice che l'esito è fattibile ma con elementi a rischio. Con i voli finti i link di esempio restano.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContenutoProposta } from "../src/componenti/ContenutiStato";
import { leggiStato } from "../src/stato/archivio";
import { avviaScenario } from "../src/stato/operazioni";
import { linkGestioneDaMostrare } from "../src/servizi/link-prenotazione";
import { html, valoriAttributo } from "./supporto";
import { AZIONI_PROPOSTA, nuovaCartella, RIPRISTINA } from "./supporto-stato";

const SEGNAPOSTO = "https://example.com/prenotazioni/XY123";

function paginaS7(): string {
  const cartella = nuovaCartella();
  const avvio = avviaScenario(cartella, "S7");
  if (!avvio.ok) throw new Error(avvio.messaggio);
  const stato = leggiStato(cartella);
  return html(<ContenutoProposta esito={stato} id={avvio.proposta.id} azioni={AZIONI_PROPOSTA} ripristina={RIPRISTINA} />);
}

afterEach(() => vi.unstubAllEnvs());

describe("TB-REAL-005 link segnaposto con i voli reali", () => {
  it("con TRAVELOPS_VOLI=reale la pagina non contiene il link segnaposto e resta la ricerca voli", () => {
    vi.stubEnv("TRAVELOPS_VOLI", "reale");
    const markup = paginaS7();
    expect(markup).not.toContain("example.com");
    expect(valoriAttributo(markup, "data-alternativa")).toEqual(["ricerca_voli"]);
    expect(markup).not.toContain("Gestisci prenotazione");
  });
  it("l'esito dice che ci sono elementi a rischio", () => {
    expect(paginaS7()).toContain("Esito: <strong>Fattibile, con elementi a rischio</strong>");
  });
  it("con i voli finti il link di esempio resta", () => {
    expect(paginaS7()).toContain(SEGNAPOSTO);
  });
  it("i domini segnaposto sono configurabili e un link vero non viene toccato", () => {
    expect(linkGestioneDaMostrare("https://compagnia.it/p/1", { TRAVELOPS_VOLI: "reale" })).toBe("https://compagnia.it/p/1");
    expect(linkGestioneDaMostrare("https://demo.test/p/1", { TRAVELOPS_VOLI: "reale", TRAVELOPS_DOMINI_SEGNAPOSTO: "demo.test" })).toBeNull();
    expect(linkGestioneDaMostrare(SEGNAPOSTO, { TRAVELOPS_VOLI: "finto" })).toBe(SEGNAPOSTO);
  });
});
