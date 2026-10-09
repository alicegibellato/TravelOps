/**
 * Dati passati alla mappa del giorno: un indicatore numerato per ogni attività, nell'ordine dell'itinerario,
 * e una linea per ogni spostamento; i luoghi senza coordinate sono elencati a parte, sotto la mappa.
 * Il componente della mappa disegna solo questi dati, senza altra logica.
 */
import { trovaAttivita, type Catalogo, type Giorno, type Viaggio } from "@travelops/engine";
import { ETICHETTE_MEZZO, intervallo } from "./etichette";
import { nomeAttivita, riferimentoLuogo } from "./luoghi";

export interface PuntoMappa {
  luogoId: string;
  nome: string;
  lat: number;
  lon: number;
}

export interface IndicatoreMappa extends PuntoMappa {
  /** Numero mostrato sull'indicatore: la posizione dell'attività tra le attività del giorno, da 1. */
  numero: number;
  elementoId: string;
  attivita: string;
  orario: string;
}

export interface LineaMappa {
  elementoId: string;
  mezzo: string;
  orario: string;
  da: PuntoMappa;
  a: PuntoMappa;
}

export interface LuogoSenzaCoordinate {
  luogoId: string;
  nome: string;
  /** Gli elementi del giorno che usano il luogo; per le attività con il numero, per esempio "2. D3-E4". */
  elementi: string[];
  /** Gli stessi elementi in parole, per il viaggiatore: "3. Visita al MUSE", "Trattoria → MUSE (A piedi)". */
  usatoDa: string[];
}

export interface DatiMappa {
  data: string;
  indicatori: IndicatoreMappa[];
  linee: LineaMappa[];
  luoghiSenzaCoordinate: LuogoSenzaCoordinate[];
}

function puntoMappa(catalogo: Catalogo, luogoId: string): PuntoMappa | null {
  const luogo = riferimentoLuogo(catalogo, luogoId);
  if (luogo.coordinate === null) return null;
  return { luogoId, nome: luogo.nome, lat: luogo.coordinate.lat, lon: luogo.coordinate.lon };
}

/** I dati della mappa di un giorno. */
export function datiMappaGiorno(giorno: Giorno, catalogo: Catalogo): DatiMappa {
  const indicatori: IndicatoreMappa[] = [];
  const linee: LineaMappa[] = [];
  const senzaCoordinate = new Map<string, LuogoSenzaCoordinate>();
  const segnalaSenzaCoordinate = (luogoId: string, elemento: string, inParole: string): void => {
    const voce = senzaCoordinate.get(luogoId) ?? { luogoId, nome: riferimentoLuogo(catalogo, luogoId).nome, elementi: [], usatoDa: [] };
    if (!voce.elementi.includes(elemento)) {
      voce.elementi.push(elemento);
      voce.usatoDa.push(inParole);
    }
    senzaCoordinate.set(luogoId, voce);
  };

  let numeroAttivita = 0;
  for (const elemento of giorno.elementi) {
    const orario = intervallo(elemento.inizio, elemento.fine);
    if (elemento.tipo === "attivita") {
      numeroAttivita += 1;
      const luogoId = trovaAttivita(catalogo, elemento.attivitaId)?.luogoId;
      if (luogoId === undefined) continue;
      const punto = puntoMappa(catalogo, luogoId);
      if (punto === null) {
        segnalaSenzaCoordinate(luogoId, `${numeroAttivita}. ${elemento.id}`, `${numeroAttivita}. ${nomeAttivita(catalogo, elemento.attivitaId)}`);
        continue;
      }
      indicatori.push({
        ...punto,
        numero: numeroAttivita,
        elementoId: elemento.id,
        attivita: nomeAttivita(catalogo, elemento.attivitaId),
        orario,
      });
    } else {
      const da = puntoMappa(catalogo, elemento.da);
      const a = puntoMappa(catalogo, elemento.a);
      if (da !== null && a !== null) {
        linee.push({ elementoId: elemento.id, mezzo: ETICHETTE_MEZZO[elemento.mezzo], orario, da, a });
      }
      const tratta = `${riferimentoLuogo(catalogo, elemento.da).nome} → ${riferimentoLuogo(catalogo, elemento.a).nome} (${ETICHETTE_MEZZO[elemento.mezzo]})`;
      if (da === null) segnalaSenzaCoordinate(elemento.da, elemento.id, tratta);
      if (a === null) segnalaSenzaCoordinate(elemento.a, elemento.id, tratta);
    }
  }
  return { data: giorno.data, indicatori, linee, luoghiSenzaCoordinate: [...senzaCoordinate.values()] };
}

/** I dati della mappa del giorno con quella data, oppure `null` se il viaggio non ha quel giorno. */
export function datiMappa(viaggio: Viaggio, catalogo: Catalogo, data: string): DatiMappa | null {
  const giorno = viaggio.giorni.find((voce) => voce.data === data);
  return giorno === undefined ? null : datiMappaGiorno(giorno, catalogo);
}
