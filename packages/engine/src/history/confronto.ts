/**
 * Confronto tra due itinerari per `id` degli elementi (REQ-ITIN-002 R-4).
 */
import type { Elemento, Viaggio } from "../model/index.js";
import { copia, uguali } from "./supporto.js";
import {
  CAMPI_ELEMENTO,
  type CampoCambiato,
  type CampoElemento,
  type DifferenzaItinerari,
  type ElementoDatato,
  type ValoreCampo,
} from "./tipi.js";

/** Gli elementi del viaggio con la data del giorno, nell'ordine dell'itinerario. */
function elementiDatati(viaggio: Viaggio): ElementoDatato[] {
  return viaggio.giorni.flatMap((giorno) => giorno.elementi.map((elemento) => ({ data: giorno.data, elemento })));
}

/** Il valore di un campo con i valori predefiniti del modello: orario non fisso, priorità `desiderata`. */
function valore(voce: ElementoDatato, campo: CampoElemento): ValoreCampo {
  const elemento: Elemento = voce.elemento;
  switch (campo) {
    case "data":
      return voce.data;
    case "tipo":
    case "inizio":
    case "fine":
      return elemento[campo];
    case "orarioFisso":
      return elemento.orarioFisso ?? false;
    case "prenotazione":
      return elemento.prenotazione === undefined ? null : copia(elemento.prenotazione);
    case "attivitaId":
      return elemento.tipo === "attivita" ? elemento.attivitaId : null;
    case "priorita":
      return elemento.tipo === "attivita" ? (elemento.priorita ?? "desiderata") : null;
    case "da":
    case "a":
    case "mezzo":
      return elemento.tipo === "spostamento" ? elemento[campo] : null;
  }
}

/** I campi diversi tra due versioni di uno stesso elemento, nell'ordine di `CAMPI_ELEMENTO`. */
function campiCambiati(prima: ElementoDatato, dopo: ElementoDatato): CampoCambiato[] {
  const campi: CampoCambiato[] = [];
  for (const campo of CAMPI_ELEMENTO) {
    const valorePrima = valore(prima, campo);
    const valoreDopo = valore(dopo, campo);
    if (!uguali(valorePrima, valoreDopo)) campi.push({ campo, prima: valorePrima, dopo: valoreDopo });
  }
  return campi;
}

/**
 * Le differenze dall'itinerario `a` all'itinerario `b`: stesso `id` con campi diversi = modificato;
 * `id` solo in `b` = aggiunto; `id` solo in `a` = rimosso. Il risultato è una copia: si può modificare liberamente.
 */
export function confrontaItinerari(a: Viaggio, b: Viaggio): DifferenzaItinerari {
  const elementiA = elementiDatati(a);
  const elementiB = elementiDatati(b);
  const perIdA = new Map(elementiA.map((voce) => [voce.elemento.id, voce]));
  const idB = new Set(elementiB.map((voce) => voce.elemento.id));

  const differenza: DifferenzaItinerari = { aggiunti: [], rimossi: [], modificati: [] };
  for (const dopo of elementiB) {
    const prima = perIdA.get(dopo.elemento.id);
    if (prima === undefined) {
      differenza.aggiunti.push(copia(dopo));
      continue;
    }
    const campi = campiCambiati(prima, dopo);
    if (campi.length > 0) differenza.modificati.push({ id: dopo.elemento.id, prima: copia(prima), dopo: copia(dopo), campi });
  }
  for (const prima of elementiA) {
    if (!idB.has(prima.elemento.id)) differenza.rimossi.push(copia(prima));
  }
  return differenza;
}

/** Vero se i due viaggi hanno lo stesso itinerario (stessi giorni con gli stessi elementi), a meno dei valori predefiniti. */
export function stessoItinerario(a: Viaggio, b: Viaggio): boolean {
  if (a.giorni.length !== b.giorni.length) return false;
  const giorniUguali = a.giorni.every((giornoA, i) => {
    const giornoB = b.giorni[i];
    return (
      giornoB !== undefined &&
      giornoA.data === giornoB.data &&
      giornoA.luogoPartenza === giornoB.luogoPartenza &&
      (giornoA.alloggio ?? null) === (giornoB.alloggio ?? null) &&
      uguali(
        giornoA.elementi.map((e) => e.id),
        giornoB.elementi.map((e) => e.id),
      )
    );
  });
  if (!giorniUguali) return false;
  const differenza = confrontaItinerari(a, b);
  return differenza.aggiunti.length === 0 && differenza.rimossi.length === 0 && differenza.modificati.length === 0;
}
