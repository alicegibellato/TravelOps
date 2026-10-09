/**
 * Le istantanee salvate come file nel repository (`packages/sources/snapshots/`, §7.8): un file `<id>.json` per
 * istantanea. Qui finiranno le 3 destinazioni precaricate (ST-CAT-002); la web app le carica nel database al
 * primo avvio. La lettura è sincrona e locale: nessuna rete.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { IstantaneaDestinazione } from "./formato.js";
import { leggiIstantanea, type ProblemaIstantanea } from "./lettore.js";
import type { AvvisoMinimo } from "./minimi.js";

/** Il nome della cartella delle istantanee, dentro il pacchetto. */
export const NOME_CARTELLA_ISTANTANEE = "snapshots";

/** Un'istantanea letta da un file della cartella. */
export interface IstantaneaInCartella {
  /** Il nome del file, per esempio `roma-2026-10-09.json`. */
  file: string;
  istantanea: IstantaneaDestinazione;
  avvisi: AvvisoMinimo[];
}

/** Un problema di un file della cartella. */
export interface ProblemaFile {
  file: string;
  messaggio: string;
  problema?: ProblemaIstantanea;
}

/** Una o più istantanee della cartella non sono valide: il messaggio le elenca tutte, file per file. */
export class ErroreCartellaIstantanee extends Error {
  override readonly name = "ErroreCartellaIstantanee";
  readonly problemi: readonly ProblemaFile[];

  constructor(cartella: string, problemi: readonly ProblemaFile[]) {
    super(`istantanee non valide in ${cartella}: ${problemi.map((p) => `${p.file}: ${p.messaggio}`).join("; ")}`);
    this.problemi = problemi;
  }
}

/**
 * Legge e valida (minimi della §8.1 compresi) tutte le istantanee della cartella indicata (per il repository:
 * `cartellaIstantaneeDelPacchetto()` da `@travelops/sources/pacchetto`, oppure la cartella calcolata dalla web app): i file `.json`, in ordine di
 * nome; gli altri file (per esempio `README.md`) si ignorano. Una cartella che non esiste o senza file `.json` dà
 * un elenco vuoto. Il nome di ogni file deve essere l'identificativo dell'istantanea più `.json`, così due file non
 * possono avere la stessa istantanea.
 * @throws ErroreCartellaIstantanee con tutti i problemi di tutti i file, non solo il primo.
 */
export function leggiCartellaIstantanee(cartella: string): IstantaneaInCartella[] {
  if (!existsSync(cartella) || !statSync(cartella).isDirectory()) return [];
  const file = readdirSync(cartella)
    .filter((nome) => nome.toLowerCase().endsWith(".json"))
    .sort();
  const lette: IstantaneaInCartella[] = [];
  const problemi: ProblemaFile[] = [];
  for (const nome of file) {
    let testo: string;
    try {
      testo = readFileSync(join(cartella, nome), "utf8");
    } catch (errore) {
      problemi.push({ file: nome, messaggio: `il file non si può leggere (${(errore as Error).message})` });
      continue;
    }
    const letta = leggiIstantanea(testo);
    if (!letta.ok) {
      for (const problema of letta.errori) problemi.push({ file: nome, messaggio: problema.messaggio, problema });
      continue;
    }
    const atteso = `${letta.istantanea.id}.json`;
    if (nome !== atteso) {
      problemi.push({ file: nome, messaggio: `il file dell'istantanea "${letta.istantanea.id}" deve chiamarsi ${atteso}` });
      continue;
    }
    lette.push({ file: nome, istantanea: letta.istantanea, avvisi: letta.avvisi });
  }
  if (problemi.length > 0) throw new ErroreCartellaIstantanee(cartella, problemi);
  return lette;
}
