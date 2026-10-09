/**
 * Caricamento e validazione dei dati con il motore (REQ-WEB-001, CA-5).
 * La web app non controlla nulla da sé: usa `caricaCatalogo`, `caricaViaggio` e `validaItinerario`
 * di `@travelops/engine` (REQ-ITIN-001) e, se il motore trova errori, li mostra invece della vista.
 */
import {
  caricaCatalogo,
  caricaViaggio,
  validaItinerario,
  type Catalogo,
  type ErroreValidazione,
  type Viaggio,
} from "@travelops/engine";

/** Da quale documento viene un errore. */
export type OrigineErrore = "catalogo" | "viaggio";

export interface ErroreDati extends ErroreValidazione {
  origine: OrigineErrore;
}

/** Esito del caricamento: viaggio e catalogo validi, oppure tutti gli errori trovati dal motore. */
export type EsitoDati =
  | { ok: true; viaggio: Viaggio; catalogo: Catalogo }
  | { ok: false; errori: ErroreDati[] };

function conOrigine(origine: OrigineErrore, errori: readonly ErroreValidazione[]): ErroreDati[] {
  return errori.map((errore) => ({ ...errore, origine }));
}

/**
 * Carica catalogo e viaggio dal JSON (testo o valore già decodificato) e valida l'itinerario
 * rispetto al catalogo. Non solleva eccezioni: con dati non validi restituisce gli errori.
 */
export function caricaDati(jsonViaggio: unknown, jsonCatalogo: unknown): EsitoDati {
  const catalogo = caricaCatalogo(jsonCatalogo);
  if (!catalogo.ok) {
    // Senza un catalogo valido il viaggio si controlla solo nella struttura, per mostrare tutti gli errori in una volta.
    const viaggio = caricaViaggio(jsonViaggio);
    return {
      ok: false,
      errori: [...conOrigine("catalogo", catalogo.errori), ...(viaggio.ok ? [] : conOrigine("viaggio", viaggio.errori))],
    };
  }
  const viaggio = caricaViaggio(jsonViaggio, catalogo.valore);
  if (!viaggio.ok) return { ok: false, errori: conOrigine("viaggio", viaggio.errori) };
  const errori = validaItinerario(viaggio.valore, catalogo.valore);
  if (errori.length > 0) return { ok: false, errori: conOrigine("viaggio", errori) };
  return { ok: true, viaggio: viaggio.valore, catalogo: catalogo.valore };
}
