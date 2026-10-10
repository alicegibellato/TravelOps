/**
 * REQ-IMPR-001 (ST-IMPR-001), lato agenti: l'imprevisto raccontato in chat.
 *
 * - CA-3 nessuna proposta parte senza la conferma del viaggiatore: per Gestione imprevisti gli strumenti di proposta
 *   rispondono con un errore finché l'ultimo messaggio di TravelOps non è una domanda e il viaggiatore non dice sì;
 * - CA-4 un racconto ambiguo porta a una domanda, mai a un'ipotesi silenziosa;
 * - i tipi della §7.4 (volo perso, sciopero, bagaglio, salute…) e "restare di più / tornare prima" diventano
 *   proposte del motore dallo strumento, con i dati strutturati.
 * Client del modello finto, rete bloccata, viaggio V-VOLO dei dati di riferimento.
 */
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  creaClienteFinto,
  creaStrumentiMotore,
  haConfermato,
  rispondiAlMessaggioCompleto,
  SERVE_CONFERMA,
  type Messaggio,
} from "../../src/index.js";
import { archivioViaggioConfermato, SABATO_MATTINA } from "./supporto.js";
import { sorgenteRegistrata } from "../strumenti/supporto.js";

const tentativi: string[] = [];
const blocca = (nome: string) => (): never => {
  tentativi.push(nome);
  throw new Error(`rete bloccata nei test: ${nome}`);
};

beforeEach(() => {
  tentativi.length = 0;
  vi.stubGlobal("fetch", blocca("fetch"));
  vi.spyOn(net.Socket.prototype, "connect").mockImplementation(blocca("net.Socket.connect"));
  vi.spyOn(http, "request").mockImplementation(blocca("http.request"));
  vi.spyOn(https, "request").mockImplementation(blocca("https.request"));
  vi.spyOn(dns, "lookup").mockImplementation(blocca("dns.lookup"));
});

afterEach(() => {
  expect(tentativi).toEqual([]);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const NULLI = {
  tipo: null, data: null, inizio: null, fine: null, zonaId: null, condizione: null, momento: null, minuti: null, motivo: null,
  luogoId: null, elementoId: null, arrivoData: null, arrivoOrario: null, giorni: null, intensitaMassima: null, mobilitaRidotta: null,
  descrizione: null, mezzo: null,
};
const scegli = { chiamate: [{ id: "o", nome: "scegli_agente", argomenti: { agente: "imprevisti", motivo: "Imprevisto." } }] };

describe("REQ-IMPR-001 CA-3 nessuna proposta senza la conferma del viaggiatore", () => {
  it("se l'agente prova a proporre subito, lo strumento lo ferma; l'agente riassume e chiede conferma", async () => {
    const archivio = archivioViaggioConfermato();
    const cliente = creaClienteFinto({
      versione: 1,
      turni: [
        { atteso: {}, risposta: scegli },
        {
          atteso: {},
          risposta: {
            chiamate: [{ id: "c1", nome: "proponi_ripianificazione", argomenti: { ...NULLI, tipo: "STANCHEZZA", data: "2026-06-13" } }],
          },
        },
        { atteso: {}, risposta: { testo: "Ho capito: giornata più leggera oggi. Procedo?" } },
      ],
    });
    const { eventi, fine } = await rispondiAlMessaggioCompleto({
      cliente,
      archivio,
      sorgente: sorgenteRegistrata(),
      conversazione: [],
      messaggio: "Oggi siamo distrutti, facciamo meno cose.",
      adesso: SABATO_MATTINA,
    });
    expect(eventi.find((e) => e.tipo === "strumento_fallito")).toMatchObject({ strumento: "proponi_ripianificazione", messaggio: SERVE_CONFERMA });
    expect(eventi.some((e) => e.tipo === "proposta")).toBe(false);
    expect(archivio.contenuto().proposte).toEqual([]);
    expect(fine.testo).toMatch(/Procedo\?$/);
  });

  it("haConfermato: serve una domanda di TravelOps subito prima e un sì del viaggiatore", () => {
    const domanda: Messaggio[] = [
      { ruolo: "utente", testo: "Si è bucata una gomma." },
      { ruolo: "assistente", testo: "Ho capito: ritardo di 2 ore da adesso. Procedo?" },
    ];
    for (const si of ["Sì, procedi.", "si", "Ok", "va bene", "Procedi pure", "Confermo", "certo!"]) expect(haConfermato(domanda, si), si).toBe(true);
    for (const no of ["No", "Aspetta, forse 3 ore", "Come?", ""]) expect(haConfermato(domanda, no), no).toBe(false);
    // Senza domanda subito prima, nessun sì vale.
    expect(haConfermato([{ ruolo: "assistente", testo: "Ecco la proposta." }], "Sì")).toBe(false);
    expect(haConfermato([...domanda, { ruolo: "utente", testo: "No, 3 ore" }], "Sì")).toBe(false);
    expect(haConfermato([], "Sì")).toBe(false);
  });

  it("il Planner non ha il blocco: le modifiche chieste in modo esplicito restano come prima", async () => {
    const archivio = archivioViaggioConfermato();
    const registro = creaStrumentiMotore({ archivio, sorgente: sorgenteRegistrata() });
    const proponi = registro.find((s) => s.definizione.nome === "proponi_modifica");
    const risultato = await proponi?.esegui(
      { operazione: "rimuovi", elementoId: "D2-E2", attivitaId: null, data: null, inizio: null, priorita: null, orarioFisso: null },
      {} as never,
    );
    expect(risultato).toMatchObject({ propostaId: 1 });
  });
});

describe("REQ-IMPR-001 CA-4 un racconto ambiguo porta a una domanda", () => {
  it("«C'è un problema con il treno»: nessuno strumento di proposta, una domanda al viaggiatore", async () => {
    const archivio = archivioViaggioConfermato();
    const cliente = creaClienteFinto({
      versione: 1,
      turni: [
        { atteso: {}, risposta: scegli },
        { atteso: {}, risposta: { testo: "Mi dispiace! Che cosa è successo al treno: è in ritardo, è cancellato o l'hai perso?" } },
      ],
    });
    const { eventi, fine } = await rispondiAlMessaggioCompleto({
      cliente,
      archivio,
      sorgente: sorgenteRegistrata(),
      conversazione: [],
      messaggio: "C'è un problema con il treno.",
      adesso: SABATO_MATTINA,
    });
    expect(fine.chiamate).toEqual([]);
    expect(eventi.some((e) => e.tipo === "proposta")).toBe(false);
    expect(fine.testo).toMatch(/\?$/);
    expect(archivio.contenuto().proposte).toEqual([]);
  });
});

describe("REQ-IMPR-001 i tipi della §7.4 e le richieste di durata diventano proposte del motore", () => {
  const confermato = () => creaStrumentiMotore({ archivio: archivioViaggioConfermato(), sorgente: sorgenteRegistrata(), propostaConfermata: () => true });
  const esegui = async (nome: string, argomenti: Record<string, unknown>) => {
    const strumento = confermato().find((s) => s.definizione.nome === nome);
    if (strumento === undefined) throw new Error(`manca ${nome}`);
    return (await strumento.esegui(argomenti, {} as never)) as { propostaId: number; fattibile: boolean };
  };

  it.each([
    ["VOLO_PERSO", { elementoId: "D3-E9", arrivoData: null, arrivoOrario: null }],
    ["VOLO_PERSO con arrivo previsto", { elementoId: "D3-E9", arrivoData: "2026-06-14", arrivoOrario: "23:00" }],
    ["SALUTE", { data: "2026-06-13", giorni: 1, intensitaMassima: "facile", mobilitaRidotta: true, descrizione: "febbre" }],
    ["SCIOPERO", { data: "2026-06-14", mezzo: "treno" }],
    ["BAGAGLIO_SMARRITO", { data: "2026-06-13", momento: "08:00" }],
    ["DOCUMENTI_SMARRITI", { data: "2026-06-13", momento: "08:00" }],
    ["STANCHEZZA", { data: "2026-06-13" }],
  ])("%s: proposta salvata", async (nome, campi) => {
    const tipo = nome.split(" ")[0];
    const risultato = await esegui("proponi_ripianificazione", { ...NULLI, tipo, ...campi });
    expect(risultato.propostaId).toBe(1);
  });

  it("dati mancanti o sbagliati: errore che il modello può correggere, nessuna proposta", async () => {
    await expect(esegui("proponi_ripianificazione", { ...NULLI, tipo: "SCIOPERO", data: "2026-06-14" })).rejects.toThrow(/mezzo/);
    await expect(esegui("proponi_ripianificazione", { ...NULLI, tipo: "VOLO_PERSO", elementoId: "D2-E2" })).rejects.toThrow(/non è uno spostamento/);
    await expect(esegui("proponi_ripianificazione", { ...NULLI, tipo: "STANCHEZZA", data: "2026-07-01" })).rejects.toThrow(/non è un giorno del viaggio/);
  });

  it("restare di più e tornare prima: proponi_cambio_durata", async () => {
    expect((await esegui("proponi_cambio_durata", { operazione: "prolunga", giorni: 1, dopo: "2026-06-14" })).propostaId).toBe(1);
    expect((await esegui("proponi_cambio_durata", { operazione: "accorcia", giorni: 1, dopo: null })).propostaId).toBe(1);
  });
});
