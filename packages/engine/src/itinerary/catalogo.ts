/**
 * Catalogo: caricamento con le regole di validità (REQ-ITIN-001) e interrogazione (CA-5).
 */
import type {
  AttivitaCatalogo,
  Catalogo,
  FasciaOraria,
  GiornoSettimana,
  Luogo,
  OrariApertura,
  Zona,
} from "../model/index.js";
import type { RisultatoCaricamento } from "./errori.js";
import { CATEGORIE, descrivi, GIORNI_SETTIMANA, TIPI_LUOGO } from "./valori.js";
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

/**
 * Carica il catalogo dal JSON già letto (testo o valore decodificato).
 * Restituisce il catalogo oppure tutti gli errori trovati; non solleva eccezioni.
 */
export function caricaCatalogo(json: unknown): RisultatoCaricamento<Catalogo> {
  return eseguiCaricamento(RADICE, (verifica) => {
    const decodificato = decodifica(json, RADICE, verifica);
    return decodificato === null ? null : analizzaCatalogo(decodificato.dati, verifica);
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

function analizzaCatalogo(dati: unknown, verifica: Verifica): Catalogo | null {
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

  const luoghi: Luogo[] = [];
  const idLuoghi = new Set<string>();
  luoghiGrezzi?.forEach((grezzo, i) => {
    const zoneNote = zoneGrezze === undefined ? undefined : idZone;
    const luogo = leggiLuogo(grezzo, percorso("luoghi", i), verifica, registra, idLuoghi, zoneNote);
    if (luogo !== undefined) luoghi.push(luogo);
  });

  const attivita: AttivitaCatalogo[] = [];
  attivitaGrezze?.forEach((grezza, i) => {
    const luoghiNoti = luoghiGrezzi === undefined ? undefined : idLuoghi;
    const voce = leggiAttivita(grezza, percorso("attivita", i), verifica, registra, luoghiNoti);
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

function leggiLuogo(
  grezzo: unknown,
  base: string,
  verifica: Verifica,
  registra: Registra,
  idLuoghi: Set<string>,
  zoneNote: ReadonlySet<string> | undefined,
): Luogo | undefined {
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
  const tipo = verifica.scelta(grezzo, "tipo", TIPI_LUOGO, pos);
  const apertura = leggiApertura(grezzo, pos, verifica);
  const coordinate = verifica.coordinate(grezzo, "coordinate", pos);
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
  return { id, nome, zonaId, tipo, apertura, ...(coordinate !== undefined ? { coordinate } : {}) };
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

function leggiAttivita(
  grezza: unknown,
  base: string,
  verifica: Verifica,
  registra: Registra,
  luoghiNoti: ReadonlySet<string> | undefined,
): AttivitaCatalogo | undefined {
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
  const categoria = verifica.scelta(grezza, "categoria", CATEGORIE, pos);
  const allAperto = verifica.booleano(grezza, "allAperto", pos, true);
  const durataTipica = verifica.intero(grezza, "durataTipica", pos, 1, "la durata tipica in minuti");
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
  return { id, nome, luogoId, categoria, allAperto, durataTipica };
}

// Interrogazione del catalogo (CA-5)

/** Una voce del catalogo trovata dal suo `id`. */
export type VoceCatalogo =
  | { tipo: "zona"; zona: Zona }
  | { tipo: "luogo"; luogo: Luogo }
  | { tipo: "attivita"; attivita: AttivitaCatalogo };

export function trovaZona(catalogo: Catalogo, id: string): Zona | null {
  return catalogo.zone.find((zona) => zona.id === id) ?? null;
}

export function trovaLuogo(catalogo: Catalogo, id: string): Luogo | null {
  return catalogo.luoghi.find((luogo) => luogo.id === id) ?? null;
}

export function trovaAttivita(catalogo: Catalogo, id: string): AttivitaCatalogo | null {
  return catalogo.attivita.find((attivita) => attivita.id === id) ?? null;
}

/** La zona, il luogo o l'attività con quell'`id` (gli id sono unici in tutto il catalogo), oppure `null`. */
export function trovaNelCatalogo(catalogo: Catalogo, id: string): VoceCatalogo | null {
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
export function attivitaDellaZona(catalogo: Catalogo, zonaId: string): AttivitaCatalogo[] {
  const luoghiDellaZona = new Set(catalogo.luoghi.filter((luogo) => luogo.zonaId === zonaId).map((luogo) => luogo.id));
  return catalogo.attivita.filter((attivita) => luoghiDellaZona.has(attivita.luogoId)).sort(confrontaId);
}
