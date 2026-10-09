/**
 * La base dati della web app (REQ-DATA-001) aperta con il lavoro del primo avvio: la prima volta che si apre su un
 * clone pulito, il file viene creato, le migrazioni applicate, i viaggi demo caricati (CA-1) e il vecchio file JSON
 * di REQ-WEB-002, se c'è, importato (CA-5). Dalle volte successive si applicano solo le migrazioni mancanti.
 */
import { conBaseDati, type BaseDati } from "../basedati";
import { importaStatoJson } from "./importazione";
import { salvaStatoDemo } from "./presentazione";
import { statoIniziale } from "./stato";
import { ricaricaViaggiDemo } from "./viaggi-demo";

/** Il lavoro del primo avvio, per la base dati in quella cartella. */
export function primoAvvio(cartella: string): (db: BaseDati) => void {
  return (db) => {
    ricaricaViaggiDemo(db);
    salvaStatoDemo(db, statoIniziale());
    importaStatoJson(db, cartella);
  };
}

/** Apre la base dati nella cartella (con il primo avvio, se serve), esegue `lavoro` e la chiude. */
export function usaBaseDati<T>(cartella: string, lavoro: (db: BaseDati) => T): T {
  return conBaseDati(cartella, lavoro, primoAvvio(cartella));
}
