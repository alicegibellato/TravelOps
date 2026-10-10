/**
 * Il profilo delle preferenze salvato nelle impostazioni (REQ-DATA-001): la bozza raccolta dal percorso guidato,
 * così com'è, per chi la riprende (generatore, chat).
 */
import type { BozzaProfilo } from "@travelops/engine";
import { leggiImpostazione, scriviImpostazione, type BaseDati } from "../basedati";

/** Chiave dell'impostazione che contiene la bozza del profilo. */
export const CHIAVE_PROFILO = "profilo-preferenze";

/** La bozza salvata, oppure `null` se non ce n'è ancora una. */
export function leggiProfilo(db: BaseDati): BozzaProfilo | null {
  const valore = leggiImpostazione(db, CHIAVE_PROFILO);
  return typeof valore === "object" && valore !== null && !Array.isArray(valore) ? (valore as BozzaProfilo) : null;
}

/** Salva (o sostituisce) la bozza del profilo. */
export function salvaProfilo(db: BaseDati, bozza: BozzaProfilo): void {
  scriviImpostazione(db, CHIAVE_PROFILO, bozza);
}
