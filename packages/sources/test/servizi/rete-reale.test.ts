/**
 * Prova opzionale verso Open-Meteo reale (API pubblica, senza chiave né dati personali: solo coordinate e date).
 * Non gira mai di predefinito: serve `TRAVELOPS_TEST_RETE=1`. Tutti gli altri test non usano la rete (REQ-INTEG-001, CA-5).
 */
import { describe, expect, it } from "vitest";
import { creaMeteoOpenMeteo, PREDEFINITI_SERVIZI, type FetchServizio } from "../../src/index.js";

const giorno = (spostamento: number): string => new Date(Date.now() + spostamento * 86_400_000).toISOString().slice(0, 10);

describe.skipIf(process.env["TRAVELOPS_TEST_RETE"] !== "1")("Open-Meteo reale (TRAVELOPS_TEST_RETE=1)", () => {
  it("dà la previsione di Riva del Garda per i prossimi due giorni, con fasce orarie nelle condizioni del dominio", async () => {
    const meteo = creaMeteoOpenMeteo({ url: PREDEFINITI_SERVIZI.urlMeteo, timeoutMs: 15_000, fetch: globalThis.fetch as unknown as FetchServizio });
    const r = await meteo.previsione({ coordinate: { lat: 45.8868, lon: 10.8458 }, dataInizio: giorno(1), dataFine: giorno(2) });
    expect(r.disponibile, r.disponibile ? "" : r.messaggio).toBe(true);
    if (!r.disponibile) return;
    expect(r.dati).toHaveLength(2);
    for (const g of r.dati) {
      expect(["sereno", "nuvoloso", "pioggia", "temporale", "neve"]).toContain(g.condizione);
      expect(g.fasce.length).toBeGreaterThan(0);
      expect(g.fasce[0]?.inizio).toBe("00:00");
      expect(g.fasce.at(-1)?.fine).toBe("24:00");
    }
  }, 20_000);
});
