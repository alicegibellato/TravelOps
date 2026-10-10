// @vitest-environment jsdom
/**
 * ST-CAT-002-FIX-TB-NEW-D9 (testbook TB-NEW-D9): i risultati della ricerca della destinazione hanno nomi accessibili
 * distinti. Il difetto: tre pulsanti «Trento» (uno nelle Filippine) con lo stesso nome accessibile, perché la descrizione
 * stava fuori dal pulsante. Nessuna rete: il servizio è finto.
 */
import { describe, expect, it } from "vitest";
import { nomeAccessibileDestinazione, SceltaDestinazione } from "../src/componenti/SceltaDestinazione";
import type { Suggerimento } from "../src/destinazioni/tipi";
import { attendi, clic, monta, preparaChat, pulsante } from "./supporto-chat";
import { MESI_DI_PROVA, scriviNelCampo } from "./supporto-destinazioni";

preparaChat();

const centro = { lat: 46.07, lon: 11.12 };
const TRENTI: Suggerimento[] = [
  { id: "osm:relation/45756", nome: "Trento", descrizione: "Trento, Territorio Val d'Adige, Provincia di Trento, Trentino-Alto Adige, Italia", centro },
  { id: "osm:relation/46663", nome: "Trento", descrizione: "Provincia di Trento, Trentino-Alto Adige, Italia", centro },
  { id: "osm:relation/3870471", nome: "Trento", descrizione: "Agusan del Sur, Caraga, Filippine", centro },
];

const nomiDeiRisultati = (vista: HTMLElement): string[] =>
  [...vista.querySelectorAll<HTMLButtonElement>("ul[aria-label='Destinazioni trovate'] button")].map((b) => b.getAttribute("aria-label") ?? b.textContent ?? "");

describe("TB-NEW-D9: nomi accessibili dei risultati della ricerca", () => {
  it("tre «Trento» hanno nomi accessibili distinti, che iniziano con il testo visibile", async () => {
    const vista = monta(
      <SceltaDestinazione
        servizio={{ cerca: () => Promise.resolve(TRENTI), costruisci: () => new Promise(() => undefined), sorprendimi: () => Promise.reject(new Error("non serve")) }}
        mesi={MESI_DI_PROVA}
      />,
    );
    scriviNelCampo(vista, "Trento");
    await attendi(400);
    const nomi = nomiDeiRisultati(vista);
    expect(nomi).toHaveLength(3);
    expect(new Set(nomi).size).toBe(3);
    for (const nome of nomi) expect(nome.startsWith("Trento")).toBe(true);
    expect(nomi[2]).toBe("Trento, Agusan del Sur, Caraga, Filippine");
    // il testo visibile del pulsante resta il nome; la descrizione visibile non viene letta due volte
    expect([...vista.querySelectorAll("ul[aria-label='Destinazioni trovate'] button")].map((b) => b.textContent)).toEqual(["Trento", "Trento", "Trento"]);
    expect([...vista.querySelectorAll(".scelta-destinazione__descrizione")].every((s) => s.getAttribute("aria-hidden") === "true")).toBe(true);
    clic(pulsante(vista, "Trento"));
    await attendi();
    expect(vista.textContent).toContain("Sto preparando Trento");
  });

  it("nome accessibile: descrizione che ripete il nome, descrizione diversa, descrizione vuota", () => {
    expect(nomeAccessibileDestinazione(TRENTI[0] as Suggerimento)).toBe(TRENTI[0]?.descrizione);
    expect(nomeAccessibileDestinazione({ nome: "Roma", descrizione: "Lazio, Italia" })).toBe("Roma, Lazio, Italia");
    expect(nomeAccessibileDestinazione({ nome: "Roma", descrizione: " " })).toBe("Roma");
  });
});
