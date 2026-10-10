/**
 * ST-CHAT-001C, proposte degli agenti per un viaggio nato in chat: lo strumento salva la proposta nel viaggio della
 * conversazione (archivio sulla base dati); Accetta dalla chat crea la stessa versione che crea il pulsante della
 * pagina Demo per la stessa proposta (stesso motore, stesso autore, stesso orologio simulato); Rifiuta non crea
 * versioni. La pagina Demo non cambia.
 */
import { creaStorico, esportaStorico, proponiRipianificazione, versioneCorrente } from "@travelops/engine";
import { describe, expect, it } from "vitest";
import { leggiConversazione, leggiStoricoDelViaggio, testoStoricoDelViaggio } from "../src/basedati";
import { creaArchivioConversazione } from "../src/chat/server/archivio-viaggio";
import { catalogoDiRiferimento, sorgenteDiRiferimento, trovaScenario } from "../src/dati/scenari";
import { caricaViaggioScelto } from "../src/dati/viaggi";
import { usaBaseDati } from "../src/stato/avvio";
import { accettaProposta, avviaScenario, impostaOrologio } from "../src/stato/operazioni";
import { ambienteChat, contesto, nuovaConversazione, richiesta } from "./supporto-chat001a";
import { storicoNelDatabase } from "./supporto-stato";

/** Il viaggio dello scenario S1 confermato in chat (versione 1) e la proposta del motore per il suo imprevisto. */
async function viaggioS1InChat(cartella: string, conversazione: number) {
  const scenario = trovaScenario("S1");
  const dati = scenario === null ? null : caricaViaggioScelto(scenario.chiaveViaggio);
  if (scenario === null || dati === null || !dati.ok) throw new Error("scenario S1 non disponibile");
  const creato = creaStorico(dati.viaggio);
  if (!creato.ok) throw new Error(creato.errore.messaggio);
  const archivio = creaArchivioConversazione(cartella, conversazione);
  await archivio.salvaScheda({ titolo: dati.viaggio.titolo, stato: "confermato", destinazione: "Lago di Garda", istantaneaId: null });
  await archivio.salvaStorico(creato.storico);
  const proposta = proponiRipianificazione(dati.viaggio, 1, catalogoDiRiferimento(), sorgenteDiRiferimento(), scenario.imprevisto);
  const numero = await archivio.salvaProposta("ripianificazione", proposta);
  return { numero, viaggio: usaBaseDati(cartella, (db) => leggiConversazione(db, conversazione)?.viaggioId) as string };
}

async function decidi(ambiente: ReturnType<typeof ambienteChat>, conversazione: number, proposta: number, corpo: unknown) {
  const risposta = await ambiente.gestori.decidiProposta(
    richiesta(`/${conversazione}/proposte/${proposta}`, corpo),
    contesto({ id: String(conversazione), proposta: String(proposta) }),
  );
  expect(risposta.status).toBe(200);
  return (await risposta.json()) as { esito: { livello: string; messaggio: string }; messaggio: { scheda?: { tipo: string; titolo: string } } };
}

describe("ST-CHAT-001C le proposte degli agenti per un viaggio nato in chat", () => {
  it("la proposta si salva nel viaggio della conversazione; Accetta crea la stessa versione del pulsante della Demo", async () => {
    const chat = ambienteChat();
    const orologio = impostaOrologio(chat.cartella, "2026-06-13", "07:30");
    if (!orologio.ok) throw new Error(orologio.messaggio);
    const demoPrima = storicoNelDatabase(chat.cartella);
    const { id } = await nuovaConversazione(chat);
    const { numero, viaggio } = await viaggioS1InChat(chat.cartella, id);
    expect(viaggio).toBe(`chat-${id}`);
    expect(numero).toBe(1);

    const corpo = await decidi(chat, id, numero, { decisione: "accetta", nome: "Alice" });
    expect(corpo.esito).toEqual({ livello: "successo", messaggio: "Proposta accettata da Alice il 2026-06-13 alle 07:30: creata la versione 2." });
    expect(corpo.messaggio.scheda).toMatchObject({ tipo: "conferma", titolo: "Proposta accettata" });

    // Dal pulsante della Demo, con la stessa proposta del motore e lo stesso orologio.
    const pulsante = ambienteChat();
    const avvio = avviaScenario(pulsante.cartella, "S1");
    if (!avvio.ok) throw new Error(avvio.messaggio);
    impostaOrologio(pulsante.cartella, "2026-06-13", "07:30");
    const accettata = accettaProposta(pulsante.cartella, avvio.proposta.id, "Alice");
    if (!accettata.ok) throw new Error(accettata.messaggio);

    const dallaChat = usaBaseDati(chat.cartella, (db) => leggiStoricoDelViaggio(db, viaggio));
    if (dallaChat?.ok !== true) throw new Error("storico del viaggio nato in chat non valido");
    expect(versioneCorrente(dallaChat.storico).numero).toBe(2);
    expect(esportaStorico(dallaChat.storico)).toBe(esportaStorico(accettata.stato.storico));
    // La pagina Demo della cartella della chat non è cambiata.
    expect(storicoNelDatabase(chat.cartella)).toBe(demoPrima);

    // La stessa proposta di nuovo: il motore la rifiuta come superata, lo storico resta alla versione 2.
    const ancora = await decidi(chat, id, numero, { decisione: "accetta", nome: "Alice" });
    expect(ancora.esito.livello).toBe("errore");
    expect(usaBaseDati(chat.cartella, (db) => leggiStoricoDelViaggio(db, viaggio))).toMatchObject({ ok: true });
  });

  it("Rifiuta non crea versioni; una proposta che non c'è risponde con un messaggio semplice", async () => {
    const chat = ambienteChat();
    const { id } = await nuovaConversazione(chat);
    const { numero, viaggio } = await viaggioS1InChat(chat.cartella, id);
    const prima = usaBaseDati(chat.cartella, (db) => testoStoricoDelViaggio(db, viaggio));

    const rifiutata = await decidi(chat, id, numero, { decisione: "rifiuta" });
    expect(rifiutata.esito).toEqual({ livello: "successo", messaggio: "Proposta rifiutata: nessuna nuova versione, l'itinerario resta alla versione 1." });
    expect(usaBaseDati(chat.cartella, (db) => testoStoricoDelViaggio(db, viaggio))).toBe(prima);

    const assente = await decidi(chat, id, 99, { decisione: "accetta" });
    expect(assente.esito.livello).toBe("errore");
    expect(assente.esito.messaggio).toMatch(/non è più disponibile/);
  });
});
