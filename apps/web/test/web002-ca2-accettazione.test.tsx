import { afterEach, describe, expect, it, vi } from "vitest";
import { accettaAzione, impostaOrologioAzione } from "../app/demo/azioni";
import ItinerarioCorrente from "../app/itinerario/page";
import { ContenutoDemo, ContenutoProposta, ContenutoVersioneGiorno } from "../src/componenti/ContenutiStato";
import { leggiStato } from "../src/stato/archivio";
import { accettaProposta, avviaScenario, impostaOrologio } from "../src/stato/operazioni";
import { NOME_PREDEFINITO } from "../src/stato/stato";
import { html, valoriAttributo, voceElemento } from "./supporto";
import { AZIONI_DEMO, AZIONI_PROPOSTA, modulo, nuovaCartella, RIPRISTINA, statoSalvato } from "./supporto-stato";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((indirizzo: string) => {
    throw new Error(`REDIRECT ${indirizzo}`);
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

afterEach(() => {
  vi.restoreAllMocks();
});

/** Causa di REQ-ITIN-002 CA-2. */
const CAUSA_CA2 = "Meteo avverso: pioggia in GARDA_NORD il 2026-06-13 08:00–13:00";

/** La stessa causa come la legge il viaggiatore (REQ-UX-001 CA-6: nome della zona e data estesa). */
const CAUSA_CA2_IN_PAROLE = "Meteo avverso: pioggia in zona Alto Garda il 13 giugno 2026 08:00–13:00";

/** Il giorno 2026-06-13 nella versione 2 (P-S1). */
const GIORNO_V2 = [
  ["D2-E1", "09:50", "10:00"],
  ["N1", "10:00", "12:00"],
  ["D2-E3", "12:00", "12:05"],
  ["D2-E4", "13:20", "14:30"],
  ["D2-E5", "14:30", "14:35"],
];

function accettaS1ComeAlice(cartella: string): void {
  const avvio = avviaScenario(cartella, "S1");
  if (!avvio.ok) throw new Error(avvio.messaggio);
  const orologio = impostaOrologio(cartella, "2026-06-13", "07:30");
  if (!orologio.ok) throw new Error(orologio.messaggio);
  const esito = accettaProposta(cartella, avvio.proposta.id, "Alice");
  if (!esito.ok) throw new Error(esito.messaggio);
}

describe("CA-2 accettando S1 come \"Alice\" alle 07:30 del 2026-06-13 si crea la versione 2", () => {
  it("CA-2 la versione 2 ha la causa e l'autore di REQ-ITIN-002 CA-2 e il momento dell'orologio simulato", () => {
    const cartella = nuovaCartella();
    accettaS1ComeAlice(cartella);
    const { storico } = statoSalvato(cartella);
    expect(storico.versioni.map((v) => v.numero)).toEqual([1, 2]);
    const v2 = storico.versioni[1];
    expect(v2?.causa).toBe(CAUSA_CA2);
    expect(v2?.autore).toBe("Alice");
    expect(v2?.momento).toEqual({ data: "2026-06-13", ora: "07:30" });
    expect(v2?.propostaFattibile).toBe(true);
    expect(v2?.viaggio.prossimoNumeroId).toBe(2);
  });

  it("CA-2 con le azioni dei moduli: orologio, poi Accetta con il nome \"Alice\"", async () => {
    const cartella = nuovaCartella();
    vi.spyOn(process, "cwd").mockReturnValue(cartella);
    const dati = `${cartella}/.data`;
    avviaScenario(dati, "S1");
    await expect(impostaOrologioAzione(modulo({ data: "2026-06-13", ora: "07:30" }))).rejects.toThrow("REDIRECT /demo");
    await expect(accettaAzione(modulo({ proposta: "1", nome: "Alice" }))).rejects.toThrow("REDIRECT /demo/proposte/1");
    const v2 = statoSalvato(dati).storico.versioni[1];
    expect([v2?.causa, v2?.autore, v2?.momento]).toEqual([CAUSA_CA2, "Alice", { data: "2026-06-13", ora: "07:30" }]);
    // L'itinerario corrente porta alla versione 2.
    expect(() => ItinerarioCorrente()).toThrow("REDIRECT /versioni/2");
  });

  it("CA-2 la vista giorno della versione 2 mostra il nuovo itinerario del 2026-06-13", () => {
    const cartella = nuovaCartella();
    accettaS1ComeAlice(cartella);
    const markup = html(<ContenutoVersioneGiorno esito={leggiStato(cartella)} numero={2} data="2026-06-13" ripristina={RIPRISTINA} />);
    expect(markup).toContain("Versione 2</strong> (corrente)");
    expect(markup).toContain(CAUSA_CA2_IN_PAROLE);
    expect(valoriAttributo(markup, "data-elemento").filter((id, i, tutti) => tutti.indexOf(id) === i)).toEqual(GIORNO_V2.map(([id]) => id));
    for (const [id, inizio, fine] of GIORNO_V2) {
      expect(voceElemento(markup, id ?? "")).toContain(`${inizio}–${fine}`);
    }
    expect(voceElemento(markup, "N1")).toContain("Visita al MAG");
    expect(markup).toContain('href="/versioni/2/elementi/N1"');
    expect(markup).not.toContain("Trekking sul Sentiero del Ponale");
  });

  it("CA-2 la proposta accettata indica autore, momento e versione 2, e non offre più Accetta e Rifiuta", () => {
    const cartella = nuovaCartella();
    accettaS1ComeAlice(cartella);
    const markup = html(<ContenutoProposta esito={leggiStato(cartella)} id={1} azioni={AZIONI_PROPOSTA} ripristina={RIPRISTINA} />);
    expect(markup).toContain("Proposta accettata da Alice il 13 giugno 2026 alle 07:30: creata la versione 2.");
    expect(markup).toContain("Accettata da Alice il sabato 13 giugno 2026 alle 07:30: versione 2.");
    expect(markup).toContain('href="/versioni/2/giorni/2026-06-13"');
    expect(markup).not.toContain(">Accetta</button>");
    expect(markup).not.toContain(">Rifiuta</button>");
    const demo = html(<ContenutoDemo esito={leggiStato(cartella)} azioni={AZIONI_DEMO} />);
    expect(demo).toContain('data-versione-corrente="2"');
    expect(demo).toContain("Accettata (versione 2)");
  });

  it("il nome di chi accetta è \"Viaggiatore\" se non lo si cambia", () => {
    const cartella = nuovaCartella();
    avviaScenario(cartella, "S1");
    const markup = html(<ContenutoProposta esito={leggiStato(cartella)} id={1} azioni={AZIONI_PROPOSTA} ripristina={RIPRISTINA} />);
    expect(markup).toMatch(new RegExp(`<input type="text"[^>]* name="nome"[^>]* value="${NOME_PREDEFINITO}"/>`));
    expect(markup).toContain("venerdì 12 giugno 2026 alle 08:00");
    accettaProposta(cartella, 1, NOME_PREDEFINITO);
    expect(statoSalvato(cartella).storico.versioni[1]?.autore).toBe("Viaggiatore");
  });

  it("senza nome la proposta non è accettata: il motore risponde ACCETTAZIONE_NON_VALIDA e non crea versioni", () => {
    const cartella = nuovaCartella();
    avviaScenario(cartella, "S1");
    const esito = accettaProposta(cartella, 1, "   ");
    expect(esito.ok && esito.esito.livello).toBe("errore");
    expect(esito.ok && esito.esito.messaggio).toMatch(/^\[ACCETTAZIONE_NON_VALIDA\]/);
    expect(statoSalvato(cartella).storico.versioni).toHaveLength(1);
  });
});
