// @vitest-environment jsdom
/**
 * ST-UX-004A (REQ-UX-004): note «Da sapere» raggruppate (CA-2), cronologia leggibile delle revisioni (CA-3),
 * spiegazione breve delle proposte (CA-4) e ritardo senza effetto come nota informativa (CA-5), sulla web app.
 */
import { describe, expect, it } from "vitest";
import { PaginaProposta } from "../src/componenti/PaginaProposta";
import { catalogoDiRiferimento } from "../src/dati/scenari";
import { segnalaRitardo } from "../src/oggi/operazioni";
import { accettaProposta, impostaOrologio } from "../src/stato/operazioni";
import { statoProposta } from "../src/viste/demo";
import { vistaProposta } from "../src/viste/proposta";
import { html } from "./supporto";
import { montaBozza, nuovaBozza, premiEAttendi, pulsanteIn } from "./supporto-bozza";
import { AZIONI_PROPOSTA, nuovaCartella, statoSalvato } from "./supporto-stato";

const CODICI = /\bD\d+-E\d+\b|\bN\d+\b|\b[A-Z]{3,}_[A-Z_]{3,}\b|\bB\d+\b/;
const frasi = (testo: string): string[] => testo.split(/(?<=[.!?])\s+/).filter((f) => f !== "");

describe("CA-2 «Da sapere» raggruppa le note uguali", () => {
  it("gli orari non verificati compaiono una sola volta, con l'elenco dei luoghi", () => {
    const { vista } = nuovaBozza();
    const orari = vista.avvisi.filter((a) => a.includes("non sono verificati"));
    expect(orari).toHaveLength(1);
    expect(orari[0]).toMatch(/: .+, .+/);
    expect(new Set(vista.avvisi).size).toBe(vista.avvisi.length);
    for (const avviso of vista.avvisi) expect(avviso).not.toMatch(CODICI);
  });
});

describe("CA-3 revisioni con etichette leggibili", () => {
  it("la cronologia mostra etichette e cause in parole, senza B1…Bn", async () => {
    const bozza = nuovaBozza();
    const pagina = montaBozza(bozza);
    const data = bozza.vista.date[1]!.valore;
    expect(pagina.textContent).toContain("Cronologia della bozza");
    expect(pagina.textContent).toContain("Ultima modifica: Bozza iniziale");
    await premiEAttendi(pulsanteIn(pagina.querySelector(`[data-data='${data}']`)!, "Giornata più leggera"));
    const rivista = bozza.servizio.vista(bozza.viaggioId);
    expect(rivista?.revisioni.map((r) => r.etichetta)).toEqual(["Bozza iniziale", expect.stringMatching(/^Più leggera /)]);
    expect(pagina.textContent).toMatch(/Ultima modifica: Più leggera /);
    expect(pagina.textContent).not.toMatch(/\bB\d+\b/);
    const voci = [...pagina.querySelectorAll(".bozza__revisioni li")].map((li) => li.textContent ?? "");
    expect(voci).toHaveLength(2);
    expect(voci[1]).toMatch(/^Più leggera .+ · Giornata del .+ più leggera/);
  });
});

describe("CA-4 e CA-5 proposte di ripianificazione", () => {
  const ripiano = (ora: string, minuti: number) => {
    const cartella = nuovaCartella();
    expect(impostaOrologio(cartella, "2026-06-13", ora).ok).toBe(true);
    const esito = segnalaRitardo(cartella, "versione-1", minuti);
    if (!esito.ok) throw new Error(esito.messaggio);
    return { cartella, salvata: esito.proposta, vista: vistaProposta(esito.proposta, statoSalvato(cartella), catalogoDiRiferimento()) };
  };

  it("CA-4 il riepilogo è di al massimo 3 frasi, senza codici; i dettagli sono espandibili", () => {
    const { vista } = ripiano("10:30", 30);
    expect(frasi(vista.riepilogo).length).toBeLessThanOrEqual(3);
    expect(vista.riepilogo).not.toMatch(CODICI);
    expect(vista.spiegazione.length).toBeGreaterThan(3);
    const markup = html(<PaginaProposta vista={vista} azioni={AZIONI_PROPOSTA} />);
    expect(markup).toContain("data-riepilogo");
    expect(markup).toMatch(/<details class="spiegazione__dettagli"><summary>Mostra i dettagli<\/summary>/);
    expect(markup.replace(/<details[\s\S]*?<\/details>/g, "").replace(/<[^>]*>/g, " ")).not.toMatch(CODICI);
  });

  it("CA-4 una proposta salvata senza riepilogo ne ricava uno breve dalla spiegazione", () => {
    const { salvata, cartella } = ripiano("10:30", 30);
    const { riepilogo: _tolto, ...senza } = salvata.proposta;
    const vista = vistaProposta({ ...salvata, proposta: senza as typeof salvata.proposta }, statoSalvato(cartella), catalogoDiRiferimento());
    expect(frasi(vista.riepilogo).length).toBeLessThanOrEqual(3);
    expect(vista.riepilogo.length).toBeGreaterThan(10);
  });

  it("CA-5 un ritardo che non cambia nessuna attività è una nota informativa, senza Accetta", () => {
    const { cartella, salvata, vista } = ripiano("23:00", 15);
    expect(salvata.proposta.informativa).toBe(true);
    expect(vista.informativa).toBe(true);
    expect(vista.decidibile).toBe(false);
    expect(vista.riepilogo).toMatch(/Nessuna attività cambia/);
    const markup = html(<PaginaProposta vista={vista} azioni={AZIONI_PROPOSTA} />);
    expect(markup).not.toContain(">Accetta<");
    expect(markup).not.toContain(">Rifiuta<");
    expect(markup).toContain("data-informativa");
    expect(statoProposta(salvata)).toBe("Solo informazione, nessuna modifica");
    // Nemmeno forzando l'azione la nota diventa una nuova versione.
    const accettata = accettaProposta(cartella, salvata.id, "Alice");
    expect(accettata.ok).toBe(false);
    expect(statoSalvato(cartella).storico.versioni).toHaveLength(1);
  });

  it("CA-5 un ritardo che sposta qualcosa resta una proposta con Accetta", () => {
    const { vista } = ripiano("10:30", 60);
    expect(vista.informativa).toBe(false);
    expect(vista.decidibile).toBe(true);
    const markup = html(<PaginaProposta vista={vista} azioni={AZIONI_PROPOSTA} />);
    expect(markup).toContain(">Accetta<");
  });
});
