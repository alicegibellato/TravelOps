"use server";
/**
 * Azioni lato server del percorso guidato (REQ-PREF-001): il browser chiama solo queste, che usano il motore e la
 * base dati locale. Accettano dati semplici e restituiscono un esito, mai un'eccezione.
 */
import { servizioBozza } from "../../src/bozza/server";
import { creaServizioPreferenze } from "../../src/preferenze/servizio";
import type { BozzaProfilo, EsitoCreaBozza, EsitoSalvataggio, ProblemaProfilo } from "../../src/preferenze/tipi";
import { cartellaDati, giornoDelloStato } from "../../src/stato/archivio";
import { usaBaseDati } from "../../src/stato/avvio";

function servizio() {
  const cartella = cartellaDati();
  return creaServizioPreferenze((lavoro) => usaBaseDati(cartella, lavoro), () => giornoDelloStato(cartella));
}

export async function validaPreferenzeAzione(bozza: BozzaProfilo): Promise<ProblemaProfilo[]> {
  return servizio().valida(bozza);
}

export async function salvaPreferenzeAzione(bozza: BozzaProfilo): Promise<EsitoSalvataggio> {
  return servizio().salva(bozza);
}

/** «Crea la mia bozza» (REQ-PLAN-002): il viaggio nuovo con la revisione B1 del generatore. */
export async function creaBozzaAzione(bozza: BozzaProfilo): Promise<EsitoCreaBozza> {
  return servizioBozza().crea(bozza);
}
