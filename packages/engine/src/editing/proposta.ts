/**
 * Modifiche richieste dal viaggiatore (REQ-EDIT-001): una modifica (aggiungi, rimuovi, sposta un'attività,
 * cambia priorità, imposta orario fisso) diventa una proposta con le stesse garanzie degli imprevisti:
 * controllo di fattibilità (REQ-FEAS-001), spiegazione, accettazione con lo storico (REQ-ITIN-002).
 *
 * La proposta non cambia l'itinerario: diventa una versione solo se accettata (`applicaProposta`), con causa
 * "Modifica richiesta: <descrizione>". Deterministica: nessun orologio, nessuna casualità, nessuna rete;
 * il viaggio ricevuto non viene modificato.
 */
import { controllaFattibilita, eFattibile } from "../feasibility/index.js";
import { confrontaItinerari, descriviModifica } from "../history/index.js";
import type {
  Catalogo,
  Elemento,
  ModificaRichiesta,
  Modifiche,
  Proposta,
  SorgenteDatiContesto,
  Viaggio,
} from "../model/index.js";
import { costruisciAlternative } from "../replanning/alternative.js";
import { creaLavoro } from "../replanning/lavoro.js";
import { confronta, copiaDati, minuti, trovaElemento } from "../replanning/supporto.js";
import type { ErroreModifica } from "./errori.js";
import { applicaModifica } from "./operazioni.js";
import { scriviSpiegazioneModifica } from "./spiegazione.js";

/**
 * Origine di una proposta nata da una modifica richiesta, con la descrizione che finisce nella causa della
 * versione (REQ-ITIN-002 R-3, letta da `causaVersione`).
 */
export interface OrigineModifica {
  tipo: "modifica";
  modifica: ModificaRichiesta;
  /** Per esempio "aggiungi A-CANTINA il 2026-06-13 alle 16:00" (tabella delle operazioni di REQ-EDIT-001). */
  descrizione: string;
}

/** Proposta di modifica: una `Proposta` del modello con l'origine tipizzata. */
export interface PropostaModifica extends Proposta {
  origine: OrigineModifica;
}

/** Esito di una modifica richiesta: una proposta oppure un errore di R-ED-1 (e nessuna proposta). */
export type EsitoModifica = { ok: true; proposta: PropostaModifica } | { ok: false; errore: ErroreModifica };

/**
 * Propone la modifica richiesta dal viaggiatore.
 *
 * @param viaggio il viaggio della versione corrente (non viene modificato).
 * @param versioneBase il numero della versione corrente, su cui la proposta è costruita.
 * @param catalogo zone, luoghi e attività.
 * @param sorgente dati di contesto: tempi di percorrenza, meteo, chiusure.
 * @param modifica la modifica richiesta.
 */
export function proponiModifica(
  viaggio: Viaggio,
  versioneBase: number,
  catalogo: Catalogo,
  sorgente: SorgenteDatiContesto,
  modifica: ModificaRichiesta,
): EsitoModifica {
  const originale = copiaDati(viaggio);
  const lavoro = creaLavoro(originale, copiaDati(originale), catalogo, sorgente);
  const errore = applicaModifica(lavoro, modifica);
  if (errore) return { ok: false, errore };

  const itinerario = lavoro.viaggio;
  const differenza = confrontaItinerari(originale, itinerario);
  const modifiche: Modifiche = {
    aggiunti: differenza.aggiunti.map((v) => v.elemento),
    rimossi: differenza.rimossi.map((v) => v.elemento),
    modificati: differenza.modificati.map((m) => ({ id: m.id, prima: m.prima.elemento, dopo: m.dopo.elemento })),
  };

  // R-ED-6: controllo di REQ-FEAS-001 sull'itinerario proposto; fattibile se non ci sono problemi bloccanti.
  const problemi = controllaFattibilita(itinerario, catalogo, sorgente);
  const fattibile = eFattibile(problemi);

  // Elementi a rischio (modello-dominio.md §2.6): (b) se la proposta non è fattibile, quelli dei problemi
  // bloccanti; (c) quelli indicati dalla regola di rimozione (R-SOS-5: manca il percorso verso il successivo).
  const perche = new Map<string, string[]>();
  const segnala = (id: string, motivo: string): void => {
    const elenco = perche.get(id) ?? [];
    if (!elenco.includes(motivo)) elenco.push(motivo);
    perche.set(id, elenco);
  };
  for (const [id, motivo] of lavoro.aRischio) segnala(id, motivo);
  if (!fattibile) {
    for (const problema of problemi) {
      if (problema.gravita !== "bloccante") continue;
      for (const id of problema.elementi) segnala(id, `${problema.codice}: ${problema.messaggio.replace(/\.$/, "")}`);
    }
  }
  const aRischio = [...perche.entries()]
    .flatMap(([id, motivi]) => {
      const trovato = trovaElemento(itinerario, id);
      return trovato ? [{ data: trovato.giorno.data, elemento: trovato.elemento, perche: motivi }] : [];
    })
    .sort(perPosizione);

  // Come per gli imprevisti (R-ALT-2 di REQ-REPLAN-002): link utili per gli elementi a rischio con una
  // prenotazione o in volo o in treno.
  const alternative = costruisciAlternative(aRischio, lavoro.indice);

  const descrizione = descriviModifica(modifica, originale);
  const spiegazione = scriviSpiegazioneModifica(
    {
      modifica,
      descrizione,
      originale,
      differenza,
      motivi: lavoro.motivi,
      note: lavoro.note,
      fattibile,
      problemi,
      aRischio,
      alternative,
      domande: [
        ...lavoro.domande,
        ...(!fattibile && lavoro.domande.length === 0
          ? ["la proposta non è fattibile: vuoi accettarla comunque, rifiutarla o chiedere una modifica diversa?"]
          : []),
      ],
    },
    lavoro.indice,
  );

  return {
    ok: true,
    proposta: {
      versioneBase,
      origine: { tipo: "modifica", modifica: copiaDati(modifica), descrizione },
      impatto: { elementiColpiti: [] },
      modifiche,
      itinerario,
      spiegazione,
      fattibile,
      problemi,
      elementiARischio: aRischio.map((r) => r.elemento.id),
      alternative,
    },
  };
}

/** Ordine nell'itinerario: data, inizio, `id`. */
function perPosizione(a: { data: string; elemento: Elemento }, b: { data: string; elemento: Elemento }): number {
  return (
    confronta(a.data, b.data) ||
    minuti(a.elemento.inizio) - minuti(b.elemento.inizio) ||
    confronta(a.elemento.id, b.elemento.id)
  );
}
