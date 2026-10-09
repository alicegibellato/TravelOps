import { describe, expect, it } from "vitest";
import {
  caricaCatalogo,
  caricaViaggio,
  CODICI_ERRORE,
  controllaCondizioneMeteo,
  validaItinerario,
  type CodiceErrore,
  type ErroreValidazione,
} from "../../src/itinerary/index.js";
import { catalogoDiRiferimento, elemento, leggiRiferimento, voce, type FileViaggio, type Grezzo } from "./dati.js";

/** Una variante dei dati di riferimento con un solo difetto e l'errore atteso. */
interface Difetto {
  regola: string;
  descrizione: string;
  codice: CodiceErrore;
  /** L'id (o la data) coinvolto. */
  id: string;
  difetto: (dati: Grezzo) => void;
}

interface DifettoViaggio extends Difetto {
  /** Dati di partenza; se manca, la versione 1. */
  file?: FileViaggio;
}

const giornoVuoto = (data: string): Grezzo => ({ data, luogoPartenza: "HOTEL", elementi: [] });

const difettiViaggio: DifettoViaggio[] = [
  // R-1 CAMPO_MANCANTE
  { regola: "R-1", descrizione: "manca il titolo del viaggio", codice: "CAMPO_MANCANTE", id: "TRIP-GARDA", difetto: (v) => delete v.titolo },
  {
    regola: "R-1",
    descrizione: "manca il luogo di partenza del giorno 2026-06-13",
    codice: "CAMPO_MANCANTE",
    id: "2026-06-13",
    difetto: (v) => delete v.giorni[1].luogoPartenza,
  },
  {
    regola: "R-1",
    descrizione: "manca l'alloggio della notte del giorno 2026-06-12",
    codice: "CAMPO_MANCANTE",
    id: "2026-06-12",
    difetto: (v) => delete v.giorni[0].alloggio,
  },
  {
    regola: "R-1",
    descrizione: "manca l'attività di catalogo di D1-E2",
    codice: "CAMPO_MANCANTE",
    id: "D1-E2",
    difetto: (v) => delete elemento(v, "D1-E2").attivitaId,
  },
  {
    regola: "R-1",
    descrizione: "manca il mezzo dello spostamento D2-E3",
    codice: "CAMPO_MANCANTE",
    id: "D2-E3",
    difetto: (v) => delete elemento(v, "D2-E3").mezzo,
  },
  {
    regola: "R-1",
    descrizione: "manca il codice della prenotazione del volo D3-E9",
    file: "variante-v-volo.json",
    codice: "CAMPO_MANCANTE",
    id: "D3-E9",
    difetto: (v) => delete elemento(v, "D3-E9").prenotazione.codice,
  },
  // R-2 ORARIO_NON_VALIDO
  {
    regola: "R-2",
    descrizione: "l'inizio di D2-E2 ha l'ora con una cifra (9:00)",
    codice: "ORARIO_NON_VALIDO",
    id: "D2-E2",
    difetto: (v) => (elemento(v, "D2-E2").inizio = "9:00"),
  },
  {
    regola: "R-2",
    descrizione: "la fine di D1-E2 ha i minuti a 60 (18:60)",
    codice: "ORARIO_NON_VALIDO",
    id: "D1-E2",
    difetto: (v) => (elemento(v, "D1-E2").fine = "18:60"),
  },
  {
    regola: "R-2",
    descrizione: "la fine di D3-E4 non è successiva all'inizio (12:15–12:15)",
    codice: "ORARIO_NON_VALIDO",
    id: "D3-E4",
    difetto: (v) => (elemento(v, "D3-E4").fine = "12:15"),
  },
  // R-3 FUORI_GIORNATA
  {
    regola: "R-3",
    descrizione: "la fine di D3-E7 supera le 24:00 (24:30)",
    codice: "FUORI_GIORNATA",
    id: "D3-E7",
    difetto: (v) => (elemento(v, "D3-E7").fine = "24:30"),
  },
  {
    regola: "R-3",
    descrizione: "D1-E3 inizia alle 24:00",
    codice: "FUORI_GIORNATA",
    id: "D1-E3",
    difetto: (v) => (elemento(v, "D1-E3").inizio = "24:00"),
  },
  {
    regola: "R-3",
    descrizione: "il volo D3-E9 arriva alle 25:00",
    file: "variante-v-volo.json",
    codice: "FUORI_GIORNATA",
    id: "D3-E9",
    difetto: (v) => (elemento(v, "D3-E9").fine = "25:00"),
  },
  // R-4 ORDINE_NON_VALIDO
  {
    regola: "R-4",
    descrizione: "D2-E4 e D2-E5 sono scambiati",
    codice: "ORDINE_NON_VALIDO",
    id: "D2-E4",
    difetto: (v) => {
      const elementi = v.giorni[1].elementi;
      [elementi[3], elementi[4]] = [elementi[4], elementi[3]];
    },
  },
  // R-5 ID_DUPLICATO
  {
    regola: "R-5",
    descrizione: "D3-E7 ha lo stesso id di D1-E3",
    codice: "ID_DUPLICATO",
    id: "D1-E3",
    difetto: (v) => (elemento(v, "D3-E7").id = "D1-E3"),
  },
  // R-6 RIFERIMENTO_INESISTENTE
  {
    regola: "R-6",
    descrizione: "D2-E2 usa un'attività che non è nel catalogo",
    codice: "RIFERIMENTO_INESISTENTE",
    id: "D2-E2",
    difetto: (v) => (elemento(v, "D2-E2").attivitaId = "A-INESISTENTE"),
  },
  {
    regola: "R-6",
    descrizione: "D3-E5 arriva in un luogo che non è nel catalogo",
    codice: "RIFERIMENTO_INESISTENTE",
    id: "D3-E5",
    difetto: (v) => (elemento(v, "D3-E5").a = "MUSEO-INESISTENTE"),
  },
  {
    regola: "R-6",
    descrizione: "l'alloggio del giorno 2026-06-12 non è nel catalogo",
    codice: "RIFERIMENTO_INESISTENTE",
    id: "2026-06-12",
    difetto: (v) => (v.giorni[0].alloggio = "HOTEL-INESISTENTE"),
  },
  {
    regola: "R-6",
    descrizione: "il luogo di partenza del giorno 2026-06-14 non è nel catalogo",
    codice: "RIFERIMENTO_INESISTENTE",
    id: "2026-06-14",
    difetto: (v) => (v.giorni[2].luogoPartenza = "CASA"),
  },
  // R-7 GIORNI_NON_VALIDI
  {
    regola: "R-7",
    descrizione: "manca il giorno 2026-06-13",
    codice: "GIORNI_NON_VALIDI",
    id: "2026-06-13",
    difetto: (v) => v.giorni.splice(1, 1),
  },
  {
    regola: "R-7",
    descrizione: "il giorno 2026-06-14 è ripetuto",
    codice: "GIORNI_NON_VALIDI",
    id: "2026-06-14",
    difetto: (v) => v.giorni.push(giornoVuoto("2026-06-14")),
  },
  {
    regola: "R-7",
    descrizione: "il giorno 2026-06-15 è fuori dalle date del viaggio",
    codice: "GIORNI_NON_VALIDI",
    id: "2026-06-15",
    difetto: (v) => v.giorni.push(giornoVuoto("2026-06-15")),
  },
  {
    regola: "R-7",
    descrizione: "i giorni 2026-06-13 e 2026-06-14 sono in ordine inverso",
    codice: "GIORNI_NON_VALIDI",
    id: "2026-06-13",
    difetto: (v) => ([v.giorni[1], v.giorni[2]] = [v.giorni[2], v.giorni[1]]),
  },
  // R-8 VALORE_NON_VALIDO
  {
    regola: "R-8",
    descrizione: "D1-E1 ha un mezzo non ammesso (bici)",
    codice: "VALORE_NON_VALIDO",
    id: "D1-E1",
    difetto: (v) => (elemento(v, "D1-E1").mezzo = "bici"),
  },
  {
    regola: "R-8",
    descrizione: "D2-E3 ha un tipo di elemento non ammesso (pausa)",
    codice: "VALORE_NON_VALIDO",
    id: "D2-E3",
    difetto: (v) => (elemento(v, "D2-E3").tipo = "pausa"),
  },
  {
    regola: "R-8",
    descrizione: "D3-E2 ha una priorità non ammessa (massima)",
    file: "variante-v-irr.json",
    codice: "VALORE_NON_VALIDO",
    id: "D3-E2",
    difetto: (v) => (elemento(v, "D3-E2").priorita = "massima"),
  },
  {
    regola: "R-8",
    descrizione: "il link di gestione del volo D3-E9 non inizia con https://",
    file: "variante-v-volo.json",
    codice: "VALORE_NON_VALIDO",
    id: "D3-E9",
    difetto: (v) => (elemento(v, "D3-E9").prenotazione.linkGestione = "http://example.com/prenotazioni/XY123"),
  },
  {
    regola: "R-8",
    descrizione: "il prossimo numero per gli id nuovi è 0",
    codice: "VALORE_NON_VALIDO",
    id: "TRIP-GARDA",
    difetto: (v) => (v.prossimoNumeroId = 0),
  },
];

const difettiCatalogo: Difetto[] = [
  { regola: "R-1", descrizione: "manca il nome del luogo MAG", codice: "CAMPO_MANCANTE", id: "MAG", difetto: (c) => delete voce(c, "luoghi", "MAG").nome },
  {
    regola: "R-1",
    descrizione: "mancano gli orari di apertura di MUSE",
    codice: "CAMPO_MANCANTE",
    id: "MUSE",
    difetto: (c) => delete voce(c, "luoghi", "MUSE").apertura,
  },
  {
    regola: "R-1",
    descrizione: "manca la latitudine della zona VERONA",
    codice: "CAMPO_MANCANTE",
    id: "VERONA",
    difetto: (c) => delete voce(c, "zone", "VERONA").coordinate.lat,
  },
  {
    regola: "R-2",
    descrizione: "l'apertura del martedì del BUONCONSIGLIO ha l'ora con una cifra (9:30)",
    codice: "ORARIO_NON_VALIDO",
    id: "BUONCONSIGLIO",
    difetto: (c) => (voce(c, "luoghi", "BUONCONSIGLIO").apertura.settimana.mar[0].apertura = "9:30"),
  },
  {
    regola: "R-2",
    descrizione: "la fascia serale del lunedì di RIST-RIVA chiude prima di aprire",
    codice: "ORARIO_NON_VALIDO",
    id: "RIST-RIVA",
    difetto: (c) => (voce(c, "luoghi", "RIST-RIVA").apertura.settimana.lun[1].chiusura = "18:00"),
  },
  {
    regola: "R-3",
    descrizione: "la chiusura della domenica del MAG supera le 24:00",
    codice: "FUORI_GIORNATA",
    id: "MAG",
    difetto: (c) => (voce(c, "luoghi", "MAG").apertura.settimana.dom[0].chiusura = "24:30"),
  },
  {
    regola: "R-6",
    descrizione: "il luogo MAG è in una zona che non è nel catalogo",
    codice: "RIFERIMENTO_INESISTENTE",
    id: "MAG",
    difetto: (c) => (voce(c, "luoghi", "MAG").zonaId = "ZONA-INESISTENTE"),
  },
  {
    regola: "R-6",
    descrizione: "l'attività A-CANTINA è in un luogo che non è nel catalogo",
    codice: "RIFERIMENTO_INESISTENTE",
    id: "A-CANTINA",
    difetto: (c) => (voce(c, "attivita", "A-CANTINA").luogoId = "CANTINA-INESISTENTE"),
  },
  {
    regola: "R-8",
    descrizione: "il luogo LUNGOLAGO ha un tipo non ammesso (spiaggia)",
    codice: "VALORE_NON_VALIDO",
    id: "LUNGOLAGO",
    difetto: (c) => (voce(c, "luoghi", "LUNGOLAGO").tipo = "spiaggia"),
  },
  {
    regola: "R-8",
    descrizione: "l'attività A-PONALE ha una categoria non ammessa (sport)",
    codice: "VALORE_NON_VALIDO",
    id: "A-PONALE",
    difetto: (c) => (voce(c, "attivita", "A-PONALE").categoria = "sport"),
  },
  {
    regola: "R-8",
    descrizione: "la zona GARDA_NORD ha latitudine 95",
    codice: "VALORE_NON_VALIDO",
    id: "GARDA_NORD",
    difetto: (c) => (voce(c, "zone", "GARDA_NORD").coordinate.lat = 95),
  },
  {
    regola: "R-8",
    descrizione: "il luogo AEROPORTO-FCO ha longitudine −181",
    codice: "VALORE_NON_VALIDO",
    id: "AEROPORTO-FCO",
    difetto: (c) => (voce(c, "luoghi", "AEROPORTO-FCO").coordinate.lon = -181),
  },
];

const coppie = (errori: ErroreValidazione[]): [CodiceErrore, string][] => errori.map((e) => [e.codice, e.id]);

describe("CA-2 — una variante con un solo difetto restituisce esattamente un errore", () => {
  it.each(difettiViaggio)("CA-2 viaggio $regola $codice: $descrizione", ({ file, difetto, codice, id }) => {
    const grezzo = leggiRiferimento(file ?? "versione-1.json");
    difetto(grezzo);
    const esito = caricaViaggio(grezzo, catalogoDiRiferimento());
    expect(esito.ok).toBe(false);
    if (esito.ok) return;
    expect(coppie(esito.errori)).toEqual([[codice, id]]);
    expect(esito.errori[0]?.messaggio).toBe(`[${codice}] ${id}: ${esito.errori[0]?.motivo}`);
  });

  it.each(difettiCatalogo)("CA-2 catalogo $regola $codice: $descrizione", ({ difetto, codice, id }) => {
    const grezzo = leggiRiferimento("catalogo.json");
    difetto(grezzo);
    const esito = caricaCatalogo(grezzo);
    expect(esito.ok).toBe(false);
    if (esito.ok) return;
    expect(coppie(esito.errori)).toEqual([[codice, id]]);
  });

  it("CA-2 R-6 RIFERIMENTO_INESISTENTE: il viaggio si carica senza catalogo e validaItinerario trova il riferimento", () => {
    const grezzo = leggiRiferimento("versione-1.json");
    elemento(grezzo, "D3-E6").attivitaId = "A-INESISTENTE";
    const esito = caricaViaggio(grezzo);
    expect(esito.ok).toBe(true);
    if (!esito.ok) return;
    const errori = validaItinerario(esito.valore, catalogoDiRiferimento());
    expect(coppie(errori)).toEqual([["RIFERIMENTO_INESISTENTE", "D3-E6"]]);
    expect(errori[0]?.motivo).toBe(`l'attività "A-INESISTENTE" non esiste nel catalogo`);
  });

  it("CA-2 R-8 VALORE_NON_VALIDO: una condizione meteo non ammessa (grandine) è un errore", () => {
    expect(coppie(controllaCondizioneMeteo("grandine", "S1"))).toEqual([["VALORE_NON_VALIDO", "S1"]]);
    const scenari = leggiRiferimento("scenari-imprevisti.json") as { id: string; imprevisto: { condizione?: string } }[];
    for (const scenario of scenari.filter((s) => s.imprevisto.condizione !== undefined)) {
      expect(controllaCondizioneMeteo(scenario.imprevisto.condizione, scenario.id)).toEqual([]);
    }
  });

  it("CA-2 ogni regola R-1…R-8 ha almeno una variante con quel solo difetto", () => {
    const codici = new Set([...difettiViaggio, ...difettiCatalogo].map((d) => d.codice));
    expect([...codici].sort()).toEqual([...CODICI_ERRORE].sort());
  });

  it("un errore riporta codice, elemento coinvolto, posizione e motivo in italiano", () => {
    const grezzo = leggiRiferimento("versione-1.json");
    elemento(grezzo, "D2-E2").inizio = "9:00";
    const esito = caricaViaggio(grezzo);
    expect(esito).toEqual({
      ok: false,
      errori: [
        {
          codice: "ORARIO_NON_VALIDO",
          id: "D2-E2",
          percorso: "giorni[1].elementi[1].inizio",
          motivo: `l'orario "9:00" del campo "inizio" non è nel formato HH:mm (due cifre per le ore, minuti da 00 a 59)`,
          messaggio: `[ORARIO_NON_VALIDO] D2-E2: l'orario "9:00" del campo "inizio" non è nel formato HH:mm (due cifre per le ore, minuti da 00 a 59)`,
        },
      ],
    });
  });

  it("anche nel catalogo gli id sono unici: due attività con lo stesso id sono ID_DUPLICATO", () => {
    const grezzo = leggiRiferimento("catalogo.json");
    voce(grezzo, "attivita", "A-MUSE").id = "A-MAG";
    const esito = caricaCatalogo(grezzo);
    expect(esito.ok ? [] : coppie(esito.errori)).toEqual([["ID_DUPLICATO", "A-MAG"]]);
  });
});

describe("CA-3 — dati con più difetti restituiscono tutti gli errori", () => {
  it("CA-3 un viaggio con un difetto per ogni regola R-1…R-8 restituisce gli otto errori in una volta", () => {
    const v = leggiRiferimento("versione-1.json");
    delete v.titolo; // R-1
    elemento(v, "D1-E1").mezzo = "bici"; // R-8
    elemento(v, "D1-E2").inizio = "4:10"; // R-2
    elemento(v, "D2-E2").attivitaId = "A-INESISTENTE"; // R-6
    const giorno2 = v.giorni[1].elementi;
    [giorno2[3], giorno2[4]] = [giorno2[4], giorno2[3]]; // R-4
    elemento(v, "D3-E1").id = "D1-E1"; // R-5
    elemento(v, "D3-E7").fine = "24:30"; // R-3
    v.giorni.push(giornoVuoto("2026-06-15")); // R-7

    const esito = caricaViaggio(v, catalogoDiRiferimento());
    expect(esito.ok).toBe(false);
    if (esito.ok) return;
    expect(coppie(esito.errori)).toEqual([
      ["CAMPO_MANCANTE", "TRIP-GARDA"],
      ["VALORE_NON_VALIDO", "D1-E1"],
      ["ORARIO_NON_VALIDO", "D1-E2"],
      ["RIFERIMENTO_INESISTENTE", "D2-E2"],
      ["ORDINE_NON_VALIDO", "D2-E4"],
      ["ID_DUPLICATO", "D1-E1"],
      ["FUORI_GIORNATA", "D3-E7"],
      ["GIORNI_NON_VALIDI", "2026-06-15"],
    ]);
  });

  it("CA-3 validaItinerario restituisce gli stessi errori di un caricamento con catalogo", () => {
    const v = leggiRiferimento("versione-1.json");
    elemento(v, "D1-E1").mezzo = "bici";
    elemento(v, "D2-E2").attivitaId = "A-INESISTENTE";
    elemento(v, "D3-E7").fine = "24:30";
    const catalogo = catalogoDiRiferimento();
    const esito = caricaViaggio(v, catalogo);
    expect(esito.ok).toBe(false);
    if (esito.ok) return;
    expect(validaItinerario(v, catalogo)).toEqual(esito.errori);
    expect(esito.errori).toHaveLength(3);
  });

  it("CA-3 più difetti nello stesso elemento sono segnalati tutti", () => {
    const v = leggiRiferimento("variante-v-volo.json");
    const volo = elemento(v, "D3-E9");
    volo.inizio = "7:30";
    volo.mezzo = "razzo";
    volo.prenotazione.linkGestione = "ftp://example.com";
    delete volo.prenotazione.fornitore;
    const esito = caricaViaggio(v, catalogoDiRiferimento());
    expect(esito.ok ? [] : coppie(esito.errori)).toEqual([
      ["ORARIO_NON_VALIDO", "D3-E9"],
      ["CAMPO_MANCANTE", "D3-E9"],
      ["VALORE_NON_VALIDO", "D3-E9"],
      ["VALORE_NON_VALIDO", "D3-E9"],
    ]);
  });

  it("CA-3 un catalogo con più difetti restituisce tutti gli errori in una volta", () => {
    const c = leggiRiferimento("catalogo.json");
    voce(c, "zone", "GARDA_NORD").coordinate.lat = 95;
    voce(c, "luoghi", "LUNGOLAGO").tipo = "spiaggia";
    delete voce(c, "luoghi", "MAG").nome;
    voce(c, "attivita", "A-CANTINA").luogoId = "CANTINA-INESISTENTE";
    const esito = caricaCatalogo(c);
    expect(esito.ok ? [] : coppie(esito.errori)).toEqual([
      ["VALORE_NON_VALIDO", "GARDA_NORD"],
      ["VALORE_NON_VALIDO", "LUNGOLAGO"],
      ["CAMPO_MANCANTE", "MAG"],
      ["RIFERIMENTO_INESISTENTE", "A-CANTINA"],
    ]);
  });

  it("CA-3 a parità di dati gli errori sono identici e nello stesso ordine", () => {
    const v = leggiRiferimento("versione-1.json");
    delete v.titolo;
    elemento(v, "D1-E1").mezzo = "bici";
    v.giorni.splice(1, 1);
    const catalogo = catalogoDiRiferimento();
    expect(caricaViaggio(structuredClone(v), catalogo)).toEqual(caricaViaggio(structuredClone(v), catalogo));
  });
});
