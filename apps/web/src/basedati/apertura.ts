/**
 * Apertura della base dati (REQ-DATA-001): crea il file se non c'è, applica le migrazioni mancanti e, la prima volta,
 * esegue il lavoro del primo avvio (per la web app: carica i viaggi demo e importa il vecchio file JSON).
 */
import { apriFile, inTransazione, type BaseDati } from "./connessione";
import { leggiImpostazione, scriviImpostazione } from "./impostazioni";
import { applicaMigrazioni } from "./migrazioni";

/** L'impostazione che segna il primo avvio come fatto: da lì in poi non si ripete. */
export const CHIAVE_PRIMO_AVVIO = "primo_avvio";

/** Apre la base dati nella cartella, aggiornata all'ultima migrazione. Chi la apre la chiude (`db.close()`). */
export function apriBaseDati(cartella: string, primoAvvio?: (db: BaseDati) => void): BaseDati {
  const db = apriFile(cartella);
  try {
    applicaMigrazioni(db);
    if (primoAvvio !== undefined && leggiImpostazione(db, CHIAVE_PRIMO_AVVIO) === undefined) {
      inTransazione(db, () => {
        // Riletta dentro la transazione: un'altra richiesta potrebbe averlo appena fatto.
        if (leggiImpostazione(db, CHIAVE_PRIMO_AVVIO) !== undefined) return;
        primoAvvio(db);
        scriviImpostazione(db, CHIAVE_PRIMO_AVVIO, { fatto: true });
      });
    }
    return db;
  } catch (errore) {
    db.close();
    throw errore;
  }
}

/** Apre la base dati, esegue `lavoro` e la chiude, anche in caso di errore. */
export function conBaseDati<T>(cartella: string, lavoro: (db: BaseDati) => T, primoAvvio?: (db: BaseDati) => void): T {
  const db = apriBaseDati(cartella, primoAvvio);
  try {
    return lavoro(db);
  } finally {
    db.close();
  }
}
