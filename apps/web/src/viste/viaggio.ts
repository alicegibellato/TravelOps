/** Dati per la vista viaggio: titolo, date e, per ogni giorno, partenza, alloggio e numero di elementi. */
import type { Catalogo, Viaggio } from "@travelops/engine";
import { dataEstesa } from "./etichette";
import { riferimentoLuogo, type RiferimentoLuogo } from "./luoghi";

export interface RigaGiornoViaggio {
  /** Numero del giorno nel viaggio, da 1. */
  numero: number;
  data: string;
  dataEstesa: string;
  luogoPartenza: RiferimentoLuogo;
  /** Alloggio della notte; `null` nell'ultimo giorno. */
  alloggio: RiferimentoLuogo | null;
  numeroElementi: number;
}

export interface VistaViaggio {
  id: string;
  titolo: string;
  dataInizio: string;
  dataFine: string;
  dataInizioEstesa: string;
  dataFineEstesa: string;
  fusoOrario: string;
  numeroViaggiatori: number;
  giorni: RigaGiornoViaggio[];
}

export function vistaViaggio(viaggio: Viaggio, catalogo: Catalogo): VistaViaggio {
  return {
    id: viaggio.id,
    titolo: viaggio.titolo,
    dataInizio: viaggio.dataInizio,
    dataFine: viaggio.dataFine,
    dataInizioEstesa: dataEstesa(viaggio.dataInizio),
    dataFineEstesa: dataEstesa(viaggio.dataFine),
    fusoOrario: viaggio.fusoOrario,
    numeroViaggiatori: viaggio.numeroViaggiatori,
    giorni: viaggio.giorni.map((giorno, indice) => ({
      numero: indice + 1,
      data: giorno.data,
      dataEstesa: dataEstesa(giorno.data),
      luogoPartenza: riferimentoLuogo(catalogo, giorno.luogoPartenza),
      alloggio: giorno.alloggio === undefined ? null : riferimentoLuogo(catalogo, giorno.alloggio),
      numeroElementi: giorno.elementi.length,
    })),
  };
}
