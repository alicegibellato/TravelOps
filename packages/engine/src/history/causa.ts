/**
 * Causa di una versione (REQ-ITIN-002 R-3), scritta a partire dall'origine della proposta.
 * La descrizione delle modifiche richieste segue la tabella delle operazioni di REQ-EDIT-001.
 */
import type { ModificaRichiesta, OrigineProposta, Viaggio } from "../model/index.js";

/**
 * Origine di una proposta, con la descrizione facoltativa della modifica richiesta.
 * Il modello (`OrigineProposta`) non ha ancora un campo per la descrizione che "arriva con la proposta"
 * (REQ-ITIN-002 R-3, REQ-EDIT-001): se c'è un testo non vuoto in `descrizione` si usa quello,
 * altrimenti la descrizione si ricava dalla modifica richiesta.
 */
export type OrigineConDescrizione = OrigineProposta & { descrizione?: string };

/** La causa della versione che nasce da una proposta con questa origine, costruita sulla versione `base`. */
export function causaVersione(origine: OrigineConDescrizione, base: Viaggio): string {
  if (origine.tipo === "modifica") {
    const descrizione =
      typeof origine.descrizione === "string" && origine.descrizione.trim() !== ""
        ? origine.descrizione.trim()
        : descriviModifica(origine.modifica, base);
    return `Modifica richiesta: ${descrizione}`;
  }
  const imprevisto = origine.imprevisto;
  switch (imprevisto.tipo) {
    case "METEO_AVVERSO":
      return (
        `Meteo avverso: ${imprevisto.condizione} in ${imprevisto.zonaId} ` +
        `il ${imprevisto.data} ${imprevisto.inizio}–${imprevisto.fine}`
      );
    case "RITARDO":
      return `Ritardo di ${imprevisto.minuti} minuti il ${imprevisto.data} alle ${imprevisto.momento}: ${imprevisto.motivo}`;
    case "CHIUSURA_LUOGO":
      return `Chiusura di ${imprevisto.luogoId} il ${imprevisto.data} ${imprevisto.inizio}–${imprevisto.fine}`;
    case "CANCELLAZIONE_SPOSTAMENTO":
      return `Cancellazione dello spostamento ${imprevisto.elementoId}`;
  }
}

/** Descrizione di una modifica richiesta (REQ-EDIT-001, colonna "Descrizione della modifica"). */
export function descriviModifica(modifica: ModificaRichiesta, base: Viaggio): string {
  switch (modifica.operazione) {
    case "aggiungi":
      return `aggiungi ${modifica.attivitaId} il ${modifica.data} alle ${modifica.inizio}`;
    case "rimuovi":
      return `rimuovi ${conAttivita(modifica.elementoId, base)}`;
    case "sposta":
      return `sposta ${conAttivita(modifica.elementoId, base)} al ${modifica.data} alle ${modifica.inizio}`;
    case "cambia_priorita":
      return `priorità di ${conAttivita(modifica.elementoId, base)} a ${modifica.priorita}`;
    case "imposta_orario_fisso":
      return modifica.orarioFisso ? `orario fisso su ${modifica.elementoId}` : `orario non più fisso su ${modifica.elementoId}`;
  }
}

/** `<id> (<attività>)` se l'elemento è un'attività della versione base, altrimenti solo `<id>`. */
function conAttivita(elementoId: string, base: Viaggio): string {
  for (const giorno of base.giorni) {
    for (const elemento of giorno.elementi) {
      if (elemento.id === elementoId && elemento.tipo === "attivita") return `${elementoId} (${elemento.attivitaId})`;
    }
  }
  return elementoId;
}
