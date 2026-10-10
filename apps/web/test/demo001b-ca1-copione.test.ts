/**
 * REQ-DEMO-001 CA-1 (ST-DEMO-001B): ogni prompt del copione della demo (`src/demo/copione.json`) dà il risultato atteso
 * con il client finto, passando dalla chat della web app (endpoint, agenti veri, strumenti e motore, base dati SQLite).
 * Nessuna rete e nessuna chiave. Le risposte del modello sono conversazioni registrate: quelle degli Atti 1 e 2 sono di
 * `packages/agents/test/agenti/conversazioni`, quella dell'Atto 3 è `test/demo001b/atto-3-garda-demo.json`, scritta sul
 * viaggio demo TRIP-DEMO-GARDA. Con il modello OpenAI vero lo stesso copione si prova nel collaudo (vedi
 * `evidence/ST-DEMO-001B.md`).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { caricaConversazioneRegistrata, creaClienteFinto, type ClienteFinto } from "@travelops/agents";
import { versioneCorrente } from "@travelops/engine";
import { describe, expect, it } from "vitest";
import { elencaProposteDelViaggio, elencaRevisioniBozza, leggiStoricoDelViaggio, trovaViaggio } from "../src/basedati";
import type { EventoChat } from "../src/chat/protocollo";
import { assistenteDaAgenti } from "../src/chat/server/agenti";
import { promptCopione, vociCopione } from "../src/demo/copione";
import { sorgenteDestinazioniLocale } from "../src/destinazioni/sorgente";
import { usaBaseDati } from "../src/stato/avvio";
import { impostaOrologio } from "../src/stato/operazioni";
import { ambienteChat, conversazioneSalvata, contesto, disponibile, inviaELeggi, nuovaConversazione, richiesta } from "./supporto-chat001a";

const CARTELLA_AGENTI = "../../../packages/agents/test/agenti/conversazioni/";
const daAgenti = (nome: string) => caricaConversazioneRegistrata(fileURLToPath(new URL(CARTELLA_AGENTI + nome, import.meta.url)));
const daQui = (nome: string) => caricaConversazioneRegistrata(fileURLToPath(new URL(`./demo001b/${nome}`, import.meta.url)));

const SI = "Sì, procedi.";

function ambienteConAgenti(registrazione: ClienteFinto, orologio = false) {
  let cliente = registrazione;
  const ambiente = ambienteChat(() => disponibile(assistenteDaAgenti({ cliente, sorgente: sorgenteDestinazioniLocale, ...(orologio ? {} : { adesso: () => null }) })));
  return { ambiente, cambia: (nuovo: ClienteFinto) => (cliente = nuovo), cliente: () => cliente };
}

const tipi = (eventi: readonly EventoChat[]) => eventi.map((e) => e.tipo);
const agente = (eventi: readonly EventoChat[]) => eventi.flatMap((e) => (e.tipo === "agente" ? [e.agente] : []))[0];
const azioni = (eventi: readonly EventoChat[]) => eventi.flatMap((e) => (e.tipo === "azione" ? [e.testo] : []));
const risposta = (eventi: readonly EventoChat[]) => {
  const ultimo = eventi.at(-1);
  if (ultimo?.tipo !== "risposta") throw new Error(`la risposta non è arrivata: ${JSON.stringify(ultimo)}`);
  return ultimo.risposta;
};
/** Ogni messaggio finisce con una risposta, senza errori né testi sostituiti dal controllo dei nomi. */
function sano(eventi: readonly EventoChat[], quale: string): void {
  expect(eventi.filter((e) => e.tipo === "errore"), quale).toEqual([]);
  expect(tipi(eventi), quale).not.toContain("testo_corretto");
  expect(risposta(eventi), quale).toBeDefined();
}

describe("CA-1 il copione è una sola fonte", () => {
  it("i prompt registrati nei test degli agenti sono quelli del copione", () => {
    const testoAgenti = readFileSync(fileURLToPath(new URL("../../../packages/agents/test/agenti/copione.test.ts", import.meta.url)), "utf8");
    for (const voce of vociCopione().filter((v) => v.tipo === "prompt")) {
      expect(testoAgenti, `prompt ${voce.id}`).toContain(voce.testo);
    }
  });
});

describe("CA-1 Atti 1 e 2 sul Garda, con la chat della web app", () => {
  it("prompt 1 e 2: preferenze, destinazione e bozza di 4 giorni con la degustazione", async () => {
    const { ambiente, cliente } = ambienteConAgenti(creaClienteFinto(daAgenti("atto-1-garda.json")));
    const { id } = await nuovaConversazione(ambiente);
    const p1 = await inviaELeggi(ambiente, id, promptCopione("1"));
    sano(p1, "1");
    expect(agente(p1)).toBe("consulente");
    expect(azioni(p1)).toEqual(["Preferenze aggiornate", "Destinazione pronta"]);
    expect(risposta(p1).scheda).toMatchObject({ tipo: "preferenze" });
    expect((risposta(p1).testo.match(/\?/g) ?? []).length).toBeLessThanOrEqual(2);
    const p2 = await inviaELeggi(ambiente, id, promptCopione("2"));
    sano(p2, "2");
    expect(azioni(p2)).toEqual(["Preferenze aggiornate", "Bozza creata"]);
    const scheda = risposta(p2).scheda as unknown as { tipo: string; giorni: unknown[] };
    expect(scheda.tipo).toBe("bozza");
    expect(scheda.giorni).toHaveLength(4);
    expect(JSON.stringify(scheda)).toContain("Degustazione");
    cliente().verificaCompletata();
  });

  it("prompt 5-11 sulla bozza: alleggerisci, sostituisci, lucchetto, scambia, alternativa, annulla e conferma (versione 1)", async () => {
    const { ambiente, cambia } = ambienteConAgenti(creaClienteFinto(daAgenti("atto-1-garda.json")));
    const { id } = await nuovaConversazione(ambiente);
    await inviaELeggi(ambiente, id, promptCopione("1"));
    const viaggio = (await inviaELeggi(ambiente, id, promptCopione("2"))).flatMap((e) => (e.tipo === "azione" ? [e.viaggio] : []))[0] as string;
    const atto2 = creaClienteFinto(daAgenti("atto-2-garda.json"));
    cambia(atto2);
    // REQ-PLAN-003 CA-2: i prompt 6, 8 e 10 cambiano la bozza come dice il copione (non sono più risposte a parole).
    const attesi: Record<string, { agente: string; azioni: string[] }> = {
      "5": { agente: "planner", azioni: ["Bozza modificata"] },
      "6": { agente: "planner", azioni: ["Bozza modificata"] },
      "7": { agente: "planner", azioni: ["Bozza modificata", "Preferenze aggiornate"] },
      "8": { agente: "planner", azioni: ["Bozza modificata"] },
      "9": { agente: "planner", azioni: ["Bozza modificata"] },
      "10": { agente: "planner", azioni: ["Bozza modificata"] },
      "11": { agente: "planner", azioni: ["Viaggio confermato"] },
    };
    for (const [numero, atteso] of Object.entries(attesi)) {
      const eventi = await inviaELeggi(ambiente, id, promptCopione(numero));
      sano(eventi, numero);
      expect(agente(eventi), numero).toBe(atteso.agente);
      expect(azioni(eventi), numero).toEqual(atteso.azioni);
    }
    atto2.verificaCompletata();
    usaBaseDati(ambiente.cartella, (db) => {
      const revisioni = elencaRevisioniBozza(db, viaggio);
      expect(revisioni.ok && revisioni.revisioni.map((r) => r.causa)).toEqual([
        "Prima bozza",
        expect.stringMatching(/^Giornata del 2026-06-13 più leggera/),
        expect.stringMatching(/^Sostituito "Degustazione: Vineria Baroldi" con "Panorama da Cavra de Lizon"/),
        'Bloccato "Degustazione: Enoteca Segantini"',
        "Scambiati i giorni 2026-06-14 e 2026-06-13",
        "Un'alternativa con attività diverse, tenendo quelle bloccate",
        expect.stringMatching(/^Annullata la modifica .*tornato alla revisione B5$/),
      ]);
      expect(trovaViaggio(db, viaggio)?.stato).toBe("confermato");
      const storico = leggiStoricoDelViaggio(db, viaggio);
      expect(storico?.ok && storico.storico.versioni.length).toBe(1);
    });
    expect((await conversazioneSalvata(ambiente, id)).viaggioId).toBe(viaggio);
  });
});

describe("CA-1 Atto 1, nuovi viaggi", () => {
  it("prompt 3 e 3b: tre destinazioni di montagna, poi la bozza della Val di Fassa", async () => {
    const { ambiente, cliente } = ambienteConAgenti(creaClienteFinto(daAgenti("atto-1-sorprendimi.json")));
    const { id } = await nuovaConversazione(ambiente);
    const p3 = await inviaELeggi(ambiente, id, promptCopione("3"));
    sano(p3, "3");
    expect(agente(p3)).toBe("consulente");
    expect(azioni(p3)).toEqual(["Preferenze aggiornate"]);
    expect(JSON.stringify(risposta(p3))).toContain("Val di Fassa");
    const p3b = await inviaELeggi(ambiente, id, promptCopione("3b"));
    sano(p3b, "3b");
    expect(azioni(p3b)).toContain("Bozza creata");
    expect(JSON.stringify(risposta(p3b))).toContain("Val di Fassa");
    cliente().verificaCompletata();
  });

  it("prompt 4: Roma con i bambini, subito la bozza", async () => {
    const { ambiente, cliente } = ambienteConAgenti(creaClienteFinto(daAgenti("atto-1-roma.json")));
    const { id } = await nuovaConversazione(ambiente);
    const p4 = await inviaELeggi(ambiente, id, promptCopione("4"));
    sano(p4, "4");
    expect(azioni(p4)).toEqual(["Preferenze aggiornate", "Destinazione pronta", "Bozza creata"]);
    expect(JSON.stringify(risposta(p4))).toContain("Roma");
    cliente().verificaCompletata();
  });

  it("prompt 4b senza rete: Lisbona non è precaricata, l'assistente lo dice senza inventare luoghi", async () => {
    const { ambiente, cliente } = ambienteConAgenti(creaClienteFinto(daAgenti("atto-1-lisbona-senza-rete.json")));
    const { id } = await nuovaConversazione(ambiente);
    const p4b = await inviaELeggi(ambiente, id, promptCopione("4b"));
    sano(p4b, "4b");
    expect(azioni(p4b)).toEqual(["Preferenze aggiornate"]);
    expect(risposta(p4b).scheda).not.toMatchObject({ tipo: "bozza" });
    cliente().verificaCompletata();
  });
});

describe("CA-1 Atto 3 su TRIP-DEMO-GARDA (sabato 2026-06-13, ore 08:00)", () => {
  function inViaggio() {
    const registrazione = creaClienteFinto(daQui("atto-3-garda-demo.json"));
    const ambienteAgenti = ambienteConAgenti(registrazione, true);
    const orologio = impostaOrologio(ambienteAgenti.ambiente.cartella, "2026-06-13", "08:00");
    if (!orologio.ok) throw new Error(orologio.messaggio);
    return { ...ambienteAgenti, registrazione };
  }

  it("prompt 12-19: ogni racconto riceve un riepilogo, al «Sì» arriva una proposta; il viaggio non cambia da solo", async () => {
    const { ambiente, registrazione } = inViaggio();
    const { id } = await nuovaConversazione(ambiente, "TRIP-DEMO-GARDA");
    for (const numero of ["12", "13", "14", "15", "16", "17", "18", "19"]) {
      const racconto = await inviaELeggi(ambiente, id, promptCopione(numero));
      sano(racconto, numero);
      expect(agente(racconto), numero).toBe("imprevisti");
      expect(risposta(racconto).testo, numero).toMatch(/Procedo\?$/);
      expect(risposta(racconto).scheda, numero).toBeUndefined();
      const proposte = usaBaseDati(ambiente.cartella, (db) => elencaProposteDelViaggio(db, "TRIP-DEMO-GARDA").length);
      const si = await inviaELeggi(ambiente, id, SI);
      sano(si, numero);
      expect(usaBaseDati(ambiente.cartella, (db) => elencaProposteDelViaggio(db, "TRIP-DEMO-GARDA").length), numero).toBe(proposte + 1);
    }
    registrazione.verificaCompletata();
    usaBaseDati(ambiente.cartella, (db) => {
      const storico = leggiStoricoDelViaggio(db, "TRIP-DEMO-GARDA");
      expect(storico?.ok && storico.storico.versioni.length).toBe(1);
      const proposte = elencaProposteDelViaggio(db, "TRIP-DEMO-GARDA");
      // 12: la pioggia tocca il trekking del sabato mattina (D2-E2); 15: il volo di ritorno a orario fisso (D4-E7) è a rischio.
      expect(JSON.stringify(proposte[0]?.proposta)).toContain("D2-E2");
      expect(JSON.stringify(proposte[3]?.proposta)).toContain("D4-E7");
      expect(JSON.stringify(proposte[4]?.proposta)).toContain("D4-E7");
    });
  });

  it("prompt 12 e Accetta: nasce la versione 2", async () => {
    const { ambiente } = inViaggio();
    const { id } = await nuovaConversazione(ambiente, "TRIP-DEMO-GARDA");
    await inviaELeggi(ambiente, id, promptCopione("12"));
    await inviaELeggi(ambiente, id, SI);
    const numero = usaBaseDati(ambiente.cartella, (db) => elencaProposteDelViaggio(db, "TRIP-DEMO-GARDA")[0]!.id);
    const r = await ambiente.gestori.decidiProposta(
      richiesta(`/${id}/proposte/${numero}`, { decisione: "accetta", nome: "Alice" }),
      contesto({ id: String(id), proposta: String(numero) }),
    );
    expect(r.status).toBe(200);
    usaBaseDati(ambiente.cartella, (db) => {
      const storico = leggiStoricoDelViaggio(db, "TRIP-DEMO-GARDA");
      if (storico?.ok !== true) throw new Error("storico non valido");
      expect(versioneCorrente(storico.storico).numero).toBe(2);
    });
  });
});
