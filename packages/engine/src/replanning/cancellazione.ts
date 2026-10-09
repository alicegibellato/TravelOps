/**
 * Ripianificazione di una `CANCELLAZIONE_SPOSTAMENTO` (REQ-REPLAN-002 R-CAN-1, R-CAN-2).
 */
import { ORDINE_MEZZI, type ElementoSpostamento, type ImprevistoCancellazioneSpostamento, type Mezzo } from "../model/index.js";
import { calcolaImpatto } from "./impatto.js";
import { chiedi, elementiDel, impostaElementi, type Lavoro } from "./lavoro.js";
import { ripianificaRitardo } from "./ritardo.js";
import { DESCRIZIONE_MEZZO, minuti, minutiTesto, orario, trovaElemento } from "./supporto.js";

export function ripianificaCancellazione(lavoro: Lavoro, imprevisto: ImprevistoCancellazioneSpostamento): void {
  const trovato = trovaElemento(lavoro.viaggio, imprevisto.elementoId);
  if (!trovato || trovato.elemento.tipo !== "spostamento") return;
  const { giorno } = trovato;
  const cancellato: ElementoSpostamento = trovato.elemento;
  const { indice, sorgente } = lavoro;
  const nome = indice.descrivi(cancellato);

  // R-CAN-1: il mezzo più veloce tra gli altri disponibili per la stessa coppia di luoghi.
  let migliore: { mezzo: Mezzo; minuti: number } | null = null;
  for (const mezzo of ORDINE_MEZZI) {
    if (mezzo === cancellato.mezzo) continue;
    const tempo = sorgente.tempoPercorrenza(cancellato.da, cancellato.a, mezzo);
    if (tempo !== null && (migliore === null || tempo < migliore.minuti)) migliore = { mezzo, minuti: tempo };
  }

  // R-CAN-2: nessun altro mezzo, l'itinerario non cambia.
  if (migliore === null) {
    lavoro.aRischio.set(
      cancellato.id,
      `è cancellato e tra «${indice.nomeLuogo(cancellato.da)}» e «${indice.nomeLuogo(cancellato.a)}» non c'è un altro mezzo noto`,
    );
    lavoro.note.push(
      `Non c'è un altro mezzo per andare da «${indice.nomeLuogo(cancellato.da)}» a «${indice.nomeLuogo(cancellato.a)}»: l'itinerario resta com'è.`,
    );
    chiedi(lavoro, `${nome} è cancellato e TravelOps non conosce un altro mezzo: come vuoi raggiungere «${indice.nomeLuogo(cancellato.a)}»?`);
    return;
  }

  const inizio = minuti(cancellato.inizio);
  const nuovaFine = inizio + migliore.minuti;
  const differenza = nuovaFine - minuti(cancellato.fine);
  // Mantiene l'id, cambia mezzo e durata, perde prenotazione e orario fisso.
  const { prenotazione: _prenotazione, ...senzaPrenotazione } = cancellato;
  const sostituto: ElementoSpostamento = { ...senzaPrenotazione, mezzo: migliore.mezzo, orarioFisso: false };
  const motivo =
    `lo spostamento ${DESCRIZIONE_MEZZO[cancellato.mezzo]} è cancellato: si va ${DESCRIZIONE_MEZZO[migliore.mezzo]}, ` +
    `il mezzo più veloce tra gli altri disponibili (${minutiTesto(migliore.minuti)}), con la stessa partenza delle ${cancellato.inizio}` +
    (cancellato.prenotazione ? "; la prenotazione non vale più per questo spostamento" : "");

  const sostituisci = (fine: number): void =>
    impostaElementi(
      lavoro,
      giorno.data,
      elementiDel(lavoro, giorno.data).map((e) => (e.id === cancellato.id ? { ...sostituto, fine: orario(fine) } : e)),
    );

  if (differenza <= 0) {
    sostituisci(nuovaFine);
    lavoro.motivi.set(cancellato.id, motivo);
    return;
  }

  // Arriva più tardi: i successivi si trattano come un RITARDO dall'inizio dello spostamento.
  // Lo spostamento resta "in corso" con la vecchia fine, che il ritardo porta alla nuova.
  sostituisci(minuti(cancellato.fine));
  const ritardo = {
    tipo: "RITARDO" as const,
    data: giorno.data,
    momento: cancellato.inizio,
    minuti: differenza,
    motivo: `${nome} sostituito ${DESCRIZIONE_MEZZO[migliore.mezzo]}`,
  };
  const impatto = calcolaImpatto(lavoro.viaggio, lavoro.catalogo, ritardo);
  lavoro.impattiDerivati.push(impatto);
  ripianificaRitardo(lavoro, ritardo, impatto, `l'arrivo ${minutiTesto(differenza)} più tardi ${DESCRIZIONE_MEZZO[migliore.mezzo]}`);
  const finale = trovaElemento(lavoro.viaggio, cancellato.id)?.elemento;
  lavoro.motivi.set(
    cancellato.id,
    `${motivo}; arriva alle ${finale?.fine ?? orario(nuovaFine)} invece che alle ${cancellato.fine}`,
  );
}
