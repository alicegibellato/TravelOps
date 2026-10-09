import { ErroreAiNonDisponibile, MESSAGGIO_AI_NON_DISPONIBILE, type CausaAiNonDisponibile } from "@travelops/agents";
import { describe, expect, it } from "vitest";
import { assistenteDaAmbiente, type AssistenteChat } from "../src/chat/server/assistente";
import { LUNGHEZZA_MASSIMA_MESSAGGIO, MESSAGGIO_ERRORE_RICHIESTA } from "../src/chat/server/servizio";
import {
  ambienteChat,
  contesto,
  conversazioneSalvata,
  disponibile,
  erroreDi,
  eventi,
  invia,
  inviaELeggi,
  nuovaConversazione,
  richiesta,
} from "./supporto-chat001a";

/** Un assistente che comincia a scrivere e poi fallisce con quella causa. */
function assistenteCheFallisce(causa: CausaAiNonDisponibile): AssistenteChat {
  return {
    async *rispondi() {
      yield { tipo: "testo", testo: "Sto pens" };
      throw new ErroreAiNonDisponibile(causa, { stato: 500 });
    },
  };
}

describe("CA-5 stati di errore e AI non disponibile gestiti lato server", () => {
  it("CA-5 senza OPENAI_API_KEY l'AI non è disponibile: un solo evento con il messaggio gentile e nulla di salvato", async () => {
    const ambiente = ambienteChat(() => assistenteDaAmbiente({}));
    const { id } = await nuovaConversazione(ambiente);
    expect(await inviaELeggi(ambiente, id, "Vorrei andare al lago")).toEqual([
      { tipo: "errore", codice: "non-disponibile", messaggio: MESSAGGIO_AI_NON_DISPONIBILE },
    ]);
    expect((await conversazioneSalvata(ambiente, id)).messaggi).toEqual([]);
  });

  it("CA-5 con la chiave rifiutata (autenticazione) l'AI non è disponibile, senza dettagli tecnici", async () => {
    const ambiente = ambienteChat(() => disponibile(assistenteCheFallisce("autenticazione")));
    const { id } = await nuovaConversazione(ambiente);
    const letti = await inviaELeggi(ambiente, id, "Ciao");
    expect(letti.at(-1)).toEqual({ tipo: "errore", codice: "non-disponibile", messaggio: MESSAGGIO_AI_NON_DISPONIBILE });
    expect(JSON.stringify(letti)).not.toMatch(/500|autenticazione|HTTP/);
  });

  it.each(["rete", "servizio", "limite", "richiesta"] as const)(
    "CA-5 con un errore di %s fallisce solo questa richiesta: si può riprovare con lo stesso testo",
    async (causa) => {
      let fallisci = true;
      const ambiente = ambienteChat(() => ({
        disponibile: true,
        assistente: {
          async *rispondi(storia) {
            if (fallisci) yield* assistenteCheFallisce(causa).rispondi(storia);
            yield { tipo: "risposta", risposta: { testo: "Eccomi." } };
          },
        },
      }));
      const { id } = await nuovaConversazione(ambiente);
      const primo = await inviaELeggi(ambiente, id, "Ciao");
      expect(primo.at(-1)).toEqual({ tipo: "errore", codice: "errore", messaggio: MESSAGGIO_ERRORE_RICHIESTA });
      expect((await conversazioneSalvata(ambiente, id)).messaggi).toEqual([]);

      fallisci = false;
      const secondo = await inviaELeggi(ambiente, id, "Ciao");
      expect(secondo.at(-1)).toMatchObject({ tipo: "risposta", numero: 2 });
      expect((await conversazioneSalvata(ambiente, id)).messaggi.map((m) => m.testo)).toEqual(["Ciao", "Eccomi."]);
    },
  );

  it("CA-5 un errore qualunque dell'assistente diventa un errore della richiesta, senza il suo messaggio", async () => {
    const ambiente = ambienteChat(() =>
      disponibile({
        // eslint-disable-next-line require-yield
        async *rispondi() {
          throw new Error("dettaglio interno da non mostrare");
        },
      }),
    );
    const { id } = await nuovaConversazione(ambiente);
    const letti = await inviaELeggi(ambiente, id, "Ciao");
    expect(letti).toEqual([{ tipo: "errore", codice: "errore", messaggio: MESSAGGIO_ERRORE_RICHIESTA }]);
  });

  it("CA-5 una risposta vuota dell'assistente è un errore della richiesta e non si salva", async () => {
    const ambiente = ambienteChat(() =>
      disponibile({
        async *rispondi() {
          yield { tipo: "risposta", risposta: { testo: "   " } };
        },
      }),
    );
    const { id } = await nuovaConversazione(ambiente);
    expect((await inviaELeggi(ambiente, id, "Ciao")).at(-1)).toMatchObject({ tipo: "errore", codice: "errore" });
    expect((await conversazioneSalvata(ambiente, id)).messaggi).toEqual([]);
  });

  it("CA-5 messaggio vuoto, troppo lungo o non testo: 400 e nulla di salvato", async () => {
    const ambiente = ambienteChat();
    const { id } = await nuovaConversazione(ambiente);
    for (const corpo of [{ testo: "   " }, { testo: "x".repeat(LUNGHEZZA_MASSIMA_MESSAGGIO + 1) }, { testo: 42 }, {}]) {
      const risposta = await invia(ambiente, id, corpo);
      expect(risposta.status).toBe(400);
      expect((await erroreDi(risposta)).codice).toBe("messaggio-non-valido");
    }
    const nonJson = await invia(ambiente, id, "{non è json");
    expect(nonJson.status).toBe(400);
    expect((await erroreDi(nonJson)).codice).toBe("richiesta-non-valida");
    expect((await conversazioneSalvata(ambiente, id)).messaggi).toEqual([]);
  });

  it("CA-5 un messaggio lungo esattamente il massimo si accetta", async () => {
    const ambiente = ambienteChat();
    const { id } = await nuovaConversazione(ambiente);
    const risposta = await invia(ambiente, id, { testo: "x".repeat(LUNGHEZZA_MASSIMA_MESSAGGIO) });
    expect(risposta.status).toBe(200);
    expect((await eventi(risposta)).at(-1)?.tipo).toBe("risposta");
  });

  it("CA-5 conversazione inesistente: 404 sia in lettura sia in invio, anche con un id non numerico", async () => {
    const ambiente = ambienteChat();
    for (const id of ["999", "abc", "0", "-1"]) {
      const lettura = await ambiente.gestori.leggiConversazione(richiesta(`/${id}`, undefined, "GET"), contesto({ id }));
      expect(lettura.status).toBe(404);
      expect((await erroreDi(lettura)).codice).toBe("conversazione-inesistente");
      const invio = await ambiente.gestori.inviaMessaggio(richiesta(`/${id}/messaggi`, { testo: "Ciao" }), contesto({ id }));
      expect(invio.status).toBe(404);
    }
  });

  it("CA-5 viaggio inesistente o non valido alla creazione: 404 o 400", async () => {
    const ambiente = ambienteChat();
    const inesistente = await ambiente.gestori.creaConversazione(richiesta("", { viaggio: "VIAGGIO-CHE-NON-ESISTE" }));
    expect(inesistente.status).toBe(404);
    expect((await erroreDi(inesistente)).codice).toBe("viaggio-inesistente");
    const nonValido = await ambiente.gestori.creaConversazione(richiesta("", { viaggio: 7 }));
    expect(nonValido.status).toBe(400);
  });
});
