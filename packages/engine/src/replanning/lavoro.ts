/**
 * Stato di lavoro di una ripianificazione (REQ-REPLAN-002): il viaggio che si sta modificando
 * (sempre una copia, mai quello ricevuto) e le ragioni raccolte per la spiegazione (R-4).
 */
import type {
  AlternativaEstesa,
  Catalogo,
  Data,
  Elemento,
  Problema,
  SorgenteDatiContesto,
  Viaggio,
} from "../model/index.js";
import type { ProfiloPreferenze } from "../preferences/tipi.js";
import type { ImpattoDettagliato } from "./impatto.js";
import { IndiceCatalogo, giornoDi, ordinaElementi } from "./supporto.js";

export interface Lavoro {
  /** Il viaggio ricevuto: non viene mai modificato. */
  readonly originale: Viaggio;
  /** Copia in lavorazione: diventerà l'itinerario della proposta. */
  viaggio: Viaggio;
  readonly catalogo: Catalogo;
  readonly indice: IndiceCatalogo;
  /** Sorgente dei dati di contesto arricchita con l'imprevisto (R-3). */
  readonly sorgente: SorgenteDatiContesto;
  /** Profilo delle preferenze del viaggio, se c'è (REQ-REPLAN-004 R2-PREF). */
  readonly profilo: ProfiloPreferenze | undefined;
  /** Perché cambia ogni elemento aggiunto, rimosso o modificato, per `id` (R-4). */
  readonly motivi: Map<string, string>;
  /** Elementi a rischio per le regole dei singoli casi, con il perché (§2.6 c). */
  readonly aRischio: Map<string, string>;
  /** Spiegazioni generali (per esempio la scelta della sostituta), nell'ordine in cui nascono. */
  readonly note: string[];
  /** Motivi per cui la spiegazione deve chiedere al viaggiatore come procedere. */
  readonly domande: string[];
  /** Impatti dei ritardi che la ripianificazione stessa genera (R-CAN-1). */
  readonly impattiDerivati: ImpattoDettagliato[];
  /** Spostamenti cancellati o colpiti da sciopero, com'erano, per le alternative (R-ALT-1). */
  readonly cancellati: { data: Data; elemento: Elemento }[];
  /** Alternative che non riguardano un elemento a rischio (farmacie, polizia, volo di arrivo; REQ-REPLAN-004). */
  readonly alternativeExtra: AlternativaEstesa[];
  /** Problemi bloccanti delle regole dei singoli casi, oltre a quelli del controllo di fattibilità (R2-BAG, R2-DOC). */
  readonly problemiExtra: Problema[];
}

export function creaLavoro(
  originale: Viaggio,
  copia: Viaggio,
  catalogo: Catalogo,
  sorgente: SorgenteDatiContesto,
  profilo?: ProfiloPreferenze,
): Lavoro {
  return {
    originale,
    viaggio: copia,
    catalogo,
    indice: new IndiceCatalogo(catalogo),
    sorgente,
    profilo,
    motivi: new Map(),
    aRischio: new Map(),
    note: [],
    domande: [],
    impattiDerivati: [],
    cancellati: [],
    alternativeExtra: [],
    problemiExtra: [],
  };
}

/** Sostituisce gli elementi del giorno `data` nel viaggio in lavorazione, in ordine di inizio. */
export function impostaElementi(lavoro: Lavoro, data: Data, elementi: readonly Elemento[]): void {
  lavoro.viaggio = {
    ...lavoro.viaggio,
    giorni: lavoro.viaggio.giorni.map((g) => (g.data === data ? { ...g, elementi: ordinaElementi(elementi) } : g)),
  };
}

/** Gli elementi del giorno `data` nel viaggio in lavorazione, in ordine di inizio. */
export function elementiDel(lavoro: Lavoro, data: Data): Elemento[] {
  return ordinaElementi(giornoDi(lavoro.viaggio, data)?.elementi ?? []);
}

/** Aggiunge un motivo di domanda al viaggiatore, senza ripetizioni. */
export function chiedi(lavoro: Lavoro, motivo: string): void {
  if (!lavoro.domande.includes(motivo)) lavoro.domande.push(motivo);
}
