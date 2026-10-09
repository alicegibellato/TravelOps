import { describe, expect, it } from "vitest";
import { ContenutoElemento, ContenutoGiorno } from "../src/componenti/Contenuti";
import { vistaGiorno } from "../src/viste/giorno";
import { datiValidi, html, rigaElemento } from "./supporto";

const LINK_GESTIONE = "https://example.com/prenotazioni/XY123";

describe("CA-4 variante V-VOLO, 2026-06-14", () => {
  it("CA-4 la vista giorno ha D3-E9 a orario fisso, con il codice XY123 e il link di gestione", () => {
    const { viaggio, catalogo } = datiValidi("v-volo");
    const volo = vistaGiorno(viaggio, catalogo, "2026-06-14")?.elementi.find((riga) => riga.id === "D3-E9");
    expect(volo).toMatchObject({
      tipo: "spostamento",
      inizio: "19:30",
      fine: "20:35",
      mezzo: "Volo",
      descrizione: "Aeroporto di Verona → Aeroporto di Roma Fiumicino",
      orarioFisso: true,
      prenotazione: { fornitore: "Compagnia aerea di esempio", codice: "XY123", linkGestione: LINK_GESTIONE },
    });
  });

  it("CA-4 la pagina del giorno mostra D3-E9 a orario fisso, il codice XY123 e il link di gestione", () => {
    const markup = html(<ContenutoGiorno chiave="v-volo" esito={datiValidi("v-volo")} data="2026-06-14" />);
    const riga = rigaElemento(markup, "D3-E9");
    expect(riga).toContain('<span class="etichetta etichetta--fisso">Sì</span>');
    expect(riga).toContain("XY123");
    expect(riga).toContain(`href="${LINK_GESTIONE}"`);
    expect(riga).toContain("Gestisci la prenotazione");
    // Gli altri elementi del giorno non sono a orario fisso e non hanno prenotazione.
    expect(rigaElemento(markup, "D3-E8")).not.toContain("etichetta--fisso");
    expect(rigaElemento(markup, "D3-E8")).not.toContain("Gestisci la prenotazione");
  });

  it("CA-4 il dettaglio di D3-E9 riporta fornitore, codice, link di gestione e orario fisso", () => {
    const markup = html(<ContenutoElemento chiave="v-volo" esito={datiValidi("v-volo")} id="D3-E9" />);
    expect(markup).toContain("Compagnia aerea di esempio");
    expect(markup).toContain("XY123");
    expect(markup).toContain(`href="${LINK_GESTIONE}"`);
    expect(markup).toMatch(/<dt>Orario fisso<\/dt><dd>Sì<\/dd>/);
  });

  it("senza la variante V-VOLO il giorno non ha D3-E9", () => {
    const { viaggio, catalogo } = datiValidi("versione-1");
    expect(vistaGiorno(viaggio, catalogo, "2026-06-14")?.elementi.map((riga) => riga.id)).not.toContain("D3-E9");
  });
});

describe("scelta del viaggio: le varianti V-IRR e V-FISSO", () => {
  it("con V-IRR il castello (D3-E2) è irrinunciabile", () => {
    const { viaggio, catalogo } = datiValidi("v-irr");
    const castello = vistaGiorno(viaggio, catalogo, "2026-06-14")?.elementi.find((riga) => riga.id === "D3-E2");
    expect(castello?.priorita).toBe("Irrinunciabile");
  });

  it("con V-FISSO il pranzo sul lago (D2-E4) è a orario fisso", () => {
    const { viaggio, catalogo } = datiValidi("v-fisso");
    const pranzo = vistaGiorno(viaggio, catalogo, "2026-06-13")?.elementi.find((riga) => riga.id === "D2-E4");
    expect(pranzo?.orarioFisso).toBe(true);
    const markup = html(<ContenutoGiorno chiave="v-fisso" esito={datiValidi("v-fisso")} data="2026-06-13" />);
    expect(rigaElemento(markup, "D2-E4")).toContain("etichetta--fisso");
  });

  it("la scelta del viaggio offre versione 1, V-IRR, V-FISSO, V-VOLO e porta allo stesso giorno", () => {
    const markup = html(<ContenutoGiorno chiave="v-irr" esito={datiValidi("v-irr")} data="2026-06-14" />);
    const scelta = markup.slice(markup.indexOf('aria-label="Scelta del viaggio"'), markup.indexOf("</nav>"));
    expect([...scelta.matchAll(/href="([^"]*)"/g)].map((trovato) => trovato[1])).toEqual([
      "/viaggi/versione-1/giorni/2026-06-14",
      "/viaggi/v-irr/giorni/2026-06-14",
      "/viaggi/v-fisso/giorni/2026-06-14",
      "/viaggi/v-volo/giorni/2026-06-14",
    ]);
    expect(scelta).toContain('aria-current="page"');
  });
});
