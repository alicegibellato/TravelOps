/**
 * REQ-DEMO-001 CA-3 (ST-DEMO-001B): «Ripristina i viaggi demo» riporta ogni viaggio demo allo stato iniziale senza
 * toccare gli altri viaggi. Sulla base dati SQLite vera: si crea un viaggio che non è demo, si cambiano i viaggi demo
 * (anche i tre della §8.3), si ripristina e si confronta con lo stato di prima.
 */
import { creaStorico } from "@travelops/engine";
import { describe, expect, it } from "vitest";
import {
  aggiungiRevisioneBozza,
  elencaRevisioniBozza,
  elencaViaggi,
  esportaViaggioSalvato,
  leggiImpostazione,
  salvaProfilo,
  salvaStoricoDelViaggio,
  salvaViaggio,
  scriviImpostazione,
  sostituisciProposteDelViaggio,
  trovaViaggio,
  type BaseDati,
} from "../src/basedati";
import { CHIAVE_DATI_BOZZA } from "../src/bozza/chiavi";
import { ripristinaViaggiDemo } from "../src/stato/operazioni";
import { VIAGGI_DEMO, VIAGGI_DEMO_PRODOTTO } from "../src/stato/viaggi-demo";
import { nuovaCartella, statoSalvato, sullaBaseDati } from "./supporto-stato";

const TUTTI = [...VIAGGI_DEMO.map((v) => v.id), ...VIAGGI_DEMO_PRODOTTO];
const fotografia = (db: BaseDati, id: string) => ({ viaggio: trovaViaggio(db, id), esportato: esportaViaggioSalvato(db, id), bozza: leggiImpostazione(db, CHIAVE_DATI_BOZZA(id)) });

function rovina(db: BaseDati, id: string): void {
  const prima = trovaViaggio(db, id)!;
  salvaViaggio(db, { ...prima, titolo: "Cambiato", stato: prima.stato === "bozza" ? "confermato" : "bozza" });
  salvaProfilo(db, id, { stili: ["relax"] });
  sostituisciProposteDelViaggio(db, id, [{ id: 1, origine: "prova", proposta: {}, decisione: null, esito: null }]);
  const revisioni = elencaRevisioniBozza(db, id);
  if (revisioni.ok && revisioni.revisioni[0] !== undefined) {
    aggiungiRevisioneBozza(db, id, "Modifica: prova", revisioni.revisioni[0].viaggio);
    scriviImpostazione(db, CHIAVE_DATI_BOZZA(id), { revisioni: {}, confermata: 2 });
  }
  const base = revisioni.ok ? revisioni.revisioni[0] : undefined;
  const storico = base === undefined ? null : creaStorico(base.viaggio);
  if (storico?.ok) salvaStoricoDelViaggio(db, id, storico.storico);
}

describe("CA-3 Ripristina i viaggi demo", () => {
  it("al primo avvio ci sono i tre viaggi della §8.3 (Garda e Dolomiti confermati, Roma bozza), accanto a quelli dell'ondata 1", () => {
    const cartella = nuovaCartella();
    statoSalvato(cartella);
    const viaggi = sullaBaseDati(cartella, elencaViaggi);
    expect(viaggi.map((v) => [v.id, v.stato, v.demo])).toEqual([
      ...VIAGGI_DEMO.map((v) => [v.id, "confermato", true]),
      ["TRIP-DEMO-GARDA", "confermato", true],
      ["TRIP-DEMO-DOLOMITI", "confermato", true],
      ["TRIP-DEMO-ROMA", "bozza", true],
    ]);
  });

  it("ogni viaggio demo torna com'era; il viaggio del viaggiatore non cambia", () => {
    const cartella = nuovaCartella();
    statoSalvato(cartella);
    const iniziale = sullaBaseDati(cartella, (db) => {
      const foto = Object.fromEntries(TUTTI.map((id) => [id, fotografia(db, id)]));
      salvaViaggio(db, { id: "mio", titolo: "Il mio viaggio", stato: "bozza", demo: false, ordine: 50, destinazione: null, istantanea: null });
      salvaProfilo(db, "mio", { stili: ["relax"] });
      return foto;
    });
    const mioPrima = sullaBaseDati(cartella, (db) => fotografia(db, "mio"));

    sullaBaseDati(cartella, (db) => {
      for (const id of TUTTI) rovina(db, id);
      for (const id of TUTTI) expect(fotografia(db, id), id).not.toEqual(iniziale[id]);
    });

    const esito = ripristinaViaggiDemo(cartella);
    expect(esito.ok && esito.ricaricati).toEqual(TUTTI);

    sullaBaseDati(cartella, (db) => {
      for (const id of TUTTI) expect(fotografia(db, id), id).toEqual(iniziale[id]);
      expect(fotografia(db, "mio")).toEqual(mioPrima);
      expect(elencaViaggi(db).map((v) => v.id)).toEqual([...TUTTI, "mio"]);
    });
  });

  it("un viaggio demo cancellato torna; Ripristina due volte di fila dà lo stesso risultato", () => {
    const cartella = nuovaCartella();
    statoSalvato(cartella);
    const prima = sullaBaseDati(cartella, (db) => fotografia(db, "TRIP-DEMO-ROMA"));
    sullaBaseDati(cartella, (db) => db.prepare("DELETE FROM viaggi WHERE id = ?").run("TRIP-DEMO-ROMA"));
    ripristinaViaggiDemo(cartella);
    ripristinaViaggiDemo(cartella);
    expect(sullaBaseDati(cartella, (db) => fotografia(db, "TRIP-DEMO-ROMA"))).toEqual(prima);
  });
});
