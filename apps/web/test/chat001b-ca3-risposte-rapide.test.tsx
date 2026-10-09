// @vitest-environment jsdom
/**
 * REQ-CHAT-001 CA-3 (ST-CHAT-001B): le risposte rapide inviano il testo del chip. Benvenuto con tre suggerimenti,
 * "sta scrivendo" mentre la sorgente prepara la risposta, chip sotto le risposte.
 */
import { describe, expect, it } from "vitest";
import { ChatConSorgente, ChatViaggio } from "../src/chat/ChatViaggio";
import { creaSorgenteFinta, type SorgenteRisposte } from "../src/chat/sorgente";
import { attendi, clic, copioneDiRiferimento, messaggi, monta, preparaChat, pulsante, scrivi } from "./supporto-chat";

preparaChat();

/** Una sorgente che ricorda i testi ricevuti e risponde con il copione. */
function sorgenteConRegistro(ritardoMs = 0): { sorgente: SorgenteRisposte; ricevuti: string[] } {
  const interna = creaSorgenteFinta({ copione: copioneDiRiferimento(), ritardoMs });
  const ricevuti: string[] = [];
  return {
    ricevuti,
    sorgente: {
      benvenuto: () => interna.benvenuto(),
      rispondi: (testo, storia) => {
        ricevuti.push(testo);
        return interna.rispondi(testo, storia);
      },
    },
  };
}

describe("CA-3 le risposte rapide inviano il testo del chip", () => {
  it("CA-3 la chat vuota dà il benvenuto con tre suggerimenti da toccare", async () => {
    const vista = monta(<ChatViaggio copione={copioneDiRiferimento()} ritardoMs={0} />);
    await attendi();
    expect(vista.querySelector(".ui-chat__benvenuto")?.textContent).toContain("Sono TravelOps");
    const suggerimenti = [...vista.querySelectorAll(".ui-chat__benvenuto .ui-chip")].map((c) => c.textContent);
    expect(suggerimenti).toEqual(["Voglio un weekend sul lago", "Sabato piove: cosa cambio?", "Mostrami le mie preferenze"]);
  });

  it("CA-3 toccare un suggerimento invia esattamente il suo testo, che compare come messaggio del viaggiatore", async () => {
    const { sorgente, ricevuti } = sorgenteConRegistro();
    const vista = monta(<ChatConSorgente sorgente={sorgente} />);
    await attendi();
    clic(pulsante(vista, "Mostrami le mie preferenze"));
    await attendi();
    expect(ricevuti).toEqual(["Mostrami le mie preferenze"]);
    expect(messaggi(vista)[0]).toEqual({ autore: "viaggiatore", testo: "Mostrami le mie preferenze" });
    expect(vista.querySelector(".ui-scheda-chat--preferenze")).not.toBeNull();
  });

  it("CA-3 le risposte rapide sotto una risposta inviano il loro testo e spariscono dopo l'invio", async () => {
    const { sorgente, ricevuti } = sorgenteConRegistro();
    const vista = monta(<ChatConSorgente sorgente={sorgente} />);
    await attendi();
    await scrivi(vista, "Vorrei vedere le preferenze");
    const rapide = [...vista.querySelectorAll(".ui-chat__rapide[aria-label='Risposte rapide'] .ui-chip")].map((c) => c.textContent);
    expect(rapide).toEqual(["Voglio un weekend sul lago", "Sabato piove: cosa cambio?"]);
    clic(pulsante(vista, "Voglio un weekend sul lago"));
    await attendi();
    expect(ricevuti).toEqual(["Vorrei vedere le preferenze", "Voglio un weekend sul lago"]);
    expect(messaggi(vista).filter((m) => m.autore === "viaggiatore").map((m) => m.testo)).toEqual(["Vorrei vedere le preferenze", "Voglio un weekend sul lago"]);
    expect(vista.querySelector(".ui-scheda-chat--bozza")).not.toBeNull();
  });

  it("CA-3 il messaggio scritto a mano parte con Invio, il campo si svuota e un testo vuoto non parte", async () => {
    const { sorgente, ricevuti } = sorgenteConRegistro();
    const vista = monta(<ChatConSorgente sorgente={sorgente} />);
    await attendi();
    await scrivi(vista, "   ");
    expect(ricevuti).toEqual([]);
    await scrivi(vista, "Ciao");
    expect(ricevuti).toEqual(["Ciao"]);
    expect(vista.querySelector<HTMLInputElement>("input[name='messaggio']")?.value).toBe("");
    // Nessuna parola riconosciuta: TravelOps non finge, propone le tre strade possibili.
    expect(messaggi(vista).at(-1)?.testo).toContain("Non ho capito bene");
    expect([...vista.querySelectorAll(".ui-chat__rapide[aria-label='Risposte rapide'] .ui-chip")]).toHaveLength(3);
  });

  it("CA-3 mentre TravelOps risponde si vede «sta scrivendo» e non si può inviare un secondo messaggio", async () => {
    const { sorgente, ricevuti } = sorgenteConRegistro(60);
    const vista = monta(<ChatConSorgente sorgente={sorgente} />);
    await attendi();
    clic(pulsante(vista, "Mostrami le mie preferenze"));
    await attendi(5);
    const scrive = vista.querySelector(".ui-chat__scrive");
    expect(scrive?.textContent).toContain("TravelOps sta scrivendo");
    expect(scrive?.querySelector("[role='status']")).not.toBeNull();
    expect(vista.querySelector<HTMLButtonElement>("button[aria-label='Invia']")?.disabled).toBe(true);
    await scrivi(vista, "Ancora una cosa");
    expect(ricevuti).toEqual(["Mostrami le mie preferenze"]);
    await attendi(120);
    expect(vista.querySelector(".ui-chat__scrive")).toBeNull();
  });
});
