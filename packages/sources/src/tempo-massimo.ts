/**
 * Una scadenza complessiva per la preparazione di una destinazione (REQ-CAT-002, caso TB-NEW-D4 / TB-REAL-002).
 *
 * Le singole chiamate alle fonti hanno già il loro tempo massimo, ma la costruzione le mette in fila (tre server
 * Overpass, poi Wikipedia, Commons e OSRM a blocchi): senza un limite d'insieme «Sto preparando Trento…» poteva restare
 * in corso per minuti, senza esito né messaggio. Qui la sorgente viene avvolta: scaduto `tempoMassimoMs`, la costruzione
 * si interrompe (con il segnale, così le richieste in corso vengono annullate) e l'esito è `non_disponibile` con un
 * messaggio chiaro per il viaggiatore. Un'interruzione chiesta dal chiamante (il suo `segnale`) resta un'eccezione, come
 * prima. Ricerca, lettura ed elenco passano così come sono.
 */
import type { AreaDestinazione, IstantaneaDestinazione } from "./formato.js";
import type { EsitoCostruzione, OpzioniCostruzione, SorgenteDestinazioni } from "./sorgente.js";

export interface OpzioniTempoMassimo {
  /** Tempo massimo per preparare una destinazione, in millisecondi (intero positivo). */
  tempoMassimoMs: number;
}

/** Il messaggio per il viaggiatore quando la preparazione supera il tempo massimo. */
export function messaggioTempoScaduto(area: Pick<AreaDestinazione, "nome">, tempoMassimoMs: number): string {
  const secondi = Math.max(1, Math.round(tempoMassimoMs / 1000));
  return (
    `Preparare ${area.nome} sta richiedendo più di ${secondi} secondi: i servizi delle mappe sono lenti in questo momento. ` +
    "Riprova tra poco oppure scegli una delle destinazioni già pronte."
  );
}

const combina = (scadenza: AbortSignal, segnale: AbortSignal | undefined): AbortSignal =>
  segnale === undefined ? scadenza : AbortSignal.any([scadenza, segnale]);

/** La stessa sorgente, con una scadenza complessiva su `costruisciIstantanea`. */
export function conTempoMassimo(sorgente: SorgenteDestinazioni, opzioni: OpzioniTempoMassimo): SorgenteDestinazioni {
  const { tempoMassimoMs } = opzioni;
  if (!Number.isInteger(tempoMassimoMs) || tempoMassimoMs <= 0) throw new Error("tempoMassimoMs deve essere un intero positivo");

  return {
    tipo: sorgente.tipo,
    cercaDestinazioni: (testo, o) => sorgente.cercaDestinazioni(testo, o),
    leggiIstantanea: (id): Promise<IstantaneaDestinazione | null> => sorgente.leggiIstantanea(id),
    elencaIstantanee: () => sorgente.elencaIstantanee(),

    async costruisciIstantanea(area: AreaDestinazione, opzioniCostruzione: OpzioniCostruzione = {}): Promise<EsitoCostruzione> {
      const scadenza = AbortSignal.timeout(tempoMassimoMs);
      const segnale = combina(scadenza, opzioniCostruzione.segnale);
      const scaduto = (): EsitoCostruzione => ({ ok: false, motivo: "non_disponibile", messaggio: messaggioTempoScaduto(area, tempoMassimoMs) });
      // Sia che la sorgente sotto risponda da sola al segnale, sia che lo ignori: allo scadere l'esito arriva comunque.
      const allaScadenza = new Promise<EsitoCostruzione>((risolvi) => scadenza.addEventListener("abort", () => risolvi(scaduto()), { once: true }));
      try {
        return await Promise.race([sorgente.costruisciIstantanea(area, { ...opzioniCostruzione, segnale }), allaScadenza]);
      } catch (errore) {
        if (scadenza.aborted && opzioniCostruzione.segnale?.aborted !== true) return scaduto();
        throw errore;
      }
    },
  };
}
