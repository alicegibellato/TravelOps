/**
 * Le 3 destinazioni precaricate della §8.1 (`dati-di-riferimento-estensioni.md`): come si cercano, quale area di
 * Nominatim è quella giusta e con quale nome e identificativo si salvano le loro istantanee. Sono costruite con la
 * sorgente reale (`npm run istantanee --workspace @travelops/sources`) e salvate in `snapshots/`.
 */
export interface DestinazionePrecaricata {
  /** Prima parte dell'identificativo dell'istantanea: `<idBase>-<AAAA-MM-GG>`. */
  idBase: string;
  /** Il nome da mostrare, quello della §8.1. */
  destinazione: string;
  /** Il testo cercato con Nominatim. */
  ricerca: string;
  /** L'area scelta tra i risultati della ricerca. */
  areaId: string;
}

export const DESTINAZIONI_PRECARICATE: readonly DestinazionePrecaricata[] = [
  {
    idBase: "garda",
    destinazione: "Lago di Garda (Riva del Garda e dintorni)",
    ricerca: "Riva del Garda",
    areaId: "osm:relation/46276",
  },
  { idBase: "roma", destinazione: "Roma", ricerca: "Roma", areaId: "osm:relation/41485" },
  {
    idBase: "dolomiti-val-di-fassa",
    destinazione: "Dolomiti – Val di Fassa",
    ricerca: "Val di Fassa",
    areaId: "osm:way/338438408",
  },
];

/** La destinazione precaricata di un'area, se lo è. */
export function destinazionePrecaricata(areaId: string): DestinazionePrecaricata | undefined {
  return DESTINAZIONI_PRECARICATE.find((d) => d.areaId === areaId);
}

/** Data di creazione delle istantanee precaricate nel repository. */
export const DATA_ISTANTANEE_PRECARICATE = "2026-10-09";
