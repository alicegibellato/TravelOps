// @vitest-environment jsdom
/**
 * ST-CHAT-003B (REQ-CHAT-003): una sola chat, il percorso che segue la chat, Sorprendimi senza doppioni.
 * - CA-3 la chat delle pagine del viaggio manda i messaggi al server degli agenti, non al copione finto;
 * - CA-4 quando la chat cambia il profilo il percorso segna i passi compilati e si apre sul primo che manca;
 * - CA-5 stili, cose da evitare e mese di Sorprendimi entrano nel profilo e i passi 2, 4 e 5 li mostrano scelti;
 * - CA-6 con l'assistente finto «Crea la mia bozza» riceve una risposta e chi aspetta la bozza smette di aspettare.
 * Nessuna rete: `fetch` è finta.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BENVENUTO_VIAGGIO, ChatDelViaggio } from "../src/chat/ChatDelViaggio";
import { ChatConSorgente } from "../src/chat/ChatViaggio";
import { MESSAGGIO_CREA_BOZZA } from "../src/chat/PaginaPianifica";
import { codificaEvento, TIPO_CONTENUTO_EVENTI, type EventoChat } from "../src/chat/protocollo";
import { assistenteDaAmbienteConFinto } from "../src/chat/server/assistente";
import { COPIONE_ASSISTENTE_FINTO } from "../src/chat/server/copione-finto";
import { ErroreSorgente, type SorgenteRisposte } from "../src/chat/sorgente";
import { conSceltaSorprendimi } from "../src/componenti/PassiPreferenze";
import { PercorsoPreferenze } from "../src/componenti/PercorsoPreferenze";
import { opzioniPercorso } from "../src/preferenze/opzioni";
import { passoCompilato, primoPassoMancante, stesseScelte } from "../src/preferenze/percorso";
import type { BozzaProfilo, ServizioPreferenze } from "../src/preferenze/tipi";
import { attendi, clic, messaggi, monta, preparaChat, pulsante, scrivi } from "./supporto-chat";
import { chip, destinazioniFinte, MESI_PREFERENZE, preparaPercorso, titoloPasso } from "./supporto-preferenze";

const aggiorna = vi.fn();
const ROUTER = { refresh: aggiorna } as unknown as AppRouterInstance;

preparaChat();
preparaPercorso();

afterEach(() => {
  vi.unstubAllGlobals();
  aggiorna.mockReset();
});

function flusso(eventi: readonly EventoChat[]): Response {
  return new Response(eventi.map(codificaEvento).join(""), { status: 200, headers: { "content-type": TIPO_CONTENUTO_EVENTI } });
}

function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });
}

describe("CA-3 la chat delle pagine del viaggio usa gli agenti", () => {
  it("riprende la conversazione del viaggio e manda il messaggio a /api/chat/conversazioni; un'azione rigenera la pagina", async () => {
    const chiamate: string[] = [];
    const finta = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      chiamate.push(`${init?.method ?? "GET"} ${String(url)}`);
      if (init?.method === "GET") return json({ conversazione: { id: 5, viaggioId: "versione-1", messaggi: [] } });
      return flusso([
        { tipo: "azione", testo: "Ho spostato la visita", viaggio: "versione-1" },
        { tipo: "risposta", numero: 2, risposta: { testo: "Fatto: ho spostato la visita a domenica.", agente: "pianificatore" } },
      ]);
    });
    const vista = monta(
      <AppRouterContext.Provider value={ROUTER}>
        <ChatDelViaggio viaggio="versione-1" conversazione={5} fetch={finta as unknown as typeof fetch} />
      </AppRouterContext.Provider>,
    );
    await attendi();
    expect(vista.textContent).toContain(BENVENUTO_VIAGGIO.testo);

    await scrivi(vista, "Sabato piove: cosa cambio?");
    await attendi();
    expect(chiamate).toEqual(["GET /api/chat/conversazioni/5", "POST /api/chat/conversazioni/5/messaggi"]);
    expect(messaggi(vista).at(-1)?.testo).toBe("Fatto: ho spostato la visita a domenica.");
    expect(aggiorna).toHaveBeenCalledTimes(1);
  });

  it("senza conversazione ne crea una collegata al viaggio della pagina", async () => {
    const corpi: unknown[] = [];
    const finta = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url) === "/api/chat/conversazioni") {
        corpi.push(JSON.parse(String(init?.body)));
        return json({ conversazione: { id: 9, viaggioId: "v-irr", messaggi: [] } }, 201);
      }
      return flusso([{ tipo: "risposta", numero: 2, risposta: { testo: "Eccomi." } }]);
    });
    const vista = monta(<ChatDelViaggio viaggio="v-irr" fetch={finta as unknown as typeof fetch} />);
    await attendi();
    await scrivi(vista, "Ciao");
    await attendi();
    expect(corpi).toEqual([{ viaggio: "v-irr" }]);
    expect(messaggi(vista).at(-1)?.testo).toBe("Eccomi.");
  });

  it("le pagine del viaggio non usano più il copione finto", () => {
    const contenuti = readFileSync(join(process.cwd(), "src/componenti/Contenuti.tsx"), "utf8");
    expect(contenuti).not.toMatch(/copione/);
    expect(contenuti).toContain("ChatDelViaggio");
  });
});

/** Un servizio delle preferenze in memoria: nessun problema se ci sono destinazione e date. */
function preferenzeFinte(): ServizioPreferenze {
  return {
    valida: (bozza) =>
      Promise.resolve([
        ...(bozza.destinazione === undefined ? [{ campo: "destinazione" as const, tipo: "mancante" as const, passo: 1 as const, testo: "Scegli la destinazione." }] : []),
        ...(bozza.date === undefined ? [{ campo: "date" as const, tipo: "mancante" as const, passo: 2 as const, testo: "Indica le date." }] : []),
      ]),
    salva: () => Promise.resolve({ esito: "salvato" as const }),
  };
}

/** Il percorso con un profilo che si può cambiare da fuori, come fa la chat della pagina Pianifica. */
function montaPercorsoConChat(iniziale: BozzaProfilo | null) {
  let cambiaProfilo: (profilo: BozzaProfilo) => void = () => undefined;
  const cambi: BozzaProfilo[] = [];
  function Pagina() {
    const [profilo, setProfilo] = useState<BozzaProfilo | null>(iniziale);
    cambiaProfilo = setProfilo;
    return (
      <PercorsoPreferenze
        preferenze={preferenzeFinte()}
        destinazioni={destinazioniFinte()}
        opzioni={opzioniPercorso()}
        mesi={MESI_PREFERENZE}
        precaricate={[]}
        profiloIniziale={profilo}
        onCambio={(b) => cambi.push(b)}
      />
    );
  }
  const vista = monta(<Pagina />);
  return { vista, cambi, daChat: (profilo: BozzaProfilo) => act(() => cambiaProfilo(profilo)) };
}

const stato = (vista: ParentNode) =>
  [...vista.querySelectorAll<HTMLElement>(".percorso__passi li")].map((li) => `${li.dataset.passo}:${li.dataset.stato}${li.getAttribute("aria-current") === "step" ? "*" : ""}`);

describe("CA-4 il percorso guidato segue la chat", () => {
  it("dopo un'azione della chat con destinazione, date e viaggiatori segna quei passi e apre il primo mancante", async () => {
    const { vista, daChat } = montaPercorsoConChat({});
    await attendi();
    expect(titoloPasso(vista)).toBe("Dove");
    expect(stato(vista)).toEqual(["1:da-compilare*", "2:da-compilare", "3:da-compilare", "4:da-compilare", "5:da-compilare"]);

    daChat({
      destinazione: { tipo: "luogo", nome: "Lago di Garda", riferimento: "istantanea-garda" },
      date: { tipo: "precise", inizio: "2026-06-12", fine: "2026-06-15" },
      viaggiatori: { adulti: 2, bambini: [] },
    });
    await attendi();
    expect(titoloPasso(vista)).toBe("Che viaggio");
    expect(stato(vista)).toEqual(["1:compilato", "2:compilato", "3:compilato", "4:da-compilare*", "5:da-compilare"]);
    // Il passo «Dove» mostra la destinazione scelta in chat.
    clic(vista.querySelector<HTMLButtonElement>(".percorso__passi [data-passo='1'] button") as HTMLButtonElement);
    expect(titoloPasso(vista)).toBe("Dove");
    expect(vista.querySelector(".percorso__scelta-fatta")?.textContent).toBe("Hai scelto: Lago di Garda.");
  });

  it("lo stesso profilo che torna dal salvataggio non sposta il passo", async () => {
    const profilo: BozzaProfilo = { destinazione: { tipo: "sorprendimi" } };
    const { vista, daChat } = montaPercorsoConChat(profilo);
    await attendi();
    expect(titoloPasso(vista)).toBe("Dove");
    daChat({ destinazione: { tipo: "sorprendimi" } });
    await attendi();
    expect(titoloPasso(vista)).toBe("Dove");
  });

  it("passi compilati, primo mancante e confronto delle scelte", () => {
    expect(passoCompilato({ date: { tipo: "precise", inizio: "2026-06-12", fine: "" } }, 2)).toBe(false);
    expect(passoCompilato({ date: { tipo: "mese", mese: "2026-06" }, durata: 3 }, 2)).toBe(true);
    expect(primoPassoMancante({ destinazione: { tipo: "sorprendimi" } })).toBe(2);
    expect(primoPassoMancante({})).toBe(1);
    expect(stesseScelte({ ritmo: "lento", pasti: { cena: true, pranzo: false } }, { pasti: { pranzo: false, cena: true }, ritmo: "lento" })).toBe(true);
    expect(stesseScelte({ ritmo: "lento" }, { ritmo: "intenso" })).toBe(false);
  });
});

describe("CA-5 Sorprendimi senza doppioni", () => {
  it("stili, cose da evitare e mese di Sorprendimi entrano nel profilo e i passi 2, 4 e 5 li mostrano scelti", async () => {
    const { vista, cambi } = montaPercorsoConChat(null);
    await attendi();
    clic(chip(vista, "Cosa ti piace", "Natura"));
    clic(chip(vista, "Cosa ti piace", "Gastronomia"));
    clic(chip(vista, "Cosa preferisci evitare", "Avventura"));
    const mese = vista.querySelector<HTMLSelectElement>(".sorprendimi select");
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set?.call(mese, "2026-08");
      mese?.dispatchEvent(new Event("change", { bubbles: true }));
    });
    clic(pulsante(vista, "Sorprendimi"));
    await attendi();
    clic(pulsante(vista, "Scegli Alfa"));
    await attendi();

    expect(cambi.at(-1)).toEqual({
      destinazione: { tipo: "luogo", nome: "Alfa", riferimento: "prova:alfa" },
      stili: ["natura", "gastronomia"],
      daEvitare: { stili: ["avventura"] },
      durata: 3,
      date: { tipo: "mese", mese: "2026-08" },
    });
    expect(stato(vista).slice(0, 2)).toEqual(["1:compilato*", "2:compilato"]);

    clic(pulsante(vista, "Avanti"));
    await attendi();
    expect(titoloPasso(vista)).toBe("Quando e quanto");
    expect(vista.querySelector<HTMLSelectElement>("select[name='mese']")?.value).toBe("2026-08");

    clic(vista.querySelector<HTMLButtonElement>(".percorso__passi [data-passo='4'] button") as HTMLButtonElement);
    expect(chip(vista, "Che stile di viaggio ti piace?", "Natura").getAttribute("aria-pressed")).toBe("true");
    expect(chip(vista, "Che stile di viaggio ti piace?", "Gastronomia").getAttribute("aria-pressed")).toBe("true");
    expect(chip(vista, "Che stile di viaggio ti piace?", "Cultura").getAttribute("aria-pressed")).toBe("false");

    clic(vista.querySelector<HTMLButtonElement>(".percorso__passi [data-passo='5'] button") as HTMLButtonElement);
    expect(chip(vista, "Cosa vuoi evitare", "Avventura").getAttribute("aria-pressed")).toBe("true");
  });

  it("le aggiunte non tolgono scelte già fatte: stili vuoti restano, cose da evitare si sommano, date precise restano", () => {
    const prima: BozzaProfilo = {
      stili: ["cultura"],
      daEvitare: { stili: ["relax"] },
      date: { tipo: "precise", inizio: "2026-06-12", fine: "2026-06-15" },
      ritmo: "lento",
    };
    expect(conSceltaSorprendimi(prima, { id: "prova:beta", nome: "Beta" }, { stili: [], daEvitare: ["avventura", "relax"], mese: "2026-08" })).toEqual({
      ...prima,
      destinazione: { tipo: "luogo", nome: "Beta", riferimento: "prova:beta" },
      daEvitare: { stili: ["relax", "avventura"] },
    });
  });
});

describe("CA-6 con l'assistente finto «Crea la mia bozza» arriva a una risposta", () => {
  it("l'assistente finto risponde al messaggio dei filtri con il modo per proseguire", async () => {
    const stato = assistenteDaAmbienteConFinto({ TRAVELOPS_ASSISTENTE: "finto" });
    expect(stato.disponibile).toBe(true);
    if (!stato.disponibile) return;
    let risposta = "";
    for await (const evento of stato.assistente.rispondi([{ autore: "viaggiatore", testo: MESSAGGIO_CREA_BOZZA }])) {
      if (evento.tipo === "risposta") risposta = evento.risposta.testo;
    }
    expect(risposta).toContain("Crea la mia bozza");
    expect(risposta).toContain("Preferenze");
  });

  it("finita la risposta, o fallita, la chat lo dice a chi aspetta la bozza", async () => {
    let fallisci = false;
    const sorgente: SorgenteRisposte = {
      benvenuto: () => Promise.resolve({ testo: "Ciao", suggerimenti: [] }),
      rispondi: () => (fallisci ? Promise.reject(new ErroreSorgente("errore")) : Promise.resolve({ testo: "Ecco." })),
    };
    const fine = vi.fn();
    const vista = monta(<ChatConSorgente sorgente={sorgente} onFine={fine} />);
    await attendi();
    await scrivi(vista, "Crea la mia bozza");
    await attendi();
    expect(fine).toHaveBeenCalledTimes(1);
    fallisci = true;
    await scrivi(vista, "Ancora");
    await attendi();
    expect(fine).toHaveBeenCalledTimes(2);
  });
});

describe("TB-CHAT-019 l'assistente finto non dice di aver capito ciò che non mette nei filtri", () => {
  it("le risposte non riportano destinazione, mese o viaggiatori come capiti", () => {
    const testi = [...COPIONE_ASSISTENTE_FINTO.risposte.map((r) => r.risposta.testo), COPIONE_ASSISTENTE_FINTO.altrimenti.testo];
    for (const testo of testi) expect(testo).not.toMatch(/giugno|coppia|Lago di Garda|ho capito|ho segnato/i);
  });
});
