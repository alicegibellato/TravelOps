import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { creaSorgenteDaDati } from "../../src/context/index.js";
import { proponiModifica, type EsitoModifica, type PropostaModifica } from "../../src/editing/index.js";
import { applicaProposta, creaStorico, elencaVersioni } from "../../src/history/index.js";
import type {
  Catalogo,
  DatiContesto,
  Elemento,
  ModificaRichiesta,
  SorgenteDatiContesto,
  Viaggio,
} from "../../src/model/index.js";
import { proponiRipianificazione } from "../../src/replanning/index.js";

// Dati di riferimento (docs/requirements/dati-di-riferimento.md), letti come oggetti del modello.
const leggi = <T>(file: string): T =>
  JSON.parse(readFileSync(new URL(`../../data/reference/${file}`, import.meta.url), "utf8")) as T;

interface ScenarioModifica {
  id: string;
  titolo: string;
  itinerario: string;
  modifica: ModificaRichiesta;
}

const FILE_ITINERARIO: Record<string, string> = {
  "versione-1": "versione-1.json",
  "V-IRR": "variante-v-irr.json",
  "V-FISSO": "variante-v-fisso.json",
  "V-VOLO": "variante-v-volo.json",
};

const catalogo = leggi<Catalogo>("catalogo.json");
const datiContesto = leggi<DatiContesto>("contesto.json");
const sorgente = creaSorgenteDaDati(datiContesto);
const scenari = leggi<ScenarioModifica[]>("scenari-modifiche.json");

function itinerario(nome: string): Viaggio {
  const file = FILE_ITINERARIO[nome];
  if (!file) throw new Error(`Itinerario sconosciuto: ${nome}`);
  return leggi<Viaggio>(file);
}

function scenario(id: string): { viaggio: Viaggio; modifica: ModificaRichiesta } {
  const trovato = scenari.find((s) => s.id === id);
  if (!trovato) throw new Error(`Scenario sconosciuto: ${id}`);
  return { viaggio: itinerario(trovato.itinerario), modifica: trovato.modifica };
}

/** La proposta di una modifica; il test fallisce se la modifica dà un errore. */
function proposta(esito: EsitoModifica): PropostaModifica {
  if (!esito.ok) throw new Error(`Errore inatteso: ${esito.errore.messaggio}`);
  return esito.proposta;
}

function proponi(id: string, s: SorgenteDatiContesto = sorgente): PropostaModifica {
  const { viaggio, modifica } = scenario(id);
  return proposta(proponiModifica(viaggio, 1, catalogo, s, modifica));
}

function modifica(m: ModificaRichiesta, nome = "versione-1", varia?: (v: Viaggio) => void, s = sorgente): EsitoModifica {
  const viaggio = itinerario(nome);
  varia?.(viaggio);
  return proponiModifica(viaggio, 1, catalogo, s, m);
}

/** Gli elementi di un giorno come `[id, inizio, fine]`. */
const orari = (viaggio: Viaggio, data: string): [string, string, string][] =>
  (viaggio.giorni.find((g) => g.data === data)?.elementi ?? []).map((e) => [e.id, e.inizio, e.fine]);

const ids = (elementi: readonly { id: string }[]): string[] => elementi.map((e) => e.id);

function elemento(viaggio: Viaggio, id: string): Elemento {
  for (const g of viaggio.giorni) {
    const e = g.elementi.find((x) => x.id === id);
    if (e) return e;
  }
  throw new Error(`Elemento ${id} assente`);
}

/** Gli altri giorni restano identici. */
function altriGiorniIdentici(prima: Viaggio, dopo: Viaggio, data: string): void {
  expect(dopo.giorni.filter((g) => g.data !== data)).toEqual(prima.giorni.filter((g) => g.data !== data));
}

const spostamento = (
  id: string,
  inizio: string,
  fine: string,
  da: string,
  a: string,
  mezzo: string,
): Elemento => ({ id, tipo: "spostamento", inizio, fine, orarioFisso: false, da, a, mezzo }) as Elemento;

describe("REQ-EDIT-001: scenari M1–M6 (CA-1…CA-6)", () => {
  it("CA-1 M1 aggiungi: partenza e destinazione HOTEL, aggiunti N1, N2, N3; nessun altro elemento cambia; fattibile", () => {
    const v1 = itinerario("versione-1");
    const p = proponi("M1");
    expect(p.modifiche.aggiunti).toEqual([
      spostamento("N1", "15:45", "16:00", "HOTEL", "CANTINA", "auto"),
      {
        id: "N2",
        tipo: "attivita",
        inizio: "16:00",
        fine: "17:30",
        orarioFisso: false,
        attivitaId: "A-CANTINA",
        priorita: "opzionale",
      },
      spostamento("N3", "17:30", "17:45", "CANTINA", "HOTEL", "auto"),
    ]);
    expect(p.modifiche.rimossi).toEqual([]);
    expect(p.modifiche.modificati).toEqual([]);
    expect(orari(p.itinerario, "2026-06-13")).toEqual([
      ["D2-E1", "08:40", "09:00"],
      ["D2-E2", "09:00", "13:00"],
      ["D2-E3", "13:00", "13:20"],
      ["D2-E4", "13:20", "14:30"],
      ["D2-E5", "14:30", "14:35"],
      ["N1", "15:45", "16:00"],
      ["N2", "16:00", "17:30"],
      ["N3", "17:30", "17:45"],
    ]);
    altriGiorniIdentici(v1, p.itinerario, "2026-06-13");
    expect(p.itinerario.prossimoNumeroId).toBe(4);
    expect(p.fattibile).toBe(true);
    expect(p.problemi).toEqual([]);
    expect(p.elementiARischio).toEqual([]);
    expect(p.alternative).toEqual([]);
    expect(p.versioneBase).toBe(1);
    expect(p.origine).toEqual({ tipo: "modifica", modifica: scenario("M1").modifica, descrizione: "aggiungi A-CANTINA il 2026-06-13 alle 16:00" });
    expect(p.spiegazione).toContain("parte da «Hotel sul lago, Riva del Garda» (dove si trova alla fine di D2-E5, alle 14:35)");
    expect(p.spiegazione).toContain("(l'alloggio della notte)");
  });

  it("CA-2 M2 rimuovi: D2-E3 diventa piedi PONALE → HOTEL 13:00–13:20; D2-E4 e D2-E5 rimossi; fattibile", () => {
    const v1 = itinerario("versione-1");
    const p = proponi("M2");
    expect(ids(p.modifiche.rimossi)).toEqual(["D2-E4", "D2-E5"]);
    expect(p.modifiche.aggiunti).toEqual([]);
    expect(p.modifiche.modificati).toHaveLength(1);
    expect(p.modifiche.modificati[0]?.id).toBe("D2-E3");
    expect(p.modifiche.modificati[0]?.dopo).toEqual(spostamento("D2-E3", "13:00", "13:20", "PONALE", "HOTEL", "piedi"));
    expect(orari(p.itinerario, "2026-06-13")).toEqual([
      ["D2-E1", "08:40", "09:00"],
      ["D2-E2", "09:00", "13:00"],
      ["D2-E3", "13:00", "13:20"],
    ]);
    altriGiorniIdentici(v1, p.itinerario, "2026-06-13");
    expect(p.itinerario.prossimoNumeroId).toBe(1);
    expect(p.fattibile).toBe(true);
    expect(p.problemi).toEqual([]);
    expect(p.elementiARischio).toEqual([]);
  });

  it("CA-3 M3 sposta: D1-E1 e D1-E3 rimossi, D1-E2 17:00–19:00 con id e priorità, aggiunti N1 e N2; fattibile", () => {
    const v1 = itinerario("versione-1");
    const p = proponi("M3");
    expect(ids(p.modifiche.rimossi)).toEqual(["D1-E1", "D1-E3"]);
    expect(p.modifiche.aggiunti).toEqual([
      spostamento("N1", "16:50", "17:00", "HOTEL", "LUNGOLAGO", "piedi"),
      spostamento("N2", "19:00", "19:10", "LUNGOLAGO", "HOTEL", "piedi"),
    ]);
    expect(p.modifiche.modificati).toEqual([
      { id: "D1-E2", prima: elemento(v1, "D1-E2"), dopo: { ...elemento(v1, "D1-E2"), inizio: "17:00", fine: "19:00" } },
    ]);
    expect(elemento(p.itinerario, "D1-E2")).toMatchObject({ attivitaId: "A-LUNGOLAGO", priorita: "desiderata" });
    expect(orari(p.itinerario, "2026-06-12")).toEqual([
      ["N1", "16:50", "17:00"],
      ["D1-E2", "17:00", "19:00"],
      ["N2", "19:00", "19:10"],
    ]);
    altriGiorniIdentici(v1, p.itinerario, "2026-06-12");
    expect(p.itinerario.prossimoNumeroId).toBe(3);
    expect(p.fattibile).toBe(true);
    expect(p.elementiARischio).toEqual([]);
  });

  it("CA-4 M4 sovrapposizione: partenza e destinazione RIST-RIVA, aggiunti N1, N2, N3; non fattibile con SOVRAPPOSIZIONE D2-E4/N2", () => {
    const v1 = itinerario("versione-1");
    const p = proponi("M4");
    expect(p.modifiche.aggiunti).toEqual([
      spostamento("N1", "13:25", "13:30", "RIST-RIVA", "MAG", "piedi"),
      {
        id: "N2",
        tipo: "attivita",
        inizio: "13:30",
        fine: "15:30",
        orarioFisso: false,
        attivitaId: "A-MAG",
        priorita: "desiderata",
      },
      spostamento("N3", "15:30", "15:35", "MAG", "RIST-RIVA", "piedi"),
    ]);
    // Nessun elemento esistente cambia (R-ED-2, R-ED-6).
    expect(p.modifiche.rimossi).toEqual([]);
    expect(p.modifiche.modificati).toEqual([]);
    for (const e of v1.giorni.flatMap((g) => g.elementi)) expect(elemento(p.itinerario, e.id)).toEqual(e);
    expect(p.fattibile).toBe(false);
    expect(p.problemi).toContainEqual(
      expect.objectContaining({ codice: "SOVRAPPOSIZIONE", gravita: "bloccante", elementi: ["D2-E4", "N2"] }),
    );
    // Elementi a rischio (§2.6 b): quelli dei problemi bloccanti, in ordine di itinerario.
    const coinvolti = new Set(p.problemi.filter((x) => x.gravita === "bloccante").flatMap((x) => x.elementi));
    expect(new Set(p.elementiARischio)).toEqual(coinvolti);
    expect(p.elementiARischio.slice(0, 3)).toEqual(["D2-E4", "N1", "N2"]);
    expect(p.spiegazione).toContain("Come vuoi procedere?");
  });

  it("CA-5 M5 cambia priorità: cambia solo la priorità di D3-E2, il risultato coincide con V-IRR; fattibile", () => {
    const p = proponi("M5");
    expect(p.itinerario).toEqual(itinerario("V-IRR"));
    expect(p.modifiche.aggiunti).toEqual([]);
    expect(p.modifiche.rimossi).toEqual([]);
    expect(p.modifiche.modificati).toEqual([
      { id: "D3-E2", prima: elemento(itinerario("versione-1"), "D3-E2"), dopo: elemento(itinerario("V-IRR"), "D3-E2") },
    ]);
    expect(p.fattibile).toBe(true);
    expect(p.problemi).toEqual([]);
  });

  it("CA-6 M6 orario fisso: cambia solo D2-E4, il risultato coincide con V-FISSO; fattibile", () => {
    const p = proponi("M6");
    expect(p.itinerario).toEqual(itinerario("V-FISSO"));
    expect(ids(p.modifiche.modificati)).toEqual(["D2-E4"]);
    expect(p.modifiche.aggiunti).toEqual([]);
    expect(p.modifiche.rimossi).toEqual([]);
    expect(p.fattibile).toBe(true);
    expect(p.problemi).toEqual([]);
  });
});

describe("REQ-EDIT-001: errori senza proposta (CA-7, R-ED-1)", () => {
  const casi: { titolo: string; nome?: string; modifica: ModificaRichiesta; codice: string }[] = [
    { titolo: "rimuovi D2-E3", modifica: { operazione: "rimuovi", elementoId: "D2-E3" }, codice: "NON_ATTIVITA" },
    {
      titolo: "aggiungi A-MAG il 2026-06-13 alle 11:00 (il viaggiatore è al PONALE)",
      modifica: { operazione: "aggiungi", data: "2026-06-13", attivitaId: "A-MAG", inizio: "11:00" },
      codice: "PERCORSO_SCONOSCIUTO",
    },
    {
      titolo: "aggiungi A-MAG il 2026-06-15",
      modifica: { operazione: "aggiungi", data: "2026-06-15", attivitaId: "A-MAG", inizio: "10:00" },
      codice: "GIORNO_INESISTENTE",
    },
    {
      titolo: "rimuovi D2-E4 in V-FISSO",
      nome: "V-FISSO",
      modifica: { operazione: "rimuovi", elementoId: "D2-E4" },
      codice: "ORARIO_FISSO",
    },
    {
      titolo: "aggiungi A-INESISTENTE",
      modifica: { operazione: "aggiungi", data: "2026-06-13", attivitaId: "A-INESISTENTE", inizio: "16:00" },
      codice: "ATTIVITA_INESISTENTE",
    },
    { titolo: "rimuovi X-99", modifica: { operazione: "rimuovi", elementoId: "X-99" }, codice: "ELEMENTO_INESISTENTE" },
    {
      titolo: "aggiungi A-LUNGOLAGO il 2026-06-12 alle 23:00",
      modifica: { operazione: "aggiungi", data: "2026-06-12", attivitaId: "A-LUNGOLAGO", inizio: "23:00" },
      codice: "FUORI_GIORNATA",
    },
  ];

  it.each(casi)("CA-7 $titolo → $codice", ({ nome, modifica: m, codice }) => {
    const viaggio = itinerario(nome ?? "versione-1");
    const copia = structuredClone(viaggio);
    const esito = proponiModifica(viaggio, 1, catalogo, sorgente, m);
    expect(esito.ok).toBe(false);
    if (esito.ok) return;
    expect(esito).not.toHaveProperty("proposta");
    expect(esito.errore.codice).toBe(codice);
    expect(esito.errore.messaggio.startsWith(`[${codice}] `)).toBe(true);
    expect(viaggio).toEqual(copia);
  });

  it("R-ED-1 ORARIO_NON_VALIDO: inizio non nel formato HH:mm (aggiungi e sposta)", () => {
    for (const inizio of ["9:00", "16.00", "25:00", "12:60", ""]) {
      const a = modifica({ operazione: "aggiungi", data: "2026-06-13", attivitaId: "A-MAG", inizio });
      expect(a.ok ? null : a.errore.codice, inizio).toBe("ORARIO_NON_VALIDO");
      const s = modifica({ operazione: "sposta", elementoId: "D1-E2", data: "2026-06-12", inizio });
      expect(s.ok ? null : s.errore.codice, inizio).toBe("ORARIO_NON_VALIDO");
    }
  });

  it("R-ED-1 NON_ATTIVITA anche per sposta e cambia priorità su uno spostamento", () => {
    const s = modifica({ operazione: "sposta", elementoId: "D1-E1", data: "2026-06-12", inizio: "17:00" });
    expect(s.ok ? null : s.errore.codice).toBe("NON_ATTIVITA");
    const c = modifica({ operazione: "cambia_priorita", elementoId: "D1-E1", priorita: "opzionale" });
    expect(c.ok ? null : c.errore.codice).toBe("NON_ATTIVITA");
  });

  it("R-ED-1 ORARIO_FISSO anche per sposta; ELEMENTO_INESISTENTE per ogni operazione su un id assente", () => {
    const s = modifica({ operazione: "sposta", elementoId: "D2-E4", data: "2026-06-13", inizio: "15:00" }, "V-FISSO");
    expect(s.ok ? null : s.errore.codice).toBe("ORARIO_FISSO");
    for (const m of [
      { operazione: "sposta", elementoId: "X-99", data: "2026-06-13", inizio: "15:00" },
      { operazione: "cambia_priorita", elementoId: "X-99", priorita: "opzionale" },
      { operazione: "imposta_orario_fisso", elementoId: "X-99", orarioFisso: true },
    ] as ModificaRichiesta[]) {
      const e = modifica(m);
      expect(e.ok ? null : e.errore.codice, m.operazione).toBe("ELEMENTO_INESISTENTE");
    }
  });

  it("R-ED-1 sposta: GIORNO_INESISTENTE, PERCORSO_SCONOSCIUTO e FUORI_GIORNATA nella nuova collocazione", () => {
    const giorno = modifica({ operazione: "sposta", elementoId: "D1-E2", data: "2026-06-11", inizio: "17:00" });
    expect(giorno.ok ? null : giorno.errore.codice).toBe("GIORNO_INESISTENTE");
    // Alle 11:00 del sabato il viaggiatore è al PONALE: nessun tempo noto tra PONALE e LUNGOLAGO.
    const percorso = modifica({ operazione: "sposta", elementoId: "D1-E2", data: "2026-06-13", inizio: "11:00" });
    expect(percorso.ok ? null : percorso.errore.codice).toBe("PERCORSO_SCONOSCIUTO");
    const fuori = modifica({ operazione: "sposta", elementoId: "D1-E2", data: "2026-06-12", inizio: "22:30" });
    expect(fuori.ok ? null : fuori.errore.codice).toBe("FUORI_GIORNATA");
  });

  it("R-ED-1 FUORI_GIORNATA anche per uno spostamento creato: andata prima delle 00:00 o ritorno dopo le 24:00", () => {
    // Andata HOTEL → LUNGOLAGO di 10 minuti: dovrebbe partire alle 23:55 del giorno prima.
    const andata = modifica({ operazione: "aggiungi", data: "2026-06-12", attivitaId: "A-LUNGOLAGO", inizio: "00:05" });
    expect(andata.ok ? null : andata.errore.codice).toBe("FUORI_GIORNATA");
    // Attività 21:55–23:55, ritorno di 10 minuti fino alle 24:05.
    const ritorno = modifica({ operazione: "aggiungi", data: "2026-06-12", attivitaId: "A-LUNGOLAGO", inizio: "21:55" });
    expect(ritorno.ok ? null : ritorno.errore.codice).toBe("FUORI_GIORNATA");
    // Che finisca esattamente alle 24:00 è ammesso (attività 21:50–23:50, ritorno fino alle 24:00).
    const limite = proposta(modifica({ operazione: "aggiungi", data: "2026-06-12", attivitaId: "A-LUNGOLAGO", inizio: "21:50" }));
    expect(orari(limite.itinerario, "2026-06-12").at(-1)).toEqual(["N3", "23:50", "24:00"]);
  });
});

describe("REQ-EDIT-001: altre regole (R-ED-2…R-ED-5)", () => {
  it("R-ED-2 senza destinazione (ultimo giorno, dopo tutti gli elementi): solo lo spostamento di andata", () => {
    const p = proposta(modifica({ operazione: "aggiungi", data: "2026-06-14", attivitaId: "A-LUNGOLAGO", inizio: "18:00" }));
    expect(p.modifiche.aggiunti).toEqual([
      spostamento("N1", "17:50", "18:00", "HOTEL", "LUNGOLAGO", "piedi"),
      { id: "N2", tipo: "attivita", inizio: "18:00", fine: "20:00", orarioFisso: false, attivitaId: "A-LUNGOLAGO", priorita: "desiderata" },
    ]);
    expect(p.fattibile).toBe(true);
    expect(p.spiegazione).toContain("non serve uno spostamento di ritorno");
  });

  it("R-ED-2 partenza e destinazione nel luogo dell'attività: nessuno spostamento creato", () => {
    // Alle 14:30 il viaggiatore è a RIST-RIVA (fine di D2-E4) e D2-E5 parte da RIST-RIVA.
    const p = proposta(modifica({ operazione: "aggiungi", data: "2026-06-13", attivitaId: "A-PRANZO-RIVA", inizio: "14:30" }));
    expect(p.modifiche.aggiunti).toEqual([
      { id: "N1", tipo: "attivita", inizio: "14:30", fine: "15:40", orarioFisso: false, attivitaId: "A-PRANZO-RIVA", priorita: "desiderata" },
    ]);
    expect(p.itinerario.prossimoNumeroId).toBe(2);
    expect(p.spiegazione).toContain("non serve uno spostamento di andata");
  });

  it("R-ED-2 gli id nuovi partono dal prossimo numero del viaggio, in ordine di inizio", () => {
    const p = proposta(
      modifica(scenario("M1").modifica, "versione-1", (v) => {
        v.prossimoNumeroId = 7;
      }),
    );
    expect(ids(p.modifiche.aggiunti)).toEqual(["N7", "N8", "N9"]);
    expect(p.itinerario.prossimoNumeroId).toBe(10);
  });

  it("R-ED-3 rimuovi il trekking: andata e ritorno diventano HOTEL → RIST-RIVA con l'id dell'andata", () => {
    const p = proposta(modifica({ operazione: "rimuovi", elementoId: "D2-E2" }));
    expect(ids(p.modifiche.rimossi)).toEqual(["D2-E2", "D2-E3"]);
    expect(p.modifiche.modificati.map((m) => m.dopo)).toEqual([
      spostamento("D2-E1", "08:40", "08:45", "HOTEL", "RIST-RIVA", "piedi"),
    ]);
    expect(p.fattibile).toBe(true);
  });

  it("R-ED-3 senza percorso tra i due luoghi: niente spostamento unico, l'elemento successivo è a rischio", () => {
    const senzaPercorso = creaSorgenteDaDati({
      ...datiContesto,
      tempiPercorrenza: datiContesto.tempiPercorrenza.filter((t) => !(t.da === "HOTEL" && t.a === "RIST-RIVA")),
    });
    const p = proposta(modifica({ operazione: "rimuovi", elementoId: "D2-E2" }, "versione-1", undefined, senzaPercorso));
    expect(ids(p.modifiche.rimossi)).toEqual(["D2-E1", "D2-E2", "D2-E3"]);
    expect(p.elementiARischio).toContain("D2-E4");
    expect(p.fattibile).toBe(false);
    expect(p.spiegazione).toContain("Non c'è un modo noto per raggiungere D2-E4");
  });

  it("R-ED-3 si può rimuovere anche un'attività irrinunciabile: la chiede il viaggiatore", () => {
    const p = proposta(modifica({ operazione: "rimuovi", elementoId: "D3-E2" }, "V-IRR"));
    expect(ids(p.modifiche.rimossi)).toContain("D3-E2");
    expect(p.spiegazione).toContain("è irrinunciabile, ma la rimozione la chiede il viaggiatore");
  });

  it("R-ED-4 sposta in un altro giorno: l'attività mantiene id e priorità, cambia data", () => {
    const p = proposta(modifica({ operazione: "sposta", elementoId: "D1-E2", data: "2026-06-14", inizio: "18:00" }, "V-IRR"));
    expect(orari(p.itinerario, "2026-06-12")).toEqual([]);
    expect(orari(p.itinerario, "2026-06-14").slice(-2)).toEqual([
      ["N1", "17:50", "18:00"],
      ["D1-E2", "18:00", "20:00"],
    ]);
    expect(ids(p.modifiche.rimossi)).toEqual(["D1-E1", "D1-E3"]);
    expect(ids(p.modifiche.aggiunti)).toEqual(["N1"]);
    expect(p.spiegazione).toContain("Modificato D1-E2 «Passeggiata sul lungolago»: il 2026-06-12 16:10–18:10 → il 2026-06-14 18:00–20:00");
  });

  it("R-ED-5 l'orario fisso si imposta anche su uno spostamento e si toglie; cambia solo quel campo", () => {
    const fisso = proposta(modifica({ operazione: "imposta_orario_fisso", elementoId: "D3-E1", orarioFisso: true }));
    expect(fisso.modifiche.modificati).toEqual([
      { id: "D3-E1", prima: elemento(itinerario("versione-1"), "D3-E1"), dopo: { ...elemento(itinerario("versione-1"), "D3-E1"), orarioFisso: true } },
    ]);
    expect(fisso.origine.descrizione).toBe("orario fisso su D3-E1");
    const libero = proposta(modifica({ operazione: "imposta_orario_fisso", elementoId: "D2-E4", orarioFisso: false }, "V-FISSO"));
    expect(libero.itinerario).toEqual(itinerario("versione-1"));
    expect(libero.origine.descrizione).toBe("orario non più fisso su D2-E4");
  });

  it("R-ED-5 cambiare la priorità di un'attività a orario fisso è ammesso", () => {
    const p = proposta(modifica({ operazione: "cambia_priorita", elementoId: "D2-E4", priorita: "opzionale" }, "V-FISSO"));
    expect(elemento(p.itinerario, "D2-E4")).toMatchObject({ orarioFisso: true, priorita: "opzionale" });
  });
});

describe("REQ-EDIT-001: accettazione, spiegazione, riuso e determinismo (CA-8…CA-10, R-ED-7)", () => {
  it("CA-8 accettando la proposta di M1 la versione ha causa \"Modifica richiesta: aggiungi A-CANTINA il 2026-06-13 alle 16:00\"", () => {
    const creato = creaStorico(itinerario("versione-1"));
    if (!creato.ok) throw new Error(creato.errore.messaggio);
    const esito = applicaProposta(creato.storico, proponi("M1"), "Alice", { data: "2026-06-13", ora: "07:30" });
    expect(esito.esito).toBe("versione_creata");
    if (esito.esito !== "versione_creata") return;
    expect(esito.versione.numero).toBe(2);
    expect(esito.versione.causa).toBe("Modifica richiesta: aggiungi A-CANTINA il 2026-06-13 alle 16:00");
    expect(esito.versione.origine).toMatchObject({ tipo: "modifica", modifica: scenario("M1").modifica });
    expect(esito.versione.viaggio.prossimoNumeroId).toBe(4);
    expect(elencaVersioni(esito.storico).map((v) => v.causa)).toEqual([
      "Itinerario iniziale",
      "Modifica richiesta: aggiungi A-CANTINA il 2026-06-13 alle 16:00",
    ]);
  });

  it("R-ED-7 le cause delle altre operazioni seguono la tabella del requisito; la proposta non cambia lo storico finché non è accettata", () => {
    const cause: Record<string, string> = {
      M2: "Modifica richiesta: rimuovi D2-E4 (A-PRANZO-RIVA)",
      M3: "Modifica richiesta: sposta D1-E2 (A-LUNGOLAGO) al 2026-06-12 alle 17:00",
      M4: "Modifica richiesta: aggiungi A-MAG il 2026-06-13 alle 13:30",
      M5: "Modifica richiesta: priorità di D3-E2 (A-BUONCONSIGLIO) a irrinunciabile",
      M6: "Modifica richiesta: orario fisso su D2-E4",
    };
    for (const [id, causa] of Object.entries(cause)) {
      const creato = creaStorico(itinerario("versione-1"));
      if (!creato.ok) throw new Error(creato.errore.messaggio);
      const p = proponi(id);
      expect(creato.storico.versioni).toHaveLength(1);
      const esito = applicaProposta(creato.storico, p, "Alice", { data: "2026-06-12", ora: "10:00" });
      expect(esito.esito === "versione_creata" ? esito.versione.causa : esito.esito, id).toBe(causa);
      if (esito.esito === "versione_creata") expect(esito.versione.propostaFattibile).toBe(p.fattibile);
    }
  });

  it.each(["M1", "M2", "M3", "M4", "M5", "M6"])(
    "CA-9 %s: la spiegazione nomina la richiesta, ogni elemento cambiato con l'orario prima e dopo, e i problemi",
    (id) => {
      const p = proponi(id);
      const testo = p.spiegazione;
      expect(testo).toContain(`Richiesta del viaggiatore: ${p.origine.descrizione}.`);
      for (const e of p.modifiche.aggiunti) expect(testo).toMatch(new RegExp(`Aggiunto ${e.id}\\b.*${e.inizio}–${e.fine}`));
      for (const e of p.modifiche.rimossi) expect(testo).toMatch(new RegExp(`Rimosso ${e.id}\\b.*${e.inizio}–${e.fine}`));
      for (const m of p.modifiche.modificati) {
        expect(testo).toMatch(
          new RegExp(`Modificato ${m.id}\\b.*${m.prima.inizio}–${m.prima.fine}.* → .*${m.dopo.inizio}–${m.dopo.fine}`),
        );
      }
      for (const pr of p.problemi) expect(testo).toContain(`${pr.codice} (${pr.gravita}): ${pr.messaggio}`);
      expect(testo).toContain(p.fattibile ? "Esito: la proposta è fattibile." : "Esito: la proposta non è fattibile.");
      expect(testo).toContain("La proposta diventa una nuova versione dell'itinerario solo se la accetti.");
    },
  );

  it("CA-9 per priorità e orario fisso la spiegazione dice anche il valore prima e dopo", () => {
    expect(proponi("M5").spiegazione).toContain("10:00–12:00, priorità desiderata → il 2026-06-14 10:00–12:00, priorità irrinunciabile");
    expect(proponi("M6").spiegazione).toContain("13:20–14:30, non a orario fisso → il 2026-06-13 13:20–14:30, a orario fisso");
  });

  it("CA-10 la regola di rimozione condivisa dà a REQ-REPLAN-002 gli stessi risultati (S4: unico spostamento RIST-TRENTO → HOTEL)", () => {
    const s4 = leggi<{ id: string; imprevisto: Parameters<typeof proponiRipianificazione>[4] }[]>(
      "scenari-imprevisti.json",
    ).find((s) => s.id === "S4");
    if (!s4) throw new Error("S4 assente");
    const p = proponiRipianificazione(itinerario("versione-1"), 1, catalogo, sorgente, s4.imprevisto);
    expect(ids(p.modifiche.rimossi)).toEqual(["D3-E6", "D3-E7"]);
    expect(p.modifiche.modificati.map((m) => m.dopo)).toEqual([
      spostamento("D3-E5", "13:30", "14:20", "RIST-TRENTO", "HOTEL", "auto"),
    ]);
    expect(p.fattibile).toBe(true);
  });

  it("determinismo: a parità di input la proposta è identica, compresi id nuovi e spiegazione; l'input non cambia", () => {
    for (const s of scenari) {
      const { viaggio, modifica: m } = scenario(s.id);
      const copia = structuredClone(viaggio);
      const a = proponiModifica(viaggio, 1, catalogo, sorgente, m);
      const b = proponiModifica(viaggio, 1, catalogo, sorgente, m);
      expect(a).toEqual(b);
      expect(viaggio).toEqual(copia);
    }
  });
});
