import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { creaSorgenteDaDati } from "../../src/context/index.js";
import {
  PROBLEMA_ORARIO_FISSO_DA_RIPROGRAMMARE,
  proponiModificaOndata2,
  type EsitoModificaOndata2,
  type PropostaModificaOndata2,
} from "../../src/editing/index.js";
import { applicaProposta, creaStorico } from "../../src/history/index.js";
import type { Catalogo, DatiContesto, Elemento, ModificaOndata2, Viaggio } from "../../src/model/index.js";

// Dati di riferimento (docs/requirements/dati-di-riferimento.md e dati-di-riferimento-estensioni.md §8.4).
const leggi = <T>(file: string): T =>
  JSON.parse(readFileSync(new URL(`../../data/reference/${file}`, import.meta.url), "utf8")) as T;

const catalogo = leggi<Catalogo>("catalogo.json");
const sorgente = creaSorgenteDaDati(leggi<DatiContesto>("contesto.json"));
const versione1 = (): Viaggio => leggi<Viaggio>("versione-1.json");
const vVolo = (): Viaggio => leggi<Viaggio>("variante-v-volo.json");

function proponi(viaggio: Viaggio, modifica: ModificaOndata2): PropostaModificaOndata2 {
  const esito = proponiModificaOndata2(viaggio, 1, catalogo, sorgente, modifica);
  if (!esito.ok) throw new Error(`Errore inatteso: ${esito.errore.messaggio}`);
  return esito.proposta;
}

/** Gli elementi di un giorno come `[id, inizio, fine]`. */
const orari = (viaggio: Viaggio, data: string): [string, string, string][] =>
  (viaggio.giorni.find((g) => g.data === data)?.elementi ?? []).map((e) => [e.id, e.inizio, e.fine]);

const giorno = (viaggio: Viaggio, data: string) => viaggio.giorni.find((g) => g.data === data);
const ids = (elementi: readonly { id: string }[]): string[] => elementi.map((e) => e.id);
const codici = (p: PropostaModificaOndata2): string[] => p.problemi.map((x) => `${x.codice} ${x.elementi.join(",")}`);

const GIORNO_3 = [
  ["D3-E1", "09:00", "09:50"],
  ["D3-E2", "10:00", "12:00"],
  ["D3-E3", "12:00", "12:10"],
  ["D3-E4", "12:15", "13:15"],
  ["D3-E5", "13:30", "13:45"],
  ["D3-E6", "14:00", "16:30"],
  ["D3-E7", "16:30", "17:20"],
];

const PROLUNGA_M7: ModificaOndata2 = { operazione: "prolunga", dopo: "2026-06-13", giorni: 1 };

describe("CA-2 M7: resto un giorno in più (versione 1, prolunga di 1 giorno dopo il 2026-06-13) come nel contratto", () => {
  const p = proponi(versione1(), PROLUNGA_M7);
  const v = p.itinerario;

  it("CA-2 M7 aggiunge un giorno libero il 2026-06-14 e fa slittare il terzo giorno al 2026-06-15 negli stessi orari", () => {
    expect(v.dataInizio).toBe("2026-06-12");
    expect(v.dataFine).toBe("2026-06-15");
    expect(v.giorni.map((g) => g.data)).toEqual(["2026-06-12", "2026-06-13", "2026-06-14", "2026-06-15"]);
    expect(orari(v, "2026-06-12")).toEqual(orari(versione1(), "2026-06-12"));
    expect(orari(v, "2026-06-13")).toEqual(orari(versione1(), "2026-06-13"));
    expect(giorno(v, "2026-06-14")).toEqual({ data: "2026-06-14", luogoPartenza: "HOTEL", alloggio: "HOTEL", elementi: [] });
    expect(orari(v, "2026-06-15")).toEqual(GIORNO_3);
    expect(giorno(v, "2026-06-15")?.luogoPartenza).toBe("HOTEL");
    expect(giorno(v, "2026-06-15")?.alloggio).toBeUndefined();
    expect(v.prossimoNumeroId).toBe(1);
  });

  it("CA-2 M7 nessun elemento aggiunto o rimosso; D3-E1…D3-E7 cambiano solo la data", () => {
    expect(p.modifiche.aggiunti).toEqual([]);
    expect(p.modifiche.rimossi).toEqual([]);
    expect(p.modifiche.modificati.map((m) => m.id)).toEqual(GIORNO_3.map(([id]) => id));
    for (const m of p.modifiche.modificati) expect(m.dopo).toEqual(m.prima);
  });

  it("CA-2 M7 non è fattibile: il 2026-06-15 è lunedì, Buonconsiglio e MUSE sono chiusi; D3-E2 e D3-E6 a rischio, nessuna alternativa", () => {
    expect(p.fattibile).toBe(false);
    expect(codici(p)).toEqual(["FUORI_ORARIO D3-E2", "FUORI_ORARIO D3-E6"]);
    expect(p.elementiARischio).toEqual(["D3-E2", "D3-E6"]);
    expect(p.alternative).toEqual([]);
    expect(p.livello).toBe("resto");
  });
});

describe("CA-2 M8: resto un giorno in più con il volo (V-VOLO) come nel contratto", () => {
  const p = proponi(vVolo(), PROLUNGA_M7);
  const v = p.itinerario;

  it("CA-2 M8 D3-E8 e D3-E9 restano il 2026-06-14 negli stessi orari, il resto del terzo giorno slitta al 2026-06-15", () => {
    expect(v.dataFine).toBe("2026-06-15");
    expect(orari(v, "2026-06-14")).toEqual([
      ["D3-E8", "17:30", "18:45"],
      ["D3-E9", "19:30", "20:35"],
    ]);
    expect(giorno(v, "2026-06-14")?.alloggio).toBe("HOTEL");
    expect(orari(v, "2026-06-15")).toEqual(GIORNO_3);
    expect(p.modifiche.modificati.map((m) => m.id)).toEqual(GIORNO_3.map(([id]) => id));
  });

  it("CA-2 M8 la proposta non è fattibile: elementi a orario fisso da riprogrammare, poi i problemi di REQ-FEAS-001", () => {
    expect(p.fattibile).toBe(false);
    expect(codici(p)).toEqual([
      `${PROBLEMA_ORARIO_FISSO_DA_RIPROGRAMMARE} D3-E8,D3-E9`,
      "MANCA_SPOSTAMENTO D3-E9",
      "FUORI_ORARIO D3-E2",
      "FUORI_ORARIO D3-E6",
    ]);
    expect(p.problemi[0]?.gravita).toBe("bloccante");
  });

  it("CA-2 M8 D3-E8 e D3-E9 sono a rischio; le alternative sono la gestione della prenotazione e la ricerca voli per il 2026-06-15", () => {
    expect(p.elementiARischio).toEqual(["D3-E8", "D3-E9", "D3-E2", "D3-E6"].sort((a, b) => ordine(v, a) - ordine(v, b)));
    expect(p.alternative).toEqual([
      {
        tipo: "gestione_prenotazione",
        elementoId: "D3-E9",
        etichetta: "Gestisci la prenotazione XY123 (Compagnia aerea di esempio)",
        indirizzo: "https://example.com/prenotazioni/XY123",
      },
      {
        tipo: "ricerca_voli",
        elementoId: "D3-E9",
        etichetta: "Cerca voli da Aeroporto di Verona a Aeroporto di Roma Fiumicino il 2026-06-15",
        indirizzo:
          "https://www.google.com/travel/flights?q=Voli%20da%20Aeroporto%20di%20Verona%20a%20Aeroporto%20di%20Roma%20Fiumicino%20il%202026-06-15",
      },
    ]);
  });
});

/** La posizione dell'elemento nell'itinerario (data, inizio). */
function ordine(v: Viaggio, id: string): number {
  let n = 0;
  for (const g of v.giorni) for (const e of g.elementi) {
    if (e.id === id) return n;
    n += 1;
  }
  return -1;
}

describe("CA-3 accorciare di 1 giorno V-VOLO lascia D3-E8 e D3-E9 a rischio con le alternative", () => {
  const p = proponi(vVolo(), { operazione: "accorcia", giorni: 1 });

  it("CA-3 tolti D3-E1…D3-E7; il 2026-06-14 resta con i soli D3-E8 e D3-E9, a rischio, con le alternative per il 2026-06-13", () => {
    expect(ids(p.modifiche.rimossi)).toEqual(GIORNO_3.map(([id]) => id));
    expect(orari(p.itinerario, "2026-06-14")).toEqual([
      ["D3-E8", "17:30", "18:45"],
      ["D3-E9", "19:30", "20:35"],
    ]);
    expect(p.itinerario.dataFine).toBe("2026-06-14");
    expect(p.elementiARischio).toEqual(["D3-E8", "D3-E9"]);
    expect(p.fattibile).toBe(false);
    expect(codici(p)).toEqual([`${PROBLEMA_ORARIO_FISSO_DA_RIPROGRAMMARE} D3-E8,D3-E9`]);
    expect(p.alternative.map((a) => `${a.tipo} ${a.elementoId}`)).toEqual(["gestione_prenotazione D3-E9", "ricerca_voli D3-E9"]);
    expect(p.alternative[1]?.etichetta).toBe("Cerca voli da Aeroporto di Verona a Aeroporto di Roma Fiumicino il 2026-06-13");
    expect(p.livello).toBe("resto");
  });

  it("R2-ACC senza elementi a orario fisso (versione 1) il viaggio finisce il 2026-06-13, senza alloggio l'ultimo giorno, fattibile", () => {
    const q = proponi(versione1(), { operazione: "accorcia", giorni: 1 });
    expect(q.itinerario.dataFine).toBe("2026-06-13");
    expect(q.itinerario.giorni.map((g) => g.data)).toEqual(["2026-06-12", "2026-06-13"]);
    expect(giorno(q.itinerario, "2026-06-13")?.alloggio).toBeUndefined();
    expect(orari(q.itinerario, "2026-06-13")).toEqual(orari(versione1(), "2026-06-13"));
    expect(q.fattibile).toBe(true);
    expect(q.elementiARischio).toEqual([]);
  });
});

describe("CA-4 cambia ritmo e rigenera un giorno producono proposte che dichiarano il livello di ripianificazione", () => {
  it("CA-4 giornata più leggera: toglie l'attività con la priorità più bassa che inizia più tardi (D2-E4) e dichiara il livello giornata", () => {
    const p = proponi(versione1(), { operazione: "cambia_ritmo", data: "2026-06-13", ritmo: "piu_leggero" });
    expect(p.livello).toBe("giornata");
    expect(ids(p.modifiche.rimossi)).toContain("D2-E4");
    expect(ids(p.modifiche.rimossi)).not.toContain("D2-E2");
    expect(p.spiegazione).toContain("Livello di ripianificazione: rifà la giornata.");
  });

  it("CA-4 giornata più piena: aggiunge un'attività del catalogo non ancora nel viaggio dopo l'ultimo elemento, livello giornata", () => {
    const p = proponi(versione1(), { operazione: "cambia_ritmo", data: "2026-06-13", ritmo: "piu_pieno" });
    expect(p.livello).toBe("giornata");
    const aggiunte = p.modifiche.aggiunti.filter((e): e is Extract<Elemento, { tipo: "attivita" }> => e.tipo === "attivita");
    expect(aggiunte).toHaveLength(1);
    const usate = versione1().giorni.flatMap((g) => g.elementi.flatMap((e) => (e.tipo === "attivita" ? [e.attivitaId] : [])));
    expect(usate).not.toContain(aggiunte[0]?.attivitaId);
    expect(aggiunte[0]!.inizio >= "14:35").toBe(true);
    expect(p.modifiche.rimossi).toEqual([]);
  });

  it("CA-4 rigenera un giorno: livello giornata; restano gli elementi a orario fisso e le attività irrinunciabili", () => {
    const viaggio = vVolo();
    const d3e2 = viaggio.giorni[2]!.elementi.find((e) => e.id === "D3-E2");
    if (d3e2?.tipo === "attivita") d3e2.priorita = "irrinunciabile";
    const p = proponi(viaggio, { operazione: "rigenera_giorno", data: "2026-06-14" });
    expect(p.livello).toBe("giornata");
    const dopo = orari(p.itinerario, "2026-06-14");
    expect(dopo).toContainEqual(["D3-E2", "10:00", "12:00"]);
    expect(dopo).toContainEqual(["D3-E9", "19:30", "20:35"]);
    expect(p.spiegazione).toContain("Livello di ripianificazione: rifà la giornata.");
  });

  it("errori: giorno inesistente, giorni non validi, nessuna attività da togliere", () => {
    const errore = (m: ModificaOndata2, v = versione1()): string => {
      const esito: EsitoModificaOndata2 = proponiModificaOndata2(v, 1, catalogo, sorgente, m);
      return esito.ok ? "ok" : esito.errore.codice;
    };
    expect(errore({ operazione: "prolunga", dopo: "2026-07-01", giorni: 1 })).toBe("GIORNO_INESISTENTE");
    expect(errore({ operazione: "prolunga", dopo: "2026-06-13", giorni: 0 })).toBe("GIORNI_NON_VALIDI");
    expect(errore({ operazione: "prolunga", dopo: "2026-06-13", giorni: 1.5 })).toBe("GIORNI_NON_VALIDI");
    expect(errore({ operazione: "accorcia", giorni: 3 })).toBe("GIORNI_NON_VALIDI");
    expect(errore({ operazione: "cambia_ritmo", data: "2026-06-20", ritmo: "piu_leggero" })).toBe("GIORNO_INESISTENTE");
    const tuttoIrrinunciabile = versione1();
    for (const e of tuttoIrrinunciabile.giorni[0]!.elementi) if (e.tipo === "attivita") e.priorita = "irrinunciabile";
    expect(errore({ operazione: "cambia_ritmo", data: "2026-06-12", ritmo: "piu_leggero" }, tuttoIrrinunciabile)).toBe("NESSUNA_ATTIVITA");
  });
});

describe("CA-5 ogni nuova operazione ha una spiegazione in parole semplici", () => {
  const casi: [string, Viaggio, ModificaOndata2][] = [
    ["prolunga", versione1(), PROLUNGA_M7],
    ["accorcia", vVolo(), { operazione: "accorcia", giorni: 1 }],
    ["più leggera", versione1(), { operazione: "cambia_ritmo", data: "2026-06-13", ritmo: "piu_leggero" }],
    ["più piena", versione1(), { operazione: "cambia_ritmo", data: "2026-06-13", ritmo: "piu_pieno" }],
    ["rigenera", versione1(), { operazione: "rigenera_giorno", data: "2026-06-13" }],
  ];
  it.each(casi)("CA-5 %s: richiesta, livello, modifiche, esito e invito ad accettare o rifiutare", (_nome, viaggio, modifica) => {
    const p = proponi(viaggio, modifica);
    expect(p.spiegazione.split("\n")[0]).toBe(`Richiesta del viaggiatore: ${p.origine.descrizione}.`);
    expect(p.spiegazione).toMatch(/Livello di ripianificazione: (rivede il resto del viaggio|rifà la giornata)\./);
    expect(p.spiegazione).toMatch(/Esito: la proposta (è|non è) fattibile/);
    expect(p.spiegazione).toContain("La proposta diventa una nuova versione dell'itinerario solo se la accetti.");
    expect(p.spiegazione).not.toMatch(/\bundefined\b|\[object Object\]/);
  });

  it("CA-5 M8 la spiegazione dice che D3-E9 è a orario fisso e va riprogrammato per il 2026-06-15", () => {
    const p = proponi(vVolo(), PROLUNGA_M7);
    expect(p.spiegazione).toContain("è a orario fisso: resta il 2026-06-14 19:30–20:35, mentre con le nuove date andrebbe il 2026-06-15");
    expect(p.spiegazione).toContain("Nuovo giorno libero il 2026-06-14");
  });
});

describe("CA-6 dopo la conferma tutte le modifiche sono proposte da accettare o rifiutare", () => {
  it("CA-6 la proposta non cambia il viaggio ricevuto; diventa una versione solo se accettata, con la causa della descrizione", () => {
    const viaggio = versione1();
    const prima = JSON.stringify(viaggio);
    const p = proponi(viaggio, PROLUNGA_M7);
    expect(JSON.stringify(viaggio)).toBe(prima);
    const creato = creaStorico(versione1());
    if (!creato.ok) throw new Error(creato.errore.messaggio);
    const esito = applicaProposta(creato.storico, p, "Alice", { data: "2026-06-13", ora: "07:30" });
    expect(esito.esito).toBe("versione_creata");
    if (esito.esito !== "versione_creata") return;
    expect(esito.versione.causa).toBe("Modifica richiesta: prolunga il soggiorno di 1 giorno dopo il 2026-06-13");
    expect(esito.versione.viaggio.dataFine).toBe("2026-06-15");
  });

  it("CA-6 stesso input, stessa proposta (deterministica)", () => {
    expect(proponi(vVolo(), PROLUNGA_M7)).toEqual(proponi(vVolo(), PROLUNGA_M7));
  });
});
