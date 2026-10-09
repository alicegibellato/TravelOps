/**
 * Validazione dei dati di contesto letti da una sorgente simulata (REQ-FEAS-001,
 * `modello-dominio.md` §2.3). Restituisce una copia pulita oppure segnala tutti
 * gli errori in una volta con `ErroreDatiContesto`.
 */
import {
  ORDINE_MEZZI,
  type ChiusuraStraordinaria,
  type CondizioneMeteo,
  type DatiContesto,
  type Mezzo,
  type PrevisioneMeteo,
  type TempoPercorrenza,
} from "../model/index.js";

/** Errore nei dati di contesto: file illeggibile, JSON non valido o contenuto non conforme al modello. */
export class ErroreDatiContesto extends Error {
  override readonly name = "ErroreDatiContesto";
  /** Un motivo per ogni difetto trovato, in italiano. */
  readonly errori: readonly string[];

  constructor(errori: readonly string[], opzioni?: ErrorOptions) {
    super(`Errore nei dati di contesto: ${errori.join("; ")}`, opzioni);
    this.errori = errori;
  }
}

const CONDIZIONI_METEO: readonly CondizioneMeteo[] = ["sereno", "nuvoloso", "pioggia", "temporale", "neve"];
const FORMATO_ORARIO = /^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/;
const FORMATO_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

type Oggetto = Record<string, unknown>;

const eOggetto = (valore: unknown): valore is Oggetto =>
  typeof valore === "object" && valore !== null && !Array.isArray(valore);

const eTestoNonVuoto = (valore: unknown): valore is string => typeof valore === "string" && valore.length > 0;

const eOrario = (valore: unknown): valore is string => typeof valore === "string" && FORMATO_ORARIO.test(valore);

function eData(valore: unknown): valore is string {
  if (typeof valore !== "string") return false;
  const parti = FORMATO_DATA.exec(valore);
  if (!parti) return false;
  const [anno, mese, giorno] = [Number(parti[1]), Number(parti[2]), Number(parti[3])];
  const data = new Date(Date.UTC(anno, mese - 1, giorno));
  return data.getUTCFullYear() === anno && data.getUTCMonth() === mese - 1 && data.getUTCDate() === giorno;
}

const eMezzo = (valore: unknown): valore is Mezzo => (ORDINE_MEZZI as readonly unknown[]).includes(valore);

const eMinuti = (valore: unknown): valore is number =>
  typeof valore === "number" && Number.isInteger(valore) && valore >= 0;

const eCondizione = (valore: unknown): valore is CondizioneMeteo =>
  (CONDIZIONI_METEO as readonly unknown[]).includes(valore);

/** Controlla data, inizio e fine di un intervallo (previsione o chiusura); `inizio` deve precedere `fine`. */
function controllaIntervallo(voce: Oggetto, dove: string, errori: string[]): void {
  if (!eData(voce["data"])) errori.push(`${dove}: data non valida (formato AAAA-MM-GG)`);
  const inizioValido = eOrario(voce["inizio"]) && voce["inizio"] !== "24:00";
  if (!inizioValido) errori.push(`${dove}: inizio non valido (formato HH:mm)`);
  const fineValida = eOrario(voce["fine"]);
  if (!fineValida) errori.push(`${dove}: fine non valida (formato HH:mm, 24:00 ammesso)`);
  if (inizioValido && fineValida && String(voce["inizio"]) >= String(voce["fine"])) {
    errori.push(`${dove}: la fine deve essere successiva all'inizio`);
  }
}

function leggiTempi(voci: unknown[], errori: string[]): TempoPercorrenza[] {
  const tempi: TempoPercorrenza[] = [];
  const visti = new Map<string, TempoPercorrenza>();
  voci.forEach((voce, indice) => {
    const dove = `tempiPercorrenza[${indice}]`;
    if (!eOggetto(voce)) {
      errori.push(`${dove}: deve essere un oggetto`);
      return;
    }
    const { da, a, mezzo, minuti } = voce;
    if (!eTestoNonVuoto(da)) errori.push(`${dove}: luogo di partenza mancante`);
    if (!eTestoNonVuoto(a)) errori.push(`${dove}: luogo di arrivo mancante`);
    if (!eMezzo(mezzo)) errori.push(`${dove}: mezzo non valido (${ORDINE_MEZZI.join(", ")})`);
    if (!eMinuti(minuti)) errori.push(`${dove}: i minuti devono essere un intero maggiore o uguale a zero`);
    if (!eTestoNonVuoto(da) || !eTestoNonVuoto(a) || !eMezzo(mezzo) || !eMinuti(minuti)) return;
    const tempo: TempoPercorrenza = { da, a, mezzo, minuti };
    // I tempi valgono nei due sensi: la stessa coppia e lo stesso mezzo non possono avere minuti diversi.
    const chiave = JSON.stringify([...[da, a].sort(), mezzo]);
    const precedente = visti.get(chiave);
    if (precedente && precedente.minuti !== tempo.minuti) {
      errori.push(
        `${dove}: tempi discordanti tra ${da} e ${a} con il mezzo ${mezzo} (${precedente.minuti} e ${tempo.minuti} minuti)`,
      );
      return;
    }
    if (!precedente) visti.set(chiave, tempo);
    tempi.push(tempo);
  });
  return tempi;
}

function leggiPrevisioni(voci: unknown[], errori: string[]): PrevisioneMeteo[] {
  const previsioni: PrevisioneMeteo[] = [];
  voci.forEach((voce, indice) => {
    const dove = `previsioni[${indice}]`;
    if (!eOggetto(voce)) {
      errori.push(`${dove}: deve essere un oggetto`);
      return;
    }
    const prima = errori.length;
    if (!eTestoNonVuoto(voce["zonaId"])) errori.push(`${dove}: zona mancante`);
    controllaIntervallo(voce, dove, errori);
    if (!eCondizione(voce["condizione"])) errori.push(`${dove}: condizione non valida (${CONDIZIONI_METEO.join(", ")})`);
    if (errori.length > prima) return;
    previsioni.push({
      zonaId: voce["zonaId"] as string,
      data: voce["data"] as string,
      inizio: voce["inizio"] as string,
      fine: voce["fine"] as string,
      condizione: voce["condizione"] as CondizioneMeteo,
    });
  });
  return previsioni;
}

function leggiChiusure(voci: unknown[], errori: string[]): ChiusuraStraordinaria[] {
  const chiusure: ChiusuraStraordinaria[] = [];
  voci.forEach((voce, indice) => {
    const dove = `chiusure[${indice}]`;
    if (!eOggetto(voce)) {
      errori.push(`${dove}: deve essere un oggetto`);
      return;
    }
    const prima = errori.length;
    if (!eTestoNonVuoto(voce["luogoId"])) errori.push(`${dove}: luogo mancante`);
    controllaIntervallo(voce, dove, errori);
    if (errori.length > prima) return;
    chiusure.push({
      luogoId: voce["luogoId"] as string,
      data: voce["data"] as string,
      inizio: voce["inizio"] as string,
      fine: voce["fine"] as string,
    });
  });
  return chiusure;
}

/**
 * Valida i dati di contesto e ne restituisce una copia con i soli campi del modello.
 * @throws ErroreDatiContesto con tutti i difetti trovati, non solo il primo.
 */
export function validaDatiContesto(dati: unknown): DatiContesto {
  if (!eOggetto(dati)) {
    throw new ErroreDatiContesto(["il contenuto deve essere un oggetto con tempiPercorrenza, previsioni e chiusure"]);
  }
  const errori: string[] = [];
  const elenco = (chiave: keyof DatiContesto): unknown[] => {
    const valore = dati[chiave];
    if (Array.isArray(valore)) return valore;
    errori.push(`${chiave}: deve essere un elenco`);
    return [];
  };
  const tempiPercorrenza = leggiTempi(elenco("tempiPercorrenza"), errori);
  const previsioni = leggiPrevisioni(elenco("previsioni"), errori);
  const chiusure = leggiChiusure(elenco("chiusure"), errori);
  if (errori.length > 0) throw new ErroreDatiContesto(errori);
  return { tempiPercorrenza, previsioni, chiusure };
}
