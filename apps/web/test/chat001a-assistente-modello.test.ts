import { creaClienteFinto, MESSAGGIO_AI_NON_DISPONIBILE } from "@travelops/agents";
import { describe, expect, it } from "vitest";
import { codificaEvento, decodificaEvento, flussoDaEventi, leggiEventi, type EventoChat } from "../src/chat/protocollo";
import { assistenteDaAmbiente, assistenteDaModello, ISTRUZIONI_CHAT, pezziDiTesto } from "../src/chat/server/assistente";
import { ambienteChat, conversazioneSalvata, inviaELeggi, nuovaConversazione } from "./supporto-chat001a";

/** Una conversazione registrata di due turni: il modello risponde a pezzi, senza strumenti e senza rete. */
const CONVERSAZIONE = {
  versione: 1,
  descrizione: "Chat lato server con il modello: due turni senza strumenti",
  turni: [
    {
      atteso: { istruzioni: ISTRUZIONI_CHAT, strumenti: [], messaggi: [{ ruolo: "utente", testo: "Vorrei 4 giorni a Lisbona" }] },
      risposta: { testo: ["Lisbona è bellissima. ", "Con chi viaggi?"] },
    },
    {
      atteso: {
        messaggi: [
          { ruolo: "utente", testo: "Vorrei 4 giorni a Lisbona" },
          { ruolo: "assistente", testo: "Lisbona è bellissima. Con chi viaggi?" },
          { ruolo: "utente", testo: "In coppia" },
        ],
      },
      risposta: { testo: "Perfetto, in due." },
    },
  ],
};

describe("ST-CHAT-001A l'assistente con il modello linguistico (@travelops/agents), senza rete", () => {
  it("la risposta del modello arriva in streaming e si salva; il modello riceve la conversazione intera", async () => {
    const cliente = creaClienteFinto(CONVERSAZIONE);
    const ambiente = ambienteChat(() => ({ disponibile: true, assistente: assistenteDaModello(cliente) }));
    const { id } = await nuovaConversazione(ambiente);

    const primo = await inviaELeggi(ambiente, id, "Vorrei 4 giorni a Lisbona");
    expect(primo).toEqual([
      { tipo: "testo", testo: "Lisbona è bellissima. " },
      { tipo: "testo", testo: "Con chi viaggi?" },
      { tipo: "risposta", numero: 2, risposta: { testo: "Lisbona è bellissima. Con chi viaggi?" } },
    ]);
    await inviaELeggi(ambiente, id, "In coppia");
    cliente.verificaCompletata();
    expect((await conversazioneSalvata(ambiente, id)).messaggi.map((m) => `${m.autore}: ${m.testo}`)).toEqual([
      "viaggiatore: Vorrei 4 giorni a Lisbona",
      "travelops: Lisbona è bellissima. Con chi viaggi?",
      "viaggiatore: In coppia",
      "travelops: Perfetto, in due.",
    ]);
  });

  it("l'API che non risponde (errore registrato) è un errore della richiesta che si può riprovare", async () => {
    const cliente = creaClienteFinto({ versione: 1, turni: [{ atteso: {}, risposta: { errore: "servizio" } }] });
    const ambiente = ambienteChat(() => ({ disponibile: true, assistente: assistenteDaModello(cliente) }));
    const { id } = await nuovaConversazione(ambiente);
    expect((await inviaELeggi(ambiente, id, "Ciao")).at(-1)).toMatchObject({ tipo: "errore", codice: "errore" });
  });

  it("dall'ambiente: senza chiave non disponibile con il messaggio gentile, con la chiave disponibile, senza chiamate di rete", () => {
    expect(assistenteDaAmbiente({})).toEqual({ disponibile: false, messaggio: MESSAGGIO_AI_NON_DISPONIBILE });
    expect(assistenteDaAmbiente({ OPENAI_API_KEY: "   " }).disponibile).toBe(false);
    const stato = assistenteDaAmbiente({ OPENAI_API_KEY: "chiave-di-prova-non-valida" });
    expect(stato.disponibile).toBe(true);
    // Lo stato non contiene la chiave: non può finire in una risposta.
    expect(JSON.stringify(stato)).not.toContain("chiave-di-prova-non-valida");
  });
});

describe("ST-CHAT-001A protocollo dello streaming: eventi JSON per riga", () => {
  const EVENTI: EventoChat[] = [
    { tipo: "testo", testo: "Ciao " },
    { tipo: "testo", testo: "a te\ncon a capo" },
    { tipo: "risposta", numero: 2, risposta: { testo: "Ciao a te\ncon a capo", risposteRapide: ["Sì"] } },
  ];

  it("un evento per riga, riletto uguale anche se il flusso arriva spezzato a caso", async () => {
    const testo = EVENTI.map(codificaEvento).join("");
    expect(testo.split("\n").filter(Boolean)).toHaveLength(3);
    const byte = new TextEncoder().encode(testo);
    const flusso = new ReadableStream<Uint8Array>({
      start(controllo) {
        for (let i = 0; i < byte.length; i += 7) controllo.enqueue(byte.slice(i, i + 7));
        controllo.close();
      },
    });
    const letti: EventoChat[] = [];
    for await (const evento of leggiEventi(flusso)) letti.push(evento);
    expect(letti).toEqual(EVENTI);
  });

  it("dagli eventi al flusso e ritorno", async () => {
    async function* sorgente() {
      yield* EVENTI;
    }
    const letti: EventoChat[] = [];
    for await (const evento of leggiEventi(flussoDaEventi(sorgente()))) letti.push(evento);
    expect(letti).toEqual(EVENTI);
  });

  it("righe che non sono eventi del protocollo sono rifiutate", () => {
    expect(() => decodificaEvento("non json")).toThrow(/non è JSON/);
    expect(() => decodificaEvento(JSON.stringify({ tipo: "altro" }))).toThrow(/sconosciuti/);
    expect(() => decodificaEvento(JSON.stringify({ tipo: "errore", codice: "boh", messaggio: "x" }))).toThrow();
  });

  it("i pezzi di testo dell'assistente finto ricompongono il testo", () => {
    const testo = "Bella idea,  il lago a giugno.";
    expect(pezziDiTesto(testo).join("")).toBe(testo);
  });
});
