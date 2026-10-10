/**
 * ST-CAT-002-FIX-TB-NEW-D4 (testbook TB-NEW-D4, TB-REAL-002): nella web app la preparazione di una destinazione cercata
 * con i servizi reali ha una scadenza complessiva (`TRAVELOPS_DESTINAZIONE_TIMEOUT_MS`). Scaduta:
 * - una destinazione nuova (Trento) dà un esito «non disponibile» con un messaggio chiaro, invece di restare in corso;
 * - una destinazione con lo stesso nome tra le pronte (Lago di Garda) usa la pronta, come già fa ST-QA-FIX-002.
 * Nessuna rete: la sorgente reale è finta e non risponde mai.
 */
import type { AreaDestinazione, EsitoCostruzione, SorgenteDestinazioni } from "@travelops/sources";
import { conTempoMassimo, leggiConfigurazioneServizi, messaggioTempoScaduto } from "@travelops/sources";
import { describe, expect, it } from "vitest";
import { creaServizioDestinazioni } from "../src/destinazioni/servizio";
import { sorgenteConPronte, sorgenteDestinazioniLocale } from "../src/destinazioni/sorgente";
import { nuovaCartella, sullaBaseDati } from "./supporto-stato";

const TRENTO: AreaDestinazione = { id: "osm:relation/45756", nome: "Trento", descrizione: "Trentino-Alto Adige, Italia", centro: { lat: 46.0664, lon: 11.1257 } };
const GARDA: AreaDestinazione = { id: "osm:relation/8569", nome: "Lago di Garda", descrizione: "Italia", centro: { lat: 45.6, lon: 10.65 } };

/** Una sorgente reale finta che, come Overpass in coda, non risponde finché non la si interrompe. */
function realeCheNonRisponde(): SorgenteDestinazioni {
  return {
    tipo: "reale",
    cercaDestinazioni: async (testo) => (/trento/i.test(testo) ? [TRENTO] : /garda/i.test(testo) ? [GARDA] : []),
    costruisciIstantanea: (_area, o = {}) =>
      new Promise<EsitoCostruzione>((_risolvi, rifiuta) => o.segnale?.addEventListener("abort", () => rifiuta(o.segnale?.reason), { once: true })),
    leggiIstantanea: async () => null,
    elencaIstantanee: async () => [],
  };
}

function pronte(): SorgenteDestinazioni {
  const cartella = nuovaCartella();
  sullaBaseDati(cartella, () => undefined);
  return sorgenteDestinazioniLocale(cartella, { VITEST: "1" });
}

const LIMITE_MS = 40;

describe("TB-NEW-D4: la preparazione di una destinazione nuova non resta in corso all'infinito", () => {
  it("Trento con i servizi reali: allo scadere del limite il viaggiatore legge un messaggio chiaro", async () => {
    const sorgente = sorgenteConPronte(conTempoMassimo(realeCheNonRisponde(), { tempoMassimoMs: LIMITE_MS }), pronte());
    const servizio = creaServizioDestinazioni({ sorgente, candidate: [] });
    // le destinazioni pronte vengono prima nella ricerca (ST-QA-FIX-002): Trento è quella dei servizi reali
    const trento = (await servizio.cerca("Trento")).find((a) => a.nome === "Trento");
    expect(trento?.id).toBe(TRENTO.id);

    const inizio = Date.now();
    const esito = await servizio.costruisci(trento as never);
    expect(Date.now() - inizio).toBeLessThan(2_000);
    expect(esito.esito).toBe("non_disponibile");
    expect(esito.esito === "non_disponibile" && esito.messaggio).toBe(messaggioTempoScaduto(TRENTO, LIMITE_MS));
    expect(esito.esito === "non_disponibile" && esito.messaggio).toMatch(/Riprova tra poco oppure scegli una delle destinazioni già pronte/);
  });

  it("Lago di Garda con i servizi reali lenti: allo scadere si usa la destinazione già pronta", async () => {
    const sorgente = sorgenteConPronte(conTempoMassimo(realeCheNonRisponde(), { tempoMassimoMs: LIMITE_MS }), pronte());
    const esito = await sorgente.costruisciIstantanea(GARDA);
    expect(esito.ok).toBe(true);
  }, 60_000);

  it("il limite della web app viene dall'ambiente, con il predefinito sotto i due minuti del testbook", () => {
    expect(leggiConfigurazioneServizi({}).timeoutDestinazioneMs).toBeLessThanOrEqual(120_000);
    expect(leggiConfigurazioneServizi({ TRAVELOPS_DESTINAZIONE_TIMEOUT_MS: "15000" }).timeoutDestinazioneMs).toBe(15_000);
  });
});
