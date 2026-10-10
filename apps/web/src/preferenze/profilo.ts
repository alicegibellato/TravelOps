/**
 * Il profilo delle preferenze salvato nelle impostazioni (REQ-DATA-001): la bozza raccolta dal percorso guidato,
 * così com'è, per chi la riprende (generatore, chat).
 *
 * REQ-CHAT-003: il profilo condiviso tra filtri e chat appartiene al viaggio che lo ha usato. Quando nasce un nuovo
 * viaggio (Pianifica aperta senza conversazione, o una conversazione nuova senza viaggio) restano solo le preferenze
 * personali (ritmo, forma fisica, pasti); destinazione, date, viaggiatori e il resto ripartono da zero.
 */
import type { BozzaProfilo } from "@travelops/engine";
import { eliminaImpostazione, leggiImpostazione, scriviImpostazione, type BaseDati } from "../basedati";

/** Chiave dell'impostazione che contiene la bozza del profilo. */
export const CHIAVE_PROFILO = "profilo-preferenze";

/** Chiave dell'impostazione con il viaggio a cui appartiene il profilo condiviso. */
export const CHIAVE_VIAGGIO_DEL_PROFILO = "profilo-preferenze-viaggio";

/** Le preferenze personali che passano da un viaggio al successivo. */
export const PREFERENZE_PERSONALI = ["ritmo", "formaFisica", "pasti"] as const satisfies readonly (keyof BozzaProfilo)[];

/** La bozza salvata, oppure `null` se non ce n'è ancora una. */
export function leggiProfilo(db: BaseDati): BozzaProfilo | null {
  const valore = leggiImpostazione(db, CHIAVE_PROFILO);
  return typeof valore === "object" && valore !== null && !Array.isArray(valore) ? (valore as BozzaProfilo) : null;
}

/** Salva (o sostituisce) la bozza del profilo. */
export function salvaProfilo(db: BaseDati, bozza: BozzaProfilo): void {
  scriviImpostazione(db, CHIAVE_PROFILO, bozza);
}

/** Ricorda che il profilo condiviso ora appartiene a questo viaggio. */
export function legaProfiloAlViaggio(db: BaseDati, viaggioId: string): void {
  scriviImpostazione(db, CHIAVE_VIAGGIO_DEL_PROFILO, viaggioId);
}

/** Il viaggio a cui appartiene il profilo condiviso, oppure `null`. */
export function viaggioDelProfilo(db: BaseDati): string | null {
  const valore = leggiImpostazione(db, CHIAVE_VIAGGIO_DEL_PROFILO);
  return typeof valore === "string" ? valore : null;
}

/** Il profilo con le sole preferenze personali. */
export function soloPreferenzePersonali(profilo: BozzaProfilo): BozzaProfilo {
  const personale: BozzaProfilo = {};
  for (const campo of PREFERENZE_PERSONALI) {
    if (profilo[campo] !== undefined) (personale as Record<string, unknown>)[campo] = structuredClone(profilo[campo]);
  }
  return personale;
}

/**
 * Comincia un nuovo viaggio: se il profilo condiviso appartiene già a un viaggio, tiene solo le preferenze personali e
 * lo libera. Un profilo non ancora usato da un viaggio (filtri compilati prima di scrivere in chat) resta com'è.
 * Restituisce vero se ha azzerato il profilo.
 */
export function iniziaNuovoViaggio(db: BaseDati): boolean {
  if (viaggioDelProfilo(db) === null) return false;
  const profilo = leggiProfilo(db);
  salvaProfilo(db, profilo === null ? {} : soloPreferenzePersonali(profilo));
  eliminaImpostazione(db, CHIAVE_VIAGGIO_DEL_PROFILO);
  return true;
}
