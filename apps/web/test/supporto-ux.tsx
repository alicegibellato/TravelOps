/**
 * Supporto ai test di REQ-UX-001: i file CSS della web app, le pagine principali disegnate per intero (guscio
 * compreso) con React lato server, il testo visibile di una pagina (jsdom) e il browser di sistema per i controlli
 * che hanno bisogno dell'impaginazione vera (larghezze, focus, contrasto calcolato da axe).
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ContenutoElemento, ContenutoGiorno, ContenutoViaggio } from "../src/componenti/Contenuti";
import {
  ContenutoDemo,
  ContenutoProposta,
  ContenutoVersioneElemento,
  ContenutoVersioneGiorno,
  ContenutoVersioneViaggio,
  ContenutoVersioni,
} from "../src/componenti/ContenutiStato";
import { PaginaDestinazione } from "../src/componenti/PaginaDestinazione";
import { PaginaHome } from "../src/componenti/PaginaHome";
import { PaginaStile } from "../src/componenti/PaginaStile";
import { SCENARI } from "../src/dati/scenari";
import { caricaViaggioScelto, VIAGGI } from "../src/dati/viaggi";
import { leggiStato } from "../src/stato/archivio";
import { accettaProposta, avviaScenario, impostaOrologio } from "../src/stato/operazioni";
import { Guscio } from "../src/ui/Guscio";
import { vistaHome } from "../src/viste/home";
import { MESI_DI_PROVA, servizioDiProva } from "./supporto-destinazioni";
import { AZIONI_DEMO, AZIONI_PROPOSTA, nuovaCartella, RIPRISTINA } from "./supporto-stato";

export const CARTELLA_APP = fileURLToPath(new URL("..", import.meta.url));
const richiedi = createRequire(import.meta.url);

/** I file CSS della web app, nell'ordine in cui li importa `app/layout.tsx`. */
export const FILE_CSS_APP = ["src/ui/token.css", "src/ui/ui.css", "app/globals.css"] as const;

export function leggiApp(percorso: string): string {
  return readFileSync(join(CARTELLA_APP, percorso), "utf8");
}

/** Tutti i file della web app con queste estensioni, in `app/` e `src/`. */
export function fileApp(estensioni: RegExp): { file: string; testo: string }[] {
  const trovati: { file: string; testo: string }[] = [];
  const visita = (cartella: string): void => {
    for (const nome of readdirSync(cartella)) {
      const percorso = join(cartella, nome);
      if (statSync(percorso).isDirectory()) visita(percorso);
      else if (estensioni.test(nome)) trovati.push({ file: relative(CARTELLA_APP, percorso).replaceAll("\\", "/"), testo: readFileSync(percorso, "utf8") });
    }
  };
  for (const cartella of ["app", "src"]) visita(join(CARTELLA_APP, cartella));
  return trovati;
}

/** Il CSS completo della pagina: Leaflet e i file della web app (i caratteri restano quelli di sistema). */
export function cssCompleto(): string {
  const leaflet = readFileSync(richiedi.resolve("leaflet/dist/leaflet.css"), "utf8");
  return [leaflet, ...FILE_CSS_APP.map(leggiApp)].join("\n");
}

/** Il documento HTML completo di una pagina: `<html lang="it">`, titolo, guscio e contenuto; con il CSS se richiesto. */
export function paginaCompleta(contenuto: ReactElement, { titolo = "TravelOps", conCss = false } = {}): string {
  const corpo = renderToStaticMarkup(<Guscio>{contenuto}</Guscio>);
  const stile = conCss ? `<style>${cssCompleto()}</style>` : "";
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${titolo}</title>${stile}</head><body>${corpo}</body></html>`;
}

export interface PaginaDiProva {
  nome: string;
  contenuto: ReactElement;
}

/**
 * Le pagine principali dell'app, con dati veri: home, /stile, i viaggi di riferimento (viaggio, ogni giorno, ogni
 * elemento), la Demo, le proposte degli scenari S1–S8, le versioni e le viste di una versione con i problemi accanto
 * agli elementi, gli esiti delle decisioni. Lo stato vive in cartelle temporanee (mai `apps/web/.data`).
 */
export function paginePrincipali({ tuttiGliElementi = true } = {}): PaginaDiProva[] {
  const pagine: PaginaDiProva[] = [
    { nome: "home", contenuto: <PaginaHome viaggi={vistaHome(VIAGGI)} /> },
    { nome: "home senza viaggi", contenuto: <PaginaHome viaggi={[]} /> },
    { nome: "stile", contenuto: <PaginaStile /> },
    { nome: "destinazione", contenuto: <PaginaDestinazione servizio={servizioDiProva()} mesi={MESI_DI_PROVA} /> },
  ];
  for (const voce of VIAGGI) {
    const esito = caricaViaggioScelto(voce.chiave);
    if (esito === null || !esito.ok) throw new Error(`viaggio ${voce.chiave} non valido`);
    pagine.push({ nome: `viaggio ${voce.chiave}`, contenuto: <ContenutoViaggio chiave={voce.chiave} esito={esito} /> });
    for (const giorno of esito.viaggio.giorni) {
      pagine.push({ nome: `giorno ${voce.chiave} ${giorno.data}`, contenuto: <ContenutoGiorno chiave={voce.chiave} esito={esito} data={giorno.data} /> });
      const elementi = tuttiGliElementi ? giorno.elementi : giorno.elementi.slice(0, 2);
      for (const elemento of elementi) {
        pagine.push({
          nome: `elemento ${voce.chiave} ${elemento.id}`,
          contenuto: <ContenutoElemento chiave={voce.chiave} esito={esito} id={elemento.id} />,
        });
      }
    }
  }
  pagine.push({ nome: "demo vuota", contenuto: <ContenutoDemo esito={leggiStato(nuovaCartella())} azioni={AZIONI_DEMO} /> });

  for (const scenario of SCENARI) {
    const cartella = nuovaCartella();
    impostaOrologio(cartella, "2026-06-13", "07:30");
    const avvio = avviaScenario(cartella, scenario.id);
    if (!avvio.ok) throw new Error(avvio.messaggio);
    const stato = () => leggiStato(cartella);
    pagine.push({ nome: `demo con ${scenario.id}`, contenuto: <ContenutoDemo esito={stato()} azioni={AZIONI_DEMO} /> });
    pagine.push({
      nome: `proposta ${scenario.id}`,
      contenuto: <ContenutoProposta esito={stato()} id={avvio.proposta.id} azioni={AZIONI_PROPOSTA} ripristina={RIPRISTINA} />,
    });
    // Le viste della versione 1 con l'imprevisto in corso: problemi accanto agli elementi (METEO_AVVERSO, LUOGO_CHIUSO…).
    for (const data of ["2026-06-13", "2026-06-14"]) {
      pagine.push({
        nome: `versione 1 giorno ${data} con ${scenario.id}`,
        contenuto: <ContenutoVersioneGiorno esito={stato()} numero={1} data={data} ripristina={RIPRISTINA} />,
      });
    }
    // Decisione: accettata (versione nuova, avviso di nessuna modifica) e poi accettata di nuovo (proposta superata).
    accettaProposta(cartella, avvio.proposta.id, "Alice");
    accettaProposta(cartella, avvio.proposta.id, "Bruno");
    pagine.push({
      nome: `proposta ${scenario.id} decisa`,
      contenuto: <ContenutoProposta esito={stato()} id={avvio.proposta.id} azioni={AZIONI_PROPOSTA} ripristina={RIPRISTINA} />,
    });
    pagine.push({ nome: `versioni dopo ${scenario.id}`, contenuto: <ContenutoVersioni esito={stato()} a={null} b={null} ripristina={RIPRISTINA} /> });
    pagine.push({ nome: `versione 2 dopo ${scenario.id}`, contenuto: <ContenutoVersioneViaggio esito={stato()} numero={2} ripristina={RIPRISTINA} /> });
    for (const data of ["2026-06-13", "2026-06-14"]) {
      pagine.push({
        nome: `versione 2 giorno ${data} dopo ${scenario.id}`,
        contenuto: <ContenutoVersioneGiorno esito={stato()} numero={2} data={data} ripristina={RIPRISTINA} />,
      });
    }
    for (const id of avvio.proposta.proposta.modifiche.aggiunti.map((e) => e.id)) {
      pagine.push({
        nome: `versione 2 elemento ${id} dopo ${scenario.id}`,
        contenuto: <ContenutoVersioneElemento esito={stato()} numero={2} id={id} ripristina={RIPRISTINA} />,
      });
    }
    pagine.push({ nome: `versione inesistente dopo ${scenario.id}`, contenuto: <ContenutoVersioneViaggio esito={stato()} numero={9} ripristina={RIPRISTINA} /> });
  }
  return pagine;
}

/** Elementi il cui contenuto non si vede: script, stili, modelli, elementi nascosti. */
const NASCOSTI = "script, style, template, noscript, [hidden], [type='hidden']";

/**
 * Il testo che il viaggiatore vede o sente: i nodi di testo (tranne quelli nascosti e il contenuto dei `<details>`
 * chiusi, a parte il loro titolo) e gli attributi letti a voce o mostrati al passaggio del mouse.
 */
export function testoVisibile(html: string): string {
  const { document } = new JSDOM(html).window;
  const parti: string[] = [document.title];
  const visibile = (nodo: Element | null): boolean => {
    for (let e = nodo; e !== null; e = e.parentElement) {
      if (e.matches(NASCOSTI)) return false;
      const dettagli = e.parentElement;
      if (dettagli?.tagName === "DETAILS" && !dettagli.hasAttribute("open") && e.tagName !== "SUMMARY") return false;
    }
    return true;
  };
  const scorri = document.createTreeWalker(document.body, 4 /* NodeFilter.SHOW_TEXT */);
  for (let nodo = scorri.nextNode(); nodo !== null; nodo = scorri.nextNode()) {
    if (visibile(nodo.parentElement)) parti.push(nodo.textContent ?? "");
  }
  for (const e of document.querySelectorAll("[title], [alt], [placeholder], [aria-label], [aria-valuetext], input[type='submit'][value], input[type='button'][value]")) {
    if (!visibile(e)) continue;
    for (const attributo of ["title", "alt", "placeholder", "aria-label", "aria-valuetext"]) {
      const valore = e.getAttribute(attributo);
      if (valore !== null) parti.push(valore);
    }
    if (e.matches("input[type='submit'], input[type='button']")) parti.push(e.getAttribute("value") ?? "");
  }
  return parti.join("\n");
}

/**
 * Il browser di sistema (Chrome, Edge o Chromium), per i controlli con l'impaginazione vera: nessun browser viene
 * scaricato. `TRAVELOPS_BROWSER` indica un percorso preciso. Nella CI di GitHub (ubuntu-latest) Google Chrome c'è già.
 */
export function trovaBrowser(): string | null {
  const candidati = [
    process.env.TRAVELOPS_BROWSER,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/microsoft-edge",
    "/snap/bin/chromium",
  ];
  return candidati.find((percorso): percorso is string => percorso !== undefined && percorso !== "" && existsSync(percorso)) ?? null;
}

/** Nella CI il browser deve esserci: i controlli nel browser non si saltano mai in silenzio. */
export const IN_CI = process.env.CI !== undefined && process.env.CI !== "" && process.env.CI !== "false";
