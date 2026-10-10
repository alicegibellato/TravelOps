/**
 * REQ-CHAT-002 (ST-CHAT-002), lato web app: le schede di proposta della chat senza codici del motore (CA-2) e le date
 * del riepilogo delle preferenze in italiano corretto (CA-4).
 */
import { describe, expect, it } from "vitest";
import { avvisoProposta, schedaProposta } from "../src/chat/server/agenti";
import { vociPreferenze } from "../src/chat/parole";

/** Identificativi, codici dei problemi e date tecniche che non devono mai arrivare al viaggiatore. */
const CODICI = /[A-Z]{2,}[-_][A-Z0-9]|\b[A-Z]\d+-E\d+\b|\bN\d+\b|\d{4}-\d{2}-\d{2}/;

/** Un risultato di proponi_ripianificazione come lo restituisce lo strumento, con la spiegazione grezza del motore. */
const DATI = {
  propostaId: 3,
  fattibile: true,
  spiegazione:
    "Imprevisto: meteo avverso: pioggia in zona Roma, centro il 2026-10-17 dalle 09:00 alle 13:00. Richiesta: aggiungi A-OSM-RELATION-10646138. N2 ORARI_DA_VERIFICARE D2-E6",
  cambiamenti: {
    rimossi: [{ id: "D2-E2", dalle: "09:30", alle: "11:30", attivita: "Visita a Museo della Forma Urbis" }],
    aggiunti: [{ id: "N2", dalle: "10:00", alle: "11:00", attivita: "Passeggiata: Parco del Colle Oppio" }],
    modificati: [],
  },
  problemi: [{ gravita: "avviso", messaggio: 'Gli orari di apertura di "Quartino" non sono verificati (D2-E6 "Degustazione: Quartino")' }],
};

describe("REQ-CHAT-002 CA-2 nessun codice del motore nelle schede di proposta", () => {
  it("la scheda mostra cosa cambia e un avviso in parole semplici, senza id, codici o date AAAA-MM-GG", () => {
    const scheda = schedaProposta({ tipo: "proposta", strumento: "proponi_modifica", tipoProposta: "modifica", propostaId: 3, fattibile: true, dati: DATI });
    const testo = JSON.stringify({ ...scheda, propostaId: undefined });
    expect(testo).not.toMatch(CODICI);
    expect(scheda).toMatchObject({ tipo: "proposta", propostaId: 3 });
    expect(JSON.stringify(scheda)).toContain("Passeggiata: Parco del Colle Oppio");
    expect(JSON.stringify(scheda)).toContain("Alcuni orari di apertura non sono verificati");
  });

  it("l'avviso dice se la proposta non sta in piedi o non cambia nulla", () => {
    expect(avvisoProposta(false, 2, [])).toMatch(/non sta in piedi/);
    expect(avvisoProposta(true, 0, [])).toBe("Il programma non cambia: nessuna attività è colpita.");
    expect(avvisoProposta(true, 1, [{ gravita: "bloccante", messaggio: "X-1 conflitto" }, { gravita: "avviso", messaggio: "Y" }])).toBe("Ci sono 2 punti da controllare nella pagina della proposta.");
    expect(avvisoProposta(true, 1, [])).toBeUndefined();
  });
});

describe("REQ-CHAT-002 CA-4 date del riepilogo in italiano corretto", () => {
  it("«da venerdì 16 ottobre a domenica 18 ottobre», mai «al domenica»", () => {
    const voci = vociPreferenze({ date: { tipo: "precise", inizio: "2026-10-16", fine: "2026-10-18" } });
    expect(voci).toContainEqual({ etichetta: "Quando", valore: "da venerdì 16 ottobre a domenica 18 ottobre" });
    expect(JSON.stringify(voci)).not.toMatch(/\bal (lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica)/);
  });
});
