/**
 * REQ-CHAT-002 (ST-CHAT-002), lato agenti: correzioni dal collaudo con il modello vero.
 *
 * - CA-1 con il profilo già compilato dai filtri e nessun viaggio, «Crea la mia bozza» porta a una bozza: leggi_viaggio
 *   mostra il profilo raccolto e il Consulente prepara la destinazione e genera la bozza senza chiedere di nuovo;
 * - CA-3 «sostituisci» su un viaggio confermato è una sola proposta, con l'attività tolta e quella nuova;
 * - CA-5 le istruzioni chiedono risposte brevi quando il programma è accanto alla chat.
 * Client del modello finto, nessuna rete.
 */
import { describe, expect, it } from "vitest";
import {
  AGENTI,
  creaArchivioInMemoria,
  creaClienteFinto,
  creaStrumentiMotore,
  REGOLE_COMUNI,
  rispondiAlMessaggioCompleto,
  type BozzaProfilo,
} from "../../src/index.js";
import { archivioViaggioConfermato } from "./supporto.js";
import { sorgenteRegistrata } from "../strumenti/supporto.js";

/** Il profilo come lo salva il percorso guidato scegliendo la scheda «Roma». */
const PROFILO_DAI_FILTRI: BozzaProfilo = {
  destinazione: { tipo: "luogo", nome: "Roma", riferimento: "roma-2026-10-09" },
  date: { tipo: "precise", inizio: "2026-10-16", fine: "2026-10-18" },
  viaggiatori: { adulti: 2, bambini: [] },
  stili: ["cultura", "gastronomia"],
  ritmo: "bilanciato",
  formaFisica: "moderato",
  pasti: { pranzo: true, cena: true },
};

const chiamata = (id: string, nome: string, argomenti: unknown) => ({ chiamate: [{ id, nome, argomenti }] });

describe("REQ-CHAT-002 CA-1 il profilo dei filtri è visto dagli agenti", () => {
  it("leggi_viaggio senza viaggio mostra il profilo raccolto e dice di non chiederlo di nuovo", async () => {
    const archivio = creaArchivioInMemoria({ profilo: PROFILO_DAI_FILTRI });
    const leggi = creaStrumentiMotore({ archivio, sorgente: sorgenteRegistrata() }).find((s) => s.definizione.nome === "leggi_viaggio");
    const letto = (await leggi?.esegui({ versione: null }, {} as never)) as { esiste: boolean; profilo?: BozzaProfilo; messaggio: string };
    expect(letto).toMatchObject({ esiste: false, profilo: { destinazione: { nome: "Roma" } } });
    expect(letto.messaggio).toMatch(/non chiederle di nuovo/);
  });

  it("«Crea la mia bozza» dai filtri: il Consulente legge il viaggio, prepara Roma e genera la bozza", async () => {
    const archivio = creaArchivioInMemoria({ profilo: PROFILO_DAI_FILTRI });
    const cliente = creaClienteFinto({
      versione: 1,
      turni: [
        { atteso: {}, risposta: chiamata("c1", "leggi_viaggio", { versione: null }) },
        { atteso: {}, risposta: chiamata("c2", "cerca_destinazione", { testo: "Roma" }) },
        { atteso: {}, risposta: chiamata("c3", "prepara_destinazione", { areaId: "osm:relation/41485", testo: "Roma" }) },
        { atteso: {}, risposta: chiamata("c4", "genera_bozza", {}) },
        { atteso: {}, risposta: { testo: "Ecco la bozza per Roma: cultura e buon cibo, ritmo bilanciato. La trovi qui accanto." } },
      ],
    });
    const { eventi, fine } = await rispondiAlMessaggioCompleto({
      cliente,
      archivio,
      sorgente: sorgenteRegistrata(),
      conversazione: [],
      messaggio: "Ho compilato le preferenze con i filtri (le trovi già salvate): prepara la destinazione e crea la mia bozza.",
    });
    cliente.verificaCompletata();
    expect(eventi[0]).toMatchObject({ tipo: "agente", agente: "consulente" });
    expect(eventi.filter((e) => e.tipo === "strumento_fallito")).toEqual([]);
    expect(fine.chiamate.map((c) => c.nome)).toEqual(["leggi_viaggio", "cerca_destinazione", "prepara_destinazione", "genera_bozza"]);
    expect(archivio.contenuto().revisioni).toHaveLength(1);
    // Il profilo dei filtri non è stato chiesto né cambiato.
    expect(archivio.contenuto().profilo).toMatchObject({ stili: ["cultura", "gastronomia"], ritmo: "bilanciato" });
  });
});

describe("REQ-CHAT-002 CA-3 sostituisci su un viaggio confermato", () => {
  it("una sola proposta: l'attività tolta e quella nuova, alla stessa ora", async () => {
    const archivio = archivioViaggioConfermato();
    const strumenti = creaStrumentiMotore({ archivio, sorgente: sorgenteRegistrata() });
    // Il trekking di sabato mattina (D2-E2 della variante V-VOLO), al posto della visita al MAG.
    const trekking = { id: "D2-E2", attivita: "Trekking sul Sentiero del Ponale" };
    const proponi = strumenti.find((s) => s.definizione.nome === "proponi_modifica");
    const proposta = (await proponi?.esegui(
      { operazione: "sostituisci", elementoId: trekking?.id, attivitaId: "A-MAG", data: null, inizio: null, priorita: null, orarioFisso: null },
      {} as never,
    )) as { propostaId: number; cambiamenti: { aggiunti: { attivita?: string; dalle: string }[]; rimossi: { attivita?: string }[] } };
    expect(proposta.propostaId).toBe(1);
    expect(proposta.cambiamenti.rimossi.map((r) => r.attivita)).toContain(trekking?.attivita);
    expect(proposta.cambiamenti.aggiunti.some((a) => a.attivita === "Visita al MAG")).toBe(true);
    expect(archivio.contenuto().proposte).toHaveLength(1);
    expect(archivio.contenuto().storico?.versioni).toHaveLength(1);
  });

  it("sostituisci senza attività nuova o con un elemento che non c'è: errore che il modello può correggere", async () => {
    const strumenti = creaStrumentiMotore({ archivio: archivioViaggioConfermato(), sorgente: sorgenteRegistrata() });
    const proponi = strumenti.find((s) => s.definizione.nome === "proponi_modifica");
    const vuoti = { data: null, inizio: null, priorita: null, orarioFisso: null };
    await expect(proponi?.esegui({ operazione: "sostituisci", elementoId: "D2-E2", attivitaId: null, ...vuoti }, {} as never)).rejects.toThrow(/attivitaId/);
    await expect(proponi?.esegui({ operazione: "sostituisci", elementoId: "NESSUNO", attivitaId: "A-MAG", ...vuoti }, {} as never)).rejects.toThrow(/non è un'attività/);
  });
});

describe("REQ-CHAT-002 CA-5 risposte brevi accanto alla bozza", () => {
  it("le regole comuni e il Consulente chiedono di non ripetere il programma giorno per giorno", () => {
    expect(REGOLE_COMUNI).toMatch(/senza ripetere il programma giorno per giorno/);
    expect(AGENTI.consulente.istruzioni).toMatch(/in 2 o 3 frasi/);
    expect(AGENTI.consulente.istruzioni).not.toMatch(/giorno per giorno con i nomi/);
    expect(AGENTI.planner.istruzioni).toMatch(/operazione sostituisci/);
  });
});
