/**
 * Valori ammessi, orari e date (modello-dominio.md §2, §2.5; REQ-ITIN-001 R-2, R-3, R-8).
 * Tutto è calcolato sui testi: nessun orologio, nessun fuso, nessuna dipendenza dalla lingua del sistema.
 */
import {
  ORDINE_MEZZI,
  type Categoria,
  type CategoriaAggiunta,
  type CondizioneMeteo,
  type Costo,
  type Elemento,
  type GiornoSettimana,
  type Intensita,
  type OpzioneAlimentare,
  type OrigineLuogo,
  type Priorita,
  type StileViaggio,
  type TipoLuogo,
  type TipoLuogoAggiunto,
} from "../model/index.js";
import { creaErrore, type ErroreValidazione } from "./errori.js";

export const TIPI_ELEMENTO = ["attivita", "spostamento"] as const satisfies readonly Elemento["tipo"][];
export const PRIORITA = ["irrinunciabile", "desiderata", "opzionale"] as const satisfies readonly Priorita[];
export const TIPI_LUOGO = [
  "alloggio",
  "ristorante",
  "museo",
  "sentiero",
  "cantina",
  "aeroporto",
  "stazione",
  "altro",
] as const satisfies readonly TipoLuogo[];
export const CATEGORIE = ["natura", "cultura", "gastronomia", "pasto"] as const satisfies readonly Categoria[];
export const CONDIZIONI_METEO = [
  "sereno",
  "nuvoloso",
  "pioggia",
  "temporale",
  "neve",
] as const satisfies readonly CondizioneMeteo[];
export const GIORNI_SETTIMANA = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"] as const satisfies readonly GiornoSettimana[];

// Valori aggiunti dall'ondata 2 (modello-dominio-estensioni.md §7.2, §7.3)

export const TIPI_LUOGO_AGGIUNTI = [
  "spiaggia",
  "punto_panoramico",
  "parco",
  "impianto",
  "negozio",
  "farmacia",
  "ospedale",
] as const satisfies readonly TipoLuogoAggiunto[];
/** Tipi di luogo ammessi nel catalogo esteso: quelli dell'ondata 1 più quelli della §7.3. */
export const TIPI_LUOGO_ESTESI = [...TIPI_LUOGO, ...TIPI_LUOGO_AGGIUNTI] as const;
export const CATEGORIE_AGGIUNTE = ["servizio"] as const satisfies readonly CategoriaAggiunta[];
/** Categorie ammesse nel catalogo esteso: quelle dell'ondata 1 più `servizio`. */
export const CATEGORIE_ESTESE = [...CATEGORIE, ...CATEGORIE_AGGIUNTE] as const;
/** Gli stili di viaggio nell'ordine canonico della §7.2. */
export const STILI_VIAGGIO = [
  "relax",
  "cultura",
  "natura",
  "avventura",
  "gastronomia",
  "romantico",
  "famiglia",
] as const satisfies readonly StileViaggio[];
/** Le intensità dalla più leggera alla più faticosa. */
export const INTENSITA = ["facile", "moderata", "impegnativa"] as const satisfies readonly Intensita[];
/** I costi dal più basso al più alto. */
export const COSTI = ["gratis", "€", "€€", "€€€"] as const satisfies readonly Costo[];
export const OPZIONI_ALIMENTARI = ["vegetariano", "senza_glutine"] as const satisfies readonly OpzioneAlimentare[];
export const ORIGINI_LUOGO = ["riferimento", "osm"] as const satisfies readonly OrigineLuogo[];

/** Priorità di un'attività quando il JSON non la indica. */
export const PRIORITA_PREDEFINITA: Priorita = "desiderata";

/** Valori ammessi per i campi a scelta chiusa (R-8). */
export const VALORI_AMMESSI = {
  tipoElemento: TIPI_ELEMENTO,
  mezzo: ORDINE_MEZZI,
  priorita: PRIORITA,
  tipoLuogo: TIPI_LUOGO,
  categoria: CATEGORIE,
  condizioneMeteo: CONDIZIONI_METEO,
  giornoSettimana: GIORNI_SETTIMANA,
  tipoLuogoEsteso: TIPI_LUOGO_ESTESI,
  categoriaEstesa: CATEGORIE_ESTESE,
  stile: STILI_VIAGGIO,
  intensita: INTENSITA,
  costo: COSTI,
  opzioneAlimentare: OPZIONI_ALIMENTARI,
  origineLuogo: ORIGINI_LUOGO,
} as const;

// Orari `HH:mm`: due cifre per le ore, minuti da 00 a 59 (R-2). Oltre 24:00 è FUORI_GIORNATA (R-3).

const FORMATO_ORARIO = /^(\d{2}):([0-5]\d)$/;

/** Minuti di `24:00`, la fine della giornata. */
export const FINE_GIORNATA = 24 * 60;

/** Minuti dalla mezzanotte, oppure `null` se il testo non è nel formato `HH:mm`. Non controlla il limite delle 24:00. */
export function minutiDaOrario(testo: string): number | null {
  const parti = FORMATO_ORARIO.exec(testo);
  if (parti === null) return null;
  return Number(parti[1]) * 60 + Number(parti[2]);
}

// Date `AAAA-MM-GG`, convertite in numero di giorni (calendario gregoriano) per confronti e intervalli.

const FORMATO_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

function bisestile(anno: number): boolean {
  return (anno % 4 === 0 && anno % 100 !== 0) || anno % 400 === 0;
}

function giorniDelMese(anno: number, mese: number): number {
  if (mese === 2) return bisestile(anno) ? 29 : 28;
  return [4, 6, 9, 11].includes(mese) ? 30 : 31;
}

/** Numero del giorno (giorni dal 1970-01-01), oppure `null` se il testo non è una data `AAAA-MM-GG` esistente. */
export function numeroDaData(testo: string): number | null {
  const parti = FORMATO_DATA.exec(testo);
  if (parti === null) return null;
  const anno = Number(parti[1]);
  const mese = Number(parti[2]);
  const giorno = Number(parti[3]);
  if (mese < 1 || mese > 12 || giorno < 1 || giorno > giorniDelMese(anno, mese)) return null;
  // Algoritmo "days from civil" (anno che inizia a marzo, ere di 400 anni).
  const a = mese <= 2 ? anno - 1 : anno;
  const era = Math.floor(a / 400);
  const annoEra = a - era * 400;
  const meseDaMarzo = (mese + 9) % 12;
  const giornoAnno = Math.floor((153 * meseDaMarzo + 2) / 5) + giorno - 1;
  const giornoEra = annoEra * 365 + Math.floor(annoEra / 4) - Math.floor(annoEra / 100) + giornoAnno;
  return era * 146097 + giornoEra - 719468;
}

/** La data `AAAA-MM-GG` corrispondente a un numero di giorno (inverso di `numeroDaData`). */
export function dataDaNumero(numero: number): string {
  const z = numero + 719468;
  const era = Math.floor(z / 146097);
  const giornoEra = z - era * 146097;
  const annoEra = Math.floor(
    (giornoEra - Math.floor(giornoEra / 1460) + Math.floor(giornoEra / 36524) - Math.floor(giornoEra / 146096)) / 365,
  );
  const giornoAnno = giornoEra - (365 * annoEra + Math.floor(annoEra / 4) - Math.floor(annoEra / 100));
  const meseDaMarzo = Math.floor((5 * giornoAnno + 2) / 153);
  const giorno = giornoAnno - Math.floor((153 * meseDaMarzo + 2) / 5) + 1;
  const mese = meseDaMarzo < 10 ? meseDaMarzo + 3 : meseDaMarzo - 9;
  const anno = annoEra + era * 400 + (mese <= 2 ? 1 : 0);
  const due = (n: number): string => String(n).padStart(2, "0");
  return `${String(anno).padStart(4, "0")}-${due(mese)}-${due(giorno)}`;
}

/** Descrizione breve di un valore qualsiasi per i messaggi; non solleva eccezioni. */
export function descrivi(valore: unknown): string {
  if (typeof valore === "string") return `"${valore}"`;
  if (typeof valore === "number" || typeof valore === "boolean" || typeof valore === "bigint") return String(valore);
  if (valore === null) return "null";
  if (Array.isArray(valore)) return "un elenco";
  if (typeof valore === "object") return "un oggetto";
  return typeof valore;
}

/**
 * Controlla una condizione meteo (R-8). Le condizioni non fanno parte di viaggio e catalogo:
 * servono a chi legge previsioni e imprevisti (dati di contesto). Restituisce gli errori, vuoto se valida.
 */
export function controllaCondizioneMeteo(valore: unknown, id: string, percorso = "condizione"): ErroreValidazione[] {
  if (valore === undefined || valore === null || valore === "") {
    return [creaErrore("CAMPO_MANCANTE", id, percorso, `manca il campo obbligatorio "${percorso}"`)];
  }
  if (typeof valore === "string" && (CONDIZIONI_METEO as readonly string[]).includes(valore)) return [];
  return [
    creaErrore(
      "VALORE_NON_VALIDO",
      id,
      percorso,
      `la condizione meteo ${descrivi(valore)} non è ammessa (valori ammessi: ${CONDIZIONI_METEO.join(", ")})`,
    ),
  ];
}
