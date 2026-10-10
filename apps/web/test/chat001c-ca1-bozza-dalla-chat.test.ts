/**
 * ST-CHAT-001C, CA-1: dal prompt 1 del copione della demo, scritto in linguaggio naturale, si arriva a una bozza
 * senza usare il percorso guidato. La chat della web app (endpoint, streaming, conversazione salvata) parla con gli
 * agenti veri (orchestratore, Consulente, strumenti e motore) sul viaggio della conversazione nella base dati; il
 * modello è il client finto con le conversazioni registrate di `packages/agents` (nessuna rete, nessuna chiave).
 *
 * Ogni azione dalla chat si riflette subito nella bozza accanto, con le parti cambiate evidenziate.
 */
import { fileURLToPath } from "node:url";
import { caricaConversazioneRegistrata, creaClienteFinto, type ClienteFinto } from "@travelops/agents";
import { describe, expect, it } from "vitest";
import { leggiBozzaDalVivo } from "../src/chat/bozza-dal-vivo";
import type { EventoChat } from "../src/chat/protocollo";
import { assistenteDaAgenti } from "../src/chat/server/agenti";
import { sorgenteDestinazioniLocale } from "../src/destinazioni/sorgente";
import { ambienteChat, conversazioneSalvata, disponibile, inviaELeggi, nuovaConversazione } from "./supporto-chat001a";

const registrata = (nome: string) =>
  caricaConversazioneRegistrata(fileURLToPath(new URL(`../../../packages/agents/test/agenti/conversazioni/${nome}`, import.meta.url)));

const PROMPT_1 =
  "Ciao! Vorrei organizzare 4 giorni sul Lago di Garda dal 12 al 15 giugno con la mia compagna. Ci piacciono la natura e il buon vino, vogliamo un ritmo rilassato e niente levatacce. Budget medio.";
const PROMPT_2 = "Forma fisica normale, e sì, mettici anche le cene. Crea pure la bozza.";
const PROMPT_5 = "Il secondo giorno è troppo pieno, alleggeriscilo.";

/** La chat con gli agenti; il client del modello si può cambiare tra un messaggio e l'altro (una registrazione per atto). */
function ambienteConAgenti() {
  let cliente: ClienteFinto = creaClienteFinto(registrata("atto-1-garda.json"));
  const ambiente = ambienteChat(() => disponibile(assistenteDaAgenti({ cliente, sorgente: sorgenteDestinazioniLocale, adesso: () => null })));
  return {
    ambiente,
    cliente: () => cliente,
    cambiaCliente: (nuovo: ClienteFinto) => {
      cliente = nuovo;
    },
  };
}

const tipi = (eventi: readonly EventoChat[]) => eventi.map((e) => e.tipo);
const azioni = (eventi: readonly EventoChat[]) => eventi.flatMap((e) => (e.tipo === "azione" ? [e] : []));
const risposta = (eventi: readonly EventoChat[]) => {
  const ultimo = eventi.at(-1);
  if (ultimo?.tipo !== "risposta") throw new Error(`la risposta non è arrivata: ${JSON.stringify(ultimo)}`);
  return ultimo;
};

describe("ST-CHAT-001C CA-1 dal racconto in chat alla bozza, con gli agenti", () => {
  it("prompt 1 e 2: preferenze, destinazione e bozza di 4 giorni nel viaggio nato in chat, conversazione salvata", async () => {
    const { ambiente, cliente } = ambienteConAgenti();
    const conversazione = await nuovaConversazione(ambiente);
    expect(conversazione.viaggioId).toBeNull();

    // Prompt 1: il Consulente raccoglie le preferenze e prepara la destinazione; nessuna bozza ancora.
    const primo = await inviaELeggi(ambiente, conversazione.id, PROMPT_1);
    expect(primo[0]).toEqual({ tipo: "agente", agente: "consulente", titolo: "Consulente" });
    expect(primo.flatMap((e) => (e.tipo === "passo" ? [e.testo] : []))).toEqual([
      "Aggiorno le preferenze…",
      "Cerco la destinazione…",
      "Sto esplorando la destinazione…",
    ]);
    expect(azioni(primo).map((a) => a.testo)).toEqual(["Preferenze aggiornate", "Destinazione pronta"]);
    const viaggio = azioni(primo)[0]?.viaggio;
    expect(viaggio).toBe(`chat-${conversazione.id}`);
    expect(tipi(primo)).toContain("testo"); // la risposta arriva a pezzi
    const r1 = risposta(primo);
    expect(r1.risposta.agente).toBe("consulente");
    expect(r1.risposta.scheda).toMatchObject({ tipo: "preferenze", titolo: "Le tue preferenze" });
    expect(JSON.stringify(r1.risposta.scheda)).toContain("Lago di Garda");

    // La conversazione è collegata al viaggio nato in chat; la bozza non c'è ancora.
    expect((await conversazioneSalvata(ambiente, conversazione.id)).viaggioId).toBe(viaggio);
    const prima = leggiBozzaDalVivo(ambiente.cartella, viaggio as string);
    expect(prima).toMatchObject({ destinazione: "Lago di Garda (Riva del Garda e dintorni)", giorni: [] });
    expect(prima?.preferenze.map((v) => v.etichetta)).toEqual(expect.arrayContaining(["Destinazione", "Quando", "Chi viaggia", "Stili", "Ritmo", "Budget"]));

    // Prompt 2: profilo completo e prima bozza, senza percorso guidato.
    const secondo = await inviaELeggi(ambiente, conversazione.id, PROMPT_2);
    expect(azioni(secondo).map((a) => a.testo)).toEqual(["Preferenze aggiornate", "Bozza creata"]);
    const r2 = risposta(secondo);
    expect(r2.risposta.scheda).toMatchObject({ tipo: "bozza", titolo: "La tua bozza" });
    const giorniScheda = (r2.risposta.scheda as unknown as { giorni: { titolo: string; href: string }[] }).giorni;
    expect(giorniScheda.map((g) => g.titolo)).toEqual(["venerdì 12 giugno", "sabato 13 giugno", "domenica 14 giugno", "lunedì 15 giugno"]);
    expect(giorniScheda[0]?.href).toBe(`/pianifica?viaggio=${viaggio}#giorno-2026-06-12`);
    cliente().verificaCompletata();

    // La bozza accanto alla chat: 4 giorni dal motore, prima revisione, niente da evidenziare.
    const bozza = leggiBozzaDalVivo(ambiente.cartella, viaggio as string);
    expect(bozza).toMatchObject({ etichetta: "Bozza 1", confermato: false, cambiate: 0 });
    expect(bozza?.giorni.map((g) => g.data)).toEqual(["2026-06-12", "2026-06-13", "2026-06-14", "2026-06-15"]);
    expect(JSON.stringify(bozza)).toContain("Degustazione");

    // Conversazione salvata: i due messaggi del viaggiatore e le due risposte, con l'agente che ha risposto.
    const salvata = await conversazioneSalvata(ambiente, conversazione.id);
    expect(salvata.messaggi.map((m) => m.autore)).toEqual(["viaggiatore", "travelops", "viaggiatore", "travelops"]);
    expect(salvata.messaggi[3]).toMatchObject({ agente: "consulente", scheda: { tipo: "bozza" } });
  });

  it("una modifica dalla chat cambia la bozza accanto e accende le attività cambiate", async () => {
    const { ambiente, cliente, cambiaCliente } = ambienteConAgenti();
    const { id } = await nuovaConversazione(ambiente);
    await inviaELeggi(ambiente, id, PROMPT_1);
    const viaggio = azioni(await inviaELeggi(ambiente, id, PROMPT_2))[0]?.viaggio as string;
    cliente().verificaCompletata();

    cambiaCliente(creaClienteFinto(registrata("atto-2-garda.json")));
    const quinto = await inviaELeggi(ambiente, id, PROMPT_5);
    expect(quinto[0]).toMatchObject({ tipo: "agente", agente: "planner" });
    expect(azioni(quinto)).toEqual([{ tipo: "azione", testo: "Bozza modificata", viaggio }]);
    expect(risposta(quinto).risposta.scheda).toMatchObject({ tipo: "bozza", titolo: "La bozza aggiornata" });

    const bozza = leggiBozzaDalVivo(ambiente.cartella, viaggio);
    expect(bozza?.etichetta).toBe("Bozza 2");
    // Il secondo giorno è più leggero: almeno un'attività è cambiata ed è evidenziata.
    const cambiate = bozza?.giorni.flatMap((g) => g.voci.filter((v) => v.cambiata && !v.spostamento)) ?? [];
    expect(bozza?.cambiate).toBe(cambiate.length);
    const conAttivita = (data: string) => bozza?.giorni.find((g) => g.data === data)?.voci.filter((v) => !v.spostamento).length ?? 0;
    expect(conAttivita("2026-06-13")).toBeGreaterThan(0);
  });
});
