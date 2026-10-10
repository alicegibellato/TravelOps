import { describe, expect, it } from "vitest";
import { chiaveControllo, creaRegistroInMemoria, creaSorgenteCondizioniFinta, eseguiControllo, type SorgenteCondizioni } from "../../src/monitoring/index.js";
import { orologioFinto, PIOGGIA_SABATO, viaggioDiProva } from "./supporto.js";

const config = { orizzonteGiorni: 7 };

describe("eseguiControllo: impatto, nessun impatto, idempotenza (REQ-MONITOR-001 CA-2, CA-4, CA-5)", () => {
  it("una pioggia nuova sul trekking genera 1 imprevisto con 1 proposta minima (riuso di calcolaImpatto e proposta)", async () => {
    const sorgente = creaSorgenteCondizioniFinta({ meteo: [PIOGGIA_SABATO] });
    const registro = creaRegistroInMemoria();
    const esito = await eseguiControllo({ viaggi: [viaggioDiProva()], sorgente, orologio: orologioFinto(), registro, config });
    expect(esito.nuovi).toHaveLength(1);
    const [r] = esito.nuovi;
    expect(r?.imprevisto).toMatchObject({ tipo: "METEO_AVVERSO", zonaId: "GARDA_NORD", data: "2026-06-13", condizione: "pioggia" });
    expect(r?.proposta.livello).toBe("minimo");
    expect(r?.proposta.versioneBase).toBe(1);
    expect(r?.proposta.impatto.elementiColpiti.map((e) => e.elementoId)).toEqual(["D2-E2"]);
    expect(r?.proposta.modifiche.modificati.length + r!.proposta.modifiche.rimossi.length + r!.proposta.modifiche.aggiunti.length).toBeGreaterThan(0);
    expect(r?.chiavi).toEqual([chiaveControllo("versione-1", "A-PONALE", "meteo:pioggia", "2026-06-13")]);
    expect(r?.descrizione).toBe("Nuovo imprevisto: pioggia prevista sabato alle 09:00 per «Trekking sul Sentiero del Ponale»");
    expect(registro.chiavi()).toEqual(r?.chiavi);
  });

  it("la stessa condizione ripetuta non duplica imprevisti né proposte", async () => {
    const sorgente = creaSorgenteCondizioniFinta({ meteo: [PIOGGIA_SABATO] });
    const registro = creaRegistroInMemoria();
    const p = { viaggi: [viaggioDiProva()], sorgente, orologio: orologioFinto(), registro, config };
    expect((await eseguiControllo(p)).nuovi).toHaveLength(1);
    const secondo = await eseguiControllo(p);
    expect(secondo.nuovi).toHaveLength(0);
    expect(secondo.giaSegnalate).toBe(1);
    expect(registro.chiavi()).toHaveLength(1);
  });

  it("una condizione diversa sulla stessa attività (da pioggia a temporale) è un imprevisto nuovo", async () => {
    const sorgente = creaSorgenteCondizioniFinta({ meteo: [PIOGGIA_SABATO] });
    const registro = creaRegistroInMemoria();
    const p = { viaggi: [viaggioDiProva()], sorgente, orologio: orologioFinto(), registro, config };
    await eseguiControllo(p);
    sorgente.imposta({ meteo: [{ ...PIOGGIA_SABATO, fasce: [{ inizio: "08:00", fine: "13:00", condizione: "temporale" }] }] });
    const esito = await eseguiControllo(p);
    expect(esito.nuovi).toHaveLength(1);
    expect(esito.nuovi[0]?.condizione).toBe("meteo:temporale");
  });

  it("una pioggia che non tocca attività (fascia dopo l'attività, o attività al chiuso) non genera nulla", async () => {
    const sera = { ...PIOGGIA_SABATO, fasce: [{ inizio: "20:00", fine: "23:00", condizione: "pioggia" as const }] };
    const registro = creaRegistroInMemoria();
    const esito = await eseguiControllo({
      viaggi: [viaggioDiProva()],
      sorgente: creaSorgenteCondizioniFinta({ meteo: [sera, { ...PIOGGIA_SABATO, data: "2026-06-14" }] }),
      orologio: orologioFinto(),
      registro,
      config,
    });
    expect(esito.nuovi).toHaveLength(0);
    expect(esito.senzaImpatto).toBeGreaterThanOrEqual(1);
    expect(registro.chiavi()).toEqual([]);
  });

  it("tempo sereno o nuvoloso non genera nulla", async () => {
    const esito = await eseguiControllo({
      viaggi: [viaggioDiProva()],
      sorgente: creaSorgenteCondizioniFinta({ meteo: [{ ...PIOGGIA_SABATO, fasce: [{ inizio: "08:00", fine: "13:00", condizione: "nuvoloso" }] }] }),
      orologio: orologioFinto(),
      registro: creaRegistroInMemoria(),
      config,
    });
    expect(esito.nuovi).toEqual([]);
    expect(esito.senzaImpatto).toBe(0);
  });

  it("un evento che chiude il ristorante genera un imprevisto di chiusura sul pranzo", async () => {
    const evento = { id: "EV-1", titolo: "Matrimonio", data: "2026-06-13", inizio: "13:00", fine: "15:00", luogoId: "RIST-RIVA", chiudeLuogo: true };
    const informativo = { ...evento, id: "EV-2", luogoId: "MAG", chiudeLuogo: false };
    const esito = await eseguiControllo({
      viaggi: [viaggioDiProva()],
      sorgente: creaSorgenteCondizioniFinta({ eventi: [evento, informativo] }),
      orologio: orologioFinto(),
      registro: creaRegistroInMemoria(),
      config,
    });
    expect(esito.nuovi).toHaveLength(1);
    expect(esito.nuovi[0]?.imprevisto).toMatchObject({ tipo: "CHIUSURA_LUOGO", luogoId: "RIST-RIVA" });
    expect(esito.nuovi[0]?.chiavi).toEqual([chiaveControllo("versione-1", "A-PRANZO-RIVA", "chiusura:EV-1", "2026-06-13")]);
  });

  it("servizio non disponibile o che solleva: condizione ignorata, esito annotato, nessun imprevisto", async () => {
    const spenta = creaSorgenteCondizioniFinta({ meteo: [PIOGGIA_SABATO], nonDisponibili: ["meteo", "eventi"] });
    const registro = creaRegistroInMemoria();
    const esito = await eseguiControllo({ viaggi: [viaggioDiProva()], sorgente: spenta, orologio: orologioFinto(), registro, config });
    expect(esito.nuovi).toEqual([]);
    expect(esito.nonDisponibili.some((m) => m.startsWith("Meteo non disponibile"))).toBe(true);
    const rotta: SorgenteCondizioni = { meteo: () => Promise.reject(new Error("boom")), eventi: () => Promise.reject(new Error("boom")) };
    const dopo = await eseguiControllo({ viaggi: [viaggioDiProva()], sorgente: rotta, orologio: orologioFinto(), registro, config });
    expect(dopo.nuovi).toEqual([]);
    expect(dopo.nonDisponibili.length).toBeGreaterThan(0);
    expect(registro.chiavi()).toEqual([]);
  });

  it("guarda solo l'orizzonte: oltre i giorni configurati e prima di oggi non si interroga niente", async () => {
    const sorgente = creaSorgenteCondizioniFinta({ meteo: [PIOGGIA_SABATO] });
    const lontano = await eseguiControllo({ viaggi: [viaggioDiProva()], sorgente, orologio: orologioFinto("2026-06-01"), registro: creaRegistroInMemoria(), config: { orizzonteGiorni: 7 } });
    expect(lontano.nuovi).toEqual([]);
    expect(sorgente.chiamate.meteo).toBe(0);
    const passato = await eseguiControllo({ viaggi: [viaggioDiProva()], sorgente, orologio: orologioFinto("2026-06-20"), registro: creaRegistroInMemoria(), config });
    expect(passato.nuovi).toEqual([]);
    const vicino = await eseguiControllo({ viaggi: [viaggioDiProva()], sorgente, orologio: orologioFinto("2026-06-06"), registro: creaRegistroInMemoria(), config });
    expect(vicino.nuovi).toHaveLength(1);
  });

  it("un'attività già finita oggi non genera imprevisti", async () => {
    const esito = await eseguiControllo({
      viaggi: [viaggioDiProva()],
      sorgente: creaSorgenteCondizioniFinta({ meteo: [PIOGGIA_SABATO] }),
      orologio: orologioFinto("2026-06-13", "13:30"),
      registro: creaRegistroInMemoria(),
      config,
    });
    expect(esito.nuovi).toEqual([]);
  });

  it("due viaggi con la stessa condizione hanno chiavi distinte (viaggio nella chiave)", async () => {
    const registro = creaRegistroInMemoria();
    const esito = await eseguiControllo({
      viaggi: [viaggioDiProva("a"), viaggioDiProva("b")],
      sorgente: creaSorgenteCondizioniFinta({ meteo: [PIOGGIA_SABATO] }),
      orologio: orologioFinto(),
      registro,
      config,
    });
    expect(esito.nuovi.map((n) => n.viaggioId)).toEqual(["a", "b"]);
    expect(esito.viaggiControllati).toBe(2);
  });

  it("non modifica il viaggio ricevuto", async () => {
    const v = viaggioDiProva();
    const prima = JSON.stringify(v.viaggio);
    await eseguiControllo({ viaggi: [v], sorgente: creaSorgenteCondizioniFinta({ meteo: [PIOGGIA_SABATO] }), orologio: orologioFinto(), registro: creaRegistroInMemoria(), config });
    expect(JSON.stringify(v.viaggio)).toBe(prima);
  });
});
