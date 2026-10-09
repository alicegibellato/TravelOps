// @vitest-environment jsdom
/**
 * REQ-CHAT-001 (ST-CHAT-001B): le schede ricche nella conversazione. Riepilogo delle preferenze, bozza con "Apri",
 * proposta con prima → dopo e Accetta/Rifiuta, conferma con "Annulla". Il contenuto della proposta è quello del
 * motore (`proponiRipianificazione`): la chat non ricalcola nulla.
 */
import { proponiRipianificazione, versioneCorrente } from "@travelops/engine";
import { describe, expect, it } from "vitest";
import { ChatConSorgente } from "../src/chat/ChatViaggio";
import { creaSorgenteFinta } from "../src/chat/sorgente";
import { catalogoDiRiferimento, SCENARI, sorgenteDiRiferimento } from "../src/dati/scenari";
import { statoIniziale } from "../src/stato/stato";
import { attendi, clic, copioneDiRiferimento, messaggi, monta, preparaChat, pulsante, scrivi } from "./supporto-chat";

preparaChat();

async function chatConRisposta(domanda: string): Promise<HTMLElement> {
  const sorgente = creaSorgenteFinta({ copione: copioneDiRiferimento(), ritardoMs: 0 });
  const vista = monta(<ChatConSorgente sorgente={sorgente} />);
  await attendi();
  await scrivi(vista, domanda);
  return vista;
}

describe("Schede ricche nella conversazione", () => {
  it("Schede ricche: il riepilogo delle preferenze elenca periodo, viaggiatori, stili e ritmo", async () => {
    const vista = await chatConRisposta("Mostrami le mie preferenze");
    const scheda = vista.querySelector(".ui-scheda-chat--preferenze");
    expect(scheda?.querySelector("h4")?.textContent).toContain("Le tue preferenze");
    const voci = [...(scheda?.querySelectorAll("dt") ?? [])].map((dt) => [dt.textContent, dt.nextElementSibling?.textContent]);
    expect(voci).toEqual([
      ["Viaggio", "Weekend sul Garda"],
      ["Quando", "12–14 giugno 2026"],
      ["Chi viaggia", "2 viaggiatori"],
      ["Stili", "Cultura e gastronomia"],
      ["Ritmo", "Tranquillo, due o tre attività al giorno"],
    ]);
  });

  it("Schede ricche: la bozza ha una miniatura per giorno con le attività e «Apri» verso la pagina del giorno", async () => {
    const vista = await chatConRisposta("Voglio un weekend sul lago");
    const giorni = [...vista.querySelectorAll(".ui-scheda-chat--bozza .ui-scheda-chat__giorno")];
    expect(giorni).toHaveLength(3);
    expect(vista.querySelector(".ui-scheda-chat--bozza .ui-badge")?.textContent).toBe("Bozza");
    const apri = giorni.map((g) => g.querySelector("a")?.getAttribute("href"));
    expect(apri).toEqual(["/viaggi/versione-1/giorni/2026-06-12", "/viaggi/versione-1/giorni/2026-06-13", "/viaggi/versione-1/giorni/2026-06-14"]);
    expect(giorni[1]?.querySelector(".ui-scheda-chat__giorno-titolo")?.textContent).toMatch(/13 giugno/);
    expect(giorni[1]?.textContent).toContain("Pranzo sul lago");
    // Il nome del link dice di quale giorno si tratta.
    expect(giorni[1]?.querySelector("a")?.textContent).toMatch(/^Apri: .*13 giugno/);
  });

  it("Schede ricche: la proposta mostra prima → dopo con i cambi calcolati dal motore e i pulsanti Accetta e Rifiuta", async () => {
    const vista = await chatConRisposta("Sabato piove: cosa cambio?");
    const scheda = vista.querySelector(".ui-proposta");
    expect(scheda?.querySelector(".ui-proposta__titolo")?.textContent).toBe("Pioggia sul trekking");
    expect(scheda?.querySelector(".ui-badge")?.textContent).toBe("Cambia solo il necessario");

    // Gli stessi cambi che il motore propone per lo scenario S1.
    const scenario = SCENARI.find((s) => s.chiaveViaggio === "versione-1");
    if (scenario === undefined) throw new Error("manca lo scenario del viaggio di riferimento");
    const stato = statoIniziale("versione-1", scenario.id);
    const corrente = versioneCorrente(stato.storico);
    const { modifiche } = proponiRipianificazione(corrente.viaggio, corrente.numero, catalogoDiRiferimento(), sorgenteDiRiferimento(), scenario.imprevisto);
    const nellaScheda = (tipo: string) => scheda?.querySelectorAll(`.ui-proposta__cambio--${tipo}`).length;
    expect(nellaScheda("rimosso")).toBe(modifiche.rimossi.length);
    expect(nellaScheda("aggiunto")).toBe(modifiche.aggiunti.length);
    expect(nellaScheda("spostato")).toBe(modifiche.modificati.length);
    expect(modifiche.aggiunti.length + modifiche.modificati.length).toBeGreaterThan(0);
    expect(scheda?.textContent).toContain("Visita al MAG");

    // Per ogni spostamento: l'orario di prima e quello di dopo.
    const spostati = [...(scheda?.querySelectorAll(".ui-proposta__cambio--spostato") ?? [])];
    for (const cambio of spostati) {
      expect(cambio.querySelector(".ui-proposta__prima")?.textContent).toMatch(/\d{2}:\d{2}/);
      expect(cambio.querySelector(".ui-proposta__dopo")?.textContent).toMatch(/\d{2}:\d{2}/);
    }
    expect([...(scheda?.querySelectorAll(".ui-proposta__azioni button") ?? [])].map((b) => b.textContent)).toEqual(["Accetta", "Rifiuta"]);
  });

  it("Schede ricche: Accetta mostra la conferma con «Annulla»; Annulla riporta il programma com'era", async () => {
    const vista = await chatConRisposta("Sabato piove: cosa cambio?");
    clic(pulsante(vista, "Accetta"));
    await attendi();
    expect(vista.querySelector(".ui-proposta__azioni")?.textContent).toBe("Accettata");
    const conferma = vista.querySelector(".ui-scheda-chat--conferma");
    expect(conferma?.textContent).toContain("Fatto: ho aggiornato il programma");
    expect(conferma?.querySelector(".ui-avviso--successo")).not.toBeNull();

    clic(pulsante(vista, "Annulla"));
    await attendi();
    expect(vista.querySelector(".ui-scheda-chat--conferma")?.textContent).toContain("Il programma è tornato com'era.");
    expect(vista.querySelector(".ui-scheda-chat--conferma .ui-badge")?.textContent).toBe("Annullata");
    expect(vista.querySelector(".ui-proposta__azioni")?.textContent).toBe("Annullata");
    expect(vista.querySelector(".ui-scheda-chat--conferma button")).toBeNull();
    expect(messaggi(vista).at(-1)?.testo).toContain("Ho annullato la modifica");
  });

  it("Schede ricche: Rifiuta lascia il programma com'è e lo dice", async () => {
    const vista = await chatConRisposta("Sabato piove: cosa cambio?");
    clic(pulsante(vista, "Rifiuta"));
    await attendi();
    expect(vista.querySelector(".ui-proposta__azioni")?.textContent).toBe("Rifiutata");
    expect(vista.querySelector(".ui-scheda-chat--conferma")).toBeNull();
    expect(messaggi(vista).at(-1)?.testo).toContain("lascio il programma com'è");
  });
});
