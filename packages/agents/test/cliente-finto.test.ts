/**
 * Client finto: riproduce le conversazioni registrate in modo deterministico e fallisce chiaramente con una
 * richiesta non registrata.
 */
import { describe, expect, it } from "vitest";
import {
  caricaConversazioneRegistrata,
  creaClienteFinto,
  creaClienteRegistratore,
  ErroreAiNonDisponibile,
  ErroreConversazioneNonRegistrata,
  ErroreConversazioneNonValida,
  leggiConversazioneRegistrata,
  raccogliRisposta,
  type EventoModello,
  type Messaggio,
} from "../src/index.js";

const FILE = new URL("./dati/conversazione-di-prova.json", import.meta.url);
const ISTRUZIONI = "Sei l'assistente di viaggio di prova.";
const DOMANDA: Messaggio = { ruolo: "utente", testo: "Che tempo fa a Lisbona? E quanto fa 2 più 3?" };
const NOMI = ["meteo_di_prova", "somma_di_prova", "rotto_di_prova"];
const strumenti = NOMI.map((nome) => ({ nome, descrizione: nome, parametri: { type: "object" } }));

const nonDoveva = (): never => {
  throw new Error("la richiesta doveva fallire");
};

async function eventi(iterabile: AsyncIterable<EventoModello>): Promise<EventoModello[]> {
  const raccolti: EventoModello[] = [];
  for await (const e of iterabile) raccolti.push(e);
  return raccolti;
}

describe("client finto con conversazioni registrate", () => {
  it("riproduce i turni registrati: testo, chiamate (argomenti come testo JSON), fine; e verifica di averli usati tutti", async () => {
    const cliente = creaClienteFinto(caricaConversazioneRegistrata(FILE));
    expect(cliente.fornitore).toBe("finto");

    const primo = await eventi(cliente.rispondi({ istruzioni: ISTRUZIONI, messaggi: [DOMANDA], strumenti }));
    expect(primo).toEqual([
      { tipo: "testo", testo: "Controllo subito." },
      { tipo: "chiamata_strumento", chiamata: { id: "call_meteo", nome: "meteo_di_prova", argomenti: "{\"citta\":\"Lisbona\"}" } },
      { tipo: "chiamata_strumento", chiamata: { id: "call_somma", nome: "somma_di_prova", argomenti: "{\"a\": 2, \"b\": 3}" } },
      { tipo: "fine", motivo: "strumenti" },
    ]);
    expect(() => cliente.verificaCompletata()).toThrow("usati 1 turni su 2");

    const secondo = await eventi(
      cliente.rispondi({
        istruzioni: ISTRUZIONI,
        strumenti,
        messaggi: [
          DOMANDA,
          {
            ruolo: "assistente",
            testo: "Controllo subito.",
            // gli argomenti si confrontano per valore JSON, non per testo
            chiamate: [
              { id: "call_meteo", nome: "meteo_di_prova", argomenti: "{ \"citta\": \"Lisbona\" }" },
              { id: "call_somma", nome: "somma_di_prova", argomenti: "{\"b\":3,\"a\":2}" },
            ],
          },
          { ruolo: "strumento", idChiamata: "call_meteo", nome: "meteo_di_prova", risultato: "{\"citta\":\"Lisbona\",\"cielo\":\"sereno\",\"temperatura\":21}" },
          { ruolo: "strumento", idChiamata: "call_somma", nome: "somma_di_prova", risultato: "5" },
        ],
      }),
    );
    expect(secondo.filter((e) => e.tipo === "testo")).toHaveLength(3);
    expect(secondo.at(-1)).toEqual({ tipo: "fine", motivo: "completata" });
    expect(cliente.turniUsati()).toBe(2);
    expect(() => cliente.verificaCompletata()).not.toThrow();
    expect(cliente.richieste).toHaveLength(2);
  });

  it("è deterministico: due clienti dallo stesso file danno gli stessi eventi", async () => {
    const una = await eventi(creaClienteFinto(caricaConversazioneRegistrata(FILE)).rispondi({ istruzioni: ISTRUZIONI, messaggi: [DOMANDA], strumenti }));
    const due = await eventi(creaClienteFinto(caricaConversazioneRegistrata(FILE)).rispondi({ istruzioni: ISTRUZIONI, messaggi: [DOMANDA], strumenti }));
    expect(due).toEqual(una);
  });

  it("fallisce chiaramente con una richiesta non registrata: messaggio, istruzioni o strumenti diversi, turno in più", async () => {
    const prova = async (richiesta: Parameters<ReturnType<typeof creaClienteFinto>["rispondi"]>[0]) =>
      eventi(creaClienteFinto(caricaConversazioneRegistrata(FILE)).rispondi(richiesta)).then(nonDoveva, (e: unknown) => e as Error);

    const messaggio = await prova({ istruzioni: ISTRUZIONI, strumenti, messaggi: [{ ruolo: "utente", testo: "Che tempo fa a Porto?" }] });
    expect(messaggio).toBeInstanceOf(ErroreConversazioneNonRegistrata);
    expect(messaggio.message).toContain("turno 1 di 2");
    expect(messaggio.message).toContain("messaggio 1 diverso");
    expect(messaggio.message).toContain("Porto");
    expect(messaggio.message).toContain("Conversazione di prova");

    expect((await prova({ istruzioni: "Altre istruzioni", strumenti, messaggi: [DOMANDA] })).message).toContain("istruzioni diverse");
    expect((await prova({ istruzioni: ISTRUZIONI, strumenti: strumenti.slice(1), messaggi: [DOMANDA] })).message).toContain("strumenti diversi");
    expect((await prova({ istruzioni: ISTRUZIONI, strumenti, messaggi: [DOMANDA, DOMANDA] })).message).toContain("numero di messaggi diverso");

    const vuota = creaClienteFinto({ versione: 1, turni: [] });
    const inPiu = await eventi(vuota.rispondi({ messaggi: [DOMANDA] })).then(nonDoveva, (e: unknown) => e as Error);
    expect(inPiu).toBeInstanceOf(ErroreConversazioneNonRegistrata);
    expect(inPiu.message).toContain("richiesta non registrata");
    expect(inPiu.message).toContain("ha 0 turni");
  });

  it("i campi assenti in \"atteso\" non si controllano; un turno può simulare l'API non disponibile", async () => {
    const cliente = creaClienteFinto({
      versione: 1,
      turni: [
        { atteso: {}, risposta: { testo: "qualsiasi" } },
        { atteso: {}, risposta: { errore: "servizio" } },
      ],
    });
    expect((await raccogliRisposta(cliente.rispondi({ messaggi: [DOMANDA] }))).testo).toBe("qualsiasi");
    const errore = await eventi(cliente.rispondi({ messaggi: [DOMANDA] })).catch((e: unknown) => e);
    expect(errore).toBeInstanceOf(ErroreAiNonDisponibile);
    expect((errore as ErroreAiNonDisponibile).causa).toBe("servizio");
  });

  it("rifiuta le conversazioni scritte male con un messaggio che dice dove", () => {
    expect(() => leggiConversazioneRegistrata([])).toThrow(ErroreConversazioneNonValida);
    expect(() => leggiConversazioneRegistrata({ versione: 2, turni: [] })).toThrow("versione");
    expect(() => leggiConversazioneRegistrata({ versione: 1, turni: [{ atteso: {} }] })).toThrow("turno 1");
    expect(() => leggiConversazioneRegistrata({ versione: 1, turni: [{ atteso: { messaggi: [{ ruolo: "sistema", testo: "x" }] }, risposta: {} }] })).toThrow(
      "turno 1, atteso.messaggi[0]",
    );
    expect(() => leggiConversazioneRegistrata({ versione: 1, turni: [{ atteso: { messaggi: [], ultimiMessaggi: [] }, risposta: {} }] })).toThrow("non entrambi");
    expect(() => leggiConversazioneRegistrata({ versione: 1, turni: [{ atteso: {}, risposta: { chiamate: [{ id: "a", nome: "b", argomenti: 3 }] } }] })).toThrow(
      "argomenti",
    );
    expect(() => caricaConversazioneRegistrata(new URL("./dati/non-esiste.json", import.meta.url))).toThrow(ErroreConversazioneNonValida);
  });

  it("il registratore passa gli eventi e produce una conversazione che il client finto riproduce", async () => {
    const originale = creaClienteFinto(caricaConversazioneRegistrata(FILE));
    const registratore = creaClienteRegistratore(originale);
    const richiesta = { istruzioni: ISTRUZIONI, messaggi: [DOMANDA], strumenti };
    const passati = await eventi(registratore.rispondi(richiesta));
    const conversazione = registratore.conversazione("registrata nel test");
    expect(conversazione.turni).toHaveLength(1);
    expect(conversazione.turni[0]?.atteso).toEqual({ istruzioni: ISTRUZIONI, messaggi: [DOMANDA], strumenti: NOMI });

    const riprodotti = await eventi(creaClienteFinto(JSON.parse(JSON.stringify(conversazione))).rispondi(richiesta));
    expect(riprodotti).toEqual(passati);
  });
});
