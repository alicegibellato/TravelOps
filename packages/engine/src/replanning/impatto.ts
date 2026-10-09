/**
 * Impatto degli imprevisti (REQ-REPLAN-001).
 *
 * Dato un viaggio, il catalogo e un imprevisto, calcola gli elementi colpiti con il
 * motivo e, per i ritardi, l'orario a cui slitterebbero. Il calcolo non usa il
 * controllo di fattibilità né i dati di contesto ed è deterministico: nessun
 * orologio, nessuna casualità, ordine dei risultati stabile.
 */
import { CONDIZIONI_AVVERSE } from "../model/index.js";
import type {
  AttivitaCatalogo,
  Catalogo,
  Data,
  Elemento,
  ElementoAttivita,
  ElementoColpito,
  ElementoSpostamento,
  Giorno,
  Impatto,
  Imprevisto,
  ImprevistoCancellazioneSpostamento,
  ImprevistoChiusuraLuogo,
  ImprevistoMeteoAvverso,
  ImprevistoRitardo,
  Luogo,
  Mezzo,
  Orario,
  Viaggio,
} from "../model/index.js";

/** Elemento colpito con il tipo di imprevisto (R-3) e la data del giorno a cui appartiene. */
export interface ElementoColpitoDettagliato extends ElementoColpito {
  /** Tipo dell'imprevisto che colpisce l'elemento. */
  tipoImprevisto: Imprevisto["tipo"];
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
 *
 * Un imprevisto fuori dalle date del viaggio, o che non tocca nessun elemento, ha
 * impatto vuoto (R-2). Il viaggio in ingresso non viene modificato.
 */
export function calcolaImpatto(
  viaggio: Viaggio,
  catalogo: Catalogo,
  imprevisto: Imprevisto,
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

function candidatiColpiti(viaggio: Viaggio, catalogo: IndiceCatalogo, imprevisto: Imprevisto): Candidato[] {
  switch (imprevisto.tipo) {
    case "METEO_AVVERSO":
      return colpitiDaMeteo(viaggio, catalogo, imprevisto);
    case "CHIUSURA_LUOGO":
      return colpitiDaChiusura(viaggio, catalogo, imprevisto);
    case "CANCELLAZIONE_SPOSTAMENTO":
      return colpitiDaCancellazione(viaggio, catalogo, imprevisto);
    case "RITARDO":
      return colpitiDaRitardo(viaggio, imprevisto);
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

function candidato(data: Data, elemento: Elemento, tipoImprevisto: Imprevisto["tipo"], motivo: string): Candidato {
  return { data, elemento, colpito: { elementoId: elemento.id, motivo, tipoImprevisto, data } };
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
  attivita: AttivitaCatalogo;
  luogo: Luogo;
}

/**
 * Le attività del giorno che si sovrappongono all'intervallo (§2.4: intervalli che si
 * toccano non si sovrappongono). Le attività che non si trovano nel catalogo non sono
 * collocabili in una zona o in un luogo e quindi non risultano colpite.
 */
function attivitaCheSiSovrappongono(
  giorno: Giorno,
  catalogo: IndiceCatalogo,
  inizio: Orario,
  fine: Orario,
): AttivitaNelGiorno[] {
  const da = minutiDaOrario(inizio);
  const a = minutiDaOrario(fine);
  return giorno.elementi.flatMap((elemento) => {
    if (elemento.tipo !== "attivita") return [];
    const attivita = catalogo.attivita.get(elemento.attivitaId);
    const luogo = attivita ? catalogo.luoghi.get(attivita.luogoId) : undefined;
    if (!attivita || !luogo) return [];
    const sovrapposto = minutiDaOrario(elemento.inizio) < a && da < minutiDaOrario(elemento.fine);
    return sovrapposto ? [{ elemento, attivita, luogo }] : [];
  });
}

class IndiceCatalogo {
  readonly attivita: ReadonlyMap<string, AttivitaCatalogo>;
  readonly luoghi: ReadonlyMap<string, Luogo>;
  private readonly zone: ReadonlyMap<string, string>;

  constructor(catalogo: Catalogo) {
    this.attivita = new Map(catalogo.attivita.map((a) => [a.id, a]));
    this.luoghi = new Map(catalogo.luoghi.map((l) => [l.id, l]));
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
