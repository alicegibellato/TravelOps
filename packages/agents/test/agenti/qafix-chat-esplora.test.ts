/**
 * ST-QA-FIX-CHAT-ESPLORA: prima che il viaggio abbia una destinazione preparata, la chat può suggerire liberamente
 * mete e idee di itinerario (i nomi non sono ancora nel catalogo); le frasi che dichiarano prenotazioni o pagamenti
 * restano bloccate. Con una destinazione preparata il controllo dei nomi resta com'è (vedi controllo.test.ts).
 */
import { describe, expect, it } from "vitest";
import { creaArchivioInMemoria, creaClienteFinto, rispondiAlMessaggioCompleto, TESTO_RISPOSTA_SOSTITUITA } from "../../src/index.js";
import { sorgenteRegistrata } from "../strumenti/supporto.js";

async function rispondi(testo: string) {
  const archivio = creaArchivioInMemoria();
  const cliente = creaClienteFinto({ versione: 1, turni: [{ atteso: {}, risposta: { testo } }] });
  const esito = await rispondiAlMessaggioCompleto({
    cliente,
    archivio,
    sorgente: sorgenteRegistrata(),
    conversazione: [],
    messaggio: "Voglio andare in Sudamerica la prossima estate, non so bene dove: fammi un itinerario di 2 settimane",
  });
  cliente.verificaCompletata();
  return esito;
}

describe("ST-QA-FIX-CHAT-ESPLORA chat libera prima della meta", () => {
  it("i suggerimenti di mete e tappe si vedono", async () => {
    const { eventi, fine } = await rispondi(
      "Per due settimane ti propongo Perù e Bolivia: Lima, Cusco, il Machu Picchu e il Lago Titicaca. Oppure Patagonia, tra Torres del Paine e El Calafate. Quale ti attira di più?",
    );
    expect(eventi.some((e) => e.tipo === "testo_corretto")).toBe(false);
    expect(fine.testo).toContain("Machu Picchu");
  });

  it("chi dice di aver prenotato resta bloccato anche prima della meta", async () => {
    const { fine } = await rispondi("Perfetto, ti ho prenotato il volo per Lima.");
    expect(fine.testo).toBe(TESTO_RISPOSTA_SOSTITUITA);
  });
});
