/**
 * REQ-UX-001, funzionalità senza un criterio dedicato: guscio dell'app (intestazione con logo e "I miei viaggi",
 * selettore del tema, layout delle pagine di viaggio) e home (titolo, "Pianifica un viaggio", schede dei viaggi con
 * immagine, date e stato, stato vuoto illustrato).
 */
import { existsSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { ContenutoGiorno } from "../src/componenti/Contenuti";
import { PaginaHome } from "../src/componenti/PaginaHome";
import { VIAGGI } from "../src/dati/viaggi";
import { TESTI_STATO_VIAGGIO } from "../src/testi";
import { BadgeStato } from "../src/ui/Badge";
import { CHIAVE_TEMA, SCRIPT_TEMA } from "../src/ui/tema";
import { periodo } from "../src/viste/etichette";
import { vistaHome } from "../src/viste/home";
import { datiValidi, html } from "./supporto";
import { CARTELLA_APP, fileApp, leggiApp, paginaCompleta } from "./supporto-ux";

function documento(markup: string): Document {
  return new JSDOM(markup).window.document;
}

describe("guscio dell'app", () => {
  it("l'intestazione ha il logo TravelOps, \"I miei viaggi\", le sezioni, l'icona della modalità presentazione e il selettore del tema", () => {
    const d = documento(paginaCompleta(<p>Contenuto</p>));
    const marchio = d.querySelector("header a.ui-intestazione__marchio");
    expect(marchio?.getAttribute("href")).toBe("/");
    expect(marchio?.textContent).toBe("TravelOps");
    expect(marchio?.querySelector("svg[aria-hidden='true']")).not.toBeNull();
    const voci = [...d.querySelectorAll("nav[aria-label='Sezioni'] a")].map((a) => [a.textContent, a.getAttribute("href")]);
    expect(voci).toEqual([
      ["I miei viaggi", "/"],
      ["Itinerario corrente", "/itinerario"],
      ["Versioni", "/versioni"],
    ]);
    // La modalità presentazione è un'icona discreta nell'intestazione (REQ-WEB-004 CA-5).
    const presentazione = d.querySelector("header a.ui-intestazione__presentazione");
    expect(presentazione?.getAttribute("href")).toBe("/demo");
    expect(presentazione?.getAttribute("aria-label")).toBe("Modalità presentazione");
    expect([...d.querySelectorAll("header fieldset input[type='radio']")].map((i) => i.getAttribute("value"))).toEqual(["sistema", "chiaro", "scuro"]);
    expect(d.querySelector("a.ui-salta")?.textContent).toBe("Vai al contenuto");
  });

  it("il layout carica caratteri locali, token e guscio, e applica il tema scelto prima di disegnare la pagina", () => {
    const layout = leggiApp("app/layout.tsx");
    expect(layout).toContain('<html lang="it" suppressHydrationWarning>');
    expect(layout).toContain("<Guscio>{children}</Guscio>");
    expect(layout).toContain("dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }}");
    expect(layout).toContain('import "@fontsource-variable/inter";');
    expect(layout).toContain('import "@fontsource-variable/plus-jakarta-sans";');
    expect(layout).not.toMatch(/next\/font\/google|fonts\.googleapis/);
  });

  it.each([
    ["scuro", "scuro"],
    ["chiaro", "chiaro"],
    ["qualcos'altro", null],
    [null, null],
  ])("lo script del tema con la scelta salvata %s imposta data-tema a %s", (salvato, atteso) => {
    const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", { runScripts: "outside-only", url: "http://localhost/" });
    if (salvato !== null) dom.window.localStorage.setItem(CHIAVE_TEMA, salvato);
    dom.window.eval(SCRIPT_TEMA);
    expect(dom.window.document.documentElement.getAttribute("data-tema")).toBe(atteso);
  });

  it("le pagine di un giorno usano il layout del viaggio: chat, itinerario e mappa, con le schede in basso sul telefono", () => {
    const d = documento(html(<ContenutoGiorno chiave="versione-1" esito={datiValidi("versione-1")} data="2026-06-14" />));
    const layout = d.querySelector(".ui-layout-viaggio");
    expect(layout?.getAttribute("data-chat")).toBe("aperta");
    expect([...d.querySelectorAll("[data-riquadro]")].map((r) => r.getAttribute("data-riquadro"))).toEqual(["chat", "itinerario", "mappa"]);
    expect([...d.querySelectorAll(".ui-schede-basso button")].map((b) => [b.textContent, b.getAttribute("aria-pressed")])).toEqual([
      ["Itinerario", "true"],
      ["Mappa", "false"],
      ["Chat", "false"],
    ]);
    expect(d.querySelector("[data-riquadro='mappa'] .mappa")).not.toBeNull();
  });

  it("i componenti che vanno nel browser non caricano il motore (né il modulo dei testi, che lo usa)", () => {
    const daControllare = fileApp(/\.tsx?$/).filter((f) => /^\s*["']use client["']/.test(f.testo));
    expect(daControllare.length).toBeGreaterThan(8);
    const visitati = new Set<string>();
    const problemi: string[] = [];
    const visita = (file: string, testo: string, catena: string[]): void => {
      if (visitati.has(file)) return;
      visitati.add(file);
      for (const [riga, specificatore] of testo.matchAll(/^import (?!type )[^;]*?from "([^"]+)";/gm)) {
        if (specificatore === undefined) continue;
        const soloTipi = /^import \{\s*(type [\w]+,?\s*)+\}/.test(riga ?? "");
        if (soloTipi) continue;
        if (specificatore === "@travelops/engine" || specificatore.startsWith("@travelops/engine/")) problemi.push([...catena, file].join(" → "));
        if (!specificatore.startsWith(".")) continue;
        const base = normalize(join(dirname(join(CARTELLA_APP, file)), specificatore));
        const trovato = [".ts", ".tsx", "/index.ts"].map((e) => base + e).find((p) => existsSync(p));
        if (trovato === undefined) continue;
        const relativo = trovato.slice(CARTELLA_APP.length).replaceAll("\\", "/").replace(/^\//, "");
        visita(relativo, leggiApp(relativo), [...catena, file]);
      }
    };
    for (const { file, testo } of daControllare) visita(file, testo, []);
    expect(problemi).toEqual([]);
  });
});

describe("home", () => {
  it("titolo accogliente e pulsante principale \"Pianifica un viaggio\" che apre una finestra", () => {
    const d = documento(html(<PaginaHome viaggi={vistaHome(VIAGGI)} />));
    expect(d.querySelector("h1")?.textContent).toBe("Dove si va questa volta?");
    const pianifica = [...d.querySelectorAll("button")].find((b) => b.textContent === "Pianifica un viaggio");
    expect(pianifica?.getAttribute("aria-haspopup")).toBe("dialog");
    expect(pianifica?.className).toContain("ui-pulsante--primario");
    expect(d.querySelector("h2")?.textContent).toBe("I miei viaggi");
  });

  it("una scheda per viaggio, con immagine (illustrazione), titolo, variante, date, giorni e viaggiatori, stato e link", () => {
    const d = documento(html(<PaginaHome viaggi={vistaHome(VIAGGI)} />));
    const schede = [...d.querySelectorAll<HTMLElement>(".home__griglia > li.scheda-viaggio")];
    expect(schede.map((s) => s.dataset.viaggio)).toEqual(["versione-1", "v-irr", "v-fisso", "v-volo"]);
    for (const scheda of schede) {
      expect(scheda.querySelector(".ui-illustrazione[aria-hidden='true'] svg")).not.toBeNull();
      expect(scheda.querySelector("h3 a")?.getAttribute("href")).toBe(`/viaggi/${scheda.dataset.viaggio ?? ""}`);
      expect(scheda.querySelector("h3")?.textContent).toMatch(/^Weekend sul Garda: /);
      expect(scheda.textContent).toContain("12–14 giugno 2026");
      expect(scheda.textContent).toContain("3 giorni · 2 viaggiatori");
      expect(scheda.querySelector("[data-stato='confermato']")?.textContent).toBe("Confermato");
    }
    expect(schede.map((s) => s.querySelector(".scheda-viaggio__variante")?.textContent)).toEqual([
      "Itinerario di riferimento",
      "Castello irrinunciabile",
      "Pranzo a orario fisso",
      "Volo di ritorno",
    ]);
  });

  it("senza viaggi la home mostra lo stato vuoto illustrato, con il pulsante per pianificare", () => {
    const d = documento(html(<PaginaHome viaggi={[]} />));
    const vuoto = d.querySelector(".ui-stato-vuoto");
    expect(vuoto?.querySelector("svg[aria-hidden='true']")).not.toBeNull();
    expect(vuoto?.querySelector("h3")?.textContent).toBe("Non hai ancora viaggi");
    expect([...(vuoto?.querySelectorAll("button") ?? [])].map((b) => b.textContent)).toEqual(["Pianifica un viaggio"]);
    expect(d.querySelector(".home__griglia")).toBeNull();
  });

  it("i quattro stati del viaggio hanno la loro etichetta: Bozza, Confermato, In corso, Concluso", () => {
    const stati = ["bozza", "confermato", "in_corso", "concluso"] as const;
    expect(stati.map((s) => documento(html(<BadgeStato stato={s} />)).body.textContent)).toEqual(["Bozza", "Confermato", "In corso", "Concluso"]);
    expect(Object.keys(TESTI_STATO_VIAGGIO)).toEqual([...stati]);
  });

  it.each([
    ["2026-06-12", "2026-06-14", "12–14 giugno 2026"],
    ["2026-06-30", "2026-07-02", "30 giugno – 2 luglio 2026"],
    ["2026-12-30", "2027-01-02", "30 dicembre 2026 – 2 gennaio 2027"],
    ["2026-06-12", "2026-06-12", "12 giugno 2026"],
  ])("il periodo dal %s al %s si legge \"%s\"", (inizio, fine, atteso) => {
    expect(periodo(inizio, fine)).toBe(atteso);
  });
});
