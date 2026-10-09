import { describe, expect, it } from "vitest";
import { ContenutoElemento } from "../src/componenti/Contenuti";
import { dettaglioElemento } from "../src/viste/elemento";
import { datiValidi, html } from "./supporto";

function campi(dettaglio: ReturnType<typeof dettaglioElemento>): Record<string, string> {
  return Object.fromEntries((dettaglio?.campi ?? []).map((campo) => [campo.etichetta, campo.valore]));
}

describe("dettaglio elemento", () => {
  it("un'attività ha tutti i campi e anche categoria, al coperto, durata tipica e orari di apertura del luogo", () => {
    const { viaggio, catalogo } = datiValidi("versione-1");
    const dettaglio = dettaglioElemento(viaggio, catalogo, "D3-E2");
    // REQ-UX-001 CA-6: niente id dell'elemento, dell'attività e dei luoghi nei campi mostrati.
    expect(campi(dettaglio)).toEqual({
      Tipo: "Attività",
      Giorno: "domenica 14 giugno 2026",
      Inizio: "10:00",
      Fine: "12:00",
      Attività: "Visita al Castello del Buonconsiglio",
      Priorità: "Desiderata",
      "Orario fisso": "No",
      Prenotazione: "Nessuna",
    });
    expect(dettaglio?.attivita).toEqual({
      attivitaId: "A-BUONCONSIGLIO",
      nome: "Visita al Castello del Buonconsiglio",
      categoria: "Cultura",
      ambiente: "Al coperto",
      durataTipica: "120 minuti (2 h)",
      luogo: { id: "BUONCONSIGLIO", nome: "Castello del Buonconsiglio", tipo: "Museo", zona: "Trento" },
      orariApertura: {
        sempre: false,
        settimana: [
          { giorno: "lunedì", fasce: [] },
          { giorno: "martedì", fasce: ["09:30–17:00"] },
          { giorno: "mercoledì", fasce: ["09:30–17:00"] },
          { giorno: "giovedì", fasce: ["09:30–17:00"] },
          { giorno: "venerdì", fasce: ["09:30–17:00"] },
          { giorno: "sabato", fasce: ["09:30–17:00"] },
          { giorno: "domenica", fasce: ["09:30–13:00"] },
        ],
      },
    });
  });

  it("un'attività all'aperto in un luogo sempre aperto", () => {
    const { viaggio, catalogo } = datiValidi("versione-1");
    const dettaglio = dettaglioElemento(viaggio, catalogo, "D2-E2");
    expect(dettaglio?.attivita).toMatchObject({ categoria: "Natura", ambiente: "All'aperto", durataTipica: "240 minuti (4 h)", orariApertura: { sempre: true } });
  });

  it("un ristorante con due fasce al giorno", () => {
    const { viaggio, catalogo } = datiValidi("versione-1");
    const orari = dettaglioElemento(viaggio, catalogo, "D2-E4")?.attivita?.orariApertura;
    expect(orari?.sempre === false ? orari.settimana[0] : null).toEqual({ giorno: "lunedì", fasce: ["12:00–14:30", "19:00–22:30"] });
  });

  it("uno spostamento ha partenza, arrivo, mezzo e, se c'è, la prenotazione", () => {
    const { viaggio, catalogo } = datiValidi("v-volo");
    const dettaglio = dettaglioElemento(viaggio, catalogo, "D3-E9");
    expect(campi(dettaglio)).toEqual({
      Tipo: "Spostamento",
      Giorno: "domenica 14 giugno 2026",
      Inizio: "19:30",
      Fine: "20:35",
      Partenza: "Aeroporto di Verona",
      Arrivo: "Aeroporto di Roma Fiumicino",
      Mezzo: "Volo",
      "Orario fisso": "Sì",
      Fornitore: "Compagnia aerea di esempio",
      "Codice di prenotazione": "XY123",
      "Link di gestione": "https://example.com/prenotazioni/XY123",
    });
    expect(dettaglio?.attivita).toBeNull();
  });

  it("la pagina del dettaglio mostra i dati del catalogo e gli orari di apertura", () => {
    const markup = html(<ContenutoElemento chiave="versione-1" esito={datiValidi("versione-1")} id="D3-E6" />);
    expect(markup).toContain("Visita al MUSE");
    expect(markup).toContain("Attività del catalogo");
    expect(markup).toContain("Al coperto");
    expect(markup).toContain("150 minuti (2 h 30 min)");
    expect(markup).toContain("Orari di apertura del luogo");
    expect(markup).toMatch(/<th scope="row">lunedì<\/th><td>Chiuso<\/td>/);
    expect(markup).toContain('href="/viaggi/versione-1/giorni/2026-06-14"');
  });

  it("un elemento che non esiste non ha dettaglio", () => {
    const { viaggio, catalogo } = datiValidi("versione-1");
    expect(dettaglioElemento(viaggio, catalogo, "D3-E9")).toBeNull();
    expect(html(<ContenutoElemento chiave="versione-1" esito={datiValidi("versione-1")} id="D3-E9" />)).toContain("Non trovato");
  });
});
