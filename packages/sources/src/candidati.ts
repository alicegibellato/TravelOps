/**
 * Le destinazioni candidate di "Sorprendimi" (REQ-CAT-002, REQ-PREF-001 CA-7): un elenco configurabile in
 * `candidates.json`, con stili prevalenti e mesi consigliati, ordinato col punteggio del profilo. Si propongono le
 * prime 3; il viaggiatore ne sceglie una.
 *
 * Il punteggio non è riscritto qui: ogni candidata è trattata come un'attività neutra con gli stili della
 * destinazione e valutata con `valutaAttivita` del motore (§7.7): +3 per ogni stile in comune con il profilo, +5 per
 * uno stile irrinunciabile, esclusa se uno stile è tra le cose da evitare. Gli altri limiti del profilo (forma
 * fisica, mobilità, bambini, budget) riguardano le singole attività, non la destinazione, e qui non escludono.
 *
 * Funzioni pure, nessuna rete: l'elenco arriva da fuori (il file JSON letto da chi usa il pacchetto).
 */
import { valutaAttivita, VALORI_AMMESSI, type AttivitaCatalogoEstesa, type ProfiloPreferenze, type StileViaggio } from "@travelops/engine";
import { FORMATO_ID_ISTANTANEA } from "./formato.js";

/** Quante destinazioni si propongono al viaggiatore. */
export const NUMERO_PROPOSTE_SORPRENDIMI = 3;

/** Una destinazione candidata. */
export interface DestinazioneCandidata {
  /** Lettere minuscole, cifre e trattini. */
  id: string;
  /** Nome da cercare e da mostrare. */
  nome: string;
  /** Una frase per il viaggiatore. */
  descrizione: string;
  /** Gli stili prevalenti della destinazione (almeno uno). */
  stili: StileViaggio[];
  /** I mesi consigliati, da 1 (gennaio) a 12 (dicembre). */
  mesiConsigliati: number[];
}

/** L'elenco delle candidate, come sta in `candidates.json`. */
export interface ElencoCandidati {
  formato: 1;
  candidati: DestinazioneCandidata[];
}

export type EsitoLetturaCandidati = { ok: true; elenco: ElencoCandidati } | { ok: false; problemi: string[] };

const stiliAmmessi: readonly string[] = VALORI_AMMESSI.stile;

const eOggetto = (valore: unknown): valore is Record<string, unknown> =>
  typeof valore === "object" && valore !== null && !Array.isArray(valore);

/** Legge e valida l'elenco (JSON già decodificato); restituisce tutti i problemi in italiano, mai un'eccezione. */
export function leggiCandidati(grezzo: unknown): EsitoLetturaCandidati {
  const problemi: string[] = [];
  if (!eOggetto(grezzo) || grezzo["formato"] !== 1 || !Array.isArray(grezzo["candidati"])) {
    return { ok: false, problemi: ["L'elenco delle destinazioni candidate deve avere \"formato\": 1 e un elenco \"candidati\"."] };
  }
  const candidati: DestinazioneCandidata[] = [];
  const visti = new Set<string>();
  grezzo["candidati"].forEach((voce: unknown, indice: number) => {
    const dove = `Candidata ${indice + 1}`;
    const prima = problemi.length;
    if (!eOggetto(voce)) {
      problemi.push(`${dove}: deve essere un oggetto.`);
      return;
    }
    const { id, nome, descrizione, stili, mesiConsigliati } = voce;
    if (typeof id !== "string" || !FORMATO_ID_ISTANTANEA.test(id)) problemi.push(`${dove}: l'identificativo non è valido.`);
    else if (visti.has(id)) problemi.push(`${dove}: l'identificativo "${id}" è ripetuto.`);
    else visti.add(id);
    if (typeof nome !== "string" || nome.trim() === "") problemi.push(`${dove}: manca il nome.`);
    if (typeof descrizione !== "string" || descrizione.trim() === "") problemi.push(`${dove}: manca la descrizione.`);
    if (!Array.isArray(stili) || stili.length === 0 || !stili.every((s) => typeof s === "string" && stiliAmmessi.includes(s))) {
      problemi.push(`${dove}: servono uno o più stili tra quelli ammessi.`);
    }
    if (
      !Array.isArray(mesiConsigliati) ||
      mesiConsigliati.length === 0 ||
      !mesiConsigliati.every((m) => Number.isInteger(m) && (m as number) >= 1 && (m as number) <= 12)
    ) {
      problemi.push(`${dove}: i mesi consigliati devono essere numeri da 1 a 12.`);
    }
    if (problemi.length === prima) {
      candidati.push({
        id: id as string,
        nome: (nome as string).trim(),
        descrizione: (descrizione as string).trim(),
        stili: [...new Set(stili as StileViaggio[])],
        mesiConsigliati: [...new Set(mesiConsigliati as number[])].sort((a, b) => a - b),
      });
    }
  });
  if (grezzo["candidati"].length === 0) problemi.push("L'elenco delle destinazioni candidate è vuoto.");
  return problemi.length > 0 ? { ok: false, problemi } : { ok: true, elenco: { formato: 1, candidati } };
}

/** Una candidata con il suo punteggio rispetto al profilo. */
export interface CandidataValutata {
  candidata: DestinazioneCandidata;
  punteggio: number;
  /** Gli stili della destinazione che sono anche nel profilo. */
  stiliInComune: StileViaggio[];
  /** `true` se il mese del viaggio è tra quelli consigliati. */
  meseConsigliato: boolean;
}

/** Il mese del viaggio (1–12) dal profilo, `null` se non si può ricavare. */
function meseDelProfilo(profilo: ProfiloPreferenze): number | null {
  const testo = profilo.date.tipo === "mese" ? profilo.date.mese : profilo.date.inizio;
  const mese = Number(testo.slice(5, 7));
  return Number.isInteger(mese) && mese >= 1 && mese <= 12 ? mese : null;
}

/** La candidata come attività neutra: solo gli stili contano, nessun limite del profilo la esclude per altro. */
function comeAttivita(candidata: DestinazioneCandidata): AttivitaCatalogoEstesa {
  return {
    id: `candidata-${candidata.id}`,
    nome: candidata.nome,
    luogoId: candidata.id,
    categoria: "cultura",
    allAperto: false,
    durataTipica: 0,
    stili: candidata.stili,
    intensita: "facile",
    accessibile: true,
    adattaAiBambini: true,
  };
}

/**
 * Le candidate non escluse dal profilo, dalla più adatta: punteggio decrescente; a parità, prima quelle con il mese
 * del viaggio tra i consigliati; poi l'`id` in ordine alfabetico. Il risultato non dipende dall'ordine dell'elenco.
 */
export function ordinaCandidati(candidati: readonly DestinazioneCandidata[], profilo: ProfiloPreferenze): CandidataValutata[] {
  const mese = meseDelProfilo(profilo);
  const valutate: CandidataValutata[] = [];
  for (const candidata of candidati) {
    const valutazione = valutaAttivita(comeAttivita(candidata), profilo);
    if (valutazione.punteggio === null) continue;
    valutate.push({
      candidata,
      punteggio: valutazione.punteggio,
      stiliInComune: valutazione.stiliInComune,
      meseConsigliato: mese !== null && candidata.mesiConsigliati.includes(mese),
    });
  }
  return valutate.sort(
    (a, b) =>
      b.punteggio - a.punteggio ||
      Number(b.meseConsigliato) - Number(a.meseConsigliato) ||
      (a.candidata.id < b.candidata.id ? -1 : a.candidata.id > b.candidata.id ? 1 : 0),
  );
}

/** Le prime `quante` candidate (3 per Sorprendimi), già ordinate col punteggio del profilo. */
export function proponiSorprendimi(
  candidati: readonly DestinazioneCandidata[],
  profilo: ProfiloPreferenze,
  quante: number = NUMERO_PROPOSTE_SORPRENDIMI,
): CandidataValutata[] {
  return ordinaCandidati(candidati, profilo).slice(0, quante);
}
