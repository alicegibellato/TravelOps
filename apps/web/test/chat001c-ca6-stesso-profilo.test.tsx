// @vitest-environment jsdom
/**
 * ST-CHAT-001C, CA-6 di REQ-CHAT-001 (e CA-6 di REQ-PREF-001): filtri e chat stanno sullo stesso schermo (pagina
 * Pianifica) e compilano lo stesso profilo. Iniziando dai filtri e finendo in chat, o viceversa, si ottiene lo stesso
 * profilo: il percorso guidato salva nel profilo condiviso (`profilo-preferenze`), gli agenti della chat lo leggono e
 * lo aggiornano (anche nel viaggio nato in chat), e il percorso riprende il profilo cambiato dalla chat.
 */
import { join } from "node:path";
import { caricaConversazioneRegistrata, creaClienteFinto } from "@travelops/agents";
import { describe, expect, it, vi } from "vitest";
import { leggiProfilo as leggiProfiloDelViaggio } from "../src/basedati";
import { MESSAGGIO_CREA_BOZZA } from "../src/chat/PaginaPianifica";
import { assistenteDaAgenti } from "../src/chat/server/agenti";
import { PercorsoPreferenze } from "../src/componenti/PercorsoPreferenze";
import { sorgenteDestinazioniLocale } from "../src/destinazioni/sorgente";
import { opzioniPercorso } from "../src/preferenze/opzioni";
import { leggiProfilo, salvaProfilo } from "../src/preferenze/profilo";
import { creaServizioPreferenze } from "../src/preferenze/servizio";
import type { BozzaProfilo } from "../src/preferenze/tipi";
import { usaBaseDati } from "../src/stato/avvio";
import { attendi, monta, preparaChat } from "./supporto-chat";
import { ambienteChat, disponibile, inviaELeggi, nuovaConversazione } from "./supporto-chat001a";
import { compilaProfilo, destinazioniFinte, MESI_PREFERENZE, montaPercorso, precaricateDeiProfili, preparaPercorso, profiliDiRiferimento } from "./supporto-preferenze";
import { act } from "react";
import { createRoot } from "react-dom/client";

preparaChat();
preparaPercorso();

const PROMPT_1 =
  "Ciao! Vorrei organizzare 4 giorni sul Lago di Garda dal 12 al 15 giugno con la mia compagna. Ci piacciono la natura e il buon vino, vogliamo un ritmo rilassato e niente levatacce. Budget medio.";

function chatConAgenti(cartella: string) {
  const cliente = creaClienteFinto(
    caricaConversazioneRegistrata(join(process.cwd(), "..", "..", "packages", "agents", "test", "agenti", "conversazioni", "atto-1-garda.json")),
  );
  return ambienteChat(() => disponibile(assistenteDaAgenti({ cliente, sorgente: sorgenteDestinazioniLocale, adesso: () => null })), cartella);
}

describe("ST-CHAT-001C CA-6 filtri e chat compilano lo stesso profilo", () => {
  it("dai filtri alla chat: la chat parte dal profilo dei filtri e lo aggiorna; viaggio e percorso hanno lo stesso profilo", async () => {
    const [pr1] = profiliDiRiferimento();
    if (pr1 === undefined) throw new Error("manca PR-1");
    // 1. Filtri: il percorso guidato salva PR-1, con forma fisica e pasti diversi dai predefiniti, nel profilo condiviso.
    const daiFiltri: BozzaProfilo = { ...pr1.profilo, formaFisica: "facile", pasti: { pranzo: false, cena: true } };
    const { vista, cartella } = montaPercorso(ambienteChat().cartella, precaricateDeiProfili());
    await compilaProfilo(vista, daiFiltri);
    expect(usaBaseDati(cartella, leggiProfilo)).toMatchObject({ formaFisica: "facile", pasti: { pranzo: false }, stili: ["natura", "gastronomia", "romantico"] });

    // 2. Chat: il Consulente aggiorna le preferenze partendo da quelle dei filtri.
    const chat = chatConAgenti(cartella);
    const { id } = await nuovaConversazione(chat);
    const eventi = await inviaELeggi(chat, id, PROMPT_1);
    const viaggio = eventi.flatMap((e) => (e.tipo === "azione" ? [e.viaggio] : []))[0];
    expect(viaggio).toBe(`chat-${id}`);

    const condiviso = usaBaseDati(cartella, leggiProfilo);
    // Quello che la chat non ha detto resta com'era nei filtri; quello che ha detto lo aggiorna.
    expect(condiviso).toMatchObject({ formaFisica: "facile", pasti: { pranzo: false }, ritmo: "lento", stili: ["natura", "gastronomia"] });
    // Il viaggio nato in chat ha lo stesso profilo.
    expect(usaBaseDati(cartella, (db) => leggiProfiloDelViaggio(db, viaggio as string))).toEqual(condiviso);
  });

  it("dalla chat ai filtri: il percorso parte dal profilo scritto dalla chat e lo riprende quando la chat lo cambia", async () => {
    const chat = chatConAgenti(ambienteChat().cartella);
    const { id } = await nuovaConversazione(chat);
    await inviaELeggi(chat, id, PROMPT_1);
    const dallaChat = usaBaseDati(chat.cartella, leggiProfilo);
    expect(dallaChat).toMatchObject({ destinazione: { tipo: "luogo", nome: expect.stringContaining("Lago di Garda") }, ritmo: "lento" });

    const preferenze = creaServizioPreferenze((lavoro) => usaBaseDati(chat.cartella, lavoro));
    const cambi: BozzaProfilo[] = [];
    const proprieta = {
      preferenze,
      destinazioni: destinazioniFinte(),
      opzioni: opzioniPercorso(),
      mesi: MESI_PREFERENZE,
      precaricate: [],
      onCambio: (b: BozzaProfilo) => cambi.push(b),
    };
    const contenitore = document.createElement("div");
    document.body.append(contenitore);
    const radice = createRoot(contenitore);
    act(() => radice.render(<PercorsoPreferenze {...proprieta} profiloIniziale={dallaChat} />));
    await attendi();
    // Il riepilogo vivo mostra le preferenze dette in chat; nessun cambio da rimandare indietro.
    const riepilogo = contenitore.querySelector(".riepilogo, [class*='riepilogo']")?.textContent ?? contenitore.textContent ?? "";
    expect(riepilogo).toContain("Lago di Garda");
    expect(cambi).toEqual([]);

    // La chat cambia ancora il profilo: il percorso lo riprende e lo segnala come cambio della bozza.
    const aggiornato: BozzaProfilo = { ...(dallaChat ?? {}), formaFisica: "impegnativo" };
    usaBaseDati(chat.cartella, (db) => salvaProfilo(db, aggiornato));
    act(() => radice.render(<PercorsoPreferenze {...proprieta} profiloIniziale={aggiornato} />));
    await attendi();
    expect(cambi.at(-1)).toEqual(aggiornato);
    act(() => radice.unmount());
  });

  it("«Crea la mia bozza» del percorso sulla pagina Pianifica chiede la bozza in chat", () => {
    expect(MESSAGGIO_CREA_BOZZA).toMatch(/crea la mia bozza/i);
  });
});

// La pagina Pianifica usa il router di Next.js: qui non serve.
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
