/**
 * I viaggi che la web app può consultare: la versione 1 di riferimento e le varianti V-IRR, V-FISSO, V-VOLO
 * (dati-di-riferimento.md §4–§5). I file JSON sono quelli del motore (`@travelops/engine/data/reference/*`):
 * entrano nella build, quindi la web app non li scarica da nessuna parte (CA-6).
 */
import catalogo from "@travelops/engine/data/reference/catalogo.json";
import varianteFisso from "@travelops/engine/data/reference/variante-v-fisso.json";
import varianteIrr from "@travelops/engine/data/reference/variante-v-irr.json";
import varianteVolo from "@travelops/engine/data/reference/variante-v-volo.json";
import versione1 from "@travelops/engine/data/reference/versione-1.json";
import { caricaDati, type EsitoDati } from "./carica";

export interface VoceViaggio {
  /** Chiave usata negli indirizzi della web app, per esempio `/viaggi/v-volo`. */
  chiave: string;
  etichetta: string;
  descrizione: string;
  json: unknown;
}

/** Il catalogo di riferimento, in JSON. */
export const CATALOGO_DI_RIFERIMENTO: unknown = catalogo;

export const VIAGGI: readonly VoceViaggio[] = [
  {
    chiave: "versione-1",
    etichetta: "Versione 1",
    descrizione: "Itinerario di riferimento",
    json: versione1,
  },
  {
    chiave: "v-irr",
    etichetta: "Variante V-IRR",
    descrizione: "Il castello (D3-E2) è irrinunciabile",
    json: varianteIrr,
  },
  {
    chiave: "v-fisso",
    etichetta: "Variante V-FISSO",
    descrizione: "Il pranzo sul lago (D2-E4) è a orario fisso",
    json: varianteFisso,
  },
  {
    chiave: "v-volo",
    etichetta: "Variante V-VOLO",
    descrizione: "Con il volo di ritorno (D3-E8, D3-E9)",
    json: varianteVolo,
  },
];

export function trovaVoceViaggio(chiave: string): VoceViaggio | null {
  return VIAGGI.find((voce) => voce.chiave === chiave) ?? null;
}

/** Carica e valida con il motore il viaggio scelto insieme al catalogo di riferimento; `null` se la chiave non esiste. */
export function caricaViaggioScelto(chiave: string): EsitoDati | null {
  const voce = trovaVoceViaggio(chiave);
  return voce === null ? null : caricaDati(voce.json, CATALOGO_DI_RIFERIMENTO);
}
