/**
 * Il meteo di un viaggio per le pagine (REQ-INTEG-001, CA-3/CA-4): chiede la previsione ai servizi esterni e non solleva
 * mai errori. Se il servizio non risponde, ogni giorno è marcato "non disponibile" e l'app funziona come prima.
 */
import type { Catalogo, Viaggio } from "@travelops/engine";
import { leggiMeteoViaggio, type MeteoViaggio, type ServiziEsterni } from "@travelops/sources";
import { catalogoDiRiferimento } from "../dati/scenari";
import type { EsitoLetturaStato } from "../stato/stato";
import { leggiVersioneStato } from "../viste/versioni";
import { serviziEsterni } from "./esterni";

const MESSAGGIO_ERRORE = "Meteo non disponibile";

/** Dove va l'avviso quando il meteo manca: il log del server. Sostituibile (nei test, o con un altro sistema di log). */
export type RegistraAvviso = (testo: string) => void;
const registraSuConsole: RegistraAvviso = (testo) => console.warn(testo);

/** Il testo dell'avviso: solo il messaggio già pensato per l'utente, mai indirizzi, chiavi o dettagli dell'errore. */
const avvisoNelLog = (motivo: string): string => `TravelOps: meteo non disponibile (${motivo})`;

export async function meteoDelViaggio(
  viaggio: Viaggio,
  catalogo: Catalogo,
  servizi: Pick<ServiziEsterni, "meteo"> = serviziEsterni(),
  registra: RegistraAvviso = registraSuConsole,
): Promise<MeteoViaggio> {
  try {
    const meteo = await leggiMeteoViaggio(servizi.meteo, viaggio, catalogo);
    if (meteo.avviso !== null) registra(avvisoNelLog(meteo.avviso));
    return meteo;
  } catch {
    registra(avvisoNelLog("errore imprevisto nella lettura della previsione"));
    return {
      previsioni: [],
      perGiorno: Object.fromEntries(viaggio.giorni.map((g) => [g.data, { disponibile: false as const, data: g.data, messaggio: MESSAGGIO_ERRORE }])),
      avviso: MESSAGGIO_ERRORE,
    };
  }
}

/** Il meteo della versione dello stato locale con questo numero; `undefined` se lo stato o la versione non ci sono. */
export async function meteoDellaVersione(esito: EsitoLetturaStato, numero: number | null): Promise<MeteoViaggio | undefined> {
  if (!esito.ok || numero === null) return undefined;
  const letta = leggiVersioneStato(esito.stato, numero);
  return letta.ok ? meteoDelViaggio(letta.versione.viaggio, catalogoDiRiferimento()) : undefined;
}
