/**
 * I pulsanti rapidi "Sono in ritardo di 15 / 30 / 60 minuti" della vista Oggi (REQ-TODAY-001): ognuno è l'imprevisto
 * `RITARDO` del motore, con il momento dell'orologio simulato. La proposta la costruisce il motore
 * (`proponiRipianificazione`), come per gli scenari della modalità presentazione.
 */
import type { ImprevistoRitardo, Momento } from "@travelops/engine";

/** I ritardi dei pulsanti rapidi, in minuti. */
export const RITARDI_RAPIDI: readonly number[] = [15, 30, 60];

/** Vero se `minuti` è uno dei ritardi dei pulsanti rapidi. */
export function ritardoRapido(minuti: number): boolean {
  return RITARDI_RAPIDI.includes(minuti);
}

/** L'etichetta del pulsante e il titolo della proposta che ne nasce. */
export function etichettaRitardo(minuti: number): string {
  return `Sono in ritardo di ${minuti} minuti`;
}

/** L'imprevisto `RITARDO` di quei minuti, nel momento dato. */
export function imprevistoRitardo(momento: Momento, minuti: number): ImprevistoRitardo {
  return { tipo: "RITARDO", data: momento.data, momento: momento.ora, minuti, motivo: "" };
}

/** Il messaggio quando il ritardo non si può segnalare (`?errore=ritardo` nell'indirizzo della vista Oggi). */
export const MESSAGGIO_RITARDO_NON_SEGNALATO = "Non è stato possibile segnalare il ritardo: riprova, oppure usa la modalità presentazione.";

/** Il messaggio d'errore da mostrare per il parametro `errore` dell'indirizzo, se è quello dei ritardi. */
export function erroreOggi(codice: string | string[] | undefined): string | null {
  const valore = Array.isArray(codice) ? codice[0] : codice;
  return valore === "ritardo" ? MESSAGGIO_RITARDO_NON_SEGNALATO : null;
}
