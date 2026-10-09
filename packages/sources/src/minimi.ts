/**
 * Controllo dei minimi di un'istantanea (`dati-di-riferimento-estensioni.md` §8.1, REQ-CAT-002 CA-2).
 *
 * Ogni istantanea, precaricata o costruita al volo, deve avere:
 * - almeno 15 attività, almeno 2 per ciascuno dei 7 stili (se la destinazione non ne ha abbastanza per uno stile,
 *   lo dichiara in `stiliScarsi`);
 * - almeno 3 ristoranti adatti a pranzo e cena, di cui almeno uno con opzione vegetariana e, se esiste nei dati,
 *   uno senza glutine;
 * - almeno 2 alloggi di fascia diversa, una farmacia, un ospedale, la stazione o l'aeroporto di arrivo;
 * - tempi di percorrenza per tutte le coppie di luoghi che il generatore può usare.
 *
 * Le regole esatte (che cosa conta come attività, quando un ristorante è adatto a pranzo o a cena, quali sono le
 * coppie usabili) sono scritte qui sotto e nel README del pacchetto. Il controllo è deterministico e non solleva
 * eccezioni: restituisce le mancanze, con un messaggio chiaro in italiano per ciascuna, e gli avvisi.
 */
import { VALORI_AMMESSI, type FasciaOraria, type LuogoEsteso, type OrariApertura, type StileViaggio } from "@travelops/engine";
import type { IstantaneaDestinazione } from "./formato.js";

/** Le soglie della §8.1. */
export const MINIMI = {
  attivita: 15,
  attivitaPerStile: 2,
  ristorantiPranzo: 3,
  ristorantiCena: 3,
  ristorantiVegetariani: 1,
  fasceAlloggio: 2,
  farmacie: 1,
  ospedali: 1,
  arrivi: 1,
} as const;

/**
 * Le finestre dei pasti: un ristorante è adatto a un pasto se è sempre aperto, oppure se in almeno un giorno della
 * settimana una sua fascia copre almeno `minutiMinimi` minuti della finestra.
 */
export const FINESTRE_PASTI = {
  pranzo: { inizio: "12:00", fine: "15:00" },
  cena: { inizio: "19:00", fine: "22:30" },
  minutiMinimi: 60,
} as const;

export type CodiceMinimo =
  | "ATTIVITA_INSUFFICIENTI"
  | "STILE_INSUFFICIENTE"
  | "RISTORANTI_PRANZO_INSUFFICIENTI"
  | "RISTORANTI_CENA_INSUFFICIENTI"
  | "RISTORANTE_VEGETARIANO_MANCANTE"
  | "ALLOGGI_INSUFFICIENTI"
  | "FARMACIA_MANCANTE"
  | "OSPEDALE_MANCANTE"
  | "ARRIVO_MANCANTE"
  | "TEMPI_MANCANTI";

export type CodiceAvvisoMinimo = "STILE_DICHIARATO_SCARSO" | "RISTORANTE_SENZA_GLUTINE_MANCANTE";

/** Un minimo non rispettato: codice, messaggio in italiano e, dove ha senso, quanti ce ne sono e quanti ne servono. */
export interface MancanzaMinimo {
  codice: CodiceMinimo;
  messaggio: string;
  trovati?: number;
  richiesti?: number;
  /** Lo stile, per `STILE_INSUFFICIENTE`. */
  stile?: StileViaggio;
  /** Le coppie di luoghi senza tempo di percorrenza, per `TEMPI_MANCANTI` (ordinate, ogni coppia in ordine alfabetico). */
  coppie?: [string, string][];
}

export interface AvvisoMinimo {
  codice: CodiceAvvisoMinimo;
  messaggio: string;
  stile?: StileViaggio;
}

/** I conteggi su cui si basa il controllo, utili per i messaggi e per il collaudo. */
export interface ConteggiMinimi {
  attivita: number;
  attivitaPerStile: Record<StileViaggio, number>;
  ristorantiPranzo: number;
  ristorantiCena: number;
  ristorantiVegetariani: number;
  ristorantiSenzaGlutine: number;
  fasceAlloggio: number;
  farmacie: number;
  ospedali: number;
  arrivi: number;
  coppieUsabili: number;
  coppieSenzaTempo: number;
}

export interface EsitoMinimi {
  /** `true` se non manca nulla (gli avvisi non contano). */
  rispettati: boolean;
  mancanze: MancanzaMinimo[];
  avvisi: AvvisoMinimo[];
  conteggi: ConteggiMinimi;
}

const STILI: readonly StileViaggio[] = VALORI_AMMESSI.stile;

/** Quante coppie senza tempo elencare per nome nel messaggio; il numero totale c'è sempre. */
const COPPIE_NEL_MESSAGGIO = 5;

function minuti(orario: string): number {
  const [ore, min] = orario.split(":").map(Number);
  return (ore ?? 0) * 60 + (min ?? 0);
}

function copreFinestra(fascia: FasciaOraria, inizio: string, fine: string): boolean {
  const sovrapposizione = Math.min(minuti(fascia.chiusura), minuti(fine)) - Math.max(minuti(fascia.apertura), minuti(inizio));
  return sovrapposizione >= FINESTRE_PASTI.minutiMinimi;
}

/** Se un ristorante con questi orari è adatto al pasto, con le finestre di `FINESTRE_PASTI`. */
export function adattoAlPasto(apertura: OrariApertura, pasto: "pranzo" | "cena"): boolean {
  if ("sempre" in apertura) return true;
  const { inizio, fine } = FINESTRE_PASTI[pasto];
  return Object.values(apertura.settimana).some((fasce) => fasce.some((fascia) => copreFinestra(fascia, inizio, fine)));
}

const chiaveCoppia = (a: string, b: string): string => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);
const coppiaOrdinata = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a]);

/**
 * Le coppie di luoghi che il generatore può usare, ciascuna in ordine alfabetico e nell'ordine dei luoghi:
 * - tutte le coppie tra i "luoghi del piano": luoghi con almeno un'attività che non sia un `servizio` (quindi anche
 *   i ristoranti con il loro pasto) e alloggi;
 * - ogni alloggio con ogni stazione e aeroporto (l'arrivo).
 * Farmacie, ospedali e negozi servono solo alle regole degli imprevisti e non entrano nelle coppie.
 */
export function coppieUsabili(istantanea: Pick<IstantaneaDestinazione, "luoghi" | "attivita">): [string, string][] {
  const conAttivita = new Set(istantanea.attivita.filter((a) => a.categoria !== "servizio").map((a) => a.luogoId));
  const delPiano = istantanea.luoghi.filter((l) => l.tipo === "alloggio" || conAttivita.has(l.id)).map((l) => l.id);
  const alloggi = istantanea.luoghi.filter((l) => l.tipo === "alloggio").map((l) => l.id);
  const arrivi = istantanea.luoghi.filter((l) => l.tipo === "stazione" || l.tipo === "aeroporto").map((l) => l.id);
  const coppie = new Map<string, [string, string]>();
  const aggiungi = (a: string, b: string): void => {
    if (a !== b) coppie.set(chiaveCoppia(a, b), coppiaOrdinata(a, b));
  };
  delPiano.forEach((a, i) => delPiano.slice(i + 1).forEach((b) => aggiungi(a, b)));
  for (const alloggio of alloggi) for (const arrivo of arrivi) aggiungi(alloggio, arrivo);
  return [...coppie.values()];
}

const di = (luoghi: readonly LuogoEsteso[], tipo: LuogoEsteso["tipo"]): LuogoEsteso[] => luoghi.filter((l) => l.tipo === tipo);

/** Controlla i minimi della §8.1 su un'istantanea già letta. Non solleva eccezioni. */
export function controllaMinimi(istantanea: IstantaneaDestinazione): EsitoMinimi {
  const mancanze: MancanzaMinimo[] = [];
  const avvisi: AvvisoMinimo[] = [];

  // Attività: quelle che il generatore può scegliere, cioè non i pasti e non i servizi.
  const attivita = istantanea.attivita.filter((a) => a.categoria !== "pasto" && a.categoria !== "servizio");
  if (attivita.length < MINIMI.attivita) {
    mancanze.push({
      codice: "ATTIVITA_INSUFFICIENTI",
      messaggio: `servono almeno ${MINIMI.attivita} attività (pasti e servizi esclusi), ce ne sono ${attivita.length}`,
      trovati: attivita.length,
      richiesti: MINIMI.attivita,
    });
  }
  const attivitaPerStile = Object.fromEntries(
    STILI.map((stile) => [stile, attivita.filter((a) => a.stili?.includes(stile) === true).length]),
  ) as Record<StileViaggio, number>;
  const dichiarati = new Map((istantanea.stiliScarsi ?? []).map((s) => [s.stile, s.motivo]));
  for (const stile of STILI) {
    const trovati = attivitaPerStile[stile];
    if (trovati >= MINIMI.attivitaPerStile) continue;
    const motivo = dichiarati.get(stile);
    if (motivo !== undefined) {
      avvisi.push({
        codice: "STILE_DICHIARATO_SCARSO",
        messaggio: `lo stile "${stile}" ha ${trovati} attività su ${MINIMI.attivitaPerStile}, dichiarato scarso: ${motivo}`,
        stile,
      });
    } else {
      mancanze.push({
        codice: "STILE_INSUFFICIENTE",
        messaggio:
          `lo stile "${stile}" ha ${trovati} attività, ne servono almeno ${MINIMI.attivitaPerStile}: ` +
          `aggiungine o dichiaralo in "stiliScarsi" con il motivo`,
        trovati,
        richiesti: MINIMI.attivitaPerStile,
        stile,
      });
    }
  }

  // Ristoranti.
  const ristoranti = di(istantanea.luoghi, "ristorante");
  const ristorantiPranzo = ristoranti.filter((r) => adattoAlPasto(r.apertura, "pranzo")).length;
  const ristorantiCena = ristoranti.filter((r) => adattoAlPasto(r.apertura, "cena")).length;
  const ristorantiVegetariani = ristoranti.filter((r) => r.opzioniAlimentari?.includes("vegetariano") === true).length;
  const ristorantiSenzaGlutine = ristoranti.filter((r) => r.opzioniAlimentari?.includes("senza_glutine") === true).length;
  const { pranzo, cena } = FINESTRE_PASTI;
  if (ristorantiPranzo < MINIMI.ristorantiPranzo) {
    mancanze.push({
      codice: "RISTORANTI_PRANZO_INSUFFICIENTI",
      messaggio: `servono almeno ${MINIMI.ristorantiPranzo} ristoranti aperti a pranzo (${pranzo.inizio}–${pranzo.fine}), ce ne sono ${ristorantiPranzo}`,
      trovati: ristorantiPranzo,
      richiesti: MINIMI.ristorantiPranzo,
    });
  }
  if (ristorantiCena < MINIMI.ristorantiCena) {
    mancanze.push({
      codice: "RISTORANTI_CENA_INSUFFICIENTI",
      messaggio: `servono almeno ${MINIMI.ristorantiCena} ristoranti aperti a cena (${cena.inizio}–${cena.fine}), ce ne sono ${ristorantiCena}`,
      trovati: ristorantiCena,
      richiesti: MINIMI.ristorantiCena,
    });
  }
  if (ristorantiVegetariani < MINIMI.ristorantiVegetariani) {
    mancanze.push({
      codice: "RISTORANTE_VEGETARIANO_MANCANTE",
      messaggio: `serve almeno un ristorante con opzione vegetariana, non ce n'è nessuno`,
      trovati: 0,
      richiesti: MINIMI.ristorantiVegetariani,
    });
  }
  if (ristorantiSenzaGlutine === 0) {
    // La §8.1 lo chiede solo "se esiste nei dati": l'istantanea non può saperlo, quindi è un avviso.
    avvisi.push({
      codice: "RISTORANTE_SENZA_GLUTINE_MANCANTE",
      messaggio: "nessun ristorante con opzione senza glutine: va bene solo se le fonti non ne hanno nessuno",
    });
  }

  // Alloggi di fascia diversa e servizi.
  const fasceAlloggio = new Set(
    di(istantanea.luoghi, "alloggio")
      .map((a) => a.costoIndicativo)
      .filter((c) => c !== undefined),
  ).size;
  if (fasceAlloggio < MINIMI.fasceAlloggio) {
    mancanze.push({
      codice: "ALLOGGI_INSUFFICIENTI",
      messaggio:
        `servono almeno ${MINIMI.fasceAlloggio} alloggi di fascia diversa (campo "costoIndicativo"), ` +
        `le fasce presenti sono ${fasceAlloggio}`,
      trovati: fasceAlloggio,
      richiesti: MINIMI.fasceAlloggio,
    });
  }
  const farmacie = di(istantanea.luoghi, "farmacia").length;
  const ospedali = di(istantanea.luoghi, "ospedale").length;
  const arrivi = di(istantanea.luoghi, "stazione").length + di(istantanea.luoghi, "aeroporto").length;
  if (farmacie < MINIMI.farmacie) {
    mancanze.push({ codice: "FARMACIA_MANCANTE", messaggio: "serve almeno una farmacia, non ce n'è nessuna", trovati: 0, richiesti: 1 });
  }
  if (ospedali < MINIMI.ospedali) {
    mancanze.push({ codice: "OSPEDALE_MANCANTE", messaggio: "serve almeno un ospedale, non ce n'è nessuno", trovati: 0, richiesti: 1 });
  }
  if (arrivi < MINIMI.arrivi) {
    mancanze.push({
      codice: "ARRIVO_MANCANTE",
      messaggio: "serve la stazione o l'aeroporto di arrivo più vicini, non ce n'è nessuno",
      trovati: 0,
      richiesti: 1,
    });
  }

  // Tempi di percorrenza per le coppie usabili (con almeno un mezzo, in un senso o nell'altro).
  const conTempo = new Set(istantanea.tempiPercorrenza.map((t) => chiaveCoppia(t.da, t.a)));
  const usabili = coppieUsabili(istantanea);
  const senzaTempo = usabili.filter(([a, b]) => !conTempo.has(chiaveCoppia(a, b)));
  if (senzaTempo.length > 0) {
    const elenco = senzaTempo
      .slice(0, COPPIE_NEL_MESSAGGIO)
      .map(([a, b]) => `${a}–${b}`)
      .join(", ");
    const altre = senzaTempo.length > COPPIE_NEL_MESSAGGIO ? ` e altre ${senzaTempo.length - COPPIE_NEL_MESSAGGIO}` : "";
    mancanze.push({
      codice: "TEMPI_MANCANTI",
      messaggio: `mancano i tempi di percorrenza di ${senzaTempo.length} coppie di luoghi su ${usabili.length}: ${elenco}${altre}`,
      trovati: usabili.length - senzaTempo.length,
      richiesti: usabili.length,
      coppie: senzaTempo,
    });
  }

  return {
    rispettati: mancanze.length === 0,
    mancanze,
    avvisi,
    conteggi: {
      attivita: attivita.length,
      attivitaPerStile,
      ristorantiPranzo,
      ristorantiCena,
      ristorantiVegetariani,
      ristorantiSenzaGlutine,
      fasceAlloggio,
      farmacie,
      ospedali,
      arrivi,
      coppieUsabili: usabili.length,
      coppieSenzaTempo: senzaTempo.length,
    },
  };
}
