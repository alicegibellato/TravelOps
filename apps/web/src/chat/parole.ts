/**
 * Le preferenze e le date in parole semplici, per la chat e per la bozza dal vivo (REQ-CHAT-001, ST-CHAT-001C).
 * Solo testi: le etichette vengono dal motore (`ETICHETTE_PROFILO`).
 */
import { ETICHETTE_PROFILO, type BozzaProfilo } from "@travelops/engine";
import type { VocePreferenze } from "./tipi";

const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const GIORNI = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];

/** "sabato 13 giugno" da `2026-06-13`. */
export function giornoInParole(data: string): string {
  const giorno = new Date(`${data}T12:00:00Z`);
  if (Number.isNaN(giorno.getTime())) return data;
  return `${GIORNI[giorno.getUTCDay()]} ${giorno.getUTCDate()} ${MESI[giorno.getUTCMonth()]}`;
}

function elenco(valori: readonly string[]): string {
  if (valori.length <= 1) return valori.join("");
  return `${valori.slice(0, -1).join(", ")} e ${valori.at(-1)}`;
}

/** Le voci del riepilogo delle preferenze, in parole semplici. */
export function vociPreferenze(profilo: BozzaProfilo): VocePreferenze[] {
  const voci: VocePreferenze[] = [];
  const e = ETICHETTE_PROFILO;
  const d = profilo.destinazione;
  if (d !== undefined) voci.push({ etichetta: e.campo.destinazione, valore: d.tipo === "luogo" ? d.nome : "Sorprendimi" });
  const date = profilo.date;
  if (date?.tipo === "precise") voci.push({ etichetta: "Quando", valore: `da ${giornoInParole(date.inizio)} a ${giornoInParole(date.fine)}` });
  else if (date?.tipo === "mese") {
    const [anno, mese] = date.mese.split("-");
    const durata = profilo.durata === undefined ? "" : `, ${profilo.durata} giorni`;
    voci.push({ etichetta: "Quando", valore: `${MESI[Number(mese) - 1] ?? date.mese} ${anno ?? ""}${durata}`.trim() });
  }
  const v = profilo.viaggiatori;
  if (v !== undefined) {
    const adulti = v.adulti ?? 0;
    const bambini = v.bambini ?? [];
    const parti = [adulti === 1 ? "1 adulto" : `${adulti} adulti`];
    if (bambini.length > 0) parti.push(bambini.length === 1 ? `1 bambino (${bambini[0]} anni)` : `${bambini.length} bambini (${elenco(bambini.map(String))} anni)`);
    voci.push({ etichetta: "Chi viaggia", valore: elenco(parti) });
  }
  if (profilo.stili !== undefined && profilo.stili.length > 0) voci.push({ etichetta: "Stili", valore: elenco(profilo.stili.map((s) => e.stile[s])) });
  if (profilo.ritmo !== undefined) voci.push({ etichetta: e.campo.ritmo, valore: `${e.ritmo[profilo.ritmo]}: ${e.descrizioneRitmo[profilo.ritmo]}` });
  if (profilo.formaFisica !== undefined) voci.push({ etichetta: e.campo.formaFisica, valore: e.formaFisica[profilo.formaFisica] });
  if (profilo.budget !== undefined) voci.push({ etichetta: e.campo.budget, valore: e.budget[profilo.budget] });
  if (profilo.orari !== undefined) voci.push({ etichetta: e.campo.orari, valore: `${e.orari[profilo.orari]}: ${e.descrizioneOrari[profilo.orari]}` });
  return voci;
}
