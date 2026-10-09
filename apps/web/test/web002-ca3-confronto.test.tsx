import { confrontaVersioni } from "@travelops/engine";
import { describe, expect, it } from "vitest";
import { ContenutoVersioni } from "../src/componenti/ContenutiStato";
import { catalogoDiRiferimento } from "../src/dati/scenari";
import { leggiStato } from "../src/stato/archivio";
import { accettaProposta, avviaScenario, impostaOrologio } from "../src/stato/operazioni";
import { vistaVersioni } from "../src/viste/versioni";
import { html, valoriAttributo } from "./supporto";
import { frammento, nuovaCartella, RIPRISTINA, statoSalvato } from "./supporto-stato";

/** S1 accettato da "Alice" il 2026-06-13 alle 07:30 (CA-2). */
function dopoCA2(): string {
  const cartella = nuovaCartella();
  avviaScenario(cartella, "S1");
  impostaOrologio(cartella, "2026-06-13", "07:30");
  accettaProposta(cartella, 1, "Alice");
  return cartella;
}

describe("CA-3 il confronto tra le versioni 1 e 2 mostra le differenze di REQ-ITIN-002 CA-3", () => {
  it("CA-3 modificati D2-E1 (arrivo e orario) e D2-E3 (partenza e orario), rimosso D2-E2, aggiunto N1 con A-MAG; nient'altro", () => {
    const stato = statoSalvato(dopoCA2());
    const vista = vistaVersioni(stato, catalogoDiRiferimento(), 1, 2);
    const c = vista.confronto;
    expect(vista.erroreConfronto).toBeNull();
    expect(c?.aggiunti.map((e) => [e.id, e.data, e.orario, e.descrizione])).toEqual([["N1", "2026-06-13", "10:00–12:00", "Visita al MAG"]]);
    expect(c?.rimossi.map((e) => [e.id, e.data, e.orario, e.descrizione])).toEqual([
      ["D2-E2", "2026-06-13", "09:00–13:00", "Trekking sul Sentiero del Ponale"],
    ]);
    expect(c?.modificati.map((m) => [m.id, m.campi.map((x) => [x.campo, x.prima, x.dopo])])).toEqual([
      [
        "D2-E1",
        [
          ["inizio", "08:40", "09:50"],
          ["fine", "09:00", "10:00"],
          ["a", "Sentiero del Ponale, partenza", "MAG Museo Alto Garda"],
        ],
      ],
      [
        "D2-E3",
        [
          ["inizio", "13:00", "12:00"],
          ["fine", "13:20", "12:05"],
          ["da", "Sentiero del Ponale, partenza", "MAG Museo Alto Garda"],
        ],
      ],
    ]);
  });

  it("CA-3 le differenze mostrate sono quelle del motore (confrontaVersioni), una per una", () => {
    const stato = statoSalvato(dopoCA2());
    const motore = confrontaVersioni(stato.storico, 1, 2);
    if (!motore.ok) throw new Error(motore.errore.messaggio);
    const c = vistaVersioni(stato, catalogoDiRiferimento(), 1, 2).confronto;
    expect(c?.aggiunti.map((e) => e.id)).toEqual(motore.confronto.aggiunti.map((d) => d.elemento.id));
    expect(c?.rimossi.map((e) => e.id)).toEqual(motore.confronto.rimossi.map((d) => d.elemento.id));
    expect(c?.modificati.map((m) => [m.id, m.campi.map((x) => x.campo)])).toEqual(
      motore.confronto.modificati.map((m) => [m.id, m.campi.map((x) => x.campo)]),
    );
  });

  it("CA-3 la pagina Versioni elenca, in cronologia, numero, momento, causa e autore e mostra il confronto 1 → 2", () => {
    const markup = html(<ContenutoVersioni esito={leggiStato(dopoCA2())} a={1} b={2} ripristina={RIPRISTINA} />);
    expect(valoriAttributo(markup, "data-versione")).toEqual(["1", "2"]);
    const v1 = frammento(markup, "data-versione", "1", "</li>");
    expect(v1).toContain("Itinerario iniziale");
    const v2 = frammento(markup, "data-versione", "2", "</li>");
    expect(v2).toContain("sabato 13 giugno 2026 alle 07:30");
    // REQ-UX-001 CA-6: la causa del motore in parole (nome della zona, data estesa).
    expect(v2).toContain("Meteo avverso: pioggia in zona Alto Garda il 13 giugno 2026 08:00–13:00");
    expect(v2).toContain("<strong>Alice</strong>");
    expect(v2).toContain("Corrente");

    expect(markup).toContain('data-confronto="1-2"');
    expect(valoriAttributo(markup, "data-aggiunto")).toEqual(["N1"]);
    expect(valoriAttributo(markup, "data-rimosso")).toEqual(["D2-E2"]);
    expect(valoriAttributo(markup, "data-modificato")).toEqual(["D2-E1", "D2-E1", "D2-E1", "D2-E3", "D2-E3", "D2-E3"]);
    expect(valoriAttributo(markup, "data-campo")).toEqual(["inizio", "fine", "a", "inizio", "fine", "da"]);
    expect(frammento(markup, "data-campo", "a", "</tr>")).toMatch(/>Sentiero del Ponale, partenza<\/td><td[^>]*>MAG Museo Alto Garda<\/td>/);
  });

  it("senza parametri confronta la versione precedente con la corrente; una versione inesistente dà il messaggio del motore", () => {
    const stato = statoSalvato(dopoCA2());
    expect(vistaVersioni(stato, catalogoDiRiferimento()).confronto?.a).toBe(1);
    const fuori = vistaVersioni(stato, catalogoDiRiferimento(), 1, 5);
    expect(fuori.confronto).toBeNull();
    // Il messaggio del motore, con il codice messo in parole (REQ-UX-001 CA-6).
    expect(fuori.erroreConfronto).toMatch(/^Questa versione non esiste: /);
  });
});
