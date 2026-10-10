/**
 * REQ-CHAT-003 (ST-CHAT-003A), lato agenti: nel profilo entra solo un luogo che la sorgente delle destinazioni
 * conosce (CA-1). Un nome che non trova nulla non si salva, non crea un viaggio e torna al modello come errore da
 * spiegare. Sorgente registrata e client del modello finto: nessuna rete.
 */
import { describe, expect, it } from "vitest";
import { creaArchivioInMemoria, creaClienteFinto, creaStrumentiMotore, rispondiAlMessaggioCompleto } from "../../src/index.js";
import { sorgenteRegistrata } from "../strumenti/supporto.js";

/** Gli argomenti di aggiorna_profilo tutti a null, tranne quelli indicati. */
function argomenti(parziali: Record<string, unknown>): Record<string, unknown> {
  const definizione = creaStrumentiMotore({ archivio: creaArchivioInMemoria(), sorgente: sorgenteRegistrata() }).find(
    (s) => s.definizione.nome === "aggiorna_profilo",
  )?.definizione;
  const proprieta = Object.keys((definizione?.parametri as { properties: Record<string, unknown> }).properties);
  return { ...Object.fromEntries(proprieta.map((p) => [p, null])), ...parziali };
}

describe("REQ-CHAT-003 CA-1 solo destinazioni che la sorgente conosce", () => {
  it("un luogo che la sorgente non trova non entra nel profilo e non crea il viaggio", async () => {
    const archivio = creaArchivioInMemoria({ profilo: { ritmo: "bilanciato" } });
    const aggiorna = creaStrumentiMotore({ archivio, sorgente: sorgenteRegistrata() }).find((s) => s.definizione.nome === "aggiorna_profilo");
    await expect(aggiorna?.esegui(argomenti({ destinazione: { tipo: "luogo", nome: "Manila" } }), {} as never)).rejects.toThrow(
      /Non trovo «Manila».*profilo non salvato/,
    );
    expect(archivio.contenuto().profilo).toEqual({ ritmo: "bilanciato" });
    expect(archivio.contenuto().scheda ?? null).toBeNull();
    expect(archivio.scritture).toHaveLength(0);
  });

  it("un luogo che la sorgente trova entra nel profilo come prima", async () => {
    const archivio = creaArchivioInMemoria();
    const aggiorna = creaStrumentiMotore({ archivio, sorgente: sorgenteRegistrata() }).find((s) => s.definizione.nome === "aggiorna_profilo");
    const esito = (await aggiorna?.esegui(argomenti({ destinazione: { tipo: "luogo", nome: "Riva del Garda" } }), {} as never)) as { salvato: boolean };
    expect(esito.salvato).toBe(true);
    expect(archivio.contenuto().profilo?.destinazione).toEqual({ tipo: "luogo", nome: "Riva del Garda" });
  });

  it("nella chat: lo strumento fallisce, nessuna scrittura, e il modello risponde chiedendo di precisare", async () => {
    const archivio = creaArchivioInMemoria();
    const cliente = creaClienteFinto({
      versione: 1,
      turni: [
        { atteso: {}, risposta: { chiamate: [{ id: "c1", nome: "aggiorna_profilo", argomenti: argomenti({ destinazione: { tipo: "luogo", nome: "Manila" } }) }] } },
        { atteso: {}, risposta: { testo: "Non trovo Manila: è la città nelle Filippine? Dimmi la città o l'isola precisa." } },
      ],
    });
    const { eventi, fine } = await rispondiAlMessaggioCompleto({
      cliente,
      archivio,
      sorgente: sorgenteRegistrata(),
      conversazione: [],
      messaggio: "Vorrei andare a Manila a Capodanno",
    });
    cliente.verificaCompletata();
    expect(eventi.filter((e) => e.tipo === "strumento_fallito")).toHaveLength(1);
    expect(eventi.some((e) => e.tipo === "azione")).toBe(false);
    expect(fine.tracce.find((t) => t.strumento === "aggiorna_profilo")).toMatchObject({ esito: "errore" });
    expect(archivio.scritture).toHaveLength(0);
  });
});
