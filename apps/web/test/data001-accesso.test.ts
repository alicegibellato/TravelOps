import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { creaStorico, esportaStorico } from "@travelops/engine";
import { describe, expect, it } from "vitest";
import {
  aggiungiMessaggio,
  aggiungiRevisioneBozza,
  collegaConversazione,
  conversazioniDelViaggio,
  creaConversazione,
  elencaIstantanee,
  elencaProposteDelViaggio,
  elencaRevisioniBozza,
  elencaViaggi,
  eliminaViaggio,
  esportaViaggioSalvato,
  leggiConversazione,
  leggiImpostazione,
  leggiIstantanea,
  leggiProfilo,
  salvaIstantanea,
  salvaProfilo,
  salvaStoricoDelViaggio,
  salvaViaggio,
  scriviImpostazione,
  testoStoricoDelViaggio,
  trovaViaggio,
} from "../src/basedati";
import { accettaProposta, avviaScenario, impostaOrologio, ripristinaViaggiDemo } from "../src/stato/operazioni";
import { VIAGGI_DEMO } from "../src/stato/viaggi-demo";
import { datiValidi } from "./supporto";
import { nuovaCartella, statoSalvato, sullaBaseDati } from "./supporto-stato";

const CARTELLA_APP = fileURLToPath(new URL("..", import.meta.url));

function storicoDiPartenza(chiave: string): string {
  const creato = creaStorico(datiValidi(chiave).viaggio);
  if (!creato.ok) throw new Error(creato.errore.messaggio);
  return esportaStorico(creato.storico);
}

/** Pagine, componenti e logica della web app, senza commenti. */
function sorgenti(): { file: string; codice: string }[] {
  const trovati: { file: string; codice: string }[] = [];
  const visita = (cartella: string): void => {
    for (const nome of readdirSync(cartella)) {
      const percorso = join(cartella, nome);
      if (statSync(percorso).isDirectory()) visita(percorso);
      else if (/\.(ts|tsx|mjs)$/.test(nome)) {
        const testo = readFileSync(percorso, "utf8");
        trovati.push({
          file: relative(CARTELLA_APP, percorso).replaceAll("\\", "/"),
          codice: testo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1"),
        });
      }
    }
  };
  for (const cartella of ["app", "src"]) visita(join(CARTELLA_APP, cartella));
  trovati.push({ file: "instrumentation.ts", codice: readFileSync(join(CARTELLA_APP, "instrumentation.ts"), "utf8") });
  return trovati;
}

describe("uno strato di accesso unico (nessuna query sparsa nelle pagine)", () => {
  it("SQL e better-sqlite3 compaiono solo in src/basedati", () => {
    const sql = /better-sqlite3|new Database\(|\.prepare\(|\bdb\.exec\(|\b(SELECT|INSERT INTO|UPDATE|DELETE FROM|CREATE TABLE|PRAGMA|BEGIN)\b/;
    const fuori = sorgenti()
      .filter(({ file, codice }) => !file.startsWith("src/basedati/") && sql.test(codice))
      .map(({ file }) => file);
    expect(fuori).toEqual([]);
    expect(sorgenti().filter(({ file, codice }) => file.startsWith("src/basedati/") && codice.includes("better-sqlite3")).length).toBeGreaterThan(0);
  });

  it("le pagine non usano la base dati direttamente: leggono lo stato da src/stato", () => {
    const dirette = sorgenti()
      .filter(({ file, codice }) => (file.startsWith("app/") || file.startsWith("src/componenti/")) && /src\/basedati|\.\.\/basedati/.test(codice))
      .map(({ file }) => file);
    expect(dirette).toEqual([]);
  });
});

describe("\"Ripristina i viaggi demo\" li ricarica senza toccare gli altri viaggi", () => {
  it("ogni viaggio demo torna allo stato iniziale; il viaggio del viaggiatore resta identico", () => {
    const cartella = nuovaCartella();
    avviaScenario(cartella, "S8");
    accettaProposta(cartella, 1, "Alice");
    avviaScenario(cartella, "S1");
    impostaOrologio(cartella, "2026-06-13", "07:30");
    accettaProposta(cartella, 2, "Alice");
    sullaBaseDati(cartella, (db) => {
      salvaProfilo(db, "v-irr", { stili: ["cultura"] });
      creaConversazione(db, "v-fisso");
      salvaViaggio(db, { id: "mio", titolo: "Il mio viaggio", stato: "confermato", demo: false, ordine: 9, destinazione: null, istantanea: null });
      salvaStoricoDelViaggio(db, "mio", statoSalvato(cartella).storico);
      salvaProfilo(db, "mio", { stili: ["relax"] });
      aggiungiMessaggio(db, creaConversazione(db, "mio"), { ruolo: "viaggiatore", testo: "Ciao", dati: null });
      eliminaViaggio(db, "v-irr");
    });
    const mioPrima = sullaBaseDati(cartella, (db) => esportaViaggioSalvato(db, "mio"));

    const esito = ripristinaViaggiDemo(cartella);
    expect(esito.ok && esito.ricaricati).toEqual(VIAGGI_DEMO.map((v) => v.id));

    sullaBaseDati(cartella, (db) => {
      expect(elencaViaggi(db).map((v) => [v.id, v.demo])).toEqual([
        ["versione-1", true],
        ["v-irr", true],
        ["v-fisso", true],
        ["v-volo", true],
        ["mio", false],
      ]);
      for (const { id } of VIAGGI_DEMO) {
        expect(testoStoricoDelViaggio(db, id)).toBe(storicoDiPartenza(id));
        expect(elencaProposteDelViaggio(db, id)).toEqual([]);
        expect(leggiProfilo(db, id)).toBeNull();
        expect(conversazioniDelViaggio(db, id)).toEqual([]);
        expect(trovaViaggio(db, id)?.stato).toBe("confermato");
      }
      expect(esportaViaggioSalvato(db, "mio")).toBe(mioPrima);
    });
    // La modalità presentazione riparte dalla versione 1, con scenario e orologio di prima.
    const stato = statoSalvato(cartella);
    expect([stato.storico.versioni.length, stato.proposte, stato.scenario, stato.orologio]).toEqual([
      1,
      [],
      "S1",
      { data: "2026-06-13", ora: "07:30" },
    ]);
  });
});

describe("i dati della CR-001 nella base dati", () => {
  it("profilo, revisioni della bozza (B1, B2…), conversazioni e impostazioni si salvano e si rileggono", () => {
    const cartella = nuovaCartella();
    sullaBaseDati(cartella, (db) => {
      salvaViaggio(db, { id: "t", titolo: "Prova", stato: "bozza", demo: false, ordine: 1, destinazione: "Roma", istantanea: null });
      salvaProfilo(db, "t", { ritmo: "lento" });
      expect(leggiProfilo(db, "t")).toEqual({ ritmo: "lento" });
      salvaProfilo(db, "t", null);
      expect(leggiProfilo(db, "t")).toBeNull();

      const viaggio = datiValidi("versione-1").viaggio;
      expect(aggiungiRevisioneBozza(db, "t", "Bozza iniziale", viaggio)).toBe(1);
      expect(aggiungiRevisioneBozza(db, "t", "Sostituito il museo con il lungolago", viaggio)).toBe(2);
      const revisioni = elencaRevisioniBozza(db, "t");
      expect(revisioni.ok && revisioni.revisioni.map((r) => [r.numero, r.causa])).toEqual([
        [1, "Bozza iniziale"],
        [2, "Sostituito il museo con il lungolago"],
      ]);

      // Una conversazione nata dalla home, prima del viaggio, poi collegata al viaggio.
      const id = creaConversazione(db, null);
      expect(aggiungiMessaggio(db, id, { ruolo: "viaggiatore", testo: "Raccontami il viaggio", dati: null })).toBe(1);
      expect(aggiungiMessaggio(db, id, { ruolo: "assistente", testo: "Dove vorresti andare?", dati: { domanda: "destinazione" } })).toBe(2);
      expect(conversazioniDelViaggio(db, "t")).toEqual([]);
      collegaConversazione(db, id, "t");
      expect(leggiConversazione(db, id)).toEqual({
        id,
        viaggioId: "t",
        messaggi: [
          { numero: 1, ruolo: "viaggiatore", testo: "Raccontami il viaggio", dati: null },
          { numero: 2, ruolo: "assistente", testo: "Dove vorresti andare?", dati: { domanda: "destinazione" } },
        ],
      });
      expect(() => aggiungiMessaggio(db, id, { ruolo: "sistema" as "assistente", testo: "x", dati: null })).toThrow(/ruolo/);

      scriviImpostazione(db, "nome_viaggiatore", "Alice");
      scriviImpostazione(db, "nome_viaggiatore", "Bea");
      expect(leggiImpostazione(db, "nome_viaggiatore")).toBe("Bea");
      expect(leggiImpostazione(db, "inesistente")).toBeUndefined();

      // Eliminare un viaggio elimina tutto ciò che gli appartiene.
      expect(eliminaViaggio(db, "t")).toBe(true);
      expect(leggiConversazione(db, id)).toBeNull();
      expect(elencaRevisioniBozza(db, "t")).toEqual({ ok: true, revisioni: [] });
    });
  });

  it("un'istantanea non cambia mai: salvarla identica non fa nulla, con un contenuto diverso è un errore", () => {
    sullaBaseDati(nuovaCartella(), (db) => {
      const istantanea = { id: "IST-1", destinazione: "Lisbona", contenuto: { luoghi: 42 } };
      salvaIstantanea(db, istantanea);
      salvaIstantanea(db, istantanea);
      expect(elencaIstantanee(db)).toEqual([{ id: "IST-1", destinazione: "Lisbona" }]);
      expect(() => salvaIstantanea(db, { ...istantanea, contenuto: { luoghi: 43 } })).toThrow(/non cambia mai/);
      expect(leggiIstantanea(db, "IST-1")).toEqual(istantanea);
      expect(leggiIstantanea(db, "IST-2")).toBeNull();
    });
  });

  it("i vincoli dello schema proteggono i dati: stato del viaggio e riferimenti", () => {
    sullaBaseDati(nuovaCartella(), (db) => {
      expect(() =>
        salvaViaggio(db, { id: "x", titolo: "x", stato: "partito" as "bozza", demo: false, ordine: 1, destinazione: null, istantanea: null }),
      ).toThrow(/stato del viaggio sconosciuto/);
      expect(() =>
        salvaViaggio(db, { id: "x", titolo: "x", stato: "bozza", demo: false, ordine: 1, destinazione: null, istantanea: "IST-NESSUNA" }),
      ).toThrow(/FOREIGN KEY/);
      expect(() => creaConversazione(db, "viaggio-inesistente")).toThrow(/FOREIGN KEY/);
    });
  });
});
