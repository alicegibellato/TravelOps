/**
 * REQ-WEB-003 CA-2: la vista giorno è una linea del tempo. Le attività sono schede (immagine, nome, orario, durata, stile
 * colorato, costo, all'aperto o al coperto), gli spostamenti sono connettori con l'icona del mezzo e la durata.
 */
import { describe, expect, it } from "vitest";
import { ContenutoGiorno, ContenutoViaggio } from "../src/componenti/Contenuti";
import { datiVariante, datiValidi, html, jsonCatalogo, jsonViaggio, valoriAttributo, voceElemento, type Grezzo } from "./supporto";

const giorno2 = () => html(<ContenutoGiorno chiave="versione-1" esito={datiValidi("versione-1")} data="2026-06-13" />);

describe("CA-2 la vista giorno è una linea del tempo di schede e connettori", () => {
  it("CA-2 il giorno non è più una tabella: è una lista ordinata con attività e spostamenti nell'ordine dell'itinerario", () => {
    const markup = giorno2();
    expect(markup).not.toContain("<table");
    const inizio = markup.indexOf('<ol class="ui-linea-tempo"');
    expect(inizio).toBeGreaterThan(-1);
    const linea = markup.slice(inizio, markup.indexOf("</ol>", inizio));
    expect(valoriAttributo(linea, "data-elemento")).toEqual(["D2-E1", "D2-E2", "D2-E3", "D2-E4", "D2-E5"]);
    expect((linea.match(/<article class="ui-scheda-attivita"/g) ?? []).length).toBe(2);
    expect((linea.match(/ui-linea-tempo__connettore/g) ?? []).length).toBe(3);
  });

  it("CA-2 la scheda del trekking ha immagine, nome, orario, durata, stile colorato e all'aperto", () => {
    const scheda = voceElemento(giorno2(), "D2-E2");
    expect(scheda).toContain("ui-illustrazione");
    expect(scheda).toContain("Trekking sul Sentiero del Ponale");
    expect(scheda).toContain("09:00–13:00");
    // Durata tipica dell'attività nel catalogo (240 minuti).
    expect(scheda).toContain("<span>4 h</span>");
    expect(scheda).toContain('class="ui-badge ui-badge--stile" data-stile="natura">Natura</span>');
    expect(scheda).toContain("All&#x27;aperto");
  });

  it("CA-2 la scheda del pranzo è dello stile gastronomia e al coperto o all'aperto secondo il catalogo", () => {
    const scheda = voceElemento(giorno2(), "D2-E4");
    expect(scheda).toContain('data-stile="gastronomia"');
    expect(scheda).toContain("Pranzo sul lago");
    expect(scheda).toMatch(/All&#x27;aperto|Al coperto/);
  });

  it("CA-2 il costo si mostra solo se i dati lo hanno: assente nei dati di riferimento, presente se il catalogo lo indica", () => {
    expect(voceElemento(giorno2(), "D2-E2")).not.toContain("lucide-euro");
    const catalogo: Grezzo = jsonCatalogo();
    catalogo.attivita.find((a: Grezzo) => a.id === "A-PONALE").costo = "gratis";
    catalogo.attivita.find((a: Grezzo) => a.id === "A-PRANZO-RIVA").costo = "€€";
    const esito = datiVariante(jsonViaggio("versione-1"), catalogo);
    if (!esito.ok) throw new Error("la variante deve essere valida");
    const markup = html(<ContenutoGiorno chiave="versione-1" esito={esito} data="2026-06-13" />);
    expect(voceElemento(markup, "D2-E2")).toContain("<span>Gratis</span>");
    expect(voceElemento(markup, "D2-E4")).toContain("<span>€€</span>");
  });

  it("CA-2 gli spostamenti sono connettori con l'icona del mezzo e la durata", () => {
    const markup = giorno2();
    const inPiedi = voceElemento(markup, "D2-E1");
    expect(inPiedi).toContain("ui-linea-tempo__connettore");
    expect(inPiedi).not.toContain("ui-scheda-attivita");
    expect(inPiedi).toContain("lucide-footprints");
    expect(inPiedi).toContain("20 min");
    expect(voceElemento(markup, "D2-E5")).toContain("5 min");
    const inAuto = voceElemento(html(<ContenutoGiorno chiave="versione-1" esito={datiValidi("versione-1")} data="2026-06-14" />), "D3-E1");
    expect(inAuto).toContain("lucide-car");
    expect(inAuto).toContain("50 min");
  });

  it("CA-2 il volo ha l'icona dell'aereo e la durata; la tratta e il mezzo sono anche scritti per chi non vede l'icona", () => {
    const volo = voceElemento(html(<ContenutoGiorno chiave="v-volo" esito={datiValidi("v-volo")} data="2026-06-14" />), "D3-E9");
    expect(volo).toContain("lucide-plane");
    expect(volo).toContain("1 h 5 min");
    expect(volo).toContain('<span class="ui-solo-lettori">Volo: </span>');
    expect(volo).toContain("Aeroporto di Verona → Aeroporto di Roma Fiumicino");
  });

  it("CA-2 la vista viaggio elenca i giorni in schede, senza tabella, ciascuna con il link al giorno", () => {
    const markup = html(<ContenutoViaggio chiave="versione-1" esito={datiValidi("versione-1")} />);
    expect(markup).not.toContain("<table");
    expect(markup).toContain('class="giorni-viaggio"');
    expect(valoriAttributo(markup, "data-data")).toEqual(["2026-06-12", "2026-06-13", "2026-06-14"]);
    expect(markup).toContain("5 elementi");
  });
});
