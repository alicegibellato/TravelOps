/**
 * Supporto alle prove di ST-UX-004B: gli screenshot vanno in `test-results/e2e/screenshots/ST-UX-004B/` (ignorata da git; la copia in `evidence/` è
 * il comando esplicito `npm run e2e:copia-scatti -- ST-UX-004B`).
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { cartellaScatti, type Flusso } from "./supporto";

const CARTELLA_SCATTI = cartellaScatti("ST-UX-004B");

/** Salva lo screenshot della pagina come `<nome>--<larghezza>.png`, a animazioni finite. */
export async function scatta(f: Flusso, nome: string, intera = true): Promise<string> {
  mkdirSync(CARTELLA_SCATTI, { recursive: true });
  const file = join(CARTELLA_SCATTI, `${nome}--${f.vista.nome}.png`);
  await f.pagina.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))));
  await f.pagina.screenshot({ path: file, fullPage: intera });
  return file;
}
