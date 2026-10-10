/**
 * ST-TODAY-001, CA-2 di REQ-TODAY-001: "Sono in ritardo di 30 minuti" produce la stessa proposta di un imprevisto
 * RITARDO di 30 minuti in quel momento. La proposta viene dal motore (`proponiRipianificazione`), come per gli scenari
 * della modalità presentazione: qui la si confronta con quella che il motore dà per l'imprevisto scritto a mano.
 */
import { proponiRipianificazione, versioneCorrente, type ImprevistoRitardo } from "@travelops/engine";
import { afterEach, describe, expect, it, vi } from "vitest";
import { segnalaRitardoAzione } from "../app/viaggi/[viaggio]/oggi/azioni";
import { PannelloOggi } from "../src/componenti/PannelloOggi";
import { catalogoDiRiferimento, sorgenteDiRiferimento } from "../src/dati/scenari";
import { segnalaRitardo } from "../src/oggi/operazioni";
import { imprevistoRitardo, RITARDI_RAPIDI } from "../src/oggi/ritardi";
import { vistaOggi } from "../src/oggi/vista";
import { accettaProposta, avviaScenario, impostaOrologio } from "../src/stato/operazioni";
import { datiValidi, html } from "./supporto";
import { viaggioDemoGarda } from "./supporto-oggi";
import { modulo, nuovaCartella, statoSalvato } from "./supporto-stato";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((indirizzo: string) => {
    throw new Error(`REDIRECT ${indirizzo}`);
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

afterEach(() => {
  vi.restoreAllMocks();
});

/** L'imprevisto RITARDO di 30 minuti del 2026-06-13 alle 10:30, scritto come nei dati degli scenari. */
const RITARDO_30: ImprevistoRitardo = { tipo: "RITARDO", data: "2026-06-13", momento: "10:30", minuti: 30, motivo: "" };
const MOMENTO = { data: "2026-06-13", ora: "10:30" };

describe("CA-2 «Sono in ritardo di 30 minuti» su TRIP-DEMO-GARDA alle 10:30 del 2026-06-13", () => {
  const garda = viaggioDemoGarda();

  it("CA-2 il pulsante è l'imprevisto RITARDO di 30 minuti in quel momento", () => {
    expect(RITARDI_RAPIDI).toEqual([15, 30, 60]);
    expect(imprevistoRitardo(MOMENTO, 30)).toEqual(RITARDO_30);
  });

  it("CA-2 la proposta del pulsante è la stessa del motore per l'imprevisto RITARDO di 30 minuti", () => {
    const dalPulsante = proponiRipianificazione(garda.viaggio, 1, garda.istantanea, garda.sorgente, imprevistoRitardo(MOMENTO, 30), { profilo: garda.profilo });
    const attesa = proponiRipianificazione(garda.viaggio, 1, garda.istantanea, garda.sorgente, RITARDO_30, { profilo: garda.profilo });
    expect(dalPulsante).toEqual(attesa);
    expect(dalPulsante.origine).toEqual({ tipo: "imprevisto", imprevisto: RITARDO_30 });
  });

  it("CA-2 la vista Oggi offre il pulsante «Sono in ritardo di 30 minuti» con il viaggio e i minuti", () => {
    const markup = html(<PannelloOggi chiave="versione-1" vista={vistaOggi(garda.viaggio, garda.catalogo, MOMENTO)} azioni={{ segnalaRitardo: () => undefined }} />);
    expect(markup).toContain('<input type="hidden" name="minuti" value="30"/><button type="submit" class="ui-pulsante ui-pulsante--secondario" data-ritardo="30">Sono in ritardo di 30 minuti</button>');
    expect(markup).toContain('<input type="hidden" name="viaggio" value="versione-1"/>');
  });
});

describe("CA-2 nella web app: il ritardo segnalato diventa la proposta del motore, da decidere come le altre", () => {
  const attesaSu = (cartella: string) => {
    const corrente = versioneCorrente(statoSalvato(cartella).storico);
    return proponiRipianificazione(corrente.viaggio, corrente.numero, catalogoDiRiferimento(), sorgenteDiRiferimento(), RITARDO_30);
  };

  it("CA-2 con l'orologio al 2026-06-13 alle 10:30 la proposta salvata è quella del motore per RITARDO di 30 minuti", () => {
    const cartella = nuovaCartella();
    expect(impostaOrologio(cartella, "2026-06-13", "10:30").ok).toBe(true);
    const attesa = attesaSu(cartella);
    const esito = segnalaRitardo(cartella, "versione-1", 30);
    if (!esito.ok) throw new Error(esito.messaggio);
    expect(esito.proposta.proposta).toEqual(attesa);
    expect(esito.proposta.scenario).toBe("Sono in ritardo di 30 minuti");
    expect(statoSalvato(cartella).proposte.at(-1)?.proposta).toEqual(attesa);
    // Si decide come le proposte degli scenari: accettarla passa dal motore (`applicaProposta`).
    const accettata = accettaProposta(cartella, esito.proposta.id, "Alice");
    if (!accettata.ok) throw new Error(accettata.messaggio);
    expect(["successo", "avviso"]).toContain(accettata.esito.livello);
  });

  it("CA-2 la proposta è costruita sulla versione corrente del viaggio della modalità presentazione", () => {
    const cartella = nuovaCartella();
    impostaOrologio(cartella, "2026-06-13", "07:30");
    const s1 = avviaScenario(cartella, "S1");
    if (!s1.ok) throw new Error(s1.messaggio);
    expect(accettaProposta(cartella, s1.proposta.id, "Alice").ok).toBe(true);
    impostaOrologio(cartella, "2026-06-13", "10:30");
    const attesa = attesaSu(cartella);
    expect(attesa.versioneBase).toBe(2);
    const esito = segnalaRitardo(cartella, "versione-1", 30);
    if (!esito.ok) throw new Error(esito.messaggio);
    expect(esito.proposta.proposta).toEqual(attesa);
  });

  it("CA-2 su un altro viaggio la proposta nasce dalla sua versione 1, come quando si avvia uno scenario", () => {
    const cartella = nuovaCartella();
    impostaOrologio(cartella, "2026-06-13", "10:30");
    const esito = segnalaRitardo(cartella, "v-fisso", 30);
    if (!esito.ok) throw new Error(esito.messaggio);
    expect(statoSalvato(cartella).partenza).toBe("v-fisso");
    const { viaggio } = datiValidi("v-fisso");
    expect(esito.proposta.proposta).toEqual(proponiRipianificazione(viaggio, 1, catalogoDiRiferimento(), sorgenteDiRiferimento(), RITARDO_30));
  });

  it("CA-2 con l'azione del modulo si arriva alla pagina della proposta; un ritardo diverso da 15/30/60 è rifiutato", async () => {
    const cartella = nuovaCartella();
    vi.spyOn(process, "cwd").mockReturnValue(cartella);
    const dati = `${cartella}/.data`;
    impostaOrologio(dati, "2026-06-13", "10:30");
    await expect(segnalaRitardoAzione(modulo({ viaggio: "versione-1", minuti: "30" }))).rejects.toThrow("REDIRECT /demo/proposte/1");
    expect(statoSalvato(dati).proposte.at(-1)?.proposta).toEqual(attesaSu(dati));
    await expect(segnalaRitardoAzione(modulo({ viaggio: "versione-1", minuti: "45" }))).rejects.toThrow("REDIRECT /viaggi/versione-1/oggi?errore=ritardo");
    expect(statoSalvato(dati).proposte).toHaveLength(1);
  });
});
