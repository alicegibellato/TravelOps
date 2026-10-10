/**
 * ST-UX-003A-FIX-TB-XPAGE-004 (TB-XPAGE-004): il Proxy riconosce un viaggio, una bozza, una versione, un giorno o un
 * elemento inesistenti prima che la pagina inizi lo streaming, così rispondono 404 con «Pagina non trovata».
 */
import { describe, expect, it } from "vitest";
import { caricaViaggioDellApp } from "../src/dati/viaggi-salvati";
import { PERCORSO_NON_TROVATA, paginaEsiste } from "../src/esistenza";
import { nuovaCartella } from "./supporto-stato";
import { DEMO_GARDA } from "./supporto-ux003a";

/** Un giorno e un elemento veri di un viaggio, per i percorsi che devono esistere. */
function giornoEdElemento(cartella: string, chiave: string): { data: string; elemento: string } {
  const caricato = caricaViaggioDellApp(cartella, chiave);
  if (caricato === null || !caricato.esito.ok) throw new Error(`viaggio ${chiave} non valido`);
  const giorno = caricato.esito.viaggio.giorni.find((g) => g.elementi.length > 0);
  if (giorno === undefined) throw new Error(`viaggio ${chiave} senza elementi`);
  return { data: giorno.data, elemento: (giorno.elementi[0] as { id: string }).id };
}

describe("TB-XPAGE-004 percorsi inesistenti riconosciuti prima della pagina", () => {
  it("il percorso di riscrittura non corrisponde a nessuna pagina (cartella privata di app/)", () => {
    expect(PERCORSO_NON_TROVATA.startsWith("/_")).toBe(true);
  });

  it("viaggi, giorni ed elementi inesistenti non esistono; quelli veri sì", () => {
    const cartella = nuovaCartella();
    for (const chiave of ["versione-1", DEMO_GARDA]) {
      const { data, elemento } = giornoEdElemento(cartella, chiave);
      expect(paginaEsiste(cartella, `/viaggi/${chiave}`)).toBe(true);
      expect(paginaEsiste(cartella, `/viaggi/${chiave}/giorni/${data}`)).toBe(true);
      expect(paginaEsiste(cartella, `/viaggi/${chiave}/elementi/${encodeURIComponent(elemento)}`)).toBe(true);
      expect(paginaEsiste(cartella, `/viaggi/${chiave}/oggi`)).toBe(true);
      expect(paginaEsiste(cartella, `/viaggi/${chiave}/giorni/2000-01-01`)).toBe(false);
      expect(paginaEsiste(cartella, `/viaggi/${chiave}/elementi/non-esiste`)).toBe(false);
    }
    expect(paginaEsiste(cartella, "/viaggi/non-esiste")).toBe(false);
    expect(paginaEsiste(cartella, "/viaggi/non-esiste/giorni/2026-06-13")).toBe(false);
    expect(paginaEsiste(cartella, "/viaggi/non-esiste/oggi")).toBe(false);
    expect(paginaEsiste(cartella, "/viaggi/%E0%A4%A")).toBe(false);
  });

  it("versioni inesistenti, con giorno o elemento inesistenti, non esistono; la versione 1 sì", () => {
    const cartella = nuovaCartella();
    expect(paginaEsiste(cartella, "/versioni/1")).toBe(true);
    expect(paginaEsiste(cartella, "/versioni/1/giorni/2026-06-13")).toBe(true);
    expect(paginaEsiste(cartella, "/versioni/1/giorni/2000-01-01")).toBe(false);
    expect(paginaEsiste(cartella, "/versioni/1/elementi/non-esiste")).toBe(false);
    expect(paginaEsiste(cartella, "/versioni/99")).toBe(false);
    expect(paginaEsiste(cartella, "/versioni/99/giorni/2026-06-13")).toBe(false);
    expect(paginaEsiste(cartella, "/versioni/abc")).toBe(false);
  });

  it("una bozza inesistente non esiste; le pagine non controllate sono lasciate alla pagina", () => {
    const cartella = nuovaCartella();
    expect(paginaEsiste(cartella, "/bozza/non-esiste")).toBe(false);
    for (const percorso of ["/", "/viaggi", "/versioni", "/bozza", "/demo", "/pagina-a-caso"]) expect(paginaEsiste(cartella, percorso)).toBe(true);
  });
});
