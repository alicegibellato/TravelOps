// @vitest-environment jsdom
/**
 * ST-QA-FIX-001 (collaudo TO-004, testbook TB-PREF-005 e TB-CHAT-003): senza chiave «Crea la mia bozza» della pagina
 * Pianifica non resta su «Preparo la bozza…». Senza assistente della chat la bozza la crea il motore (il servizio del
 * percorso, come nella pagina Preferenze) e si apre la sua pagina; con la chat, lo scheletro si spegne quando la chat
 * finisce, anche con un errore. Nessuna rete.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaginaPianifica, type PercorsoPianifica } from "../src/chat/PaginaPianifica";
import { opzioniPercorso } from "../src/preferenze/opzioni";
import { creaServizioPreferenze } from "../src/preferenze/servizio";
import { conBaseDati } from "../src/basedati";
import { attendi, monta, preparaChat } from "./supporto-chat";
import { compilaProfilo, destinazioniFinte, MESI_PREFERENZE, precaricateDeiProfili, preparaPercorso, profiliDiRiferimento } from "./supporto-preferenze";
import { nuovaCartella } from "./supporto-stato";

preparaChat();
preparaPercorso();

const naviga = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: naviga }) }));

function percorso(cartella: string, creaBozza: PercorsoPianifica["preferenze"]["creaBozza"]): PercorsoPianifica {
  const servizio = creaServizioPreferenze((lavoro) => conBaseDati(cartella, lavoro));
  return {
    preferenze: { ...servizio, ...(creaBozza === undefined ? {} : { creaBozza }) },
    destinazioni: destinazioniFinte(),
    opzioni: opzioniPercorso(),
    mesi: MESI_PREFERENZE,
    precaricate: precaricateDeiProfili(),
    salvaInCorso: async () => undefined,
  };
}

// Ogni test è un viaggiatore nuovo: il passo del percorso salvato in sessionStorage non passa al test dopo.
beforeEach(() => window.sessionStorage.clear());

const scheletro = (vista: HTMLElement) => vista.textContent?.includes("Preparo la bozza…") ?? false;

describe("ST-QA-FIX-001 «Crea la mia bozza» senza chiave", () => {
  it("senza chat la bozza la crea il motore e si apre la sua pagina; nessun messaggio alla chat", async () => {
    const [pr1] = profiliDiRiferimento();
    if (pr1 === undefined) throw new Error("manca PR-1");
    const chiamateChat = vi.fn();
    globalThis.fetch = chiamateChat as unknown as typeof fetch;
    const creaBozza = vi.fn(async () => ({ esito: "creata" as const, indirizzo: "/bozza/viaggio-1" }));
    const apri = vi.fn();
    const vista = monta(
      <PaginaPianifica conversazione={null} viaggio={null} bozza={null} chatDisponibile={false} percorso={{ ...percorso(nuovaCartella(), creaBozza), onBozzaCreata: apri }} />,
    );
    await compilaProfilo(vista, pr1.profilo);
    await attendi();
    expect(creaBozza).toHaveBeenCalledTimes(1);
    expect(apri).toHaveBeenCalledWith("/bozza/viaggio-1");
    // Nessuna richiesta alla chat: il messaggio «Ho compilato le preferenze…» non parte.
    expect(chiamateChat.mock.calls.filter(([url]) => String(url).includes("/messaggi"))).toEqual([]);
  });

  it("se il motore non riesce a creare la bozza, lo scheletro si spegne e il percorso dice cosa è successo", async () => {
    const [pr1] = profiliDiRiferimento();
    if (pr1 === undefined) throw new Error("manca PR-1");
    const creaBozza = vi.fn(async () => ({ esito: "errore" as const, messaggio: "Al momento non riesco a preparare la bozza. Riprova tra un attimo." }));
    const vista = monta(<PaginaPianifica conversazione={null} viaggio={null} bozza={null} chatDisponibile={false} percorso={percorso(nuovaCartella(), creaBozza)} />);
    await compilaProfilo(vista, pr1.profilo);
    await attendi();
    expect(scheletro(vista)).toBe(false);
    expect(vista.textContent).toContain("Al momento non riesco a preparare la bozza.");
  });

});
