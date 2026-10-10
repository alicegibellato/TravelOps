/**
 * REQ-ORCH-002 (ST-ORCH-002): orchestratore che delega con il modello, agente Logistica, ripiego senza chiave e tracce.
 *
 * - CA-1 con l'orchestrazione "modello" l'orchestratore chiede al modello l'agente per ogni messaggio, anche dove le
 *   regole deciderebbero da sole;
 * - CA-2 la Logistica stima tempi, mezzi e distanze con `stima_spostamento` (dati di contesto e servizio dei percorsi);
 * - CA-3 senza chiave (o se il modello non sceglie un agente valido) si ripiega in modo deterministico sulle regole;
 * - CA-4 ogni delega e ogni chiamata a strumento è tracciata con agente, strumento, input riassunto, esito e durata;
 * - CA-5 la delega verso ciascuno dei quattro agenti e il ripiego senza chiave, con il client finto.
 * Nessuna rete e nessuna chiave.
 */
import { describe, expect, it } from "vitest";
import {
  AGENTI,
  creaClienteFinto,
  creaStrumentiMotore,
  MESSAGGIO_AI_NON_DISPONIBILE,
  NOMI_AGENTI,
  riassunto,
  rispondiAlMessaggioCompleto,
  scegliAgente,
  type ConversazioneRegistrata,
  type PortaPercorsi,
  type SituazioneViaggio,
} from "../../src/index.js";
import { sorgenteRegistrata } from "../strumenti/supporto.js";
import { archivioViaggioConfermato, SABATO_MATTINA } from "./supporto.js";

const situazione = (fase: SituazioneViaggio["fase"]): SituazioneViaggio => ({ fase, destinazione: null, istantanea: null });
const scelta = (agente: string, motivo = "Scelto dal modello.") => ({ chiamate: [{ id: "o1", nome: "scegli_agente", argomenti: { agente, motivo } }] });
const soloScelta = (risposta: object): ConversazioneRegistrata =>
  ({ versione: 1, turni: [{ atteso: { strumenti: ["scegli_agente"] }, risposta }] }) as ConversazioneRegistrata;

/** Un orologio finto: ogni lettura avanza di 7 ms. */
function orologio(): () => number {
  let adesso = Date.parse("2026-10-10T08:00:00.000Z");
  return () => (adesso += 7);
}

describe("REQ-ORCH-002 CA-1 e CA-5: l'orchestratore delega con il modello a ciascuno dei quattro agenti", () => {
  it("gli agenti sono quattro, con la Logistica", () => {
    expect([...NOMI_AGENTI]).toEqual(["consulente", "planner", "logistica", "imprevisti"]);
    expect(AGENTI.logistica.titolo).toBe("Logistica");
    expect(AGENTI.logistica.strumenti).toContain("stima_spostamento");
  });

  for (const agente of NOMI_AGENTI) {
    it(`con il modello: delega a ${agente} anche se le regole sceglierebbero da sole`, async () => {
      const cliente = creaClienteFinto(soloScelta(scelta(agente)));
      // Viaggio nuovo: con le regole risponderebbe sempre il Consulente.
      const esito = await scegliAgente({ cliente, stato: situazione("nuovo"), conversazione: [], messaggio: "Ciao", orchestrazione: "modello" });
      expect(esito).toEqual({ agente, modo: "modello", motivo: "Scelto dal modello." });
      cliente.verificaCompletata();
      expect(cliente.richieste[0]?.istruzioni).toContain("logistica");
    });
  }

  it("senza l'orchestrazione con il modello le regole restano quelle di REQ-ORCH-001 (nessuna richiesta al modello)", async () => {
    const cliente = creaClienteFinto({ versione: 1, turni: [] });
    const esito = await scegliAgente({ cliente, stato: situazione("bozza"), conversazione: [], messaggio: "Quanto ci vuole?" });
    expect(esito).toMatchObject({ agente: "planner", modo: "regole" });
    expect(cliente.richieste).toHaveLength(0);
  });
});

describe("REQ-ORCH-002 CA-3 e CA-5: senza chiave l'orchestratore ripiega sulle regole", () => {
  const senzaChiave = () => creaClienteFinto(soloScelta({ errore: "chiave_mancante" }));

  it("viaggio nuovo: Consulente; bozza: Planner; confermato: le parole chiave (Logistica, Imprevisti)", async () => {
    const casi: [SituazioneViaggio["fase"], string, string][] = [
      ["nuovo", "Vorrei andare al lago", "consulente"],
      ["bozza", "Togli il museo", "planner"],
      ["confermato", "Quanto ci vuole dall'hotel al museo a piedi?", "logistica"],
      ["confermato", "Sta piovendo forte", "imprevisti"],
    ];
    for (const [fase, messaggio, atteso] of casi) {
      const esito = await scegliAgente({ cliente: senzaChiave(), stato: situazione(fase), conversazione: [], messaggio, orchestrazione: "modello" });
      expect(esito, `${fase}: ${messaggio}`).toMatchObject({ agente: atteso, modo: "ripiego" });
    }
  });

  it("se il modello risponde a parole o sceglie un agente che non esiste, vale il ripiego", async () => {
    for (const risposta of [{ testo: "Logistica, direi." }, scelta("meteo")]) {
      const esito = await scegliAgente({
        cliente: creaClienteFinto(soloScelta(risposta)),
        stato: situazione("confermato"),
        conversazione: [],
        messaggio: "Che mezzo prendo per la cantina?",
        orchestrazione: "modello",
      });
      expect(esito).toMatchObject({ agente: "logistica", modo: "ripiego" });
    }
  });

  it("nella chat senza chiave: nessun cambiamento, il messaggio previsto e la delega tracciata come ripiego", async () => {
    const archivio = archivioViaggioConfermato();
    const prima = archivio.scritture.length;
    const { eventi, fine } = await rispondiAlMessaggioCompleto({
      cliente: creaClienteFinto({
        versione: 1,
        turni: [
          { atteso: { strumenti: ["scegli_agente"] }, risposta: { errore: "chiave_mancante" } },
          { atteso: {}, risposta: { errore: "chiave_mancante" } },
        ],
      }),
      archivio,
      sorgente: sorgenteRegistrata(),
      conversazione: [],
      messaggio: "Grandina!",
      adesso: SABATO_MATTINA,
      orchestrazione: "modello",
    });
    expect(eventi.find((e) => e.tipo === "non_disponibile")).toMatchObject({ causa: "chiave_mancante", messaggio: MESSAGGIO_AI_NON_DISPONIBILE });
    expect(fine.tracce).toEqual([expect.objectContaining({ tipo: "delega", agente: "imprevisti", esito: "ok", dettaglio: "ripiego" })]);
    expect(archivio.scritture).toHaveLength(prima);
  });
});

describe("REQ-ORCH-002 CA-2: la Logistica stima tempi, mezzi e distanze", () => {
  const stima = (percorsi?: PortaPercorsi) =>
    creaStrumentiMotore({ archivio: archivioViaggioConfermato(), sorgente: sorgenteRegistrata(), ...(percorsi ? { percorsi } : {}) }).find(
      (s) => s.definizione.nome === "stima_spostamento",
    );

  it("con un mezzo: il tempo dei dati di contesto e la distanza in linea d'aria", async () => {
    const esito = (await stima()?.esegui({ da: "Hotel sul lago", a: "MAG", mezzo: "piedi" }, {} as never)) as Record<string, unknown>;
    expect(esito).toMatchObject({ da: "Hotel sul lago, Riva del Garda", a: "MAG Museo Alto Garda", mezzo: "a piedi", minuti: 10 });
    expect(esito.distanzaKmLineaDAria).toEqual(expect.any(Number));
  });

  it("senza mezzo: il più veloce e i tempi noti; con il servizio dei percorsi anche i tempi su strada", async () => {
    const chiamate: string[] = [];
    const percorsi: PortaPercorsi = {
      calcola: async ({ mezzo }) => {
        chiamate.push(mezzo);
        return { disponibile: true, dati: { minuti: mezzo === "piedi" ? 12 : 4, km: 0.9, stimato: false }, origine: "finto" };
      },
    };
    const esito = (await stima(percorsi)?.esegui({ da: "HOTEL", a: "MAG", mezzo: null }, {} as never)) as Record<string, unknown>;
    expect(esito.piuVeloce).toMatchObject({ minuti: 10 });
    expect(esito.suStrada).toEqual([
      { mezzo: "a piedi", minuti: 12, km: 0.9 },
      { mezzo: "auto", minuti: 4, km: 0.9 },
    ]);
    expect(chiamate.sort()).toEqual(["auto", "piedi"]);
  });

  it("un luogo che non c'è: errore che il modello può correggere; un servizio che non risponde non blocca", async () => {
    await expect(stima()?.esegui({ da: "Colosseo", a: "MAG", mezzo: null }, {} as never)).rejects.toThrow(/non è nella destinazione/);
    const giu: PortaPercorsi = { calcola: async () => ({ disponibile: false, messaggio: "Percorsi non disponibili" }) };
    const esito = (await stima(giu)?.esegui({ da: "HOTEL", a: "MAG", mezzo: "piedi" }, {} as never)) as Record<string, unknown>;
    expect(esito).toMatchObject({ minuti: 10 });
    expect(esito.suStrada).toBeUndefined();
  });
});

describe("REQ-ORCH-002 CA-4: le tracce di deleghe e strumenti", () => {
  it("la Logistica risponde e la traccia ha la delega e la chiamata, con input riassunto, esito e durata", async () => {
    const cliente = creaClienteFinto({
      versione: 1,
      turni: [
        { atteso: { strumenti: ["scegli_agente"] }, risposta: scelta("logistica", "Chiede quanto ci vuole a piedi.") },
        { atteso: {}, risposta: { chiamate: [{ id: "c1", nome: "stima_spostamento", argomenti: { da: "Hotel", a: "MAG", mezzo: "piedi" } }] } },
        { atteso: {}, risposta: { chiamate: [{ id: "c2", nome: "stima_spostamento", argomenti: { da: "Colosseo", a: "MAG", mezzo: null } }] } },
        { atteso: {}, risposta: { testo: "Dall'hotel al MAG sono 10 minuti a piedi." } },
      ],
    });
    const { eventi, fine } = await rispondiAlMessaggioCompleto({
      cliente,
      archivio: archivioViaggioConfermato(),
      sorgente: sorgenteRegistrata(),
      conversazione: [],
      messaggio: "Quanto ci metto dall'hotel al MAG?",
      adesso: SABATO_MATTINA,
      orchestrazione: "modello",
      ora: orologio(),
    });
    cliente.verificaCompletata();
    expect(eventi[0]).toMatchObject({ tipo: "agente", agente: "logistica" });
    expect(fine.agente).toBe("logistica");
    expect(fine.tracce.map((t) => [t.tipo, t.agente, t.strumento ?? null, t.esito])).toEqual([
      ["delega", "logistica", null, "ok"],
      ["strumento", "logistica", "stima_spostamento", "ok"],
      ["strumento", "logistica", "stima_spostamento", "errore"],
    ]);
    const [delega, primo, secondo] = fine.tracce;
    expect(delega).toMatchObject({ input: "Chiede quanto ci vuole a piedi.", dettaglio: "modello", durataMs: 7 });
    expect(primo?.input).toContain('"da":"Hotel"');
    expect(primo?.durataMs).toBeGreaterThan(0);
    expect(secondo?.dettaglio).toMatch(/non è nella destinazione/);
    for (const voce of fine.tracce) {
      expect(voce.input.length).toBeLessThanOrEqual(200);
      expect(Date.parse(voce.inizio)).not.toBeNaN();
    }
  });

  it("l'input riassunto non supera i 200 caratteri", () => {
    expect(riassunto("x".repeat(500))).toHaveLength(200);
    expect(riassunto("  a \n b  ")).toBe("a b");
  });
});
