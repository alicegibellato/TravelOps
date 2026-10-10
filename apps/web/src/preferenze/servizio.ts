/**
 * Il servizio del percorso guidato lato server (REQ-PREF-001): validazione con il motore (testi in parole semplici e
 * passo da correggere) e salvataggio della bozza nelle impostazioni.
 */
import { validaProfilo } from "@travelops/engine";
import type { BaseDati } from "../basedati";
import { salvaProfilo } from "./profilo";
import type { BozzaProfilo, EsitoSalvataggio, ProblemaProfilo, ServizioPreferenze } from "./tipi";

const MESSAGGIO_ERRORE = "Al momento non riesco a salvare le preferenze. Riprova tra un attimo.";

export function problemiDellaBozza(bozza: BozzaProfilo, oggi?: string): ProblemaProfilo[] {
  const esito = validaProfilo(bozza, oggi === undefined ? {} : { oggi });
  return esito.ok ? [] : esito.problemi;
}

/**
 * `usaDb` apre la base dati, esegue il lavoro e la chiude. `oggi` dà il giorno corrente dell'orologio dell'app
 * (`AAAA-MM-GG`): con la partenza prima di oggi la bozza non è valida (TB-PREF-007).
 */
export function creaServizioPreferenze(
  usaDb: <T>(lavoro: (db: BaseDati) => T) => T,
  oggi?: () => string | undefined,
): ServizioPreferenze {
  return {
    valida: (bozza) => Promise.resolve(problemiDellaBozza(bozza, oggi?.())),
    salva: (bozza): Promise<EsitoSalvataggio> => {
      const problemi = problemiDellaBozza(bozza, oggi?.());
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
