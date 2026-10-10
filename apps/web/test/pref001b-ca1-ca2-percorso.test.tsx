// @vitest-environment jsdom
/**
 * ST-PREF-001B, CA-1 e CA-2 di REQ-PREF-001: il percorso in 5 passi con barra di avanzamento e «Salta», fino a
 * «Crea la mia bozza» in al massimo 5 schermate con i soli campi obbligatori; un profilo incompleto mostra cosa manca
 * in parole semplici (i testi del motore, mai duplicati nel browser).
 */
import { cosaManca } from "@travelops/engine";
import { describe, expect, it } from "vitest";
import { clic, preparaChat, pulsante } from "./supporto-chat";
import { attendi } from "./supporto-chat";
import { avanti, montaPercorso, premi, preparaPercorso, scrivi, titoloPasso } from "./supporto-preferenze";
import { nuovaCartella } from "./supporto-stato";

preparaChat();
preparaPercorso();

const barra = (vista: HTMLElement) => vista.querySelector<HTMLProgressElement>("progress.percorso__barra");
const testi = (vista: HTMLElement, ruolo: string) => [...vista.querySelectorAll(`[role='${ruolo}'] li`)].map((li) => li.textContent);

describe("CA-1 percorso guidato in 5 passi", () => {
  it("CA-1 i 5 passi hanno la barra di avanzamento e i titoli del requisito", async () => {
    const { vista } = montaPercorso(nuovaCartella());
    expect(titoloPasso(vista)).toBe("Dove");
    expect(barra(vista)?.value).toBe(1);
    expect(barra(vista)?.max).toBe(5);
    expect(vista.textContent).toContain("Passo 1 di 5");
    scrivi(vista, "destinazione", "x");
    // Senza destinazione non si va avanti, ma con «Sorprendimi più tardi» sì: visitiamo tutti i passi.
    clic(pulsante(vista, "Scelgo più tardi: sorprendimi"));
    await avanti(vista);
    expect(titoloPasso(vista)).toBe("Quando e quanto");
    scrivi(vista, "dal", "2026-06-12");
    scrivi(vista, "al", "2026-06-14");
    const titoli = [titoloPasso(vista)];
    for (let i = 0; i < 3; i++) {
      await avanti(vista);
      titoli.push(titoloPasso(vista));
    }
    expect(titoli).toEqual(["Quando e quanto", "Chi", "Che viaggio", "Dettagli facoltativi"]);
    expect(barra(vista)?.value).toBe(5);
  });

  it("CA-1 con i soli campi obbligatori si arriva a «Crea la mia bozza» in 5 schermate e il profilo si salva", async () => {
    const { vista, salvato } = montaPercorso(nuovaCartella());
    let schermate = 1;
    clic(pulsante(vista, "Scelgo più tardi: sorprendimi"));
    await avanti(vista);
    schermate++;
    scrivi(vista, "dal", "2026-06-12");
    scrivi(vista, "al", "2026-06-14");
    while (![...vista.querySelectorAll("button")].some((b) => b.textContent === "Crea la mia bozza")) {
      await avanti(vista);
      schermate++;
    }
    expect(schermate).toBeLessThanOrEqual(5);
    expect(titoloPasso(vista)).toBe("Dettagli facoltativi");
    clic(pulsante(vista, "Crea la mia bozza"));
    await attendi();
    expect(vista.textContent).toContain("Preferenze salvate");
    expect(salvato()).toEqual({ destinazione: { tipo: "sorprendimi" }, date: { tipo: "precise", inizio: "2026-06-12", fine: "2026-06-14" } });
  });

  it("CA-1 «Salta» c'è solo nei passi con valori predefiniti (3, 4 e 5) e riporta ai predefiniti", async () => {
    const { vista } = montaPercorso(nuovaCartella());
    const ciSalta = () => [...vista.querySelectorAll("button")].some((b) => b.textContent === "Salta");
    expect(ciSalta()).toBe(false);
    clic(pulsante(vista, "Scelgo più tardi: sorprendimi"));
    await avanti(vista);
    expect(ciSalta()).toBe(false);
    scrivi(vista, "dal", "2026-06-12");
    scrivi(vista, "al", "2026-06-14");
    await avanti(vista);
    expect(titoloPasso(vista)).toBe("Chi");
    premi(vista, "Aggiungi uno: Adulti", 1);
    expect(vista.querySelector("[data-campo='viaggiatori']")?.textContent).toContain("3 adulti");
    expect(ciSalta()).toBe(true);
    clic(pulsante(vista, "Salta"));
    expect(titoloPasso(vista)).toBe("Che viaggio");
    expect(vista.querySelector("[data-campo='viaggiatori']")?.textContent).toContain("2 adulti (predefinito)");
    clic(pulsante(vista, "Salta"));
    expect(titoloPasso(vista)).toBe("Dettagli facoltativi");
    clic(pulsante(vista, "Salta"));
    expect(titoloPasso(vista)).toBe("Dettagli facoltativi");
    expect(document.activeElement?.textContent).toBe("Crea la mia bozza");
  });
});

describe("CA-2 cosa manca, in parole semplici", () => {
  it("CA-2 il riepilogo mostra subito cosa manca, con i testi del motore", async () => {
    const { vista } = montaPercorso(nuovaCartella());
    await attendi();
    const mancano = [...vista.querySelectorAll(".riepilogo .riepilogo__mancano li")].map((li) => li.textContent);
    expect(mancano).toEqual(cosaManca({}));
    expect(mancano.length).toBeGreaterThan(0);
    expect(mancano[0]).toBe("Manca la destinazione: scegli dove vuoi andare, oppure lasciati sorprendere.");
  });

  it("CA-2 «Avanti» senza destinazione non avanza e dice cosa fare", async () => {
    const { vista } = montaPercorso(nuovaCartella());
    await avanti(vista);
    expect(titoloPasso(vista)).toBe("Dove");
    const avviso = vista.querySelector(".percorso__passo [role='alert']");
    expect(avviso?.textContent).toContain("Manca la destinazione");
  });

  it("CA-2 «Crea la mia bozza» con il profilo incompleto non salva e rimanda al passo giusto", async () => {
    const { vista, salvato } = montaPercorso(nuovaCartella());
    clic(vista.querySelector<HTMLElement>("[data-campo='orari']") as HTMLElement);
    expect(titoloPasso(vista)).toBe("Dettagli facoltativi");
    clic(pulsante(vista, "Crea la mia bozza"));
    await attendi();
    expect(salvato()).toBeNull();
    const avviso = vista.querySelector(".percorso__passo [role='alert']");
    for (const testo of cosaManca({})) expect(avviso?.textContent).toContain(testo);
    clic(pulsante(vista, "Vai a «Dove»"));
    expect(titoloPasso(vista)).toBe("Dove");
  });

  it("CA-2 con un profilo completo non manca nulla", async () => {
    const { vista } = montaPercorso(nuovaCartella());
    clic(pulsante(vista, "Scelgo più tardi: sorprendimi"));
    await avanti(vista);
    scrivi(vista, "dal", "2026-06-12");
    scrivi(vista, "al", "2026-06-14");
    await attendi();
    expect(testi(vista, "status").join(" ")).not.toContain("Manca");
    expect(vista.querySelector(".riepilogo .riepilogo__mancano")).toBeNull();
  });
});
