/**
 * Generatore della prima bozza dell'itinerario (REQ-PLAN-001, regole R-1…R-9).
 *
 * Riceve il profilo validato (REQ-PREF-001) e l'istantanea della destinazione già scelta (§7.8): non legge file,
 * rete od orologio, non usa casualità. Stesso profilo, stessa istantanea e stesse opzioni danno la stessa bozza (R-8).
 */
import {
  type AttivitaCatalogoEstesa,
  type Data,
  type Elemento,
  type Giorno,
  type IstantaneaCatalogo,
  type LuogoEsteso,
  type SorgenteDatiContesto,
  type StileViaggio,
  type Viaggio,
} from "../model/index.js";
import { creaSorgenteDaDati } from "../context/index.js";
import { controllaFattibilita, eFattibile, type ProblemaFattibilita } from "../feasibility/index.js";
import { giornoSettimana } from "../feasibility/orari.js";
import { COSTI, dataDaNumero, numeroDaData } from "../itinerary/valori.js";
import {
  ATTIVITA_PER_RITMO,
  classificaAttivita,
  ETICHETTE_PROFILO,
  FINESTRA_GIORNATA,
  valutaAttivita,
  type ProfiloPreferenze,
  type ValutazioneAttivita,
} from "../preferences/index.js";
import { varietaEffettiva, type ConfigurazioneVarieta } from "./configurazione.js";
import {
  collocaGiornata,
  durataSpostamento,
  minutiDi,
  orarioDaMinuti,
  Percorsi,
  type PianoGiornata,
  type RichiestaGiornata,
  type VoceGiornata,
} from "./giornata.js";
import {
  ErroreBozza,
  FINESTRE_PASTI,
  FUSO_ORARIO_PREDEFINITO,
  ORARIO_ARRIVO_PREDEFINITO,
  ORARIO_PARTENZA_PREDEFINITO,
  TENTATIVI_MASSIMI,
  type AttivitaTolta,
  type BozzaItinerario,
  type GiornoBozza,
  type OpzioniBozza,
  type Pasto,
} from "./tipi.js";

const confronta = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Categorie che non sono attività da scegliere: i pasti hanno la regola R-5, i servizi la §8.5. */
const eAttivitaDaScegliere = (a: AttivitaCatalogoEstesa): boolean => a.categoria !== "pasto" && a.categoria !== "servizio";

// --- Preparazione ----------------------------------------------------------------------------------

interface Contesto {
  profilo: ProfiloPreferenze;
  istantanea: IstantaneaCatalogo;
  luoghi: ReadonlyMap<string, LuogoEsteso>;
  attivita: ReadonlyMap<string, AttivitaCatalogoEstesa>;
  valutazioni: ReadonlyMap<string, ValutazioneAttivita>;
  sorgente: SorgenteDatiContesto;
  percorsi: Percorsi;
  alloggio: LuogoEsteso;
  arrivo: LuogoEsteso | null;
  date: Data[];
  orarioArrivo: number;
  orarioPartenza: number;
  /** Attività bloccate per giorno (`OpzioniBozza.mantieni`), pasti e servizi esclusi. */
  mantenute: ReadonlyMap<Data, readonly string[]>;
  /** Tutte le attività bloccate: irrinunciabili e mai tolte dalla verifica. */
  bloccate: ReadonlySet<string>;
  /** Soglie di varietà della giornata. */
  varieta: ConfigurazioneVarieta;
}

/** R-2: l'alloggio con la fascia più vicina al budget; a parità il più economico, poi l'`id`. */
export function scegliAlloggio(istantanea: IstantaneaCatalogo, profilo: ProfiloPreferenze): LuogoEsteso {
  const budget = COSTI.indexOf(profilo.budget);
  const distanza = (l: LuogoEsteso): number =>
    l.costoIndicativo === undefined ? Number.POSITIVE_INFINITY : Math.abs(COSTI.indexOf(l.costoIndicativo) - budget);
  const posizione = (l: LuogoEsteso): number =>
    l.costoIndicativo === undefined ? Number.POSITIVE_INFINITY : COSTI.indexOf(l.costoIndicativo);
  const alloggi = istantanea.luoghi
    .filter((l) => l.tipo === "alloggio")
    .sort((a, b) => distanza(a) - distanza(b) || posizione(a) - posizione(b) || confronta(a.id, b.id));
  const scelto = alloggi[0];
  if (!scelto) throw new ErroreBozza(`L'istantanea ${istantanea.id} non ha alloggi: non posso preparare la bozza.`);
  return scelto;
}

/** Date dei giorni: dall'inizio delle date precise, dal primo del mese, oppure da `opzioni.dataInizio`. */
function dateDelViaggio(profilo: ProfiloPreferenze, dataInizio: Data | undefined): Data[] {
  const inizio = dataInizio ?? (profilo.date.tipo === "precise" ? profilo.date.inizio : `${profilo.date.mese}-01`);
  const numero = numeroDaData(inizio);
  if (numero === null) throw new ErroreBozza(`Data di inizio non valida "${inizio}".`);
  return Array.from({ length: profilo.durata }, (_, i) => dataDaNumero(numero + i));
}

function preparaContesto(profilo: ProfiloPreferenze, istantanea: IstantaneaCatalogo, opzioni: OpzioniBozza): Contesto {
  const luoghi = new Map<string, LuogoEsteso>();
  for (const l of istantanea.luoghi) if (!luoghi.has(l.id)) luoghi.set(l.id, l);
  const attivita = new Map<string, AttivitaCatalogoEstesa>();
  for (const a of istantanea.attivita) if (!attivita.has(a.id)) attivita.set(a.id, a);
  const valutazioni = new Map<string, ValutazioneAttivita>();
  for (const a of attivita.values()) valutazioni.set(a.id, valutaAttivita(a, profilo));

  const sorgente =
    opzioni.sorgente ?? creaSorgenteDaDati({ tempiPercorrenza: istantanea.tempiPercorrenza, previsioni: [], chiusure: [] });
  const percorsi = new Percorsi(sorgente, profilo.mezzi);
  const alloggio = scegliAlloggio(istantanea, profilo);

  // Stazione o aeroporto più vicini all'alloggio con i mezzi del profilo (a parità, l'`id`).
  const arrivi = istantanea.luoghi
    .filter((l) => l.tipo === "stazione" || l.tipo === "aeroporto")
    .map((l) => ({ luogo: l, tratto: percorsi.tratto(l.id, alloggio.id) }))
    .filter((x) => x.tratto !== null)
    .sort((x, y) => (x.tratto?.minuti ?? 0) - (y.tratto?.minuti ?? 0) || confronta(x.luogo.id, y.luogo.id));
  const conArrivo = opzioni.arrivoEPartenza ?? true;
  const arrivo = conArrivo ? (arrivi[0]?.luogo ?? null) : null;
  if (opzioni.arrivoEPartenza === true && arrivo === null) {
    throw new ErroreBozza("Non trovo una stazione o un aeroporto raggiungibile dall'alloggio per l'arrivo e la partenza.");
  }

  const mantenute = new Map<Data, string[]>();
  for (const voce of opzioni.mantieni ?? []) {
    const scelta = attivita.get(voce.attivitaId);
    if (!scelta || !eAttivitaDaScegliere(scelta)) continue;
    const elenco = mantenute.get(voce.data) ?? [];
    if (!elenco.includes(scelta.id)) elenco.push(scelta.id);
    mantenute.set(voce.data, elenco);
  }

  return {
    profilo,
    istantanea,
    luoghi,
    attivita,
    valutazioni,
    sorgente,
    percorsi,
    alloggio,
    arrivo,
    date: dateDelViaggio(profilo, opzioni.dataInizio),
    orarioArrivo: minutiDi(opzioni.orarioArrivo ?? ORARIO_ARRIVO_PREDEFINITO),
    orarioPartenza: minutiDi(opzioni.orarioPartenza ?? ORARIO_PARTENZA_PREDEFINITO),
    mantenute,
    bloccate: new Set([...mantenute.values()].flat()),
    varieta: varietaEffettiva(opzioni.varieta),
  };
}

/**
 * Le violazioni di varietà di una giornata, come chiavi stabili: troppe attività dello stesso tipo di fila e tragitti
 * lunghi tra attività vicine di valore simile. I pasti non contano.
 */
function violazioniVarieta(ctx: Contesto, piano: PianoGiornata): Set<string> {
  const { maxAttivitaStessoTipo, tragittoMassimoMinuti, differenzaValoreSimile } = ctx.varieta;
  const attivita = piano.voci.flatMap((v) => (v.tipo === "attivita" && v.pasto === null ? [v.attivita] : []));
  const violazioni = new Set<string>();
  let serie: AttivitaCatalogoEstesa[] = [];
  const chiudiSerie = (): void => {
    if (serie.length > maxAttivitaStessoTipo) violazioni.add(`serie:${serie.map((a) => a.id).join(",")}`);
    serie = [];
  };
  attivita.forEach((a, i) => {
    if (serie.length > 0 && serie[0]?.categoria !== a.categoria) chiudiSerie();
    serie.push(a);
    const prima = attivita[i - 1];
    if (!prima) return;
    const tratto = ctx.percorsi.tratto(prima.luogoId, a.luogoId);
    const valore = (x: AttivitaCatalogoEstesa): number => ctx.valutazioni.get(x.id)?.punteggio ?? 0;
    if (tratto && tratto.minuti > tragittoMassimoMinuti && Math.abs(valore(prima) - valore(a)) <= differenzaValoreSimile) {
      violazioni.add(`tragitto:${prima.id}>${a.id}`);
    }
  });
  chiudiSerie();
  return violazioni;
}

/** Il piano non introduce violazioni di varietà oltre a quelle che la giornata ha già. */
function rispettaVarieta(ctx: Contesto, attuale: PianoGiornata, nuovo: PianoGiornata): boolean {
  const esistenti = violazioniVarieta(ctx, attuale);
  for (const v of violazioniVarieta(ctx, nuovo)) if (!esistenti.has(v)) return false;
  return true;
}

// --- Giorni e scelta (R-3, R-4) --------------------------------------------------------------------

interface GiornoInCostruzione {
  indice: number;
  data: Data;
  previste: number;
  arrivo: boolean;
  partenza: boolean;
  pasti: Pasto[];
  scelte: AttivitaCatalogoEstesa[];
  /** Quante delle scelte sono attività bloccate, collocate prima delle altre. */
  fisse: number;
  piano: PianoGiornata;
}

/** R-3: attività previste per ogni giorno; primo e ultimo dimezzati (per eccesso) con arrivo e partenza. */
export function attivitaPrevistePerGiorno(profilo: ProfiloPreferenze, conArrivoEPartenza: boolean): number[] {
  const piene = ATTIVITA_PER_RITMO[profilo.ritmo];
  const ridotte = Math.ceil(piene / 2);
  return Array.from({ length: profilo.durata }, (_, i) =>
    conArrivoEPartenza && (i === 0 || i === profilo.durata - 1) ? ridotte : piene,
  );
}

function richiestaGiornata(
  ctx: Contesto,
  giorno: Omit<GiornoInCostruzione, "piano" | "scelte" | "fisse">,
  attivita: readonly AttivitaCatalogoEstesa[],
  pasti: readonly Pasto[],
  ristoranti: readonly AttivitaCatalogoEstesa[],
): RichiestaGiornata {
  const settimana = giornoSettimana(giorno.data);
  if (settimana === null) throw new ErroreBozza(`Data non valida "${giorno.data}".`);
  const finestra = FINESTRA_GIORNATA[ctx.profilo.orari];
  const vociIniziali: VoceGiornata[] = [];
  let partenza = { luogo: ctx.alloggio.id, minuti: minutiDi(finestra.inizio) };
  if (giorno.arrivo && ctx.arrivo) {
    const tratto = ctx.percorsi.tratto(ctx.arrivo.id, ctx.alloggio.id);
    if (tratto) {
      const fine = ctx.orarioArrivo + durataSpostamento(tratto.minuti);
      vociIniziali.push({ tipo: "spostamento", da: ctx.arrivo.id, a: ctx.alloggio.id, mezzo: tratto.mezzo, inizio: ctx.orarioArrivo, fine });
      partenza = { luogo: ctx.alloggio.id, minuti: fine };
    }
  }
  const ultimo = giorno.indice === ctx.date.length - 1;
  // Ogni giorno si torna all'alloggio; l'ultimo giorno, con la partenza, si passa dall'alloggio (i tempi
  // alloggio–stazione sono tra i minimi della §8.1) e si arriva alla stazione o all'aeroporto all'orario di partenza.
  const tappeFinali: RichiestaGiornata["tappeFinali"] = [];
  let fineAttivita = minutiDi(finestra.fine);
  if (giorno.partenza && ctx.arrivo) {
    tappeFinali.push({ luogo: ctx.alloggio.id, entro: null, allUltimoMomento: false });
    tappeFinali.push({ luogo: ctx.arrivo.id, entro: ctx.orarioPartenza, allUltimoMomento: true });
    fineAttivita = Math.min(fineAttivita, ctx.orarioPartenza);
  } else if (!ultimo) {
    tappeFinali.push({ luogo: ctx.alloggio.id, entro: null, allUltimoMomento: false });
  }
  return {
    giornoSettimana: settimana,
    vociIniziali,
    partenza,
    tappeFinali,
    fineAttivita,
    attivita,
    pasti,
    ristoranti,
    luoghi: ctx.luoghi,
    percorsi: ctx.percorsi,
  };
}

/** Pasti del giorno: quelli richiesti, tranne quelli che finiscono prima dell'arrivo o iniziano dopo la partenza. */
function pastiDelGiorno(ctx: Contesto, richiesti: readonly Pasto[], giorno: { arrivo: boolean; partenza: boolean }): Pasto[] {
  return richiesti.filter(
    (p) =>
      !(giorno.arrivo && ctx.orarioArrivo >= minutiDi(FINESTRE_PASTI[p].fine)) &&
      !(giorno.partenza && ctx.orarioPartenza <= minutiDi(FINESTRE_PASTI[p].inizio)),
  );
}

/**
 * Gli insiemi di pasti da provare, dal più completo: di solito entrano tutti; meno se nessun ristorante compatibile è
 * aperto o raggiungibile in tempo.
 */
function insiemiPasti(delGiorno: readonly Pasto[]): Pasto[][] {
  return [[...delGiorno], ...delGiorno.map((p) => delGiorno.filter((q) => q !== p)), []];
}

/** I pasti richiesti dal profilo, nell'ordine della giornata. */
function pastiRichiesti(profilo: ProfiloPreferenze): Pasto[] {
  return [...(profilo.pasti.pranzo ? (["pranzo"] as const) : []), ...(profilo.pasti.cena ? (["cena"] as const) : [])];
}

/** Le attività di pasto ammesse: non escluse dal profilo, con le opzioni alimentari richieste, in ordine di `id`. */
function ristorantiAmmessi(ctx: Contesto, escluse: ReadonlySet<string>): AttivitaCatalogoEstesa[] {
  const richieste = ctx.profilo.esigenze.filter((e) => e === "vegetariano" || e === "senza_glutine");
  return [...ctx.attivita.values()]
    .filter((a) => a.categoria === "pasto" && !escluse.has(a.id) && ctx.valutazioni.get(a.id)?.esclusa === false)
    .filter((a) => {
      const opzioni = ctx.luoghi.get(a.luogoId)?.opzioniAlimentari ?? [];
      return richieste.every((r) => opzioni.includes(r));
    })
    .sort((a, b) => confronta(a.id, b.id));
}

/** Le candidate di R-4: prima gli irrinunciabili, poi in ordine di punteggio (§7.7), senza pasti, servizi ed escluse. */
function candidateOrdinate(ctx: Contesto, escluse: ReadonlySet<string>): ValutazioneAttivita[] {
  const candidate = classificaAttivita(ctx.istantanea, ctx.profilo).candidate.filter((v) => {
    const attivita = ctx.attivita.get(v.attivitaId);
    return attivita !== undefined && eAttivitaDaScegliere(attivita) && !escluse.has(v.attivitaId) && ctx.luoghi.has(attivita.luogoId);
  });
  return [...candidate.filter((v) => v.irrinunciabile), ...candidate.filter((v) => !v.irrinunciabile)];
}

interface Costruzione {
  giorni: GiornoInCostruzione[];
  avvisi: string[];
}

/** Costruisce tutti i giorni: scelta a giri (un'attività per giorno a ogni giro) e collocazione. */
function costruisci(ctx: Contesto, escluse: ReadonlySet<string>): Costruzione {
  const avvisi: string[] = [];
  const ristoranti = ristorantiAmmessi(ctx, escluse);
  const previste = attivitaPrevistePerGiorno(ctx.profilo, ctx.arrivo !== null);
  const richiesti = pastiRichiesti(ctx.profilo);

  const giorni: GiornoInCostruzione[] = ctx.date.map((data, indice) => {
    const base = {
      indice,
      data,
      previste: previste[indice] ?? 0,
      arrivo: ctx.arrivo !== null && indice === 0,
      partenza: ctx.arrivo !== null && indice === ctx.date.length - 1,
      pasti: [] as Pasto[],
    };
    const delGiorno = pastiDelGiorno(ctx, richiesti, base);
    for (const pasti of insiemiPasti(delGiorno)) {
      const piano = collocaGiornata(richiestaGiornata(ctx, base, [], pasti, ristoranti));
      if (piano) {
        for (const mancante of delGiorno.filter((p) => !pasti.includes(p))) {
          const momento = mancante === "pranzo" ? "il pranzo" : "la cena";
          avvisi.push(`Il ${data} non ho inserito ${momento}: non c'è un ristorante adatto a te aperto in quella fascia.`);
        }
        return { ...base, pasti, scelte: [], fisse: 0, piano };
      }
    }
    throw new ErroreBozza(`Non riesco a collocare il ${data}: l'alloggio non è raggiungibile con i mezzi scelti.`);
  });

  // REQ-PLAN-002: le attività bloccate entrano per prime, ognuna nel suo giorno.
  const usate = new Set<string>();
  for (const giorno of giorni) {
    for (const id of ctx.mantenute.get(giorno.data) ?? []) {
      const attivita = ctx.attivita.get(id);
      if (!attivita) continue;
      const piano = collocaGiornata(richiestaGiornata(ctx, giorno, [...giorno.scelte, attivita], giorno.pasti, ristoranti));
      if (piano) {
        giorno.scelte.push(attivita);
        giorno.fisse += 1;
        giorno.piano = piano;
        usate.add(id);
      } else {
        avvisi.push(`Il ${giorno.data} non sono riuscito a tenere "${attivita.nome}", che avevi bloccato: non entra nella giornata.`);
      }
    }
  }
  for (const [data, ids] of ctx.mantenute) {
    if (ctx.date.includes(data)) continue;
    for (const id of ids) {
      avvisi.push(`Non ho potuto tenere "${ctx.attivita.get(id)?.nome ?? id}", che avevi bloccato: il ${data} non è più un giorno del viaggio.`);
    }
  }

  const ordine = candidateOrdinate(ctx, escluse);
  const giri = Math.max(0, ...giorni.map((g) => g.previste));
  for (let giro = 0; giro < giri; giro++) {
    for (const giorno of giorni) {
      // Senza attività bloccate equivale a "giro già fatto o giro precedente fallito".
      if (giorno.scelte.length >= giorno.previste || giorno.scelte.length - giorno.fisse < giro) continue;
      const conStile = giorno.scelte.some((a) => (ctx.valutazioni.get(a.id)?.stiliInComune.length ?? 0) > 0);
      const impegnativa = giorno.scelte.some((a) => a.intensita === "impegnativa");
      // R-4: almeno uno stile del profilo ogni giorno; all'ultimo posto libero, se manca, lo si chiede alla candidata.
      const ultimoPosto = giorno.previste - giorno.scelte.length === 1;
      const tentativi = !conStile && ultimoPosto ? [true, false] : [false];
      let scelta: { attivita: AttivitaCatalogoEstesa; piano: PianoGiornata } | null = null;
      // Varietà: prima con le soglie; se il giorno resterebbe vuoto, senza.
      const varieta = giorno.scelte.length === 0 ? [true, false] : [true];
      for (const conVarieta of varieta) {
        for (const serveStile of tentativi) {
          for (const valutazione of ordine) {
            if (usate.has(valutazione.attivitaId)) continue;
            if (serveStile && valutazione.stiliInComune.length === 0) continue;
            const attivita = ctx.attivita.get(valutazione.attivitaId);
            if (!attivita) continue;
            if (impegnativa && attivita.intensita === "impegnativa") continue;
            const piano = collocaGiornata(richiestaGiornata(ctx, giorno, [...giorno.scelte, attivita], giorno.pasti, ristoranti));
            if (piano && (!conVarieta || rispettaVarieta(ctx, giorno.piano, piano))) {
              scelta = { attivita, piano };
              break;
            }
          }
          if (scelta) break;
        }
        if (scelta) break;
      }
      if (scelta) {
        giorno.scelte.push(scelta.attivita);
        giorno.piano = scelta.piano;
        usate.add(scelta.attivita.id);
      }
    }
  }
  for (const giorno of giorni) {
    if (giorno.scelte.length < giorno.previste) {
      const n = giorno.scelte.length;
      const trovate = n === 0 ? "nessuna attività adatta" : n === 1 ? "solo 1 attività adatta" : `solo ${n} attività adatte`;
      avvisi.push(`Il ${giorno.data} ho trovato ${trovate} a te invece di ${giorno.previste}.`);
    }
  }
  return { giorni, avvisi };
}

// --- Itinerario --------------------------------------------------------------------------------------

function itinerario(ctx: Contesto, giorni: readonly GiornoInCostruzione[], opzioni: OpzioniBozza): Viaggio {
  const giorniViaggio: Giorno[] = giorni.map((giorno) => {
    const prefisso = `D${giorno.indice + 1}-E`;
    const elementi: Elemento[] = giorno.piano.voci.map((voce, i): Elemento => {
      const comune = { id: `${prefisso}${i + 1}`, inizio: orarioDaMinuti(voce.inizio), fine: orarioDaMinuti(voce.fine) };
      if (voce.tipo === "spostamento") return { ...comune, tipo: "spostamento", da: voce.da, a: voce.a, mezzo: voce.mezzo };
      const irrinunciabile =
        (ctx.valutazioni.get(voce.attivita.id)?.irrinunciabile === true || ctx.bloccate.has(voce.attivita.id)) && voce.pasto === null;
      return { ...comune, tipo: "attivita", attivitaId: voce.attivita.id, priorita: irrinunciabile ? "irrinunciabile" : "desiderata" };
    });
    const ultimo = giorno.indice === giorni.length - 1;
    return {
      data: giorno.data,
      luogoPartenza: giorno.arrivo && ctx.arrivo ? ctx.arrivo.id : ctx.alloggio.id,
      elementi,
      ...(ultimo ? {} : { alloggio: ctx.alloggio.id }),
    };
  });
  const { adulti, bambini } = ctx.profilo.viaggiatori;
  return {
    id: opzioni.idViaggio ?? `BOZZA-${ctx.istantanea.id}`,
    titolo: opzioni.titolo ?? `Bozza del viaggio: ${ctx.istantanea.destinazione}`,
    dataInizio: ctx.date[0] ?? "",
    dataFine: ctx.date.at(-1) ?? "",
    fusoOrario: opzioni.fusoOrario ?? FUSO_ORARIO_PREDEFINITO,
    numeroViaggiatori: adulti + bambini.length,
    prossimoNumeroId: 1,
    giorni: giorniViaggio,
  };
}

// --- Spiegazioni (R-7) ---------------------------------------------------------------------------------

/** "a", "a e b", "a, b e c". */
function elenca(voci: readonly string[]): string {
  if (voci.length <= 1) return voci.join("");
  return `${voci.slice(0, -1).join(", ")} e ${voci.at(-1)}`;
}

const STILI_ORDINE: readonly StileViaggio[] = ["relax", "cultura", "natura", "avventura", "gastronomia", "romantico", "famiglia"];

function spiegaGiorno(ctx: Contesto, giorno: GiornoInCostruzione, attivita: readonly AttivitaCatalogoEstesa[]): GiornoBozza {
  const valutazioni = attivita.map((a) => ctx.valutazioni.get(a.id));
  const stili = STILI_ORDINE.filter((s) => valutazioni.some((v) => v?.stiliInComune.includes(s)));
  const irrinunciabili = attivita.filter((a) => ctx.valutazioni.get(a.id)?.irrinunciabile === true);
  const pasti: GiornoBozza["pasti"] = { pranzo: giorno.piano.pasti.pranzo ?? null, cena: giorno.piano.pasti.cena ?? null };

  const frasi: string[] = [];
  if (giorno.arrivo) frasi.push("È il giorno dell'arrivo, quindi la giornata è più leggera.");
  if (giorno.partenza) frasi.push("È il giorno della partenza, quindi la giornata è più leggera.");
  if (attivita.length === 0) {
    frasi.push("Ti lascio la giornata libera: non ho trovato altre attività adatte a te in questa destinazione.");
  } else {
    const etichette = stili.map((s) => ETICHETTE_PROFILO.stile[s]);
    let motivo: string;
    if (etichette.length === 0) motivo = "Te lo propongo perché sono le attività più adatte a te tra quelle rimaste";
    else if (etichette.length === 1)
      motivo = `Te lo propongo perché punta su ${etichette[0]}, ${ctx.profilo.stili.length === 1 ? "lo stile che hai scelto" : "uno degli stili che hai scelto"}`;
    else motivo = `Te lo propongo perché unisce ${elenca(etichette)}, ${stili.length === ctx.profilo.stili.length ? "gli stili che hai scelto" : "alcuni degli stili che hai scelto"}`;
    if (irrinunciabili.length > 0) {
      const nomi = elenca(irrinunciabili.map((a) => `"${a.nome}"`));
      motivo += `, e c'è ${nomi}, che non vuoi perdere`;
    }
    frasi.push(`${motivo}.`);
  }
  return {
    data: giorno.data,
    attivitaPreviste: giorno.previste,
    attivita: attivita.map((a) => a.id),
    pasti,
    stiliInComune: stili,
    irrinunciabili: irrinunciabili.map((a) => a.id),
    arrivo: giorno.arrivo,
    partenza: giorno.partenza,
    perche: frasi.join(" "),
  };
}

// --- Operazioni pubbliche ------------------------------------------------------------------------------

/** Una prova completa: costruzione, itinerario e controllo di fattibilità. */
interface Prova {
  costruzione: Costruzione;
  viaggio: Viaggio;
  problemi: ProblemaFattibilita[];
}

function prova(ctx: Contesto, escluse: ReadonlySet<string>, opzioni: OpzioniBozza): Prova {
  const costruzione = costruisci(ctx, escluse);
  const viaggio = itinerario(ctx, costruzione.giorni, opzioni);
  return { costruzione, viaggio, problemi: controllaFattibilita(viaggio, ctx.istantanea, ctx.sorgente) };
}

/**
 * R-6: tra le attività coinvolte nei problemi bloccanti, quella da togliere: prima le non irrinunciabili, poi il
 * punteggio più basso, poi l'`id`. `null` se i problemi non coinvolgono attività.
 */
function daTogliere(ctx: Contesto, viaggio: Viaggio, problemi: readonly ProblemaFattibilita[]): AttivitaTolta | null {
  const perElemento = new Map<string, string>();
  for (const giorno of viaggio.giorni)
    for (const e of giorno.elementi) if (e.tipo === "attivita") perElemento.set(e.id, e.attivitaId);
  const coinvolte: AttivitaTolta[] = [];
  for (const problema of problemi) {
    if (problema.gravita !== "bloccante") continue;
    for (const elemento of problema.elementi) {
      const attivitaId = perElemento.get(elemento);
      const valutazione = attivitaId === undefined ? undefined : ctx.valutazioni.get(attivitaId);
      if (attivitaId === undefined || !valutazione || ctx.bloccate.has(attivitaId) || coinvolte.some((c) => c.attivitaId === attivitaId)) continue;
      coinvolte.push({ attivitaId, punteggio: valutazione.punteggio ?? 0, problema });
    }
  }
  const irrinunciabile = (id: string): number => (ctx.valutazioni.get(id)?.irrinunciabile ? 1 : 0);
  coinvolte.sort(
    (a, b) => irrinunciabile(a.attivitaId) - irrinunciabile(b.attivitaId) || a.punteggio - b.punteggio || confronta(a.attivitaId, b.attivitaId),
  );
  return coinvolte[0] ?? null;
}

function spiegazioneComplessiva(
  ctx: Contesto,
  fattibile: boolean,
  problemi: readonly ProblemaFattibilita[],
  tolte: readonly AttivitaTolta[],
): string {
  const frasi: string[] = [];
  for (const tolta of tolte) {
    const nome = ctx.attivita.get(tolta.attivitaId)?.nome ?? tolta.attivitaId;
    frasi.push(`Ho tolto "${nome}" perché non stava in piedi: ${tolta.problema.messaggio}`);
  }
  const bloccanti = problemi.filter((p) => p.gravita === "bloccante");
  const avvisi = problemi.filter((p) => p.gravita === "avviso");
  if (avvisi.length > 0) frasi.push(`Da tenere d'occhio: ${avvisi.map((p) => p.messaggio).join(" ")}`);
  if (fattibile) {
    frasi.unshift("La bozza è fattibile: orari, spostamenti e aperture tornano.");
  } else {
    frasi.unshift(
      `La bozza ha ancora ${bloccanti.length === 1 ? "un problema da risolvere" : `${bloccanti.length} problemi da risolvere`}: ${bloccanti.map((p) => p.messaggio).join(" ")}`,
    );
  }
  return frasi.join(" ");
}

/**
 * Genera la prima bozza dell'itinerario (REQ-PLAN-001 R-1…R-8).
 *
 * @param profilo profilo completo restituito da `validaProfilo` (REQ-PREF-001).
 * @param istantanea istantanea della destinazione già scelta (§7.8), anche per "sorprendimi": catalogo esteso e
 *   tempi di percorrenza. Nessuna chiamata di rete.
 * @param opzioni date, arrivo e partenza, attività da escludere, sorgente dei dati di contesto per la verifica.
 * @returns la bozza, anche quando restano problemi bloccanti (R-6): in quel caso `fattibile` è `false` e
 *   `spiegazione` dice cosa non va.
 * @throws ErroreBozza se l'istantanea non ha alloggi o le date non sono valide.
 */
export function generaBozza(
  profilo: ProfiloPreferenze,
  istantanea: IstantaneaCatalogo,
  opzioni: OpzioniBozza = {},
): BozzaItinerario {
  const ctx = preparaContesto(profilo, istantanea, opzioni);
  const richieste = [...new Set(opzioni.escludi ?? [])].sort(confronta);
  const escluse = new Set(richieste);
  const tolte: AttivitaTolta[] = [];

  let corrente = prova(ctx, escluse, opzioni);
  for (let tentativo = 0; tentativo < TENTATIVI_MASSIMI && !eFattibile(corrente.problemi); tentativo++) {
    const tolta = daTogliere(ctx, corrente.viaggio, corrente.problemi);
    if (tolta === null) break;
    tolte.push(tolta);
    escluse.add(tolta.attivitaId);
    corrente = prova(ctx, escluse, opzioni);
  }

  const { costruzione, viaggio, problemi } = corrente;
  const giorni = costruzione.giorni.map((giorno) => {
    const attivita = giorno.piano.voci.flatMap((v) => (v.tipo === "attivita" && v.pasto === null ? [v.attivita] : []));
    return spiegaGiorno(ctx, giorno, attivita);
  });

  const presenti = new Set(giorni.flatMap((g) => g.attivita));
  const mancantiAttivita = profilo.irrinunciabili.attivita.filter((id) => !presenti.has(id));
  const mancantiStili = profilo.irrinunciabili.stili.filter(
    (s) => ![...presenti].some((id) => (ctx.attivita.get(id)?.stili ?? []).includes(s)),
  );
  const avvisi = [...costruzione.avvisi];
  for (const id of mancantiAttivita) {
    avvisi.push(`Non sono riuscito a inserire "${ctx.attivita.get(id)?.nome ?? id}", che volevi assolutamente fare.`);
  }
  for (const stile of mancantiStili) {
    avvisi.push(`Non ho trovato un'attività ${ETICHETTE_PROFILO.stile[stile]} da inserire, anche se non volevi rinunciarci.`);
  }

  const fattibile = eFattibile(problemi);
  return {
    viaggio,
    istantaneaId: istantanea.id,
    alloggioId: ctx.alloggio.id,
    arrivoId: ctx.arrivo?.id ?? null,
    giorni,
    problemi,
    fattibile,
    tolte,
    escluse: richieste,
    irrinunciabiliMancanti: { attivita: mancantiAttivita, stili: mancantiStili },
    avvisi,
    spiegazione: spiegazioneComplessiva(ctx, fattibile, problemi, tolte),
  };
}

/** `id` delle attività (pasti e servizi esclusi) presenti in un itinerario. */
function attivitaNelViaggio(viaggio: Viaggio, istantanea: IstantaneaCatalogo): string[] {
  const perId = new Map(istantanea.attivita.map((a) => [a.id, a]));
  const ids = new Set<string>();
  for (const giorno of viaggio.giorni)
    for (const e of giorno.elementi) {
      const attivita = e.tipo === "attivita" ? perId.get(e.attivitaId) : undefined;
      if (attivita && eAttivitaDaScegliere(attivita)) ids.add(attivita.id);
    }
  return [...ids].sort(confronta);
}

/**
 * Le attività della bozza corrente da escludere nell'alternativa (R-9): mai gli irrinunciabili; ognuna solo se
 * esiste un sostituto con punteggio positivo non ancora usato. Con meno sostituti che attività, si escludono
 * prima quelle col punteggio più basso (a parità, l'`id`), così l'alternativa resta vicina al profilo.
 */
export function attivitaDaSostituire(
  profilo: ProfiloPreferenze,
  istantanea: IstantaneaCatalogo,
  corrente: BozzaItinerario | Viaggio,
): string[] {
  const viaggio = "viaggio" in corrente ? corrente.viaggio : corrente;
  const usate = new Set(attivitaNelViaggio(viaggio, istantanea));
  const valutazioni = classificaAttivita(istantanea, profilo).candidate.filter((v) => {
    const attivita = istantanea.attivita.find((a) => a.id === v.attivitaId);
    return attivita !== undefined && eAttivitaDaScegliere(attivita);
  });
  const sostituti = valutazioni.filter((v) => !usate.has(v.attivitaId) && !v.irrinunciabile && (v.punteggio ?? 0) > 0);
  const sostituibili = valutazioni
    .filter((v) => usate.has(v.attivitaId) && !v.irrinunciabile)
    .sort((a, b) => (a.punteggio ?? 0) - (b.punteggio ?? 0) || confronta(a.attivitaId, b.attivitaId));
  return sostituibili
    .slice(0, sostituti.length)
    .map((v) => v.attivitaId)
    .sort(confronta);
}

/**
 * "Mostrami un'alternativa" (R-9): una nuova bozza con lo stesso profilo e la stessa istantanea che esclude le
 * attività già scelte nella bozza corrente quando esistono sostituti con punteggio positivo (`attivitaDaSostituire`).
 * Gli irrinunciabili restano; le altre regole sono quelle di `generaBozza`.
 */
export function generaAlternativa(
  profilo: ProfiloPreferenze,
  istantanea: IstantaneaCatalogo,
  corrente: BozzaItinerario | Viaggio,
  opzioni: OpzioniBozza = {},
): BozzaItinerario {
  const escludi = [...(opzioni.escludi ?? []), ...attivitaDaSostituire(profilo, istantanea, corrente)];
  return generaBozza(profilo, istantanea, { ...opzioni, escludi });
}

// --- Ricostruzione di una giornata (REQ-PLAN-002) ------------------------------------------------------

/** Una giornata da ricostruire con le regole del generatore (R-3…R-5), sul viaggio di una revisione della bozza. */
export interface RichiestaGiornataBozza {
  /** Il viaggio corrente: non viene modificato. */
  viaggio: Viaggio;
  data: Data;
  /** `id` delle attività (pasti e servizi esclusi) da tenere, in ordine di precedenza se non entrano tutte. */
  attivita: readonly string[];
  /** `id` delle attività bloccate: diventano irrinunciabili. */
  bloccate?: readonly string[];
  /** Quante attività aggiungere scegliendole per punteggio (§7.7) tra quelle non ancora nel viaggio. Predefinito 0. */
  aggiungi?: number;
  /** `id` da non aggiungere, oltre a quelle già nel viaggio. */
  escludi?: readonly string[];
}

export interface GiornataBozza {
  /** Il viaggio con la sola giornata ricostruita; gli altri giorni restano identici. */
  viaggio: Viaggio;
  /** Attività richieste che non entrano nella giornata. */
  fuori: string[];
  /** Attività aggiunte per punteggio. */
  aggiunte: string[];
  /** Pasti richiesti che non è stato possibile collocare. */
  pastiMancanti: Pasto[];
}

/** Il contesto del generatore per un viaggio già costruito: date, alloggio e arrivo sono quelli del viaggio. */
function contestoDelViaggio(profilo: ProfiloPreferenze, istantanea: IstantaneaCatalogo, viaggio: Viaggio, opzioni: OpzioniBozza): Contesto {
  const base = preparaContesto(profilo, istantanea, { ...opzioni, dataInizio: viaggio.dataInizio, arrivoEPartenza: false });
  const primo = viaggio.giorni[0];
  const alloggio = base.luoghi.get(primo?.alloggio ?? "") ?? base.alloggio;
  const partenza = primo === undefined || primo.luogoPartenza === alloggio.id ? null : (base.luoghi.get(primo.luogoPartenza) ?? null);
  return { ...base, alloggio, arrivo: partenza, date: viaggio.giorni.map((g) => g.data) };
}

/** Le attività (pasti e servizi esclusi) presenti nel viaggio. */
function attivitaUsate(ctx: Contesto, viaggio: Viaggio): Set<string> {
  const usate = new Set<string>();
  for (const giorno of viaggio.giorni)
    for (const e of giorno.elementi) {
      const attivita = e.tipo === "attivita" ? ctx.attivita.get(e.attivitaId) : undefined;
      if (attivita && eAttivitaDaScegliere(attivita)) usate.add(attivita.id);
    }
  return usate;
}

/**
 * Le candidate per punteggio (§7.7) che si possono aggiungere al viaggio: prima gli irrinunciabili, poi il punteggio;
 * senza pasti, servizi, attività escluse dal profilo, già nel viaggio o in `escludi`.
 */
export function attivitaCandidate(
  profilo: ProfiloPreferenze,
  istantanea: IstantaneaCatalogo,
  viaggio: Viaggio,
  escludi: readonly string[] = [],
): ValutazioneAttivita[] {
  const ctx = preparaContesto(profilo, istantanea, { arrivoEPartenza: false, dataInizio: viaggio.dataInizio });
  const usate = attivitaUsate(ctx, viaggio);
  return candidateOrdinate(ctx, new Set([...escludi, ...usate]));
}

/**
 * Ricostruisce una giornata della bozza con le regole del generatore: tiene le attività richieste (finché entrano),
 * ne aggiunge per punteggio se richiesto (al massimo un'attività impegnativa al giorno, R-4) e colloca pasti e
 * spostamenti (R-5). Le attività che restano mantengono `id` e priorità; gli elementi nuovi prendono `id` nuovi
 * (`N<numero>`). Restituisce `null` se il giorno non è del viaggio.
 */
export function ricostruisciGiornata(
  profilo: ProfiloPreferenze,
  istantanea: IstantaneaCatalogo,
  richiesta: RichiestaGiornataBozza,
  opzioni: OpzioniBozza = {},
): GiornataBozza | null {
  const { viaggio, data } = richiesta;
  const indice = viaggio.giorni.findIndex((g) => g.data === data);
  const giornoAttuale = viaggio.giorni[indice];
  if (giornoAttuale === undefined) return null;
  const ctx = contestoDelViaggio(profilo, istantanea, viaggio, opzioni);
  const conArrivo = ctx.arrivo !== null;
  const base = {
    indice,
    data,
    previste: 0,
    arrivo: conArrivo && indice === 0,
    partenza: conArrivo && indice === viaggio.giorni.length - 1,
    pasti: [] as Pasto[],
  };
  const ristoranti = ristorantiAmmessi(ctx, new Set(richiesta.escludi ?? []));
  const delGiorno = pastiDelGiorno(ctx, pastiRichiesti(profilo), base);
  const bloccate = new Set(richiesta.bloccate ?? []);
  const richieste = richiesta.attivita.flatMap((id) => {
    const attivita = ctx.attivita.get(id);
    return attivita && eAttivitaDaScegliere(attivita) ? [attivita] : [];
  });

  for (const pasti of insiemiPasti(delGiorno)) {
    const giorno = { ...base, pasti };
    let piano = collocaGiornata(richiestaGiornata(ctx, giorno, [], pasti, ristoranti));
    if (!piano) continue;
    const scelte: AttivitaCatalogoEstesa[] = [];
    const fuori: string[] = [];
    for (const attivita of richieste) {
      const prova = collocaGiornata(richiestaGiornata(ctx, giorno, [...scelte, attivita], pasti, ristoranti));
      if (prova) {
        scelte.push(attivita);
        piano = prova;
      } else fuori.push(attivita.id);
    }
    const aggiunte: string[] = [];
    if ((richiesta.aggiungi ?? 0) > 0) {
      const usate = attivitaUsate(ctx, viaggio);
      for (const s of scelte) usate.add(s.id);
      for (const id of fuori) usate.add(id);
      const ordine = candidateOrdinate(ctx, new Set([...(richiesta.escludi ?? []), ...usate]));
      for (const valutazione of ordine) {
        if (aggiunte.length >= (richiesta.aggiungi ?? 0)) break;
        const attivita = ctx.attivita.get(valutazione.attivitaId);
        if (!attivita) continue;
        if (attivita.intensita === "impegnativa" && scelte.some((a) => a.intensita === "impegnativa")) continue;
        const prova = collocaGiornata(richiestaGiornata(ctx, giorno, [...scelte, attivita], pasti, ristoranti));
        if (prova) {
          scelte.push(attivita);
          aggiunte.push(attivita.id);
          piano = prova;
        }
      }
    }
    const elementi = elementiDellaGiornata(ctx, piano, giornoAttuale.elementi, bloccate, viaggio);
    const nuovo = structuredClone(viaggio);
    nuovo.prossimoNumeroId = viaggio.prossimoNumeroId + elementi.nuovi;
    const giornoNuovo = nuovo.giorni[indice];
    if (giornoNuovo) giornoNuovo.elementi = elementi.elementi;
    return { viaggio: nuovo, fuori, aggiunte, pastiMancanti: delGiorno.filter((p) => !pasti.includes(p)) };
  }
  throw new ErroreBozza(`Non riesco a collocare il ${data}: l'alloggio non è raggiungibile con i mezzi scelti.`);
}

/**
 * Gli elementi di una giornata collocata: le attività già presenti nel giorno mantengono `id`, priorità e gli altri
 * campi (cambiano solo gli orari); le bloccate diventano irrinunciabili; gli elementi nuovi prendono `N<numero>`.
 */
function elementiDellaGiornata(
  ctx: Contesto,
  piano: PianoGiornata,
  precedenti: readonly Elemento[],
  bloccate: ReadonlySet<string>,
  viaggio: Viaggio,
): { elementi: Elemento[]; nuovi: number } {
  const disponibili = precedenti.filter((e): e is Extract<Elemento, { tipo: "attivita" }> => e.tipo === "attivita");
  let nuovi = 0;
  const nuovoId = (): string => `N${viaggio.prossimoNumeroId + nuovi++}`;
  const elementi = piano.voci.map((voce): Elemento => {
    const orari = { inizio: orarioDaMinuti(voce.inizio), fine: orarioDaMinuti(voce.fine) };
    if (voce.tipo === "spostamento") return { id: nuovoId(), ...orari, tipo: "spostamento", da: voce.da, a: voce.a, mezzo: voce.mezzo };
    const i = disponibili.findIndex((e) => e.attivitaId === voce.attivita.id);
    const bloccata = bloccate.has(voce.attivita.id) && voce.pasto === null;
    if (i >= 0) {
      const [vecchio] = disponibili.splice(i, 1);
      if (vecchio) return { ...vecchio, ...orari, ...(bloccata ? { priorita: "irrinunciabile" as const } : {}) };
    }
    const irrinunciabile = (ctx.valutazioni.get(voce.attivita.id)?.irrinunciabile === true || bloccata) && voce.pasto === null;
    return { id: nuovoId(), ...orari, tipo: "attivita", attivitaId: voce.attivita.id, priorita: irrinunciabile ? "irrinunciabile" : "desiderata" };
  });
  return { elementi, nuovi };
}
