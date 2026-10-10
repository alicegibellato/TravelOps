/**
 * Accettare o rifiutare dalla chat una proposta degli agenti (REQ-CHAT-001, ST-CHAT-001C) per un viaggio nato in
 * chat. Decide il motore, come per il pulsante della pagina Demo (`src/stato/operazioni.ts`): `applicaProposta` crea
 * la nuova versione (o la rifiuta), `rifiutaProposta` lascia lo storico com'è. Il momento è l'orologio simulato.
 */
import { applicaProposta, rifiutaProposta, versioneCorrente, type Proposta, type Storico } from "@travelops/engine";
import {
  elencaProposteDelViaggio,
  inTransazione,
  leggiStoricoDelViaggio,
  salvaStoricoDelViaggio,
  sostituisciProposteDelViaggio,
  type BaseDati,
} from "../../basedati";
import { usaBaseDati } from "../../stato/avvio";
import type { EsitoAzione } from "../../stato/stato";
import { orologioSimulato } from "./agenti";

export type DecisioneSulViaggio = "accetta" | "rifiuta";

const PROPOSTA_NON_DISPONIBILE = "Questa proposta non è più disponibile: chiedi in chat di prepararne un'altra.";
const NON_CONFERMATO = "Il viaggio non è ancora confermato: le proposte valgono solo per un viaggio confermato.";

function storicoDelViaggio(db: BaseDati, viaggioId: string): Storico | null {
  const esito = leggiStoricoDelViaggio(db, viaggioId);
  return esito?.ok === true ? esito.storico : null;
}

/** Decide la proposta salvata `idProposta` del viaggio e restituisce l'esito da mostrare in chat. */
export function decidiPropostaDelViaggio(
  cartella: string,
  viaggioId: string,
  idProposta: number,
  decisione: DecisioneSulViaggio,
  nome: string,
): EsitoAzione {
  const momento = orologioSimulato(cartella);
  return usaBaseDati(cartella, (db) =>
    inTransazione(db, () => {
      const proposte = elencaProposteDelViaggio(db, viaggioId);
      const salvata = proposte.find((p) => p.id === idProposta);
      if (salvata === undefined) return { livello: "errore", messaggio: PROPOSTA_NON_DISPONIBILE };
      const storico = storicoDelViaggio(db, viaggioId);
      if (storico === null) return { livello: "errore", messaggio: NON_CONFERMATO };
      const proposta = salvata.proposta as Proposta;

      let esito: EsitoAzione;
      let nuovaDecisione = salvata.decisione;
      let nuovoStorico = storico;
      if (decisione === "rifiuta") {
        nuovoStorico = rifiutaProposta(storico, proposta).storico;
        nuovaDecisione ??= { tipo: "rifiutata" };
        esito = {
          livello: "successo",
          messaggio: `Proposta rifiutata: nessuna nuova versione, l'itinerario resta alla versione ${versioneCorrente(nuovoStorico).numero}.`,
        };
      } else {
        const risultato = applicaProposta(storico, proposta, nome, momento);
        nuovoStorico = risultato.storico;
        switch (risultato.esito) {
          case "versione_creata": {
            const autore = risultato.versione.autore ?? nome;
            nuovaDecisione = { tipo: "accettata", versione: risultato.versione.numero, autore, momento };
            esito = {
              livello: "successo",
              messaggio: `Proposta accettata da ${autore} il ${momento.data} alle ${momento.ora}: creata la versione ${risultato.versione.numero}.`,
            };
            break;
          }
          case "avviso":
            nuovaDecisione ??= { tipo: "accettata", versione: null, autore: nome.trim(), momento };
            esito = { livello: "avviso", messaggio: risultato.avviso.messaggio };
            break;
          case "errore":
            esito = { livello: "errore", messaggio: risultato.errore.messaggio };
            break;
        }
      }
      salvaStoricoDelViaggio(db, viaggioId, nuovoStorico);
      sostituisciProposteDelViaggio(
        db,
        viaggioId,
        proposte.map((p) => (p.id === idProposta ? { ...p, decisione: nuovaDecisione, esito } : p)),
      );
      return esito;
    }),
  );
}
