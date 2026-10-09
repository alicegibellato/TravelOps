/**
 * Regole deterministiche che trasformano un luogo reale di OpenStreetMap in un luogo e, se la tabella lo
 * prevede, in un'attività del catalogo esteso (REQ-CAT-001). Le regole stanno in `tabella.ts`: qui c'è solo
 * il codice che le applica. Nessuna rete, nessun orologio, nessuna eccezione sui dati ricevuti.
 */
import type {
  AttivitaCatalogoEstesa,
  Coordinate,
  Costo,
  FasciaOraria,
  GiornoSettimana,
  Intensita,
  LuogoEsteso,
  OpzioneAlimentare,
  OrariApertura,
  TipoLuogoEsteso,
} from "../model/index.js";
import { INTENSITA } from "../itinerary/valori.js";
import { leggiOrariOsm } from "./orari-osm.js";
import {
  ORARI_PREDEFINITI,
  REGOLE_PREZZO,
  REGOLE_SENTIERI,
  TABELLA_CLASSIFICAZIONE,
  type RegolaAttivita,
  type RegolaClassificazione,
} from "./tabella.js";

/**
 * Un elemento OpenStreetMap come lo restituisce Overpass (`type`, `id`, `tags`, coordinate o `center`),
 * con due misure facoltative calcolate da chi costruisce la destinazione per i percorsi escursionistici.
 */
export interface ElementoOsm {
  type: "node" | "way" | "relation";
  id: number;
  tags?: Readonly<Record<string, string>>;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  /** Lunghezza del percorso in chilometri; se manca vale il tag `distance`. */
  lunghezzaKm?: number;
  /** Dislivello in salita in metri; se manca vale il tag `ascent`. */
  dislivelloM?: number;
}

/** Esito della classificazione: la riga applicata, il luogo e l'eventuale attività di catalogo. */
export interface LuogoClassificato {
  regola: string;
  luogo: LuogoEsteso;
  attivita: AttivitaCatalogoEstesa | null;
}

/** Orari di apertura di un luogo e se sono verificati (vengono da `opening_hours`) o predefiniti. */
export interface OrariLuogo {
  apertura: OrariApertura;
  orariVerificati: boolean;
}

type Tag = Readonly<Record<string, string>>;

const rispetta = (tag: Tag, regola: RegolaClassificazione): boolean =>
  regola.quando.some(({ chiave, valori }) => {
    const valore = tag[chiave];
    if (typeof valore !== "string" || valore.trim() === "") return false;
    return valori === "qualsiasi" || valori.includes(valore.trim());
  });

/** La prima riga della tabella che i tag rispettano, oppure `null` se il luogo non si classifica. */
export function regolaPerTag(tag: Tag): RegolaClassificazione | null {
  return TABELLA_CLASSIFICAZIONE.find((regola) => rispetta(tag, regola)) ?? null;
}

function copiaOrari(orari: OrariApertura): OrariApertura {
  if ("sempre" in orari) return { sempre: true };
  const voci = Object.entries(orari.settimana).map(([g, fasce]) => [g, fasce.map((f) => ({ ...f }))]);
  return { settimana: Object.fromEntries(voci) as Record<GiornoSettimana, FasciaOraria[]> };
}

/**
 * Gli orari di un luogo: dal tag `opening_hours` se c'è e si legge (verificati), altrimenti gli orari
 * predefiniti per il tipo di luogo (non verificati). Un orario non leggibile non è mai un errore.
 */
export function orariDelLuogo(tag: Tag, tipo: TipoLuogoEsteso): OrariLuogo {
  const testo = tag["opening_hours"];
  const letti = typeof testo === "string" ? leggiOrariOsm(testo) : null;
  if (letti !== null) return { apertura: letti, orariVerificati: true };
  return { apertura: copiaOrari(ORARI_PREDEFINITI[tipo]), orariVerificati: false };
}

// --- Misure e valori ricavati dai tag ---------------------------------------------------------------

const NUMERO = String.raw`(\d+(?:[.,]\d+)?)`;
const numero = (testo: string): number => Number(testo.replace(",", "."));

/** Lunghezza in km da un tag `distance` (`12`, `12.5 km`, `800 m`); `null` se non si legge. */
function chilometri(testo: string | undefined): number | null {
  const parti = testo === undefined ? null : new RegExp(`^${NUMERO}\\s*(km|m)?$`, "i").exec(testo.trim());
  if (parti === null || parti[1] === undefined) return null;
  const valore = numero(parti[1]);
  return parti[2]?.toLowerCase() === "m" ? valore / 1000 : valore;
}

/** Dislivello in metri da un tag `ascent` (`450`, `450 m`); `null` se non si legge. */
function metri(testo: string | undefined): number | null {
  const parti = testo === undefined ? null : new RegExp(`^${NUMERO}\\s*m?$`, "i").exec(testo.trim());
  return parti === null || parti[1] === undefined ? null : numero(parti[1]);
}

const misuraValida = (valore: number | undefined): valore is number =>
  typeof valore === "number" && Number.isFinite(valore) && valore >= 0;

/** L'intensità più alta tra quelle indicate. */
const piuAlta = (a: Intensita, b: Intensita): Intensita => (INTENSITA.indexOf(a) >= INTENSITA.indexOf(b) ? a : b);

function intensitaPerMisura(misura: number, campo: "kmMassimi" | "dislivelloMassimo"): Intensita {
  return REGOLE_SENTIERI.soglie.find((soglia) => misura <= soglia[campo])?.intensita ?? REGOLE_SENTIERI.oltreLeSoglie;
}

/** Intensità di un sentiero secondo lunghezza e dislivello (`REGOLE_SENTIERI`). */
export function intensitaSentiero(km: number | null, dislivello: number | null): Intensita {
  const livelli: Intensita[] = [];
  if (km !== null) livelli.push(intensitaPerMisura(km, "kmMassimi"));
  if (dislivello !== null) livelli.push(intensitaPerMisura(dislivello, "dislivelloMassimo"));
  return livelli.reduce<Intensita | null>((max, l) => (max === null ? l : piuAlta(max, l)), null) ??
    REGOLE_SENTIERI.intensitaSenzaMisure;
}

/** Durata tipica di un sentiero secondo la lunghezza (`REGOLE_SENTIERI`). */
export function durataSentiero(km: number | null): number {
  if (km === null) return REGOLE_SENTIERI.durataSenzaLunghezza;
  const { minutiPerKm, arrotondamento, durataMinima } = REGOLE_SENTIERI;
  return Math.max(durataMinima, Math.ceil((km * minutiPerKm) / arrotondamento) * arrotondamento);
}

/** Costo di un ristorante dal tag `price` (`REGOLE_PREZZO`); assente o non riconosciuto vale il predefinito. */
export function costoDaPrezzo(prezzo: string | undefined): Costo {
  if (prezzo === undefined) return REGOLE_PREZZO.predefinito;
  const testo = prezzo.trim().toLowerCase();
  if (/^[€$£]{1,}$/.test(testo)) return (["€", "€€", "€€€"] as const)[Math.min(testo.length, 3) - 1] ?? "€€€";
  const parole: Readonly<Record<string, Costo>> = REGOLE_PREZZO.parole;
  if (Object.hasOwn(parole, testo)) return parole[testo] ?? REGOLE_PREZZO.predefinito;
  const valuta = String.raw`(?:€|eur|euro|\$|usd|£|gbp)`;
  const importo = new RegExp(
    `^(?:${valuta}\\s*)?${NUMERO}(?:\\s*[-–]\\s*(?:${valuta}\\s*)?${NUMERO})?\\s*${valuta}?$`,
  ).exec(testo);
  if (importo === null || importo[1] === undefined) return REGOLE_PREZZO.predefinito;
  const minimo = numero(importo[1]);
  const medio = importo[2] === undefined ? minimo : (minimo + numero(importo[2])) / 2;
  return REGOLE_PREZZO.soglieImporto.find((soglia) => medio <= soglia.fino)?.costo ?? REGOLE_PREZZO.oltreLeSoglie;
}

/** Accessibilità dal tag `wheelchair`, oppure il valore della tabella se il tag manca o non è riconosciuto. */
function accessibile(tag: Tag, senzaTag: boolean): boolean {
  const valore = tag["wheelchair"]?.trim();
  if (valore === "yes" || valore === "designated") return true;
  if (valore === "no" || valore === "limited") return false;
  return senzaTag;
}

/** Opzioni alimentari dai tag `diet:vegetarian` e `diet:gluten_free` (`yes` oppure `only`). */
function opzioniAlimentari(tag: Tag): OpzioneAlimentare[] {
  const offre = (chiave: string): boolean => ["yes", "only"].includes(tag[chiave]?.trim() ?? "");
  const opzioni: OpzioneAlimentare[] = [];
  if (offre("diet:vegetarian")) opzioni.push("vegetariano");
  if (offre("diet:gluten_free")) opzioni.push("senza_glutine");
  return opzioni;
}

function coordinate(elemento: ElementoOsm): Coordinate | undefined {
  const fonte =
    typeof elemento.lat === "number" && typeof elemento.lon === "number"
      ? { lat: elemento.lat, lon: elemento.lon }
      : elemento.center;
  if (fonte === undefined) return undefined;
  const { lat, lon } = fonte;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return undefined;
  return { lat, lon };
}

function nomeDelLuogo(tag: Tag, regola: RegolaClassificazione): string {
  for (const chiave of ["name:it", "name"]) {
    const nome = tag[chiave]?.trim();
    if (nome !== undefined && nome !== "") return nome;
  }
  return regola.nomePredefinito;
}

/** Identificativi del catalogo: `OSM-NODE-123` per il luogo, `A-OSM-NODE-123` per la sua attività. */
export const idLuogoOsm = (elemento: Pick<ElementoOsm, "type" | "id">): string =>
  `OSM-${elemento.type.toUpperCase()}-${elemento.id}`;

function costruisciAttivita(
  regola: RegolaAttivita,
  elemento: ElementoOsm,
  tag: Tag,
  luogo: LuogoEsteso,
): AttivitaCatalogoEstesa {
  const km = misuraValida(elemento.lunghezzaKm) ? elemento.lunghezzaKm : chilometri(tag["distance"]);
  const dislivello = misuraValida(elemento.dislivelloM) ? elemento.dislivelloM : metri(tag["ascent"]);
  const intensita = regola.intensita === "secondo_lunghezza_e_dislivello" ? intensitaSentiero(km, dislivello) : regola.intensita;
  const durataTipica = regola.durataTipica === "secondo_lunghezza" ? durataSentiero(km) : regola.durataTipica;
  const costo = regola.costo === "secondo_price" ? costoDaPrezzo(tag["price"]) : regola.costo;
  const adattaAiBambini =
    regola.adattaAiBambini === "se_non_impegnativa" ? intensita !== "impegnativa" : regola.adattaAiBambini;
  return {
    id: `A-${luogo.id}`,
    nome: regola.nome.replace("{nome}", luogo.nome),
    luogoId: luogo.id,
    categoria: regola.categoria,
    allAperto: regola.allAperto,
    durataTipica,
    stili: [...regola.stili],
    intensita,
    costo,
    adattaAiBambini,
    accessibile: accessibile(tag, regola.accessibileSenzaTag),
  };
}

const TIPI_ELEMENTO_OSM: readonly string[] = ["node", "way", "relation"];

/**
 * Classifica un luogo reale di OpenStreetMap con la tabella di classificazione.
 *
 * @param elemento l'elemento OSM (come lo restituisce Overpass), con tag e coordinate.
 * @param zonaId la zona del catalogo in cui mettere il luogo.
 * @returns la riga applicata, il luogo (origine `osm`, orari verificati o predefiniti) e l'attività di
 *   catalogo (o `null` per i luoghi di servizio); `null` se nessuna riga si applica o l'elemento non è valido.
 */
export function classificaLuogoOsm(elemento: ElementoOsm, zonaId: string): LuogoClassificato | null {
  if (
    typeof elemento !== "object" ||
    elemento === null ||
    !TIPI_ELEMENTO_OSM.includes(elemento.type) ||
    !Number.isSafeInteger(elemento.id) ||
    elemento.id < 1
  ) {
    return null;
  }
  const tag: Tag = typeof elemento.tags === "object" && elemento.tags !== null ? elemento.tags : {};
  const regola = regolaPerTag(tag);
  if (regola === null) return null;

  const posizione = coordinate(elemento);
  const orari = orariDelLuogo(tag, regola.tipoLuogo);
  const costoIndicativo = regola.attivita?.costo === "secondo_price" ? costoDaPrezzo(tag["price"]) : undefined;
  const opzioni = opzioniAlimentari(tag);
  const luogo: LuogoEsteso = {
    id: idLuogoOsm(elemento),
    nome: nomeDelLuogo(tag, regola),
    zonaId,
    tipo: regola.tipoLuogo,
    apertura: orari.apertura,
    ...(posizione !== undefined ? { coordinate: posizione } : {}),
    ...(costoIndicativo !== undefined ? { costoIndicativo } : {}),
    ...(opzioni.length > 0 ? { opzioniAlimentari: opzioni } : {}),
    origine: "osm",
    osmId: `${elemento.type}/${elemento.id}`,
    orariVerificati: orari.orariVerificati,
  };
  const attivita = regola.attivita === null ? null : costruisciAttivita(regola.attivita, elemento, tag, luogo);
  return { regola: regola.id, luogo, attivita };
}
