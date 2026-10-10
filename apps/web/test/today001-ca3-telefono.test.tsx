// @vitest-environment jsdom
/**
 * ST-TODAY-001, CA-3 di REQ-TODAY-001: su telefono "Oggi" è la scheda iniziale di un viaggio in corso.
 * La vista viaggio di un viaggio in corso usa il layout delle pagine di viaggio con la scheda "Oggi" aperta all'inizio;
 * qui il comportamento delle schede nel DOM (jsdom); pagina, CSS e accessibilità in `today001-ca3-pagina.test.tsx`.
 */
import { act } from "react";
import { describe, expect, it } from "vitest";
import { ContenutoViaggioInCorso } from "../src/componenti/ContenutiOggi";
import { datiOggi, type DatiOggi } from "../src/oggi/operazioni";
import { impostaOrologio } from "../src/stato/operazioni";
import { datiValidi } from "./supporto";
import { monta, preparaChat } from "./supporto-chat";
import { nuovaCartella } from "./supporto-stato";

preparaChat();

const nessuna = (): void => undefined;

function datiAlle(data: string, ora: string): DatiOggi {
  const cartella = nuovaCartella();
  impostaOrologio(cartella, data, ora);
  const dati = datiOggi(cartella, "versione-1");
  if (dati === null) throw new Error("viaggio mancante");
  return dati;
}

function scheda(vista: HTMLElement, etichetta: string): HTMLButtonElement {
  const trovata = [...vista.querySelectorAll<HTMLButtonElement>(".ui-schede-basso__voce")].find((b) => b.textContent === etichetta);
  if (trovata === undefined) throw new Error(`scheda ${etichetta} assente`);
  return trovata;
}

const attivo = (vista: HTMLElement, riquadro: string) => vista.querySelector(`.ui-layout-viaggio__riquadro[data-riquadro="${riquadro}"]`)?.getAttribute("data-attivo");

describe("CA-3 su telefono Oggi è la scheda iniziale di un viaggio in corso", () => {
  it("CA-3 viaggio in corso (2026-06-13 alle 10:30): all'apertura la scheda «Oggi» è quella attiva", () => {
    const vista = monta(<ContenutoViaggioInCorso chiave="versione-1" esito={datiValidi("versione-1")} dati={datiAlle("2026-06-13", "10:30")} azioni={{ segnalaRitardo: nessuna }} />);
    expect([...vista.querySelectorAll(".ui-schede-basso__voce")].map((b) => b.textContent)).toEqual(["Itinerario", "Mappa", "Oggi"]);
    expect(scheda(vista, "Oggi").getAttribute("aria-pressed")).toBe("true");
    expect(scheda(vista, "Itinerario").getAttribute("aria-pressed")).toBe("false");
    expect([attivo(vista, "oggi"), attivo(vista, "itinerario"), attivo(vista, "mappa")]).toEqual(["true", "false", "false"]);
    expect(vista.querySelector('[data-riquadro="oggi"] [data-scheda="adesso"]')).not.toBeNull();
    expect(vista.querySelector('[data-riquadro="oggi"] [data-scheda="dopo"]')).not.toBeNull();
  });

  it("CA-3 dalla scheda «Oggi» si passa all'itinerario e alla mappa", () => {
    const vista = monta(<ContenutoViaggioInCorso chiave="versione-1" esito={datiValidi("versione-1")} dati={datiAlle("2026-06-13", "10:30")} azioni={{ segnalaRitardo: nessuna }} />);
    act(() => scheda(vista, "Itinerario").click());
    expect([attivo(vista, "oggi"), attivo(vista, "itinerario")]).toEqual(["false", "true"]);
    act(() => scheda(vista, "Mappa").click());
    expect(attivo(vista, "mappa")).toBe("true");
  });
});
