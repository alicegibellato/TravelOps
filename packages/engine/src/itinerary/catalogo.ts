/**
 * Catalogo: caricamento con le regole di validità (REQ-ITIN-001) e interrogazione (CA-5), più i campi e i
 * valori del catalogo esteso (REQ-CAT-001, `modello-dominio-estensioni.md` §7.3).
 */
import type {
  AttivitaCatalogoEstesa,
  CampiAttivitaEstesi,
  CampiLuogoEstesi,
  Catalogo,
  CatalogoEsteso,
  CategoriaEstesa,
  FasciaOraria,
  GiornoSettimana,
  Immagine,
  LuogoEsteso,
  OrariApertura,
  TipoLuogoEsteso,
  Zona,
} from "../model/index.js";
import type { RisultatoCaricamento } from "./errori.js";
import {
  CATEGORIE,
  CATEGORIE_ESTESE,
  COSTI,
  descrivi,
  GIORNI_SETTIMANA,
  INTENSITA,
  OPZIONI_ALIMENTARI,
  ORIGINI_LUOGO,
  STILI_VIAGGIO,
  TIPI_LUOGO,
  TIPI_LUOGO_ESTESI,
} from "./valori.js";
import {
  campo,
  decodifica,
  eOggetto,
  eseguiCaricamento,
  percorso,
  Verifica,
  type Oggetto,
  type Posizione,
} from "./verifica.js";

const RADICE = "catalogo";

/** Valori ammessi per tipo di luogo e categoria: quelli dell'ondata 1 oppure quelli estesi della §7.3. */
interface ValoriCatalogo<T extends TipoLuogoEsteso, C extends CategoriaEstesa> {
  tipiLuogo: readonly T[];
  categorie: readonly C[];
}

/** Un catalogo i cui luoghi e attività hanno tipi e categorie in `T` e `C`. */
interface CatalogoDi<T extends TipoLuogoEsteso, C extends CategoriaEstesa> {
  zone: Zona[];
  luoghi: (Omit<LuogoEsteso, "tipo"> & { tipo: T })[];
  attivita: (Omit<AttivitaCatalogoEstesa, "categoria"> & { categoria: C })[];
}

const VALORI_ONDATA_1 = { tipiLuogo: TIPI_LUOGO, categorie: CATEGORIE };
const VALORI_ESTESI = { tipiLuogo: TIPI_LUOGO_ESTESI, categorie: CATEGORIE_ESTESE };

/**
 * Carica il catalogo dal JSON già letto (testo o valore decodificato).
 * Restituisce il catalogo oppure tutti gli errori trovati; non solleva eccezioni.
 * Tipi di luogo e categorie sono quelli dell'ondata 1 (R-8); i campi facoltativi della §7.3 sono ammessi
 * e validati. Per i tipi di luogo e la categoria aggiunti dalla §7.3 serve `caricaCatalogoEsteso`.
 */
export function caricaCatalogo(json: unknown): RisultatoCaricamento<Catalogo> {
  return carica(json, VALORI_ONDATA_1);
}

/**
 * Carica un catalogo esteso (REQ-CAT-001): come `caricaCatalogo`, ma ammette anche i tipi di luogo e la
 * categoria aggiunti dalla §7.3. Un catalogo dell'ondata 1 si carica identico con entrambe le funzioni.
 */
export function caricaCatalogoEsteso(json: unknown): RisultatoCaricamento<CatalogoEsteso> {
  return carica(json, VALORI_ESTESI);
}

function carica<T extends TipoLuogoEsteso, C extends CategoriaEstesa>(
  json: unknown,
  valori: ValoriCatalogo<T, C>,
): RisultatoCaricamento<CatalogoDi<T, C>> {
  return eseguiCaricamento(RADICE, (verifica) => {
    const decodificato = decodifica(json, RADICE, verifica);
    return decodificato === null ? null : analizzaCatalogo(decodificato.dati, verifica, valori);
  });
}

/** Gli `id` delle voci del catalogo, divisi per tipo; letti in modo difensivo da qualunque valore. */
export interface IdCatalogo {
  zone: ReadonlySet<string>;
  luoghi: ReadonlySet<string>;
  attivita: ReadonlySet<string>;
}

export function idDelCatalogo(catalogo: unknown): IdCatalogo {
  const ids = (voci: unknown): Set<string> => {
    const trovati = new Set<string>();
    if (!Array.isArray(voci)) return trovati;
    for (const voce of voci) {
      const id = eOggetto(voce) ? campo(voce, "id") : undefined;
      if (typeof id === "string") trovati.add(id);
    }
    return trovati;
  };
  if (!eOggetto(catalogo)) return { zone: new Set(), luoghi: new Set(), attivita: new Set() };
  return { zone: ids(campo(catalogo, "zone")), luoghi: ids(campo(catalogo, "luoghi")), attivita: ids(campo(catalogo, "attivita")) };
}

function analizzaCatalogo<T extends TipoLuogoEsteso, C extends CategoriaEstesa>(
  dati: unknown,
  verifica: Verifica,
  valori: ValoriCatalogo<T, C>,
): CatalogoDi<T, C> | null {
  if (!eOggetto(dati)) {
    verifica.segnala(
      "VALORE_NON_VALIDO",
      RADICE,
      "",
      `il catalogo deve essere un oggetto con zone, luoghi e attivita (valore trovato: ${descrivi(dati)})`,
    );
    return null;
  }
  const pos: Posizione = { id: RADICE, base: "" };
  const zoneGrezze = verifica.elenco(dati, "zone", pos);
  const luoghiGrezzi = verifica.elenco(dati, "luoghi", pos);
  const attivitaGrezze = verifica.elenco(dati, "attivita", pos);

  // Gli id sono unici in tutto il catalogo, così un id indica una sola voce (CA-5).
  const idUsati = new Map<string, string>();
  const registra = (id: string, dove: string, descrizione: string): void => {
    const primo = idUsati.get(id);
    if (primo !== undefined) {
      verifica.segnala("ID_DUPLICATO", id, percorso(dove, "id"), `l'id "${id}" di ${descrizione} è già usato nel catalogo (${primo})`);
    } else {
      idUsati.set(id, dove);
    }
  };

  const zone: Zona[] = [];
  const idZone = new Set<string>();
  zoneGrezze?.forEach((grezza, i) => {
    const zona = leggiZona(grezza, percorso("zone", i), verifica, registra, idZone);
    if (zona !== undefined) zone.push(zona);
  });

  const luoghi: CatalogoDi<T, C>["luoghi"] = [];
  const idLuoghi = new Set<string>();
  luoghiGrezzi?.forEach((grezzo, i) => {
    const zoneNote = zoneGrezze === undefined ? undefined : idZone;
    const luogo = leggiLuogo(grezzo, percorso("luoghi", i), verifica, registra, idLuoghi, zoneNote, valori.tipiLuogo);
    if (luogo !== undefined) luoghi.push(luogo);
  });

  const attivita: CatalogoDi<T, C>["attivita"] = [];
  attivitaGrezze?.forEach((grezza, i) => {
    const luoghiNoti = luoghiGrezzi === undefined ? undefined : idLuoghi;
    const voce = leggiAttivita(grezza, percorso("attivita", i), verifica, registra, luoghiNoti, valori.categorie);
    if (voce !== undefined) attivita.push(voce);
  });

  if (verifica.errori.length > 0) return null;
  return { zone, luoghi, attivita };
}

type Registra = (id: string, dove: string, descrizione: string) => void;

/** Posizione di una voce: il suo `id` se c'è, altrimenti la posizione nel JSON. */
function posizioneVoce(grezza: Oggetto, base: string): Posizione {
  const id = campo(grezza, "id");
  return { id: typeof id === "string" && id.trim() !== "" ? id : base, base };
}

function voceNonOggetto(verifica: Verifica, base: string, cosa: string, valore: unknown): void {
  verifica.segnala("VALORE_NON_VALIDO", base, base, `${cosa} deve essere un oggetto (valore trovato: ${descrivi(valore)})`);
}

function leggiZona(
  grezza: unknown,
  base: string,
  verifica: Verifica,
  registra: Registra,
  idZone: Set<string>,
): Zona | undefined {
  if (!eOggetto(grezza)) {
    voceNonOggetto(verifica, base, "la zona", grezza);
    return undefined;
  }
  const errori = verifica.errori.length;
  const pos = posizioneVoce(grezza, base);
  const id = verifica.testo(grezza, "id", pos);
  if (id !== undefined) {
    registra(id, base, "una zona");
    idZone.add(id);
  }
  const nome = verifica.testo(grezza, "nome", pos);
  const coordinate = verifica.coordinate(grezza, "coordinate", pos);
  if (verifica.errori.length > errori || id === undefined || nome === undefined) return undefined;
  return { id, nome, ...(coordinate !== undefined ? { coordinate } : {}) };
}

function leggiLuogo<T extends TipoLuogoEsteso>(
  grezzo: unknown,
  base: string,
  verifica: Verifica,
  registra: Registra,
  idLuoghi: Set<string>,
  zoneNote: ReadonlySet<string> | undefined,
  tipiLuogo: readonly T[],
): (Omit<LuogoEsteso, "tipo"> & { tipo: T }) | undefined {
  if (!eOggetto(grezzo)) {
    voceNonOggetto(verifica, base, "il luogo", grezzo);
    return undefined;
  }
  const errori = verifica.errori.length;
  const pos = posizioneVoce(grezzo, base);
  const id = verifica.testo(grezzo, "id", pos);
  if (id !== undefined) {
    registra(id, base, "un luogo");
    idLuoghi.add(id);
  }
  const nome = verifica.testo(grezzo, "nome", pos);
  const zonaId = verifica.testo(grezzo, "zonaId", pos);
  if (zonaId !== undefined && zoneNote !== undefined && !zoneNote.has(zonaId)) {
    verifica.segnala(
      "RIFERIMENTO_INESISTENTE",
      pos.id,
      percorso(base, "zonaId"),
      `la zona "${zonaId}" non esiste nel catalogo`,
    );
  }
  const tipo = verifica.scelta(grezzo, "tipo", tipiLuogo, pos);
  const apertura = leggiApertura(grezzo, pos, verifica);
  const coordinate = verifica.coordinate(grezzo, "coordinate", pos);
  const estesi = leggiCampiLuogo(grezzo, pos, verifica);
  if (
    verifica.errori.length > errori ||
    id === undefined ||
    nome === undefined ||
    zonaId === undefined ||
    tipo === undefined ||
    apertura === undefined
  ) {
    return undefined;
  }
  return { id, nome, zonaId, tipo, apertura, ...(coordinate !== undefined ? { coordinate } : {}), ...estesi };
}

/** Orari di apertura: `{ sempre: true }` oppure fasce per ciascun giorno della settimana (nessuna fascia = chiuso). */
function leggiApertura(luogo: Oggetto, pos: Posizione, verifica: Verifica): OrariApertura | undefined {
  const valore = campo(luogo, "apertura");
  const base = percorso(pos.base, "apertura");
  if (valore === undefined) {
    verifica.segnala("CAMPO_MANCANTE", pos.id, base, `manca il campo obbligatorio "apertura"`);
    return undefined;
  }
  if (!eOggetto(valore)) {
    verifica.segnala(
      "VALORE_NON_VALIDO",
      pos.id,
      base,
      `il campo "apertura" deve essere { "sempre": true } oppure { "settimana": … } (valore trovato: ${descrivi(valore)})`,
    );
    return undefined;
  }
  if (campo(valore, "sempre") === true) return { sempre: true };
  const settimana = campo(valore, "settimana");
  const baseSettimana = percorso(base, "settimana");
  if (settimana === undefined) {
    if (campo(valore, "sempre") !== undefined) {
      verifica.segnala(
        "VALORE_NON_VALIDO",
        pos.id,
        percorso(base, "sempre"),
        `il campo "sempre" ammette solo true; per orari diversi servono le fasce in "settimana"`,
      );
    } else {
      verifica.segnala(
        "CAMPO_MANCANTE",
        pos.id,
        baseSettimana,
        `manca il campo obbligatorio "settimana" (oppure "sempre": true)`,
      );
    }
    return undefined;
  }
  if (!eOggetto(settimana)) {
    verifica.segnala(
      "VALORE_NON_VALIDO",
      pos.id,
      baseSettimana,
      `il campo "settimana" deve essere un oggetto con le fasce di ogni giorno (valore trovato: ${descrivi(settimana)})`,
    );
    return undefined;
  }
  const errori = verifica.errori.length;
  for (const giorno of Object.keys(settimana)) {
    if (!(GIORNI_SETTIMANA as readonly string[]).includes(giorno)) {
      verifica.segnala(
        "VALORE_NON_VALIDO",
        pos.id,
        percorso(baseSettimana, giorno),
        `il giorno "${giorno}" non è ammesso (valori ammessi: ${GIORNI_SETTIMANA.join(", ")})`,
      );
    }
  }
  const posSettimana: Posizione = { id: pos.id, base: baseSettimana };
  const fascePerGiorno: [GiornoSettimana, FasciaOraria[]][] = [];
  for (const giorno of GIORNI_SETTIMANA) {
    const fasceGrezze = verifica.elenco(settimana, giorno, posSettimana);
    if (fasceGrezze === undefined) continue;
    const fasce: FasciaOraria[] = [];
    fasceGrezze.forEach((grezza, i) => {
      const fascia = leggiFascia(grezza, { id: pos.id, base: percorso(percorso(baseSettimana, giorno), i) }, verifica);
      if (fascia !== undefined) fasce.push(fascia);
    });
    fascePerGiorno.push([giorno, fasce]);
  }
  if (verifica.errori.length > errori) return undefined;
  return { settimana: Object.fromEntries(fascePerGiorno) as Record<GiornoSettimana, FasciaOraria[]> };
}

function leggiFascia(grezza: unknown, pos: Posizione, verifica: Verifica): FasciaOraria | undefined {
  if (!eOggetto(grezza)) {
    verifica.segnala(
      "VALORE_NON_VALIDO",
      pos.id,
      pos.base,
      `la fascia di apertura deve essere un oggetto con apertura e chiusura (valore trovato: ${descrivi(grezza)})`,
    );
    return undefined;
  }
  const apertura = verifica.orario(grezza, "apertura", pos, "inizio");
  const chiusura = verifica.orario(grezza, "chiusura", pos, "fine");
  if (apertura === undefined || chiusura === undefined) return undefined;
  if (chiusura.minuti <= apertura.minuti) {
    verifica.segnala(
      "ORARIO_NON_VALIDO",
      pos.id,
      percorso(pos.base, "chiusura"),
      `la chiusura (${chiusura.testo}) non è successiva all'apertura (${apertura.testo})`,
    );
    return undefined;
  }
  return { apertura: apertura.testo, chiusura: chiusura.testo };
}

function leggiAttivita<C extends CategoriaEstesa>(
  grezza: unknown,
  base: string,
  verifica: Verifica,
  registra: Registra,
  luoghiNoti: ReadonlySet<string> | undefined,
  categorie: readonly C[],
): (Omit<AttivitaCatalogoEstesa, "categoria"> & { categoria: C }) | undefined {
  if (!eOggetto(grezza)) {
    voceNonOggetto(verifica, base, "l'attività", grezza);
    return undefined;
  }
  const errori = verifica.errori.length;
  const pos = posizioneVoce(grezza, base);
  const id = verifica.testo(grezza, "id", pos);
  if (id !== undefined) registra(id, base, "un'attività");
  const nome = verifica.testo(grezza, "nome", pos);
  const luogoId = verifica.testo(grezza, "luogoId", pos);
  if (luogoId !== undefined && luoghiNoti !== undefined && !luoghiNoti.has(luogoId)) {
    verifica.segnala(
      "RIFERIMENTO_INESISTENTE",
      pos.id,
      percorso(base, "luogoId"),
      `il luogo "${luogoId}" non esiste nel catalogo`,
    );
  }
  const categoria = verifica.scelta(grezza, "categoria", categorie, pos);
  const allAperto = verifica.booleano(grezza, "allAperto", pos, true);
  const durataTipica = verifica.intero(grezza, "durataTipica", pos, 1, "la durata tipica in minuti");
  const estesi = leggiCampiAttivita(grezza, pos, verifica);
  if (
    verifica.errori.length > errori ||
    id === undefined ||
    nome === undefined ||
    luogoId === undefined ||
    categoria === undefined ||
    allAperto === undefined ||
    durataTipica === undefined
  ) {
    return undefined;
  }
  return { id, nome, luogoId, categoria, allAperto, durataTipica, ...estesi };
}

// Campi facoltativi della §7.3 (REQ-CAT-001): letti solo se presenti, così un catalogo dell'ondata 1
// si carica identico. Ogni valore fuori da quelli ammessi è un `VALORE_NON_VALIDO` (R-8).

/** Identificativo OpenStreetMap: tipo dell'elemento e numero. */
const FORMATO_OSM_ID = /^(node|way|relation)\/[1-9]\d*$/;

function leggiCampiLuogo(grezzo: Oggetto, pos: Posizione, verifica: Verifica): CampiLuogoEstesi {
  const costoIndicativo = verifica.scelta(grezzo, "costoIndicativo", COSTI, pos, false);
  const opzioniAlimentari = leggiElencoScelte(grezzo, "opzioniAlimentari", OPZIONI_ALIMENTARI, pos, verifica, false);
  const origine = verifica.scelta(grezzo, "origine", ORIGINI_LUOGO, pos, false);
  const osmId = verifica.testo(grezzo, "osmId", pos, false);
  const osmIdGrezzo = campo(grezzo, "osmId");
  if (origine === "osm" && (osmIdGrezzo === undefined || (typeof osmIdGrezzo === "string" && osmIdGrezzo.trim() === ""))) {
    verifica.segnala(
      "CAMPO_MANCANTE",
      pos.id,
      percorso(pos.base, "osmId"),
      `manca il campo "osmId", obbligatorio per un luogo con origine "osm"`,
    );
  }
  if (osmId !== undefined && !FORMATO_OSM_ID.test(osmId)) {
    verifica.segnala(
      "VALORE_NON_VALIDO",
      pos.id,
      percorso(pos.base, "osmId"),
      `l'identificativo OpenStreetMap "${osmId}" non è nel formato node/<numero>, way/<numero> o relation/<numero>`,
    );
  } else if (osmId !== undefined && origine !== "osm") {
    verifica.segnala(
      "VALORE_NON_VALIDO",
      pos.id,
      percorso(pos.base, "osmId"),
      `l'identificativo OpenStreetMap è ammesso solo per un luogo con origine "osm"`,
    );
  }
  const orariVerificati = verifica.booleano(grezzo, "orariVerificati", pos, false);
  const fonteDescrizione = verifica.testo(grezzo, "fonteDescrizione", pos, false);
  const attribuzioneImmagine = verifica.testo(grezzo, "attribuzioneImmagine", pos, false);
  return {
    ...(costoIndicativo !== undefined ? { costoIndicativo } : {}),
    ...(opzioniAlimentari !== undefined ? { opzioniAlimentari } : {}),
    ...(origine !== undefined ? { origine } : {}),
    ...(osmId !== undefined ? { osmId } : {}),
    ...(orariVerificati !== undefined ? { orariVerificati } : {}),
    ...(fonteDescrizione !== undefined ? { fonteDescrizione } : {}),
    ...(attribuzioneImmagine !== undefined ? { attribuzioneImmagine } : {}),
  };
}

function leggiCampiAttivita(grezza: Oggetto, pos: Posizione, verifica: Verifica): CampiAttivitaEstesi {
  const stili = leggiElencoScelte(grezza, "stili", STILI_VIAGGIO, pos, verifica, true);
  const intensita = verifica.scelta(grezza, "intensita", INTENSITA, pos, false);
  const costo = verifica.scelta(grezza, "costo", COSTI, pos, false);
  const adattaAiBambini = verifica.booleano(grezza, "adattaAiBambini", pos, false);
  const accessibile = verifica.booleano(grezza, "accessibile", pos, false);
  const mesiConsigliati = leggiMesi(grezza, pos, verifica);
  const descrizioneBreve = verifica.testo(grezza, "descrizioneBreve", pos, false);
  const immagine = leggiImmagine(grezza, pos, verifica);
  return {
    ...(stili !== undefined ? { stili } : {}),
    ...(intensita !== undefined ? { intensita } : {}),
    ...(costo !== undefined ? { costo } : {}),
    ...(adattaAiBambini !== undefined ? { adattaAiBambini } : {}),
    ...(accessibile !== undefined ? { accessibile } : {}),
    ...(mesiConsigliati !== undefined ? { mesiConsigliati } : {}),
    ...(descrizioneBreve !== undefined ? { descrizioneBreve } : {}),
    ...(immagine !== undefined ? { immagine } : {}),
  };
}

/** Elenco facoltativo di valori ammessi, senza ripetizioni; con `nonVuoto` serve almeno un valore. */
function leggiElencoScelte<T extends string>(
  oggetto: Oggetto,
  nome: string,
  ammessi: readonly T[],
  pos: Posizione,
  verifica: Verifica,
  nonVuoto: boolean,
): T[] | undefined {
  if (campo(oggetto, nome) === undefined) return undefined;
  const valori = verifica.elenco(oggetto, nome, pos);
  if (valori === undefined) return undefined;
  const dove = percorso(pos.base, nome);
  if (nonVuoto && valori.length === 0) {
    verifica.segnala("VALORE_NON_VALIDO", pos.id, dove, `il campo "${nome}" deve contenere almeno un valore`);
    return undefined;
  }
  const letti: T[] = [];
  let valido = true;
  valori.forEach((valore, i) => {
    const trovato = ammessi.find((ammesso) => ammesso === valore);
    if (trovato === undefined) {
      valido = false;
      verifica.segnala(
        "VALORE_NON_VALIDO",
        pos.id,
        percorso(dove, i),
        `il valore ${descrivi(valore)} del campo "${nome}" non è ammesso (valori ammessi: ${ammessi.join(", ")})`,
      );
    } else if (letti.includes(trovato)) {
      valido = false;
      verifica.segnala("VALORE_NON_VALIDO", pos.id, percorso(dove, i), `il valore "${trovato}" è ripetuto nel campo "${nome}"`);
    } else {
      letti.push(trovato);
    }
  });
  return valido ? letti : undefined;
}

/** Mesi consigliati: numeri interi da 1 a 12, senza ripetizioni. */
function leggiMesi(oggetto: Oggetto, pos: Posizione, verifica: Verifica): number[] | undefined {
  if (campo(oggetto, "mesiConsigliati") === undefined) return undefined;
  const valori = verifica.elenco(oggetto, "mesiConsigliati", pos);
  if (valori === undefined) return undefined;
  const dove = percorso(pos.base, "mesiConsigliati");
  const mesi: number[] = [];
  let valido = true;
  valori.forEach((valore, i) => {
    if (typeof valore !== "number" || !Number.isInteger(valore) || valore < 1 || valore > 12) {
      valido = false;
      verifica.segnala(
        "VALORE_NON_VALIDO",
        pos.id,
        percorso(dove, i),
        `il mese ${descrivi(valore)} non è ammesso: i mesi vanno da 1 (gennaio) a 12 (dicembre)`,
      );
    } else if (mesi.includes(valore)) {
      valido = false;
      verifica.segnala("VALORE_NON_VALIDO", pos.id, percorso(dove, i), `il mese ${valore} è ripetuto`);
    } else {
      mesi.push(valore);
    }
  });
  return valido ? mesi : undefined;
}

/** Immagine facoltativa: percorso locale e attribuzione, entrambi obbligatori. */
function leggiImmagine(oggetto: Oggetto, pos: Posizione, verifica: Verifica): Immagine | undefined {
  const valore = campo(oggetto, "immagine");
  if (valore === undefined) return undefined;
  const base = percorso(pos.base, "immagine");
  if (!eOggetto(valore)) {
    verifica.segnala(
      "VALORE_NON_VALIDO",
      pos.id,
      base,
      `l'immagine deve essere un oggetto con percorso e attribuzione (valore trovato: ${descrivi(valore)})`,
    );
    return undefined;
  }
  const interna: Posizione = { id: pos.id, base };
  const percorsoImmagine = verifica.testo(valore, "percorso", interna);
  const attribuzione = verifica.testo(valore, "attribuzione", interna);
  if (percorsoImmagine === undefined || attribuzione === undefined) return undefined;
  return { percorso: percorsoImmagine, attribuzione };
}

// Interrogazione del catalogo (CA-5)

/** Una voce del catalogo trovata dal suo `id`. */
export type VoceCatalogo<K extends CatalogoEsteso = Catalogo> =
  | { tipo: "zona"; zona: Zona }
  | { tipo: "luogo"; luogo: K["luoghi"][number] }
  | { tipo: "attivita"; attivita: K["attivita"][number] };

// Le interrogazioni accettano anche un catalogo esteso e restituiscono voci del tipo del catalogo ricevuto.

export function trovaZona(catalogo: CatalogoEsteso, id: string): Zona | null {
  return catalogo.zone.find((zona) => zona.id === id) ?? null;
}

export function trovaLuogo<K extends CatalogoEsteso>(catalogo: K, id: string): K["luoghi"][number] | null {
  return catalogo.luoghi.find((luogo) => luogo.id === id) ?? null;
}

export function trovaAttivita<K extends CatalogoEsteso>(catalogo: K, id: string): K["attivita"][number] | null {
  return catalogo.attivita.find((attivita) => attivita.id === id) ?? null;
}

/** La zona, il luogo o l'attività con quell'`id` (gli id sono unici in tutto il catalogo), oppure `null`. */
export function trovaNelCatalogo<K extends CatalogoEsteso>(catalogo: K, id: string): VoceCatalogo<K> | null {
  const zona = trovaZona(catalogo, id);
  if (zona !== null) return { tipo: "zona", zona };
  const luogo = trovaLuogo(catalogo, id);
  if (luogo !== null) return { tipo: "luogo", luogo };
  const attivita = trovaAttivita(catalogo, id);
  if (attivita !== null) return { tipo: "attivita", attivita };
  return null;
}

/** Ordine alfabetico degli `id` per codice dei caratteri: non dipende dalla lingua del sistema. */
function confrontaId(a: { id: string }, b: { id: string }): number {
  if (a.id < b.id) return -1;
  return a.id > b.id ? 1 : 0;
}

/**
 * Le attività di una zona (quelle il cui luogo è nella zona), in ordine alfabetico di `id`.
 * Una zona sconosciuta o senza attività restituisce un elenco vuoto.
 */
export function attivitaDellaZona<K extends CatalogoEsteso>(catalogo: K, zonaId: string): K["attivita"][number][] {
  const luoghiDellaZona = new Set(catalogo.luoghi.filter((luogo) => luogo.zonaId === zonaId).map((luogo) => luogo.id));
  return catalogo.attivita.filter((attivita) => luoghiDellaZona.has(attivita.luogoId)).sort(confrontaId);
}
