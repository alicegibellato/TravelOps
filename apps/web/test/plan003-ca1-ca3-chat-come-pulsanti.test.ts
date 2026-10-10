/**
 * ST-PLAN-003, CA-1 e CA-3 di REQ-PLAN-003 (CR su REQ-PLAN-002): ogni operazione sulla bozza disponibile da pulsante lo è
 * anche dalla chat, e produce la stessa revisione (stessa causa, stesso itinerario, stessi dati di «Annulla»).
 *
 * Due bozze identiche del Garda, in due cartelle dati: sulla prima si agisce con le azioni lato server dei pulsanti
 * (`app/bozza/azioni.ts`), sulla seconda con la chat della web app (endpoint, agenti veri e strumenti, modello finto).
 * Dopo ogni passo le revisioni salvate nella base dati devono essere uguali. Nessuna rete e nessuna chiave.
 */
import { caricaConversazioneRegistrata, creaClienteFinto, type ClienteFinto } from "@travelops/agents";
import { OPERAZIONI_BOZZA, type OperazioneBozza } from "@travelops/engine";
import { describe, expect, it, vi } from "vitest";
import { alternativeBozzaAzione, cambiaPreferenzeBozzaAzione, confermaBozzaAzione, confrontaBozzaAzione, operaBozzaAzione } from "../app/bozza/azioni";
import { conBaseDati, elencaRevisioniBozza, leggiImpostazione, testoStoricoDelViaggio, trovaViaggio } from "../src/basedati";
import { CHIAVE_DATI_BOZZA } from "../src/bozza/chiavi";
import type { VistaBozza } from "../src/bozza/tipi";
import { assistenteDaAgenti } from "../src/chat/server/agenti";
import { sorgenteDestinazioniLocale } from "../src/destinazioni/sorgente";
import { ambienteChat, disponibile, inviaELeggi, nuovaConversazione } from "./supporto-chat001a";
import { nuovaBozza } from "./supporto-bozza";

// Le azioni dei pulsanti lavorano sulla cartella dati della web app: nei test è quella della bozza «dei pulsanti».
const dove = vi.hoisted(() => ({ cartella: "" }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("../src/stato/archivio", async (originale) => ({ ...(await originale<typeof import("../src/stato/archivio")>()), cartellaDati: () => dove.cartella }));

type ArgomentiChiamata = { nome: string; argomenti: Record<string, unknown> };

const TOOL_VUOTO = { elementoId: null, attivitaId: null, data: null, conData: null, inizio: null, numero: null };

/** L'operazione dei pulsanti come la chiama il modello: lo strumento `opera_bozza` con gli argomenti dell'operazione. */
function chiamataDa(operazione: Exclude<OperazioneBozza, { tipo: "cambia_preferenze" }>): ArgomentiChiamata {
  const { tipo, ...resto } = operazione;
  return { nome: "opera_bozza", argomenti: { ...TOOL_VUOTO, operazione: tipo, ...resto } };
}

interface Mondo {
  pulsanti: ReturnType<typeof nuovaBozza>;
  chat: ReturnType<typeof nuovaBozza>;
  conversazione: number;
  ambiente: ReturnType<typeof ambienteChat>;
  /** Manda un messaggio alla chat: il modello finto chiama gli strumenti indicati e poi risponde. */
  inChat(chiamate: readonly ArgomentiChiamata[]): Promise<{ cliente: ClienteFinto; eventi: Awaited<ReturnType<typeof inviaELeggi>> }>;
}

async function mondo(): Promise<Mondo> {
  const pulsanti = nuovaBozza();
  const chat = nuovaBozza();
  dove.cartella = pulsanti.cartella;
  let cliente: ClienteFinto = creaClienteFinto({ versione: 1, turni: [] });
  const ambiente = ambienteChat(() => disponibile(assistenteDaAgenti({ cliente, sorgente: sorgenteDestinazioniLocale, adesso: () => null })), chat.cartella);
  const { id } = await nuovaConversazione(ambiente, chat.viaggioId);
  return {
    pulsanti,
    chat,
    conversazione: id,
    ambiente,
    async inChat(chiamate) {
      cliente = creaClienteFinto({
        versione: 1,
        turni: [
          { atteso: {}, risposta: { chiamate: chiamate.map((c, i) => ({ id: `call_${i}`, nome: c.nome, argomenti: c.argomenti })) } },
          { atteso: {}, risposta: { testo: "Fatto." } },
        ],
      });
      return { cliente, eventi: await inviaELeggi(ambiente, id, "Fai quella modifica.") };
    },
  };
}

const revisioni = (cartella: string, viaggio: string) =>
  conBaseDati(cartella, (db) => {
    const elencate = elencaRevisioniBozza(db, viaggio);
    if (!elencate.ok) throw new Error(elencate.motivo);
    return elencate.revisioni;
  });

/** I dati di «Annulla» e dei profili per revisione (impostazione per viaggio). */
const datiBozza = (cartella: string, viaggio: string) => conBaseDati(cartella, (db) => leggiImpostazione(db, CHIAVE_DATI_BOZZA(viaggio)));

/** Le attività vere (pasti esclusi) di un giorno della vista. */
function attivitaDelGiorno(vista: VistaBozza, data: string) {
  return (vista.giorni.find((g) => g.data === data)?.voci ?? []).flatMap((v) => (v.tipo === "attivita" && !v.pasto ? [v] : []));
}

/** Le due bozze hanno la stessa ultima revisione (numero, causa, itinerario) e gli stessi dati di annullamento. */
function stessaRevisione(m: Mondo, passo: string, attesa: number): void {
  const a = revisioni(m.pulsanti.cartella, m.pulsanti.viaggioId);
  const b = revisioni(m.chat.cartella, m.chat.viaggioId);
  expect(b.length, passo).toBe(attesa);
  expect(a.length, passo).toBe(attesa);
  expect(b.at(-1), passo).toEqual(a.at(-1));
  expect(datiBozza(m.chat.cartella, m.chat.viaggioId), passo).toEqual(datiBozza(m.pulsanti.cartella, m.pulsanti.viaggioId));
}

describe("CA-1 e CA-3 la chat fa le stesse operazioni dei pulsanti, con le stesse revisioni", () => {
  it("ogni operazione dei pulsanti, dalla chat, dà la stessa revisione (causa e itinerario) e gli stessi dati di Annulla", async () => {
    const m = await mondo();
    const [d1, d2, d3] = m.pulsanti.vista.date.map((d) => d.valore) as [string, string, string];
    const fatte = new Set<string>();
    let numero = 1;

    /** Un'operazione: prima il pulsante (azione lato server) sulla prima bozza, poi la chat sulla seconda. */
    async function passo(nome: string, daPulsante: () => Promise<{ ok: boolean }>, chiamate: readonly ArgomentiChiamata[], tipo: string): Promise<void> {
      expect((await daPulsante()).ok, `${nome} (pulsante)`).toBe(true);
      const { eventi } = await m.inChat(chiamate);
      expect(eventi.filter((e) => e.tipo === "errore"), `${nome} (chat)`).toEqual([]);
      numero += 1;
      stessaRevisione(m, nome, numero);
      fatte.add(tipo);
    }
    const opera = (operazione: Exclude<OperazioneBozza, { tipo: "cambia_preferenze" }>, nome: string = operazione.tipo) =>
      passo(nome, () => operaBozzaAzione(m.pulsanti.viaggioId, operazione), [chiamataDa(operazione)], operazione.tipo);

    const vista = () => m.pulsanti.servizio.vista(m.pulsanti.viaggioId)!;
    const prima = attivitaDelGiorno(vista(), d2)[0]!;

    await opera({ tipo: "blocca", elementoId: prima.id });
    await opera({ tipo: "sblocca", elementoId: prima.id });
    await opera({ tipo: "giornata_piu_piena", data: d3 });
    await opera({ tipo: "giornata_piu_leggera", data: d3 });
    await opera({ tipo: "rigenera_giorno", data: d2 });
    await opera({ tipo: "scambia_giorni", data: d1, conData: d2 });

    // Aggiungi: la prima delle attività suggerite, in un giorno senza orario (come il pulsante «Aggiungi»).
    await opera({ tipo: "aggiungi", attivitaId: vista().suggerite[0]!.attivitaId, data: d3 });

    // Sostituisci: le alternative sono le stesse (pulsante e strumento), poi si sceglie la prima.
    const daSostituire = attivitaDelGiorno(vista(), d2).at(-1)!;
    const alternative = await alternativeBozzaAzione(m.pulsanti.viaggioId, daSostituire.id);
    expect(alternative.length).toBeGreaterThan(0);
    const lette = await m.inChat([{ nome: "alternative_bozza", argomenti: { elementoId: daSostituire.id } }]);
    const risultato = lette.cliente.richieste[1]!.messaggi.find((x) => x.ruolo === "strumento");
    expect(JSON.parse(risultato && "risultato" in risultato ? risultato.risultato : "{}").alternative).toEqual(alternative);
    await opera({ tipo: "sostituisci", elementoId: daSostituire.id, attivitaId: alternative[0]!.attivitaId });

    // Rimuovi e sposta.
    const daSpostare = attivitaDelGiorno(vista(), d2)[0]!;
    await opera({ tipo: "sposta", elementoId: daSpostare.id, data: d2, inizio: "09:30" });
    await opera({ tipo: "rimuovi", elementoId: attivitaDelGiorno(vista(), d3).at(-1)!.id });

    // Cambia preferenze: lo strumento dedicato, come «Rigenera con queste preferenze».
    await passo(
      "cambia_preferenze",
      () => cambiaPreferenzeBozzaAzione(m.pulsanti.viaggioId, { ritmo: "intenso" }),
      [{ nome: "cambia_preferenze_bozza", argomenti: { ritmo: "intenso", stili: null } }],
      "cambia_preferenze",
    );

    // Alternativa, annulla (due volte: la catena di «Annulla» resta uguale) e torna alla revisione.
    await opera({ tipo: "alternativa" });
    await opera({ tipo: "annulla" });
    await opera({ tipo: "annulla" }, "annulla di nuovo");
    await opera({ tipo: "torna_alla_revisione", numero: 3 });

    // Ogni tipo di operazione dei pulsanti è stato fatto dalla chat (CA-1).
    expect([...fatte].sort()).toEqual([...OPERAZIONI_BOZZA].sort());

    // Confronta: lo stesso confronto, i cambi in frasi (pulsante) e in elementi (strumento).
    const confronto = await confrontaBozzaAzione(m.pulsanti.viaggioId, 1, numero);
    expect(confronto).not.toBeNull();
    const confrontoChat = await m.inChat([{ nome: "confronta_bozza", argomenti: { da: 1, a: numero } }]);
    const letto = confrontoChat.cliente.richieste[1]!.messaggi.find((x) => x.ruolo === "strumento");
    const dati = JSON.parse(letto && "risultato" in letto ? letto.risultato : "{}") as { da: number; a: number; rimossi: { attivita?: string }[] };
    expect(dati).toMatchObject({ da: 1, a: numero });
    for (const [, nome] of (confronto?.cambi ?? []).join("\n").matchAll(/Tolto «([^»]+)»/g)) {
      expect(dati.rimossi.map((r) => r.attivita)).toContain(nome);
    }
    stessaRevisione(m, "confronto (nessuna revisione in più)", numero);

    // Conferma: lo stesso storico e lo stesso stato del viaggio.
    expect((await confermaBozzaAzione(m.pulsanti.viaggioId)).ok).toBe(true);
    await m.inChat([{ nome: "conferma_viaggio", argomenti: {} }]);
    for (const cartella of [m.pulsanti.cartella, m.chat.cartella]) {
      conBaseDati(cartella, (db) => expect(trovaViaggio(db, "viaggio-1")?.stato).toBe("confermato"));
    }
    const storico = (cartella: string) => conBaseDati(cartella, (db) => testoStoricoDelViaggio(db, "viaggio-1"));
    expect(storico(m.chat.cartella)).toEqual(storico(m.pulsanti.cartella));
    expect(datiBozza(m.chat.cartella, "viaggio-1")).toEqual(datiBozza(m.pulsanti.cartella, "viaggio-1"));
  }, 90_000);

  it("CA-3 un'operazione che non si può fare non crea revisioni e dà lo stesso motivo, da pulsante e da chat", async () => {
    const m = await mondo();
    const operazione: OperazioneBozza = { tipo: "rimuovi", elementoId: "D9-E9" };
    const esito = await operaBozzaAzione(m.pulsanti.viaggioId, operazione);
    expect(esito.ok).toBe(false);
    const { cliente } = await m.inChat([chiamataDa(operazione)]);
    const risposta = cliente.richieste[1]!.messaggi.find((x) => x.ruolo === "strumento");
    expect(risposta && "risultato" in risposta ? risposta.risultato : "").toContain(esito.messaggio);
    expect(revisioni(m.chat.cartella, m.chat.viaggioId)).toHaveLength(1);
    expect(revisioni(m.pulsanti.cartella, m.pulsanti.viaggioId)).toHaveLength(1);
  });
});
