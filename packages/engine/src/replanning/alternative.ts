/**
 * Alternative con link (REQ-REPLAN-002 R-ALT-1…R-ALT-3). Il motore costruisce gli indirizzi senza
 * aprirli e senza chiamare la rete: TravelOps non agisce mai sulle prenotazioni.
 */
import type { Alternativa, AlternativaEstesa, Catalogo, Data, Elemento } from "../model/index.js";
import { IndiceCatalogo } from "./supporto.js";

/** Indirizzo di ricerca voli (R-ALT-2): il testo della ricerca va codificato per URL, spazi come `%20`. */
export const INDIRIZZO_RICERCA_VOLI = "https://www.google.com/travel/flights?q=";
/** Indirizzo di ricerca treni (R-ALT-2). */
export const INDIRIZZO_RICERCA_TRENI = "https://www.thetrainline.com/it";

/**
 * Le alternative di ogni elemento, nell'ordine ricevuto e, per ciascuno, nell'ordine di R-ALT-2:
 * gestione della prenotazione (se c'è un link di gestione), ricerca voli (spostamento in volo),
 * ricerca treni (spostamento in treno). Un elemento ripetuto (stesso `id`) conta una volta sola.
 */
export function costruisciAlternative(
  voci: readonly { data: Data; elemento: Elemento }[],
  catalogo: Catalogo | IndiceCatalogo,
): Alternativa[] {
  const indice = catalogo instanceof IndiceCatalogo ? catalogo : new IndiceCatalogo(catalogo);
  const visti = new Set<string>();
  const alternative: Alternativa[] = [];
  for (const { data, elemento } of voci) {
    if (visti.has(elemento.id)) continue;
    visti.add(elemento.id);
    const { prenotazione } = elemento;
    if (prenotazione?.linkGestione !== undefined) {
      alternative.push({
        tipo: "gestione_prenotazione",
        elementoId: elemento.id,
        etichetta: `Gestisci la prenotazione ${prenotazione.codice} (${prenotazione.fornitore})`,
        indirizzo: prenotazione.linkGestione,
      });
    }
    if (elemento.tipo !== "spostamento") continue;
    const partenza = indice.nomeLuogo(elemento.da);
    const arrivo = indice.nomeLuogo(elemento.a);
    if (elemento.mezzo === "volo") {
      alternative.push({
        tipo: "ricerca_voli",
        elementoId: elemento.id,
        etichetta: `Cerca voli da ${partenza} a ${arrivo} il ${data}`,
        indirizzo: INDIRIZZO_RICERCA_VOLI + encodeURIComponent(`Voli da ${partenza} a ${arrivo} il ${data}`),
      });
    }
    if (elemento.mezzo === "treno") {
      alternative.push({
        tipo: "ricerca_treni",
        elementoId: elemento.id,
        etichetta: `Cerca treni da ${partenza} a ${arrivo} il ${data} su Trainline`,
        indirizzo: INDIRIZZO_RICERCA_TRENI,
      });
    }
  }
  return alternative;
}

/** Ricerca su Google Maps (REQ-REPLAN-004 R2-SAL): il testo va codificato per URL, spazi come `%20`. */
export const INDIRIZZO_RICERCA_MAPPE = "https://www.google.com/maps/search/?api=1&query=";
/** Denuncia alla Polizia di Stato (REQ-REPLAN-004 R2-DOC). */
export const INDIRIZZO_POLIZIA = "https://www.poliziadistato.it";

/**
 * R2-SAL: "Farmacie vicine" e "Pronto soccorso vicino", ricerche su Google Maps con il nome della zona. Il motore
 * costruisce gli indirizzi senza aprirli né chiamare la rete.
 */
export function alternativeSalute(nomeZona: string): AlternativaEstesa[] {
  return [
    {
      tipo: "farmacie_vicine",
      etichetta: "Farmacie vicine",
      indirizzo: INDIRIZZO_RICERCA_MAPPE + encodeURIComponent(`farmacie ${nomeZona}`),
    },
    {
      tipo: "pronto_soccorso_vicino",
      etichetta: "Pronto soccorso vicino",
      indirizzo: INDIRIZZO_RICERCA_MAPPE + encodeURIComponent(`pronto soccorso ${nomeZona}`),
    },
  ];
}

/** R2-DOC: "Polizia di Stato — denuncia", costruito senza aprirlo. */
export function alternativaPolizia(): AlternativaEstesa {
  return { tipo: "denuncia_polizia", etichetta: "Polizia di Stato — denuncia", indirizzo: INDIRIZZO_POLIZIA };
}
