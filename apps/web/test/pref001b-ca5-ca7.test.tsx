// @vitest-environment jsdom
/**
 * ST-PREF-001B, CA-5 e CA-7 di REQ-PREF-001: riepilogo vivo e modificabile, percorso da tastiera e su telefono;
 * «Sorprendimi» propone 3 destinazioni e la scelta diventa la destinazione.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { attendi, clic, preparaChat, pulsante } from "./supporto-chat";
import { avanti, campo, montaPercorso, preparaPercorso, scegli, scrivi, titoloPasso } from "./supporto-preferenze";
import { nuovaCartella } from "./supporto-stato";

preparaChat();
preparaPercorso();

const voce = (vista: HTMLElement, campo: string) => vista.querySelector<HTMLButtonElement>(`.riepilogo [data-campo='${campo}']`);

describe("CA-5 riepilogo vivo", () => {
  it("CA-5 il riepilogo si aggiorna a ogni scelta e ogni voce riporta al suo passo", async () => {
    const { vista } = montaPercorso(nuovaCartella(), [{ id: "x", nome: "Roma" }]);
    expect(voce(vista, "destinazione")?.textContent).toContain("Da scegliere");
    clic(pulsante(vista, "Roma"));
    expect(voce(vista, "destinazione")?.textContent).toContain("Roma");
    await avanti(vista);
    scegli(vista, "modo-date", "mese");
    scrivi(vista, "mese", "2026-08");
    expect(voce(vista, "date")?.textContent).toContain("agosto 2026");
    expect(voce(vista, "durata")?.textContent).toContain("3 giorni");
    // Un tocco sulla voce porta al passo in cui si modifica.
    clic(voce(vista, "destinazione") as HTMLElement);
    expect(titoloPasso(vista)).toBe("Dove");
    clic(voce(vista, "budget") as HTMLElement);
    expect(titoloPasso(vista)).toBe("Che viaggio");
    scegli(vista, "budget", "€€€");
    expect(voce(vista, "budget")?.textContent).toContain("Alto");
    clic(voce(vista, "date") as HTMLElement);
    expect(titoloPasso(vista)).toBe("Quando e quanto");
  });

  it("CA-5 tornando a un passo i valori già scelti ci sono ancora", async () => {
    const { vista } = montaPercorso(nuovaCartella());
    clic(pulsante(vista, "Scelgo più tardi: sorprendimi"));
    await avanti(vista);
    scrivi(vista, "dal", "2026-06-12");
    scrivi(vista, "al", "2026-06-14");
    await avanti(vista);
    clic(pulsante(vista, "Indietro"));
    expect((vista.querySelector("[name='dal']") as HTMLInputElement).value).toBe("2026-06-12");
    expect((vista.querySelector("[name='al']") as HTMLInputElement).value).toBe("2026-06-14");
  });
});

describe("CA-5 tastiera", () => {
  it("CA-5 a ogni cambio di passo il focus va al titolo del passo", async () => {
    const { vista } = montaPercorso(nuovaCartella());
    expect(document.activeElement).toBe(document.body);
    clic(pulsante(vista, "Scelgo più tardi: sorprendimi"));
    await avanti(vista);
    expect(document.activeElement?.id).toBe("percorso-titolo");
    expect(document.activeElement?.textContent).toBe("Quando e quanto");
    expect(document.activeElement?.getAttribute("tabindex")).toBe("-1");
    clic(pulsante(vista, "Indietro"));
    expect(document.activeElement?.textContent).toBe("Dove");
  });

  it("CA-5 tutto è fatto di controlli nativi raggiungibili con Tab, ognuno con il suo nome", async () => {
    const { vista } = montaPercorso(nuovaCartella(), [{ id: "x", nome: "Roma" }]);
    clic(pulsante(vista, "Scelgo più tardi: sorprendimi"));
    for (let passo = 1; passo <= 5; passo++) {
      expect(vista.querySelector("[tabindex]:not(#percorso-titolo):not([role='slider'])")).toBeNull();
      for (const c of vista.querySelectorAll<HTMLElement>("input, select, button")) {
        const nome =
          c.getAttribute("aria-label") ??
          c.closest("label")?.textContent ??
          c.textContent ??
          "";
        expect(nome.trim(), c.outerHTML).not.toBe("");
        expect(Number(c.getAttribute("tabindex") ?? 0)).toBeLessThanOrEqual(0);
      }
      expect(vista.querySelector("progress")?.getAttribute("aria-label")).toBe(`Passo ${passo} di 5`);
      if (passo === 1) {
        await avanti(vista);
        scrivi(vista, "dal", "2026-06-12");
        scrivi(vista, "al", "2026-06-14");
      } else if (passo < 5) await avanti(vista);
    }
  });

  it("CA-5 i gruppi di scelta hanno la legenda e i chip dicono se sono scelti", async () => {
    const { vista } = montaPercorso(nuovaCartella());
    clic(pulsante(vista, "Scelgo più tardi: sorprendimi"));
    await avanti(vista);
    scrivi(vista, "dal", "2026-06-12");
    scrivi(vista, "al", "2026-06-14");
    await avanti(vista);
    await avanti(vista);
    expect([...vista.querySelectorAll("fieldset > legend")].map((l) => l.textContent)).toEqual(["Che ritmo preferisci?", "Che forma fisica hai?", "Quanto vuoi spendere?"]);
    const stili = [...vista.querySelectorAll("[role='group'][aria-label='Che stile di viaggio ti piace?'] button")];
    expect(stili.every((b) => b.getAttribute("aria-pressed") !== null)).toBe(true);
    expect(stili.filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.textContent)).toEqual(["Cultura", "Natura"]);
  });
});

describe("CA-5 telefono", () => {
  const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

  it("CA-5 su schermo largo il riepilogo sta a lato, sotto i 768 px è in alto e comprimibile", () => {
    const { vista } = montaPercorso(nuovaCartella());
    const riepilogo = vista.querySelector(".percorso > .riepilogo");
    expect(riepilogo).not.toBeNull();
    expect(vista.querySelector(".percorso")?.firstElementChild).toBe(riepilogo);
    expect(riepilogo?.querySelector("details[open] > summary")).not.toBeNull();
    expect(css).toMatch(/@media \(min-width: 768px\) \{\s*\.percorso \{\s*grid-template-columns: minmax\(0, 1fr\) 20rem;/);
    expect(css).toMatch(/\.percorso \{\s*display: grid;/);
  });

  it("CA-5 i blocchi del percorso non hanno larghezze fisse che vadano oltre lo schermo", () => {
    const inizio = css.indexOf("Percorso guidato delle preferenze");
    const blocco = css.slice(inizio);
    expect(blocco).not.toMatch(/^\s+width:\s*\d+(px|rem)/m);
    expect(blocco).not.toMatch(/^\s+min-width:\s*\d+(px|rem)/m);
  });
});

describe("CA-7 Sorprendimi nel passo Dove", () => {
  it("CA-7 propone 3 destinazioni e la scelta diventa la destinazione del profilo", async () => {
    const { vista, salvato } = montaPercorso(nuovaCartella());
    clic(pulsante(vista, "Sorprendimi"));
    await attendi();
    const proposte = [...vista.querySelectorAll("[data-proposta]")];
    expect(proposte).toHaveLength(3);
    clic(pulsante(vista, "Scegli Beta"));
    expect(vista.querySelector(".percorso__scelta-fatta")?.textContent).toBe("Hai scelto: Beta.");
    expect(voce(vista, "destinazione")?.textContent).toContain("Beta");
    await avanti(vista);
    // REQ-CHAT-003 CA-5: il mese chiesto da Sorprendimi è già nel profilo, il passo 2 non lo richiede.
    expect((campo(vista, "mese") as HTMLSelectElement).value).toBe("2026-05");
    for (let i = 0; i < 3; i++) await avanti(vista);
    clic(pulsante(vista, "Crea la mia bozza"));
    await attendi();
    expect(salvato()?.destinazione).toEqual({ tipo: "luogo", nome: "Beta", riferimento: "prova:beta" });
    expect(salvato()?.date).toEqual({ tipo: "mese", mese: "2026-05" });
  });
});
