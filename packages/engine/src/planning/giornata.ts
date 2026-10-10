/**
 * Collocazione di una giornata (REQ-PLAN-001 R-5): dati il punto di partenza, le attività scelte e i pasti richiesti,
 * trova l'ordine che minimizza gli spostamenti rispettando la finestra del profilo, gli orari di apertura e le
 * finestre dei pasti, con il ristorante più vicino compatibile.
 *
 * Funzioni pure e deterministiche: le permutazioni si provano sempre nello stesso ordine e, a parità di minuti di
 * spostamento, vince la giornata che finisce prima e poi quella con la sequenza di `id` minore.
 */
import type {
  AttivitaCatalogoEstesa,
  GiornoSettimana,
  LuogoEsteso,
  Mezzo,
  SorgenteDatiContesto,
} from "../model/index.js";
import { ORDINE_MEZZI } from "../model/index.js";
import type { MezzoProfilo } from "../preferences/index.js";
import { minutiDaOrario } from "../feasibility/orari.js";
import { FINESTRE_PASTI, type Pasto } from "./tipi.js";

/** Un tratto percorribile tra due luoghi con i mezzi del profilo. */
export interface Tratto {
  mezzo: Mezzo;
  minuti: number;
}

/** Tempi di percorrenza con i soli mezzi del profilo, con una memoria per coppia. */
export class Percorsi {
  private readonly memoria = new Map<string, Tratto | null>();
  private readonly mezzi: readonly Mezzo[];

  constructor(
    private readonly sorgente: SorgenteDatiContesto,
    mezziProfilo: readonly MezzoProfilo[],
  ) {
    this.mezzi = ORDINE_MEZZI.filter((m) => (mezziProfilo as readonly Mezzo[]).includes(m));
  }

  /** Il mezzo più veloce del profilo; a parità vale `ORDINE_MEZZI`. `null` se non c'è percorso. Stesso luogo: 0 minuti. */
  tratto(da: string, a: string): Tratto | null {
    if (da === a) return { mezzo: "piedi", minuti: 0 };
    const chiave = da < a ? `${da}\u0000${a}` : `${a}\u0000${da}`;
    if (this.memoria.has(chiave)) return this.memoria.get(chiave) ?? null;
    let migliore: Tratto | null = null;
    for (const mezzo of this.mezzi) {
      const minuti = this.sorgente.tempoPercorrenza(da, a, mezzo);
      if (minuti !== null && (migliore === null || minuti < migliore.minuti)) migliore = { mezzo, minuti };
    }
    this.memoria.set(chiave, migliore);
    return migliore;
  }
}

/** Arrotonda per eccesso ai 5 minuti: gli orari della bozza sono sempre multipli di 5. */
export const aiCinqueMinuti = (minuti: number): number => Math.ceil(minuti / 5) * 5;

/** Durata di uno spostamento nella bozza: il tempo di percorrenza arrotondato ai 5 minuti, almeno 5. */
export const durataSpostamento = (minuti: number): number => Math.max(5, aiCinqueMinuti(minuti));

export const orarioDaMinuti = (minuti: number): string =>
  `${String(Math.floor(minuti / 60)).padStart(2, "0")}:${String(minuti % 60).padStart(2, "0")}`;

export function minutiDi(orario: string): number {
  const valore = minutiDaOrario(orario);
  if (valore === null) throw new RangeError(`Orario non valido "${orario}".`);
  return valore;
}

/** Una voce collocata della giornata, in minuti dalla mezzanotte. */
export type VoceGiornata =
  | { tipo: "spostamento"; da: string; a: string; mezzo: Mezzo; inizio: number; fine: number }
  | { tipo: "attivita"; attivita: AttivitaCatalogoEstesa; pasto: Pasto | null; inizio: number; fine: number };

export interface PianoGiornata {
  voci: VoceGiornata[];
  /** Somma dei minuti di percorrenza (non arrotondati): il valore che R-5 minimizza. */
  minutiSpostamento: number;
  /** Ristorante scelto per ogni pasto collocato. */
  pasti: Partial<Record<Pasto, string>>;
}

export interface RichiestaGiornata {
  giornoSettimana: GiornoSettimana;
  /** Spostamento iniziale già fissato (arrivo), prima del punto di partenza. */
  vociIniziali: VoceGiornata[];
  partenza: { luogo: string; minuti: number };
  /**
   * Tappe finali della giornata, in ordine: il ritorno all'alloggio subito dopo l'ultima voce e, l'ultimo giorno,
   * lo spostamento alla stazione o all'aeroporto che arriva all'orario di partenza (`allUltimoMomento`).
   * Vuoto: nessuno spostamento finale (ultimo giorno senza partenza).
   */
  tappeFinali: { luogo: string; entro: number | null; allUltimoMomento: boolean }[];
  /** Le attività (non pasti) devono finire entro questo minuto: fine della finestra del profilo o partenza. */
  fineAttivita: number;
  attivita: readonly AttivitaCatalogoEstesa[];
  pasti: readonly Pasto[];
  /** Attività di pasto ammesse dal profilo e dalle esigenze alimentari, in ordine di `id`. */
  ristoranti: readonly AttivitaCatalogoEstesa[];
  luoghi: ReadonlyMap<string, LuogoEsteso>;
  percorsi: Percorsi;
}

/** Fasce di apertura del luogo in quel giorno, in minuti; tutta la giornata se è sempre aperto. */
function fasce(luogo: LuogoEsteso, giorno: GiornoSettimana): { inizio: number; fine: number }[] {
  if ("sempre" in luogo.apertura) return [{ inizio: 0, fine: 1440 }];
  return (luogo.apertura.settimana[giorno] ?? [])
    .map((f) => ({ inizio: minutiDi(f.apertura), fine: minutiDi(f.chiusura) }))
    .sort((x, y) => x.inizio - y.inizio || x.fine - y.fine);
}

/** Il primo inizio (multiplo di 5) non prima di `minimo` tale che l'attività stia in una fascia e finisca entro `limite`. */
function primoInizio(
  luogo: LuogoEsteso,
  giorno: GiornoSettimana,
  minimo: number,
  durata: number,
  limite: number,
): number | null {
  for (const fascia of fasce(luogo, giorno)) {
    const inizio = aiCinqueMinuti(Math.max(minimo, fascia.inizio));
    if (inizio + durata <= fascia.fine && inizio + durata <= limite) return inizio;
  }
  return null;
}

type Passo = { tipo: "attivita"; attivita: AttivitaCatalogoEstesa } | { tipo: "pasto"; pasto: Pasto };

/** Simula una sequenza; `null` se non sta negli orari. */
function simula(sequenza: readonly Passo[], richiesta: RichiestaGiornata): PianoGiornata | null {
  const { luoghi, percorsi, giornoSettimana: giorno } = richiesta;
  const voci: VoceGiornata[] = [...richiesta.vociIniziali];
  const pasti: Partial<Record<Pasto, string>> = {};
  let luogo = richiesta.partenza.luogo;
  let adesso = richiesta.partenza.minuti;
  let minutiSpostamento = 0;

  const vai = (verso: string, tratto: Tratto, inizioAttivita: number): void => {
    if (verso === luogo) return;
    const durata = durataSpostamento(tratto.minuti);
    voci.push({ tipo: "spostamento", da: luogo, a: verso, mezzo: tratto.mezzo, inizio: inizioAttivita - durata, fine: inizioAttivita });
    minutiSpostamento += tratto.minuti;
  };

  for (const passo of sequenza) {
    if (passo.tipo === "attivita") {
      const destinazione = luoghi.get(passo.attivita.luogoId);
      const tratto = percorsi.tratto(luogo, passo.attivita.luogoId);
      if (!destinazione || !tratto) return null;
      const viaggio = destinazione.id === luogo ? 0 : durataSpostamento(tratto.minuti);
      const inizio = primoInizio(destinazione, giorno, adesso + viaggio, passo.attivita.durataTipica, richiesta.fineAttivita);
      if (inizio === null) return null;
      vai(destinazione.id, tratto, inizio);
      const fine = inizio + passo.attivita.durataTipica;
      voci.push({ tipo: "attivita", attivita: passo.attivita, pasto: null, inizio, fine });
      luogo = destinazione.id;
      adesso = fine;
      continue;
    }
    // Pasto: il ristorante più vicino tra quelli compatibili che possono ospitarlo nella sua finestra.
    const finestra = FINESTRE_PASTI[passo.pasto];
    let scelta: { ristorante: AttivitaCatalogoEstesa; luogo: LuogoEsteso; tratto: Tratto; inizio: number } | null = null;
    for (const ristorante of richiesta.ristoranti) {
      const destinazione = luoghi.get(ristorante.luogoId);
      const tratto = percorsi.tratto(luogo, ristorante.luogoId);
      if (!destinazione || !tratto) continue;
      if (scelta !== null && tratto.minuti >= scelta.tratto.minuti) continue;
      const viaggio = destinazione.id === luogo ? 0 : durataSpostamento(tratto.minuti);
      const minimo = Math.max(adesso + viaggio, minutiDi(finestra.inizio));
      const inizio = primoInizio(destinazione, giorno, minimo, ristorante.durataTipica, minutiDi(finestra.fine));
      if (inizio !== null) scelta = { ristorante, luogo: destinazione, tratto, inizio };
    }
    if (scelta === null) return null;
    vai(scelta.luogo.id, scelta.tratto, scelta.inizio);
    const fine = scelta.inizio + scelta.ristorante.durataTipica;
    voci.push({ tipo: "attivita", attivita: scelta.ristorante, pasto: passo.pasto, inizio: scelta.inizio, fine });
    pasti[passo.pasto] = scelta.ristorante.id;
    luogo = scelta.luogo.id;
    adesso = fine;
  }

  for (const tappa of richiesta.tappeFinali) {
    if (tappa.luogo === luogo) {
      if (tappa.entro !== null && adesso > tappa.entro) return null;
      continue;
    }
    const tratto = percorsi.tratto(luogo, tappa.luogo);
    if (!tratto) return null;
    const durata = durataSpostamento(tratto.minuti);
    const inizio = tappa.allUltimoMomento && tappa.entro !== null ? tappa.entro - durata : adesso;
    const fine = inizio + durata;
    if (inizio < adesso || fine > (tappa.entro ?? 1440)) return null;
    voci.push({ tipo: "spostamento", da: luogo, a: tappa.luogo, mezzo: tratto.mezzo, inizio, fine });
    minutiSpostamento += tratto.minuti;
    luogo = tappa.luogo;
    adesso = fine;
  }
  if (voci.some((v) => v.fine > 1440 || v.inizio < 0)) return null;
  return { voci, minutiSpostamento, pasti };
}

/** Tutte le permutazioni, nell'ordine lessicografico degli indici. */
function permutazioni<T>(voci: readonly T[]): T[][] {
  if (voci.length <= 1) return [[...voci]];
  const risultato: T[][] = [];
  voci.forEach((voce, i) => {
    for (const resto of permutazioni([...voci.slice(0, i), ...voci.slice(i + 1)])) risultato.push([voce, ...resto]);
  });
  return risultato;
}

/** Inserisce i pasti (pranzo prima della cena) in ogni posizione possibile della sequenza delle attività. */
function conPasti(ordine: readonly AttivitaCatalogoEstesa[], pasti: readonly Pasto[]): Passo[][] {
  let sequenze: Passo[][] = [ordine.map((attivita): Passo => ({ tipo: "attivita", attivita }))];
  for (const pasto of pasti) {
    const nuove: Passo[][] = [];
    for (const sequenza of sequenze) {
      // Il pasto va dopo quelli già inseriti, così il pranzo resta prima della cena.
      const ultimoPasto = sequenza.reduce((u, p, i) => (p.tipo === "pasto" ? i : u), -1);
      for (let posizione = ultimoPasto + 1; posizione <= sequenza.length; posizione++) {
        nuove.push([...sequenza.slice(0, posizione), { tipo: "pasto", pasto }, ...sequenza.slice(posizione)]);
      }
    }
    sequenze = nuove;
  }
  return sequenze;
}

const chiaveSequenza = (piano: PianoGiornata): string =>
  piano.voci.map((v) => (v.tipo === "attivita" ? v.attivita.id : "")).join("\u0000");

const fineDi = (piano: PianoGiornata): number => piano.voci.at(-1)?.fine ?? 0;

/**
 * Colloca la giornata: prova ogni ordine delle attività e ogni posizione dei pasti, e tiene quella con meno minuti di
 * spostamento (poi quella che finisce prima, poi la sequenza di `id` minore). `null` se nessun ordine sta negli orari.
 */
export function collocaGiornata(richiesta: RichiestaGiornata): PianoGiornata | null {
  const ordinate = [...richiesta.attivita].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  let migliore: PianoGiornata | null = null;
  for (const ordine of permutazioni(ordinate)) {
    for (const sequenza of conPasti(ordine, richiesta.pasti)) {
      const piano = simula(sequenza, richiesta);
      if (piano === null) continue;
      if (
        migliore === null ||
        piano.minutiSpostamento < migliore.minutiSpostamento ||
        (piano.minutiSpostamento === migliore.minutiSpostamento &&
          (fineDi(piano) < fineDi(migliore) ||
            (fineDi(piano) === fineDi(migliore) && chiaveSequenza(piano) < chiaveSequenza(migliore))))
      ) {
        migliore = piano;
      }
    }
  }
  return migliore;
}
