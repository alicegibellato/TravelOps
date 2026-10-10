/**
 * Orchestratore, agenti e funzione della chat (REQ-ORCH-001 revisione 2, ST-ORCH-001C): regole di instradamento,
 * scelta con il modello e ripiego, sottoinsiemi degli strumenti, istruzioni di sistema, eventi della chat, AI non
 * disponibile (CA-3) e nessun modulo di rete nel codice degli agenti (CA-5).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  AGENTI,
  creaArchivioInMemoria,
  creaClienteFinto,
  MESSAGGIO_AI_NON_DISPONIBILE,
  messaggiPerOrchestratore,
  NOMI_STRUMENTI,
  REGOLE_COMUNI,
  rispondiAlMessaggioCompleto,
  scegliAgente,
  scegliConRegole,
  scegliPerRipiego,
  type ConversazioneRegistrata,
  type SituazioneViaggio,
} from "../../src/index.js";
import { ARGOMENTI_PROFILO_GARDA, sorgenteRegistrata } from "../strumenti/supporto.js";
import { archivioViaggioConfermato, SABATO_MATTINA } from "./supporto.js";

const situazione = (fase: SituazioneViaggio["fase"]): SituazioneViaggio => ({ fase, destinazione: null, istantanea: null });

describe("orchestratore: regole sulla fase del viaggio", () => {
  it("senza bozza risponde il Consulente, con la bozza il Planner, a viaggio confermato serve il modello", () => {
    expect(scegliConRegole(situazione("nuovo"), "Ciao")).toMatchObject({ agente: "consulente", modo: "regole" });
    expect(scegliConRegole(situazione("destinazione"), "Va bene, procedi")).toMatchObject({ agente: "consulente" });
    expect(scegliConRegole(situazione("bozza"), "Sta piovendo")).toMatchObject({ agente: "planner", modo: "regole" });
    expect(scegliConRegole(situazione("confermato"), "Sta piovendo")).toBeNull();
  });

  it("una risposta breve torna all'agente che ha fatto la domanda; una domanda o un testo lungo no", () => {
    for (const testo of ["Sì, procedi.", "si", "Ok!", "Va bene", "No, lascia stare", "Certo, grazie"]) {
      expect(scegliConRegole(situazione("confermato"), testo, "imprevisti"), testo).toMatchObject({ agente: "imprevisti", modo: "regole" });
    }
    expect(scegliConRegole(situazione("confermato"), "Sì", null)).toBeNull();
    expect(scegliConRegole(situazione("confermato"), "Sì, ma possiamo spostare la cena?", "imprevisti")).toBeNull();
    expect(scegliConRegole(situazione("confermato"), "Simpatico il museo, aggiungilo", "imprevisti")).toBeNull();
  });

  it("il ripiego riconosce gli imprevisti a parole chiave, altrimenti è una modifica richiesta", () => {
    expect(scegliPerRipiego("Il treno è stato cancellato")).toMatchObject({ agente: "imprevisti", modo: "ripiego" });
    expect(scegliPerRipiego("Mi sono slogato una caviglia")).toMatchObject({ agente: "imprevisti" });
    expect(scegliPerRipiego("Aggiungi una cena sabato")).toMatchObject({ agente: "planner", modo: "ripiego" });
  });

  it("l'orchestratore legge solo gli ultimi messaggi di testo, senza strumenti", () => {
    const messaggi = messaggiPerOrchestratore(
      [
        { ruolo: "utente", testo: "a" },
        { ruolo: "assistente", testo: "", chiamate: [{ id: "c", nome: "leggi_viaggio", argomenti: "{}" }] },
        { ruolo: "strumento", idChiamata: "c", nome: "leggi_viaggio", risultato: "{}" },
        { ruolo: "assistente", testo: "b" },
      ],
      "c",
    );
    expect(messaggi).toEqual([
      { ruolo: "utente", testo: "a" },
      { ruolo: "assistente", testo: "b" },
      { ruolo: "utente", testo: "c" },
    ]);
  });
});

describe("orchestratore: scelta con il modello", () => {
  const conScelta = (risposta: object): ConversazioneRegistrata =>
    ({ versione: 1, turni: [{ atteso: { strumenti: ["scegli_agente"] }, risposta }] }) as ConversazioneRegistrata;

  it("a viaggio confermato il modello sceglie il Planner per una modifica richiesta", async () => {
    const cliente = creaClienteFinto(conScelta({ chiamate: [{ id: "o1", nome: "scegli_agente", argomenti: { agente: "planner", motivo: "Vuole aggiungere un'attività." } }] }));
    const scelta = await scegliAgente({ cliente, stato: situazione("confermato"), conversazione: [], messaggio: "Aggiungi la cantina domenica pomeriggio" });
    expect(scelta).toEqual({ agente: "planner", modo: "modello", motivo: "Vuole aggiungere un'attività." });
    expect(cliente.richieste[0]?.istruzioni).toContain("scegli_agente");
  });

  it("se il modello risponde a parole o sceglie un agente che non esiste, vale il ripiego", async () => {
    for (const risposta of [{ testo: "Credo sia un imprevisto." }, { chiamate: [{ id: "o1", nome: "scegli_agente", argomenti: { agente: "meteo", motivo: "?" } }] }]) {
      const cliente = creaClienteFinto(conScelta(risposta));
      const scelta = await scegliAgente({ cliente, stato: situazione("confermato"), conversazione: [], messaggio: "Grandina!" });
      expect(scelta).toMatchObject({ agente: "imprevisti", modo: "ripiego" });
    }
  });
});

describe("agenti: strumenti e istruzioni", () => {
  it("ogni agente ha un sottoinsieme degli strumenti del motore, e insieme li coprono tutti", () => {
    const tutti = new Set(Object.values(AGENTI).flatMap((a) => a.strumenti));
    expect([...tutti].sort()).toEqual([...NOMI_STRUMENTI].sort());
    expect(AGENTI.consulente.strumenti).not.toContain("conferma_viaggio");
    expect(AGENTI.consulente.strumenti).not.toContain("proponi_ripianificazione");
    expect(AGENTI.planner.strumenti).not.toContain("prepara_destinazione");
    expect(AGENTI.planner.strumenti).not.toContain("proponi_ripianificazione");
    expect(AGENTI.imprevisti.strumenti).toEqual(["proponi_modifica", "proponi_ripianificazione", "proponi_cambio_durata", "cerca_catalogo", "leggi_viaggio"]);
  });

  it("le istruzioni sono in italiano e contengono le regole che non si violano", () => {
    expect(REGOLE_COMUNI).toMatch(/tono amichevole/);
    expect(REGOLE_COMUNI).toMatch(/frasi brevi/);
    expect(REGOLE_COMUNI).toMatch(/Niente codici tecnici/);
    expect(REGOLE_COMUNI).toMatch(/al massimo 2 domande/);
    expect(REGOLE_COMUNI).toMatch(/Nomina solo luoghi e attività che hai letto nei risultati degli strumenti/);
    expect(REGOLE_COMUNI).toMatch(/non dire mai di aver prenotato, pagato o cancellato/);
    expect(REGOLE_COMUNI).toMatch(/Prima di un'azione importante .* riassumila/);
    for (const agente of Object.values(AGENTI)) expect(agente.istruzioni).toContain(REGOLE_COMUNI);
  });
});

describe("chat: eventi della risposta", () => {
  it("passi, azioni fatte, risultati e strumenti falliti arrivano come eventi distinti", async () => {
    const consulente = [...AGENTI.consulente.strumenti];
    const cliente = creaClienteFinto({
      versione: 1,
      turni: [
        { atteso: { strumenti: consulente }, risposta: { chiamate: [{ id: "c1", nome: "genera_bozza", argomenti: {} }] } },
        {
          atteso: { strumenti: consulente },
          risposta: {
            chiamate: [
              { id: "c2", nome: "aggiorna_profilo", argomenti: { ...ARGOMENTI_PROFILO_GARDA } },
              { id: "c3", nome: "cerca_destinazione", argomenti: { testo: "Riva del Garda" } },
            ],
          },
        },
        { atteso: { strumenti: consulente }, risposta: { testo: ["Ho trovato Riva del Garda. ", "La preparo?"] } },
      ],
    });
    const { eventi, fine } = await rispondiAlMessaggioCompleto({
      cliente,
      archivio: creaArchivioInMemoria(),
      sorgente: sorgenteRegistrata(),
      conversazione: [],
      messaggio: "Tre giorni sul Lago di Garda a ottobre",
    });
    cliente.verificaCompletata();
    expect(eventi.map((e) => e.tipo)).toEqual(["agente", "passo", "strumento_fallito", "passo", "azione", "passo", "risultato", "testo", "testo", "fine"]);
    expect(eventi[2]).toMatchObject({ tipo: "strumento_fallito", strumento: "genera_bozza", messaggio: expect.stringMatching(/destinazione non è ancora pronta/) });
    expect(eventi[4]).toMatchObject({ tipo: "azione", strumento: "aggiorna_profilo", testo: "Preferenze aggiornate" });
    expect(eventi[6]).toMatchObject({ tipo: "risultato", strumento: "cerca_destinazione" });
    expect(fine).toMatchObject({ agente: "consulente", testo: "Ho trovato Riva del Garda. La preparo?", motivo: "completata" });
    expect(fine.messaggiNuovi.map((m) => m.ruolo)).toEqual(["utente", "assistente", "strumento", "assistente", "strumento", "strumento", "assistente"]);
  });

  it("CA-3 se l'AI non risponde: evento non_disponibile con il messaggio previsto e nessun cambiamento", async () => {
    const archivio = archivioViaggioConfermato();
    const prima = archivio.scritture.length;
    const cliente = creaClienteFinto({ versione: 1, turni: [{ atteso: { strumenti: ["scegli_agente"] }, risposta: { errore: "servizio" } }] });
    const { eventi, fine } = await rispondiAlMessaggioCompleto({
      cliente,
      archivio,
      sorgente: sorgenteRegistrata(),
      conversazione: [],
      messaggio: "Piove!",
      adesso: SABATO_MATTINA,
    });
    expect(eventi).toEqual([
      { tipo: "non_disponibile", causa: "servizio", messaggio: MESSAGGIO_AI_NON_DISPONIBILE },
      { tipo: "fine", agente: "consulente", testo: MESSAGGIO_AI_NON_DISPONIBILE, motivo: "non_disponibile", messaggiNuovi: [{ ruolo: "utente", testo: "Piove!" }], chiamate: [] },
    ]);
    expect(fine.motivo).toBe("non_disponibile");
    expect(archivio.scritture).toHaveLength(prima);
  });
});

describe("CA-5 gli agenti non usano la rete", () => {
  it("CA-5 il codice degli agenti non importa moduli di rete né il client OpenAI: riceve il client da fuori", () => {
    const cartella = fileURLToPath(new URL("../../src/agenti", import.meta.url));
    const file = readdirSync(cartella).filter((f) => f.endsWith(".ts"));
    expect(file.length).toBeGreaterThanOrEqual(5);
    for (const nome of file) {
      const sorgente = readFileSync(join(cartella, nome), "utf8");
      expect(sorgente, nome).not.toMatch(/from "node:(http|https|net|dns|tls|dgram)"|from "(http|https|net|dns|openai)"|\bfetch\(|creaClienteOpenAI|creaClienteDaAmbiente|process\.env/);
    }
  });
});
