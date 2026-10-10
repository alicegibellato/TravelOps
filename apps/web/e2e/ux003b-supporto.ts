/**
 * Supporto alle prove di ST-UX-003B: salva gli screenshot di evidenza (prima/dopo) e misura la pagina nel browser.
 * La cartella di destinazione è `test-results/e2e/screenshots/ST-UX-003B/<fase>/` (ignorata da git; la copia in
 * `evidence/` è un comando esplicito, `npm run e2e:copia-scatti`); la fase è `dopo` salvo
 * `TRAVELOPS_UX003B_FASE=prima` (scatti fatti sul codice precedente alla story).
 */
import { mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import type { Page } from "playwright-core";
import { cartellaScatti, type Flusso } from "./supporto";

export const FASE_SCATTI = process.env.TRAVELOPS_UX003B_FASE === "prima" ? "prima" : "dopo";
const CARTELLA_SCATTI = cartellaScatti("ST-UX-003B", FASE_SCATTI);

/** Salva lo screenshot della pagina (intera) come `<nome>--<larghezza>.png`. */
export async function scatta(f: Flusso, nome: string, intera = true): Promise<string> {
  mkdirSync(CARTELLA_SCATTI, { recursive: true });
  const file = join(CARTELLA_SCATTI, `${nome}--${f.vista.nome}.png`);
  // Le animazioni di ingresso finite: lo scatto mostra la pagina a riposo.
  await f.pagina.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))));
  await f.pagina.screenshot({ path: file, fullPage: intera });
  return file;
}

/** Lo scorrimento orizzontale della pagina: deve essere nullo. */
export async function scorrimentoOrizzontale(pagina: Page): Promise<number> {
  return pagina.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

/** L'identificativo del viaggio nell'indirizzo della bozza (`/bozza/<id>`). */
export function idBozza(indirizzo: string): string {
  const trovato = /\/bozza\/([^/?#]+)/.exec(indirizzo);
  if (trovato?.[1] === undefined) throw new Error(`nessuna bozza nell'indirizzo ${indirizzo}`);
  return decodeURIComponent(trovato[1]);
}

/** Le violazioni axe (tutte le regole WCAG 2.x AA e le buone pratiche, contrasto compreso) a animazioni finite. */
export async function violazioniAxe(pagina: Page): Promise<{ id: string; nodi: string[] }[]> {
  const sorgente = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
  await pagina.addScriptTag({ content: sorgente });
  await pagina.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => null))));
  return pagina.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (c: Document, o: unknown) => Promise<{ violations: { id: string; nodes: { target: unknown[] }[] }[] }> } }).axe;
    const r = await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } });
    return r.violations.map((v) => ({ id: v.id, nodi: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) }));
  });
}

/** La dimensione in pixel del testo base (`--testo-m`), com'è risolta dal browser a questa larghezza. */
export async function testoBasePx(pagina: Page): Promise<number> {
  return pagina.evaluate(() => {
    const sonda = document.createElement("span");
    sonda.style.fontSize = "var(--testo-m)";
    document.body.append(sonda);
    const px = parseFloat(getComputedStyle(sonda).fontSize);
    sonda.remove();
    return px;
  });
}
