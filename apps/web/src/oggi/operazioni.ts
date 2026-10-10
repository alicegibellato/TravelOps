/**
 * Le operazioni della vista Oggi sullo stato locale (REQ-TODAY-001): il momento dell'orologio simulato, l'itinerario
 * da mostrare e la proposta per un ritardo segnalato con i pulsanti rapidi.
 *
 * Come per gli scenari della modalità presentazione (`src/stato/operazioni.ts`), la proposta la costruisce il motore
 * (`proponiRipianificazione`) sulla versione corrente; accettarla o rifiutarla passa dalla stessa pagina della proposta.
 */
import { proponiRipianificazione, versioneCorrente, type Catalogo, type Momento, type Viaggio } from "@travelops/engine";
import { catalogoDiRiferimento, sorgenteDiRiferimento } from "../dati/scenari";
import { caricaViaggioScelto } from "../dati/viaggi";
import { leggiStato, salvaStato } from "../stato/archivio";
import type { EsitoOperazione } from "../stato/operazioni";
import { OROLOGIO_PREDEFINITO, statoIniziale, type PropostaSalvata, type StatoDemo } from "../stato/stato";
import { etichettaRitardo, imprevistoRitardo, ritardoRapido } from "./ritardi";

export interface DatiOggi {
  momento: Momento;
  viaggio: Viaggio;
  catalogo: Catalogo;
}

/**
 * Il momento dell'orologio simulato e l'itinerario del viaggio: la versione corrente se il viaggio è quello della
 * modalità presentazione, altrimenti quello di riferimento. `null` se il viaggio non esiste o non è valido.
 */
export function datiOggi(cartella: string, chiave: string): DatiOggi | null {
  const riferimento = caricaViaggioScelto(chiave);
  if (riferimento === null || !riferimento.ok) return null;
  const letto = leggiStato(cartella);
  if (!letto.ok) return { momento: OROLOGIO_PREDEFINITO, viaggio: riferimento.viaggio, catalogo: riferimento.catalogo };
  const { stato } = letto;
  const viaggio = stato.partenza === chiave ? versioneCorrente(stato.storico).viaggio : riferimento.viaggio;
  return { momento: stato.orologio, viaggio, catalogo: riferimento.catalogo };
}

/**
 * "Sono in ritardo di N minuti": chiede al motore la proposta per l'imprevisto `RITARDO` nel momento dell'orologio
 * simulato, sulla versione corrente del viaggio, e la salva tra le proposte da decidere. Se il viaggio non è quello
 * della modalità presentazione, lo diventa (con la sola versione 1, come quando si avvia uno scenario).
 */
export function segnalaRitardo(cartella: string, chiave: string, minuti: number): EsitoOperazione<{ proposta: PropostaSalvata }> {
  if (!ritardoRapido(minuti)) return { ok: false, messaggio: "Scegli un ritardo di 15, 30 o 60 minuti." };
  const riferimento = caricaViaggioScelto(chiave);
  if (riferimento === null || !riferimento.ok) return { ok: false, messaggio: "Il viaggio non è disponibile." };
  const letto = leggiStato(cartella);
  if (!letto.ok) return { ok: false, messaggio: 'Lo stato salvato non è valido: usa "Ripristina" nella modalità presentazione.' };
  const stato: StatoDemo =
    letto.stato.partenza === chiave ? letto.stato : statoIniziale(chiave, null, letto.stato.orologio, letto.stato.prossimaProposta);
  const corrente = versioneCorrente(stato.storico);
  const proposta: PropostaSalvata = {
    id: stato.prossimaProposta,
    scenario: etichettaRitardo(minuti),
    proposta: proponiRipianificazione(
      corrente.viaggio,
      corrente.numero,
      catalogoDiRiferimento(),
      sorgenteDiRiferimento(),
      imprevistoRitardo(stato.orologio, minuti),
    ),
    decisione: null,
    ultimoEsito: null,
  };
  const nuovo: StatoDemo = { ...stato, proposte: [...stato.proposte, proposta], prossimaProposta: proposta.id + 1 };
  salvaStato(cartella, nuovo);
  return { ok: true, stato: nuovo, proposta };
}
