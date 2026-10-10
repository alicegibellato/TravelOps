/**
 * Bozza sul Garda con il solo percorso a pulsanti (TB-PREF-001): destinazione, date, 2 adulti e ritmo «Bilanciato»,
 * tutto il resto predefinito. Ogni giorno pieno ha 3 attività (pasti esclusi) quando il catalogo lo permette:
 * la varietà è un vincolo morbido e non deve lasciare una giornata a 1 attività se ci sono altre candidate.
 */
import { describe, expect, it } from "vitest";
import { generaBozza, validaProfilo, type IstantaneaCatalogo } from "../../src/index.js";
import { istantaneaPrecaricata, leggiIstantanea } from "./supporto.js";

const istantanea: IstantaneaCatalogo = leggiIstantanea(istantaneaPrecaricata("garda-2026-10-09"));

function profiloPercorso(inizio: string, fine: string) {
  const esito = validaProfilo({
    destinazione: { tipo: "luogo", nome: "Riva del Garda" },
    date: { tipo: "precise", inizio, fine },
    durata: 4,
    viaggiatori: { adulti: 2, bambini: [] },
    ritmo: "bilanciato",
  });
  if (!esito.ok) throw new Error(esito.problemi.map((p) => p.testo).join(" "));
  return esito.profilo;
}

describe.each([
  ["2026-06-13", "2026-06-16"],
  ["2026-07-10", "2026-07-13"],
  ["2026-11-01", "2026-11-04"],
])("Garda %s - %s, ritmo bilanciato con i valori predefiniti (TB-PREF-001)", (inizio, fine) => {
  const bozza = generaBozza(profiloPercorso(inizio, fine), istantanea);

  it("ogni giorno ha le attività previste dal ritmo, senza avvisi sul numero", () => {
    expect(bozza.giorni.map((g) => g.attivita.length)).toEqual(bozza.giorni.map((g) => g.attivitaPreviste));
    expect(bozza.giorni.map((g) => g.attivitaPreviste)).toEqual([2, 3, 3, 2]);
    expect(bozza.avvisi.filter((a) => a.includes("attività adatt"))).toEqual([]);
  });
});
