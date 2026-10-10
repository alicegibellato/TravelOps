// @vitest-environment jsdom
/**
 * ST-PLAN-002, CA-4 e CA-5 di REQ-PLAN-002 dalla pagina: «Conferma l'itinerario» crea la versione 1 uguale all'ultima
 * revisione, con una festa leggera («Buon viaggio!», coriandoli disattivabili); dopo la conferma i pulsanti preparano
 * proposte (REQ-EDIT-002) da accettare o rifiutare, e la bozza non cambia più.
 */
import { versioneCorrente } from "@travelops/engine";
import { describe, expect, it } from "vitest";
import { conBaseDati, elencaRevisioniBozza, leggiStoricoDelViaggio, trovaViaggio } from "../src/basedati";
import { montaBozza, nuovaBozza, premiEAttendi, pulsanteIn, revisioneMostrata, schedeAttivita } from "./supporto-bozza";
import { preparaChat } from "./supporto-chat";

preparaChat();

function dati(cartella: string, viaggioId: string) {
  return conBaseDati(cartella, (db) => {
    const revisioni = elencaRevisioniBozza(db, viaggioId);
    const storico = leggiStoricoDelViaggio(db, viaggioId);
    if (!revisioni.ok) throw new Error(revisioni.motivo);
    return { revisioni: revisioni.revisioni, storico: storico?.ok ? storico.storico : null, stato: trovaViaggio(db, viaggioId)?.stato };
  });
}

describe("CA-4 dopo la conferma la versione 1 coincide con l'ultima revisione della bozza", () => {
  it("CA-4 «Conferma l'itinerario»: versione 1 = ultima revisione, stato confermato, «Buon viaggio!» con coriandoli disattivabili", async () => {
    const bozza = nuovaBozza();
    const vista = montaBozza(bozza);
    const data = bozza.vista.date[2]!.valore;
    await premiEAttendi(pulsanteIn(vista.querySelector(`[data-data='${data}']`)!, "Giornata più piena"));
    await premiEAttendi(pulsanteIn(vista, "Conferma l'itinerario"));
    const salvati = dati(bozza.cartella, bozza.viaggioId);
    expect(salvati.stato).toBe("confermato");
    expect(salvati.storico?.versioni).toHaveLength(1);
    expect(versioneCorrente(salvati.storico!).viaggio).toEqual(salvati.revisioni.at(-1)!.viaggio);
    expect(revisioneMostrata(vista)).toBe("Versione 1");
    const festa = vista.querySelector(".bozza__festa");
    expect(festa?.textContent).toContain("Buon viaggio!");
    expect(festa?.querySelectorAll(".bozza__coriandoli span").length).toBeGreaterThan(0);
    await premiEAttendi(pulsanteIn(festa!, "Togli i coriandoli"));
    expect(vista.querySelector(".bozza__coriandoli")).toBeNull();
    await premiEAttendi(pulsanteIn(vista.querySelector(".bozza__festa")!, "Chiudi"));
    expect(vista.querySelector(".bozza__festa")).toBeNull();
    // Le revisioni restano consultabili.
    expect(vista.querySelectorAll("[data-revisione]").length).toBe(2);
  });
});

describe("CA-5 dopo la conferma le modifiche diventano proposte, non modifiche dirette", () => {
  it("CA-5 «Rimuovi» prepara una proposta: la bozza e lo storico non cambiano finché non la accetti; Accetta crea la versione 2", async () => {
    const bozza = nuovaBozza();
    const vista = montaBozza(bozza);
    await premiEAttendi(pulsanteIn(vista, "Conferma l'itinerario"));
    // Dopo la conferma non ci sono più Annulla, alternativa e Sostituisci.
    for (const testo of ["Annulla", "Mostrami un'alternativa", "Sostituisci", "Conferma l'itinerario"]) {
      expect(() => pulsanteIn(vista, testo), testo).toThrow();
    }
    const data = bozza.vista.date[1]!.valore;
    const scheda = schedeAttivita(vista, data)[0]!;
    const nome = scheda.querySelector("h3")?.textContent ?? "";
    await premiEAttendi(pulsanteIn(scheda, "Rimuovi"));
    expect(vista.querySelector("[data-messaggio='bozza']")?.textContent).toMatch(/proposta/);
    const prima = dati(bozza.cartella, bozza.viaggioId);
    expect(prima.revisioni).toHaveLength(1);
    expect(prima.storico?.versioni).toHaveLength(1);
    // L'attività è ancora nel programma: la proposta aspetta una decisione.
    expect(vista.querySelector(`[data-data='${data}']`)?.textContent).toContain(nome);
    const proposta = vista.querySelector("[data-proposta='1']");
    expect(proposta?.getAttribute("data-decisione")).toBe("in_attesa");
    expect(proposta?.textContent).toContain(nome);
    await premiEAttendi(pulsanteIn(proposta!, "Accetta"));
    const dopo = dati(bozza.cartella, bozza.viaggioId);
    expect(dopo.storico?.versioni).toHaveLength(2);
    expect(dopo.revisioni).toHaveLength(1);
    expect(revisioneMostrata(vista)).toBe("Versione 2");
    expect(vista.querySelector(`[data-data='${data}']`)?.textContent).not.toContain(nome);
    expect(vista.querySelector("[data-proposta='1']")?.getAttribute("data-decisione")).toBe("accettata");
  });

  it("CA-5 una proposta rifiutata non crea versioni", async () => {
    const bozza = nuovaBozza();
    const vista = montaBozza(bozza);
    await premiEAttendi(pulsanteIn(vista, "Conferma l'itinerario"));
    const data = bozza.vista.date[1]!.valore;
    await premiEAttendi(pulsanteIn(vista.querySelector(`[data-data='${data}']`)!, "Giornata più leggera"));
    await premiEAttendi(pulsanteIn(vista.querySelector("[data-proposta='1']")!, "Rifiuta"));
    expect(dati(bozza.cartella, bozza.viaggioId).storico?.versioni).toHaveLength(1);
    expect(vista.querySelector("[data-proposta='1']")?.getAttribute("data-decisione")).toBe("rifiutata");
  });
});
