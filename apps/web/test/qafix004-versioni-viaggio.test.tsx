/**
 * ST-QA-FIX-004 (testbook TB-VER-001, TB-VER-002, TB-VER-005; collaudo TO-003): Versioni e Itinerario corrente
 * seguono il viaggio confermato dell'utente. Il viaggio salvato ha la sua pagina `/viaggi/<id>/versioni` con
 * cronologia e confronto; dal menu, «Versioni» e «Itinerario corrente» portano al viaggio dell'utente, non a quello
 * della modalità presentazione (che resta raggiungibile con `?presentazione`).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import PaginaItinerario from "../app/itinerario/page";
import PaginaVersioni from "../app/versioni/page";
import VersioniDelViaggio from "../app/viaggi/[viaggio]/versioni/page";
import { ultimoViaggioConfermato, versioniDelViaggioSalvato } from "../src/dati/viaggi-salvati";
import { html } from "./supporto";
import { nuovaCartella } from "./supporto-stato";
import { conViaggioUtente } from "./supporto-ux003a";

const rinvio = vi.fn((indirizzo: string) => {
  throw new Error(`REDIRECT ${indirizzo}`);
});
vi.mock("next/navigation", () => ({ redirect: (indirizzo: string) => rinvio(indirizzo), notFound: () => { throw new Error("NOT_FOUND"); } }));

afterEach(() => {
  vi.restoreAllMocks();
  rinvio.mockClear();
});

const parametri = <T,>(valori: T) => Promise.resolve(valori);

/** Una cartella di lavoro finta per Next.js (`<cartella>/.data`); con `confermato` un viaggio confermato dell'utente. */
function cartella(confermato: boolean): string {
  const radice = nuovaCartella();
  const dati = `${radice}/.data`;
  if (confermato) conViaggioUtente(dati, { id: "viaggio-1", titolo: "Viaggio a Lago di Garda", ordine: 100 });
  else conViaggioUtente(dati, { id: "viaggio-2", titolo: "Il mio weekend al lago", stato: "bozza", ordine: 101 });
  vi.spyOn(process, "cwd").mockReturnValue(radice);
  return dati;
}

describe("ST-QA-FIX-004 Versioni e Itinerario corrente del viaggio scelto", () => {
  it("il viaggio confermato dell'utente ha la sua pagina delle versioni, con la versione 1 corrente e il ritorno al viaggio", async () => {
    const dati = cartella(true);
    expect(versioniDelViaggioSalvato(dati, "viaggio-1")?.storico.versioni).toHaveLength(1);
    const markup = html(await VersioniDelViaggio({ params: parametri({ viaggio: "viaggio-1" }), searchParams: parametri({}) }));
    expect(markup).toContain("Versioni di «Viaggio a Lago di Garda»");
    expect(markup).toContain('data-versione="1"');
    expect(markup).toContain("Corrente");
    expect(markup).toContain('href="/viaggi/viaggio-1"');
    expect(markup).toContain('action="/viaggi/viaggio-1/versioni"');
    expect(markup).not.toContain("Torna alla modalità presentazione");
  }, 60_000);

  it("dal menu, Versioni e Itinerario corrente portano al viaggio confermato dell'utente", async () => {
    cartella(true);
    expect(ultimoViaggioConfermato(`${process.cwd()}/.data`)).toBe("viaggio-1");
    await expect(PaginaVersioni({ searchParams: parametri({}) })).rejects.toThrow("REDIRECT /viaggi/viaggio-1/versioni");
    expect(() => PaginaItinerario()).toThrow("REDIRECT /viaggi/viaggio-1");
  }, 60_000);

  it("senza viaggi confermati dell'utente valgono le pagine della modalità presentazione", async () => {
    cartella(false);
    const markup = html(await PaginaVersioni({ searchParams: parametri({}) }));
    expect(markup).toContain("Versioni dell&#x27;itinerario");
    expect(rinvio).not.toHaveBeenCalled();
  }, 60_000);

  it("una bozza o un viaggio sconosciuto non hanno la pagina delle versioni", async () => {
    cartella(false);
    await expect(VersioniDelViaggio({ params: parametri({ viaggio: "viaggio-2" }), searchParams: parametri({}) })).rejects.toThrow("NOT_FOUND");
    await expect(VersioniDelViaggio({ params: parametri({ viaggio: "sconosciuto" }), searchParams: parametri({}) })).rejects.toThrow("NOT_FOUND");
  }, 60_000);
});
