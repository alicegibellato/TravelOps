import { describe, expect, it } from "vitest";
import { caricaCatalogo, caricaViaggio, esportaCatalogo, esportaViaggio } from "../../src/itinerary/index.js";
import type { Viaggio } from "../../src/model/index.js";
import { catalogoDiRiferimento, elemento, FILE_VIAGGI, leggiRiferimento, testoRiferimento } from "./dati.js";

function caricaValido(dati: unknown): Viaggio {
  const esito = caricaViaggio(dati, catalogoDiRiferimento());
  if (!esito.ok) throw new Error(esito.errori.map((e) => e.messaggio).join("; "));
  return esito.valore;
}

describe("CA-4 — esportare e ricaricare restituisce dati identici", () => {
  it("CA-4 il catalogo esportato e ricaricato è identico, coordinate comprese", () => {
    const catalogo = catalogoDiRiferimento();
    const json = esportaCatalogo(catalogo);
    const ricaricato = caricaCatalogo(json);
    expect(ricaricato).toStrictEqual({ ok: true, valore: catalogo });
    if (!ricaricato.ok) return;
    expect(ricaricato.valore.zone.find((z) => z.id === "GARDA_NORD")?.coordinate).toStrictEqual({ lat: 45.885, lon: 10.845 });
    expect(ricaricato.valore.luoghi.find((l) => l.id === "AEROPORTO-FCO")?.coordinate).toStrictEqual({
      lat: 41.8003,
      lon: 12.2389,
    });
  });

  it.each(FILE_VIAGGI)("CA-4 %s esportato e ricaricato è identico all'originale", (file) => {
    const viaggio = caricaValido(leggiRiferimento(file));
    const ricaricato = caricaValido(esportaViaggio(viaggio));
    expect(ricaricato).toStrictEqual(viaggio);
  });

  it("CA-4 restano identici priorità, orario fisso, prenotazioni e prossimo numero per gli id nuovi", () => {
    const grezzo = leggiRiferimento("variante-v-volo.json");
    grezzo.prossimoNumeroId = 7;
    elemento(grezzo, "D3-E2").priorita = "irrinunciabile";
    elemento(grezzo, "D2-E2").priorita = "opzionale";
    elemento(grezzo, "D2-E4").orarioFisso = true;
    elemento(grezzo, "D3-E8").prenotazione = { fornitore: "Noleggio di esempio", codice: "AUTO-1" };
    elemento(grezzo, "D1-E2").id = "N6";
    const viaggio = caricaValido(grezzo);

    const ricaricato = caricaValido(esportaViaggio(viaggio));

    expect(ricaricato).toStrictEqual(viaggio);
    expect(ricaricato.prossimoNumeroId).toBe(7);
    expect(elemento(ricaricato, "D3-E2").priorita).toBe("irrinunciabile");
    expect(elemento(ricaricato, "D2-E2").priorita).toBe("opzionale");
    expect(elemento(ricaricato, "D1-E3").orarioFisso).toBe(false);
    expect(elemento(ricaricato, "D2-E4").orarioFisso).toBe(true);
    expect(elemento(ricaricato, "D3-E9").orarioFisso).toBe(true);
    expect(elemento(ricaricato, "D3-E9").prenotazione).toStrictEqual({
      fornitore: "Compagnia aerea di esempio",
      codice: "XY123",
      linkGestione: "https://example.com/prenotazioni/XY123",
    });
    expect(elemento(ricaricato, "D3-E8").prenotazione).toStrictEqual({ fornitore: "Noleggio di esempio", codice: "AUTO-1" });
    expect(elemento(ricaricato, "N6").tipo).toBe("attivita");
  });

  it("CA-4 l'esportazione è deterministica e coincide con i file di riferimento", () => {
    const catalogo = catalogoDiRiferimento();
    expect(esportaCatalogo(catalogo)).toBe(esportaCatalogo(catalogoDiRiferimento()));
    expect(esportaCatalogo(catalogo)).toBe(testoRiferimento("catalogo.json").trimEnd());
    for (const file of FILE_VIAGGI) {
      const viaggio = caricaValido(leggiRiferimento(file));
      expect(esportaViaggio(viaggio)).toBe(JSON.stringify(leggiRiferimento(file), null, 2));
      expect(esportaViaggio(caricaValido(esportaViaggio(viaggio)))).toBe(esportaViaggio(viaggio));
    }
  });

  it("CA-4 un viaggio senza valori espliciti viene esportato con i valori predefiniti e ricaricato identico", () => {
    const grezzo = leggiRiferimento("versione-1.json");
    delete elemento(grezzo, "D1-E2").priorita;
    delete elemento(grezzo, "D1-E2").orarioFisso;
    const viaggio = caricaValido(grezzo);
    const json = JSON.parse(esportaViaggio(viaggio));
    expect(elemento(json, "D1-E2")).toMatchObject({ priorita: "desiderata", orarioFisso: false });
    expect(caricaValido(json)).toStrictEqual(viaggio);
  });
});
