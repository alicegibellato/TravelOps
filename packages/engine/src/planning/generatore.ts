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
  };
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
  giorno: Omit<GiornoInCostruzione, "piano" | "scelte">,
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
  const richiesti: Pasto[] = [
    ...(ctx.profilo.pasti.pranzo ? (["pranzo"] as const) : []),
    ...(ctx.profilo.pasti.cena ? (["cena"] as const) : []),
  ];

  const giorni: GiornoInCostruzione[] = ctx.date.map((data, indice) => {
    const base = {
      indice,
      data,
      previste: previste[indice] ?? 0,
      arrivo: ctx.arrivo !== null && indice === 0,
      partenza: ctx.arrivo !== null && indice === ctx.date.length - 1,
      pasti: [] as Pasto[],
    };
    // Pasti del giorno: quelli richiesti, tranne quelli che finiscono prima dell'arrivo o iniziano dopo la partenza.
    const delGiorno = richiesti.filter(
      (p) =>
        !(base.arrivo && ctx.orarioArrivo >= minutiDi(FINESTRE_PASTI[p].fine)) &&
        !(base.partenza && ctx.orarioPartenza <= minutiDi(FINESTRE_PASTI[p].inizio)),
    );
    // Pasti collocabili anche senza attività: di solito tutti; meno se nessun ristorante compatibile è aperto o
    // raggiungibile in tempo.
    const insiemi: Pasto[][] = [delGiorno, ...delGiorno.map((p) => delGiorno.filter((q) => q !== p)), []];
    for (const pasti of insiemi) {
      const piano = collocaGiornata(richiestaGiornata(ctx, base, [], pasti, ristoranti));
      if (piano) {
        for (const mancante of delGiorno.filter((p) => !pasti.includes(p))) {
          const momento = mancante === "pranzo" ? "il pranzo" : "la cena";
          avvisi.push(`Il ${data} non ho inserito ${momento}: non c'è un ristorante adatto a te aperto in quella fascia.`);
        }
        return { ...base, pasti, scelte: [], piano };
      }
    }
    throw new ErroreBozza(`Non riesco a collocare il ${data}: l'alloggio non è raggiungibile con i mezzi scelti.`);
  });

  const ordine = candidateOrdinate(ctx, escluse);
  const usate = new Set<string>();
  const giri = Math.max(0, ...giorni.map((g) => g.previste));
  for (let giro = 0; giro < giri; giro++) {
    for (const giorno of giorni) {
      if (giorno.previste <= giro || giorno.scelte.length < giro) continue;
      const conStile = giorno.scelte.some((a) => (ctx.valutazioni.get(a.id)?.stiliInComune.length ?? 0) > 0);
      const impegnativa = giorno.scelte.some((a) => a.intensita === "impegnativa");
      // R-4: almeno uno stile del profilo ogni giorno; all'ultimo posto libero, se manca, lo si chiede alla candidata.
      const ultimoPosto = giorno.previste - giorno.scelte.length === 1;
      const tentativi = !conStile && ultimoPosto ? [true, false] : [false];
      let scelta: { attivita: AttivitaCatalogoEstesa; piano: PianoGiornata } | null = null;
      for (const serveStile of tentativi) {
        for (const valutazione of ordine) {
          if (usate.has(valutazione.attivitaId)) continue;
          if (serveStile && valutazione.stiliInComune.length === 0) continue;
          const attivita = ctx.attivita.get(valutazione.attivitaId);
          if (!attivita) continue;
          if (impegnativa && attivita.intensita === "impegnativa") continue;
          const piano = collocaGiornata(richiestaGiornata(ctx, giorno, [...giorno.scelte, attivita], giorno.pasti, ristoranti));
          if (piano) {
            scelta = { attivita, piano };
            break;
          }
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
      const irrinunciabile = ctx.valutazioni.get(voce.attivita.id)?.irrinunciabile === true && voce.pasto === null;
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
      if (attivitaId === undefined || !valutazione || coinvolte.some((c) => c.attivitaId === attivitaId)) continue;
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
