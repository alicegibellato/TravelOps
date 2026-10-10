"use server";
/**
 * Azioni lato server della scelta della destinazione (REQ-CAT-002). Il browser non parla mai con servizi esterni:
 * chiama queste azioni, che usano la sorgente di destinazioni e il motore. Ogni azione accetta solo dati semplici
 * e restituisce un esito, mai un'eccezione.
 */
import { candidateConfigurate } from "../../src/destinazioni/candidati";
import { creaServizioDestinazioni } from "../../src/destinazioni/servizio";
import { sorgenteDestinazioniLocale } from "../../src/destinazioni/sorgente";
import type {
  EsitoCostruzioneWeb,
  EsitoSorprendimi,
  RichiestaSorprendimi,
  Suggerimento,
} from "../../src/destinazioni/tipi";

const MESSAGGIO_NON_DISPONIBILE = "Al momento non riesco a preparare questa destinazione. Riprova tra un attimo.";

function servizio() {
  return creaServizioDestinazioni({ sorgente: sorgenteDestinazioniLocale(), candidate: candidateConfigurate() });
}

export async function cercaDestinazioniAzione(testo: string): Promise<Suggerimento[]> {
  try {
    return await servizio().cerca(testo);
  } catch {
    return [];
  }
}

export async function costruisciDestinazioneAzione(area: Suggerimento): Promise<EsitoCostruzioneWeb> {
  try {
    return await servizio().costruisci(area);
  } catch {
    return { esito: "non_disponibile", messaggio: MESSAGGIO_NON_DISPONIBILE };
  }
}

export async function sorprendimiAzione(richiesta: RichiestaSorprendimi): Promise<EsitoSorprendimi> {
  try {
    return await servizio().sorprendimi(richiesta);
  } catch {
    return { esito: "errore", messaggio: "Al momento non riesco a proporti delle idee. Riprova tra un attimo." };
  }
}
