import { describe, expect, it } from "vitest";
import { ContenutoGiorno, ContenutoViaggio } from "../src/componenti/Contenuti";
import { vistaGiorno } from "../src/viste/giorno";
import { vistaViaggio } from "../src/viste/viaggio";
import { datiValidi, html, valoriAttributo, voceElemento } from "./supporto";

/** Elementi del 2026-06-13 nella versione 1 (dati-di-riferimento.md §4, giorno 2). */
const GIORNO_2 = [
  { id: "D2-E1", inizio: "08:40", fine: "09:00", tipo: "spostamento", descrizione: "Hotel sul lago, Riva del Garda → Sentiero del Ponale, partenza", mezzo: "A piedi" },
  { id: "D2-E2", inizio: "09:00", fine: "13:00", tipo: "attivita", descrizione: "Trekking sul Sentiero del Ponale", mezzo: null },
  { id: "D2-E3", inizio: "13:00", fine: "13:20", tipo: "spostamento", descrizione: "Sentiero del Ponale, partenza → Ristorante sul lago", mezzo: "A piedi" },
  { id: "D2-E4", inizio: "13:20", fine: "14:30", tipo: "attivita", descrizione: "Pranzo sul lago", mezzo: null },
  { id: "D2-E5", inizio: "14:30", fine: "14:35", tipo: "spostamento", descrizione: "Ristorante sul lago → Hotel sul lago, Riva del Garda", mezzo: "A piedi" },
];

describe("CA-2 vista giorno del 2026-06-13", () => {
  it("CA-2 i dati della vista hanno D2-E1…D2-E5 in ordine, con gli orari dei dati di riferimento", () => {
    const { viaggio, catalogo } = datiValidi("versione-1");
    const vista = vistaGiorno(viaggio, catalogo, "2026-06-13");
    expect(vista).not.toBeNull();
    expect(vista?.elementi.map((riga) => ({ id: riga.id, inizio: riga.inizio, fine: riga.fine }))).toEqual(
      GIORNO_2.map(({ id, inizio, fine }) => ({ id, inizio, fine })),
    );
    expect(vista?.elementi.map((riga) => riga.posizione)).toEqual([1, 2, 3, 4, 5]);
  });

  it("CA-2 ogni riga ha tipo, attività o tratta, mezzo, priorità, orario fisso e prenotazione", () => {
    const { viaggio, catalogo } = datiValidi("versione-1");
    const vista = vistaGiorno(viaggio, catalogo, "2026-06-13");
    expect(
      vista?.elementi.map(({ id, tipo, descrizione, mezzo }) => ({ id, tipo, descrizione, mezzo })),
    ).toEqual(GIORNO_2.map(({ id, tipo, descrizione, mezzo }) => ({ id, tipo, descrizione, mezzo })));
    for (const riga of vista?.elementi ?? []) {
      expect(riga.priorita).toBe(riga.tipo === "attivita" ? "Desiderata" : null);
      expect(riga.orarioFisso).toBe(false);
      expect(riga.prenotazione).toBeNull();
    }
    expect(vista?.luogoPartenza.id).toBe("HOTEL");
    expect(vista?.alloggio?.id).toBe("HOTEL");
  });

  it("CA-2 la pagina del giorno mostra D2-E1…D2-E5 in ordine, ciascuno con il suo orario", () => {
    const markup = html(<ContenutoGiorno chiave="versione-1" esito={datiValidi("versione-1")} data="2026-06-13" />);
    const inizioLinea = markup.indexOf('aria-label="Programma del giorno"');
    const linea = markup.slice(inizioLinea, markup.indexOf("</ol>", inizioLinea));
    expect(valoriAttributo(linea, "data-elemento")).toEqual(["D2-E1", "D2-E2", "D2-E3", "D2-E4", "D2-E5"]);
    for (const atteso of GIORNO_2) {
      const voce = voceElemento(markup, atteso.id);
      expect(voce).toContain(`<time class="ui-linea-tempo__ora">${atteso.inizio}</time>`);
      expect(voce).toContain(`${atteso.inizio}–${atteso.fine}`);
      // Le attività sono schede, gli spostamenti connettori con il mezzo.
      expect(voce).toContain(atteso.tipo === "attivita" ? "ui-scheda-attivita" : "ui-linea-tempo__connettore");
      if (atteso.mezzo !== null) expect(voce).toContain(atteso.mezzo);
      expect(voce).toContain(`/viaggi/versione-1/elementi/${atteso.id}`);
    }
    expect(markup).toContain("Giorno 2");
    expect(markup).toContain("sabato 13 giugno 2026");
  });
});

describe("vista viaggio", () => {
  it("titolo, date e, per ogni giorno, luogo di partenza, alloggio e numero di elementi", () => {
    const { viaggio, catalogo } = datiValidi("versione-1");
    const vista = vistaViaggio(viaggio, catalogo);
    expect(vista.titolo).toBe("Weekend sul Garda");
    expect([vista.dataInizio, vista.dataFine]).toEqual(["2026-06-12", "2026-06-14"]);
    expect([vista.dataInizioEstesa, vista.dataFineEstesa]).toEqual(["venerdì 12 giugno 2026", "domenica 14 giugno 2026"]);
    expect(
      vista.giorni.map((giorno) => ({
        data: giorno.data,
        partenza: giorno.luogoPartenza.id,
        alloggio: giorno.alloggio?.id ?? null,
        elementi: giorno.numeroElementi,
      })),
    ).toEqual([
      { data: "2026-06-12", partenza: "HOTEL", alloggio: "HOTEL", elementi: 3 },
      { data: "2026-06-13", partenza: "HOTEL", alloggio: "HOTEL", elementi: 5 },
      { data: "2026-06-14", partenza: "HOTEL", alloggio: null, elementi: 7 },
    ]);
  });

  it("la pagina del viaggio mostra titolo, date e i tre giorni con i link alla vista giorno", () => {
    const markup = html(<ContenutoViaggio chiave="versione-1" esito={datiValidi("versione-1")} />);
    expect(markup).toContain("Weekend sul Garda");
    expect(markup).toContain("venerdì 12 giugno 2026");
    expect(valoriAttributo(markup, "data-data")).toEqual(["2026-06-12", "2026-06-13", "2026-06-14"]);
    expect(markup).toContain('href="/viaggi/versione-1/giorni/2026-06-13"');
    expect(markup).toContain("Hotel sul lago, Riva del Garda");
    expect(markup).toContain("Nessuno (fine del viaggio)");
  });

  it("con V-VOLO l'ultimo giorno ha 9 elementi", () => {
    const { viaggio, catalogo } = datiValidi("v-volo");
    expect(vistaViaggio(viaggio, catalogo).giorni.map((giorno) => giorno.numeroElementi)).toEqual([3, 5, 9]);
  });
});
