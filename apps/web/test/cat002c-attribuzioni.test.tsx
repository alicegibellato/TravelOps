// @vitest-environment jsdom
/**
 * ST-CAT-002C, criterio 3: le attribuzioni sono visibili: "© OpenStreetMap contributors" sulla mappa e nei dettagli,
 * autore e licenza di ogni immagine, fonte di ogni descrizione.
 */
import { ATTRIBUZIONE_OSM } from "@travelops/sources";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ContenutoGiorno } from "../src/componenti/Contenuti";
import { ContenutoPannello } from "../src/componenti/ContenutoPannello";
import { DettaglioElemento } from "../src/componenti/DettaglioElemento";
import { SceltaDestinazione } from "../src/componenti/SceltaDestinazione";
import { TESTO_ATTRIBUZIONE_OSM, URL_DIRITTI_OSM } from "../src/rete";
import { dettaglioElemento } from "../src/viste/elemento";
import { attendi, clic, monta, preparaChat, pulsante } from "./supporto-chat";
import { istantaneaGrande, MESI_DI_PROVA, scriviNelCampo, servizioDiProva } from "./supporto-destinazioni";
import { datiValidi } from "./supporto";

preparaChat();

/** Il catalogo di riferimento con i dati che una destinazione reale porta con sé (luogo OSM, descrizione, immagine). */
function dettaglioConAttribuzioni(conImmagineCompleta: boolean) {
  const { viaggio, catalogo } = datiValidi("versione-1");
  const modificato = structuredClone(catalogo);
  const luogo = modificato.luoghi.find((l) => l.id === "BUONCONSIGLIO");
  const attivita = modificato.attivita.find((a) => a.id === "A-BUONCONSIGLIO");
  if (luogo === undefined || attivita === undefined) throw new Error("dati di riferimento cambiati");
  Object.assign(luogo, { origine: "osm", osmId: "way/1", fonteDescrizione: "Wikipedia (it), voce Castello del Buonconsiglio" });
  Object.assign(attivita, {
    immagine: {
      percorso: "immagini/castello.jpg",
      attribuzione: "Mario Rossi, CC BY-SA 4.0, via Wikimedia Commons",
      ...(conImmagineCompleta ? { autore: "Mario Rossi", licenza: "CC BY-SA 4.0" } : {}),
    },
  });
  const dettaglio = dettaglioElemento(viaggio, modificato, "D3-E2");
  if (dettaglio === null) throw new Error("dettaglio mancante");
  return dettaglio;
}

describe("CA-3 attribuzioni sulla mappa", () => {
  it("sotto la mappa del giorno c'è «© OpenStreetMap contributors» con il link ai diritti", () => {
    const pagina = renderToStaticMarkup(<ContenutoGiorno chiave="versione-1" esito={datiValidi("versione-1")} data="2026-06-14" />);
    expect(pagina).toContain(`<p class="mappa-attribuzione">Mappa: <a class="attribuzione-osm" href="${URL_DIRITTI_OSM}"`);
    expect(pagina).toContain(`>${TESTO_ATTRIBUZIONE_OSM}</a>`);
  });

  it("il testo è quello di @travelops/sources", () => {
    expect(TESTO_ATTRIBUZIONE_OSM).toBe(ATTRIBUZIONE_OSM);
  });
});

describe("CA-3 attribuzioni nei dettagli", () => {
  it("pagina del dettaglio: OpenStreetMap, fonte della descrizione, autore e licenza dell'immagine", () => {
    const dettaglio = dettaglioConAttribuzioni(true);
    expect(dettaglio.attivita?.attribuzioni).toEqual({
      osm: true,
      immagine: "Mario Rossi, licenza CC BY-SA 4.0",
      fonteDescrizione: "Wikipedia (it), voce Castello del Buonconsiglio",
    });
    const vista = monta(<DettaglioElemento chiave="versione-1" dettaglio={dettaglio} />);
    const sezione = vista.querySelector("section.attribuzioni");
    expect(sezione?.getAttribute("aria-label")).toBe("Fonti e attribuzioni");
    expect(sezione?.querySelector("[data-attribuzione='osm']")?.textContent).toBe(`Luogo e posizione: ${ATTRIBUZIONE_OSM}`);
    expect(sezione?.querySelector("[data-attribuzione='descrizione']")?.textContent).toBe("Descrizione: Wikipedia (it), voce Castello del Buonconsiglio");
    expect(sezione?.querySelector("[data-attribuzione='immagine']")?.textContent).toBe("Immagine: Mario Rossi, licenza CC BY-SA 4.0");
  });

  it("pannello del dettaglio: le stesse attribuzioni; se i dati hanno solo l'attribuzione completa, quella", () => {
    const vista = monta(<ContenutoPannello dettaglio={dettaglioConAttribuzioni(false)} />);
    expect(vista.querySelector("[data-attribuzione='osm']")?.textContent).toContain(ATTRIBUZIONE_OSM);
    expect(vista.querySelector("[data-attribuzione='descrizione']")).not.toBeNull();
    expect(vista.querySelector("[data-attribuzione='immagine']")?.textContent).toBe("Immagine: Mario Rossi, CC BY-SA 4.0, via Wikimedia Commons");
  });

  it("i dati di riferimento non vengono da OpenStreetMap e non hanno immagini: nessuna attribuzione inventata", () => {
    const { viaggio, catalogo } = datiValidi("versione-1");
    const dettaglio = dettaglioElemento(viaggio, catalogo, "D3-E2");
    expect(dettaglio?.attivita?.attribuzioni).toBeUndefined();
    const vista = monta(<ContenutoPannello dettaglio={dettaglio as NonNullable<typeof dettaglio>} />);
    expect(vista.querySelector(".attribuzioni")).toBeNull();
  });
});

describe("CA-3 attribuzioni di una destinazione costruita", () => {
  it("il servizio restituisce mappa, fonti, autore e licenza delle immagini e fonte delle descrizioni registrati", async () => {
    const esito = await servizioDiProva().costruisci(istantaneaGrande().area);
    expect(esito.esito === "pronta" && esito.attribuzioni.mappa).toBe(ATTRIBUZIONE_OSM);
    if (esito.esito !== "pronta") return;
    expect(esito.attribuzioni.fonti.map((f) => f.nome)).toEqual(["OpenStreetMap", "Wikimedia Commons"]);
    expect(esito.attribuzioni.immagini).toContainEqual({ attivita: expect.any(String), autore: "Autrice di prova", licenza: "CC BY-SA 4.0" });
    expect(esito.attribuzioni.descrizioni).toContainEqual({ luogo: expect.any(String), fonte: "Wikipedia (it), voce di prova" });
    // Ogni immagine dell'istantanea ha la sua voce con autore e licenza.
    expect(esito.attribuzioni.immagini).toHaveLength(istantaneaGrande().attivita.filter((a) => a.immagine !== undefined).length);
  });

  it("nella pagina, dopo la costruzione, si leggono le attribuzioni", async () => {
    const vista = monta(<SceltaDestinazione servizio={servizioDiProva()} mesi={MESI_DI_PROVA} />);
    scriviNelCampo(vista, "Borgo");
    await attendi(400);
    clic(pulsante(vista, "Borgo di Prova"));
    await attendi();
    const sezione = vista.querySelector("[data-attribuzioni='destinazione']");
    expect(sezione?.querySelector("[data-attribuzione='osm']")?.textContent).toBe(`Mappa e luoghi: ${ATTRIBUZIONE_OSM}`);
    expect(sezione?.textContent).toContain("Autrice di prova, licenza CC BY-SA 4.0");
    expect(sezione?.textContent).toContain("Wikipedia (it), voce di prova");
    expect(sezione?.querySelector("a")?.getAttribute("href")).toBe(URL_DIRITTI_OSM);
  });
});
