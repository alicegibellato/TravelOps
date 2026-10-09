import { esportaStorico, esportaViaggio } from "@travelops/engine";
import { describe, expect, it } from "vitest";
import {
  aggiungiMessaggio,
  aggiungiRevisioneBozza,
  creaConversazione,
  elencaRevisioniBozza,
  elencaViaggi,
  esportaViaggioSalvato,
  importaViaggioSalvato,
  leggiIstantanea,
  leggiStoricoDelViaggio,
  salvaIstantanea,
  salvaProfilo,
  salvaViaggio,
  testoStoricoDelViaggio,
  trovaViaggio,
} from "../src/basedati";
import { accettaProposta, avviaScenario, impostaOrologio } from "../src/stato/operazioni";
import { datiValidi } from "./supporto";
import { nuovaCartella, statoSalvato, sullaBaseDati } from "./supporto-stato";

/** Il viaggio demo `versione-1` dopo REQ-ITIN-002 CA-2 (versione 2 di S1 accettata da Alice), con profilo e chat. */
function viaggioCompleto(cartella: string): string {
  avviaScenario(cartella, "S1");
  impostaOrologio(cartella, "2026-06-13", "07:30");
  accettaProposta(cartella, 1, "Alice");
  sullaBaseDati(cartella, (db) => {
    salvaProfilo(db, "versione-1", { stili: ["natura"], ritmo: "lento" });
    aggiungiRevisioneBozza(db, "versione-1", "Bozza iniziale", datiValidi("versione-1").viaggio);
    const conversazione = creaConversazione(db, "versione-1");
    aggiungiMessaggio(db, conversazione, { ruolo: "viaggiatore", testo: "Piove sabato?", dati: null });
    aggiungiMessaggio(db, conversazione, { ruolo: "assistente", testo: "Ti propongo il MAG", dati: { proposta: 1 } });
  });
  const testo = sullaBaseDati(cartella, (db) => esportaViaggioSalvato(db, "versione-1"));
  if (testo === null) throw new Error("viaggio non trovato");
  return testo;
}

describe("CA-3 un viaggio esportato e reimportato è identico (stesso JSON del motore)", () => {
  it("CA-3 importato in un'altra base dati e riesportato, il documento è identico, carattere per carattere", () => {
    const origine = nuovaCartella();
    const esportato = viaggioCompleto(origine);
    const destinazione = nuovaCartella();
    sullaBaseDati(destinazione, (db) => {
      expect(importaViaggioSalvato(db, esportato)).toEqual({ ok: true, id: "versione-1" });
      expect(esportaViaggioSalvato(db, "versione-1")).toBe(esportato);
    });
  });

  it("CA-3 lo storico reimportato è lo stesso JSON del motore (esportaStorico), con le stesse versioni", () => {
    const origine = nuovaCartella();
    const esportato = viaggioCompleto(origine);
    const storicoOrigine = esportaStorico(statoSalvato(origine).storico);
    const documento = JSON.parse(esportato) as { storico: unknown; revisioniBozza: { viaggio: unknown }[] };
    expect(JSON.stringify(documento.storico, null, 2)).toBe(storicoOrigine);
    expect(JSON.stringify(documento.revisioniBozza[0]?.viaggio, null, 2)).toBe(esportaViaggio(datiValidi("versione-1").viaggio));

    const destinazione = nuovaCartella();
    sullaBaseDati(destinazione, (db) => {
      importaViaggioSalvato(db, esportato);
      expect(testoStoricoDelViaggio(db, "versione-1")).toBe(storicoOrigine);
      const storico = leggiStoricoDelViaggio(db, "versione-1");
      if (storico === null || !storico.ok) throw new Error("storico non valido");
      expect(storico.storico.versioni.map((v) => [v.numero, v.causa, v.autore])).toEqual([
        [1, "Itinerario iniziale", null],
        [2, "Meteo avverso: pioggia in GARDA_NORD il 2026-06-13 08:00–13:00", "Alice"],
      ]);
      const revisioni = elencaRevisioniBozza(db, "versione-1");
      expect(revisioni.ok && esportaViaggio(revisioni.revisioni[0]!.viaggio)).toBe(esportaViaggio(datiValidi("versione-1").viaggio));
    });
  });

  it("CA-3 nella stessa base dati: rifiutato se il viaggio esiste, identico se si sceglie di sostituirlo", () => {
    const cartella = nuovaCartella();
    const esportato = viaggioCompleto(cartella);
    sullaBaseDati(cartella, (db) => {
      expect(importaViaggioSalvato(db, esportato)).toEqual({ ok: false, motivo: "esiste già un viaggio con identificativo versione-1" });
      expect(importaViaggioSalvato(db, esportato, { sostituisci: true })).toEqual({ ok: true, id: "versione-1" });
      expect(esportaViaggioSalvato(db, "versione-1")).toBe(esportato);
      // Restano i dati locali dell'elenco: è ancora un viaggio demo, al suo posto.
      expect(trovaViaggio(db, "versione-1")).toMatchObject({ demo: true, ordine: 1 });
    });
  });

  it("CA-3 un viaggio con la sua istantanea si porta dietro l'istantanea, identica", () => {
    const origine = nuovaCartella();
    const istantanea = { id: "IST-ROMA-1", destinazione: "Roma", contenuto: { zone: [{ id: "ROMA_CENTRO" }], fonti: ["OpenStreetMap"] } };
    const esportato = sullaBaseDati(origine, (db) => {
      salvaIstantanea(db, istantanea);
      salvaViaggio(db, { id: "roma", titolo: "Roma in famiglia", stato: "bozza", demo: false, ordine: 5, destinazione: "Roma", istantanea: "IST-ROMA-1" });
      return esportaViaggioSalvato(db, "roma");
    });
    if (esportato === null) throw new Error("viaggio non trovato");
    const destinazione = nuovaCartella();
    statoSalvato(destinazione); // primo avvio: i 4 viaggi demo
    sullaBaseDati(destinazione, (db) => {
      expect(importaViaggioSalvato(db, esportato)).toEqual({ ok: true, id: "roma" });
      expect(leggiIstantanea(db, "IST-ROMA-1")).toEqual(istantanea);
      expect(esportaViaggioSalvato(db, "roma")).toBe(esportato);
      // Un viaggio importato non è un viaggio demo e va in fondo all'elenco.
      expect(trovaViaggio(db, "roma")).toMatchObject({ demo: false, ordine: 5 });
    });
  });

  it("un documento con uno storico manomesso è rifiutato dal motore (importaStorico) e la base dati non cambia", () => {
    const origine = nuovaCartella();
    const documento = JSON.parse(viaggioCompleto(origine)) as { viaggio: { id: string }; storico: { versioni: { causa: string }[] } };
    documento.viaggio.id = "copia";
    documento.storico.versioni[1]!.causa = "";
    const destinazione = nuovaCartella();
    sullaBaseDati(destinazione, (db) => {
      const prima = elencaViaggi(db);
      const esito = importaViaggioSalvato(db, JSON.stringify(documento));
      expect(esito.ok).toBe(false);
      expect(esito.ok ? "" : esito.motivo).toMatch(/^\[STORICO_NON_VALIDO\]/);
      expect(elencaViaggi(db)).toEqual(prima);
    });
  });

  it.each([
    ["{ non è json", "il testo non è JSON valido"],
    ['{"formato": 2}', "formato del documento non supportato: 2"],
    ['{"formato": 1, "viaggio": {"id": "", "titolo": "x", "stato": "bozza", "destinazione": null, "istantanea": null}}', "il viaggio deve avere un identificativo"],
    ['{"formato": 1, "viaggio": {"id": "a", "titolo": "x", "stato": "partito", "destinazione": null, "istantanea": null}}', "stato del viaggio sconosciuto: partito"],
  ])("un documento non valido (%s) non si importa", (testo, motivo) => {
    sullaBaseDati(nuovaCartella(), (db) => {
      expect(importaViaggioSalvato(db, testo)).toEqual({ ok: false, motivo });
    });
  });

  it("una revisione della bozza non valida è rifiutata dal motore (caricaViaggio)", () => {
    const documento = JSON.parse(viaggioCompleto(nuovaCartella())) as { viaggio: { id: string }; revisioniBozza: { viaggio: { giorni: unknown } }[] };
    documento.viaggio.id = "copia";
    documento.revisioniBozza[0]!.viaggio.giorni = "nessuno";
    sullaBaseDati(nuovaCartella(), (db) => {
      const esito = importaViaggioSalvato(db, JSON.stringify(documento));
      expect(esito.ok).toBe(false);
      expect(esito.ok ? "" : esito.motivo).toMatch(/^revisione B1: /);
      expect(trovaViaggio(db, "copia")).toBeNull();
    });
  });
});
