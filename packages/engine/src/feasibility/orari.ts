/**
 * Calcoli su orari e date per il controllo di fattibilità (`modello-dominio.md` §2.4, §2.5).
 * Funzioni pure: nessuna lettura dell'orologio.
 */
import type { GiornoSettimana } from "../model/index.js";

/** Intervallo in minuti dalla mezzanotte del giorno. */
export interface Intervallo {
  inizio: number;
  fine: number;
}

const FORMATO_ORARIO = /^(\d{2}):(\d{2})$/;
const FORMATO_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Minuti dalla mezzanotte di un orario `HH:mm` (`24:00` vale 1440); `null` se il formato non è valido. */
export function minutiDaOrario(orario: string): number | null {
  const parti = FORMATO_ORARIO.exec(orario);
  if (!parti) return null;
  const ore = Number(parti[1]);
  const minuti = Number(parti[2]);
  if (ore === 24 && minuti === 0) return 1440;
  if (ore > 23 || minuti > 59) return null;
  return ore * 60 + minuti;
}

/** Due intervalli si sovrappongono se uno inizia prima che l'altro finisca e viceversa; se si toccano, no (§2.4). */
export const siSovrappongono = (x: Intervallo, y: Intervallo): boolean => x.inizio < y.fine && y.inizio < x.fine;

/** Un intervallo è dentro una fascia se inizia non prima dell'apertura e finisce non dopo la chiusura (§2.5). */
export const eDentro = (intervallo: Intervallo, fascia: Intervallo): boolean =>
  intervallo.inizio >= fascia.inizio && intervallo.fine <= fascia.fine;

const GIORNI: readonly GiornoSettimana[] = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];

/** Giorno della settimana di una data `AAAA-MM-GG` (calendario gregoriano); `null` se la data non è valida. */
export function giornoSettimana(data: string): GiornoSettimana | null {
  const parti = FORMATO_DATA.exec(data);
  if (!parti) return null;
  const [anno, mese, giorno] = [Number(parti[1]), Number(parti[2]), Number(parti[3])];
  const istante = new Date(Date.UTC(anno, mese - 1, giorno));
  if (istante.getUTCFullYear() !== anno || istante.getUTCMonth() !== mese - 1 || istante.getUTCDate() !== giorno) {
    return null;
  }
  return GIORNI[istante.getUTCDay()] ?? null;
}

/** Il giorno della settimana con l'articolo, per i messaggi ("il sabato", "la domenica"). */
export const GIORNO_CON_ARTICOLO: Readonly<Record<GiornoSettimana, string>> = {
  lun: "il lunedì",
  mar: "il martedì",
  mer: "il mercoledì",
  gio: "il giovedì",
  ven: "il venerdì",
  sab: "il sabato",
  dom: "la domenica",
};
