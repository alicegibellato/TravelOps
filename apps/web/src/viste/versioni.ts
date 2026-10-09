/**
 * Dati per le versioni dello stato locale (REQ-WEB-002): elenco con numero, momento, causa e autore; confronto tra
 * due versioni con elementi aggiunti, rimossi e modificati; vista giorno di una versione con i problemi di
 * fattibilità accanto agli elementi coinvolti.
 * Elenco, lettura e confronto sono del motore (`elencaVersioni`, `leggiVersione`, `confrontaVersioni`), i problemi
 * vengono da `controllaFattibilita`: qui si trasformano solo in testo da mostrare.
 */
import {
  confrontaVersioni,
  controllaFattibilita,
  elencaVersioni,
  leggiVersione,
  versioneCorrente,
  type CampoElemento,
  type Catalogo,
  type ElementoDatato,
  type Problema,
  type ValoreCampo,
  type Viaggio,
} from "@travelops/engine";
import { sorgenteConImprevisto, trovaScenario } from "../dati/scenari";
import type { StatoDemo } from "../stato/stato";
import { momentoEsteso } from "./demo";
import { dataEstesa, ETICHETTE_MEZZO, ETICHETTE_PRIORITA, ETICHETTE_TIPO, intervallo } from "./etichette";
import { descriviElemento } from "./giorno";
import { nomeAttivita, riferimentoLuogo } from "./luoghi";
import { segnaliGiorno, type SegnaliGiorno } from "./segnalazioni";

export interface RigaVersione {
  numero: number;
  /** Il momento dell'accettazione in parole; `null` nella versione 1. */
  momento: string | null;
  causa: string;
  autore: string | null;
  corrente: boolean;
}

export interface ElementoConfronto {
  id: string;
  data: string;
  dataEstesa: string;
  orario: string;
  descrizione: string;
}

export interface CampoConfronto {
  campo: CampoElemento;
  etichetta: string;
  prima: string;
  dopo: string;
}

export interface ModificatoConfronto {
  id: string;
  descrizione: string;
  campi: CampoConfronto[];
}

export interface VistaConfronto {
  a: number;
  b: number;
  aggiunti: ElementoConfronto[];
  rimossi: ElementoConfronto[];
  modificati: ModificatoConfronto[];
  vuoto: boolean;
}

export interface VistaVersioni {
  righe: RigaVersione[];
  corrente: number;
  numeri: number[];
  /** Le versioni scelte per il confronto (predefinite: la precedente e la corrente). */
  a: number;
  b: number;
  confronto: VistaConfronto | null;
  /** Il messaggio del motore se il confronto non è possibile (per esempio una versione inesistente). */
  erroreConfronto: string | null;
}

export const ETICHETTE_CAMPO: Record<CampoElemento, string> = {
  data: "Giorno",
  tipo: "Tipo",
  inizio: "Inizio",
  fine: "Fine",
  orarioFisso: "Orario fisso",
  prenotazione: "Prenotazione",
  attivitaId: "Attività",
  priorita: "Priorità",
  da: "Partenza",
  a: "Arrivo",
  mezzo: "Mezzo",
};

/** Il valore di un campo cambiato, in parole. */
export function valoreCampo(campo: CampoElemento, valore: ValoreCampo, catalogo: Catalogo): string {
  if (valore === null) return "—";
  if (typeof valore === "boolean") return valore ? "Sì" : "No";
  if (typeof valore === "object") return `${valore.codice} (${valore.fornitore})`;
  switch (campo) {
    case "data":
      return dataEstesa(valore);
    case "tipo":
      return ETICHETTE_TIPO[valore as keyof typeof ETICHETTE_TIPO] ?? valore;
    case "attivitaId":
      return nomeAttivita(catalogo, valore);
    case "priorita":
      return ETICHETTE_PRIORITA[valore as keyof typeof ETICHETTE_PRIORITA] ?? valore;
    case "da":
    case "a":
      return riferimentoLuogo(catalogo, valore).nome;
    case "mezzo":
      return ETICHETTE_MEZZO[valore as keyof typeof ETICHETTE_MEZZO] ?? valore;
    default:
      return valore;
  }
}

function elementoConfronto(datato: ElementoDatato, catalogo: Catalogo): ElementoConfronto {
  return {
    id: datato.elemento.id,
    data: datato.data,
    dataEstesa: dataEstesa(datato.data),
    orario: intervallo(datato.elemento.inizio, datato.elemento.fine),
    descrizione: descriviElemento(datato.elemento, catalogo),
  };
}

export function vistaVersioni(stato: StatoDemo, catalogo: Catalogo, a: number | null = null, b: number | null = null): VistaVersioni {
  const corrente = versioneCorrente(stato.storico).numero;
  const righe = elencaVersioni(stato.storico).map((voce) => ({
    numero: voce.numero,
    momento: voce.momento === null ? null : momentoEsteso(voce.momento),
    causa: voce.causa,
    autore: voce.autore,
    corrente: voce.numero === corrente,
  }));
  const sceltaA = a ?? Math.max(1, corrente - 1);
  const sceltaB = b ?? corrente;
  const esito = confrontaVersioni(stato.storico, sceltaA, sceltaB);
  let confronto: VistaConfronto | null = null;
  if (esito.ok) {
    const c = esito.confronto;
    confronto = {
      a: c.versioneA,
      b: c.versioneB,
      aggiunti: c.aggiunti.map((d) => elementoConfronto(d, catalogo)),
      rimossi: c.rimossi.map((d) => elementoConfronto(d, catalogo)),
      modificati: c.modificati.map((m) => ({
        id: m.id,
        descrizione: descriviElemento(m.dopo.elemento, catalogo),
        campi: m.campi.map((x) => ({
          campo: x.campo,
          etichetta: ETICHETTE_CAMPO[x.campo],
          prima: valoreCampo(x.campo, x.prima, catalogo),
          dopo: valoreCampo(x.campo, x.dopo, catalogo),
        })),
      })),
      vuoto: c.aggiunti.length + c.rimossi.length + c.modificati.length === 0,
    };
  }
  return {
    righe,
    corrente,
    numeri: righe.map((r) => r.numero),
    a: sceltaA,
    b: sceltaB,
    confronto,
    erroreConfronto: esito.ok ? null : esito.errore.messaggio,
  };
}

/** Una versione dello storico per le viste: il suo viaggio, il numero e la causa. */
export interface VersioneLetta {
  numero: number;
  causa: string;
  corrente: number;
  viaggio: Viaggio;
}

/** La versione con quel numero (letta con `leggiVersione`), oppure il messaggio del motore se non esiste. */
export function leggiVersioneStato(stato: StatoDemo, numero: number): { ok: true; versione: VersioneLetta } | { ok: false; messaggio: string } {
  const letta = leggiVersione(stato.storico, numero);
  if (!letta.ok) return { ok: false, messaggio: letta.errore.messaggio };
  const voce = elencaVersioni(stato.storico).find((v) => v.numero === numero);
  return {
    ok: true,
    versione: { numero, causa: voce?.causa ?? "", corrente: versioneCorrente(stato.storico).numero, viaggio: letta.viaggio },
  };
}

/**
 * I problemi di fattibilità di un viaggio secondo il motore (`controllaFattibilita`). Se uno scenario è in corso, il
 * controllo usa i dati di contesto arricchiti con il suo imprevisto (pioggia o chiusura), come la ripianificazione.
 */
export function problemiDelViaggio(stato: StatoDemo, viaggio: Viaggio, catalogo: Catalogo): Problema[] {
  const scenario = stato.scenario === null ? null : trovaScenario(stato.scenario);
  return controllaFattibilita(viaggio, catalogo, sorgenteConImprevisto(scenario?.imprevisto ?? null));
}

/** Le segnalazioni del giorno con quella data: i problemi di fattibilità accanto agli elementi coinvolti. */
export function segnaliGiornoVersione(stato: StatoDemo, viaggio: Viaggio, catalogo: Catalogo, data: string): SegnaliGiorno | null {
  const giorno = viaggio.giorni.find((g) => g.data === data);
  if (giorno === undefined) return null;
  return segnaliGiorno(
    giorno.elementi.map((e) => e.id),
    { problemi: problemiDelViaggio(stato, viaggio, catalogo) },
  );
}
