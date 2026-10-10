/**
 * ST-TODAY-001, CA-1 di REQ-TODAY-001: con l'orologio simulato al 2026-06-13 alle 10:30 su TRIP-DEMO-GARDA, le schede
 * "Adesso" e "Dopo" sono corrette. Il programma del 13 giugno (bozza del motore con PR-1, vedi `supporto-oggi.ts`):
 * D2-E1 spostamento in auto 11:55–12:00, D2-E2 attività 12:00–13:15, D2-E3 spostamento in auto 13:15–14:25,
 * D2-E4 attività 14:25–14:55, …
 */
import type { ElementoAttivita } from "@travelops/engine";
import { describe, expect, it } from "vitest";
import { PannelloOggi } from "../src/componenti/PannelloOggi";
import { vistaOggi, viaggioInCorso, type VistaOggi } from "../src/oggi/vista";
import { html } from "./supporto";
import { comeHtml, frammento } from "./supporto-stato";
import { nomeAttivitaGarda, viaggioDemoGarda } from "./supporto-oggi";

const garda = viaggioDemoGarda();
const giorno = garda.viaggio.giorni.find((g) => g.data === "2026-06-13");
const nessuna = (): void => undefined;

function inCorso(ora: string, data = "2026-06-13"): Extract<VistaOggi, { fase: "in_corso" }> {
  const vista = vistaOggi(garda.viaggio, garda.catalogo, { data, ora });
  if (vista.fase !== "in_corso") throw new Error(`il viaggio non è in corso il ${data} alle ${ora}`);
  return vista;
}

function nomeElemento(id: string): string {
  const elemento = giorno?.elementi.find((e) => e.id === id) as ElementoAttivita | undefined;
  if (elemento === undefined) throw new Error(`elemento ${id} assente`);
  return nomeAttivitaGarda(garda.istantanea, elemento.attivitaId);
}

describe("CA-1 orologio simulato al 2026-06-13 alle 10:30 su TRIP-DEMO-GARDA", () => {
  it("CA-1 il programma del giorno è quello atteso dal motore (TRIP-DEMO-GARDA, PR-1 sull'istantanea del Garda)", () => {
    expect(garda.viaggio.id).toBe("TRIP-DEMO-GARDA");
    expect(giorno?.elementi.slice(0, 3).map((e) => [e.id, e.tipo, e.inizio, e.fine])).toEqual([
      ["D2-E1", "spostamento", "11:55", "12:00"],
      ["D2-E2", "attivita", "12:00", "13:15"],
      ["D2-E3", "spostamento", "13:15", "14:25"],
    ]);
    expect(viaggioInCorso(garda.viaggio, { data: "2026-06-13", ora: "10:30" })).toBe(true);
  });

  it("CA-1 Adesso: niente in programma fino alle 11:55 (1 ora e 25 minuti), posizione prevista il luogo di partenza del giorno", () => {
    const { adesso } = inCorso("10:30");
    expect(adesso.elemento).toBeNull();
    expect(adesso.fino).toBe("11:55");
    expect(adesso.minutiRimanenti).toBe(85);
    expect(adesso.posizione.inViaggio).toBe(false);
    expect(adesso.posizione.luogo.id).toBe(giorno?.luogoPartenza);
  });

  it("CA-1 Dopo: la prossima attività D2-E2 alle 12:00, partenza alle 11:55 in auto, tra 85 minuti", () => {
    const { dopo } = inCorso("10:30");
    expect(dopo?.elemento.id).toBe("D2-E2");
    expect(dopo?.elemento.inizio).toBe("12:00");
    expect(dopo?.elemento.descrizione).toBe(nomeElemento("D2-E2"));
    expect(dopo?.partenza).toBe("11:55");
    expect(dopo?.minutiAllaPartenza).toBe(85);
    expect(dopo?.mezzo).toBe("Auto");
  });

  it("CA-1 le schede mostrano in parole Adesso e Dopo, senza codici", () => {
    const markup = html(<PannelloOggi chiave="versione-1" vista={inCorso("10:30")} azioni={{ segnalaRitardo: nessuna }} />);
    const adesso = frammento(markup, "data-scheda", "adesso", "</section>");
    const dopo = frammento(markup, "data-scheda", "dopo", "</section>");
    expect(markup).toContain('data-momento="2026-06-13 10:30"');
    expect(markup).toContain("sabato 13 giugno 2026 alle 10:30");
    expect(adesso).toContain(comeHtml("Niente in programma fino alle 11:55: hai 1 ora e 25 minuti liberi."));
    expect(adesso).toContain("Posizione prevista:");
    expect(dopo).toContain('data-elemento="D2-E2"');
    expect(dopo).toContain(comeHtml(nomeElemento("D2-E2")));
    expect(dopo).toContain(comeHtml("Parti alle 11:55 (auto), tra 1 ora e 25 minuti."));
    // Il testo a vista è in parole: nessun identificativo del catalogo o dell'itinerario, nessun codice del motore.
    expect(markup.replace(/<[^>]*>/g, " ")).not.toMatch(/OSM-NODE|D\d+-E\d+|RITARDO/);
  });
});

describe("CA-1 Adesso e Dopo in altri momenti dello stesso giorno", () => {
  it("CA-1 alle 12:30 Adesso è l'attività D2-E2 (mancano 45 minuti) e Dopo è D2-E4 con partenza alle 13:15", () => {
    const { adesso, dopo } = inCorso("12:30");
    expect([adesso.elemento?.id, adesso.fino, adesso.minutiRimanenti]).toEqual(["D2-E2", "13:15", 45]);
    expect([dopo?.elemento.id, dopo?.partenza, dopo?.minutiAllaPartenza]).toEqual(["D2-E4", "13:15", 45]);
  });

  it("CA-1 alle 13:30, durante lo spostamento, Adesso è il viaggio verso l'attività e Dopo dice quando si arriva", () => {
    const { adesso, dopo } = inCorso("13:30");
    expect(adesso.elemento?.id).toBe("D2-E3");
    expect(adesso.posizione.inViaggio).toBe(true);
    expect([dopo?.elemento.id, dopo?.partenza, dopo?.minutiAllaPartenza]).toEqual(["D2-E4", null, 55]);
  });

  it("CA-1 dopo l'ultimo elemento del giorno non c'è più niente: «Per oggi è tutto»", () => {
    const vista = inCorso("23:00");
    expect([vista.adesso.elemento, vista.adesso.fino, vista.dopo]).toEqual([null, null, null]);
    expect(html(<PannelloOggi chiave="versione-1" vista={vista} azioni={{ segnalaRitardo: nessuna }} />)).toContain("Per oggi è tutto");
  });
});

describe("CA-1 fuori dal viaggio: conto alla rovescia o riepilogo", () => {
  it("CA-1 prima della partenza: quanti giorni mancano", () => {
    const vista = vistaOggi(garda.viaggio, garda.catalogo, { data: "2026-06-10", ora: "09:00" });
    expect(vista.fase).toBe("prima");
    if (vista.fase === "prima") expect(vista.giorniAllaPartenza).toBe(2);
    expect(html(<PannelloOggi chiave="versione-1" vista={vista} azioni={{ segnalaRitardo: nessuna }} />)).toContain("Mancano 2 giorni");
  });

  it("CA-1 dopo il ritorno: il riepilogo del viaggio concluso", () => {
    const vista = vistaOggi(garda.viaggio, garda.catalogo, { data: "2026-06-16", ora: "09:00" });
    expect(vista.fase).toBe("concluso");
    if (vista.fase === "concluso") expect([vista.dataFine, vista.numeroGiorni]).toEqual(["2026-06-15", 4]);
    expect(viaggioInCorso(garda.viaggio, { data: "2026-06-16", ora: "09:00" })).toBe(false);
  });
});
