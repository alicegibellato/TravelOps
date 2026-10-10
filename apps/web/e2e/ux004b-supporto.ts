/**
 * Supporto alle prove di ST-UX-004B: gli screenshot di evidenza vanno in `evidence/ST-UX-004B/screenshots/`.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { CARTELLA_APP, type Flusso } from "./supporto";

const CARTELLA_SCATTI = join(CARTELLA_APP, "..", "..", "evidence", "ST-UX-004B", "screenshots");

/** Salva lo screenshot della pagina come `<nome>--<larghezza>.png`, a animazioni finite. */
export async function scatta(f: Flusso, nome: string, intera = true): Promise<string> {
  mkdirSync(CARTELLA_SCATTI, { recursive: true });
  const file = join(CARTELLA_SCATTI, `${nome}--${f.vista.nome}.png`);
  await f.pagina.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))));
  await f.pagina.screenshot({ path: file, fullPage: intera });
  return file;
}
