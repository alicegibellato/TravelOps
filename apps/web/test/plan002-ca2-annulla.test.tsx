// @vitest-environment jsdom
/**
 * ST-PLAN-002, CA-2 e CA-3 di REQ-PLAN-002 dalla pagina: «Annulla» riporta esattamente alla revisione precedente
 * (anche dopo il salvataggio nella base dati), «Torna a Bn» e «Confronta» lavorano sulle revisioni; le attività
 * bloccate restano con «Rigenera questo giorno» e «Cambia preferenze».
 */
import { describe, expect, it } from "vitest";
import { conBaseDati, elencaRevisioniBozza } from "../src/basedati";
import { montaBozza, nuovaBozza, premiEAttendi, pulsanteIn, revisioneMostrata, schedeAttivita } from "./supporto-bozza";
import { preparaChat } from "./supporto-chat";
import { scrivi } from "./supporto-preferenze";

preparaChat();

function revisioni(cartella: string, viaggioId: string) {
  return conBaseDati(cartella, (db) => {
    const elencate = elencaRevisioniBozza(db, viaggioId);
    if (!elencate.ok) throw new Error(elencate.motivo);
    return elencate.revisioni;
  });
}

describe("CA-2 Annulla riporta esattamente alla revisione precedente", () => {
  it("CA-2 dopo «Rigenera questo giorno», «Annulla» crea una revisione con lo stesso itinerario della precedente", async () => {
    const bozza = nuovaBozza();
    const vista = montaBozza(bozza);
    const annulla = () => pulsanteIn(vista, "Annulla");
    expect(annulla().disabled).toBe(true);
    const data = bozza.vista.date[1]!.valore;
    const prima = vista.querySelector(`[data-data='${data}']`)?.textContent;
    await premiEAttendi(pulsanteIn(vista.querySelector(`[data-data='${data}']`)!, "Rigenera questo giorno"));
    expect(vista.querySelector(`[data-data='${data}']`)?.textContent).not.toBe(prima);
    expect(annulla().disabled).toBe(false);
    await premiEAttendi(annulla());
    expect(revisioneMostrata(vista)).toBe("Revisione B3");
    expect(vista.querySelector(`[data-data='${data}']`)?.textContent).toBe(prima);
    const salvate = revisioni(bozza.cartella, bozza.viaggioId);
    expect(salvate.map((r) => r.numero)).toEqual([1, 2, 3]);
    expect(salvate[2]!.viaggio).toEqual(salvate[0]!.viaggio);
    expect(salvate[2]!.causa).toMatch(/^Annullata la modifica/);
    expect(vista.querySelector("[data-revisione='3']")?.textContent).toContain("Annullata la modifica");
  });

  it("CA-2 annullare due volte risale la catena; «Torna a B2» e «Confronta» lavorano su revisioni qualsiasi", async () => {
    const bozza = nuovaBozza();
    const vista = montaBozza(bozza);
    const data = bozza.vista.date[1]!.valore;
    await premiEAttendi(pulsanteIn(schedeAttivita(vista, data)[0]!, "Blocca"));
    await premiEAttendi(pulsanteIn(vista.querySelector(`[data-data='${data}']`)!, "Giornata più piena"));
    await premiEAttendi(pulsanteIn(vista, "Annulla"));
    await premiEAttendi(pulsanteIn(vista, "Annulla"));
    const salvate = revisioni(bozza.cartella, bozza.viaggioId);
    expect(salvate.at(-2)!.viaggio).toEqual(salvate[1]!.viaggio);
    expect(salvate.at(-1)!.viaggio).toEqual(salvate[0]!.viaggio);
    expect(pulsanteIn(vista, "Annulla").disabled).toBe(true);
    await premiEAttendi(pulsanteIn(vista.querySelector("[data-revisione='3']")!, "Torna a B3"));
    expect(revisioni(bozza.cartella, bozza.viaggioId).at(-1)!.viaggio).toEqual(salvate[2]!.viaggio);
    // Confronta: le due ultime revisioni (B5 → B6) hanno almeno un cambio, in parole semplici.
    await premiEAttendi(pulsanteIn(vista, "Confronta"));
    const confronto = vista.querySelector(".bozza__confronto");
    expect(confronto?.textContent).toMatch(/Da B5 a B6/);
    expect(confronto?.querySelectorAll("li").length).toBeGreaterThan(0);
  });
});

describe("CA-3 le attività bloccate sopravvivono a «Rigenera questo giorno» e a «Cambia preferenze»", () => {
  it("CA-3 la scheda bloccata resta nel suo giorno, con il lucchetto, dopo entrambe", async () => {
    const bozza = nuovaBozza();
    const vista = montaBozza(bozza);
    const data = bozza.vista.date[1]!.valore;
    const scheda = schedeAttivita(vista, data)[0]!;
    const nome = scheda.querySelector("h3")?.textContent ?? "";
    await premiEAttendi(pulsanteIn(scheda, "Blocca"));
    const bloccata = () => schedeAttivita(vista, data).find((s) => s.querySelector("h3")?.textContent === nome);
    expect(bloccata()?.textContent).toContain("Bloccata");
    await premiEAttendi(pulsanteIn(vista.querySelector(`[data-data='${data}']`)!, "Rigenera questo giorno"));
    expect(bloccata()?.textContent).toContain("Bloccata");
    // Cambia preferenze: ritmo da lento (PR-1) a intenso, tutto il viaggio si rigenera.
    scrivi(vista, "ritmo-bozza", "intenso");
    await premiEAttendi(pulsanteIn(vista, "Rigenera con queste preferenze"));
    expect(revisioneMostrata(vista)).toBe("Revisione B4");
    expect(vista.querySelector("[data-revisione='4']")?.textContent).toContain("Cambiate le preferenze");
    expect(schedeAttivita(vista, data).length).toBeGreaterThan(2);
    expect(bloccata()?.textContent).toContain("Bloccata");
    expect(pulsanteIn(bloccata()!, "Sblocca").getAttribute("aria-pressed")).toBe("true");
  });
});
