/**
 * ST-OBS-001B (REQ-OBS-001, CA-3 e CA-4 parte tracce): la pagina «Cosa hanno fatto gli agenti» mostra, per
 * conversazione e per viaggio, le tracce runtime di REQ-ORCH-002 (agente, strumento, input riassunto, esito, durata),
 * raggruppate per risposta con la domanda del viaggiatore; senza tracce lo dice. Controllo di accessibilità con axe.
 */
import axe from "axe-core";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import {
  conversazioniTracciate,
  creaConversazione,
  elencaViaggi,
  salvaTracceAgenti,
  tracceDelViaggio,
  tracceDellaConversazione,
  type BaseDati,
  type VoceTracciaAgenti,
} from "../src/basedati";
import { PaginaAgenti, type SelezioneAgenti } from "../src/componenti/PaginaAgenti";
import { usaBaseDati } from "../src/stato/avvio";
import { nuovaCartella } from "./supporto-stato";
import { paginaCompleta } from "./supporto-ux";

const voce = (parziale: Partial<VoceTracciaAgenti>): VoceTracciaAgenti => ({
  tipo: "strumento",
  agente: "consulente",
  input: "{}",
  esito: "ok",
  durataMs: 120,
  inizio: "2026-10-10T08:00:00.000Z",
  ...parziale,
});

/** Due conversazioni: una sul primo viaggio (due risposte, un errore) e una senza viaggio. */
function semina(db: BaseDati): { viaggio: string; conViaggio: number; senzaViaggio: number } {
  const viaggio = elencaViaggi(db)[0]?.id;
  if (viaggio === undefined) throw new Error("nessun viaggio nella base dati");
  const conViaggio = creaConversazione(db, viaggio);
  salvaTracceAgenti(db, conViaggio, "Vorrei un weekend al lago", [
    voce({ tipo: "delega", agente: "consulente", input: "Vuole partire", dettaglio: "modo: modello", durataMs: 800 }),
    voce({ strumento: "leggi_viaggio", input: '{"versione":null}', durataMs: 35, inizio: "2026-10-10T08:00:01.000Z" }),
  ]);
  salvaTracceAgenti(db, conViaggio, "Aggiungi un museo", [
    voce({ agente: "logistica", strumento: "cerca_attivita", input: '{"tipo":"museo"}', esito: "errore", dettaglio: "catalogo non disponibile", durataMs: 2400, inizio: "2026-10-10T09:00:00.000Z" }),
  ]);
  const senzaViaggio = creaConversazione(db, null);
  salvaTracceAgenti(db, senzaViaggio, "Ciao", [voce({ tipo: "delega", input: "Saluto", inizio: "2026-10-10T07:00:00.000Z" })]);
  return { viaggio, conViaggio, senzaViaggio };
}

const html = (elenco: Parameters<typeof PaginaAgenti>[0]["elenco"], selezione: SelezioneAgenti): string =>
  paginaCompleta(<PaginaAgenti elenco={elenco} selezione={selezione} fuso="UTC" />, { titolo: "Cosa hanno fatto gli agenti" });
const documento = (markup: string): Document => new JSDOM(markup).window.document;

describe("lettura delle tracce (CA-3, CA-4)", () => {
  it("elenca le conversazioni con tracce dalla più recente, con risposte, voci ed errori", () => {
    usaBaseDati(nuovaCartella(), (db) => {
      const { viaggio, conViaggio, senzaViaggio } = semina(db);
      expect(conversazioniTracciate(db)).toEqual([
        { conversazioneId: conViaggio, viaggioId: viaggio, risposte: 2, voci: 3, errori: 1, ultima: "2026-10-10T09:00:00.000Z" },
        { conversazioneId: senzaViaggio, viaggioId: null, risposte: 1, voci: 1, errori: 0, ultima: "2026-10-10T07:00:00.000Z" },
      ]);
    });
  });

  it("senza tracce l'elenco è vuoto", () => {
    usaBaseDati(nuovaCartella(), (db) => {
      creaConversazione(db, null);
      expect(conversazioniTracciate(db)).toEqual([]);
    });
  });
});

describe("pagina «Cosa hanno fatto gli agenti» (CA-3)", () => {
  const dati = usaBaseDati(nuovaCartella(), (db) => {
    const s = semina(db);
    return { ...s, elenco: conversazioniTracciate(db), conversazione: tracceDellaConversazione(db, s.conViaggio), delViaggio: tracceDelViaggio(db, s.viaggio) };
  });

  it("senza tracce dice chiaramente che non c'è ancora nulla e come generarle", () => {
    const d = documento(html([], { tipo: "nessuna" }));
    expect(d.querySelector("[data-stato]")?.getAttribute("data-stato")).toBe("vuoto");
    expect(d.querySelector("h1")?.textContent).toBe("Gli agenti non hanno ancora fatto nulla");
    expect(d.body.textContent).toContain("chat di Pianifica");
  });

  it("l'elenco porta a ogni conversazione e alle tracce del viaggio", () => {
    const d = documento(html(dati.elenco, { tipo: "nessuna" }));
    expect([...d.querySelectorAll("h1")].map((h) => h.textContent)).toEqual(["Cosa hanno fatto gli agenti"]);
    const voci = [...d.querySelectorAll("li[data-conversazione]")];
    expect(voci.map((v) => v.getAttribute("data-conversazione"))).toEqual([String(dati.conViaggio), String(dati.senzaViaggio)]);
    expect(voci[0]?.querySelector("a")?.getAttribute("href")).toBe(`/agenti?conversazione=${dati.conViaggio}`);
    expect(voci[0]?.textContent).toContain("2 risposte · 3 voci · 1 errore");
    expect(voci[0]?.querySelector(".agenti__viaggio")?.getAttribute("href")).toBe(`/agenti?viaggio=${encodeURIComponent(dati.viaggio)}`);
    expect(voci[1]?.querySelector(".agenti__viaggio")).toBeNull();
    expect(d.body.textContent).toContain("Scegli una conversazione");
  });

  it("per conversazione: una sezione per risposta con la domanda e agente, strumento, input, esito, durata", () => {
    const d = documento(html(dati.elenco, { tipo: "conversazione", id: dati.conViaggio, risposte: dati.conversazione }));
    expect(d.querySelector(`li[data-conversazione="${dati.conViaggio}"] a`)?.getAttribute("aria-current")).toBe("page");
    const risposte = [...d.querySelectorAll("[data-risposta]")];
    expect(risposte.map((r) => r.querySelector("h3")?.textContent)).toEqual(["Risposta 1", "Risposta 2"]);
    expect(risposte[0]?.querySelector(".agenti__domanda")?.textContent).toContain("Vorrei un weekend al lago");
    const celle = (riga: Element | null | undefined) => [...(riga?.querySelectorAll("td") ?? [])].map((c) => c.textContent);
    const righe = [...(risposte[0]?.querySelectorAll("tbody tr") ?? [])];
    expect(celle(righe[0]).slice(0, 5)).toEqual(["Delega", "consulente", "—", "Vuole partiremodo: modello", "Riuscita"]);
    expect(righe[0]?.querySelector('[data-etichetta="Durata"]')?.textContent).not.toBe("");
    expect(celle(righe[1]).slice(0, 5)).toEqual(["Strumento", "consulente", "leggi_viaggio", '{"versione":null}', "Riuscita"]);
    const errore = risposte[1]?.querySelector('tr[data-esito="errore"]');
    expect(celle(errore).slice(0, 5)).toEqual(["Strumento", "logistica", "cerca_attivita", '{"tipo":"museo"}catalogo non disponibile', "Errore"]);
  });

  it("per viaggio: tutte le risposte delle sue conversazioni, con il numero della conversazione", () => {
    const d = documento(html(dati.elenco, { tipo: "viaggio", id: dati.viaggio, risposte: dati.delViaggio }));
    expect(d.querySelector("#agenti-dettaglio")?.textContent).toBe(`Viaggio ${dati.viaggio}`);
    expect([...d.querySelectorAll("[data-risposta] h3")].map((h) => h.textContent)).toEqual([
      `Conversazione ${dati.conViaggio}, risposta 1`,
      `Conversazione ${dati.conViaggio}, risposta 2`,
    ]);
  });

  it("una conversazione o un viaggio senza tracce lo dicono", () => {
    const d = documento(html(dati.elenco, { tipo: "viaggio", id: "nessuno", risposte: [] }));
    expect(d.querySelector('[data-stato="senza-tracce"]')?.textContent).toBe("Nessuna traccia per questo viaggio.");
  });

  async function violazioniGravi(markup: string): Promise<string[]> {
    const dom = new JSDOM(markup, { runScripts: "outside-only" });
    dom.window.eval(axe.source);
    const axeNellaPagina = (dom.window as unknown as { axe: typeof axe }).axe;
    const risultato = await axeNellaPagina.run(dom.window.document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] },
      rules: { "color-contrast": { enabled: false } },
    });
    dom.window.close();
    return risultato.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
  }

  it("axe non trova violazioni gravi: vuota, elenco, conversazione e viaggio", async () => {
    for (const markup of [
      html([], { tipo: "nessuna" }),
      html(dati.elenco, { tipo: "nessuna" }),
      html(dati.elenco, { tipo: "conversazione", id: dati.conViaggio, risposte: dati.conversazione }),
      html(dati.elenco, { tipo: "viaggio", id: dati.viaggio, risposte: dati.delViaggio }),
    ]) {
      expect(await violazioniGravi(markup)).toEqual([]);
    }
  });
});
