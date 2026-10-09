import { describe, expect, it } from "vitest";
import { VIAGGI_DEMO } from "../src/stato/viaggi-demo";
import { TIPO_CONTENUTO_EVENTI } from "../src/chat/protocollo";
import { ambienteChat, conversazioneSalvata, eventi, invia, inviaELeggi, nuovaConversazione } from "./supporto-chat001a";

const VIAGGIO = VIAGGI_DEMO[0]?.id ?? "";

describe("ST-CHAT-001A endpoint della chat con risposte in streaming e conversazione salvata per viaggio", () => {
  it("crea una conversazione collegata al viaggio e una ancora senza viaggio", async () => {
    const ambiente = ambienteChat();
    expect(VIAGGIO).not.toBe("");
    const delViaggio = await nuovaConversazione(ambiente, VIAGGIO);
    const senzaViaggio = await nuovaConversazione(ambiente);
    expect(delViaggio).toMatchObject({ viaggioId: VIAGGIO, messaggi: [] });
    expect(senzaViaggio).toMatchObject({ viaggioId: null, messaggi: [] });
    expect(senzaViaggio.id).not.toBe(delViaggio.id);
  });

  it("la risposta arriva a pezzi di testo e finisce con la risposta completa, scheda e risposte rapide comprese", async () => {
    const ambiente = ambienteChat();
    const { id } = await nuovaConversazione(ambiente, VIAGGIO);
    const risposta = await invia(ambiente, id, { testo: "Vorrei andare al lago" });
    expect(risposta.status).toBe(200);
    expect(risposta.headers.get("content-type")).toBe(TIPO_CONTENUTO_EVENTI);
    const letti = await eventi(risposta);

    const pezzi = letti.filter((e) => e.tipo === "testo");
    const ultimo = letti.at(-1);
    expect(pezzi.length).toBeGreaterThan(1);
    expect(ultimo?.tipo).toBe("risposta");
    if (ultimo?.tipo !== "risposta") return;
    expect(pezzi.map((e) => (e.tipo === "testo" ? e.testo : "")).join("")).toBe(ultimo.risposta.testo);
    expect(ultimo.numero).toBe(2);
    expect(ultimo.risposta.scheda?.tipo).toBe("preferenze");
    expect(ultimo.risposta.risposteRapide).toEqual(["Coppia", "Famiglia", "Da solo"]);
  });

  it("la conversazione è salvata nel database: messaggio del viaggiatore, risposta, scheda e risposte rapide", async () => {
    const ambiente = ambienteChat();
    const { id } = await nuovaConversazione(ambiente, VIAGGIO);
    await inviaELeggi(ambiente, id, "  Vorrei andare al lago  ");
    await inviaELeggi(ambiente, id, "Coppia");

    const salvata = await conversazioneSalvata(ambiente, id);
    expect(salvata.viaggioId).toBe(VIAGGIO);
    expect(salvata.messaggi).toEqual([
      { numero: 1, autore: "viaggiatore", testo: "Vorrei andare al lago" },
      {
        numero: 2,
        autore: "travelops",
        testo: "Bella idea, il lago di Garda a giugno è perfetto. Con chi viaggi?",
        scheda: { tipo: "preferenze", titolo: "Le tue preferenze", voci: [{ etichetta: "Destinazione", valore: "Lago di Garda" }] },
        risposteRapide: ["Coppia", "Famiglia", "Da solo"],
      },
      { numero: 3, autore: "viaggiatore", testo: "Coppia" },
      { numero: 4, autore: "travelops", testo: "Perfetto, un viaggio in due." },
    ]);
  });

  it("la conversazione sopravvive al riavvio: un nuovo server sulla stessa cartella la rilegge uguale", async () => {
    const primo = ambienteChat();
    const { id } = await nuovaConversazione(primo, VIAGGIO);
    await inviaELeggi(primo, id, "Vorrei andare al lago");
    const prima = await conversazioneSalvata(primo, id);

    const dopo = ambienteChat(undefined, primo.cartella);
    expect(await conversazioneSalvata(dopo, id)).toEqual(prima);
  });

  it("l'assistente riceve tutta la conversazione fino al nuovo messaggio compreso", async () => {
    const ricevute: string[][] = [];
    const ambiente = ambienteChat(() => ({
      disponibile: true,
      assistente: {
        async *rispondi(storia) {
          ricevute.push(storia.map((t) => `${t.autore}: ${t.testo}`));
          yield { tipo: "risposta", risposta: { testo: `Risposta ${ricevute.length}` } };
        },
      },
    }));
    const { id } = await nuovaConversazione(ambiente);
    await inviaELeggi(ambiente, id, "Primo");
    await inviaELeggi(ambiente, id, "Secondo");
    expect(ricevute).toEqual([
      ["viaggiatore: Primo"],
      ["viaggiatore: Primo", "travelops: Risposta 1", "viaggiatore: Secondo"],
    ]);
  });
});
