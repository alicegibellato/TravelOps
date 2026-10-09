/**
 * REQ-WEB-003 CA-5 (come REQ-UX-001 CA-6): nessun codice tecnico a vista nella vista giorno, nelle schede, nei
 * connettori, nella legenda della mappa e nel pannello del dettaglio. I codici restano negli attributi data-*.
 * Il controllo su tutte le pagine è in `ux001-ca6-codici.test.tsx`.
 */
import catalogoJson from "@travelops/engine/data/reference/catalogo.json";
import { describe, expect, it } from "vitest";
import { ContenutoPannello } from "../src/componenti/ContenutoPannello";
import { ContenutoGiorno } from "../src/componenti/Contenuti";
import { VIAGGI } from "../src/dati/viaggi";
import { dettagliDelGiorno } from "../src/viste/elemento";
import { datiValidi, html } from "./supporto";
import { paginaCompleta, testoVisibile } from "./supporto-ux";

interface VoceCatalogo {
  id: string;
  nome: string;
}

/** Gli id del catalogo che, scritti come parola intera in maiuscolo, sarebbero un codice (non fanno parte di un nome). */
function idCatalogo(): string[] {
  const catalogo = catalogoJson as unknown as { zone: VoceCatalogo[]; luoghi: VoceCatalogo[]; attivita: VoceCatalogo[] };
  const voci = [...catalogo.zone, ...catalogo.luoghi, ...catalogo.attivita];
  return voci.map((voce) => voce.id).filter((id) => !voci.some((voce) => new RegExp(`(^|[^\\w-])${id}([^\\w-]|$)`).test(voce.nome)));
}

function codici(testo: string): string[] {
  const modelli: [string, RegExp][] = [
    ["id di un elemento", /\bD\d+-E\d+\b/],
    ["id di un elemento nuovo", /\bN\d+\b/],
    ["codice del motore", /\b[A-Z]{3,}(_[A-Z]+)+\b/],
    ["id del catalogo", new RegExp(`(^|[^\\w-])(${idCatalogo().join("|")})([^\\w-]|$)`)],
    ["data AAAA-MM-GG", /\b\d{4}-\d{2}-\d{2}\b/],
  ];
  return testo
    .split("\n")
    .flatMap((riga) => modelli.filter(([, modello]) => modello.test(riga)).map(([nome]) => `${nome}: «${riga.trim().slice(0, 120)}»`));
}

describe("CA-5 nessun codice tecnico a vista nella consultazione", () => {
  it("CA-5 il controllo riconosce i codici", () => {
    expect(codici("Pranzo D2-E4")).toHaveLength(1);
    expect(codici("FUORI_ORARIO")).toHaveLength(1);
    expect(codici("in GARDA_NORD").length).toBeGreaterThan(0);
    expect(codici("Visita al MUSE, 14 giugno 2026, XY123")).toEqual([]);
  });

  it("CA-5 ogni giorno di ogni viaggio: schede, connettori, legenda e link senza codici nel testo visibile", () => {
    const trovati: string[] = [];
    for (const { chiave } of VIAGGI) {
      const esito = datiValidi(chiave);
      for (const giorno of esito.viaggio.giorni) {
        const pagina = paginaCompleta(<ContenutoGiorno chiave={chiave} esito={esito} data={giorno.data} />);
        for (const codice of codici(testoVisibile(pagina))) trovati.push(`${chiave} ${giorno.data} → ${codice}`);
      }
    }
    expect(trovati).toEqual([]);
  });

  it("CA-5 il pannello di ogni elemento (aperto) non mostra codici", () => {
    const trovati: string[] = [];
    let pannelli = 0;
    for (const { chiave } of VIAGGI) {
      const esito = datiValidi(chiave);
      for (const giorno of esito.viaggio.giorni) {
        for (const dettaglio of Object.values(dettagliDelGiorno(esito.viaggio, esito.catalogo, giorno.data))) {
          pannelli += 1;
          for (const codice of codici(testoVisibile(paginaCompleta(<ContenutoPannello dettaglio={dettaglio} />)))) {
            trovati.push(`${chiave} ${dettaglio.titolo} → ${codice}`);
          }
        }
      }
    }
    expect(pannelli).toBeGreaterThan(40);
    expect(trovati).toEqual([]);
  });

  it("CA-5 gli id restano solo negli attributi data-* e negli indirizzi, non nel testo", () => {
    const markup = html(<ContenutoGiorno chiave="versione-1" esito={datiValidi("versione-1")} data="2026-06-13" />);
    expect(markup).toContain('data-elemento="D2-E2"');
    expect(markup).toContain('href="/viaggi/versione-1/elementi/D2-E2"');
    expect(codici(testoVisibile(paginaCompleta(<ContenutoGiorno chiave="versione-1" esito={datiValidi("versione-1")} data="2026-06-13" />)))).toEqual([]);
  });
});
