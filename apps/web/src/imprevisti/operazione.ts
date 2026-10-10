/**
 * "Ho un imprevisto" sullo stato locale (REQ-IMPR-001): l'imprevisto (o la richiesta di cambio di durata) scelto
 * con una scheda diventa una proposta del motore sulla versione corrente, salvata come le proposte degli scenari della
 * Demo, così si apre con la stessa vista (REQ-WEB-004) e si accetta o si rifiuta con gli stessi pulsanti.
 *
 * Nessuna regola qui (CA-9 di REQ-WEB-002): la proposta la costruisce il motore (`proponiRipianificazione`,
 * `proponiModificaOndata2`); il viaggio cambia solo quando il viaggiatore la accetta (CA-3).
 */
import { proponiModificaOndata2, proponiRipianificazione, versioneCorrente, type PropostaRipianificazione } from "@travelops/engine";
import { catalogoDiRiferimento, sorgenteDiRiferimento } from "../dati/scenari";
import { leggiStato, salvaStato } from "../stato/archivio";
import type { EsitoOperazione } from "../stato/operazioni";
import type { PropostaSalvata, StatoDemo } from "../stato/stato";
import { leggiModulo, type SceltaImprevisto } from "./modulo";
import type { Scheda } from "./schede";

/** Il catalogo per il motore: quello di riferimento, lo stesso degli scenari della Demo e della vista della proposta. */
export function catalogoPerImprevisti() {
  return catalogoDiRiferimento();
}

/** Il nome dello "scenario" della proposta: il titolo della scheda, in parole semplici. */
export function scenarioDellaScheda(scheda: Scheda): string {
  return `Imprevisto segnalato: ${scheda.titolo}`;
}

/**
 * Chiede al motore la proposta per l'imprevisto sulla versione corrente e la salva tra le proposte, senza scartare
 * quelle già presenti. Errori del motore (per esempio un giorno che non è del viaggio) tornano come messaggio.
 */
export function segnalaImprevisto(cartella: string, scheda: Scheda, scelta: SceltaImprevisto): EsitoOperazione<{ proposta: PropostaSalvata }> {
  const letto = leggiStato(cartella);
  if (!letto.ok) return { ok: false, messaggio: `Lo stato salvato non è valido (${letto.motivo}): usa "Ripristina" nella modalità presentazione.` };
  const stato = letto.stato;
  const corrente = versioneCorrente(stato.storico);
  const catalogo = catalogoPerImprevisti();
  let proposta: PropostaRipianificazione;
  try {
    if (scelta.tipo === "imprevisto") {
      proposta = proponiRipianificazione(corrente.viaggio, corrente.numero, catalogo, sorgenteDiRiferimento(), scelta.imprevisto) as unknown as PropostaRipianificazione;
    } else {
      const esito = proponiModificaOndata2(corrente.viaggio, corrente.numero, catalogo, sorgenteDiRiferimento(), scelta.modifica);
      if (!esito.ok) return { ok: false, messaggio: `Non si può: ${esito.errore.motivo}.` };
      proposta = esito.proposta as unknown as PropostaRipianificazione;
    }
  } catch (errore) {
    return { ok: false, messaggio: `Non riesco a preparare la proposta: ${(errore as Error).message}` };
  }
  const salvata: PropostaSalvata = { id: stato.prossimaProposta, scenario: scenarioDellaScheda(scheda), proposta, decisione: null, ultimoEsito: null };
  const nuovo: StatoDemo = { ...stato, proposte: [...stato.proposte, salvata], prossimaProposta: salvata.id + 1 };
  salvaStato(cartella, nuovo);
  return { ok: true, stato: nuovo, proposta: salvata };
}

/**
 * Dal modulo inviato alla proposta: legge i campi sulla versione corrente (errori in parole semplici) e chiede la
 * proposta al motore. È l'unico passo che l'azione del modulo deve chiamare.
 */
export function segnalaImprevistoDaModulo(
  cartella: string,
  scheda: Scheda,
  campi: Record<string, string | undefined>,
): { ok: true; proposta: PropostaSalvata } | { ok: false; errori: string[] } {
  const letto = leggiStato(cartella);
  if (!letto.ok) return { ok: false, errori: [`Lo stato salvato non è valido (${letto.motivo}): usa "Ripristina" nella modalità presentazione.`] };
  const modulo = leggiModulo(scheda, campi, versioneCorrente(letto.stato.storico).viaggio, catalogoPerImprevisti());
  if (!modulo.ok) return modulo;
  const esito = segnalaImprevisto(cartella, scheda, modulo.scelta);
  return esito.ok ? { ok: true, proposta: esito.proposta } : { ok: false, errori: [esito.messaggio] };
}
