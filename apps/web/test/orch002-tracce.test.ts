/**
 * REQ-ORCH-002 (ST-ORCH-002), lato web app: con la chiave la chat usa l'orchestrazione con il modello (CA-1) e salva
 * nella base dati le tracce di ogni risposta, la delega e le chiamate a strumento (CA-4), per conversazione e per
 * viaggio. Client del modello finto: nessuna rete, nessuna chiave.
 */
import { creaClienteFinto, type ClienteFinto } from "@travelops/agents";
import { describe, expect, it } from "vitest";
import { salvaTracceAgenti, tracceDelViaggio, tracceDellaConversazione } from "../src/basedati";
import { assistenteDaAgenti } from "../src/chat/server/agenti";
import { sorgenteDestinazioniLocale } from "../src/destinazioni/sorgente";
import { ambienteChat, disponibile, inviaELeggi, nuovaConversazione } from "./supporto-chat001a";
import { sullaBaseDati } from "./supporto-stato";

const scelta = (agente: string, motivo: string) => ({ chiamate: [{ id: "o1", nome: "scegli_agente", argomenti: { agente, motivo } }] });

describe("REQ-ORCH-002 CA-4 le tracce degli agenti nella base dati", () => {
  it("una risposta della chat salva la delega del modello e le chiamate a strumento, per conversazione e per viaggio", async () => {
    const cliente: ClienteFinto = creaClienteFinto({
      versione: 1,
      turni: [
        { atteso: { strumenti: ["scegli_agente"] }, risposta: scelta("consulente", "Vuole partire: servono le preferenze.") },
        { atteso: {}, risposta: { chiamate: [{ id: "c1", nome: "leggi_viaggio", argomenti: { versione: null } }] } },
        { atteso: {}, risposta: { testo: "Dove ti piacerebbe andare?" } },
      ],
    });
    const ambiente = ambienteChat(() =>
      disponibile(assistenteDaAgenti({ cliente, sorgente: sorgenteDestinazioniLocale, adesso: () => null, orchestrazione: "modello" })),
    );
    const conversazione = await nuovaConversazione(ambiente);
    const eventi = await inviaELeggi(ambiente, conversazione.id, "Ciao, vorrei organizzare un weekend");
    cliente.verificaCompletata();
    expect(eventi.at(-1)).toMatchObject({ tipo: "risposta", risposta: { agente: "consulente" } });

    const tracce = sullaBaseDati(ambiente.cartella, (db) => tracceDellaConversazione(db, conversazione.id));
    expect(tracce).toHaveLength(1);
    expect(tracce[0]).toMatchObject({ conversazioneId: conversazione.id, risposta: 1, domanda: "Ciao, vorrei organizzare un weekend" });
    expect(tracce[0]?.voci.map((v) => [v.tipo, v.agente, v.strumento ?? null, v.esito])).toEqual([
      ["delega", "consulente", null, "ok"],
      ["strumento", "consulente", "leggi_viaggio", "ok"],
    ]);
    expect(tracce[0]?.voci[0]).toMatchObject({ input: "Vuole partire: servono le preferenze.", dettaglio: "modello" });
    for (const voce of tracce[0]?.voci ?? []) {
      expect(voce.durataMs).toBeGreaterThanOrEqual(0);
      expect(Date.parse(voce.inizio)).not.toBeNaN();
    }
  });

  it("le risposte si numerano in ordine e il viaggio raccoglie le tracce delle sue conversazioni", async () => {
    const ambiente = ambienteChat();
    const conversazione = await nuovaConversazione(ambiente, "versione-1");
    const voce = { tipo: "delega" as const, agente: "planner", input: "Modifica richiesta.", esito: "ok" as const, durataMs: 3, inizio: "2026-10-10T08:00:00.000Z" };
    sullaBaseDati(ambiente.cartella, (db) => {
      expect(salvaTracceAgenti(db, conversazione.id, "Prima", [voce])).toBe(1);
      expect(salvaTracceAgenti(db, conversazione.id, "Vuota", [])).toBeNull();
      expect(salvaTracceAgenti(db, conversazione.id, "Seconda", [voce, { ...voce, tipo: "strumento", strumento: "opera_bozza", esito: "errore", dettaglio: "Orario non valido" }])).toBe(2);
      const delViaggio = tracceDelViaggio(db, "versione-1");
      expect(delViaggio.map((r) => [r.risposta, r.domanda, r.voci.length])).toEqual([
        [1, "Prima", 1],
        [2, "Seconda", 2],
      ]);
      expect(delViaggio[1]?.voci[1]).toMatchObject({ strumento: "opera_bozza", esito: "errore", dettaglio: "Orario non valido" });
      expect(tracceDelViaggio(db, "altro")).toEqual([]);
    });
  });
});
