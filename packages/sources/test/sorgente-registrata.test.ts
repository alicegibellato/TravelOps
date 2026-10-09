/**
 * Criterio 1: l'interfaccia unica "sorgente di destinazioni" e la realizzazione registrata, che legge istantanee e
 * risposte salvate dal repository senza rete.
 */
import { copyFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  creaClienteRegistrato,
  creaSorgenteRegistrata,
  creaSorgenteRegistrataDaFile,
  ErroreRegistrazioni,
  ErroreRispostaNonRegistrata,
  leggiFileRegistrazioni,
  leggiIstantanea,
  leggiRegistrazioni,
  MESSAGGI_AVANZAMENTO,
  normalizzaRicerca,
  PASSI_COSTRUZIONE,
  type Avanzamento,
  type CreaSorgenteReale,
  type IstantaneaDestinazione,
  type SorgenteDestinazioni,
} from "../src/index.js";
import { conModifica, FILE_ISTANTANEA_DI_PROVA, ID_ISTANTANEA_DI_PROVA, istantaneaDiProva, nuovaCartella } from "./supporto.js";

const FILE_REGISTRAZIONI = fileURLToPath(new URL("./dati/registrazioni-di-prova.json", import.meta.url));

function di(json: unknown, minimi = true): IstantaneaDestinazione {
  const esito = leggiIstantanea(json, { minimi });
  if (!esito.ok) throw new Error(esito.errori.map((e) => e.messaggio).join("\n"));
  return esito.istantanea;
}

/** La cartella con la sola istantanea di prova, e la sorgente registrata che la legge con le registrazioni di prova. */
function sorgenteDaFile(): SorgenteDestinazioni {
  const cartella = nuovaCartella();
  copyFileSync(FILE_ISTANTANEA_DI_PROVA, join(cartella, `${ID_ISTANTANEA_DI_PROVA}.json`));
  return creaSorgenteRegistrataDaFile(cartella, FILE_REGISTRAZIONI);
}

describe("criterio 1: sorgente registrata dietro l'interfaccia unica", () => {
  it("è una SorgenteDestinazioni di tipo registrata", () => {
    const sorgente: SorgenteDestinazioni = sorgenteDaFile();
    expect(sorgente.tipo).toBe("registrata");
  });

  it("ricerca: restituisce i risultati registrati per quel testo, senza distinguere maiuscole, accenti e spazi", async () => {
    const sorgente = sorgenteDaFile();
    const risultati = await sorgente.cercaDestinazioni("  BÒRGO ");
    expect(risultati.map((a) => a.id)).toEqual(["prova:borgo-di-prova", "prova:borgo-senza-istantanea"]);
    expect(await sorgente.cercaDestinazioni("borgo", { limite: 1 })).toEqual([risultati[0]]);
    expect(normalizzaRicerca("  Città   di  Prova ")).toBe("citta di prova");
  });

  it("ricerca: senza registrazione cerca tra le aree delle istantanee; testo troppo corto o sconosciuto non dà risultati", async () => {
    const sorgente = sorgenteDaFile();
    expect((await sorgente.cercaDestinazioni("di prova")).map((a) => a.id)).toEqual(["prova:borgo-di-prova"]);
    expect(await sorgente.cercaDestinazioni("b")).toEqual([]);
    expect(await sorgente.cercaDestinazioni("Lisbona")).toEqual([]);
  });

  it("ricerca: rispetta l'annullamento (una battuta successiva supera la ricerca)", async () => {
    const sorgente = sorgenteDaFile();
    const controllo = new AbortController();
    controllo.abort();
    await expect(sorgente.cercaDestinazioni("borgo", { segnale: controllo.signal })).rejects.toThrow();
  });

  it("costruzione: dà esattamente l'istantanea del repository, segnalando l'avanzamento passo per passo", async () => {
    const sorgente = sorgenteDaFile();
    const [area] = await sorgente.cercaDestinazioni("borgo");
    if (area === undefined) throw new Error("ricerca vuota");
    const passi: Avanzamento[] = [];
    const esito = await sorgente.costruisciIstantanea(area, { avanzamento: (a) => passi.push(a) });
    expect(esito).toEqual({ ok: true, istantanea: di(istantaneaDiProva()) });
    expect(passi.map((p) => p.passo)).toEqual([...PASSI_COSTRUZIONE]);
    expect(passi.map((p) => p.messaggio)).toContain("Cerco i luoghi…");
    expect(passi.map((p) => p.messaggio)).toContain("Calcolo i percorsi…");
    expect(passi.every((p, i) => p.numero === i + 1 && p.totale === PASSI_COSTRUZIONE.length)).toBe(true);
    expect(Object.keys(MESSAGGI_AVANZAMENTO)).toEqual([...PASSI_COSTRUZIONE]);
  });

  it("costruzione: un'area non registrata dà non_disponibile con un messaggio per il viaggiatore", async () => {
    const sorgente = sorgenteDaFile();
    const risultati = await sorgente.cercaDestinazioni("borgo");
    const senza = risultati.find((a) => a.id === "prova:borgo-senza-istantanea");
    if (senza === undefined) throw new Error("manca l'area senza istantanea");
    expect(await sorgente.costruisciIstantanea(senza)).toEqual({
      ok: false,
      motivo: "non_disponibile",
      messaggio:
        "Borgo Senza Istantanea non è tra le destinazioni registrate: senza rete posso preparare solo " +
        "Borgo di Prova (DATO DI TEST, non è una destinazione reale).",
    });
  });

  it("costruzione: con più istantanee della stessa area vale la più recente (un'istantanea non cambia: se ne crea una nuova)", async () => {
    const vecchia = di(conModifica((j) => {
      j["id"] = "prova-vecchia";
      j["dataCreazione"] = "2026-01-01";
    }));
    const nuova = di(istantaneaDiProva());
    const sorgente = creaSorgenteRegistrata({ istantanee: [nuova, vecchia] });
    const esito = await sorgente.costruisciIstantanea(nuova.area);
    expect(esito.ok && esito.istantanea.id).toBe(ID_ISTANTANEA_DI_PROVA);
    expect((await sorgente.elencaIstantanee()).map((r) => [r.id, r.dataCreazione])).toEqual([
      ["prova-dato-di-test", "2026-10-09"],
      ["prova-vecchia", "2026-01-01"],
    ]);
  });

  it("costruzione: un'area troppo piccola dà minimi_non_rispettati, con le mancanze e le altre destinazioni più vicine", async () => {
    const piccola = di(
      conModifica((j) => {
        j["id"] = "prova-piccola";
        j["area"] = { id: "prova:piccola", nome: "Frazione di Prova", descrizione: "Frazione di Prova (DATO DI TEST)", centro: { lat: 45.51, lon: 9.51 } };
        j.luoghi = j.luoghi.filter((l) => l["id"] !== "PROVA-OSPEDALE");
      }),
      false,
    );
    const grande = di(istantaneaDiProva());
    const sorgente = creaSorgenteRegistrata({ istantanee: [piccola, grande] });
    const esito = await sorgente.costruisciIstantanea(piccola.area);
    expect(esito).toEqual({
      ok: false,
      motivo: "minimi_non_rispettati",
      messaggio: "Mi dispiace, Frazione di Prova non ha abbastanza luoghi per un itinerario completo.",
      mancanze: [expect.objectContaining({ codice: "OSPEDALE_MANCANTE" })],
      alternative: [grande.area],
    });
  });

  it("leggiIstantanea ed elencaIstantanee: per identificativo, copie che non cambiano la sorgente", async () => {
    const sorgente = sorgenteDaFile();
    const letta = await sorgente.leggiIstantanea(ID_ISTANTANEA_DI_PROVA);
    expect(letta).toEqual(di(istantaneaDiProva()));
    expect(await sorgente.leggiIstantanea("non-esiste")).toBeNull();
    if (letta === null) return;
    letta.luoghi.length = 0;
    expect((await sorgente.leggiIstantanea(ID_ISTANTANEA_DI_PROVA))?.luoghi).toHaveLength(15);
    expect(await sorgente.elencaIstantanee()).toEqual([
      { id: ID_ISTANTANEA_DI_PROVA, destinazione: letta.destinazione, area: letta.area, dataCreazione: "2026-10-09" },
    ]);
  });

  it("due istantanee con lo stesso identificativo non sono ammesse", () => {
    const istantanea = di(istantaneaDiProva());
    expect(() => creaSorgenteRegistrata({ istantanee: [istantanea, istantanea] })).toThrow('istantanea registrata ripetuta: "prova-dato-di-test"');
  });

  it("senza istantanee la sorgente funziona ma non trova nulla", async () => {
    const sorgente = creaSorgenteRegistrataDaFile(join(nuovaCartella(), "non-esiste"));
    expect(await sorgente.elencaIstantanee()).toEqual([]);
    expect(await sorgente.cercaDestinazioni("roma")).toEqual([]);
  });
});

describe("criterio 1: risposte salvate e contratto della sorgente reale", () => {
  it("il file di registrazioni si legge con ricerche e risposte", () => {
    const registrazioni = leggiFileRegistrazioni(FILE_REGISTRAZIONI);
    expect(registrazioni.ricerche.map((r) => r.testo)).toEqual(["Borgo"]);
    expect(registrazioni.risposte.map((r) => r.richiesta.servizio)).toEqual(["nominatim", "overpass"]);
  });

  it("il cliente registrato risponde con le risposte salvate e rifiuta ogni richiesta non registrata (mai la rete)", async () => {
    const cliente = creaClienteRegistrato(leggiFileRegistrazioni(FILE_REGISTRAZIONI).risposte);
    const nominatim = await cliente.richiedi({
      servizio: "nominatim",
      url: "https://nominatim.openstreetmap.org/search?format=jsonv2&q=Borgo+di+Prova",
    });
    expect(nominatim.stato).toBe(200);
    expect(nominatim.corpo).toEqual([expect.objectContaining({ osm_type: "relation", osm_id: 900000999 })]);
    const overpass = await cliente.richiedi({
      servizio: "overpass",
      url: "https://overpass-api.de/api/interpreter",
      metodo: "POST",
      corpo: "[out:json];node(around:500,45.5,9.5)[tourism=museum];out;",
    });
    expect(overpass).toEqual({ stato: 200, corpo: { elements: [] } });
    await expect(cliente.richiedi({ servizio: "osrm", url: "https://router.project-osrm.org/table/v1/foot/9.5,45.5;9.6,45.6" })).rejects.toThrow(
      ErroreRispostaNonRegistrata,
    );
    // Stesso indirizzo ma corpo diverso: è un'altra richiesta.
    await expect(
      cliente.richiedi({ servizio: "overpass", url: "https://overpass-api.de/api/interpreter", metodo: "POST", corpo: "[out:json];out;" }),
    ).rejects.toThrow(/nessuna risposta registrata per POST https:\/\/overpass-api\.de\/api\/interpreter \(overpass\)/);
  });

  it("registrazioni non valide: tutti i problemi in un solo errore", () => {
    expect(() =>
      leggiRegistrazioni({
        formato: 2,
        ricerche: [{ testo: "", risultati: [] }, { testo: "x", risultati: [{ id: "a" }] }],
        risposte: [{ richiesta: { servizio: "google", url: "" }, risposta: { stato: 999 } }],
      }),
    ).toThrow(ErroreRegistrazioni);
    try {
      leggiRegistrazioni({ formato: 2, ricerche: [{ testo: "", risultati: [] }], risposte: [{ richiesta: { servizio: "google", url: "" }, risposta: { stato: 999 } }] });
    } catch (errore) {
      expect((errore as ErroreRegistrazioni).errori).toEqual([
        "formato: deve essere 1 (valore trovato: 2)",
        'ricerche[0]: deve essere un oggetto con "testo" (non vuoto) e "risultati" (elenco di aree)',
        "risposte[0].richiesta.servizio: valori ammessi nominatim, overpass, wikipedia, wikivoyage, commons, osrm",
        "risposte[0].richiesta.url: deve essere un testo non vuoto",
        "risposte[0].risposta.stato: deve essere un codice HTTP (100–599)",
      ]);
    }
    const file = join(nuovaCartella(), "rotto.json");
    writeFileSync(file, "{ rotto");
    expect(() => leggiFileRegistrazioni(file)).toThrow(/il testo non è JSON valido/);
  });

  it("la stessa richiesta registrata due volte con risposte diverse è un errore", () => {
    const richiesta = { servizio: "osrm" as const, url: "https://router.project-osrm.org/x" };
    expect(() =>
      creaClienteRegistrato([
        { richiesta, risposta: { stato: 200, corpo: 1 } },
        { richiesta, risposta: { stato: 200, corpo: 2 } },
      ]),
    ).toThrow(ErroreRegistrazioni);
  });

  it("il contratto della sorgente reale (ST-CAT-002) si soddisfa con il cliente registrato e un orologio finto", async () => {
    // Una realizzazione minima del contratto, solo per verificarne i tipi: la vera è di ST-CAT-002.
    const creaFinta: CreaSorgenteReale = (opzioni) => {
      const registrata = creaSorgenteRegistrata({ istantanee: [] });
      return { ...registrata, tipo: "reale", cercaDestinazioni: async () => (await opzioni.cliente.richiedi({ servizio: "nominatim", url: "x" }), []) };
    };
    let adesso = 0;
    const sorgente = creaFinta({
      cliente: creaClienteRegistrato([{ richiesta: { servizio: "nominatim", url: "x" }, risposta: { stato: 200, corpo: [] } }]),
      userAgent: "TravelOps/0.1 (test)",
      orologio: { adesso: () => adesso, attendi: async (ms) => void (adesso += ms) },
      dataCreazione: () => "2026-10-09",
    });
    expect(sorgente.tipo).toBe("reale");
    expect(await sorgente.cercaDestinazioni("roma")).toEqual([]);
  });
});
