/**
 * ST-CAT-002-FIX-TB-NEW-D4 (testbook TB-NEW-D4, TB-REAL-002): la preparazione di una destinazione con i servizi reali ha
 * una scadenza complessiva. Il difetto: «Sto preparando Trento…» per oltre 120 secondi senza esito né messaggio, perché le
 * chiamate alle fonti si susseguono (tre server Overpass, Wikipedia, Commons, OSRM) e nessuno le limita nell'insieme.
 * Nessuna rete: la sorgente sotto è finta e simula una fonte che non risponde mai.
 */
import { describe, expect, it } from "vitest";
import { leggiConfigurazioneServizi, PREDEFINITI_SERVIZI } from "../src/index.js";
import type { AreaDestinazione, EsitoCostruzione, IstantaneaDestinazione, SorgenteDestinazioni } from "../src/index.js";
import { conTempoMassimo, messaggioTempoScaduto } from "../src/tempo-massimo.js";
import { istantaneaDiProva } from "./supporto.js";

const TRENTO: AreaDestinazione = { id: "osm:relation/45756", nome: "Trento", descrizione: "Trentino-Alto Adige, Italia", centro: { lat: 46.0664, lon: 11.1257 } };

/** Una sorgente che, come Overpass in coda, non risponde finché non la si interrompe; `rispondeAlSegnale` dice se obbedisce. */
function sorgenteLenta(opzioni: { rispondeAlSegnale: boolean; esito?: EsitoCostruzione }): SorgenteDestinazioni & { segnali: (AbortSignal | undefined)[] } {
  const segnali: (AbortSignal | undefined)[] = [];
  return {
    tipo: "reale",
    segnali,
    cercaDestinazioni: async () => [TRENTO],
    leggiIstantanea: async () => null,
    elencaIstantanee: async () => [],
    costruisciIstantanea: (_area, o = {}) =>
      new Promise<EsitoCostruzione>((risolvi, rifiuta) => {
        segnali.push(o.segnale);
        if (opzioni.esito !== undefined) {
          setTimeout(() => risolvi(opzioni.esito as EsitoCostruzione), 5);
          return;
        }
        if (opzioni.rispondeAlSegnale) o.segnale?.addEventListener("abort", () => rifiuta(o.segnale?.reason), { once: true });
        // altrimenti resta in sospeso per sempre, come una fonte che non risponde
      }),
  };
}

describe("TB-NEW-D4: la preparazione ha una scadenza complessiva", () => {
  it("riproduce il difetto: senza scadenza la preparazione resta in corso; con la scadenza finisce con esito e messaggio chiaro", async () => {
    const lenta = sorgenteLenta({ rispondeAlSegnale: true });
    const senzaLimite = await Promise.race([lenta.costruisciIstantanea(TRENTO).then(() => "finita"), new Promise((r) => setTimeout(() => r("ancora in corso"), 60))]);
    expect(senzaLimite).toBe("ancora in corso");

    const inizio = Date.now();
    const esito = await conTempoMassimo(lenta, { tempoMassimoMs: 40 }).costruisciIstantanea(TRENTO);
    expect(Date.now() - inizio).toBeLessThan(2_000);
    expect(esito).toEqual({ ok: false, motivo: "non_disponibile", messaggio: messaggioTempoScaduto(TRENTO, 40) });
    expect(esito.ok === false && esito.messaggio).toMatch(/Preparare Trento sta richiedendo più di 1 secondi/);
    expect(esito.ok === false && esito.messaggio).toMatch(/Riprova tra poco oppure scegli una delle destinazioni già pronte/);
    // le richieste in corso vengono annullate: la sorgente sotto riceve un segnale già interrotto
    expect(lenta.segnali[1]?.aborted).toBe(true);
  });

  it("allo scadere l'esito arriva anche se la sorgente sotto ignora il segnale", async () => {
    const sorda = sorgenteLenta({ rispondeAlSegnale: false });
    const esito = await conTempoMassimo(sorda, { tempoMassimoMs: 30 }).costruisciIstantanea(TRENTO);
    expect(esito.ok).toBe(false);
    expect(esito.ok === false && esito.motivo).toBe("non_disponibile");
  });

  it("una preparazione che finisce in tempo passa così com'è, con l'avanzamento", async () => {
    const istantanea = istantaneaDiProva() as unknown as IstantaneaDestinazione;
    const veloce = sorgenteLenta({ rispondeAlSegnale: true, esito: { ok: true, istantanea } });
    const passi: number[] = [];
    const esito = await conTempoMassimo(veloce, { tempoMassimoMs: 5_000 }).costruisciIstantanea(TRENTO, { avanzamento: (a) => passi.push(a.numero) });
    expect(esito.ok).toBe(true);
    expect(veloce.segnali[0]?.aborted).toBe(false);
    expect(passi).toEqual([]);
  });

  it("l'interruzione chiesta dal chiamante resta un'eccezione, non un esito «tempo scaduto»", async () => {
    const lenta = sorgenteLenta({ rispondeAlSegnale: true });
    const controllo = new AbortController();
    const costruzione = conTempoMassimo(lenta, { tempoMassimoMs: 5_000 }).costruisciIstantanea(TRENTO, { segnale: controllo.signal });
    controllo.abort(new Error("annullata dal viaggiatore"));
    await expect(costruzione).rejects.toThrow(/annullata dal viaggiatore/);
  });

  it("il messaggio dice i secondi del limite", () => {
    expect(messaggioTempoScaduto(TRENTO, 90_000)).toMatch(/^Preparare Trento sta richiedendo più di 90 secondi/);
  });

  it("rifiuta un tempo massimo non valido", () => {
    expect(() => conTempoMassimo(sorgenteLenta({ rispondeAlSegnale: true }), { tempoMassimoMs: 0 })).toThrow(/intero positivo/);
  });

  it("il limite viene dall'ambiente (TRAVELOPS_DESTINAZIONE_TIMEOUT_MS), con un predefinito ragionevole", () => {
    expect(leggiConfigurazioneServizi({}).timeoutDestinazioneMs).toBe(PREDEFINITI_SERVIZI.timeoutDestinazioneMs);
    expect(PREDEFINITI_SERVIZI.timeoutDestinazioneMs).toBeLessThanOrEqual(120_000);
    expect(leggiConfigurazioneServizi({ TRAVELOPS_DESTINAZIONE_TIMEOUT_MS: "30000" }).timeoutDestinazioneMs).toBe(30_000);
  });
});
