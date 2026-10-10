/**
 * Le destinazioni candidate di Sorprendimi: l'elenco sta solo in `packages/sources/candidates.json` (REQ-CAT-002) e
 * si legge e si valida con `@travelops/sources`. Qui non c'è nessuna destinazione scritta nel codice.
 */
import elencoGrezzo from "@travelops/sources/candidates.json";
import { leggiCandidati, type DestinazioneCandidata } from "@travelops/sources";

/** Le candidate configurate. @throws se il file non è valido (con tutti i problemi). */
export function candidateConfigurate(): DestinazioneCandidata[] {
  const letto = leggiCandidati(elencoGrezzo);
  if (!letto.ok) throw new Error(`candidates.json non è valido: ${letto.problemi.join(" ")}`);
  return letto.elenco.candidati;
}
