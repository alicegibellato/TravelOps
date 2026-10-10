/**
 * ST-CAT-002C: la web app cerca e costruisce le destinazioni dalla sorgente registrata sulle istantanee del suo
 * database (quelle del repository, caricate al primo avvio): nessuna rete. Il database è in una cartella temporanea.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { salvaIstantanea } from "../src/basedati";
import { creaServizioDestinazioni } from "../src/destinazioni/servizio";
import { sorgenteDestinazioniLocale } from "../src/destinazioni/sorgente";
import { candidateConfigurate } from "../src/destinazioni/candidati";
import { nuovaCartella, sullaBaseDati } from "./supporto-stato";

const FILE_PROVA = join(process.cwd(), "..", "..", "packages", "sources", "test", "dati", "prova-dato-di-test.json");

describe("sorgente delle destinazioni della web app", () => {
  it("senza l'istantanea cercata nel database la ricerca non la trova (e non solleva errori)", async () => {
    const sorgente = sorgenteDestinazioniLocale(nuovaCartella());
    expect(await sorgente.cercaDestinazioni("borgo")).toEqual([]);
    expect((await sorgente.elencaIstantanee()).map((i) => i.destinazione)).not.toContain("Borgo di Prova");
  });

  it("con un'istantanea nel database la ricerca la trova e la costruzione la restituisce", async () => {
    const cartella = nuovaCartella();
    const contenuto = JSON.parse(readFileSync(FILE_PROVA, "utf8")) as { id: string; destinazione: string };
    sullaBaseDati(cartella, (db) => {
      salvaIstantanea(db, { id: contenuto.id, destinazione: contenuto.destinazione, contenuto });
    });
    const servizio = creaServizioDestinazioni({ sorgente: sorgenteDestinazioniLocale(cartella), candidate: candidateConfigurate() });
    const trovati = await servizio.cerca("borgo di");
    expect(trovati.map((t) => t.nome)).toEqual(["Borgo di Prova"]);
    const esito = await servizio.costruisci(trovati[0] as NonNullable<(typeof trovati)[0]>);
    expect(esito.esito).toBe("pronta");
  });

  it("un'area che non si legge dà un messaggio gentile", async () => {
    const servizio = creaServizioDestinazioni({ sorgente: sorgenteDestinazioniLocale(nuovaCartella()), candidate: [] });
    const esito = await servizio.costruisci({ id: "" } as never);
    expect(esito).toEqual({ esito: "non_disponibile", messaggio: "Non riesco a leggere la destinazione scelta. Cercala di nuovo." });
  });
});
