/**
 * Le tracce degli agenti per le pagine (REQ-OBS-001, pagina «Cosa hanno fatto gli agenti»): le pagine leggono lo stato
 * da `src/stato` e non dalla base dati (REQ-DATA-001); qui passano le letture dello strato di accesso ai dati.
 */
export { conversazioniTracciate, tracceDelViaggio, tracceDellaConversazione } from "../basedati";
export type { ConversazioneTracciata, RispostaTracciata, VoceTracciaAgenti } from "../basedati";
