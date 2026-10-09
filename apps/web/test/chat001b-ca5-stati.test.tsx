// @vitest-environment jsdom
/**
 * REQ-CHAT-001 CA-5 (ST-CHAT-001B): gli stati vuoto, caricamento, errore e AI non disponibile sono tutti gestiti,
 * con la chat vera (sorgente che fallisce) e con il pannello da solo.
 */
import { describe, expect, it } from "vitest";
import { ChatConSorgente } from "../src/chat/ChatViaggio";
import { ErroreSorgente, type SorgenteRisposte } from "../src/chat/sorgente";
import { PannelloChat } from "../src/ui/PannelloChat";
import { attendi, clic, messaggi, monta, preparaChat, pulsante, scrivi } from "./supporto-chat";

preparaChat();

const BENVENUTO = { testo: "Ciao!", suggerimenti: ["Uno", "Due", "Tre"] };
const RISPOSTA = { testo: "Eccomi.", risposteRapide: [] };

describe("CA-5 stati vuoto, caricamento, errore e AI non disponibile", () => {
  it("CA-5 stato vuoto: senza messaggi né benvenuto il pannello dice cosa fare", () => {
    const vista = monta(<PannelloChat messaggi={[]} onInvia={() => undefined} />);
    expect(vista.querySelector(".ui-chat__vuoto")?.textContent).toContain("scrivimi qui sotto");
    expect(vista.querySelector("input[name='messaggio']")).not.toBeNull();
  });

  it("CA-5 caricamento: mentre la chat si prepara si vede lo scheletro, annunciato come «Sto aprendo la chat…»", async () => {
    let apri: () => void = () => undefined;
    const sorgente: SorgenteRisposte = {
      benvenuto: () => new Promise((risolvi) => (apri = () => risolvi(BENVENUTO))),
      rispondi: () => Promise.resolve(RISPOSTA),
    };
    const vista = monta(<ChatConSorgente sorgente={sorgente} />);
    expect(vista.querySelector(".ui-scheletro[aria-busy='true']")?.textContent).toContain("Sto aprendo la chat…");
    expect(vista.querySelector(".ui-chat__benvenuto")).toBeNull();
    apri();
    await attendi();
    expect(vista.querySelector(".ui-scheletro")).toBeNull();
    expect(vista.querySelector(".ui-chat__benvenuto")).not.toBeNull();
  });

  it("CA-5 errore: se una risposta fallisce compare un avviso con «Riprova», che rimanda lo stesso messaggio", async () => {
    let tentativi = 0;
    const ricevuti: string[] = [];
    const sorgente: SorgenteRisposte = {
      benvenuto: () => Promise.resolve(BENVENUTO),
      rispondi: (testo) => {
        ricevuti.push(testo);
        tentativi += 1;
        return tentativi === 1 ? Promise.reject(new ErroreSorgente("errore")) : Promise.resolve(RISPOSTA);
      },
    };
    const vista = monta(<ChatConSorgente sorgente={sorgente} />);
    await attendi();
    clic(pulsante(vista, "Uno"));
    await attendi();
    const avviso = vista.querySelector(".ui-avviso--errore");
    expect(avviso?.getAttribute("role")).toBe("alert");
    expect(avviso?.textContent).toContain("Non sono riuscito a rispondere");
    expect(vista.querySelector(".ui-chat__scrive")).toBeNull();
    // Il campo resta attivo: l'errore di una richiesta non spegne la chat.
    expect(vista.querySelector<HTMLInputElement>("input[name='messaggio']")?.disabled).toBe(false);

    clic(pulsante(vista, "Riprova"));
    await attendi();
    expect(ricevuti).toEqual(["Uno", "Uno"]);
    expect(vista.querySelector(".ui-avviso--errore")).toBeNull();
    // Il messaggio del viaggiatore non è duplicato dal nuovo tentativo.
    expect(messaggi(vista).map((m) => m.testo)).toEqual(["Uno", "Eccomi."]);
  });

  it("CA-5 AI non disponibile: la chat si spegne con un messaggio gentile e i pulsanti restano l'alternativa", async () => {
    const sorgente: SorgenteRisposte = {
      benvenuto: () => Promise.resolve(BENVENUTO),
      rispondi: () => Promise.reject(new ErroreSorgente("non-disponibile")),
    };
    const vista = monta(<ChatConSorgente sorgente={sorgente} />);
    await attendi();
    await scrivi(vista, "Ciao");
    expect(vista.querySelector(".ui-chat__non-disponibile")?.textContent).toContain("puoi fare tutto anche con i pulsanti");
    expect(vista.querySelector<HTMLInputElement>("input[name='messaggio']")?.disabled).toBe(true);
    expect(vista.querySelector<HTMLButtonElement>("button[aria-label='Invia']")?.disabled).toBe(true);
    expect(vista.querySelector(".ui-avviso--errore")).toBeNull();
    for (const chip of vista.querySelectorAll<HTMLButtonElement>(".ui-chip")) expect(chip.disabled).toBe(true);
  });

  it("CA-5 AI non disponibile fin dall'inizio: se anche il benvenuto non arriva, la chat è spenta e senza scheletro", async () => {
    const sorgente: SorgenteRisposte = {
      benvenuto: () => Promise.reject(new ErroreSorgente("non-disponibile")),
      rispondi: () => Promise.resolve(RISPOSTA),
    };
    const vista = monta(<ChatConSorgente sorgente={sorgente} />);
    await attendi();
    expect(vista.querySelector(".ui-scheletro")).toBeNull();
    expect(vista.querySelector(".ui-chat__non-disponibile")).not.toBeNull();
    expect(vista.querySelector<HTMLInputElement>("input[name='messaggio']")?.disabled).toBe(true);
  });

  it("CA-5 gli stati hanno ruoli per i lettori di schermo: log della conversazione, avviso, stato", () => {
    const vista = monta(
      <PannelloChat messaggi={[{ autore: "viaggiatore", testo: "Ciao" }]} inScrittura errore={{ testo: "Riprova tra un attimo." }} disponibile={false} />,
    );
    expect(vista.querySelector("[role='log'][aria-live='polite']")?.getAttribute("aria-label")).toBe("Conversazione");
    expect(vista.querySelector("[role='alert']")).not.toBeNull();
    expect([...vista.querySelectorAll("[role='status']")].length).toBeGreaterThanOrEqual(2);
  });
});
