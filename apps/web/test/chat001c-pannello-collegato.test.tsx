// @vitest-environment jsdom
/**
 * ST-CHAT-001C, la chat collegata nel browser: la sorgente del server legge lo streaming (testo, passi, azioni,
 * testo corretto, risposta), il pannello mostra la risposta mentre si forma e ogni azione arriva a chi aggiorna la
 * vista accanto. Accetta e Rifiuta di una proposta salvata passano dal server. Nessuna rete: `fetch` è finta.
 */
import { describe, expect, it, vi } from "vitest";
import { ChatConSorgente } from "../src/chat/ChatViaggio";
import { VistaBozzaDalVivo } from "../src/chat/PaginaPianifica";
import { TestoMessaggio } from "../src/ui/PannelloChat";
import { codificaEvento, TIPO_CONTENUTO_EVENTI, type EventoChat } from "../src/chat/protocollo";
import { ErroreSorgente, type AscoltoRisposta, type SorgenteRisposte } from "../src/chat/sorgente";
import { creaSorgenteServer } from "../src/chat/sorgente-server";
import type { RispostaChat } from "../src/chat/tipi";
import { attendi, clic, messaggi, monta, preparaChat, pulsante, scrivi } from "./supporto-chat";

preparaChat();

const BENVENUTO = { testo: "Raccontami il viaggio.", suggerimenti: ["Lago", "Città", "Montagna"] };

function flusso(eventi: readonly EventoChat[]): Response {
  const testo = eventi.map(codificaEvento).join("");
  return new Response(testo, { status: 200, headers: { "content-type": TIPO_CONTENUTO_EVENTI } });
}

function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });
}

describe("ST-CHAT-001C la sorgente del server", () => {
  it("crea la conversazione alla prima domanda, legge lo streaming e passa testo, passi e azioni a chi ascolta", async () => {
    const chiamate: { url: string; corpo: unknown }[] = [];
    const finta = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      chiamate.push({ url: String(url), corpo: init?.body === undefined ? undefined : JSON.parse(String(init.body)) });
      if (String(url) === "/api/chat/conversazioni") return json({ conversazione: { id: 7, viaggioId: null, messaggi: [] } }, 201);
      return flusso([
        { tipo: "agente", agente: "consulente", titolo: "Consulente" },
        { tipo: "passo", testo: "Aggiorno le preferenze…" },
        { tipo: "testo", testo: "Che bello, " },
        { tipo: "azione", testo: "Preferenze aggiornate", viaggio: "chat-7" },
        { tipo: "testo", testo: "il Garda!" },
        { tipo: "testo_corretto", testo: "Che bello, il Lago di Garda!" },
        { tipo: "risposta", numero: 2, risposta: { testo: "Che bello, il Lago di Garda!", agente: "consulente" } },
      ]);
    });
    const create: number[] = [];
    const sorgente = creaSorgenteServer({ benvenuto: BENVENUTO, conversazioneCreata: (id) => create.push(id), fetch: finta as unknown as typeof fetch });
    const visti: string[] = [];
    const ascolta: AscoltoRisposta = {
      testo: (t) => visti.push(`testo:${t}`),
      passo: (t) => visti.push(`passo:${t}`),
      azione: (t, v) => visti.push(`azione:${t}:${v}`),
    };

    const risposta = await sorgente.rispondi("Vorrei andare sul Garda", [], ascolta);
    expect(risposta).toEqual({ testo: "Che bello, il Lago di Garda!", agente: "consulente" });
    expect(create).toEqual([7]);
    expect(sorgente.conversazione()).toBe(7);
    expect(chiamate).toEqual([
      { url: "/api/chat/conversazioni", corpo: { viaggio: null } },
      { url: "/api/chat/conversazioni/7/messaggi", corpo: { testo: "Vorrei andare sul Garda" } },
    ]);
    expect(visti).toEqual([
      "passo:Aggiorno le preferenze…",
      "testo:Che bello, ",
      "azione:Preferenze aggiornate:chat-7",
      "testo:Che bello, il Garda!",
      "testo:Che bello, il Lago di Garda!",
    ]);

    // La seconda domanda usa la stessa conversazione.
    await sorgente.rispondi("In coppia", []);
    expect(chiamate.at(-1)?.url).toBe("/api/chat/conversazioni/7/messaggi");
  });

  it("l'errore dello streaming diventa l'errore della sorgente: «non-disponibile» spegne la chat", async () => {
    const finta = async () => flusso([{ tipo: "errore", codice: "non-disponibile", messaggio: "L'assistente AI non è disponibile in questo momento." }]);
    const sorgente = creaSorgenteServer({ benvenuto: BENVENUTO, conversazione: 3, fetch: finta as unknown as typeof fetch });
    await expect(sorgente.rispondi("Ciao", [])).rejects.toMatchObject({ codice: "non-disponibile" });
    await expect(sorgente.rispondi("Ciao", [])).rejects.toBeInstanceOf(ErroreSorgente);
  });

  it("Accetta passa dal server: l'esito torna con la scheda di conferma e dice se il viaggio è cambiato", async () => {
    const chiamate: { url: string; corpo: unknown }[] = [];
    const finta = async (url: string | URL | Request, init?: RequestInit) => {
      chiamate.push({ url: String(url), corpo: JSON.parse(String(init?.body)) });
      return json({
        esito: { livello: "successo", messaggio: "Proposta accettata: creata la versione 2." },
        messaggio: { numero: 5, autore: "travelops", testo: "Proposta accettata: creata la versione 2.", scheda: { tipo: "conferma", titolo: "Proposta accettata", testo: "Creata la versione 2." } },
      });
    };
    const sorgente = creaSorgenteServer({ benvenuto: BENVENUTO, conversazione: 4, fetch: finta as unknown as typeof fetch });
    const esito = await sorgente.decidi?.(2, "accetta");
    expect(chiamate).toEqual([{ url: "/api/chat/conversazioni/4/proposte/2", corpo: { decisione: "accetta" } }]);
    expect(esito).toMatchObject({ cambiato: true, scheda: { tipo: "conferma", titolo: "Proposta accettata" } });
  });
});

/** Una sorgente che risponde come gli agenti: passo, testo a pezzi, azione, poi la risposta. */
function sorgenteConAgenti(risposta: RispostaChat, decidi?: SorgenteRisposte["decidi"]): SorgenteRisposte & { sblocca: () => void } {
  let sblocca: () => void = () => undefined;
  return {
    sblocca: () => sblocca(),
    benvenuto: () => Promise.resolve(BENVENUTO),
    async rispondi(_testo, _storia, ascolta) {
      ascolta?.passo?.("Preparo la bozza…");
      ascolta?.testo?.("Ecco la bozza");
      await new Promise<void>((fatto) => {
        sblocca = fatto;
      });
      ascolta?.azione?.("Bozza creata", "chat-1");
      return risposta;
    },
    ...(decidi === undefined ? {} : { decidi }),
  };
}

describe("ST-CHAT-001C il pannello collegato agli agenti", () => {
  it("mostra la risposta mentre si forma e il passo in corso; ogni azione arriva a chi aggiorna la vista accanto", async () => {
    const sorgente = sorgenteConAgenti({ testo: "Ecco la bozza: 4 giorni sul Garda." });
    const azioni: string[] = [];
    const vista = monta(<ChatConSorgente sorgente={sorgente} onAzione={(testo, viaggio) => azioni.push(`${testo}:${viaggio}`)} />);
    await attendi();
    await scrivi(vista, "Crea la bozza");

    expect(vista.querySelector(".ui-chat__passo")?.textContent).toBe("Preparo la bozza…");
    expect(vista.querySelector(".ui-chat__in-corso")?.textContent).toBe("Ecco la bozza");
    sorgente.sblocca();
    await attendi();
    expect(azioni).toEqual(["Bozza creata:chat-1"]);
    expect(vista.querySelector(".ui-chat__passo")).toBeNull();
    expect(messaggi(vista).at(-1)).toEqual({ autore: "travelops", testo: "Ecco la bozza: 4 giorni sul Garda." });
  });

  it("Accetta di una proposta salvata la decide sul server: conferma senza Annulla e la vista accanto si aggiorna", async () => {
    const decidi = vi.fn(async () => ({
      testo: "Proposta accettata: creata la versione 2.",
      scheda: { tipo: "conferma" as const, titolo: "Proposta accettata", testo: "Creata la versione 2." },
      cambiato: true,
    }));
    const sorgente = sorgenteConAgenti(
      {
        testo: "Ti propongo di spostare il trekking.",
        scheda: {
          tipo: "proposta",
          titolo: "Proposta per l'imprevisto",
          livello: "minimo",
          cambi: [{ tipo: "rimosso", testo: "09:00 Trekking sul Sentiero del Ponale" }],
          propostaId: 3,
          conferma: { titolo: "Proposta accettata", testo: "Ho aggiornato l'itinerario." },
          rifiuto: "Va bene, lascio l'itinerario com'è.",
        },
      },
      decidi,
    );
    const azioni: string[] = [];
    const vista = monta(<ChatConSorgente sorgente={sorgente} onAzione={(testo) => azioni.push(testo)} />);
    await attendi();
    await scrivi(vista, "Piove");
    sorgente.sblocca();
    await attendi();

    clic(pulsante(vista, "Accetta"));
    await attendi();
    expect(decidi).toHaveBeenCalledWith(3, "accetta");
    expect(vista.textContent).toContain("Accettata");
    expect(vista.textContent).toContain("Proposta accettata");
    expect([...vista.querySelectorAll("button")].map((b) => b.textContent?.trim())).not.toContain("Annulla");
    expect(azioni).toEqual(["Bozza creata", "Proposta accettata: creata la versione 2."]);
  });
});

describe("ST-CHAT-001C la bozza accanto alla chat", () => {
  it("senza viaggio invita a raccontare il viaggio; con la bozza accende le attività cambiate e lo annuncia", () => {
    const vuota = monta(<VistaBozzaDalVivo bozza={null} ultimaAzione={null} />);
    expect(vuota.textContent).toContain("appena me lo racconti in chat");

    const vista = monta(
      <VistaBozzaDalVivo
        ultimaAzione="Bozza modificata"
        bozza={{
          viaggioId: "chat-1",
          titolo: "4 giorni sul Garda",
          destinazione: "Lago di Garda",
          etichetta: "Bozza 2",
          confermato: false,
          preferenze: [{ etichetta: "Ritmo", valore: "Lento" }],
          cambiate: 1,
          giorni: [
            {
              data: "2026-06-13",
              titolo: "sabato 13 giugno",
              voci: [
                { id: "e1", orario: "09:30–11:30", testo: "Visita al MAG", cambiata: true, spostamento: false },
                { id: "e2", orario: "12:00–13:30", testo: "Pranzo", cambiata: false, spostamento: false },
              ],
            },
          ],
        }}
      />,
    );
    expect(vista.querySelector("[role='status']")?.textContent).toBe("Bozza modificata: 1 attività cambiata, evidenziate qui sotto.");
    const cambiate = [...vista.querySelectorAll(".pianifica-bozza__voce--cambiata")].map((li) => li.textContent);
    expect(cambiate).toEqual(["09:30–11:30 Visita al MAG (cambiata)"]);
    expect(vista.querySelector("#giorno-2026-06-13 h3")?.textContent).toBe("sabato 13 giugno");
    expect(vista.textContent).toContain("Bozza 2");
  });
});

describe("ST-CHAT-001C il testo delle risposte del modello", () => {
  it("il grassetto **così** diventa grassetto, senza asterischi e senza interpretare HTML", () => {
    const vista = monta(<TestoMessaggio testo={"- **12 giugno:** arrivo\n- <b>13</b> giugno"} />);
    expect(vista.textContent).toBe("- 12 giugno: arrivo\n- <b>13</b> giugno");
    expect([...vista.querySelectorAll("strong")].map((e) => e.textContent)).toEqual(["12 giugno:"]);
    expect(vista.querySelector("b")).toBeNull();
  });
});
