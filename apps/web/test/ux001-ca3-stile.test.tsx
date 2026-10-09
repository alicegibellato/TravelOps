/**
 * REQ-UX-001 CA-3: la pagina /stile mostra tutti i componenti della §6.2 in tema chiaro e scuro; non è collegata dal
 * menu.
 */
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { metadata } from "../app/stile/page";
import { PaginaStile } from "../src/componenti/PaginaStile";
import { COMPONENTI_DESIGN_SYSTEM } from "../src/ui/catalogo";
import { html } from "./supporto";
import { blocchi, dichiarazioni } from "./supporto-css";
import { leggiApp, paginaCompleta } from "./supporto-ux";

/** I componenti minimi della §6.2 di REQ-UX-001, come li elenca il requisito. */
const COMPONENTI_DEL_REQUISITO = [
  "pulsanti",
  "chip",
  "slider",
  "date",
  "contatori",
  "schede-attivita",
  "linea-tempo",
  "mappa",
  "chat",
  "proposta",
  "badge",
  "avvisi",
  "finestre",
  "notifiche",
  "scheletro",
  "stato-vuoto",
];

/** I componenti aggiunti dopo la §6.2 (REQ-CHAT-001), mostrati in coda su /stile. */
const COMPONENTI_AGGIUNTI = ["schede-chat", "stati-chat"];

/** Che cosa deve esserci, nel DOM, per dire che il componente è mostrato davvero (non solo il titolo). */
const PROVE: Record<string, string> = {
  pulsanti: ".ui-pulsante--primario, .ui-pulsante--secondario, .ui-pulsante--testo",
  chip: ".ui-chip[aria-pressed]",
  slider: "[role='slider']",
  date: "input[type='date']",
  contatori: ".ui-contatore button",
  "schede-attivita": ".ui-scheda-attivita",
  "linea-tempo": ".ui-linea-tempo .ui-linea-tempo__connettore",
  mappa: ".mappa",
  chat: ".ui-chat .ui-chat__bolla--viaggiatore",
  proposta: ".ui-proposta .ui-proposta__cambio--rimosso",
  badge: "[data-stato='bozza'], [data-stato='confermato'], [data-stato='in_corso'], [data-stato='concluso']",
  avvisi: ".ui-avviso--errore",
  finestre: "button[aria-haspopup='dialog']",
  notifiche: ".ui-notifiche, button",
  scheletro: ".ui-scheletro[aria-busy='true']",
  "stato-vuoto": ".ui-stato-vuoto svg",
  "schede-chat": ".ui-scheda-chat--preferenze, .ui-scheda-chat--bozza, .ui-scheda-chat--conferma",
  "stati-chat": ".ui-chat__benvenuto, .ui-chat__scrive, .ui-scheletro, .ui-avviso--errore, .ui-chat__non-disponibile",
};

describe("CA-3 la pagina /stile mostra tutti i componenti in tema chiaro e scuro", () => {
  it("CA-3 il catalogo dei componenti è quello della §6.2", () => {
    expect(COMPONENTI_DESIGN_SYSTEM.map((c) => c.id)).toEqual([...COMPONENTI_DEL_REQUISITO, ...COMPONENTI_AGGIUNTI]);
  });

  it("CA-3 la pagina ha un pannello in tema chiaro e uno in tema scuro, ognuno con tutti i componenti", () => {
    const { document } = new JSDOM(html(<PaginaStile />)).window;
    const pannelli = [...document.querySelectorAll<HTMLElement>("[data-tema]")];
    expect(pannelli.map((p) => p.dataset.tema)).toEqual(["chiaro", "scuro"]);
    for (const pannello of pannelli) {
      const sezioni = [...pannello.querySelectorAll<HTMLElement>("[data-componente]")];
      expect(sezioni.map((s) => s.dataset.componente)).toEqual([...COMPONENTI_DEL_REQUISITO, ...COMPONENTI_AGGIUNTI]);
      for (const sezione of sezioni) {
        const prova = PROVE[sezione.dataset.componente ?? ""] ?? "";
        expect([sezione.dataset.componente, sezione.querySelectorAll(prova).length > 0]).toEqual([sezione.dataset.componente, true]);
      }
    }
    // Le varianti richieste: tre pulsanti, i quattro stati del viaggio, i tre cambi della proposta.
    const chiaro = pannelli[0];
    expect(chiaro?.querySelectorAll(".ui-pulsante--primario").length).toBeGreaterThan(0);
    expect(chiaro?.querySelectorAll(".ui-pulsante--secondario").length).toBeGreaterThan(0);
    expect(chiaro?.querySelectorAll(".ui-pulsante--testo").length).toBeGreaterThan(0);
    expect([...(chiaro?.querySelectorAll<HTMLElement>("[data-stato]") ?? [])].map((b) => b.dataset.stato)).toEqual(["bozza", "confermato", "in_corso", "concluso"]);
    for (const tipo of ["rimosso", "aggiunto", "spostato"]) expect(chiaro?.querySelector(`.ui-proposta__cambio--${tipo}`)).not.toBeNull();
    expect(chiaro?.querySelectorAll("[data-componente='avvisi'] .ui-avviso--info, [data-componente='avvisi'] .ui-avviso--successo, [data-componente='avvisi'] .ui-avviso--attenzione, [data-componente='avvisi'] .ui-avviso--errore")).toHaveLength(4);
  });

  it("CA-3 un contenitore con data-tema riceve i token del suo tema (dichiarati anche lì, non solo su :root)", () => {
    const token = leggiApp("src/ui/token.css");
    const radice = blocchi(token, ":root,\n[data-tema]")[0] ?? "";
    expect(dichiarazioni(radice).filter((d) => d.proprieta.startsWith("--colore-")).length).toBeGreaterThan(40);
    expect(dichiarazioni(blocchi(token, '[data-tema="chiaro"]')[0] ?? "")).toContainEqual({ proprieta: "color-scheme", valore: "light" });
    expect(dichiarazioni(blocchi(token, '[data-tema="scuro"]')[0] ?? "")).toContainEqual({ proprieta: "color-scheme", valore: "dark" });
    // Ogni pannello ha sfondo e testo propri, così si vede il tema anche dentro una pagina dell'altro.
    const pagine = dichiarazioni(blocchi(leggiApp("app/globals.css"), ".stile__tema {")[0] ?? "");
    expect(pagine).toContainEqual({ proprieta: "background", valore: "var(--colore-sfondo)" });
    expect(pagine).toContainEqual({ proprieta: "color", valore: "var(--colore-testo)" });
  });

  it("CA-3 /stile è una pagina interna: non è nel menu e non si indicizza", () => {
    const pagina = paginaCompleta(<p>Contenuto</p>);
    expect(pagina).not.toContain('href="/stile"');
    expect(leggiApp("src/ui/Navigazione.tsx")).not.toContain("/stile");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
