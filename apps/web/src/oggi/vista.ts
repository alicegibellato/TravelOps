/**
 * La vista Oggi (REQ-TODAY-001): per un viaggio in corso, cosa succede adesso e cosa viene dopo, al momento
 * dell'orologio simulato; fuori dal viaggio, quanto manca alla partenza o il riepilogo del viaggio concluso.
 *
 * Legge l'itinerario così come l'ha costruito il motore, senza cambiarlo: proposte e controlli restano del motore.
 */
import { trovaAttivita, type Catalogo, type Elemento, type Giorno, type Momento, type Viaggio } from "@travelops/engine";
import { momentoEsteso } from "../viste/demo";
import { dataEstesa, ETICHETTE_MEZZO } from "../viste/etichette";
import { vistaGiorno, type RigaElemento, type VistaGiorno } from "../viste/giorno";
import { riferimentoLuogo, type RiferimentoLuogo } from "../viste/luoghi";
import { giorniTra, minutiTra } from "./tempo";

export interface PosizionePrevista {
  luogo: RiferimentoLuogo;
  /** `true` durante uno spostamento: il luogo è quello verso cui si sta andando. */
  inViaggio: boolean;
}

/** La scheda "Adesso". */
export interface Adesso {
  /** L'elemento in corso; `null` se in questo momento non c'è niente in programma. */
  elemento: RigaElemento | null;
  /** Fino a quando: la fine dell'elemento in corso o, se non c'è, l'inizio del prossimo; `null` se oggi non c'è altro. */
  fino: string | null;
  /** I minuti che mancano a `fino`. */
  minutiRimanenti: number | null;
  posizione: PosizionePrevista;
}

/** La scheda "Dopo": la prossima attività e quando partire. */
export interface Dopo {
  elemento: RigaElemento;
  /** L'orario in cui partire (lo spostamento che porta all'attività); `null` se si è già in viaggio verso di lei. */
  partenza: string | null;
  /** I minuti che mancano alla partenza, oppure all'inizio se si è già in viaggio. */
  minutiAllaPartenza: number;
  /** Il mezzo dello spostamento che porta all'attività, se c'è. */
  mezzo: string | null;
}

export type VistaOggi =
  | { fase: "prima"; momento: Momento; momentoEsteso: string; dataInizio: string; dataInizioEstesa: string; giorniAllaPartenza: number }
  | {
      fase: "concluso";
      momento: Momento;
      momentoEsteso: string;
      dataFine: string;
      dataFineEstesa: string;
      numeroGiorni: number;
      numeroAttivita: number;
    }
  | { fase: "in_corso"; momento: Momento; momentoEsteso: string; giorno: VistaGiorno; adesso: Adesso; dopo: Dopo | null };

/** Il luogo in cui si trova chi ha appena finito (o sta facendo) quell'elemento. */
function luogoDopo(elemento: Elemento, catalogo: Catalogo): string | null {
  if (elemento.tipo === "spostamento") return elemento.a;
  return trovaAttivita(catalogo, elemento.attivitaId)?.luogoId ?? null;
}

function posizionePrevista(giorno: Giorno, corrente: Elemento | null, passati: readonly Elemento[], catalogo: Catalogo): PosizionePrevista {
  if (corrente !== null) {
    const luogo = luogoDopo(corrente, catalogo);
    if (luogo !== null) return { luogo: riferimentoLuogo(catalogo, luogo), inViaggio: corrente.tipo === "spostamento" };
  }
  for (const elemento of [...passati].reverse()) {
    const luogo = luogoDopo(elemento, catalogo);
    if (luogo !== null) return { luogo: riferimentoLuogo(catalogo, luogo), inViaggio: false };
  }
  return { luogo: riferimentoLuogo(catalogo, giorno.luogoPartenza), inViaggio: false };
}

function dopo(giorno: Giorno, righe: readonly RigaElemento[], corrente: Elemento | null, ora: string): Dopo | null {
  const elementi = giorno.elementi;
  const indiceCorrente = corrente === null ? -1 : elementi.indexOf(corrente);
  const daQui = elementi.map((elemento, indice) => ({ elemento, indice })).filter(({ elemento, indice }) => indice > indiceCorrente && elemento.inizio >= ora);
  const prossima = daQui.find(({ elemento }) => elemento.tipo === "attivita") ?? daQui[0];
  if (prossima === undefined) return null;
  const riga = righe[prossima.indice];
  if (riga === undefined) return null;
  const precedente = elementi[prossima.indice - 1];
  const viaggioVerso = prossima.elemento.tipo === "attivita" && precedente?.tipo === "spostamento" ? precedente : null;
  if (viaggioVerso !== null && viaggioVerso === corrente) {
    return { elemento: riga, partenza: null, minutiAllaPartenza: minutiTra(ora, riga.inizio), mezzo: ETICHETTE_MEZZO[viaggioVerso.mezzo] };
  }
  const partenza = viaggioVerso !== null && viaggioVerso.inizio >= ora ? viaggioVerso.inizio : riga.inizio;
  return {
    elemento: riga,
    partenza,
    minutiAllaPartenza: minutiTra(ora, partenza),
    mezzo: viaggioVerso === null ? null : ETICHETTE_MEZZO[viaggioVerso.mezzo],
  };
}

/** Vero se il viaggio è in corso in quel momento (il giorno è tra il primo e l'ultimo del viaggio). */
export function viaggioInCorso(viaggio: Viaggio, momento: Momento): boolean {
  return viaggio.giorni.some((giorno) => giorno.data === momento.data);
}

/** La vista Oggi del viaggio al momento dato (l'orologio simulato). */
export function vistaOggi(viaggio: Viaggio, catalogo: Catalogo, momento: Momento): VistaOggi {
  const quando = momentoEsteso(momento);
  const primo = viaggio.giorni[0]?.data ?? viaggio.dataInizio;
  const indice = viaggio.giorni.findIndex((g) => g.data === momento.data);
  const giorno = viaggio.giorni[indice];
  const vista = vistaGiorno(viaggio, catalogo, momento.data);
  if (giorno === undefined || vista === null) {
    if (momento.data < primo) {
      return {
        fase: "prima",
        momento,
        momentoEsteso: quando,
        dataInizio: primo,
        dataInizioEstesa: dataEstesa(primo),
        giorniAllaPartenza: giorniTra(momento.data, primo),
      };
    }
    const ultimo = viaggio.giorni[viaggio.giorni.length - 1]?.data ?? viaggio.dataFine;
    return {
      fase: "concluso",
      momento,
      momentoEsteso: quando,
      dataFine: ultimo,
      dataFineEstesa: dataEstesa(ultimo),
      numeroGiorni: viaggio.giorni.length,
      numeroAttivita: viaggio.giorni.reduce((n, g) => n + g.elementi.filter((e) => e.tipo === "attivita").length, 0),
    };
  }

  const ora = momento.ora;
  const corrente = giorno.elementi.find((e) => e.inizio <= ora && ora < e.fine) ?? null;
  const passati = giorno.elementi.filter((e) => e.fine <= ora);
  const rigaCorrente = corrente === null ? null : (vista.elementi[giorno.elementi.indexOf(corrente)] ?? null);
  const prossimo = giorno.elementi.find((e) => e.inizio > ora) ?? null;
  const fino = corrente !== null ? corrente.fine : (prossimo?.inizio ?? null);
  return {
    fase: "in_corso",
    momento,
    momentoEsteso: quando,
    giorno: vista,
    adesso: {
      elemento: rigaCorrente,
      fino,
      minutiRimanenti: fino === null ? null : minutiTra(ora, fino),
      posizione: posizionePrevista(giorno, corrente, passati, catalogo),
    },
    dopo: dopo(giorno, vista.elementi, corrente, ora),
  };
}
