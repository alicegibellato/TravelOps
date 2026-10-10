/**
 * Orari e date per la vista Oggi (REQ-TODAY-001): solo per dire al viaggiatore quanto manca. Nessuna regola di
 * ripianificazione o di fattibilità: gli orari dell'itinerario restano quelli del motore e il momento è sempre
 * l'orologio simulato, mai quello di sistema.
 */

const MINUTI_PER_ORA = 60;
const MILLISECONDI_PER_GIORNO = 86_400_000;
const ORARIO = /^(\d{2}):(\d{2})$/;
const DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

/** I minuti dalla mezzanotte di un orario `HH:mm`. */
export function minutiDelGiorno(orario: string): number {
  const parti = ORARIO.exec(orario);
  if (parti === null) throw new Error(`Orario non valido: ${orario}`);
  return Number(parti[1]) * MINUTI_PER_ORA + Number(parti[2]);
}

/** I minuti da `da` ad `a` nello stesso giorno (negativi se `a` viene prima). */
export function minutiTra(da: string, a: string): number {
  return minutiDelGiorno(a) - minutiDelGiorno(da);
}

function giornoNumero(data: string): number {
  const parti = DATA.exec(data);
  if (parti === null) throw new Error(`Data non valida: ${data}`);
  return Date.UTC(Number(parti[1]), Number(parti[2]) - 1, Number(parti[3])) / MILLISECONDI_PER_GIORNO;
}

/** I giorni di calendario da `da` ad `a` (negativi se `a` viene prima). */
export function giorniTra(da: string, a: string): number {
  return giornoNumero(a) - giornoNumero(da);
}

/** Quanto manca, in parole: "45 minuti", "1 ora", "2 ore e 10 minuti". */
export function attesaInParole(minuti: number): string {
  const ore = Math.floor(minuti / MINUTI_PER_ORA);
  const resto = minuti % MINUTI_PER_ORA;
  const testoOre = ore === 1 ? "1 ora" : `${ore} ore`;
  const testoMinuti = resto === 1 ? "1 minuto" : `${resto} minuti`;
  if (ore === 0) return testoMinuti;
  return resto === 0 ? testoOre : `${testoOre} e ${testoMinuti}`;
}
