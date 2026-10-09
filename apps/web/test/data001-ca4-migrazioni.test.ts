import { describe, expect, it } from "vitest";
import {
  apriBaseDati,
  applicaMigrazioni,
  conBaseDati,
  MIGRAZIONI,
  migrazioniApplicate,
  type BaseDati,
  type Migrazione,
} from "../src/basedati";
import { leggiStato } from "../src/stato/archivio";
import { accettaProposta, avviaScenario } from "../src/stato/operazioni";
import { nuovaCartella, statoSalvato, sullaBaseDati } from "./supporto-stato";

/** Schema, versione e contenuto di tutte le tabelle: tutto ciò che una migrazione potrebbe cambiare. */
function fotografia(db: BaseDati): unknown {
  const oggetti = db.prepare<unknown[], Record<string, unknown>>("SELECT type, name, tbl_name, sql FROM sqlite_master ORDER BY type, name").all();
  const tabelle = oggetti.filter((o) => o.type === "table").map((o) => String(o.name));
  return {
    oggetti,
    versione: db.prepare("PRAGMA user_version").get(),
    righe: Object.fromEntries(tabelle.map((t) => [t, db.prepare(`SELECT * FROM "${t}" ORDER BY 1, 2`).all()])),
  };
}

describe("CA-4 le migrazioni applicate due volte non cambiano nulla", () => {
  it("CA-4 le migrazioni sono numerate da 1 senza salti", () => {
    expect(MIGRAZIONI.map((m) => m.numero)).toEqual(MIGRAZIONI.map((_, i) => i + 1));
    for (const m of MIGRAZIONI) expect(m.nome.trim()).not.toBe("");
  });

  it("CA-4 riapplicate su una base dati già aggiornata: nessuna migrazione eseguita, schema e dati identici", () => {
    const cartella = nuovaCartella();
    avviaScenario(cartella, "S1");
    accettaProposta(cartella, 1, "Alice");
    sullaBaseDati(cartella, (db) => {
      const prima = fotografia(db);
      expect(migrazioniApplicate(db)).toEqual([1]);
      expect(applicaMigrazioni(db)).toEqual([]);
      expect(applicaMigrazioni(db)).toEqual([]);
      expect(fotografia(db)).toEqual(prima);
    });
  });

  it("CA-4 lo SQL di ogni migrazione eseguito due volte non dà errori e non cambia lo schema", () => {
    const cartella = nuovaCartella();
    sullaBaseDati(cartella, (db) => {
      const dopoLaPrima = fotografia(db);
      for (const m of MIGRAZIONI) db.exec(m.sql);
      expect(fotografia(db)).toEqual(dopoLaPrima);
    });
  });

  it("CA-4 riaprire la base dati (un secondo avvio) non riapplica migrazioni e non ripete il primo avvio", () => {
    const cartella = nuovaCartella();
    avviaScenario(cartella, "S1");
    accettaProposta(cartella, 1, "Alice");
    const prima = sullaBaseDati(cartella, fotografia);
    for (let i = 0; i < 2; i++) {
      const db = apriBaseDati(cartella, () => {
        throw new Error("il primo avvio non deve ripetersi");
      });
      db.close();
    }
    expect(statoSalvato(cartella).storico.versioni).toHaveLength(2);
    expect(sullaBaseDati(cartella, fotografia)).toEqual(prima);
  });

  it("una migrazione che fallisce non lascia nulla a metà e non si registra", () => {
    const cartella = nuovaCartella();
    const rotta: Migrazione = { numero: 2, nome: "Rotta", sql: "CREATE TABLE prova (a TEXT); SELECT * FROM tabella_inesistente;" };
    sullaBaseDati(cartella, (db) => {
      const prima = fotografia(db);
      expect(() => applicaMigrazioni(db, [...MIGRAZIONI, rotta])).toThrow(/tabella_inesistente/);
      expect(migrazioniApplicate(db)).toEqual([1]);
      expect(fotografia(db)).toEqual(prima);
    });
  });

  it("una migrazione nuova si applica una volta sola, alla prima apertura", () => {
    const cartella = nuovaCartella();
    const nuova: Migrazione = { numero: 2, nome: "Prova", sql: "CREATE TABLE IF NOT EXISTS prova (a TEXT) STRICT;" };
    sullaBaseDati(cartella, (db) => {
      expect(applicaMigrazioni(db, [...MIGRAZIONI, nuova])).toEqual([2]);
      expect(applicaMigrazioni(db, [...MIGRAZIONI, nuova])).toEqual([]);
      expect(migrazioniApplicate(db)).toEqual([1, 2]);
    });
  });

  it("una base dati scritta da una versione più recente della web app non si tocca: la pagina mostra il motivo", () => {
    const cartella = nuovaCartella();
    sullaBaseDati(cartella, (db) => db.prepare("INSERT INTO migrazioni (numero, nome) VALUES (99, 'Futura')").run());
    expect(() => conBaseDati(cartella, () => undefined)).toThrow(/versione più recente della web app \(migrazioni 99\)/);
    const letto = leggiStato(cartella);
    expect(letto.ok ? "" : letto.motivo).toMatch(/^la base dati non si può leggere/);
  });
});
