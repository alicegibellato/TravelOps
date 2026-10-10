/**
 * Valori ammessi, etichette e predefiniti del profilo (REQ-PREF-001) letti dal motore: lato server, per darli al
 * percorso guidato del browser senza duplicarli.
 */
import {
  BUDGET,
  DURATA_MASSIMA,
  DURATA_MINIMA,
  ESIGENZE,
  ETA_MASSIMA_BAMBINO,
  ETICHETTE_PROFILO,
  FORME_FISICHE,
  MEZZI_PROFILO,
  ORARI_PROFILO,
  PROFILO_PREDEFINITO,
  RITMI,
  TIPI_GRUPPO,
} from "@travelops/engine";
import type { OpzioniPercorso } from "./tipi";

export function opzioniPercorso(): OpzioniPercorso {
  return {
    tipiGruppo: TIPI_GRUPPO.map((valore) => ({ valore, etichetta: ETICHETTE_PROFILO.tipoGruppo[valore] })),
    ritmi: RITMI.map((valore) => ({ valore, etichetta: ETICHETTE_PROFILO.ritmo[valore], descrizione: ETICHETTE_PROFILO.descrizioneRitmo[valore] })),
    formeFisiche: FORME_FISICHE.map((valore) => ({ valore, etichetta: ETICHETTE_PROFILO.formaFisica[valore] })),
    budget: BUDGET.map((valore) => ({ valore, etichetta: ETICHETTE_PROFILO.budget[valore] })),
    orari: ORARI_PROFILO.map((valore) => ({ valore, etichetta: ETICHETTE_PROFILO.orari[valore], descrizione: ETICHETTE_PROFILO.descrizioneOrari[valore] })),
    mezzi: MEZZI_PROFILO.map((valore) => ({ valore, etichetta: ETICHETTE_PROFILO.mezzo[valore] })),
    esigenze: ESIGENZE.map((valore) => ({ valore, etichetta: ETICHETTE_PROFILO.esigenza[valore] })),
    etichetteCampo: { ...ETICHETTE_PROFILO.campo },
    durataMinima: DURATA_MINIMA,
    durataMassima: DURATA_MASSIMA,
    etaMassimaBambino: ETA_MASSIMA_BAMBINO,
    predefiniti: {
      adulti: PROFILO_PREDEFINITO.viaggiatori.adulti,
      stili: [...PROFILO_PREDEFINITO.stili],
      ritmo: PROFILO_PREDEFINITO.ritmo,
      formaFisica: PROFILO_PREDEFINITO.formaFisica,
      budget: PROFILO_PREDEFINITO.budget,
      orari: PROFILO_PREDEFINITO.orari,
      pasti: { ...PROFILO_PREDEFINITO.pasti },
      mezzi: [...PROFILO_PREDEFINITO.mezzi],
    },
  };
}
