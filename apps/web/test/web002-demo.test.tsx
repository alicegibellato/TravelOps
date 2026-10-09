import { arricchisciSorgente, controllaFattibilita, descriviImprevisto } from "@travelops/engine";
import { afterEach, describe, expect, it, vi } from "vitest";
import { impostaOrologioAzione } from "../app/demo/azioni";
import { messaggioErrore } from "../src/componenti/azioni";
import { ContenutoDemo, ContenutoVersioneElemento, ContenutoVersioneGiorno, ContenutoVersioneViaggio } from "../src/componenti/ContenutiStato";
import { catalogoDiRiferimento, SCENARI, sorgenteDiRiferimento } from "../src/dati/scenari";
import { leggiStato } from "../src/stato/archivio";
import { contestoTesti, inParole } from "../src/testi";
import { accettaProposta, avviaScenario, impostaOrologio } from "../src/stato/operazioni";
import { datiValidi, html, valoriAttributo, voceElemento } from "./supporto";
import { AZIONI_DEMO, comeHtml, frammento, modulo, nuovaCartella, RIPRISTINA, statoSalvato } from "./supporto-stato";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((indirizzo: string) => {
    throw new Error(`REDIRECT ${indirizzo}`);
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("pagina Demo: scenari S1–S8 e orologio simulato", () => {
  it("elenca gli scenari S1–S8 in ordine, con itinerario di partenza e imprevisto descritto dal motore", () => {
    const markup = html(<ContenutoDemo esito={leggiStato(nuovaCartella())} azioni={AZIONI_DEMO} />);
    expect(valoriAttributo(markup, "data-scenario")).toEqual(["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"]);
    const viaggi: Record<string, string> = { S6: "Castello irrinunciabile", S7: "Volo di ritorno", S8: "Volo di ritorno" };
    for (const scenario of SCENARI) {
      const voce = frammento(markup, "data-scenario", scenario.id, "</li>");
      expect(voce).toContain(`<h3>${comeHtml(scenario.titolo)}</h3>`);
      expect(voce).toContain(`<strong>${viaggi[scenario.id] ?? "Itinerario di riferimento"}</strong>`);
      const viaggio = datiValidi(scenario.chiaveViaggio).viaggio;
      // REQ-UX-001 CA-6: la descrizione del motore messa in parole.
      const descrizione = descriviImprevisto(scenario.imprevisto, viaggio, catalogoDiRiferimento());
      expect(voce).toContain(comeHtml(inParole(descrizione, contestoTesti(catalogoDiRiferimento(), [viaggio]))));
    }
    expect(frammento(markup, "data-scenario", "S7", "</li>")).toContain("Cancellazione dello spostamento");
  });

  it("l'orologio simulato parte dal primo giorno del viaggio e si imposta con data e ora", () => {
    const cartella = nuovaCartella();
    let markup = html(<ContenutoDemo esito={leggiStato(cartella)} azioni={AZIONI_DEMO} />);
    expect(markup).toContain("venerdì 12 giugno 2026 alle 08:00");
    expect(markup).toMatch(/<input type="date"[^>]* name="data" value="2026-06-12"\/>/);
    expect(markup).toMatch(/<input type="time"[^>]* name="ora" value="08:00"\/>/);
    impostaOrologio(cartella, "2026-06-14", "17:45");
    markup = html(<ContenutoDemo esito={leggiStato(cartella)} azioni={AZIONI_DEMO} />);
    expect(markup).toContain("domenica 14 giugno 2026 alle 17:45");
    // Avviare uno scenario non cambia l'orologio.
    avviaScenario(cartella, "S1");
    expect(statoSalvato(cartella).orologio).toEqual({ data: "2026-06-14", ora: "17:45" });
  });

  it("un orologio con data o ora non valide non si imposta e la Demo lo segnala", async () => {
    const cartella = nuovaCartella();
    expect(impostaOrologio(cartella, "13/06/2026", "07:30").ok).toBe(false);
    expect(impostaOrologio(cartella, "2026-06-13", "25:00").ok).toBe(false);
    vi.spyOn(process, "cwd").mockReturnValue(cartella);
    await expect(impostaOrologioAzione(modulo({ data: "", ora: "" }))).rejects.toThrow("REDIRECT /demo?errore=orologio");
    const markup = html(<ContenutoDemo esito={leggiStato(cartella)} azioni={AZIONI_DEMO} errore={messaggioErrore("orologio")} />);
    expect(markup).toContain("Orologio non impostato");
    expect(messaggioErrore("sconosciuto")).toBeNull();
  });
});

describe("problemi di fattibilità nella vista giorno, accanto agli elementi coinvolti", () => {
  it("senza scenario in corso la versione 1 non ha problemi", () => {
    const markup = html(<ContenutoVersioneGiorno esito={leggiStato(nuovaCartella())} numero={1} data="2026-06-13" ripristina={RIPRISTINA} />);
    expect(markup).toContain("Nessun problema di fattibilità in questo giorno.");
    expect(markup).not.toContain('data-problema="');
  });

  it("con la pioggia di S1 in corso, il trekking (D2-E2) della versione 1 ha l'avviso METEO_AVVERSO del motore", () => {
    const cartella = nuovaCartella();
    avviaScenario(cartella, "S1");
    const markup = html(<ContenutoVersioneGiorno esito={leggiStato(cartella)} numero={1} data="2026-06-13" ripristina={RIPRISTINA} />);
    const attesi = controllaFattibilita(
      datiValidi("versione-1").viaggio,
      catalogoDiRiferimento(),
      arricchisciSorgente(sorgenteDiRiferimento(), SCENARI[0]!.imprevisto),
    );
    expect(attesi.map((p) => [p.codice, p.gravita, p.elementi])).toEqual([["METEO_AVVERSO", "avviso", ["D2-E2"]]]);
    const riga = voceElemento(markup, "D2-E2");
    expect(riga).toContain('data-problema="METEO_AVVERSO"');
    expect(riga).toContain(comeHtml(inParole(attesi[0]?.messaggio ?? "", contestoTesti(catalogoDiRiferimento(), [datiValidi("versione-1").viaggio]))));
    expect(riga).toContain("elemento--con-problemi");
    expect(voceElemento(markup, "D2-E1")).not.toContain("data-problema");
    expect(markup).toContain('data-problemi-giorno="1"');
  });

  it("dopo l'accettazione di S1 la versione 2 non ha problemi; la 1 resta consultabile con i suoi", () => {
    const cartella = nuovaCartella();
    avviaScenario(cartella, "S1");
    accettaProposta(cartella, 1, "Alice");
    const v2 = html(<ContenutoVersioneGiorno esito={leggiStato(cartella)} numero={2} data="2026-06-13" ripristina={RIPRISTINA} />);
    expect(v2).toContain('data-problemi-giorno="0"');
    const v1 = html(<ContenutoVersioneGiorno esito={leggiStato(cartella)} numero={1} data="2026-06-13" ripristina={RIPRISTINA} />);
    expect(v1).toContain("Versione 1</strong> di 2");
    expect(voceElemento(v1, "D2-E2")).toContain('data-problema="METEO_AVVERSO"');
  });

  it("con la chiusura di S4 il MUSE (D3-E6) ha LUOGO_CHIUSO", () => {
    const cartella = nuovaCartella();
    avviaScenario(cartella, "S4");
    const markup = html(<ContenutoVersioneGiorno esito={leggiStato(cartella)} numero={1} data="2026-06-14" ripristina={RIPRISTINA} />);
    expect(voceElemento(markup, "D3-E6")).toContain('data-problema="LUOGO_CHIUSO"');
  });

  it("accettata la proposta non fattibile di S6, la versione 2 mostra FUORI_ORARIO accanto a D3-E2 e D3-E4", () => {
    const cartella = nuovaCartella();
    avviaScenario(cartella, "S6");
    accettaProposta(cartella, 1, "Alice");
    const stato = statoSalvato(cartella);
    const attesi = controllaFattibilita(stato.storico.versioni[1]!.viaggio, catalogoDiRiferimento(), sorgenteDiRiferimento());
    const markup = html(<ContenutoVersioneGiorno esito={leggiStato(cartella)} numero={2} data="2026-06-14" ripristina={RIPRISTINA} />);
    expect(markup).toContain(`data-problemi-giorno="${attesi.length}"`);
    for (const problema of attesi) {
      for (const id of problema.elementi) {
        expect(voceElemento(markup, id)).toContain(`data-problema="${problema.codice}"`);
      }
    }
    expect(attesi.filter((p) => p.codice === "FUORI_ORARIO").map((p) => p.elementi)).toEqual([["D3-E2"], ["D3-E4"]]);
  });
});

describe("viste di una versione", () => {
  it("la vista viaggio della versione 2 porta ai giorni della versione 2; il dettaglio di N1 è consultabile", () => {
    const cartella = nuovaCartella();
    avviaScenario(cartella, "S1");
    accettaProposta(cartella, 1, "Alice");
    const viaggio = html(<ContenutoVersioneViaggio esito={leggiStato(cartella)} numero={2} ripristina={RIPRISTINA} />);
    expect(viaggio).toContain('href="/versioni/2/giorni/2026-06-13"');
    expect(viaggio).toContain("Weekend sul Garda");
    const elemento = html(<ContenutoVersioneElemento esito={leggiStato(cartella)} numero={2} id="N1" ripristina={RIPRISTINA} />);
    expect(elemento).toContain("Visita al MAG");
    expect(elemento).toContain('href="/versioni/2/giorni/2026-06-13"');
    const inesistente = html(<ContenutoVersioneViaggio esito={leggiStato(cartella)} numero={7} ripristina={RIPRISTINA} />);
    expect(inesistente).toContain("Questa versione non esiste");
  });
});
