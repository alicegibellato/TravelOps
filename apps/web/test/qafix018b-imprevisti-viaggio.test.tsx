/**
 * ST-QA-FIX-018B (testbook TB-IMPR-013): «Ho un imprevisto» aperto dal viaggio dell'utente lavora su quel viaggio.
 * La scheda si precompila sulla sua versione corrente, la proposta si registra tra le proposte del viaggio e,
 * accettata, crea la nuova versione su quel viaggio; il viaggio della presentazione non cambia.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { versioneCorrente } from "@travelops/engine";
import { segnalaImprevistoAzione } from "../app/imprevisti/azioni";
import PaginaImprevisti from "../app/imprevisti/page";
import { elencaProposteDelViaggio } from "../src/basedati";
import { decidiPropostaDelViaggio } from "../src/chat/server/proposte-viaggio";
import { versioniDelViaggioSalvato } from "../src/dati/viaggi-salvati";
import { precompila } from "../src/imprevisti/modulo";
import { percorsoImprevisti } from "../src/imprevisti/schede";
import { trovaScheda } from "../src/imprevisti/schede";
import { viaggioUtente } from "../src/imprevisti/viaggio-utente";
import { usaBaseDati } from "../src/stato/avvio";
import { leggiStato } from "../src/stato/archivio";
import { html } from "./supporto";
import { nuovaCartella } from "./supporto-stato";
import { conViaggioUtente } from "./supporto-ux003a";

const rinvio = vi.fn((indirizzo: string) => {
  throw new Error(`REDIRECT ${indirizzo}`);
});
vi.mock("next/navigation", () => ({ redirect: (indirizzo: string) => rinvio(indirizzo), notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

afterEach(() => {
  vi.restoreAllMocks();
  rinvio.mockClear();
});

const parametri = <T,>(valori: T) => Promise.resolve(valori);

/** Una cartella di lavoro finta per Next.js (`<cartella>/.data`) con un viaggio confermato dell'utente. */
function cartella(): string {
  const radice = nuovaCartella();
  const dati = `${radice}/.data`;
  conViaggioUtente(dati, { id: "viaggio-1", titolo: "Viaggio a Lago di Garda", ordine: 100 });
  vi.spyOn(process, "cwd").mockReturnValue(radice);
  return dati;
}

describe("ST-QA-FIX-018B Ho un imprevisto sul viaggio dell'utente", () => {
  it("dal viaggio dell'utente la scheda Maltempo lavora su quel viaggio", async () => {
    cartella();
    const markup = html(await PaginaImprevisti({ searchParams: parametri({ scheda: "maltempo", viaggio: "viaggio-1" }) }));
    expect(markup).toContain("Viaggio a Lago di Garda, versione 1");
    expect(markup).toContain('name="viaggio" value="viaggio-1"');
    expect(markup).toContain('href="/imprevisti?scheda=maltempo&amp;viaggio=viaggio-1"');
    expect(percorsoImprevisti("viaggio-1")).toBe("/imprevisti?viaggio=viaggio-1");
  }, 60_000);

  it("la proposta nasce sul viaggio dell'utente e, accettata, crea la sua versione 2; la presentazione non cambia", async () => {
    const dati = cartella();
    const presentazionePrima = leggiStato(dati);
    const proprio = viaggioUtente(dati, "viaggio-1");
    expect(proprio).not.toBeNull();
    const scheda = trovaScheda("maltempo")!;
    const corrente = versioneCorrente(proprio!.storico);
    const { valori } = precompila(scheda, corrente.viaggio, proprio!.catalogo, proprio!.momento);
    const modulo = new FormData();
    modulo.set("scheda", "maltempo");
    modulo.set("viaggio", "viaggio-1");
    for (const [nome, valore] of Object.entries(valori)) modulo.set(nome, valore);
    modulo.set("inizio", "09:00");
    modulo.set("fine", "21:00");

    await expect(segnalaImprevistoAzione(modulo)).rejects.toThrow("REDIRECT /bozza/viaggio-1");

    const proposte = usaBaseDati(dati, (db) => elencaProposteDelViaggio(db, "viaggio-1"));
    expect(proposte).toHaveLength(1);
    expect(proposte[0]!.origine).toBe("Imprevisto segnalato: Maltempo");
    expect((proposte[0]!.proposta as { versioneBase: number }).versioneBase).toBe(1);

    const esito = decidiPropostaDelViaggio(dati, "viaggio-1", proposte[0]!.id, "accetta", "Viaggiatore");
    expect(esito.livello).not.toBe("errore");
    if (esito.livello === "successo") expect(versioniDelViaggioSalvato(dati, "viaggio-1")?.storico.versioni).toHaveLength(2);

    const presentazioneDopo = leggiStato(dati);
    expect(presentazioneDopo.ok && presentazionePrima.ok).toBe(true);
    if (presentazioneDopo.ok && presentazionePrima.ok) {
      expect(presentazioneDopo.stato.storico.versioni).toHaveLength(presentazionePrima.stato.storico.versioni.length);
      expect(presentazioneDopo.stato.proposte).toHaveLength(presentazionePrima.stato.proposte.length);
    }
  }, 60_000);

  it("senza viaggio, o con un viaggio di riferimento, vale il viaggio della presentazione", async () => {
    cartella();
    const markup = html(await PaginaImprevisti({ searchParams: parametri({ scheda: "maltempo" }) }));
    expect(markup).not.toContain('name="viaggio"');
    expect(viaggioUtente(`${process.cwd()}/.data`, "sconosciuto")).toBeNull();
  }, 60_000);
});
