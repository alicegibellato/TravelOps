/**
 * Gli strumenti del motore dentro il ciclo (ST-ORCH-001B), con il client finto e la rete bloccata:
 * - il ciclo completo aggiorna profilo → prepara destinazione → genera bozza → conferma sull'istantanea precaricata
 *   del Lago di Garda;
 * - CA-2: il viaggio cambia solo attraverso gli strumenti (il testo del modello non cambia nulla, gli strumenti di
 *   lettura non scrivono, le proposte non diventano versioni da sole) e i nomi che arrivano al modello vengono solo
 *   dall'istantanea;
 * - CA-5: nessuna chiamata di rete, e il codice degli strumenti non usa la rete.
 */
import dns from "node:dns";
import { readdirSync, readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  creaClienteFinto,
  eseguiCiclo,
  NOMI_STRUMENTI,
  STRUMENTI_CHE_SCRIVONO,
  type EventoCiclo,
  type EventoCicloRisultato,
  type Messaggio,
} from "../../src/index.js";
import { AREA_GARDA, ARGOMENTI_PROFILO_GARDA, banco, bancoConfermato, GARDA, istantanea, type Banco } from "./supporto.js";

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
  // CA-5: nessun test di questo file ha provato a usare la rete.
  expect(tentativi).toEqual([]);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const ISTRUZIONI = "Sei il Planner di TravelOps (istruzioni di prova).";

type Chiamata = { id: string; nome: string; argomenti: unknown };

/** Una conversazione registrata: un turno per ogni gruppo di chiamate, poi la risposta finale. */
function conversazione(descrizione: string, passi: readonly Chiamata[][], finale: string) {
  return {
    versione: 1,
    descrizione,
    turni: [
      ...passi.map((chiamate) => ({ atteso: { istruzioni: ISTRUZIONI, strumenti: [...NOMI_STRUMENTI] }, risposta: { chiamate } })),
      { atteso: { istruzioni: ISTRUZIONI, strumenti: [...NOMI_STRUMENTI] }, risposta: { testo: finale } },
    ],
  };
}

async function esegui(b: Banco, conversazioneRegistrata: unknown, testo: string) {
  const cliente = creaClienteFinto(conversazioneRegistrata);
  const messaggi: Messaggio[] = [{ ruolo: "utente", testo }];
  const eventi: EventoCiclo[] = [];
  for await (const evento of eseguiCiclo({ cliente, istruzioni: ISTRUZIONI, messaggi, strumenti: b.strumenti, maxIterazioni: 12 })) eventi.push(evento);
  cliente.verificaCompletata();
  const risultati = eventi.filter((e): e is EventoCicloRisultato => e.tipo === "risultato_strumento");
  const fine = eventi.at(-1);
  if (fine?.tipo !== "fine") throw new Error("manca la fine del ciclo");
  return { cliente, risultati, esito: fine.esito, letti: risultati.map((r) => JSON.parse(r.risultato) as Record<string, any>) };
}

describe("ciclo completo con il client finto", () => {
  it("aggiorna profilo → prepara destinazione → genera bozza → conferma, sull'istantanea precaricata del Garda", async () => {
    const b = banco();
    const registrata = conversazione(
      "Viaggio di 3 giorni sul Lago di Garda, dalla richiesta alla conferma",
      [
        [{ id: "call_1", nome: "aggiorna_profilo", argomenti: ARGOMENTI_PROFILO_GARDA }],
        [{ id: "call_2", nome: "prepara_destinazione", argomenti: { areaId: AREA_GARDA, testo: "Riva del Garda" } }],
        [{ id: "call_3", nome: "genera_bozza", argomenti: {} }],
        [{ id: "call_4", nome: "conferma_viaggio", argomenti: {} }],
      ],
      "Ecco fatto: il viaggio sul Lago di Garda è confermato.",
    );
    const { cliente, risultati, esito, letti } = await esegui(b, registrata, "Tre giorni sul Lago di Garda dal 20 al 22 ottobre, natura e buon cibo. Confermalo pure.");

    expect(esito.motivo).toBe("completata");
    expect(esito.testo).toBe("Ecco fatto: il viaggio sul Lago di Garda è confermato.");
    expect(esito.chiamate.map((c) => c.nome)).toEqual(["aggiorna_profilo", "prepara_destinazione", "genera_bozza", "conferma_viaggio"]);
    expect(risultati.map((r) => r.errore)).toEqual([false, false, false, false]);
    expect(letti[0]).toMatchObject({ salvato: true, completo: true });
    expect(letti[1]).toMatchObject({ pronta: true, istantaneaId: GARDA });
    expect(letti[2]).toMatchObject({ revisione: 1, fattibile: true });
    expect(letti[3]).toMatchObject({ confermato: true, versione: 1 });

    // Il modello ha ricevuto i risultati: l'ultima richiesta contiene i 4 risultati degli strumenti.
    const ultima = cliente.richieste.at(-1)!;
    expect(ultima.messaggi.filter((m) => m.ruolo === "strumento").map((m) => (m as { nome: string }).nome)).toEqual(esito.chiamate.map((c) => c.nome));

    const { scheda, storico, revisioni } = b.archivio.contenuto();
    expect(scheda).toMatchObject({ stato: "confermato", istantaneaId: GARDA });
    expect(storico?.versioni.map((v) => v.causa)).toEqual(["Itinerario iniziale"]);
    expect(revisioni.map((r) => r.causa)).toEqual(["Prima bozza"]);
    expect(b.archivio.scritture.map((s) => s.metodo)).toEqual([
      "salvaProfilo",
      "salvaScheda",
      "salvaIstantanea",
      "salvaProfilo",
      "salvaScheda",
      "aggiungiRevisioneBozza",
      "salvaScheda",
      "salvaStorico",
      "salvaScheda",
    ]);
  });

  it("un errore di uno strumento torna al modello, che si corregge nel turno dopo", async () => {
    const b = banco();
    const registrata = conversazione(
      "Correzione dopo un errore",
      [
        [{ id: "call_1", nome: "genera_bozza", argomenti: {} }],
        [{ id: "call_2", nome: "aggiorna_profilo", argomenti: { ritmo: "lento" } }],
      ],
      "Ho bisogno ancora di sapere dove e quando vuoi andare.",
    );
    const { risultati, letti } = await esegui(b, registrata, "Fammi una bozza");
    expect(risultati.map((r) => r.errore)).toEqual([true, false]);
    expect(letti[0]?.errore).toMatch(/destinazione non è ancora pronta/);
    expect(b.archivio.scritture.map((s) => s.metodo)).toEqual(["salvaProfilo", "salvaScheda"]);
  });
});

describe("CA-2 il viaggio cambia solo con gli strumenti", () => {
  it("CA-2 una risposta di solo testo non cambia nulla, anche se dice di aver cambiato il viaggio", async () => {
    const b = await bancoConfermato();
    const prima = b.archivio.scritture.length;
    const registrata = conversazione("Solo testo", [], "Fatto, ho spostato tutto a domani e prenotato il ristorante.");
    const { esito } = await esegui(b, registrata, "Sposta tutto a domani");
    expect(esito.chiamate).toEqual([]);
    expect(b.archivio.scritture).toHaveLength(prima);
    expect(b.archivio.contenuto().storico?.versioni).toHaveLength(1);
  });

  it("CA-2 uno strumento che non esiste non cambia nulla", async () => {
    const b = await bancoConfermato();
    const prima = b.archivio.scritture.length;
    const registrata = conversazione("Strumento inesistente", [[{ id: "call_1", nome: "prenota_albergo", argomenti: { notti: 2 } }]], "Non posso prenotare.");
    const { risultati } = await esegui(b, registrata, "Prenotami l'albergo");
    expect(risultati[0]).toMatchObject({ errore: true });
    expect(b.archivio.scritture).toHaveLength(prima);
  });

  it("CA-2 gli strumenti di sola lettura non scrivono", async () => {
    const b = await bancoConfermato();
    const prima = b.archivio.scritture.length;
    const registrata = conversazione(
      "Letture",
      [
        [
          { id: "call_1", nome: "cerca_destinazione", argomenti: { testo: "Roma" } },
          { id: "call_2", nome: "proponi_destinazioni", argomenti: { limite: 2 } },
          { id: "call_3", nome: "cerca_catalogo", argomenti: { testo: "lago", stile: null, categoria: null, limite: 5 } },
          { id: "call_4", nome: "leggi_viaggio", argomenti: { versione: null } },
        ],
      ],
      "Ecco cosa ho trovato.",
    );
    const { risultati } = await esegui(b, registrata, "Che cosa c'è?");
    expect(risultati.map((r) => r.errore)).toEqual([false, false, false, false]);
    expect(b.archivio.scritture).toHaveLength(prima);
    const sola = NOMI_STRUMENTI.filter((n) => !STRUMENTI_CHE_SCRIVONO.includes(n));
    expect(sola).toEqual(["cerca_destinazione", "proponi_destinazioni", "cerca_catalogo", "leggi_viaggio"]);
  });

  it("CA-2 una proposta non diventa una versione: il viaggio resta quello confermato", async () => {
    const b = await bancoConfermato();
    const viaggio = b.archivio.contenuto().storico!.versioni[0]!.viaggio;
    const elemento = viaggio.giorni[1]!.elementi.find((e) => e.tipo === "attivita")!;
    const registrata = conversazione(
      "Proposta di modifica",
      [[{ id: "call_1", nome: "proponi_modifica", argomenti: { operazione: "rimuovi", elementoId: elemento.id, attivitaId: null, data: null, inizio: null, priorita: null, orarioFisso: null } }]],
      "Ti propongo di togliere questa attività: vuoi accettare?",
    );
    const { letti } = await esegui(b, registrata, "Togli quella visita");
    expect(letti[0]).toMatchObject({ propostaId: 1, versioneBase: 1 });
    const { storico, proposte } = b.archivio.contenuto();
    expect(storico?.versioni).toHaveLength(1);
    expect(storico?.versioni[0]?.viaggio).toEqual(viaggio);
    expect(proposte).toHaveLength(1);
  });

  it("CA-2 ogni luogo e attività nei risultati degli strumenti viene dall'istantanea", async () => {
    const b = banco();
    const registrata = conversazione(
      "Tutti gli strumenti, per raccogliere i nomi",
      [
        [{ id: "c1", nome: "cerca_destinazione", argomenti: { testo: "Riva del Garda" } }],
        [{ id: "c2", nome: "aggiorna_profilo", argomenti: ARGOMENTI_PROFILO_GARDA }],
        [{ id: "c3", nome: "prepara_destinazione", argomenti: { areaId: AREA_GARDA, testo: "Riva del Garda" } }],
        [{ id: "c4", nome: "genera_bozza", argomenti: {} }],
        [{ id: "c5", nome: "genera_alternativa", argomenti: {} }],
        [{ id: "c6", nome: "rigenera_giornata", argomenti: { data: "2026-10-21" } }],
        [{ id: "c7", nome: "cerca_catalogo", argomenti: { testo: null, stile: "gastronomia", categoria: null, limite: 25 } }],
        [{ id: "c8", nome: "conferma_viaggio", argomenti: {} }],
        [{ id: "c9", nome: "leggi_viaggio", argomenti: { versione: 1 } }],
      ],
      "Ecco il viaggio.",
    );
    const { risultati, letti } = await esegui(b, registrata, "Organizza tutto");
    expect(risultati.every((r) => !r.errore)).toBe(true);

    const ist = istantanea(GARDA);
    const ammessi = new Set([
      ...ist.attivita.map((a) => a.nome),
      ...ist.luoghi.map((l) => l.nome),
      ...ist.zone.map((z) => z.nome),
      ist.destinazione,
      ist.area.nome,
    ]);
    const nomi: string[] = [];
    raccogliNomi(letti, nomi);
    expect(nomi.length).toBeGreaterThan(50);
    expect(nomi.filter((n) => !ammessi.has(n))).toEqual([]);
  });
});

/** Chiavi dei risultati che contengono nomi di luoghi o attività. */
const CHIAVI_NOMI = new Set(["attivita", "spostamento", "alloggio", "luogo", "nome", "destinazione", "esempi", "tolte", "nuove"]);

/**
 * Raccoglie i nomi di luoghi e attività dai risultati. Il sottoalbero `profilo` è escluso: ripete ciò che ha scritto il
 * viaggiatore (per esempio "Lago di Garda"), non un luogo proposto.
 */
function raccogliNomi(valore: unknown, nomi: string[], chiave?: string): void {
  if (Array.isArray(valore)) {
    for (const v of valore) raccogliNomi(v, nomi, chiave);
    return;
  }
  if (typeof valore === "object" && valore !== null) {
    for (const [k, v] of Object.entries(valore)) if (k !== "profilo") raccogliNomi(v, nomi, k);
    return;
  }
  if (typeof valore !== "string" || chiave === undefined || !CHIAVI_NOMI.has(chiave)) return;
  if (chiave === "spostamento") nomi.push(...valore.split(" → "));
  else nomi.push(valore);
}

describe("CA-5 gli strumenti non usano la rete", () => {
  it("CA-5 il codice degli strumenti non importa moduli di rete né chiama fetch: la rete passa solo dalla sorgente iniettata", () => {
    const cartella = fileURLToPath(new URL("../../src/strumenti", import.meta.url));
    const file = readdirSync(cartella).filter((f) => f.endsWith(".ts"));
    expect(file.length).toBeGreaterThanOrEqual(4);
    for (const nome of file) {
      const sorgente = readFileSync(join(cartella, nome), "utf8");
      expect(sorgente, nome).not.toMatch(/from "node:(http|https|net|dns|tls|dgram)"|from "(http|https|net|dns|openai)"|\bfetch\(|creaClienteHttp|creaSorgenteReale|XMLHttpRequest|WebSocket/);
    }
  });
});
