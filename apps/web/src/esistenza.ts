/**
 * Se una pagina dinamica di un viaggio, di una bozza o di una versione esiste davvero (TB-XPAGE-004).
 * Il Proxy (`proxy.ts`) la usa prima che la pagina inizi lo streaming: con `loading.tsx` la risposta parte con 200 e un
 * `notFound()` dentro la pagina non può più cambiarlo, così un viaggio, un giorno o una versione inesistenti
 * rispondono 404 con «Pagina non trovata».
 */
import type { Viaggio } from "@travelops/engine";
import { servizioBozza } from "./bozza/server";
import { caricaViaggioDellApp } from "./dati/viaggi-salvati";
import { datiOggi } from "./oggi/operazioni";
import { numeroDaParametro } from "./percorsi";
import { leggiStato } from "./stato/archivio";
import { leggiVersioneStato } from "./viste/versioni";

/** Un percorso senza pagina: il Proxy lo riscrive qui e Next.js risponde con `app/not-found.tsx` e 404. */
export const PERCORSO_NON_TROVATA = "/_non-trovata";

function decodifica(segmento: string): string | null {
  try {
    return decodeURIComponent(segmento);
  } catch {
    return null;
  }
}

/** Il giorno o l'elemento sotto un viaggio: `null` se il resto del percorso non è una sottopagina nota. */
function sottopaginaEsiste(viaggio: Viaggio, resto: readonly string[]): boolean | null {
  const [tipo, valore, ...oltre] = resto;
  if (tipo === undefined) return true;
  if (valore === undefined || oltre.length > 0) return null;
  if (tipo === "giorni") return viaggio.giorni.some((g) => g.data === valore);
  if (tipo === "elementi") return viaggio.giorni.some((g) => g.elementi.some((e) => e.id === valore));
  return null;
}

function viaggioEsiste(cartella: string, chiave: string, resto: readonly string[]): boolean {
  if (resto.length === 1 && resto[0] === "oggi") return datiOggi(cartella, chiave) !== null;
  const caricato = caricaViaggioDellApp(cartella, chiave);
  if (caricato === null) return false;
  // Con dati non validi la pagina mostra gli errori del motore: non è un percorso inesistente.
  if (!caricato.esito.ok) return true;
  return sottopaginaEsiste(caricato.esito.viaggio, resto) ?? true;
}

function versioneEsiste(cartella: string, parametro: string, resto: readonly string[]): boolean {
  const numero = numeroDaParametro(parametro);
  if (numero === null) return false;
  const letto = leggiStato(cartella);
  // Con uno stato non valido la pagina mostra il motivo e «Ripristina».
  if (!letto.ok) return true;
  const versione = leggiVersioneStato(letto.stato, numero);
  if (!versione.ok) return false;
  return sottopaginaEsiste(versione.versione.viaggio, resto) ?? true;
}

/**
 * `false` solo quando il percorso indica un viaggio, una bozza, una versione, un giorno o un elemento che non esiste;
 * ogni altro percorso (e ogni pagina non controllata) è lasciato alla pagina.
 */
export function paginaEsiste(cartella: string, percorso: string): boolean {
  const [radice, chiave, ...resto] = percorso.split("/").filter((s) => s !== "");
  if (chiave === undefined) return true;
  const decodificati = [chiave, ...resto].map(decodifica);
  if (decodificati.some((s) => s === null)) return false;
  const [primo, ...altri] = decodificati as string[];
  const id = primo as string;
  if (radice === "viaggi") return viaggioEsiste(cartella, id, altri);
  if (radice === "bozza") return altri.length > 0 || servizioBozza(cartella).vista(id) !== null;
  if (radice === "versioni") return versioneEsiste(cartella, id, altri);
  return true;
}
