/**
 * ST-QA-FIX-002 (collaudo TO-021, TO-029; testbook TB-CHAT-009, TB-CHAT-010): destinazioni reali di serie, con le
 * destinazioni già pronte come ripiego.
 * - senza configurazione la web app usa le destinazioni reali; nei test e con `TRAVELOPS_GEOCODING=finto` restano finte;
 * - una destinazione già pronta non si ricostruisce (il Lago di Garda non dipende da Overpass);
 * - se la costruzione reale fallisce e c'è una destinazione pronta con lo stesso nome, si usa quella;
 * - se fallisce per un luogo nuovo, `prepara_destinazione` risponde con un errore (traccia «errore», nessuna
 *   istantanea salvata), così la chat non dice che il viaggio è pronto.
 * Nessuna rete: la sorgente reale è finta.
 */
import { creaArchivioInMemoria, creaStrumentiMotore } from "@travelops/agents";
import type { AreaDestinazione, EsitoCostruzione, SorgenteDestinazioni } from "@travelops/sources";
import { describe, expect, it, vi } from "vitest";
import { destinazioniReali, sorgenteConPronte, sorgenteDestinazioniLocale } from "../src/destinazioni/sorgente";
import { nuovaCartella, sullaBaseDati } from "./supporto-stato";

const LISBONA: AreaDestinazione = { id: "osm:relation/5400890", nome: "Lisbona", descrizione: "Portogallo" } as AreaDestinazione;

/** Una sorgente reale finta: trova Lisbona e un «Lago di Garda» con un altro id; costruire dà l'esito indicato. */
function realeFinta(costruzione: () => Promise<EsitoCostruzione>): SorgenteDestinazioni & { costruite: string[] } {
  const costruite: string[] = [];
  return {
    tipo: "reale",
    costruite,
    cercaDestinazioni: async (testo) =>
      /lisbon/i.test(testo) ? [LISBONA] : /garda/i.test(testo) ? [{ id: "osm:relation/8569", nome: "Lago di Garda", descrizione: "Italia" } as AreaDestinazione] : [],
    costruisciIstantanea: async (area) => {
      costruite.push(area.id);
      return costruzione();
    },
    leggiIstantanea: async () => null,
    elencaIstantanee: async () => [],
  };
}

/** Le destinazioni già pronte della base dati (quelle del repository, caricate al primo avvio). */
function pronte(): SorgenteDestinazioni {
  const cartella = nuovaCartella();
  sullaBaseDati(cartella, () => undefined);
  return sorgenteDestinazioniLocale(cartella, { VITEST: "1" });
}

const nonDisponibile = async (): Promise<EsitoCostruzione> => ({ ok: false, motivo: "non_disponibile", messaggio: "Overpass ha risposto 504." });

describe("ST-QA-FIX-002 destinazioni reali di serie", () => {
  it("senza configurazione sono reali; nei test e con TRAVELOPS_GEOCODING=finto restano finte", () => {
    expect(destinazioniReali({})).toBe(true);
    expect(destinazioniReali({ VITEST: "true" })).toBe(false);
    expect(destinazioniReali({ NODE_ENV: "test" })).toBe(false);
    expect(destinazioniReali({ TRAVELOPS_GEOCODING: "finto" })).toBe(false);
    expect(destinazioniReali({ TRAVELOPS_PERCORSI: "finto" })).toBe(false);
    expect(destinazioniReali({ TRAVELOPS_GEOCODING: "reale", VITEST: "true" })).toBe(true);
  });
});

describe("ST-QA-FIX-002 ripiego sulle destinazioni pronte", () => {
  it("una destinazione pronta viene prima nella ricerca e non si ricostruisce con i servizi reali", async () => {
    const reale = realeFinta(nonDisponibile);
    const sorgente = sorgenteConPronte(reale, pronte());
    const [prima] = await sorgente.cercaDestinazioni("Lago di Garda", { limite: 5 });
    expect(prima?.nome).toMatch(/Garda/);
    expect(prima?.id).not.toBe("osm:relation/8569");
    const esito = await sorgente.costruisciIstantanea(prima as AreaDestinazione);
    expect(esito.ok).toBe(true);
    expect(reale.costruite).toEqual([]);
  }, 60_000);

  it("se la costruzione reale fallisce e c'è una pronta con lo stesso nome, si usa la pronta", async () => {
    const reale = realeFinta(nonDisponibile);
    const sorgente = sorgenteConPronte(reale, pronte());
    const esito = await sorgente.costruisciIstantanea({ id: "osm:relation/8569", nome: "Lago di Garda", descrizione: "Italia" } as AreaDestinazione);
    expect(esito.ok).toBe(true);
    expect(reale.costruite).toEqual(["osm:relation/8569"]);
  }, 60_000);

  it("la ricerca regge anche se il servizio reale non risponde", async () => {
    const reale = realeFinta(nonDisponibile);
    reale.cercaDestinazioni = vi.fn(async () => {
      throw new Error("Nominatim non risponde");
    });
    const trovate = await sorgenteConPronte(reale, pronte()).cercaDestinazioni("Roma");
    expect(trovate.map((a) => a.nome)).toContain("Roma");
  }, 60_000);

  it("un luogo nuovo che non si riesce a costruire: prepara_destinazione dà errore e non salva nulla", async () => {
    const sorgente = sorgenteConPronte(realeFinta(nonDisponibile), pronte());
    const archivio = creaArchivioInMemoria();
    const prepara = creaStrumentiMotore({ archivio, sorgente }).find((s) => s.definizione.nome === "prepara_destinazione");
    await expect(prepara?.esegui({ areaId: LISBONA.id, testo: "Lisbona" }, {} as never)).rejects.toThrow(/Non ho preparato Lisbona/);
    expect(archivio.scritture).toHaveLength(0);
    expect(archivio.contenuto().scheda ?? null).toBeNull();
  }, 60_000);

  it("anche un'eccezione del servizio reale diventa un errore dello strumento, non una risposta «ok»", async () => {
    const sorgente = sorgenteConPronte(
      realeFinta(async () => {
        throw new Error("504 Gateway Timeout");
      }),
      pronte(),
    );
    const prepara = creaStrumentiMotore({ archivio: creaArchivioInMemoria(), sorgente }).find((s) => s.definizione.nome === "prepara_destinazione");
    await expect(prepara?.esegui({ areaId: LISBONA.id, testo: "Lisbona" }, {} as never)).rejects.toThrow(/servizio delle mappe non risponde/);
  }, 60_000);
});
