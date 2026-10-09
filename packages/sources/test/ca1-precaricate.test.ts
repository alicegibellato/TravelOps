/**
 * CA-1: con le risposte registrate delle fonti (`registrazioni/precaricate.json`), la costruzione di Garda, Roma e
 * Dolomiti con la sorgente reale (ricerca compresa) dà esattamente le istantanee del repository; e la sorgente
 * registrata, dalla cartella `snapshots/` e dalle stesse registrazioni, le ritrova uguali. Test deterministico,
 * con la rete bloccata (CA-7) e un orologio finto.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  creaClienteRegistrato,
  creaSorgenteReale,
  creaSorgenteRegistrataDaFile,
  DATA_ISTANTANEE_PRECARICATE,
  DESTINAZIONI_PRECARICATE,
  leggiCartellaIstantanee,
  leggiFileRegistrazioni,
  type Avanzamento,
  type Orologio,
} from "../src/index.js";
import { cartellaIstantaneeDelPacchetto } from "../src/pacchetto.js";

const FILE_REGISTRAZIONI = fileURLToPath(new URL("../registrazioni/precaricate.json", import.meta.url));
const SNAPSHOTS = cartellaIstantaneeDelPacchetto();
const UA = "TravelOps/0.1 (test)";

const ISTANTANEE_ATTESE = DESTINAZIONI_PRECARICATE.map((d) => `${d.idBase}-${DATA_ISTANTANEE_PRECARICATE}`);

function orologioFinto(): Orologio {
  let t = 0;
  return { adesso: () => t, attendi: async (ms) => void (t += ms) };
}

const fileIstantanea = (id: string): unknown => JSON.parse(readFileSync(join(SNAPSHOTS, `${id}.json`), "utf8"));

beforeAll(() => {
  vi.stubGlobal("fetch", () => {
    throw new Error("rete bloccata nei test");
  });
});
afterAll(() => {
  vi.unstubAllGlobals();
});

describe("CA-1 le istantanee precaricate si ricostruiscono identiche dalle risposte registrate", () => {
  it("CA-1 la cartella snapshots contiene esattamente le 3 istantanee della §8.1", () => {
    expect(leggiCartellaIstantanee(SNAPSHOTS).map((l) => l.istantanea.id)).toEqual([...ISTANTANEE_ATTESE].sort());
    expect(DESTINAZIONI_PRECARICATE.map((d) => d.destinazione)).toEqual([
      "Lago di Garda (Riva del Garda e dintorni)",
      "Roma",
      "Dolomiti – Val di Fassa",
    ]);
  });

  for (const d of DESTINAZIONI_PRECARICATE) {
    it(`CA-1 ${d.destinazione}: ricerca e costruzione con la sorgente reale e le risposte registrate danno il file del repository`, async () => {
      const { risposte } = leggiFileRegistrazioni(FILE_REGISTRAZIONI);
      const sorgente = creaSorgenteReale({
        cliente: creaClienteRegistrato(risposte),
        userAgent: UA,
        orologio: orologioFinto(),
        dataCreazione: () => DATA_ISTANTANEE_PRECARICATE,
      });
      const aree = await sorgente.cercaDestinazioni(d.ricerca);
      const area = aree.find((a) => a.id === d.areaId);
      expect(area, `${d.areaId} tra i risultati di "${d.ricerca}"`).toBeDefined();
      if (area === undefined) return;
      const passi: Avanzamento[] = [];
      const esito = await sorgente.costruisciIstantanea(area, { avanzamento: (a) => passi.push(a) });
      if (!esito.ok) throw new Error(esito.messaggio);
      expect(JSON.parse(JSON.stringify(esito.istantanea))).toEqual(fileIstantanea(`${d.idBase}-${DATA_ISTANTANEE_PRECARICATE}`));
      expect(passi.map((p) => p.numero)).toEqual([1, 2, 3, 4, 5, 6, 7]);

      // Dopo la prima volta la destinazione è immediata (nessuna richiesta in più) e la sorgente la conosce.
      const ancora = await sorgente.costruisciIstantanea(area);
      expect(ancora).toEqual(esito);
      expect((await sorgente.elencaIstantanee()).map((r) => r.id)).toEqual([esito.istantanea.id]);
      expect(await sorgente.leggiIstantanea(esito.istantanea.id)).toEqual(esito.istantanea);
    }, 120_000);
  }

  it("CA-1 la sorgente registrata, dai file del repository, trova e costruisce le stesse istantanee", async () => {
    const sorgente = creaSorgenteRegistrataDaFile(SNAPSHOTS, FILE_REGISTRAZIONI);
    for (const d of DESTINAZIONI_PRECARICATE) {
      const area = (await sorgente.cercaDestinazioni(d.ricerca)).find((a) => a.id === d.areaId);
      expect(area).toBeDefined();
      if (area === undefined) continue;
      const esito = await sorgente.costruisciIstantanea(area);
      if (!esito.ok) throw new Error(esito.messaggio);
      expect(JSON.parse(JSON.stringify(esito.istantanea))).toEqual(fileIstantanea(`${d.idBase}-${DATA_ISTANTANEE_PRECARICATE}`));
    }
  }, 60_000);

  it("CA-1 con istantaneeNote una destinazione già nel database è immediata, senza nessuna richiesta alle fonti", async () => {
    const [prima] = leggiCartellaIstantanee(SNAPSHOTS);
    if (prima === undefined) throw new Error("nessuna istantanea");
    const sorgente = creaSorgenteReale({
      cliente: creaClienteRegistrato([]),
      userAgent: UA,
      orologio: orologioFinto(),
      dataCreazione: () => "2030-01-01",
      istantaneeNote: (areaId) => (areaId === prima.istantanea.area.id ? prima.istantanea : null),
    });
    const esito = await sorgente.costruisciIstantanea(prima.istantanea.area);
    expect(esito).toEqual({ ok: true, istantanea: prima.istantanea });
  });
});
