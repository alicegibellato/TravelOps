/**
 * Impatto degli imprevisti (REQ-REPLAN-001).
 *
 * Dato un viaggio, il catalogo e un imprevisto, calcola gli elementi colpiti con il
 * motivo e, per i ritardi, l'orario a cui slitterebbero. Gestisce anche gli imprevisti
 * della §7.4 di modello-dominio-estensioni.md (REQ-REPLAN-003). Il calcolo non usa il
 * controllo di fattibilità né i dati di contesto ed è deterministico: nessun
 * orologio, nessuna casualità, ordine dei risultati stabile.
 */
import { CONDIZIONI_AVVERSE } from "../model/index.js";
import type {
  AttivitaCatalogo,
  AttivitaCatalogoEstesa,
  Catalogo,
  CatalogoEsteso,
  Data,
  Elemento,
  ElementoAttivita,
  ElementoColpito,
  ElementoSpostamento,
  Giorno,
  Impatto,
  ImprevistoCancellazioneSpostamento,
  ImprevistoChiusuraLuogo,
  ImprevistoEsteso,
  ImprevistoMeteoAvverso,
  ImprevistoRitardo,
  ImprevistoSalute,
  ImprevistoSciopero,
  ImprevistoStanchezza,
  ImprevistoVoloPerso,
  Intensita,
  Luogo,
  LuogoEsteso,
  Mezzo,
  Orario,
  Viaggio,
} from "../model/index.js";

/** Elemento colpito con il tipo di imprevisto (R-3) e la data del giorno a cui appartiene. */
export interface ElementoColpitoDettagliato extends ElementoColpito {
  /** Tipo dell'imprevisto che colpisce l'elemento. */
  tipoImprevisto: ImprevistoEsteso["tipo"];
  /** Data del giorno dell'elemento. */
  data: Data;
}

/** Impatto di un imprevisto: elementi colpiti in ordine di data e di inizio (R-3). */
export interface ImpattoDettagliato extends Impatto {
  elementiColpiti: ElementoColpitoDettagliato[];
}

/**
 * Calcola l'impatto di un imprevisto sul viaggio (REQ-REPLAN-001).
 *
 * - `METEO_AVVERSO`: attività all'aperto nella zona che si sovrappongono all'intervallo.
 * - `CHIUSURA_LUOGO`: attività in quel luogo che si sovrappongono all'intervallo.
 * - `CANCELLAZIONE_SPOSTAMENTO`: lo spostamento indicato.
 * - `RITARDO`: simulazione dello slittamento della giornata (R-RIT-1).
 * - `VOLO_PERSO`: lo spostamento perso e, con l'arrivo previsto, gli elementi che
 *   iniziano prima dell'arrivo, anche nei giorni successivi (§7.4).
 * - `SALUTE`: le attività di quei giorni troppo impegnative o, con mobilità ridotta,
 *   non accessibili (§7.4).
 * - `SCIOPERO`: gli spostamenti con quel mezzo in quella data, e zona se indicata (§7.4).
 * - `BAGAGLIO_SMARRITO` e `DOCUMENTI_SMARRITI`: nessun elemento colpito (§7.4).
 * - `STANCHEZZA`: le attività del giorno non irrinunciabili e non a orario fisso (§7.4).
 *
 * Un imprevisto fuori dalle date del viaggio, o che non tocca nessun elemento, ha
 * impatto vuoto (R-2). Il viaggio in ingresso non viene modificato.
 */
export function calcolaImpatto(
  viaggio: Viaggio,
  catalogo: Catalogo | CatalogoEsteso,
  imprevisto: ImprevistoEsteso,
): ImpattoDettagliato {
  const candidati = candidatiColpiti(viaggio, new IndiceCatalogo(catalogo), imprevisto);
  candidati.sort(
    (a, b) =>
      confrontaTesto(a.data, b.data) ||
      minutiDaOrario(a.elemento.inizio) - minutiDaOrario(b.elemento.inizio) ||
      confrontaTesto(a.elemento.id, b.elemento.id),
  );
  return { elementiColpiti: candidati.map((c) => c.colpito) };
}

// ---------------------------------------------------------------------------
// Regole per tipo di imprevisto

interface Candidato {
  data: Data;
  /** L'elemento originale: serve per ordinare i risultati per inizio previsto. */
  elemento: Elemento;
  colpito: ElementoColpitoDettagliato;
}

function candidatiColpiti(viaggio: Viaggio, catalogo: IndiceCatalogo, imprevisto: ImprevistoEsteso): Candidato[] {
  switch (imprevisto.tipo) {
    case "METEO_AVVERSO":
      return colpitiDaMeteo(viaggio, catalogo, imprevisto);
    case "CHIUSURA_LUOGO":
      return colpitiDaChiusura(viaggio, catalogo, imprevisto);
    case "CANCELLAZIONE_SPOSTAMENTO":
      return colpitiDaCancellazione(viaggio, catalogo, imprevisto);
    case "RITARDO":
      return colpitiDaRitardo(viaggio, imprevisto);
    case "VOLO_PERSO":
      return colpitiDaVoloPerso(viaggio, catalogo, imprevisto);
    case "SALUTE":
      return colpitiDaSalute(viaggio, catalogo, imprevisto);
    case "SCIOPERO":
      return colpitiDaSciopero(viaggio, catalogo, imprevisto);
    case "BAGAGLIO_SMARRITO":
    case "DOCUMENTI_SMARRITI":
      // §7.4: nessun elemento colpito; il tempo per acquisti o documenti lo aggiunge la ripianificazione.
      return [];
    case "STANCHEZZA":
      return colpitiDaStanchezza(viaggio, catalogo, imprevisto);
    default: {
      const nonGestito: never = imprevisto;
      throw new Error(`Tipo di imprevisto non gestito: ${JSON.stringify(nonGestito)}`);
    }
  }
}

/** §2.4: le attività all'aperto nella zona che si sovrappongono all'intervallo. */
function colpitiDaMeteo(viaggio: Viaggio, catalogo: IndiceCatalogo, imprevisto: ImprevistoMeteoAvverso): Candidato[] {
  if (!CONDIZIONI_AVVERSE.includes(imprevisto.condizione)) return [];
  const giorno = giornoDelViaggio(viaggio, imprevisto.data);
  if (!giorno) return [];
  const zona = catalogo.nomeZona(imprevisto.zonaId);
  const intervallo = descriviIntervallo(imprevisto.inizio, imprevisto.fine);

  return attivitaCheSiSovrappongono(giorno, catalogo, imprevisto.inizio, imprevisto.fine).flatMap(
    ({ elemento, attivita, luogo }) => {
      if (!attivita.allAperto || luogo.zonaId !== imprevisto.zonaId) return [];
      const motivo =
        `Meteo avverso (${imprevisto.condizione}) in zona ${zona} il ${giorno.data} ${intervallo}: ` +
        `l'attività «${attivita.nome}» (${elemento.inizio}–${elemento.fine}) è all'aperto.`;
      return [candidato(giorno.data, elemento, "METEO_AVVERSO", motivo)];
    },
  );
}

/** §2.4: le attività in quel luogo che si sovrappongono all'intervallo. */
function colpitiDaChiusura(viaggio: Viaggio, catalogo: IndiceCatalogo, imprevisto: ImprevistoChiusuraLuogo): Candidato[] {
  const giorno = giornoDelViaggio(viaggio, imprevisto.data);
  if (!giorno) return [];
  const nomeLuogo = catalogo.nomeLuogo(imprevisto.luogoId);
  const intervallo = descriviIntervallo(imprevisto.inizio, imprevisto.fine);

  return attivitaCheSiSovrappongono(giorno, catalogo, imprevisto.inizio, imprevisto.fine).flatMap(
    ({ elemento, attivita }) => {
      if (attivita.luogoId !== imprevisto.luogoId) return [];
      const motivo =
        `Chiusura del luogo «${nomeLuogo}» il ${giorno.data} ${intervallo}: ` +
        `l'attività «${attivita.nome}» (${elemento.inizio}–${elemento.fine}) si svolge lì.`;
      return [candidato(giorno.data, elemento, "CHIUSURA_LUOGO", motivo)];
    },
  );
}

/** §2.4: lo spostamento indicato. Un id sconosciuto, o che non è uno spostamento, non tocca nulla. */
function colpitiDaCancellazione(
  viaggio: Viaggio,
  catalogo: IndiceCatalogo,
  imprevisto: ImprevistoCancellazioneSpostamento,
): Candidato[] {
  for (const giorno of viaggio.giorni) {
    const elemento = giorno.elementi.find(
      (e): e is ElementoSpostamento => e.id === imprevisto.elementoId && e.tipo === "spostamento",
    );
    if (!elemento) continue;
    const motivo =
      `Cancellazione dello spostamento: lo spostamento ${DESCRIZIONE_MEZZO[elemento.mezzo]} ` +
      `da «${catalogo.nomeLuogo(elemento.da)}» a «${catalogo.nomeLuogo(elemento.a)}» ` +
      `del ${giorno.data} (${elemento.inizio}–${elemento.fine}) è cancellato.`;
    return [candidato(giorno.data, elemento, "CANCELLAZIONE_SPOSTAMENTO", motivo)];
  }
  return [];
}

/**
 * R-RIT-1: si simula lo slittamento della giornata indicata, senza cambiare ordine né durate.
 *
 * - Un elemento in corso (inizio ≤ momento < fine) finisce `minuti` più tardi.
 * - Altrimenti il viaggiatore è disponibile da momento + minuti.
 * - Ogni elemento successivo inizia al più tardi tra il suo inizio previsto e la fine
 *   dell'elemento precedente slittato, e mantiene la durata.
 *
 * Sono colpiti l'elemento in corso e ogni elemento che inizierebbe dopo l'orario
 * previsto; lo slittamento si ferma al primo elemento che resta in orario. Gli altri
 * giorni non sono mai colpiti. Gli elementi a orario fisso si simulano come gli altri.
 */
function colpitiDaRitardo(viaggio: Viaggio, imprevisto: ImprevistoRitardo): Candidato[] {
  const giorno = giornoDelViaggio(viaggio, imprevisto.data);
  // Un ritardo nullo (o non valido) non sposta nulla: impatto vuoto (R-2).
  if (!giorno || !(imprevisto.minuti > 0)) return [];

  const momento = minutiDaOrario(imprevisto.momento);
  const elementi = [...giorno.elementi].sort(confrontaElementi);
  const inCorso = elementi.filter((e) => minutiDaOrario(e.inizio) <= momento && momento < minutiDaOrario(e.fine));
  const colpiti: Candidato[] = [];

  // Il viaggiatore è disponibile da momento + minuti, o dalla fine slittata dell'elemento
  // in corso, che è sempre più tarda. Con più elementi in corso (itinerario con
  // sovrapposizioni) slittano tutti e vale la fine slittata più tarda.
  let disponibileDa = momento + imprevisto.minuti;
  for (const elemento of inCorso) {
    const fineSlittata = minutiDaOrario(elemento.fine) + imprevisto.minuti;
    colpiti.push(candidatoRitardo(giorno.data, elemento, imprevisto, true, minutiDaOrario(elemento.inizio), fineSlittata));
    disponibileDa = Math.max(disponibileDa, fineSlittata);
  }

  for (const elemento of elementi) {
    const inizio = minutiDaOrario(elemento.inizio);
    if (inCorso.includes(elemento) || inizio < momento) continue; // in corso o già concluso
    const inizioSlittato = Math.max(inizio, disponibileDa);
    if (inizioSlittato === inizio) break; // resta in orario: lo slittamento si ferma qui
    const fineSlittata = inizioSlittato + (minutiDaOrario(elemento.fine) - inizio);
    colpiti.push(candidatoRitardo(giorno.data, elemento, imprevisto, false, inizioSlittato, fineSlittata));
    disponibileDa = fineSlittata;
  }
  return colpiti;
}

function candidatoRitardo(
  data: Data,
  elemento: Elemento,
  imprevisto: ImprevistoRitardo,
  inCorso: boolean,
  inizioSlittato: number,
  fineSlittata: number,
): Candidato {
  const durataRitardo = imprevisto.minuti === 1 ? "1 minuto" : `${imprevisto.minuti} minuti`;
  const causa = imprevisto.motivo.trim() === "" ? "" : ` (${imprevisto.motivo.trim()})`;
  const nuovoInizio = orarioDaMinuti(inizioSlittato);
  const nuovaFine = orarioDaMinuti(fineSlittata);
  const effetto =
    inCorso
      ? `l'elemento è in corso e finirebbe alle ${nuovaFine} invece che alle ${elemento.fine}.`
      : `slitterebbe da ${elemento.inizio}–${elemento.fine} a ${nuovoInizio}–${nuovaFine}.`;
  const note = [
    fineSlittata > MINUTI_GIORNATA ? "Finirebbe oltre la mezzanotte." : "",
    elemento.orarioFisso === true ? "L'elemento è a orario fisso e non verrà spostato." : "",
  ].filter((n) => n !== "");
  const motivo = [`Ritardo di ${durataRitardo} alle ${imprevisto.momento}${causa}: ${effetto}`, ...note].join(" ");
  return {
    data,
    elemento,
    colpito: {
      elementoId: elemento.id,
      motivo,
      inizioSlittato: nuovoInizio,
      fineSlittata: nuovaFine,
      tipoImprevisto: "RITARDO",
      data,
    },
  };
}

function candidato(data: Data, elemento: Elemento, tipoImprevisto: ImprevistoEsteso["tipo"], motivo: string): Candidato {
  return { data, elemento, colpito: { elementoId: elemento.id, motivo, tipoImprevisto, data } };
}

// ---------------------------------------------------------------------------
// Imprevisti della §7.4 (REQ-REPLAN-003)

/**
 * §7.4: lo spostamento perso, solo se in volo o in treno; un id sconosciuto o un altro mezzo
 * non toccano nulla. Con l'arrivo previsto sono colpiti anche gli elementi che iniziano
 * dall'inizio dello spostamento perso e prima dell'arrivo previsto, anche nei giorni successivi.
 */
function colpitiDaVoloPerso(viaggio: Viaggio, catalogo: IndiceCatalogo, imprevisto: ImprevistoVoloPerso): Candidato[] {
  const trovato = trovaSpostamento(viaggio, imprevisto.elementoId);
  if (!trovato || (trovato.elemento.mezzo !== "volo" && trovato.elemento.mezzo !== "treno")) return [];
  const { giorno, elemento: perso } = trovato;
  const nomePerso = perso.mezzo === "volo" ? "Volo perso" : "Treno perso";
  const arrivo = imprevisto.arrivoPrevisto;
  const testoArrivo = arrivo ? ` Arrivo previsto con il nuovo mezzo il ${arrivo.data} alle ${arrivo.orario}.` : "";
  const colpiti = [
    candidato(
      giorno.data,
      perso,
      "VOLO_PERSO",
      `${nomePerso}: ${descriviSpostamento(perso, catalogo)} del ${giorno.data} (${perso.inizio}–${perso.fine}) è perso.${testoArrivo}`,
    ),
  ];
  if (!arrivo) return colpiti;

  const minutiArrivo = minutiDaOrario(arrivo.orario);
  const inizioPerso = minutiDaOrario(perso.inizio);
  for (const g of viaggio.giorni) {
    if (g.data < giorno.data || g.data > arrivo.data) continue;
    for (const elemento of g.elementi) {
      if (elemento.id === perso.id) continue;
      const inizio = minutiDaOrario(elemento.inizio);
      if (g.data === giorno.data && inizio < inizioPerso) continue; // prima dello spostamento perso
      if (g.data === arrivo.data && inizio >= minutiArrivo) continue; // dopo l'arrivo previsto
      const motivo =
        `${nomePerso} (${descriviSpostamento(perso, catalogo)} del ${giorno.data}): ` +
        `${descriviElemento(elemento, catalogo)} del ${g.data} (${elemento.inizio}–${elemento.fine}) ` +
        `inizia prima dell'arrivo previsto il ${arrivo.data} alle ${arrivo.orario}.`;
      colpiti.push(candidato(g.data, elemento, "VOLO_PERSO", motivo));
    }
  }
  return colpiti;
}

const GRADO_INTENSITA: Readonly<Record<Intensita, number>> = { facile: 1, moderata: 2, impegnativa: 3 };

/**
 * §7.4: le attività nei giorni indicati con intensità superiore alla massima consentita o, con
 * mobilità ridotta, non accessibili. Un dato assente nel catalogo non rende colpita l'attività.
 * Un numero di giorni non valido (non intero o minore di 1) ha impatto vuoto (R-2).
 */
function colpitiDaSalute(viaggio: Viaggio, catalogo: IndiceCatalogo, imprevisto: ImprevistoSalute): Candidato[] {
  const { giorni: numero, dataInizio } = imprevisto;
  if (numero !== undefined && !(Number.isInteger(numero) && numero >= 1)) return [];
  const dataFine = numero === undefined ? viaggio.dataFine : aggiungiGiorni(dataInizio, numero - 1);
  const descrizione = imprevisto.descrizione.trim() === "" ? "" : ` (${imprevisto.descrizione.trim()})`;
  const periodo =
    numero === undefined
      ? `dal ${dataInizio} fino alla fine del viaggio`
      : `dal ${dataInizio} per ${numero === 1 ? "1 giorno" : `${numero} giorni`}`;
  const massima = GRADO_INTENSITA[imprevisto.intensitaMassima];

  return viaggio.giorni
    .filter((g) => g.data >= dataInizio && g.data <= dataFine && giornoDelViaggio(viaggio, g.data) === g)
    .flatMap((giorno) =>
      attivitaDelGiorno(giorno, catalogo).flatMap(({ elemento, attivita }) => {
        const cause: string[] = [];
        if (attivita.intensita !== undefined && GRADO_INTENSITA[attivita.intensita] > massima) {
          cause.push(
            `ha intensità ${attivita.intensita}, superiore alla massima consentita (${imprevisto.intensitaMassima})`,
          );
        }
        if (imprevisto.mobilitaRidotta && attivita.accessibile === false) {
          cause.push("non è accessibile con mobilità ridotta");
        }
        if (cause.length === 0) return [];
        const motivo =
          `Salute${descrizione} ${periodo}: l'attività «${attivita.nome}» del ${giorno.data} ` +
          `(${elemento.inizio}–${elemento.fine}) ${cause.join(" e ")}.`;
        return [candidato(giorno.data, elemento, "SALUTE", motivo)];
      }),
    );
}

/** §7.4: gli spostamenti con quel mezzo in quella data; con la zona, quelli che partono o arrivano lì. */
function colpitiDaSciopero(viaggio: Viaggio, catalogo: IndiceCatalogo, imprevisto: ImprevistoSciopero): Candidato[] {
  const giorno = giornoDelViaggio(viaggio, imprevisto.data);
  if (!giorno) return [];
  const { zonaId } = imprevisto;
  const nellaZona = (luogoId: string): boolean => catalogo.luoghi.get(luogoId)?.zonaId === zonaId;
  const sciopero =
    `Sciopero ${imprevisto.mezzo === "treno" ? "dei treni" : "dei mezzi pubblici"} il ${giorno.data}` +
    (zonaId === undefined ? "" : ` in zona ${catalogo.nomeZona(zonaId)}`);

  return giorno.elementi.flatMap((elemento) => {
    if (elemento.tipo !== "spostamento" || elemento.mezzo !== imprevisto.mezzo) return [];
    if (zonaId !== undefined && !nellaZona(elemento.da) && !nellaZona(elemento.a)) return [];
    const motivo =
      `${sciopero}: ${descriviSpostamento(elemento, catalogo)} (${elemento.inizio}–${elemento.fine}) ` +
      `non è garantito.`;
    return [candidato(giorno.data, elemento, "SCIOPERO", motivo)];
  });
}

/** §7.4: le attività di quel giorno non irrinunciabili e non a orario fisso; gli spostamenti no. */
function colpitiDaStanchezza(viaggio: Viaggio, catalogo: IndiceCatalogo, imprevisto: ImprevistoStanchezza): Candidato[] {
  const giorno = giornoDelViaggio(viaggio, imprevisto.data);
  if (!giorno) return [];
  return giorno.elementi.flatMap((elemento) => {
    if (elemento.tipo !== "attivita" || elemento.priorita === "irrinunciabile" || elemento.orarioFisso === true) {
      return [];
    }
    const motivo =
      `Stanchezza il ${giorno.data}: ${descriviElemento(elemento, catalogo)} ` +
      `(${elemento.inizio}–${elemento.fine}) non è irrinunciabile e non è a orario fisso.`;
    return [candidato(giorno.data, elemento, "STANCHEZZA", motivo)];
  });
}

function trovaSpostamento(viaggio: Viaggio, id: string): { giorno: Giorno; elemento: ElementoSpostamento } | undefined {
  for (const giorno of viaggio.giorni) {
    const elemento = giorno.elementi.find((e): e is ElementoSpostamento => e.id === id && e.tipo === "spostamento");
    if (elemento) return { giorno, elemento };
  }
  return undefined;
}

function descriviSpostamento(elemento: ElementoSpostamento, catalogo: IndiceCatalogo): string {
  return (
    `lo spostamento ${DESCRIZIONE_MEZZO[elemento.mezzo]} ` +
    `da «${catalogo.nomeLuogo(elemento.da)}» a «${catalogo.nomeLuogo(elemento.a)}»`
  );
}

function descriviElemento(elemento: Elemento, catalogo: IndiceCatalogo): string {
  if (elemento.tipo === "spostamento") return descriviSpostamento(elemento, catalogo);
  return `l'attività «${catalogo.attivita.get(elemento.attivitaId)?.nome ?? elemento.attivitaId}»`;
}

/** La data `AAAA-MM-GG` spostata di `giorni` giorni, calcolata in UTC (nessun orologio, nessun fuso). */
function aggiungiGiorni(data: Data, giorni: number): Data {
  const [anno, mese, giorno] = data.split("-").map(Number);
  const risultato = new Date(Date.UTC(anno ?? 0, (mese ?? 1) - 1, (giorno ?? 1) + giorni));
  return risultato.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Viaggio e catalogo

/** Il giorno con quella data, se la data è dentro le date del viaggio (R-2). */
function giornoDelViaggio(viaggio: Viaggio, data: Data): Giorno | undefined {
  if (data < viaggio.dataInizio || data > viaggio.dataFine) return undefined;
  return viaggio.giorni.find((g) => g.data === data);
}

interface AttivitaNelGiorno {
  elemento: ElementoAttivita;
  attivita: AttivitaCatalogo | AttivitaCatalogoEstesa;
  luogo: Luogo | LuogoEsteso;
}

/**
 * Le attività del giorno con la loro attività di catalogo e il loro luogo. Le attività che non
 * si trovano nel catalogo non sono collocabili in una zona o in un luogo e quindi non risultano colpite.
 */
function attivitaDelGiorno(giorno: Giorno, catalogo: IndiceCatalogo): AttivitaNelGiorno[] {
  return giorno.elementi.flatMap((elemento) => {
    if (elemento.tipo !== "attivita") return [];
    const attivita = catalogo.attivita.get(elemento.attivitaId);
    const luogo = attivita ? catalogo.luoghi.get(attivita.luogoId) : undefined;
    return attivita && luogo ? [{ elemento, attivita, luogo }] : [];
  });
}

/** Le attività del giorno che si sovrappongono all'intervallo (§2.4: intervalli che si toccano non si sovrappongono). */
function attivitaCheSiSovrappongono(
  giorno: Giorno,
  catalogo: IndiceCatalogo,
  inizio: Orario,
  fine: Orario,
): AttivitaNelGiorno[] {
  const da = minutiDaOrario(inizio);
  const a = minutiDaOrario(fine);
  return attivitaDelGiorno(giorno, catalogo).filter(
    ({ elemento }) => minutiDaOrario(elemento.inizio) < a && da < minutiDaOrario(elemento.fine),
  );
}

class IndiceCatalogo {
  readonly attivita: ReadonlyMap<string, AttivitaCatalogo | AttivitaCatalogoEstesa>;
  readonly luoghi: ReadonlyMap<string, Luogo | LuogoEsteso>;
  private readonly zone: ReadonlyMap<string, string>;

  constructor(catalogo: Catalogo | CatalogoEsteso) {
    this.attivita = new Map<string, AttivitaCatalogo | AttivitaCatalogoEstesa>(catalogo.attivita.map((a) => [a.id, a]));
    this.luoghi = new Map<string, Luogo | LuogoEsteso>(catalogo.luoghi.map((l) => [l.id, l]));
    this.zone = new Map(catalogo.zone.map((z) => [z.id, z.nome]));
  }

  nomeLuogo(id: string): string {
    return this.luoghi.get(id)?.nome ?? id;
  }

  nomeZona(id: string): string {
    return this.zone.get(id) ?? id;
  }
}

const DESCRIZIONE_MEZZO: Readonly<Record<Mezzo, string>> = {
  piedi: "a piedi",
  mezzi_pubblici: "con i mezzi pubblici",
  treno: "in treno",
  auto: "in auto",
  volo: "in volo",
};

// ---------------------------------------------------------------------------
// Orari e ordinamento

const MINUTI_GIORNATA = 24 * 60;
const FORMATO_ORARIO = /^(\d{2}):(\d{2})$/;

/** Minuti dalla mezzanotte di un orario `HH:mm` (`24:00` ammesso). */
function minutiDaOrario(orario: Orario): number {
  const parti = FORMATO_ORARIO.exec(orario);
  const ore = Number(parti?.[1]);
  const minuti = Number(parti?.[2]);
  if (!parti || minuti > 59 || ore * 60 + minuti > MINUTI_GIORNATA) {
    throw new Error(`Orario non valido: "${orario}". Il formato atteso è HH:mm, dalle 00:00 alle 24:00.`);
  }
  return ore * 60 + minuti;
}

/**
 * Orario `HH:mm` da minuti dalla mezzanotte. Oltre le 24:00 le ore continuano a
 * crescere (per esempio `25:00`): serve a dire dove slitterebbe un ritardo che
 * porterebbe un elemento oltre la mezzanotte.
 */
function orarioDaMinuti(totale: number): Orario {
  const ore = Math.floor(totale / 60);
  const minuti = totale % 60;
  return `${String(ore).padStart(2, "0")}:${String(minuti).padStart(2, "0")}`;
}

function descriviIntervallo(inizio: Orario, fine: Orario): string {
  return inizio === "00:00" && fine === "24:00" ? "per tutta la giornata" : `dalle ${inizio} alle ${fine}`;
}

/** Ordine per inizio; a parità, ordine alfabetico degli id (§3). */
function confrontaElementi(a: Elemento, b: Elemento): number {
  return minutiDaOrario(a.inizio) - minutiDaOrario(b.inizio) || confrontaTesto(a.id, b.id);
}

/** Confronto per punti di codice, indipendente dalle impostazioni locali (determinismo). */
function confrontaTesto(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
