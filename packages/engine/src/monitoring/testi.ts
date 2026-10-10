/** Testi della notifica di un imprevisto rilevato (REQ-MONITOR-001, CA-3), in parole semplici. */
import type { ImprevistoRilevato } from "./tipi.js";

const GIORNI = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"] as const;

/** Il giorno della settimana in italiano di una data `AAAA-MM-GG`. */
export function giornoDellaSettimana(data: string): string {
  return GIORNI[new Date(`${data}T00:00:00Z`).getUTCDay()] ?? data;
}

/**
 * La frase della notifica, per esempio «Nuovo imprevisto: pioggia prevista sabato alle 09:00 per «Trekking sul
 * Sentiero del Ponale»». Se le attività colpite sono più d'una, si nomina la prima e si aggiunge quante altre.
 */
export function descriviNotifica(r: ImprevistoRilevato): string {
  const prima = r.attivita[0];
  if (prima === undefined) return "Nuovo imprevisto";
  const quando = `${giornoDellaSettimana(prima.data)} alle ${prima.inizio}`;
  const altre = r.attivita.length - 1;
  const per = `«${prima.nome}»${altre === 0 ? "" : altre === 1 ? " e un'altra attività" : ` e altre ${altre} attività`}`;
  switch (r.imprevisto.tipo) {
    case "METEO_AVVERSO":
      return `Nuovo imprevisto: ${r.imprevisto.condizione} prevista ${quando} per ${per}`;
    case "CHIUSURA_LUOGO":
      return `Nuovo imprevisto: luogo chiuso per un evento ${quando}, tocca ${per}`;
    default:
      return `Nuovo imprevisto ${quando}: tocca ${per}`;
  }
}
