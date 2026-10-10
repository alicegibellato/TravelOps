import { VIAGGI_DEMO_PRODOTTO } from "../src/stato/viaggi-demo";
import { esportaStorico, esportaViaggio } from "@travelops/engine";
import { describe, expect, it, vi } from "vitest";
import {
  aggiungiMessaggio,
  aggiungiRevisioneBozza,
  conversazioniDelViaggio,
  creaConversazione,
  elencaViaggi,
  esportaViaggioSalvato,
  leggiImpostazione,
  leggiIstantanea,
  leggiProfilo,
  salvaIstantanea,
  salvaProfilo,
  salvaViaggio,
  scriviImpostazione,
  testoStoricoDelViaggio,
} from "../src/basedati";
import { accettaProposta, avviaScenario, impostaOrologio } from "../src/stato/operazioni";
import { datiValidi } from "./supporto";
import { nuovaCartella, statoSalvato, sullaBaseDati } from "./supporto-stato";

const PROFILO = { destinazione: "Lago di Garda", durata: 4, viaggiatori: { adulti: 2, bambini: [] }, stili: ["natura", "gastronomia"] };

/** Un po' di tutto: lo stato della modalità presentazione (S1 accettato) e un viaggio del viaggiatore in bozza. */
function riempi(cartella: string): void {
  avviaScenario(cartella, "S8");
  avviaScenario(cartella, "S1");
  impostaOrologio(cartella, "2026-06-13", "07:30");
  accettaProposta(cartella, 2, "Alice");
  const viaggio = datiValidi("versione-1").viaggio;
  sullaBaseDati(cartella, (db) => {
    salvaIstantanea(db, { id: "IST-GARDA-1", destinazione: "Lago di Garda", contenuto: { zone: ["GARDA_NORD"] } });
    salvaViaggio(db, {
      id: "mio-garda",
      titolo: "Il mio Garda",
      stato: "bozza",
      demo: false,
      ordine: 10,
      destinazione: "Lago di Garda",
      istantanea: "IST-GARDA-1",
    });
    salvaProfilo(db, "mio-garda", PROFILO);
    aggiungiRevisioneBozza(db, "mio-garda", "Bozza iniziale", viaggio);
    aggiungiRevisioneBozza(db, "mio-garda", "Giornata più leggera", viaggio);
    const conversazione = creaConversazione(db, "mio-garda");
    aggiungiMessaggio(db, conversazione, { ruolo: "viaggiatore", testo: "Vorrei 4 giorni sul Garda", dati: null });
    aggiungiMessaggio(db, conversazione, { ruolo: "assistente", testo: "Ecco la bozza", dati: { revisione: 1 } });
    scriviImpostazione(db, "nome_viaggiatore", "Alice");
  });
}

/** Tutto ciò che è salvato, letto dalla base dati. */
function fotografia(cartella: string): unknown {
  const stato = statoSalvato(cartella);
  return sullaBaseDati(cartella, (db) => ({
    viaggi: elencaViaggi(db),
    storici: elencaViaggi(db).map((v) => testoStoricoDelViaggio(db, v.id)),
    presentazione: { ...stato, storico: esportaStorico(stato.storico) },
    viaggio: esportaViaggioSalvato(db, "mio-garda"),
    profilo: leggiProfilo(db, "mio-garda"),
    conversazioni: conversazioniDelViaggio(db, "mio-garda"),
    istantanea: leggiIstantanea(db, "IST-GARDA-1"),
    nome: leggiImpostazione(db, "nome_viaggiatore"),
  }));
}

describe("CA-2 lo stato sopravvive al riavvio della web app", () => {
  it("CA-2 dopo il riavvio (moduli ricaricati, nuova connessione) lo stato della modalità presentazione è identico", async () => {
    const cartella = nuovaCartella();
    riempi(cartella);
    const prima = statoSalvato(cartella);

    vi.resetModules();
    const archivio = await import("../src/stato/archivio");
    const riletto = archivio.leggiStato(cartella);
    if (!riletto.ok) throw new Error(riletto.motivo);
    expect(esportaStorico(riletto.stato.storico)).toBe(esportaStorico(prima.storico));
    expect(riletto.stato.storico.versioni.map((v) => [v.numero, v.autore])).toEqual([
      [1, null],
      [2, "Alice"],
    ]);
    expect([riletto.stato.partenza, riletto.stato.scenario, riletto.stato.orologio, riletto.stato.prossimaProposta]).toEqual([
      "versione-1",
      "S1",
      { data: "2026-06-13", ora: "07:30" },
      3,
    ]);
    expect(riletto.stato.proposte).toEqual(prima.proposte);
    expect(riletto.stato.proposte.map((p) => [p.id, p.decisione?.tipo])).toEqual([[2, "accettata"]]);
  });

  it("CA-2 dopo il riavvio viaggi, profili, revisioni della bozza, storici, proposte, conversazioni, istantanee e impostazioni sono identici", async () => {
    const cartella = nuovaCartella();
    riempi(cartella);
    const prima = fotografia(cartella);

    vi.resetModules();
    const supporto = await import("./supporto-stato");
    const basedati = await import("../src/basedati");
    expect(fotografia(cartella)).toEqual(prima);
    // Le revisioni della bozza tornano come le ha scritte il motore.
    const revisioni = supporto.sullaBaseDati(cartella, (db) => basedati.elencaRevisioniBozza(db, "mio-garda"));
    if (!revisioni.ok) throw new Error(revisioni.motivo);
    expect(revisioni.revisioni.map((r) => [r.numero, r.causa])).toEqual([
      [1, "Bozza iniziale"],
      [2, "Giornata più leggera"],
    ]);
    expect(esportaViaggio(revisioni.revisioni[0]!.viaggio)).toBe(esportaViaggio(datiValidi("versione-1").viaggio));
  });

  it("CA-2 il riavvio non ripete il primo avvio: i viaggi demo modificati restano come sono", async () => {
    const cartella = nuovaCartella();
    riempi(cartella);
    const storico = sullaBaseDati(cartella, (db) => testoStoricoDelViaggio(db, "versione-1"));

    vi.resetModules();
    const archivio = await import("../src/stato/archivio");
    archivio.preparaBaseDati(cartella);
    const riletto = archivio.leggiStato(cartella);
    expect(riletto.ok && riletto.stato.storico.versioni).toHaveLength(2);
    expect(sullaBaseDati(cartella, (db) => testoStoricoDelViaggio(db, "versione-1"))).toBe(storico);
    expect(sullaBaseDati(cartella, elencaViaggi).map((v) => v.id)).toEqual(["versione-1", "v-irr", "v-fisso", "v-volo", ...VIAGGI_DEMO_PRODOTTO, "mio-garda"]);
  });
});
