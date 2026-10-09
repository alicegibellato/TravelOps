/**
 * Client OpenAI con un fetch finto (nessuna rete, CA-5): traduzione della richiesta verso la Responses API, degli
 * eventi dello streaming verso `EventoModello` e degli errori dell'API verso `ErroreAiNonDisponibile`.
 */
import { describe, expect, it } from "vitest";
import {
  creaClienteOpenAI,
  ErroreAiNonDisponibile,
  MESSAGGIO_AI_NON_DISPONIBILE,
  MODELLO_PREDEFINITO,
  raccogliRisposta,
  type EventoModello,
  type RichiestaModello,
} from "../src/index.js";
import { chiaveFinta, creaFetchFinto, eventiRisposta, strumentiDiProva } from "./supporto.js";

const RICHIESTA: RichiestaModello = {
  istruzioni: "Sei l'assistente di viaggio di prova.",
  messaggi: [
    { ruolo: "utente", testo: "Che tempo fa a Lisbona?" },
    { ruolo: "assistente", testo: "Controllo.", chiamate: [{ id: "call_1", nome: "meteo_di_prova", argomenti: "{\"citta\":\"Lisbona\"}" }] },
    { ruolo: "strumento", idChiamata: "call_1", nome: "meteo_di_prova", risultato: "{\"cielo\":\"sereno\"}" },
    { ruolo: "assistente", testo: "", chiamate: [{ id: "call_2", nome: "somma_di_prova", argomenti: "{\"a\":1,\"b\":2}" }] },
    { ruolo: "strumento", idChiamata: "call_2", nome: "somma_di_prova", risultato: "3" },
  ],
  strumenti: strumentiDiProva().map((s) => s.definizione),
};

async function eventi(iterabile: AsyncIterable<EventoModello>): Promise<EventoModello[]> {
  const raccolti: EventoModello[] = [];
  for await (const e of iterabile) raccolti.push(e);
  return raccolti;
}

describe("client OpenAI (Responses API, fetch finto)", () => {
  it("manda la richiesta alla Responses API: modello, istruzioni, conversazione, strumenti, streaming senza stato", async () => {
    const finto = creaFetchFinto({ eventi: eventiRisposta(["Ciao"]) });
    const cliente = creaClienteOpenAI({ chiaveApi: chiaveFinta(), fetch: finto.fetch, maxTentativi: 0 });
    expect(cliente.fornitore).toBe("openai");
    expect(cliente.modello).toBe(MODELLO_PREDEFINITO);
    await eventi(cliente.rispondi(RICHIESTA));

    expect(finto.richieste).toHaveLength(1);
    const [richiesta] = finto.richieste;
    expect(richiesta?.url).toBe("https://api.openai.com/v1/responses");
    expect(richiesta?.metodo).toBe("POST");
    expect(richiesta?.intestazioni.get("authorization")).toBe(`Bearer ${chiaveFinta()}`);
    expect(richiesta?.corpo).toEqual({
      model: "gpt-6-luna",
      stream: true,
      store: false,
      instructions: "Sei l'assistente di viaggio di prova.",
      input: [
        { type: "message", role: "user", content: "Che tempo fa a Lisbona?" },
        { type: "message", role: "assistant", content: "Controllo." },
        { type: "function_call", call_id: "call_1", name: "meteo_di_prova", arguments: "{\"citta\":\"Lisbona\"}" },
        { type: "function_call_output", call_id: "call_1", output: "{\"cielo\":\"sereno\"}" },
        { type: "function_call", call_id: "call_2", name: "somma_di_prova", arguments: "{\"a\":1,\"b\":2}" },
        { type: "function_call_output", call_id: "call_2", output: "3" },
      ],
      tools: [
        {
          type: "function",
          name: "meteo_di_prova",
          description: "Il meteo simulato di una città (strumento di prova).",
          parameters: { type: "object", properties: { citta: { type: "string" } }, required: ["citta"], additionalProperties: false },
          strict: false,
        },
        expect.objectContaining({ type: "function", name: "somma_di_prova", strict: false }),
        expect.objectContaining({ type: "function", name: "rotto_di_prova", strict: false }),
      ],
    });
  });

  it("senza istruzioni né strumenti non li manda; il modello si sceglie e `rigoroso` diventa strict", async () => {
    const finto = creaFetchFinto({ eventi: eventiRisposta(["a"]) }, { eventi: eventiRisposta(["b"]) });
    const cliente = creaClienteOpenAI({ chiaveApi: chiaveFinta(), modello: "gpt-prova", fetch: finto.fetch, maxTentativi: 0 });
    await eventi(cliente.rispondi({ messaggi: [{ ruolo: "utente", testo: "ciao" }] }));
    await eventi(
      cliente.rispondi({
        messaggi: [{ ruolo: "utente", testo: "ciao" }],
        strumenti: [{ nome: "x", descrizione: "x", parametri: { type: "object", properties: {}, required: [], additionalProperties: false }, rigoroso: true }],
      }),
    );
    expect(finto.richieste[0]?.corpo).toEqual({ model: "gpt-prova", stream: true, store: false, input: [{ type: "message", role: "user", content: "ciao" }] });
    expect(finto.richieste[1]?.corpo.tools).toEqual([expect.objectContaining({ name: "x", strict: true })]);
  });

  it("traduce lo streaming: pezzi di testo, chiamate complete, fine con motivo e consumo", async () => {
    const finto = creaFetchFinto(
      { eventi: eventiRisposta(["Ecco ", "il meteo."]) },
      { eventi: eventiRisposta(["Controllo"], [{ id: "call_9", nome: "meteo_di_prova", argomenti: "{\"citta\":\"Porto\"}" }]) },
      { eventi: eventiRisposta(["Una risposta lung"], [], "incomplete") },
    );
    const cliente = creaClienteOpenAI({ chiaveApi: chiaveFinta(), fetch: finto.fetch, maxTentativi: 0 });

    expect(await eventi(cliente.rispondi(RICHIESTA))).toEqual([
      { tipo: "testo", testo: "Ecco " },
      { tipo: "testo", testo: "il meteo." },
      { tipo: "fine", motivo: "completata", uso: { ingresso: 12, uscita: 7 } },
    ]);
    expect(await raccogliRisposta(cliente.rispondi(RICHIESTA))).toEqual({
      testo: "Controllo",
      chiamate: [{ id: "call_9", nome: "meteo_di_prova", argomenti: "{\"citta\":\"Porto\"}" }],
      motivo: "strumenti",
      uso: { ingresso: 12, uscita: 7 },
    });
    expect((await raccogliRisposta(cliente.rispondi(RICHIESTA))).motivo).toBe("troncata");
  });

  it.each([
    [401, "autenticazione", "invalid_api_key"],
    [403, "autenticazione", undefined],
    [429, "limite", "rate_limit_exceeded"],
    [400, "richiesta", "invalid_request"],
    [404, "richiesta", "model_not_found"],
    [500, "servizio", undefined],
    [503, "servizio", undefined],
  ] as const)("errore HTTP %i → ErroreAiNonDisponibile(%s) con il messaggio per il viaggiatore", async (stato, causa, codice) => {
    const finto = creaFetchFinto({ stato, corpo: { error: { message: "dettaglio del fornitore", type: "x", code: codice ?? null } } });
    const cliente = creaClienteOpenAI({ chiaveApi: chiaveFinta(), fetch: finto.fetch, maxTentativi: 0 });
    const errore = await eventi(cliente.rispondi(RICHIESTA)).catch((e: unknown) => e);
    expect(errore).toBeInstanceOf(ErroreAiNonDisponibile);
    const e = errore as ErroreAiNonDisponibile;
    expect(e.causa).toBe(causa);
    expect(e.stato).toBe(stato);
    expect(e.codice).toBe(codice);
    expect(e.messaggioUtente).toBe(MESSAGGIO_AI_NON_DISPONIBILE);
    expect(e.message).not.toContain("dettaglio del fornitore");
    expect(e.cause).toBeUndefined();
  });

  it("rete assente, risposta fallita, evento di errore e annullamento diventano ErroreAiNonDisponibile", async () => {
    const casi: [Parameters<typeof creaFetchFinto>[0], string][] = [
      [{ eccezione: new TypeError("fetch failed") }, "rete"],
      [{ eventi: eventiRisposta(["mezza"], [], "failed") }, "servizio"],
      [{ eventi: [{ type: "error", code: "server_error", message: "errore nello streaming", param: null, sequence_number: 1 }] }, "servizio"],
      [{ eventi: [{ type: "response.created", sequence_number: 1, response: {} }] }, "servizio"],
    ];
    for (const [risposta, causa] of casi) {
      const cliente = creaClienteOpenAI({ chiaveApi: chiaveFinta(), fetch: creaFetchFinto(risposta).fetch, maxTentativi: 0 });
      const errore = await eventi(cliente.rispondi(RICHIESTA)).catch((e: unknown) => e);
      expect(errore, causa).toBeInstanceOf(ErroreAiNonDisponibile);
      expect((errore as ErroreAiNonDisponibile).causa).toBe(causa);
    }

    const controllo = new AbortController();
    controllo.abort();
    const cliente = creaClienteOpenAI({ chiaveApi: chiaveFinta(), fetch: creaFetchFinto({ eventi: eventiRisposta(["x"]) }).fetch, maxTentativi: 0 });
    const errore = await eventi(cliente.rispondi({ ...RICHIESTA, segnale: controllo.signal })).catch((e: unknown) => e);
    expect((errore as ErroreAiNonDisponibile).causa).toBe("annullata");
  });

  it("senza chiave non si crea: ErroreAiNonDisponibile(chiave_mancante)", () => {
    expect(() => creaClienteOpenAI({ chiaveApi: "  " })).toThrow(ErroreAiNonDisponibile);
  });
});
