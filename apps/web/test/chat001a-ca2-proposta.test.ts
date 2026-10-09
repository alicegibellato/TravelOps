import { describe, expect, it, vi } from "vitest";
import { accettaAzione, rifiutaAzione } from "../app/demo/azioni";
import { avviaScenario, impostaOrologio } from "../src/stato/operazioni";
import { contesto, nuovaConversazione, richiesta, ambienteChat, conversazioneSalvata, erroreDi } from "./supporto-chat001a";
import { modulo, statoSalvato, storicoNelDatabase } from "./supporto-stato";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((indirizzo: string) => {
    throw new Error(`REDIRECT ${indirizzo}`);
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../src/stato/archivio", async (originale) => {
  const vero = await originale<typeof import("../src/stato/archivio")>();
  return { ...vero, cartellaDati: () => cartellaDelPulsante };
});

/** La cartella usata dalle azioni del pulsante (`app/demo/azioni.ts` legge `cartellaDati()`). */
let cartellaDelPulsante = "";

/** Avvia lo scenario S1 e imposta l'orologio come nella prova di REQ-WEB-002 CA-2; restituisce l'id della proposta. */
function preparaS1(cartella: string): number {
  const avvio = avviaScenario(cartella, "S1");
  if (!avvio.ok) throw new Error(avvio.messaggio);
  const orologio = impostaOrologio(cartella, "2026-06-13", "07:30");
  if (!orologio.ok) throw new Error(orologio.messaggio);
  return avvio.proposta.id;
}

async function premiPulsante(azione: (dati: FormData) => Promise<void>, campi: Record<string, string>): Promise<void> {
  await expect(azione(modulo(campi))).rejects.toThrow(/^REDIRECT /);
}

async function decidiDallaChat(
  ambiente: ReturnType<typeof ambienteChat>,
  idConversazione: number,
  idProposta: number,
  corpo: unknown,
): Promise<Response> {
  return ambiente.gestori.decidiProposta(
    richiesta(`/${idConversazione}/proposte/${idProposta}`, corpo),
    contesto({ id: String(idConversazione), proposta: String(idProposta) }),
  );
}

describe("CA-2 una proposta accettata dalla chat crea la stessa versione che si crea dal pulsante", () => {
  it("CA-2 accettando S1 come \"Alice\" dalla chat e dal pulsante lo storico salvato è identico, versione 2 compresa", async () => {
    const dallaChat = ambienteChat();
    const idChat = preparaS1(dallaChat.cartella);
    const { id } = await nuovaConversazione(dallaChat);
    const risposta = await decidiDallaChat(dallaChat, id, idChat, { decisione: "accetta", nome: "Alice" });
    expect(risposta.status).toBe(200);
    const corpo = (await risposta.json()) as { esito: { livello: string; messaggio: string } };
    expect(corpo.esito.livello).toBe("successo");

    const dalPulsante = ambienteChat();
    cartellaDelPulsante = dalPulsante.cartella;
    const idPulsante = preparaS1(dalPulsante.cartella);
    expect(idPulsante).toBe(idChat);
    await premiPulsante(accettaAzione, { proposta: String(idPulsante), nome: "Alice" });

    const storicoChat = statoSalvato(dallaChat.cartella).storico;
    const storicoPulsante = statoSalvato(dalPulsante.cartella).storico;
    expect(storicoChat.versioni.length).toBe(2);
    expect(storicoChat).toEqual(storicoPulsante);
    expect(storicoNelDatabase(dallaChat.cartella)).toBe(storicoNelDatabase(dalPulsante.cartella));
    expect(statoSalvato(dallaChat.cartella).proposte).toEqual(statoSalvato(dalPulsante.cartella).proposte);
  });

  it("CA-2 l'esito si salva nella conversazione con la scheda di conferma e le pagine si rigenerano", async () => {
    const ambiente = ambienteChat();
    const idProposta = preparaS1(ambiente.cartella);
    const { id } = await nuovaConversazione(ambiente);
    const risposta = await decidiDallaChat(ambiente, id, idProposta, { decisione: "accetta", nome: "Alice" });
    const corpo = (await risposta.json()) as { esito: { messaggio: string } };

    expect(corpo.esito.messaggio).toBe("Proposta accettata da Alice il 2026-06-13 alle 07:30: creata la versione 2.");
    expect((await conversazioneSalvata(ambiente, id)).messaggi).toEqual([
      {
        numero: 1,
        autore: "travelops",
        testo: corpo.esito.messaggio,
        scheda: { tipo: "conferma", titolo: "Proposta accettata", testo: corpo.esito.messaggio },
      },
    ]);
    expect(ambiente.rigenerazioni()).toBe(1);
  });

  it("CA-2 rifiutando dalla chat e dal pulsante lo stato salvato è identico e non nasce nessuna versione", async () => {
    const dallaChat = ambienteChat();
    const idChat = preparaS1(dallaChat.cartella);
    const { id } = await nuovaConversazione(dallaChat);
    expect((await decidiDallaChat(dallaChat, id, idChat, { decisione: "rifiuta" })).status).toBe(200);

    const dalPulsante = ambienteChat();
    cartellaDelPulsante = dalPulsante.cartella;
    await premiPulsante(rifiutaAzione, { proposta: String(preparaS1(dalPulsante.cartella)) });

    expect(statoSalvato(dallaChat.cartella).storico.versioni.length).toBe(1);
    expect(statoSalvato(dallaChat.cartella)).toEqual(statoSalvato(dalPulsante.cartella));
    const [messaggio] = (await conversazioneSalvata(dallaChat, id)).messaggi;
    expect(messaggio?.scheda).toMatchObject({ tipo: "conferma", titolo: "Proposta rifiutata" });
  });

  it("una proposta che non c'è più dà un messaggio di errore nella conversazione, come dal pulsante", async () => {
    const ambiente = ambienteChat();
    const { id } = await nuovaConversazione(ambiente);
    const risposta = await decidiDallaChat(ambiente, id, 99, { decisione: "accetta", nome: "Alice" });
    expect(risposta.status).toBe(200);
    const corpo = (await risposta.json()) as { esito: { livello: string; messaggio: string } };
    expect(corpo.esito.livello).toBe("errore");
    expect(corpo.esito.messaggio).toBe("La proposta non è più disponibile: avvia di nuovo lo scenario dalla pagina Demo.");
    const [messaggio] = (await conversazioneSalvata(ambiente, id)).messaggi;
    expect(messaggio?.scheda).toMatchObject({ tipo: "conferma", titolo: "Non è stato possibile applicare la proposta" });
  });

  it("richieste non valide: decisione sconosciuta, nome vuoto o troppo lungo, proposta non numerica", async () => {
    const ambiente = ambienteChat();
    const idProposta = preparaS1(ambiente.cartella);
    const { id } = await nuovaConversazione(ambiente);
    for (const corpo of [{ decisione: "forse" }, { decisione: "accetta", nome: "   " }, { decisione: "accetta", nome: "x".repeat(81) }, { decisione: "accetta", nome: 3 }]) {
      const risposta = await decidiDallaChat(ambiente, id, idProposta, corpo);
      expect(risposta.status).toBe(400);
      expect((await erroreDi(risposta)).codice).toBe("richiesta-non-valida");
    }
    const nonNumerica = await ambiente.gestori.decidiProposta(
      richiesta(`/${id}/proposte/abc`, { decisione: "accetta" }),
      contesto({ id: String(id), proposta: "abc" }),
    );
    expect(nonNumerica.status).toBe(400);
    expect(statoSalvato(ambiente.cartella).storico.versioni.length).toBe(1);
    expect((await conversazioneSalvata(ambiente, id)).messaggi).toEqual([]);
  });
});
