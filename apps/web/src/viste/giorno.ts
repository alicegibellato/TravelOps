/**
 * Dati per la vista giorno: gli elementi nell'ordine dell'itinerario, con orari, tipo, attività o tratta,
 * mezzo, priorità, orario fisso e prenotazione (codice e link di gestione).
 */
import { PRIORITA_PREDEFINITA, type Catalogo, type Elemento, type Viaggio } from "@travelops/engine";
import { dataEstesa, ETICHETTE_MEZZO, ETICHETTE_PRIORITA, ETICHETTE_TIPO, intervallo } from "./etichette";
import { nomeAttivita, riferimentoLuogo, type RiferimentoLuogo } from "./luoghi";

export interface PrenotazioneVista {
  fornitore: string;
  codice: string;
  /** Link di gestione della prenotazione; `null` se il dato non c'è. */
  linkGestione: string | null;
}

export interface RigaElemento {
  id: string;
  /** Posizione nel giorno, da 1. */
  posizione: number;
  tipo: Elemento["tipo"];
  tipoEtichetta: string;
  inizio: string;
  fine: string;
  orario: string;
  /** Il nome dell'attività oppure la tratta dello spostamento ("Partenza → Arrivo"). */
  descrizione: string;
  /** Solo per gli spostamenti. */
  mezzo: string | null;
  /** Solo per le attività. */
  priorita: string | null;
  orarioFisso: boolean;
  prenotazione: PrenotazioneVista | null;
}

export interface VistaGiorno {
  numero: number;
  data: string;
  dataEstesa: string;
  luogoPartenza: RiferimentoLuogo;
  alloggio: RiferimentoLuogo | null;
  elementi: RigaElemento[];
  /** Date del giorno precedente e successivo, per spostarsi tra i giorni. */
  dataPrecedente: string | null;
  dataSuccessiva: string | null;
}

/** Il nome dell'attività o la tratta dello spostamento. */
export function descriviElemento(elemento: Elemento, catalogo: Catalogo): string {
  if (elemento.tipo === "attivita") return nomeAttivita(catalogo, elemento.attivitaId);
  return `${riferimentoLuogo(catalogo, elemento.da).nome} → ${riferimentoLuogo(catalogo, elemento.a).nome}`;
}

export function prenotazioneVista(elemento: Elemento): PrenotazioneVista | null {
  const { prenotazione } = elemento;
  if (prenotazione === undefined) return null;
  return { fornitore: prenotazione.fornitore, codice: prenotazione.codice, linkGestione: prenotazione.linkGestione ?? null };
}

function rigaElemento(elemento: Elemento, indice: number, catalogo: Catalogo): RigaElemento {
  return {
    id: elemento.id,
    posizione: indice + 1,
    tipo: elemento.tipo,
    tipoEtichetta: ETICHETTE_TIPO[elemento.tipo],
    inizio: elemento.inizio,
    fine: elemento.fine,
    orario: intervallo(elemento.inizio, elemento.fine),
    descrizione: descriviElemento(elemento, catalogo),
    mezzo: elemento.tipo === "spostamento" ? ETICHETTE_MEZZO[elemento.mezzo] : null,
    priorita: elemento.tipo === "attivita" ? ETICHETTE_PRIORITA[elemento.priorita ?? PRIORITA_PREDEFINITA] : null,
    orarioFisso: elemento.orarioFisso === true,
    prenotazione: prenotazioneVista(elemento),
  };
}

/** La vista del giorno con quella data, oppure `null` se il viaggio non ha quel giorno. */
export function vistaGiorno(viaggio: Viaggio, catalogo: Catalogo, data: string): VistaGiorno | null {
  const indice = viaggio.giorni.findIndex((giorno) => giorno.data === data);
  const giorno = viaggio.giorni[indice];
  if (giorno === undefined) return null;
  return {
    numero: indice + 1,
    data: giorno.data,
    dataEstesa: dataEstesa(giorno.data),
    luogoPartenza: riferimentoLuogo(catalogo, giorno.luogoPartenza),
    alloggio: giorno.alloggio === undefined ? null : riferimentoLuogo(catalogo, giorno.alloggio),
    // Il motore garantisce l'ordine di inizio (regola R-4): la vista mantiene l'ordine dell'itinerario.
    elementi: giorno.elementi.map((elemento, i) => rigaElemento(elemento, i, catalogo)),
    dataPrecedente: viaggio.giorni[indice - 1]?.data ?? null,
    dataSuccessiva: viaggio.giorni[indice + 1]?.data ?? null,
  };
}
