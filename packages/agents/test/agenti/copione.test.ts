/**
 * CA-1 (REQ-ORCH-001 revisione 2, ST-ORCH-001C): con il client finto, i prompt del copione della demo (CR-001 §10)
 * producono le chiamate agli strumenti attese. Le risposte del modello sono conversazioni registrate scritte a mano
 * (`conversazioni/*.json`); orchestratore, agenti, strumenti e motore sono quelli veri, sulle istantanee precaricate e
 * sul viaggio V-VOLO dei dati di riferimento. Rete bloccata (CA-5) e controllo dei nomi su ogni risposta (CA-2).
 */
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AGENTI, creaArchivioInMemoria, type EventoChat } from "../../src/index.js";
import { archivioViaggioConfermato, datiDi, eseguiCopione, SABATO_MATTINA, type EsitoMessaggio } from "./supporto.js";

const tentativi: string[] = [];
const blocca = (nome: string) => (): never => {
  tentativi.push(nome);
  throw new Error(`rete bloccata nei test: ${nome}`);
};

beforeEach(() => {
  tentativi.length = 0;
  vi.stubGlobal("fetch", blocca("fetch"));
  vi.spyOn(net.Socket.prototype, "connect").mockImplementation(blocca("net.Socket.connect"));
  vi.spyOn(http, "request").mockImplementation(blocca("http.request"));
  vi.spyOn(https, "request").mockImplementation(blocca("https.request"));
  vi.spyOn(dns, "lookup").mockImplementation(blocca("dns.lookup"));
});

afterEach(() => {
  expect(tentativi).toEqual([]);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const tipi = (eventi: readonly EventoChat[]): string[] => eventi.map((e) => e.tipo);

/** Le verifiche comuni a ogni messaggio del copione. */
function verificaMessaggio(esito: EsitoMessaggio, agente: string, strumenti: readonly string[]): void {
  expect(esito.agente, esito.messaggio).toBe(agente);
  expect(esito.strumenti, esito.messaggio).toEqual(strumenti);
  expect(esito.eventi[0]).toMatchObject({ tipo: "agente", agente });
  expect(esito.fine.motivo, esito.messaggio).toBe("completata");
  // Nessuno strumento è fallito e nessuna risposta è stata sostituita dal controllo dei nomi (CA-2).
  expect(tipi(esito.eventi), esito.messaggio).not.toContain("strumento_fallito");
  expect(tipi(esito.eventi), esito.messaggio).not.toContain("testo_corretto");
  expect(esito.fine.messaggiNuovi[0]).toEqual({ ruolo: "utente", testo: esito.messaggio });
}

const PROMPT = {
  1: "Ciao! Vorrei organizzare 4 giorni sul Lago di Garda dal 12 al 15 giugno con la mia compagna. Ci piacciono la natura e il buon vino, vogliamo un ritmo rilassato e niente levatacce. Budget medio.",
  2: "Forma fisica normale, e sì, mettici anche le cene. Crea pure la bozza.",
  3: "Siamo 3 amici, vogliamo una cosa wild in montagna, 5 giorni ad agosto. Camminiamo tanto e la fatica non ci spaventa, budget basso. Sorprendici tu!",
  "3b": "Andiamo in Val di Fassa.",
  4: "Weekend lungo a Roma a ottobre con due bambini di 6 e 9 anni. Niente musei lunghissimi, ci serve la pausa pranzo e la sera vogliamo stare in hotel.",
  "4b": "4 giorni a Lisbona a maggio in coppia, ci piacciono i musei e mangiare bene, ritmo normale.",
  5: "Il secondo giorno è troppo pieno, alleggeriscilo.",
  6: "Sostituisci il museo con qualcosa all'aperto.",
  7: "Questa degustazione non la togliere per nessun motivo.",
  8: "Scambia il terzo giorno con il secondo.",
  9: "Mostrami un'alternativa per tutto il viaggio.",
  10: "Torna alla versione di prima.",
  11: "Perfetto, confermo l'itinerario!",
  12: "Sta piovendo fortissimo, che facciamo stamattina?",
  13: "Mi sono slogato una caviglia, per due giorni niente camminate impegnative.",
  14: "Si è bucata una gomma, ci vorranno due ore.",
  15: "Stiamo benissimo qui, vorremmo restare un giorno in più.",
  16: "Il volo di ritorno è stato cancellato!",
  17: "Mi hanno rubato il portafoglio con la carta d'identità.",
  18: "Oggi siamo distrutti, facciamo meno cose.",
  19: "Sono in ritardo di 30 minuti.",
} as const;

describe("CA-1 Atti 1 e 2 sul Lago di Garda: dal racconto alla conferma", () => {
  it("prompt 1-2 (Consulente) e 5-11 (Planner) producono le chiamate attese e cambiano il viaggio solo con gli strumenti", async () => {
    const archivio = creaArchivioInMemoria();
    const atto1 = await eseguiCopione({ file: "atto-1-garda.json", messaggi: [PROMPT[1], PROMPT[2]], archivio });
    const [p1, p2] = atto1.esiti as [EsitoMessaggio, EsitoMessaggio];

    // Prompt 1: profilo, destinazione pronta, al massimo 2 domande, nessuna bozza.
    verificaMessaggio(p1, "consulente", ["aggiorna_profilo", "cerca_destinazione", "prepara_destinazione"]);
    expect(p1.eventi[0]).toMatchObject({ modo: "regole" });
    expect(datiDi(p1, "azione", "aggiorna_profilo")[0]).toMatchObject({ profilo: { stili: ["natura", "gastronomia"], ritmo: "lento", budget: "€€" } });
    expect(datiDi(p1, "azione", "prepara_destinazione")[0]).toMatchObject({ pronta: true, istantaneaId: "garda-2026-10-09" });
    expect(p1.eventi.filter((e) => e.tipo === "passo").map((e) => (e as { testo: string }).testo)).toEqual([
      "Aggiorno le preferenze…",
      "Cerco la destinazione…",
      "Sto esplorando la destinazione…",
    ]);
    expect((p1.fine.testo.match(/\?/g) ?? []).length).toBeLessThanOrEqual(2);
    expect(datiDi(p1, "azione", "genera_bozza")).toEqual([]);

    // Prompt 2: profilo completato e prima bozza di 4 giorni.
    verificaMessaggio(p2, "consulente", ["aggiorna_profilo", "genera_bozza"]);
    const bozza = datiDi(p2, "azione", "genera_bozza")[0];
    expect(bozza).toMatchObject({ revisione: 1, fattibile: true, dal: "2026-06-12", al: "2026-06-15" });
    expect(bozza.giorni).toHaveLength(4);
    expect(bozza.giorni.every((g: { perche?: string }) => typeof g.perche === "string")).toBe(true);
    expect(JSON.stringify(bozza)).toContain("Degustazione");

    const atto2 = await eseguiCopione({
      file: "atto-2-garda.json",
      messaggi: [PROMPT[5], PROMPT[6], PROMPT[7], PROMPT[8], PROMPT[9], PROMPT[10], PROMPT[11]],
      archivio,
      conversazione: atto1.conversazione,
      ultimoAgente: "consulente",
    });
    const [p5, p6, p7, p8, p9, p10, p11] = atto2.esiti as EsitoMessaggio[] as [EsitoMessaggio, EsitoMessaggio, EsitoMessaggio, EsitoMessaggio, EsitoMessaggio, EsitoMessaggio, EsitoMessaggio];
    verificaMessaggio(p5, "planner", ["modifica_bozza"]);
    expect(datiDi(p5, "azione", "modifica_bozza")[0]).toMatchObject({ applicata: true, revisione: 2 });
    verificaMessaggio(p6, "planner", []); // nessun museo nella bozza: una domanda, nessuna ipotesi
    verificaMessaggio(p7, "planner", ["modifica_bozza", "aggiorna_profilo"]);
    expect(datiDi(p7, "azione", "modifica_bozza")[0].cambiamenti.modificati[0].dopo).toMatchObject({ attivita: "Degustazione: Fra' Luca", priorita: "irrinunciabile" });
    verificaMessaggio(p8, "planner", []); // limite dichiarato: niente scambio di giornate intere
    verificaMessaggio(p9, "planner", ["genera_alternativa"]);
    const alternativa = datiDi(p9, "azione", "genera_alternativa")[0];
    expect(alternativa).toMatchObject({ revisione: 4, fattibile: true });
    expect(alternativa.tolte).not.toContain("Degustazione: Fra' Luca"); // la degustazione bloccata resta
    expect(JSON.stringify(alternativa.giorni)).toContain("Degustazione: Fra' Luca");
    verificaMessaggio(p10, "planner", []); // limite dichiarato: si torna indietro con "Annulla"
    verificaMessaggio(p11, "planner", ["conferma_viaggio"]);
    expect(datiDi(p11, "azione", "conferma_viaggio")[0]).toMatchObject({ confermato: true, versione: 1 });

    const { scheda, revisioni, storico } = archivio.contenuto();
    expect(scheda).toMatchObject({ stato: "confermato", istantaneaId: "garda-2026-10-09" });
    expect(revisioni.map((r) => r.causa)).toEqual(["Prima bozza", expect.stringMatching(/^Modifica: /), expect.stringMatching(/^Modifica: /), "Alternativa"]);
    expect(storico?.versioni).toHaveLength(1);
  });
});

describe("CA-1 Atto 1, nuovi viaggi", () => {
  it("prompt 3 e 3b: sorprendimi propone 3 destinazioni, poi la Val di Fassa diventa una bozza", async () => {
    const archivio = creaArchivioInMemoria();
    const { esiti } = await eseguiCopione({ file: "atto-1-sorprendimi.json", messaggi: [PROMPT[3], PROMPT["3b"]], archivio });
    const [p3, p3b] = esiti as [EsitoMessaggio, EsitoMessaggio];
    verificaMessaggio(p3, "consulente", ["aggiorna_profilo", "proponi_destinazioni"]);
    const proposte = datiDi(p3, "risultato", "proponi_destinazioni")[0];
    expect(proposte.destinazioni).toHaveLength(3);
    expect(proposte.destinazioni[0]).toMatchObject({ destinazione: "Dolomiti – Val di Fassa" });
    verificaMessaggio(p3b, "consulente", ["prepara_destinazione", "genera_bozza"]);
    expect(datiDi(p3b, "azione", "genera_bozza")[0]).toMatchObject({ revisione: 1, fattibile: true, destinazione: "Dolomiti – Val di Fassa" });
    expect(archivio.contenuto().profilo).toMatchObject({ ritmo: "intenso", formaFisica: "impegnativo", orari: "mattiniero", viaggiatori: { adulti: 3 } });
  });

  it("prompt 4: Roma con i bambini, pranzi sì e cene no, bozza subito", async () => {
    const archivio = creaArchivioInMemoria();
    const { esiti } = await eseguiCopione({ file: "atto-1-roma.json", messaggi: [PROMPT[4]], archivio });
    const [p4] = esiti as [EsitoMessaggio];
    verificaMessaggio(p4, "consulente", ["aggiorna_profilo", "cerca_destinazione", "prepara_destinazione", "genera_bozza"]);
    expect(datiDi(p4, "azione", "genera_bozza")[0]).toMatchObject({ revisione: 1, fattibile: true, destinazione: "Roma" });
    expect(archivio.contenuto().profilo).toMatchObject({ viaggiatori: { adulti: 2, bambini: [6, 9] }, formaFisica: "facile", pasti: { pranzo: true, cena: false } });
  });

  it("prompt 4b senza rete: Lisbona non è tra le destinazioni registrate e l'agente lo dice senza inventare", async () => {
    const archivio = creaArchivioInMemoria();
    const { esiti } = await eseguiCopione({ file: "atto-1-lisbona-senza-rete.json", messaggi: [PROMPT["4b"]], archivio });
    const [p4b] = esiti as [EsitoMessaggio];
    verificaMessaggio(p4b, "consulente", ["aggiorna_profilo", "cerca_destinazione"]);
    expect(datiDi(p4b, "risultato", "cerca_destinazione")[0]).toMatchObject({ risultati: [] });
    expect(archivio.contenuto().revisioni).toEqual([]);
  });
});

describe("CA-1 Atto 3, in viaggio (sabato 13 giugno, ore 08:00) — REQ-IMPR-001", () => {
  it("prompt 12-19: ogni racconto diventa un riepilogo con conferma, poi al sì l'imprevisto strutturato atteso e la proposta", async () => {
    const archivio = archivioViaggioConfermato();
    const messaggi = [12, 13, 14, 15, 16, 17, 18, 19].flatMap((k) => [PROMPT[k as keyof typeof PROMPT], "Sì, procedi."]);
    const { esiti, cliente } = await eseguiCopione({ file: "atto-3-imprevisti.json", messaggi, archivio, adesso: SABATO_MATTINA });
    const coppie = Array.from({ length: 8 }, (_, i) => [esiti[2 * i]!, esiti[2 * i + 1]!] as const);

    // L'imprevisto strutturato atteso per ciascun prompt (CA-1).
    const attesi: Record<string, unknown>[] = [
      { tipo: "METEO_AVVERSO", data: "2026-06-13", inizio: "08:00", fine: "13:00", zonaId: "GARDA_NORD", condizione: "pioggia" },
      { tipo: "SALUTE", data: "2026-06-13", giorni: 2, intensitaMassima: "moderata", mobilitaRidotta: false },
      { tipo: "RITARDO", data: "2026-06-13", momento: "08:00", minuti: 120 },
      { operazione: "prolunga", giorni: 1, dopo: "2026-06-14" },
      { tipo: "CANCELLAZIONE_SPOSTAMENTO", elementoId: "D3-E9" },
      { tipo: "DOCUMENTI_SMARRITI", data: "2026-06-13", momento: "08:00" },
      { tipo: "STANCHEZZA", data: "2026-06-13" },
      { tipo: "RITARDO", data: "2026-06-13", momento: "08:00", minuti: 30 },
    ];
    coppie.forEach(([racconto, si], i) => {
      // Il racconto: Gestione imprevisti, nessuna proposta, un riepilogo che chiede conferma (CA-3).
      expect(racconto.eventi[0], racconto.messaggio).toMatchObject({ tipo: "agente", agente: "imprevisti", modo: "modello" });
      expect(racconto.strumenti.filter((n) => n !== "leggi_viaggio"), racconto.messaggio).toEqual([]);
      expect(racconto.fine.testo, racconto.messaggio).toMatch(/Procedo\?$/);
      expect((racconto.fine.testo.match(/\?/g) ?? []).length, racconto.messaggio).toBeLessThanOrEqual(2);
      // Il sì: torna a Gestione imprevisti per regola e parte la proposta con l'imprevisto strutturato.
      expect(si.eventi[0], racconto.messaggio).toMatchObject({ tipo: "agente", agente: "imprevisti", modo: "regole" });
      expect(si.eventi.map((e) => e.tipo), racconto.messaggio).not.toContain("strumento_fallito");
      expect(JSON.parse(si.fine.chiamate[0]!.argomenti), racconto.messaggio).toMatchObject(attesi[i]!);
      expect(datiDi(si, "proposta"), racconto.messaggio).toHaveLength(1);
    });

    // Le proposte non cambiano il viaggio: resta la versione 1, con una proposta per imprevisto.
    const { storico, proposte } = archivio.contenuto();
    expect(storico?.versioni).toHaveLength(1);
    expect(proposte).toHaveLength(8);
    expect(proposte.map((p) => p.tipo)).toEqual(["ripianificazione", "ripianificazione", "ripianificazione", "modifica", "ripianificazione", "ripianificazione", "ripianificazione", "ripianificazione"]);

    // L'orchestratore vede solo scegli_agente; l'agente i suoi strumenti e la situazione con l'orologio simulato.
    const richiestaOrchestratore = cliente.richieste[0]!;
    expect(richiestaOrchestratore.strumenti?.map((s) => s.nome)).toEqual(["scegli_agente"]);
    expect(richiestaOrchestratore.messaggi).toEqual([{ ruolo: "utente", testo: PROMPT[12] }]);
    const richiestaAgente = cliente.richieste[1]!;
    expect(richiestaAgente.istruzioni?.startsWith(AGENTI.imprevisti.istruzioni)).toBe(true);
    expect(richiestaAgente.istruzioni).toContain("Adesso è sabato 2026-06-13, ore 08:00.");
    expect(richiestaAgente.istruzioni).toContain("Il viaggio è confermato");
  });
});
