/**
 * Il viaggio di una conversazione nella base dati (REQ-CHAT-001, ST-CHAT-001C): l'`ArchivioViaggio` con cui gli
 * strumenti del motore degli agenti (`@travelops/agents`) leggono e cambiano il viaggio, sulle tabelle di
 * REQ-DATA-001 (viaggi, profili, istantanee, revisioni della bozza, storici, proposte).
 *
 * Un archivio riguarda una sola conversazione. Se la conversazione non ha ancora un viaggio (nasce dalla pagina
 * "Pianifica"), il viaggio si crea alla prima scrittura e la conversazione gli viene collegata. Nessuna regola del
 * motore qui: i JSON si salvano e si rileggono con le funzioni della base dati, che li fanno validare al motore.
 */
import type { ArchivioViaggio, RevisioneBozza as RevisioneArchivio, SchedaViaggio, TipoProposta } from "@travelops/agents";
import type { BozzaProfilo, IstantaneaCatalogo, Proposta, Storico, Viaggio } from "@travelops/engine";
import { comeIstantaneaCatalogo, leggiIstantaneaOppureErrore, type IstantaneaDestinazione } from "@travelops/sources";
import {
  aggiungiRevisioneBozza,
  collegaConversazione,
  elencaProposteDelViaggio,
  elencaRevisioniBozza,
  elencaViaggi,
  inTransazione,
  leggiConversazione,
  leggiIstantanea,
  leggiProfilo,
  leggiStoricoDelViaggio,
  salvaIstantanea,
  salvaProfilo,
  salvaStoricoDelViaggio,
  salvaViaggio,
  sostituisciProposteDelViaggio,
  trovaViaggio,
  type BaseDati,
} from "../../basedati";
import { leggiProfilo as leggiProfiloCondiviso, salvaProfilo as salvaProfiloCondiviso } from "../../preferenze/profilo";
import { usaBaseDati } from "../../stato/avvio";

/** Il titolo del viaggio finché la destinazione non è scelta. */
export const TITOLO_NUOVO_VIAGGIO = "Nuovo viaggio";

/** Da dove nasce una proposta salvata dalla chat (colonna `origine` delle proposte). */
export const ORIGINE_CHAT: Readonly<Record<TipoProposta, string>> = { modifica: "chat:modifica", ripianificazione: "chat:ripianificazione" };

/** L'identificativo di un viaggio nato in chat: `chat-<conversazione>`, con un numero in più se è già preso. */
function nuovoIdViaggio(db: BaseDati, conversazioneId: number): string {
  const base = `chat-${conversazioneId}`;
  let id = base;
  for (let n = 2; trovaViaggio(db, id) !== null; n += 1) id = `${base}-${n}`;
  return id;
}

/** Il viaggio della conversazione, se c'è. */
export function viaggioDellaConversazione(db: BaseDati, conversazioneId: number): string | null {
  const conversazione = leggiConversazione(db, conversazioneId);
  if (conversazione === null) throw new Error(`la conversazione ${conversazioneId} non esiste`);
  return conversazione.viaggioId;
}

/**
 * Il viaggio della conversazione, creato se non c'è ancora: in fondo all'elenco dei viaggi, come bozza senza
 * destinazione. La conversazione viene collegata al nuovo viaggio.
 */
function viaggioDaScrivere(db: BaseDati, conversazioneId: number, scheda?: SchedaViaggio): string {
  const esistente = viaggioDellaConversazione(db, conversazioneId);
  if (esistente !== null) return esistente;
  return inTransazione(db, () => {
    const id = nuovoIdViaggio(db, conversazioneId);
    const ordine = elencaViaggi(db).reduce((massimo, v) => Math.max(massimo, v.ordine), 0) + 1;
    salvaViaggio(db, {
      id,
      titolo: scheda?.titolo ?? TITOLO_NUOVO_VIAGGIO,
      stato: scheda?.stato ?? "bozza",
      demo: false,
      ordine,
      destinazione: scheda?.destinazione ?? null,
      istantanea: scheda?.istantaneaId ?? null,
    });
    collegaConversazione(db, conversazioneId, id);
    return id;
  });
}

/**
 * Un viaggio che nasce dalla pagina Pianifica (conversazione senza viaggio, poi `chat-…`) usa il profilo condiviso con
 * il percorso guidato (REQ-PREF-001 CA-6, REQ-CHAT-001 CA-6): filtri e chat scrivono lo stesso profilo.
 */
export function usaProfiloCondiviso(viaggioId: string | null): boolean {
  return viaggioId === null || viaggioId.startsWith("chat-");
}

/** L'istantanea salvata come la vuole il motore; `null` se non c'è. */
export function istantaneaCatalogo(db: BaseDati, id: string): IstantaneaCatalogo | null {
  const salvata = leggiIstantanea(db, id);
  return salvata === null ? null : comeIstantaneaCatalogo(leggiIstantaneaOppureErrore(salvata.contenuto));
}

/** L'archivio del viaggio della conversazione, sulla base dati nella cartella indicata. */
export function creaArchivioConversazione(cartella: string, conversazioneId: number): ArchivioViaggio {
  const usa = <T>(lavoro: (db: BaseDati) => T): T => usaBaseDati(cartella, lavoro);
  const conViaggio = <T>(lavoro: (db: BaseDati, viaggioId: string) => T, altrimenti: T): T =>
    usa((db) => {
      const id = viaggioDellaConversazione(db, conversazioneId);
      return id === null ? altrimenti : lavoro(db, id);
    });

  return {
    leggiScheda: () =>
      conViaggio<SchedaViaggio | null>((db, id) => {
        const viaggio = trovaViaggio(db, id);
        return viaggio === null
          ? null
          : { titolo: viaggio.titolo, stato: viaggio.stato, destinazione: viaggio.destinazione, istantaneaId: viaggio.istantanea };
      }, null),

    salvaScheda: (scheda) =>
      usa((db) => {
        const id = viaggioDaScrivere(db, conversazioneId, scheda);
        const viaggio = trovaViaggio(db, id);
        if (viaggio === null) throw new Error(`il viaggio ${id} non esiste`);
        salvaViaggio(db, { ...viaggio, titolo: scheda.titolo, stato: scheda.stato, destinazione: scheda.destinazione, istantanea: scheda.istantaneaId });
      }),

    leggiProfilo: () =>
      usa((db) => {
        const id = viaggioDellaConversazione(db, conversazioneId);
        const delViaggio = id === null ? null : (leggiProfilo(db, id) as BozzaProfilo | null);
        return usaProfiloCondiviso(id) ? (leggiProfiloCondiviso(db) ?? delViaggio) : delViaggio;
      }),

    salvaProfilo: (profilo: BozzaProfilo) =>
      usa((db) =>
        inTransazione(db, () => {
          const id = viaggioDaScrivere(db, conversazioneId);
          salvaProfilo(db, id, profilo);
          if (usaProfiloCondiviso(id)) salvaProfiloCondiviso(db, profilo);
        }),
      ),

    leggiIstantanea: (id) => usa((db) => istantaneaCatalogo(db, id)),

    salvaIstantanea: (istantanea: IstantaneaDestinazione) =>
      usa((db) => salvaIstantanea(db, { id: istantanea.id, destinazione: istantanea.destinazione, contenuto: istantanea })),

    leggiRevisioniBozza: () =>
      conViaggio<readonly RevisioneArchivio[]>((db, id) => {
        const esito = elencaRevisioniBozza(db, id);
        if (!esito.ok) throw new Error(esito.motivo);
        return esito.revisioni;
      }, []),

    aggiungiRevisioneBozza: (causa: string, viaggio: Viaggio) =>
      usa((db) => aggiungiRevisioneBozza(db, viaggioDaScrivere(db, conversazioneId), causa, viaggio)),

    leggiStorico: () =>
      conViaggio<Storico | null>((db, id) => {
        const esito = leggiStoricoDelViaggio(db, id);
        if (esito === null) return null;
        if (!esito.ok) throw new Error(esito.errore.messaggio);
        return esito.storico;
      }, null),

    salvaStorico: (storico: Storico) => usa((db) => salvaStoricoDelViaggio(db, viaggioDaScrivere(db, conversazioneId), storico)),

    salvaProposta: (tipo: TipoProposta, proposta: Proposta) =>
      usa((db) =>
        inTransazione(db, () => {
          const id = viaggioDaScrivere(db, conversazioneId);
          const proposte = elencaProposteDelViaggio(db, id);
          const numero = proposte.reduce((massimo, p) => Math.max(massimo, p.id), 0) + 1;
          sostituisciProposteDelViaggio(db, id, [...proposte, { id: numero, origine: ORIGINE_CHAT[tipo], proposta, decisione: null, esito: null }]);
          return numero;
        }),
      ),
  };
}
