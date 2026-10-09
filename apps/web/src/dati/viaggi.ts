/**
 * I viaggi che la web app può consultare: la versione 1 di riferimento e le varianti V-IRR, V-FISSO, V-VOLO
 * (dati-di-riferimento.md §4–§5). Etichetta e descrizione sono testo per il viaggiatore: niente codici
 * (REQ-UX-001, CA-6); la chiave resta negli indirizzi. I file JSON sono quelli del motore (`@travelops/engine/data/reference/*`):
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
    etichetta: "Itinerario di riferimento",
    descrizione: "Il programma originale del weekend",
    json: versione1,
  },
  {
    chiave: "v-irr",
    etichetta: "Castello irrinunciabile",
    descrizione: "La visita al Castello del Buonconsiglio è irrinunciabile",
    json: varianteIrr,
  },
  {
    chiave: "v-fisso",
    etichetta: "Pranzo a orario fisso",
    descrizione: "Il pranzo sul lago di sabato è a orario fisso",
    json: varianteFisso,
  },
  {
    chiave: "v-volo",
    etichetta: "Volo di ritorno",
    descrizione: "Con il viaggio in auto verso l'aeroporto e il volo di ritorno di domenica sera",
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
