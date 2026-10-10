/**
 * REQ-CHAT-003 (ST-CHAT-003A), lato web app: un nuovo viaggio non eredita il profilo del viaggio prima (CA-2).
 * Il profilo condiviso tra filtri e chat appartiene al viaggio che l'ha usato; una conversazione nuova su Pianifica
 * riparte con le sole preferenze personali (ritmo, forma fisica, pasti), e senza date e viaggiatori la bozza non si
 * genera. Nessuna rete: sorgente delle destinazioni registrata della web app.
 */
import type { BozzaProfilo } from "@travelops/engine";
import { creaStrumentiMotore } from "@travelops/agents";
import { describe, expect, it } from "vitest";
import { creaArchivioConversazione } from "../src/chat/server/archivio-viaggio";
import { creaConversazioneChat } from "../src/chat/server/servizio";
import { sorgenteDestinazioniLocale } from "../src/destinazioni/sorgente";
import { iniziaNuovoViaggio, leggiProfilo, salvaProfilo, viaggioDelProfilo } from "../src/preferenze/profilo";
import { nuovaCartella, sullaBaseDati } from "./supporto-stato";

/** Il profilo di un viaggio precedente, come lo lasciano filtri e chat. */
const PROFILO_PRIMA: BozzaProfilo = {
  destinazione: { tipo: "luogo", nome: "Roma", riferimento: "roma-2026-10-09" },
  date: { tipo: "precise", inizio: "2026-10-16", fine: "2026-10-18" },
  viaggiatori: { adulti: 2, bambini: [] },
  tipoGruppo: "coppia",
  stili: ["cultura", "gastronomia"],
  ritmo: "lento",
  formaFisica: "moderato",
  pasti: { pranzo: true, cena: false },
  irrinunciabili: { stili: ["avventura"] },
};

const SOLO_PERSONALI: BozzaProfilo = { ritmo: "lento", formaFisica: "moderato", pasti: { pranzo: true, cena: false } };

/** Gli argomenti di aggiorna_profilo tutti a null, tranne quelli indicati. */
function argomenti(definizione: { parametri: unknown }, parziali: Record<string, unknown>): Record<string, unknown> {
  const proprieta = Object.keys((definizione.parametri as { properties: Record<string, unknown> }).properties);
  return { ...Object.fromEntries(proprieta.map((p) => [p, null])), ...parziali };
}

describe("REQ-CHAT-003 CA-2 un nuovo viaggio riparte dalle sole preferenze personali", () => {
  it("il profilo salvato dalla chat di un viaggio appartiene a quel viaggio", () => {
    const cartella = nuovaCartella();
    const conversazione = creaConversazioneChat(cartella, null);
    creaArchivioConversazione(cartella, conversazione.id).salvaProfilo(PROFILO_PRIMA);
    sullaBaseDati(cartella, (db) => {
      expect(leggiProfilo(db)).toEqual(PROFILO_PRIMA);
      expect(viaggioDelProfilo(db)).toBe(`chat-${conversazione.id}`);
    });
  });

  it("una conversazione nuova dopo quel viaggio parte con solo ritmo, forma fisica e pasti", () => {
    const cartella = nuovaCartella();
    const prima = creaConversazioneChat(cartella, null);
    creaArchivioConversazione(cartella, prima.id).salvaProfilo(PROFILO_PRIMA);

    const nuova = creaConversazioneChat(cartella, null);
    expect(nuova.id).not.toBe(prima.id);
    sullaBaseDati(cartella, (db) => {
      expect(leggiProfilo(db)).toEqual(SOLO_PERSONALI);
      expect(viaggioDelProfilo(db)).toBeNull();
    });
    // Il viaggio di prima tiene il suo profilo, e se la sua chat continua non tocca quello del viaggio nuovo.
    const archivioPrima = creaArchivioConversazione(cartella, prima.id);
    expect(archivioPrima.leggiProfilo()).toEqual(PROFILO_PRIMA);
    archivioPrima.salvaProfilo({ ...PROFILO_PRIMA, ritmo: "intenso" });
    sullaBaseDati(cartella, (db) => {
      expect(leggiProfilo(db)).toEqual(SOLO_PERSONALI);
      expect(viaggioDelProfilo(db)).toBeNull();
    });
  });

  it("i filtri compilati prima di scrivere in chat non si perdono: un profilo non ancora usato resta com'è", () => {
    const cartella = nuovaCartella();
    sullaBaseDati(cartella, (db) => {
      salvaProfilo(db, PROFILO_PRIMA);
      expect(iniziaNuovoViaggio(db)).toBe(false);
      expect(leggiProfilo(db)).toEqual(PROFILO_PRIMA);
    });
    creaConversazioneChat(cartella, null);
    sullaBaseDati(cartella, (db) => expect(leggiProfilo(db)).toEqual(PROFILO_PRIMA));
  });

  it("«Vorrei andare sul Lago di Garda» in un viaggio nuovo: il profilo non è completo, servono date e viaggiatori", async () => {
    const cartella = nuovaCartella();
    const prima = creaConversazioneChat(cartella, null);
    creaArchivioConversazione(cartella, prima.id).salvaProfilo(PROFILO_PRIMA);
    const nuova = creaConversazioneChat(cartella, null);

    const strumenti = creaStrumentiMotore({ archivio: creaArchivioConversazione(cartella, nuova.id), sorgente: sorgenteDestinazioniLocale(cartella, {}) });
    const aggiorna = strumenti.find((s) => s.definizione.nome === "aggiorna_profilo");
    const esito = (await aggiorna?.esegui(argomenti(aggiorna.definizione, { destinazione: { tipo: "luogo", nome: "Lago di Garda" } }), {} as never)) as {
      completo: boolean;
      cosaManca: string[];
      profilo: BozzaProfilo;
    };
    expect(esito.completo).toBe(false);
    expect(esito.profilo.date).toBeUndefined();
    expect(esito.profilo.viaggiatori).toBeUndefined();
    expect(esito.profilo.irrinunciabili).toBeUndefined();
    expect(esito.cosaManca.join(" ")).toMatch(/date|quando/i);
    // genera_bozza vuole un profilo completo: la bozza non parte.
    const genera = strumenti.find((s) => s.definizione.nome === "genera_bozza");
    await expect(genera?.esegui({}, {} as never)).rejects.toThrow();
  });
});
