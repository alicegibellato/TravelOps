import { join } from "node:path";
import { esportaStorico } from "@travelops/engine";
import { afterEach, describe, expect, it, vi } from "vitest";
import { accettaAzione, rifiutaAzione } from "../app/demo/azioni";
import { ContenutoDemo, ContenutoProposta } from "../src/componenti/ContenutiStato";
import { leggiStato } from "../src/stato/archivio";
import { accettaProposta, avviaScenario, impostaOrologio, rifiutaPropostaSalvata } from "../src/stato/operazioni";
import { html } from "./supporto";
import { AZIONI_DEMO, AZIONI_PROPOSTA, modulo, nuovaCartella, RIPRISTINA, statoSalvato, storicoNelDatabase } from "./supporto-stato";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((indirizzo: string) => {
    throw new Error(`REDIRECT ${indirizzo}`);
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CA-6 rifiutare una proposta non crea versioni", () => {
  it.each(["S1", "S2", "S6", "S8"])("CA-6 rifiutando la proposta di %s lo storico resta alla sola versione 1, identico", (id) => {
    const cartella = nuovaCartella();
    avviaScenario(cartella, id);
    const prima = esportaStorico(statoSalvato(cartella).storico);
    const esito = rifiutaPropostaSalvata(cartella, 1);
    expect(esito.ok).toBe(true);
    const dopo = statoSalvato(cartella);
    expect(dopo.storico.versioni.map((v) => v.numero)).toEqual([1]);
    expect(esportaStorico(dopo.storico)).toBe(prima);
    expect(storicoNelDatabase(cartella)).toBe(prima);
    expect(dopo.proposte[0]?.decisione).toEqual({ tipo: "rifiutata" });
  });

  it("CA-6 con l'azione Rifiuta: la proposta risulta rifiutata e la versione corrente resta la 1", async () => {
    const cartella = nuovaCartella();
    vi.spyOn(process, "cwd").mockReturnValue(cartella);
    const dati = join(cartella, ".data");
    avviaScenario(dati, "S1");
    await expect(rifiutaAzione(modulo({ proposta: "1" }))).rejects.toThrow("REDIRECT /demo/proposte/1");
    expect(statoSalvato(dati).storico.versioni).toHaveLength(1);
    const pagina = html(<ContenutoProposta esito={leggiStato(dati)} id={1} azioni={AZIONI_PROPOSTA} ripristina={RIPRISTINA} />);
    expect(pagina).toContain("Proposta rifiutata: nessuna nuova versione, l&#x27;itinerario resta alla versione 1.");
    expect(pagina).toContain("Rifiutata: nessuna nuova versione.");
    expect(pagina).not.toContain(">Accetta</button>");
    const demo = html(<ContenutoDemo esito={leggiStato(dati)} azioni={AZIONI_DEMO} />);
    expect(demo).toContain('data-versione-corrente="1"');
    expect(demo).toContain("Rifiutata");
  });
});

describe("CA-7 accettare una proposta costruita su una versione non più corrente mostra il messaggio di proposta superata", () => {
  it("CA-7 la proposta di S1 (versione 1) accettata di nuovo quando la corrente è la 2: PROPOSTA_SUPERATA, storico invariato", () => {
    const cartella = nuovaCartella();
    avviaScenario(cartella, "S1");
    impostaOrologio(cartella, "2026-06-13", "07:30");
    accettaProposta(cartella, 1, "Alice");
    const prima = esportaStorico(statoSalvato(cartella).storico);
    expect(statoSalvato(cartella).storico.versioni).toHaveLength(2);

    // Per esempio da un'altra scheda del browser, aperta prima dell'accettazione.
    const esito = accettaProposta(cartella, 1, "Bruno");
    expect(esito.ok).toBe(true);
    if (!esito.ok) return;
    expect(esito.esito.livello).toBe("errore");
    expect(esito.esito.messaggio).toBe(
      "[PROPOSTA_SUPERATA] la proposta è costruita sulla versione 1, ma la versione corrente è la 2: va ricostruita sulla versione corrente",
    );
    const dopo = statoSalvato(cartella);
    expect(esportaStorico(dopo.storico)).toBe(prima);
    expect(storicoNelDatabase(cartella)).toBe(prima);
    expect(dopo.storico.versioni.map((v) => v.autore)).toEqual([null, "Alice"]);
  });

  it("CA-7 con l'azione Accetta di una pagina rimasta aperta: la pagina mostra il messaggio di proposta superata", async () => {
    const cartella = nuovaCartella();
    vi.spyOn(process, "cwd").mockReturnValue(cartella);
    const dati = join(cartella, ".data");
    avviaScenario(dati, "S1");
    // La pagina aperta prima dell'accettazione ha ancora il modulo Accetta della proposta 1.
    const paginaAperta = html(<ContenutoProposta esito={leggiStato(dati)} id={1} azioni={AZIONI_PROPOSTA} ripristina={RIPRISTINA} />);
    expect(paginaAperta).toContain(">Accetta</button>");
    await expect(accettaAzione(modulo({ proposta: "1", nome: "Alice" }))).rejects.toThrow("REDIRECT /demo/proposte/1");
    const prima = esportaStorico(statoSalvato(dati).storico);

    await expect(accettaAzione(modulo({ proposta: "1", nome: "Viaggiatore" }))).rejects.toThrow("REDIRECT /demo/proposte/1");
    expect(esportaStorico(statoSalvato(dati).storico)).toBe(prima);
    const pagina = html(<ContenutoProposta esito={leggiStato(dati)} id={1} azioni={AZIONI_PROPOSTA} ripristina={RIPRISTINA} />);
    expect(pagina).toContain('data-livello="errore"');
    // Il messaggio del motore, con il codice messo in parole (REQ-UX-001 CA-6).
    expect(pagina).toContain("Questa proposta non è più aggiornata: la proposta è costruita sulla versione 1, ma la versione corrente è la 2");
    expect(pagina).not.toContain("PROPOSTA_SUPERATA]");
    // La decisione registrata resta quella che ha creato la versione 2.
    expect(pagina).toContain("Accettata da Alice");
  });

  it("CA-7 una proposta che non esiste più (scenario riavviato) non cambia lo storico", () => {
    const cartella = nuovaCartella();
    avviaScenario(cartella, "S1");
    avviaScenario(cartella, "S2");
    const prima = esportaStorico(statoSalvato(cartella).storico);
    expect(accettaProposta(cartella, 1, "Alice")).toEqual({
      ok: false,
      messaggio: "La proposta non è più disponibile: avvia di nuovo lo scenario dalla pagina Demo.",
    });
    expect(esportaStorico(statoSalvato(cartella).storico)).toBe(prima);
    const pagina = html(<ContenutoProposta esito={leggiStato(cartella)} id={1} azioni={AZIONI_PROPOSTA} ripristina={RIPRISTINA} />);
    expect(pagina).toContain("Proposta non disponibile");
  });
});

describe("accettazioni senza nuova versione", () => {
  it("S7 non cambia l'itinerario: accettarla dà l'avviso NESSUNA_MODIFICA del motore e nessuna versione", () => {
    const cartella = nuovaCartella();
    avviaScenario(cartella, "S7");
    const esito = accettaProposta(cartella, 1, "Alice");
    expect(esito.ok && esito.esito.livello).toBe("avviso");
    expect(esito.ok && esito.esito.messaggio).toMatch(/^\[NESSUNA_MODIFICA\]/);
    expect(statoSalvato(cartella).storico.versioni).toHaveLength(1);
  });

  it("S6 non è fattibile ma si può accettare (decide il viaggiatore): la versione 2 lo registra", () => {
    const cartella = nuovaCartella();
    avviaScenario(cartella, "S6");
    accettaProposta(cartella, 1, "Alice");
    const v2 = statoSalvato(cartella).storico.versioni[1];
    expect(v2?.propostaFattibile).toBe(false);
    expect(v2?.problemi.map((p) => p.codice)).toEqual(["FUORI_ORARIO", "FUORI_ORARIO"]);
  });
});
