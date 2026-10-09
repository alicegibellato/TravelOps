/**
 * Ripianificazione di un `RITARDO` (REQ-REPLAN-002 R-RIT-2…R-RIT-4).
 *
 * Lo slittamento è quello di R-RIT-1, calcolato da `calcolaImpatto` (REQ-REPLAN-001): qui si
 * aggiungono solo le regole della ripianificazione (elementi a orario fisso fermi, rimozioni).
 */
import type { Elemento, ElementoAttivita, ImprevistoRitardo, Viaggio } from "../model/index.js";
import { problemiProposta, propostaFattibile } from "./contesto.js";
import { calcolaImpatto, type ImpattoDettagliato } from "./impatto.js";
import { chiedi, impostaElementi, type Lavoro } from "./lavoro.js";
import { confronta, eFisso, elenca, giornoDi, minuti, orariDi, orario, ordinaElementi, prioritaDi } from "./supporto.js";

/** Esito di un posticipo: gli elementi del giorno e gli elementi a orario fisso tenuti fermi. */
interface Posticipo {
  elementi: Elemento[];
  fissiFermi: { elemento: Elemento; inizio: string; fine: string }[];
}

/**
 * Ripianifica il giorno del ritardo nel viaggio in lavorazione.
 * @param causa il ritardo in parole semplici, per esempio "il ritardo di 30 minuti (traffico)".
 */
export function ripianificaRitardo(
  lavoro: Lavoro,
  imprevisto: ImprevistoRitardo,
  impatto: ImpattoDettagliato,
  causa: string,
): void {
  const base = lavoro.viaggio;
  const giornoBase = giornoDi(base, imprevisto.data);
  if (!giornoBase || impatto.elementiColpiti.length === 0) return;
  const originali = new Map(giornoBase.elementi.map((e) => [e.id, e]));

  // R-RIT-2: posticipo, con gli elementi a orario fisso fermi.
  const posticipo = posticipa(lavoro, base, imprevisto, new Set());
  for (const { elemento, inizio, fine } of posticipo.fissiFermi) {
    lavoro.aRischio.set(
      elemento.id,
      `è a orario fisso: resta alle ${orariDi(elemento)} anche se ${causa} lo farebbe slittare alle ${inizio}–${fine}`,
    );
  }
  if (giornoFattibile(lavoro, base, imprevisto.data, posticipo.elementi, originali)) {
    applica(lavoro, imprevisto.data, posticipo.elementi, originali, causa);
    lavoro.note.push(`Basta posticipare: con ${causa} la giornata del ${imprevisto.data} resta fattibile.`);
    return;
  }

  // R-RIT-3: il più piccolo insieme di attività colpite rimovibili che rende la giornata fattibile.
  const rimovibili = impatto.elementiColpiti.flatMap((c) => {
    const e = originali.get(c.elementoId);
    return e && e.tipo === "attivita" && !eFisso(e) && prioritaDi(e) !== "irrinunciabile" ? [e] : [];
  });
  for (let dimensione = 1; dimensione <= rimovibili.length; dimensione++) {
    const riuscite: { insieme: ElementoAttivita[]; elementi: Elemento[] }[] = [];
    for (const insieme of combinazioni(rimovibili, dimensione)) {
      const tentativo = posticipa(lavoro, base, imprevisto, new Set(insieme.map((e) => e.id)));
      if (giornoFattibile(lavoro, base, imprevisto.data, tentativo.elementi, originali)) {
        riuscite.push({ insieme, elementi: tentativo.elementi });
      }
    }
    riuscite.sort((a, b) => confrontaInsiemi(lavoro, a.insieme, b.insieme));
    const scelta = riuscite[0];
    if (scelta) {
      const nomi = elenca(scelta.insieme.map((e) => lavoro.indice.descrivi(e)));
      applica(lavoro, imprevisto.data, scelta.elementi, originali, causa);
      for (const e of scelta.insieme) {
        lavoro.motivi.set(
          e.id,
          `rimossa per recuperare ${causa}: togliere ${nomi} è la rimozione più piccola che rende la giornata fattibile`,
        );
      }
      lavoro.note.push(
        `Il solo posticipo non basta (${descriviProblemi(lavoro, base, imprevisto.data, posticipo.elementi)}). ` +
          `Si rimuove ${nomi}; gli elementi che il ritardo non raggiunge più tornano al loro orario e gli spostamenti restano dove sono.`,
      );
      return;
    }
  }

  // R-RIT-4: nessun insieme funziona; si propone il posticipo, non fattibile.
  applica(lavoro, imprevisto.data, posticipo.elementi, originali, causa);
  const rimovibiliTesto =
    rimovibili.length === 0
      ? "non ci sono attività colpite che si possano rimuovere (le irrinunciabili e quelle a orario fisso restano)"
      : `nessuna combinazione di rimozioni tra ${elenca(rimovibili.map((e) => lavoro.indice.descrivi(e)))} basta`;
  lavoro.note.push(
    `Il solo posticipo non basta (${descriviProblemi(lavoro, base, imprevisto.data, posticipo.elementi)}) e ${rimovibiliTesto}. ` +
      "La proposta è il posticipo, che resta non fattibile.",
  );
  chiedi(
    lavoro,
    `con ${causa} la giornata del ${imprevisto.data} non sta in piedi: vuoi rinunciare a qualcosa, cambiare tu gli orari o tenere il posticipo così?`,
  );
}

/**
 * R-RIT-2 su un giorno dal quale si tolgono le attività `rimossi`: lo slittamento è quello di
 * `calcolaImpatto` sul giorno ridotto (gli elementi che il ritardo non raggiunge più restano al loro
 * orario); un elemento a orario fisso resta fermo e chi lo segue inizia al più tardi tra il suo
 * inizio previsto e la fine dell'elemento precedente.
 */
function posticipa(lavoro: Lavoro, base: Viaggio, imprevisto: ImprevistoRitardo, rimossi: ReadonlySet<string>): Posticipo {
  const ridotto: Viaggio = {
    ...base,
    giorni: base.giorni.map((g) =>
      g.data === imprevisto.data ? { ...g, elementi: g.elementi.filter((e) => !rimossi.has(e.id)) } : g,
    ),
  };
  const slittamenti = new Map(
    calcolaImpatto(ridotto, lavoro.catalogo, imprevisto).elementiColpiti.map((c) => [c.elementoId, c]),
  );
  const risultato: Posticipo = { elementi: [], fissiFermi: [] };
  let dopoUnFisso = false;
  let finePrecedente = 0;
  for (const e of ordinaElementi(giornoDi(ridotto, imprevisto.data)?.elementi ?? [])) {
    const slittato = slittamenti.get(e.id);
    let nuovo: Elemento = e;
    if (slittato?.inizioSlittato !== undefined && slittato.fineSlittata !== undefined) {
      if (eFisso(e)) {
        dopoUnFisso = true;
        risultato.fissiFermi.push({ elemento: e, inizio: slittato.inizioSlittato, fine: slittato.fineSlittata });
      } else if (!dopoUnFisso) {
        nuovo = { ...e, inizio: slittato.inizioSlittato, fine: slittato.fineSlittata };
      } else {
        const inizio = Math.max(minuti(e.inizio), finePrecedente);
        const durata = minuti(e.fine) - minuti(e.inizio);
        nuovo = { ...e, inizio: orario(inizio), fine: orario(inizio + durata) };
      }
    }
    risultato.elementi.push(nuovo);
    finePrecedente = minuti(nuovo.fine);
  }
  return risultato;
}

/** La giornata è fattibile secondo R-3, considerando cambiati gli elementi con orari diversi dall'originale. */
function giornoFattibile(
  lavoro: Lavoro,
  base: Viaggio,
  data: string,
  elementi: Elemento[],
  originali: ReadonlyMap<string, Elemento>,
): boolean {
  const problemi = problemiDelGiorno(lavoro, base, data, elementi);
  const cambiati = new Set(
    elementi.filter((e) => originali.get(e.id)?.inizio !== e.inizio || originali.get(e.id)?.fine !== e.fine).map((e) => e.id),
  );
  return propostaFattibile(problemi, cambiati);
}

function problemiDelGiorno(lavoro: Lavoro, base: Viaggio, data: string, elementi: Elemento[]) {
  const giorno = giornoDi(base, data);
  if (!giorno) return [];
  return problemiProposta({ ...base, giorni: [{ ...giorno, elementi }] }, lavoro.catalogo, lavoro.sorgente);
}

function descriviProblemi(lavoro: Lavoro, base: Viaggio, data: string, elementi: Elemento[]): string {
  const bloccanti = problemiDelGiorno(lavoro, base, data, elementi).filter((p) => p.gravita === "bloccante");
  return bloccanti.map((p) => p.messaggio.replace(/\.$/, "")).join("; ");
}

/** Imposta il giorno e scrive il perché di ogni elemento che cambia orario. */
function applica(
  lavoro: Lavoro,
  data: string,
  elementi: Elemento[],
  originali: ReadonlyMap<string, Elemento>,
  causa: string,
): void {
  impostaElementi(lavoro, data, elementi);
  for (const e of elementi) {
    const prima = originali.get(e.id);
    if (!prima || (prima.inizio === e.inizio && prima.fine === e.fine)) continue;
    lavoro.motivi.set(
      e.id,
      prima.inizio === e.inizio
        ? `finisce alle ${e.fine} invece che alle ${prima.fine} per ${causa}`
        : `slitta da ${orariDi(prima)} a ${orariDi(e)} per ${causa}`,
    );
  }
}

/** R-RIT-3: meno pasti, poi meno desiderate, poi attività che iniziano prima, poi id in ordine alfabetico. */
function confrontaInsiemi(lavoro: Lavoro, a: ElementoAttivita[], b: ElementoAttivita[]): number {
  const pasti = (s: ElementoAttivita[]): number => s.filter((e) => lavoro.indice.attivitaDi(e).categoria === "pasto").length;
  const desiderate = (s: ElementoAttivita[]): number => s.filter((e) => prioritaDi(e) === "desiderata").length;
  const inizi = (s: ElementoAttivita[]): number[] => s.map((e) => minuti(e.inizio)).sort((x, y) => x - y);
  const ids = (s: ElementoAttivita[]): string[] => s.map((e) => e.id).sort(confronta);
  return (
    pasti(a) - pasti(b) ||
    desiderate(a) - desiderate(b) ||
    confrontaElenchi(inizi(a), inizi(b), (x, y) => x - y) ||
    confrontaElenchi(ids(a), ids(b), confronta)
  );
}

function confrontaElenchi<T>(a: readonly T[], b: readonly T[], cmp: (x: T, y: T) => number): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const esito = cmp(a[i] as T, b[i] as T);
    if (esito !== 0) return esito;
  }
  return a.length - b.length;
}

/** Le combinazioni di `k` voci, in ordine lessicografico delle posizioni. */
function* combinazioni<T>(voci: readonly T[], k: number, da = 0): Generator<T[]> {
  if (k === 0) {
    yield [];
    return;
  }
  for (let i = da; i <= voci.length - k; i++) {
    for (const resto of combinazioni(voci, k - 1, i + 1)) yield [voci[i] as T, ...resto];
  }
}
