/**
 * CA-2: ogni istantanea rispetta i minimi di `dati-di-riferimento-estensioni.md` §8.1. Il controllo trova ogni
 * minimo non rispettato con un messaggio chiaro, e il lettore rifiuta un'istantanea che non li rispetta.
 */
import { describe, expect, it } from "vitest";
import { controllaMinimi, coppieUsabili, leggiIstantanea, MINIMI, type IstantaneaDestinazione } from "../src/index.js";
import { conModifica, istantaneaDiProva, trova } from "./supporto.js";

type Json = ReturnType<typeof istantaneaDiProva>;

/** L'istantanea di prova modificata e letta solo nella forma (senza minimi), poi controllata. */
function controlla(modifica: (json: Json) => void = () => undefined) {
  const esito = leggiIstantanea(conModifica(modifica), { minimi: false });
  if (!esito.ok) throw new Error(esito.errori.map((e) => e.messaggio).join("\n"));
  return controllaMinimi(esito.istantanea);
}

const senzaAttivita = (j: Json, ...id: string[]): void => {
  j.attivita = j.attivita.filter((a) => !id.includes(String(a["id"])));
};

const togliLuogo = (j: Json, id: string): void => {
  j.luoghi = j.luoghi.filter((l) => l["id"] !== id);
  j.attivita = j.attivita.filter((a) => a["luogoId"] !== id);
  j.tempiPercorrenza = j.tempiPercorrenza.filter((t) => t["da"] !== id && t["a"] !== id);
};

describe("CA-2 minimi della §8.1", () => {
  it("CA-2 l'istantanea di prova li rispetta: i conteggi", () => {
    const esito = controlla();
    expect(esito.rispettati).toBe(true);
    expect(esito.mancanze).toEqual([]);
    expect(esito.avvisi).toEqual([]);
    expect(esito.conteggi).toEqual({
      attivita: 15,
      attivitaPerStile: { relax: 4, cultura: 5, natura: 5, avventura: 4, gastronomia: 2, romantico: 4, famiglia: 4 },
      ristorantiPranzo: 3,
      ristorantiCena: 3,
      ristorantiVegetariani: 2,
      ristorantiSenzaGlutine: 1,
      fasceAlloggio: 2,
      farmacie: 1,
      ospedali: 1,
      arrivi: 1,
      coppieUsabili: 68,
      coppieSenzaTempo: 0,
    });
  });

  it("CA-2 almeno 15 attività, senza contare pasti e servizi", () => {
    const esito = controlla((j) => {
      senzaAttivita(j, "PROVA-A-GALLERIA");
      // Un servizio in più non conta.
      j.attivita.push({ id: "PROVA-A-SERVIZIO", nome: "Acquisti", luogoId: "PROVA-BORGO", categoria: "servizio", allAperto: false, durataTipica: 60 });
    });
    expect(esito.rispettati).toBe(false);
    expect(esito.mancanze).toEqual([
      {
        codice: "ATTIVITA_INSUFFICIENTI",
        messaggio: "servono almeno 15 attività (pasti e servizi esclusi), ce ne sono 14",
        trovati: 14,
        richiesti: MINIMI.attivita,
      },
    ]);
  });

  it("CA-2 almeno 2 attività per ciascuno dei 7 stili, con un messaggio per lo stile che manca", () => {
    const esito = controlla((j) => {
      // La cantina resta nel catalogo ma senza lo stile gastronomia: ne rimane una sola (il mercato).
      trova(j.attivita, "PROVA-A-CANTINA")["stili"] = ["romantico"];
    });
    expect(esito.mancanze).toEqual([
      {
        codice: "STILE_INSUFFICIENTE",
        messaggio:
          'lo stile "gastronomia" ha 1 attività, ne servono almeno 2: aggiungine o dichiaralo in "stiliScarsi" con il motivo',
        trovati: 1,
        richiesti: 2,
        stile: "gastronomia",
      },
    ]);
  });

  it("CA-2 uno stile scarso dichiarato è ammesso e diventa un avviso", () => {
    const esito = controlla((j) => {
      trova(j.attivita, "PROVA-A-CANTINA")["stili"] = ["romantico"];
      j["stiliScarsi"] = [{ stile: "gastronomia", motivo: "il borgo ha una sola bottega di prodotti tipici" }];
    });
    expect(esito.rispettati).toBe(true);
    expect(esito.avvisi).toEqual([
      {
        codice: "STILE_DICHIARATO_SCARSO",
        messaggio: 'lo stile "gastronomia" ha 1 attività su 2, dichiarato scarso: il borgo ha una sola bottega di prodotti tipici',
        stile: "gastronomia",
      },
    ]);
  });

  it("CA-2 almeno 3 ristoranti aperti a pranzo e 3 aperti a cena", () => {
    const esito = controlla((j) => {
      // L'osteria apre solo la sera: va bene per la cena, non per il pranzo.
      trova(j.luoghi, "PROVA-OSTERIA")["apertura"] = {
        settimana: Object.fromEntries(["lun", "mar", "mer", "gio", "ven", "sab", "dom"].map((g) => [g, [{ apertura: "19:00", chiusura: "23:00" }]])),
      };
      // La pizzeria a cena apre troppo tardi (meno di 60 minuti nella finestra 19:00–22:30).
      trova(j.luoghi, "PROVA-PIZZERIA")["apertura"] = {
        settimana: Object.fromEntries(
          ["lun", "mar", "mer", "gio", "ven", "sab", "dom"].map((g) => [g, [{ apertura: "12:00", chiusura: "14:30" }, { apertura: "22:00", chiusura: "23:59" }]]),
        ),
      };
    });
    expect(esito.mancanze.map((m) => m.messaggio)).toEqual([
      "servono almeno 3 ristoranti aperti a pranzo (12:00–15:00), ce ne sono 2",
      "servono almeno 3 ristoranti aperti a cena (19:00–22:30), ce ne sono 2",
    ]);
    expect(esito.mancanze.map((m) => m.codice)).toEqual(["RISTORANTI_PRANZO_INSUFFICIENTI", "RISTORANTI_CENA_INSUFFICIENTI"]);
  });

  it("CA-2 almeno un ristorante vegetariano; senza glutine solo un avviso (\"se esiste nei dati\")", () => {
    const esito = controlla((j) => {
      for (const id of ["PROVA-TRATTORIA", "PROVA-PIZZERIA"]) delete trova(j.luoghi, id)["opzioniAlimentari"];
    });
    expect(esito.mancanze).toEqual([
      {
        codice: "RISTORANTE_VEGETARIANO_MANCANTE",
        messaggio: "serve almeno un ristorante con opzione vegetariana, non ce n'è nessuno",
        trovati: 0,
        richiesti: 1,
      },
    ]);
    expect(esito.avvisi).toEqual([
      {
        codice: "RISTORANTE_SENZA_GLUTINE_MANCANTE",
        messaggio: "nessun ristorante con opzione senza glutine: va bene solo se le fonti non ne hanno nessuno",
      },
    ]);
  });

  it("CA-2 almeno 2 alloggi di fascia diversa", () => {
    const esito = controlla((j) => {
      trova(j.luoghi, "PROVA-HOTEL")["costoIndicativo"] = "€";
    });
    expect(esito.mancanze.map((m) => [m.codice, m.messaggio])).toEqual([
      ["ALLOGGI_INSUFFICIENTI", 'servono almeno 2 alloggi di fascia diversa (campo "costoIndicativo"), le fasce presenti sono 1'],
    ]);
  });

  it("CA-2 una farmacia, un ospedale, la stazione o l'aeroporto di arrivo", () => {
    const esito = controlla((j) => {
      togliLuogo(j, "PROVA-FARMACIA");
      togliLuogo(j, "PROVA-OSPEDALE");
      togliLuogo(j, "PROVA-STAZIONE");
    });
    expect(esito.mancanze.map((m) => [m.codice, m.messaggio])).toEqual([
      ["FARMACIA_MANCANTE", "serve almeno una farmacia, non ce n'è nessuna"],
      ["OSPEDALE_MANCANTE", "serve almeno un ospedale, non ce n'è nessuno"],
      ["ARRIVO_MANCANTE", "serve la stazione o l'aeroporto di arrivo più vicini, non ce n'è nessuno"],
    ]);
  });

  it("CA-2 l'aeroporto vale come arrivo quanto la stazione", () => {
    const esito = controlla((j) => {
      trova(j.luoghi, "PROVA-STAZIONE")["tipo"] = "aeroporto";
    });
    expect(esito.rispettati).toBe(true);
  });

  it("CA-2 tempi di percorrenza per tutte le coppie usabili, con le coppie mancanti nel messaggio", () => {
    const esito = controlla((j) => {
      // Tolti tutti i tempi del borgo (11 coppie) e quello tra ostello e stazione.
      j.tempiPercorrenza = j.tempiPercorrenza.filter(
        (t) => t["da"] !== "PROVA-BORGO" && t["a"] !== "PROVA-BORGO" && !(t["da"] === "PROVA-OSTELLO" && t["a"] === "PROVA-STAZIONE"),
      );
    });
    const [mancanza] = esito.mancanze;
    expect(esito.mancanze).toHaveLength(1);
    expect(mancanza?.codice).toBe("TEMPI_MANCANTI");
    expect(mancanza?.trovati).toBe(68 - 12);
    expect(mancanza?.richiesti).toBe(68);
    expect(mancanza?.coppie).toHaveLength(12);
    expect(mancanza?.coppie).toContainEqual(["PROVA-OSTELLO", "PROVA-STAZIONE"]);
    expect(mancanza?.messaggio).toBe(
      "mancano i tempi di percorrenza di 12 coppie di luoghi su 68: PROVA-BORGO–PROVA-MUSEO, PROVA-BORGO–PROVA-PARCO, " +
        "PROVA-BORGO–PROVA-LAGO, PROVA-BORGO–PROVA-SENTIERO, PROVA-BORGO–PROVA-FUNIVIA e altre 7",
    );
  });

  it("CA-2 coppie usabili: luoghi con attività (ristoranti compresi) e alloggi, più alloggi con l'arrivo; non farmacie e ospedali", () => {
    const esito = leggiIstantanea(istantaneaDiProva());
    if (!esito.ok) throw new Error("istantanea di prova non valida");
    const coppie = coppieUsabili(esito.istantanea);
    // 7 luoghi con attività + 3 ristoranti + 2 alloggi = 12 luoghi → 66 coppie, più 2 alloggi × 1 stazione.
    expect(coppie).toHaveLength(66 + 2);
    const luoghi = new Set(coppie.flat());
    expect(luoghi.has("PROVA-FARMACIA")).toBe(false);
    expect(luoghi.has("PROVA-OSPEDALE")).toBe(false);
    expect(coppie).not.toContainEqual(["PROVA-MUSEO", "PROVA-STAZIONE"]);
    expect(coppie.every(([a, b]) => a < b)).toBe(true);
  });

  it("CA-2 il lettore rifiuta un'istantanea che non rispetta i minimi, con un problema per ogni minimo", () => {
    const json = conModifica((j) => {
      togliLuogo(j, "PROVA-OSPEDALE");
      trova(j.luoghi, "PROVA-HOTEL")["costoIndicativo"] = "€";
    });
    const esito = leggiIstantanea(json);
    expect(esito.ok).toBe(false);
    if (esito.ok) return;
    expect(esito.errori.map((e) => [e.codice, e.messaggio, e.minimo?.codice])).toEqual([
      [
        "MINIMI_NON_RISPETTATI",
        'minimi della §8.1 non rispettati: servono almeno 2 alloggi di fascia diversa (campo "costoIndicativo"), le fasce presenti sono 1',
        "ALLOGGI_INSUFFICIENTI",
      ],
      ["MINIMI_NON_RISPETTATI", "minimi della §8.1 non rispettati: serve almeno un ospedale, non ce n'è nessuno", "OSPEDALE_MANCANTE"],
    ]);
    // Con `minimi: false` la stessa istantanea si legge nella forma (serve per spiegare che cosa manca, CA-5).
    expect(leggiIstantanea(json, { minimi: false }).ok).toBe(true);
  });

  it("CA-2 il controllo è deterministico: stessa istantanea, stesso esito", () => {
    const esito = leggiIstantanea(istantaneaDiProva(), { minimi: false });
    if (!esito.ok) throw new Error("istantanea di prova non valida");
    const istantanea: IstantaneaDestinazione = esito.istantanea;
    expect(controllaMinimi(istantanea)).toEqual(controllaMinimi(structuredClone(istantanea)));
  });
});
