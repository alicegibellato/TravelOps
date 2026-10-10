/**
 * ST-PLAN-003, CA-2 di REQ-PLAN-003: con il client finto, i prompt 6, 8 e 10 del copione della demo cambiano la bozza come
 * descritto nel copione (prima erano risposte a parole). Chat della web app, agenti veri e strumenti, base dati SQLite;
 * le risposte del modello sono la conversazione registrata dell'Atto 2 (`packages/agents/test/agenti/conversazioni`).
 * Nessuna rete e nessuna chiave.
 */
import { fileURLToPath } from "node:url";
import { caricaConversazioneRegistrata, creaClienteFinto, type ClienteFinto } from "@travelops/agents";
import { describe, expect, it } from "vitest";
import { conBaseDati, elencaRevisioniBozza } from "../src/basedati";
import type { EventoChat } from "../src/chat/protocollo";
import { assistenteDaAgenti } from "../src/chat/server/agenti";
import { promptCopione, vociCopione } from "../src/demo/copione";
import { sorgenteDestinazioniLocale } from "../src/destinazioni/sorgente";
import { ambienteChat, disponibile, inviaELeggi, nuovaConversazione } from "./supporto-chat001a";

const registrata = (nome: string) =>
  caricaConversazioneRegistrata(fileURLToPath(new URL(`../../../packages/agents/test/agenti/conversazioni/${nome}`, import.meta.url)));

const VINERIA = "A-OSM-NODE-12850381718"; // Degustazione: Vineria Baroldi
const CAVRA_DE_LIZON = "A-OSM-NODE-1841866732"; // Panorama da Cavra de Lizon (all'aperto)
const ENOTECA = "A-OSM-NODE-13153806008"; // Degustazione: Enoteca Segantini
const LUNEDI = "2026-06-15";
const SABATO = "2026-06-13";
const DOMENICA = "2026-06-14";

const azioni = (eventi: readonly EventoChat[]) => eventi.flatMap((e) => (e.tipo === "azione" ? [e.testo] : []));

describe("CA-2 i prompt 6, 8 e 10 del copione cambiano la bozza (client finto)", () => {
  it("6 sostituisce la degustazione di lunedì con un panorama, 8 scambia i giorni 2 e 3, 10 torna alla versione di prima", async () => {
    let cliente: ClienteFinto = creaClienteFinto(registrata("atto-1-garda.json"));
    const ambiente = ambienteChat(() => disponibile(assistenteDaAgenti({ cliente, sorgente: sorgenteDestinazioniLocale, adesso: () => null })));
    const { id, viaggioId } = await nuovaConversazione(ambiente);
    expect(viaggioId).toBeNull();
    await inviaELeggi(ambiente, id, promptCopione("1"));
    await inviaELeggi(ambiente, id, promptCopione("2"));
    const atto2 = creaClienteFinto(registrata("atto-2-garda.json"));
    cliente = atto2;

    const revisioni = () =>
      conBaseDati(ambiente.cartella, (db) => {
        const elencate = elencaRevisioniBozza(db, "chat-" + id);
        if (!elencate.ok) throw new Error(elencate.motivo);
        return elencate.revisioni;
      });
    /** Le attività (id) di ogni giorno della revisione. */
    const programma = (numero: number): Record<string, string[]> =>
      Object.fromEntries(
        revisioni()
          .find((r) => r.numero === numero)!
          .viaggio.giorni.map((g) => [g.data, g.elementi.flatMap((e) => (e.tipo === "attivita" ? [e.attivitaId] : []))]),
      );
    const invia = async (numero: string) => {
      const eventi = await inviaELeggi(ambiente, id, promptCopione(numero));
      expect(eventi.filter((e) => e.tipo === "errore"), numero).toEqual([]);
      expect(azioni(eventi).filter((a) => a === "Bozza modificata"), numero).toHaveLength(1);
      return eventi;
    };

    await invia("5");
    expect(revisioni()).toHaveLength(2);

    // Prompt 6: la degustazione del lunedì lascia il posto a un'attività all'aperto; la causa spiega che cosa è cambiato.
    expect(programma(2)[LUNEDI]).toContain(VINERIA);
    await invia("6");
    const dopo6 = revisioni();
    expect(dopo6).toHaveLength(3);
    expect(dopo6[2]!.causa).toBe('Sostituito "Degustazione: Vineria Baroldi" con "Panorama da Cavra de Lizon" il 2026-06-15');
    expect(programma(3)[LUNEDI]).toContain(CAVRA_DE_LIZON);
    expect(programma(3)[LUNEDI]).not.toContain(VINERIA);

    await invia("7");
    expect(revisioni()).toHaveLength(4);

    // Prompt 8: i giorni 2 e 3 si scambiano (il sabato prende le attività della domenica e viceversa).
    const prima8 = programma(4);
    // Le attività all'aperto (e non i pasti) cambiano con il catalogo: si guarda a ciò che il giorno ha prima dello scambio.
    const dellaDomenica = prima8[DOMENICA]!.filter((a) => a !== ENOTECA);
    expect(dellaDomenica.length).toBeGreaterThan(0);
    expect(prima8[SABATO]).toContain(ENOTECA);
    await invia("8");
    expect(revisioni()).toHaveLength(5);
    expect(revisioni()[4]!.causa).toBe("Scambiati i giorni 2026-06-14 e 2026-06-13");
    const dopo8 = programma(5);
    for (const attivita of dellaDomenica) expect(dopo8[SABATO]).toContain(attivita);
    expect(dopo8[SABATO]).not.toContain(ENOTECA);
    expect(dopo8[DOMENICA]).toContain(ENOTECA);

    // Prompt 9 (alternativa) e prompt 10: si torna alla bozza di prima, cioè alla revisione B5.
    await invia("9");
    expect(revisioni()).toHaveLength(6);
    expect(programma(6)).not.toEqual(programma(5));
    await invia("10");
    const finali = revisioni();
    expect(finali).toHaveLength(7);
    expect(finali[6]!.causa).toMatch(/^Annullata la modifica .*tornato alla revisione B5$/);
    expect(finali[6]!.viaggio).toEqual(finali[4]!.viaggio);
    expect(programma(7)).toEqual(programma(5));

    // Il testo del copione è la fonte dei prompt: 6, 8 e 10 sono prompt da incollare.
    expect(vociCopione().filter((v) => ["6", "8", "10"].includes(v.id)).map((v) => v.tipo)).toEqual(["prompt", "prompt", "prompt"]);
  });
});
