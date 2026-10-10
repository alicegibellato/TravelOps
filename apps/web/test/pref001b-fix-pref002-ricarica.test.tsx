// @vitest-environment jsdom
/**
 * ST-PREF-001B-FIX-TB-PREF-002 (testbook TB-PREF-002, REQ-PREF-001): dopo il ricaricamento della pagina il percorso
 * riparte dal passo in cui era E con le scelte già fatte (destinazione e date); prima ripartiva dal passo 3 ma con il
 * riepilogo su «Da scegliere». La bozza resta nel browser (sessionStorage): il profilo salvato non cambia finché non si
 * preme «Crea la mia bozza». Nessuna rete.
 */
import { describe, expect, it } from "vitest";
import { PercorsoPreferenze } from "../src/componenti/PercorsoPreferenze";
import { conBaseDati } from "../src/basedati";
import { opzioniPercorso } from "../src/preferenze/opzioni";
import { leggiProfilo } from "../src/preferenze/profilo";
import { creaServizioPreferenze } from "../src/preferenze/servizio";
import { attendi, clic, monta, preparaChat, smonta } from "./supporto-chat";
import { avanti, destinazioniFinte, MESI_PREFERENZE, preparaPercorso, scrivi } from "./supporto-preferenze";
import { nuovaCartella, sullaBaseDati } from "./supporto-stato";

preparaChat();
preparaPercorso();

function montaSenzaPulire(cartella: string): HTMLElement {
  const preferenze = creaServizioPreferenze((lavoro) => conBaseDati(cartella, lavoro));
  return monta(<PercorsoPreferenze preferenze={preferenze} destinazioni={destinazioniFinte()} opzioni={opzioniPercorso()} mesi={MESI_PREFERENZE} precaricate={[{ id: "istantanea-1", nome: "Lisbona" }]} />);
}

describe("TB-PREF-002 il percorso sopravvive al ricaricamento", () => {
  it("dopo il ricaricamento al passo 3 restano passo, destinazione e date; il profilo salvato non cambia", async () => {
    const cartella = nuovaCartella();
    const prima = montaSenzaPulire(cartella);
    const scheda = [...prima.querySelectorAll<HTMLButtonElement>(".percorso__scheda")].find((b) => b.textContent === "Lisbona");
    if (scheda === undefined) throw new Error("manca la scheda Lisbona");
    clic(scheda);
    await avanti(prima);
    scrivi(prima, "dal", "2026-08-10");
    scrivi(prima, "al", "2026-08-14");
    await avanti(prima);
    expect(prima.textContent).toContain("Passo 3 di 5");

    // F5: la pagina si smonta e si rimonta; sessionStorage resta (stessa scheda).
    smonta();
    const dopo = montaSenzaPulire(cartella);
    await attendi(50);
    const testo = dopo.textContent ?? "";
    expect(testo).toContain("Passo 3 di 5");
    expect(testo).toContain("Lisbona");
    expect(testo).toContain("10");
    expect(testo).not.toContain("Cosa manca");
    expect(sullaBaseDati(cartella, leggiProfilo)).toBeNull();
  });
});
