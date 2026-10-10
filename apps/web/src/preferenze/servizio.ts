/**
 * Il servizio del percorso guidato lato server (REQ-PREF-001): validazione con il motore (testi in parole semplici e
 * passo da correggere) e salvataggio della bozza nelle impostazioni.
 */
import { validaProfilo } from "@travelops/engine";
import type { BaseDati } from "../basedati";
import { salvaProfilo } from "./profilo";
import type { BozzaProfilo, EsitoSalvataggio, ProblemaProfilo, ServizioPreferenze } from "./tipi";

const MESSAGGIO_ERRORE = "Al momento non riesco a salvare le preferenze. Riprova tra un attimo.";

export function problemiDellaBozza(bozza: BozzaProfilo): ProblemaProfilo[] {
  const esito = validaProfilo(bozza);
  return esito.ok ? [] : esito.problemi;
}

/** `usaDb` apre la base dati, esegue il lavoro e la chiude. */
export function creaServizioPreferenze(usaDb: <T>(lavoro: (db: BaseDati) => T) => T): ServizioPreferenze {
  return {
    valida: (bozza) => Promise.resolve(problemiDellaBozza(bozza)),
    salva: (bozza): Promise<EsitoSalvataggio> => {
      const problemi = problemiDellaBozza(bozza);
      if (problemi.length > 0) return Promise.resolve({ esito: "incompleto", problemi });
      try {
        usaDb((db) => salvaProfilo(db, bozza));
        return Promise.resolve({ esito: "salvato" });
      } catch {
        return Promise.resolve({ esito: "errore", messaggio: MESSAGGIO_ERRORE });
      }
    },
  };
}
