import { caricaCatalogo, caricaViaggio } from "@travelops/engine";
import { describe, expect, it } from "vitest";
import { ContenutoElemento, ContenutoGiorno, ContenutoViaggio } from "../src/componenti/Contenuti";
import { caricaDati } from "../src/dati/carica";
import { VIAGGI } from "../src/dati/viaggi";
import { datiVariante, html, jsonCatalogo, jsonViaggio, type Grezzo } from "./supporto";

/** Variante dichiarata: versione 1 con l'orario di D2-E2 non valido e un'attività inesistente in D3-E4. */
function viaggioNonValido(): Grezzo {
  const viaggio = jsonViaggio("versione-1");
  viaggio.giorni[1].elementi[1].inizio = "25:00";
  viaggio.giorni[2].elementi[3].attivitaId = "A-INESISTENTE";
  return viaggio;
}

describe("CA-5 caricamento e validazione con il motore", () => {
  it.each(VIAGGI.map((voce) => voce.chiave))("CA-5 il viaggio %s si carica e si valida con il motore senza errori", (chiave) => {
    const esito = caricaDati(jsonViaggio(chiave), jsonCatalogo());
    expect(esito.ok).toBe(true);
  });

  it("CA-5 con dati non validi restituisce gli errori del motore, gli stessi di caricaViaggio", () => {
    const esito = datiVariante(viaggioNonValido());
    expect(esito.ok).toBe(false);
    if (esito.ok) return;
    const catalogo = caricaCatalogo(jsonCatalogo());
    if (!catalogo.ok) throw new Error("il catalogo di riferimento deve essere valido");
    const delMotore = caricaViaggio(viaggioNonValido(), catalogo.valore);
    if (delMotore.ok) throw new Error("la variante deve essere non valida per il motore");
    expect(esito.errori.map(({ origine, ...errore }) => errore)).toEqual(delMotore.errori);
    expect(esito.errori.map((errore) => [errore.origine, errore.codice, errore.id])).toEqual([
      ["viaggio", "FUORI_GIORNATA", "D2-E2"],
      ["viaggio", "RIFERIMENTO_INESISTENTE", "D3-E4"],
    ]);
  });

  it("CA-5 la pagina del viaggio mostra gli errori invece della vista", () => {
    const esito = datiVariante(viaggioNonValido());
    const markup = html(<ContenutoViaggio chiave="versione-1" esito={esito} />);
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("I dati del viaggio non sono validi");
    expect(markup).toContain("FUORI_GIORNATA");
    expect(markup).toContain("RIFERIMENTO_INESISTENTE");
    expect(markup).toContain("giorni[1].elementi[1].inizio");
    expect(markup).not.toContain("Giorni del viaggio");
    expect(markup).not.toContain("Weekend sul Garda");
  });

  it("CA-5 anche le pagine del giorno e dell'elemento mostrano gli errori invece della vista e della mappa", () => {
    const esito = datiVariante(viaggioNonValido());
    const giorno = html(<ContenutoGiorno chiave="versione-1" esito={esito} data="2026-06-13" />);
    expect(giorno).toContain("I dati del viaggio non sono validi");
    expect(giorno).not.toContain("Programma del giorno");
    expect(giorno).not.toContain('class="mappa"');
    const elemento = html(<ContenutoElemento chiave="versione-1" esito={esito} id="D2-E2" />);
    expect(elemento).toContain("I dati del viaggio non sono validi");
    expect(elemento).not.toContain("Attività del catalogo");
  });

  it("CA-5 un catalogo non valido dà gli errori del catalogo e quelli strutturali del viaggio, tutti insieme", () => {
    const catalogo = jsonCatalogo();
    delete catalogo.luoghi[0].nome;
    const viaggio = jsonViaggio("versione-1");
    delete viaggio.titolo;
    const esito = datiVariante(viaggio, catalogo);
    expect(esito.ok).toBe(false);
    if (esito.ok) return;
    expect(esito.errori.map((errore) => [errore.origine, errore.codice, errore.id])).toEqual([
      ["catalogo", "CAMPO_MANCANTE", "HOTEL"],
      ["viaggio", "CAMPO_MANCANTE", "TRIP-GARDA"],
    ]);
    const markup = html(<ContenutoViaggio chiave="versione-1" esito={esito} />);
    expect(markup).toContain("2 errori");
    expect(markup).toContain("<td>Catalogo</td>");
  });

  it("CA-5 un testo che non è JSON non provoca eccezioni: è un errore del motore", () => {
    const esito = caricaDati("{ non è json", jsonCatalogo());
    expect(esito.ok).toBe(false);
    if (esito.ok) return;
    expect(esito.errori.map((errore) => errore.codice)).toEqual(["VALORE_NON_VALIDO"]);
    expect(html(<ContenutoViaggio chiave="versione-1" esito={esito} />)).toContain("un errore");
  });
});
