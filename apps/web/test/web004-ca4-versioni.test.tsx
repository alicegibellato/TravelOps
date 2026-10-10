/**
 * REQ-WEB-004 CA-4: le versioni sono una cronologia con data, causa in parole semplici e il pulsante Confronta.
 */
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { ContenutoVersioni } from "../src/componenti/ContenutiStato";
import { leggiStato } from "../src/stato/archivio";
import { accettaProposta, avviaScenario, impostaOrologio } from "../src/stato/operazioni";
import { html } from "./supporto";
import { nuovaCartella, RIPRISTINA } from "./supporto-stato";

function paginaVersioni(): Document {
  const cartella = nuovaCartella();
  avviaScenario(cartella, "S1");
  impostaOrologio(cartella, "2026-06-13", "07:30");
  accettaProposta(cartella, 1, "Alice");
  return new JSDOM(html(<ContenutoVersioni esito={leggiStato(cartella)} a={null} b={null} ripristina={RIPRISTINA} />)).window.document;
}

describe("CA-4 le versioni sono una cronologia con data, causa e Confronta", () => {
  it("CA-4 una lista ordinata di versioni, non una tabella, con data e causa in parole", () => {
    const d = paginaVersioni();
    const cronologia = d.querySelector("ol.ui-cronologia");
    expect(cronologia?.getAttribute("aria-label")).toBe("Cronologia delle versioni");
    const voci = [...(cronologia?.querySelectorAll("li[data-versione]") ?? [])];
    expect(voci.map((v) => v.getAttribute("data-versione"))).toEqual(["1", "2"]);
    expect(voci[0]?.textContent).toContain("Itinerario iniziale");
    expect(voci[1]?.querySelector(".ui-cronologia__quando")?.textContent).toBe("sabato 13 giugno 2026 alle 07:30");
    expect(voci[1]?.textContent).toContain("Meteo avverso: pioggia in zona Alto Garda il 13 giugno 2026 08:00–13:00");
    expect(voci[1]?.textContent).toContain("Corrente");
    expect(cronologia?.querySelector("table")).toBeNull();
  });

  it("CA-4 ogni versione dopo la prima ha il pulsante Confronta con la precedente", () => {
    const d = paginaVersioni();
    const voci = [...d.querySelectorAll("li[data-versione]")];
    expect(voci[0]?.querySelector("a.ui-pulsante")).toBeNull();
    const confronta = voci[1]?.querySelector<HTMLAnchorElement>("a.ui-pulsante");
    expect(confronta?.textContent).toBe("Confronta");
    expect(confronta?.getAttribute("href")).toBe("/versioni?a=1&b=2");
    expect(confronta?.getAttribute("aria-label")).toBe("Confronta la versione 2 con la 1");
  });

  it("CA-4 con Confronta si vede il confronto tra le due versioni", () => {
    const cartella = nuovaCartella();
    avviaScenario(cartella, "S1");
    accettaProposta(cartella, 1, "Alice");
    const d = new JSDOM(html(<ContenutoVersioni esito={leggiStato(cartella)} a={1} b={2} ripristina={RIPRISTINA} />)).window.document;
    expect(d.querySelector("[data-confronto='1-2']")).not.toBeNull();
    expect(d.querySelector("[data-aggiunto='N1']")?.className).toContain("ui-proposta__cambio--aggiunto");
    expect(d.querySelector("[data-rimosso='D2-E2']")?.className).toContain("ui-proposta__cambio--rimosso");
    expect([...d.querySelectorAll("button")].some((b) => b.textContent === "Confronta")).toBe(true);
  });
});
