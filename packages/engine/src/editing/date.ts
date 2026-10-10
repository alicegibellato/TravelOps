/**
 * Date del calendario per le modifiche che cambiano la durata del viaggio (REQ-EDIT-002): solo aritmetica sui
 * giorni in UTC, senza orologio né fuso orario, quindi deterministica.
 */
import type { Data } from "../model/index.js";

/** La data `n` giorni dopo `data` (prima, se `n` è negativo). */
export function piuGiorni(data: Data, n: number): Data {
  const giorno = new Date(`${data}T00:00:00Z`);
  giorno.setUTCDate(giorno.getUTCDate() + n);
  return giorno.toISOString().slice(0, 10);
}

/** "1 giorno", "2 giorni". */
export const giorniTesto = (n: number): string => (n === 1 ? "1 giorno" : `${n} giorni`);
