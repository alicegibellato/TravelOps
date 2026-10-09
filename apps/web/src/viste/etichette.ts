/**
 * Etichette in italiano per i valori del modello e formattazione delle date.
 * Solo presentazione: nessuna regola del motore.
 */
import type { Categoria, Elemento, GiornoSettimana, Mezzo, Priorita, TipoLuogo } from "@travelops/engine";

export const ETICHETTE_TIPO: Record<Elemento["tipo"], string> = {
  attivita: "Attività",
  spostamento: "Spostamento",
};

export const ETICHETTE_MEZZO: Record<Mezzo, string> = {
  piedi: "A piedi",
  mezzi_pubblici: "Mezzi pubblici",
  treno: "Treno",
  auto: "Auto",
  volo: "Volo",
};

export const ETICHETTE_PRIORITA: Record<Priorita, string> = {
  irrinunciabile: "Irrinunciabile",
  desiderata: "Desiderata",
  opzionale: "Opzionale",
};

export const ETICHETTE_CATEGORIA: Record<Categoria, string> = {
  natura: "Natura",
  cultura: "Cultura",
  gastronomia: "Gastronomia",
  pasto: "Pasto",
};

export const ETICHETTE_TIPO_LUOGO: Record<TipoLuogo, string> = {
  alloggio: "Alloggio",
  ristorante: "Ristorante",
  museo: "Museo",
  sentiero: "Sentiero",
  cantina: "Cantina",
  aeroporto: "Aeroporto",
  stazione: "Stazione",
  altro: "Altro",
};

/** I giorni della settimana nell'ordine italiano, da lunedì. */
export const GIORNI_SETTIMANA: readonly { chiave: GiornoSettimana; nome: string }[] = [
  { chiave: "lun", nome: "lunedì" },
  { chiave: "mar", nome: "martedì" },
  { chiave: "mer", nome: "mercoledì" },
  { chiave: "gio", nome: "giovedì" },
  { chiave: "ven", nome: "venerdì" },
  { chiave: "sab", nome: "sabato" },
  { chiave: "dom", nome: "domenica" },
];

const MESI = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
];

/** Nomi dei giorni come li restituisce `getUTCDay()` (0 = domenica). */
const NOMI_GIORNO_UTC = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];

/**
 * Una data `AAAA-MM-GG` in forma estesa, per esempio "sabato 13 giugno 2026".
 * Il giorno della settimana si ricava dal calendario in UTC: non dipende dal fuso né dalla lingua del sistema.
 */
export function dataEstesa(data: string): string {
  const parti = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  if (parti === null) return data;
  const anno = Number(parti[1]);
  const mese = Number(parti[2]);
  const giorno = Number(parti[3]);
  const nomeGiorno = NOMI_GIORNO_UTC[new Date(Date.UTC(anno, mese - 1, giorno)).getUTCDay()];
  return `${nomeGiorno} ${giorno} ${MESI[mese - 1]} ${anno}`;
}

/** Un intervallo orario, per esempio "08:40–09:00". */
export function intervallo(inizio: string, fine: string): string {
  return `${inizio}–${fine}`;
}

/** Una durata in minuti, per esempio "150 minuti (2 h 30 min)". */
export function durata(minuti: number): string {
  const ore = Math.floor(minuti / 60);
  const resto = minuti % 60;
  if (ore === 0) return `${minuti} minuti`;
  const leggibile = resto === 0 ? `${ore} h` : `${ore} h ${resto} min`;
  return `${minuti} minuti (${leggibile})`;
}
