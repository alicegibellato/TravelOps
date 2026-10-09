/**
 * CA-6: ogni luogo di un'istantanea ha origine `osm` e un identificativo OpenStreetMap; ogni immagine ha licenza e
 * autore. Lo verifica il lettore: un'istantanea che non lo rispetta non si legge.
 */
import { describe, expect, it } from "vitest";
import { ATTRIBUZIONE_OSM, leggiIstantanea } from "../src/index.js";
import { conModifica, istantaneaDiProva, trova } from "./supporto.js";

function problemi(json: unknown): [string, string, string][] {
  const esito = leggiIstantanea(json);
  if (esito.ok) throw new Error("l'istantanea doveva essere non valida");
  return esito.errori.map((e) => [e.codice, e.percorso, e.messaggio]);
}

describe("CA-6 origine OpenStreetMap dei luoghi", () => {
  it("CA-6 nell'istantanea di prova ogni luogo ha origine osm e un identificativo OpenStreetMap", () => {
    const esito = leggiIstantanea(istantaneaDiProva());
    expect(esito.ok).toBe(true);
    if (!esito.ok) return;
    for (const luogo of esito.istantanea.luoghi) {
      expect(luogo.origine).toBe("osm");
      expect(luogo.osmId).toMatch(/^(node|way|relation)\/[1-9]\d*$/);
    }
  });

  it("CA-6 un luogo senza origine, o con origine riferimento, non è ammesso", () => {
    const json = conModifica((j) => {
      delete trova(j.luoghi, "PROVA-MUSEO")["origine"];
      delete trova(j.luoghi, "PROVA-MUSEO")["osmId"];
      trova(j.luoghi, "PROVA-PARCO")["origine"] = "riferimento";
      delete trova(j.luoghi, "PROVA-PARCO")["osmId"];
    });
    expect(problemi(json)).toEqual([
      ["ORIGINE_NON_OSM", "luoghi[0].origine", 'luoghi[0].origine: il luogo "PROVA-MUSEO" deve avere origine "osm" con il suo identificativo OpenStreetMap (valore trovato: assente)'],
      ["ORIGINE_NON_OSM", "luoghi[1].origine", 'luoghi[1].origine: il luogo "PROVA-PARCO" deve avere origine "osm" con il suo identificativo OpenStreetMap (valore trovato: "riferimento")'],
    ]);
  });

  it("CA-6 un luogo osm senza identificativo, o con un identificativo nel formato sbagliato, non è ammesso", () => {
    const json = conModifica((j) => {
      delete trova(j.luoghi, "PROVA-MUSEO")["osmId"];
      trova(j.luoghi, "PROVA-PARCO")["osmId"] = "12345";
    });
    expect(problemi(json)).toEqual([
      ["CATALOGO_NON_VALIDO", "luoghi[0].osmId", '[CAMPO_MANCANTE] PROVA-MUSEO: manca il campo "osmId", obbligatorio per un luogo con origine "osm"'],
      [
        "CATALOGO_NON_VALIDO",
        "luoghi[1].osmId",
        '[VALORE_NON_VALIDO] PROVA-PARCO: l\'identificativo OpenStreetMap "12345" non è nel formato node/<numero>, way/<numero> o relation/<numero>',
      ],
    ]);
  });

  it("CA-6 tra le fonti c'è l'attribuzione © OpenStreetMap contributors", () => {
    const esito = leggiIstantanea(istantaneaDiProva());
    expect(esito.ok && esito.istantanea.fonti.some((f) => f.attribuzione === ATTRIBUZIONE_OSM)).toBe(true);
    const json = conModifica((j) => {
      j.fonti = j.fonti.filter((f) => f["nome"] !== "OpenStreetMap");
    });
    expect(problemi(json)).toEqual([
      ["ATTRIBUZIONE_OSM_MANCANTE", "fonti", 'fonti: tra le fonti manca l\'attribuzione "© OpenStreetMap contributors" dei dati OpenStreetMap'],
    ]);
  });
});

describe("CA-6 licenza e autore delle immagini", () => {
  it("CA-6 ogni immagine dell'istantanea di prova ha autore e licenza", () => {
    const esito = leggiIstantanea(istantaneaDiProva());
    if (!esito.ok) throw new Error("istantanea di prova non valida");
    const immagini = esito.istantanea.attivita.flatMap((a) => (a.immagine === undefined ? [] : [a.immagine]));
    expect(immagini).toHaveLength(3);
    for (const immagine of immagini) {
      expect(immagine.autore).not.toBe("");
      expect(immagine.licenza).not.toBe("");
    }
  });

  it("CA-6 un'immagine senza autore o senza licenza non è ammessa", () => {
    const json = conModifica((j) => {
      const museo = trova(j.attivita, "PROVA-A-MUSEO")["immagine"] as Record<string, unknown>;
      delete museo["autore"];
      const parco = trova(j.attivita, "PROVA-A-PARCO")["immagine"] as Record<string, unknown>;
      parco["licenza"] = " ";
    });
    expect(problemi(json)).toEqual([
      ["IMMAGINE_SENZA_ATTRIBUZIONE", "attivita[0].immagine.autore", 'attivita[0].immagine.autore: l\'immagine dell\'attività "PROVA-A-MUSEO" deve avere l\'autore (valore trovato: assente)'],
      ["IMMAGINE_SENZA_ATTRIBUZIONE", "attivita[3].immagine.licenza", 'attivita[3].immagine.licenza: l\'immagine dell\'attività "PROVA-A-PARCO" deve avere la licenza (valore trovato: " ")'],
    ]);
  });

  it("CA-6 l'immagine resta un'immagine del motore: percorso e attribuzione obbligatori", () => {
    const json = conModifica((j) => {
      const museo = trova(j.attivita, "PROVA-A-MUSEO")["immagine"] as Record<string, unknown>;
      delete museo["attribuzione"];
    });
    expect(problemi(json)).toEqual([
      ["CATALOGO_NON_VALIDO", "attivita[0].immagine.attribuzione", '[CAMPO_MANCANTE] PROVA-A-MUSEO: manca il campo obbligatorio "attribuzione"'],
    ]);
  });
});
