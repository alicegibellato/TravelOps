"use server";
/**
 * Azioni lato server del percorso guidato (REQ-PREF-001): il browser chiama solo queste, che usano il motore e la
 * base dati locale. Accettano dati semplici e restituiscono un esito, mai un'eccezione.
 */
import { creaServizioPreferenze } from "../../src/preferenze/servizio";
import type { BozzaProfilo, EsitoSalvataggio, ProblemaProfilo } from "../../src/preferenze/tipi";
import { cartellaDati } from "../../src/stato/archivio";
import { usaBaseDati } from "../../src/stato/avvio";

function servizio() {
  return creaServizioPreferenze((lavoro) => usaBaseDati(cartellaDati(), lavoro));
}

export async function validaPreferenzeAzione(bozza: BozzaProfilo): Promise<ProblemaProfilo[]> {
  return servizio().valida(bozza);
}

export async function salvaPreferenzeAzione(bozza: BozzaProfilo): Promise<EsitoSalvataggio> {
  return servizio().salva(bozza);
}
