/**
 * Lettore validato delle istantanee (REQ-CAT-002, §7.8): dal JSON (testo o valore già decodificato) a
 * un'`IstantaneaDestinazione`, oppure tutti i problemi trovati, mai un'eccezione.
 *
 * Controlla, in quest'ordine:
 * 1. i campi propri dell'istantanea (formato, id, destinazione, area, data di creazione, fonti, stili scarsi);
 * 2. il catalogo con le regole del motore (`caricaCatalogoEsteso`, REQ-ITIN-001 e REQ-CAT-001);
 * 3. l'origine dei dati (CA-6): ogni luogo ha origine `osm` e un identificativo OpenStreetMap, ogni immagine ha
 *    autore e licenza, e tra le fonti c'è l'attribuzione "© OpenStreetMap contributors";
 * 4. i tempi di percorrenza: luoghi esistenti, mezzo ammesso, minuti interi, nessuna coppia ripetuta, mezzi pubblici
 *    sempre marcati come stima;
 * 5. se richiesto (predefinito), i minimi della §8.1 (CA-2) con `controllaMinimi`.
 */
import {
  caricaCatalogoEsteso,
  VALORI_AMMESSI,
  type CatalogoEsteso,
  type Coordinate,
  type Mezzo,
  type StileViaggio,
} from "@travelops/engine";
import {
  ATTRIBUZIONE_OSM,
  FORMATO_ID_ISTANTANEA,
  VERSIONE_FORMATO,
  type AreaDestinazione,
  type AttivitaIstantanea,
  type FonteIstantaneaDestinazione,
  type ImmagineIstantanea,
  type IstantaneaDestinazione,
  type StileScarso,
  type TempoPercorrenzaIstantanea,
} from "./formato.js";
import { controllaMinimi, type AvvisoMinimo, type MancanzaMinimo } from "./minimi.js";

export type CodiceProblema =
  /** Il testo non è JSON, oppure il valore non è un oggetto. */
  | "JSON_NON_VALIDO"
  | "CAMPO_MANCANTE"
  | "VALORE_NON_VALIDO"
  /** Errore del catalogo trovato dal motore (`caricaCatalogoEsteso`): il messaggio è quello del motore. */
  | "CATALOGO_NON_VALIDO"
  /** CA-6: un luogo senza origine `osm`. */
  | "ORIGINE_NON_OSM"
  /** CA-6: un'immagine senza autore o senza licenza. */
  | "IMMAGINE_SENZA_ATTRIBUZIONE"
  /** CA-6: tra le fonti manca l'attribuzione di OpenStreetMap. */
  | "ATTRIBUZIONE_OSM_MANCANTE"
  | "TEMPO_NON_VALIDO"
  /** CA-2: un minimo della §8.1 non è rispettato. */
  | "MINIMI_NON_RISPETTATI";

/** Un problema dell'istantanea: codice, posizione nel JSON (vuota per il documento intero) e messaggio in italiano. */
export interface ProblemaIstantanea {
  codice: CodiceProblema;
  percorso: string;
  messaggio: string;
  /** Per `MINIMI_NON_RISPETTATI`, il minimo non rispettato. */
  minimo?: MancanzaMinimo;
}

export type RisultatoLetturaIstantanea =
  | { ok: true; istantanea: IstantaneaDestinazione; avvisi: AvvisoMinimo[] }
  | { ok: false; errori: ProblemaIstantanea[] };

export interface OpzioniLettura {
  /**
   * Controlla anche i minimi della §8.1 (predefinito `true`). Con `false` si legge un'istantanea solo nella forma,
   * per esempio per spiegare al viaggiatore che cosa manca a una destinazione troppo piccola (CA-5).
   */
  minimi?: boolean;
}

type Oggetto = Record<string, unknown>;

const eOggetto = (v: unknown): v is Oggetto => typeof v === "object" && v !== null && !Array.isArray(v);
const eTesto = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";
const FORMATO_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;
const FORMATO_OSM_ID = /^(node|way|relation)\/[1-9]\d*$/;
const STILI: readonly StileViaggio[] = VALORI_AMMESSI.stile;
const MEZZI: readonly Mezzo[] = VALORI_AMMESSI.mezzo;

function eData(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const parti = FORMATO_DATA.exec(v);
  if (parti === null) return false;
  const [anno, mese, giorno] = [Number(parti[1]), Number(parti[2]), Number(parti[3])];
  const data = new Date(Date.UTC(anno, mese - 1, giorno));
  return data.getUTCFullYear() === anno && data.getUTCMonth() === mese - 1 && data.getUTCDate() === giorno;
}

function descrivi(v: unknown): string {
  if (v === undefined) return "assente";
  const testo = JSON.stringify(v);
  return testo.length > 60 ? `${testo.slice(0, 57)}...` : testo;
}

const unisci = (base: string, chiave: string | number): string =>
  typeof chiave === "number" ? `${base}[${chiave}]` : base === "" ? chiave : `${base}.${chiave}`;

/** Raccoglie i problemi: la lettura continua per trovarli tutti in una volta. */
class Problemi {
  readonly elenco: ProblemaIstantanea[] = [];

  segnala(codice: CodiceProblema, percorso: string, messaggio: string): void {
    this.elenco.push({ codice, percorso, messaggio: percorso === "" ? messaggio : `${percorso}: ${messaggio}` });
  }

  testo(oggetto: Oggetto, chiave: string, base: string, obbligatorio = true): string | undefined {
    const valore = oggetto[chiave];
    const dove = unisci(base, chiave);
    if (valore === undefined) {
      if (obbligatorio) this.segnala("CAMPO_MANCANTE", dove, `manca il campo obbligatorio "${chiave}"`);
      return undefined;
    }
    if (!eTesto(valore)) {
      this.segnala("VALORE_NON_VALIDO", dove, `deve essere un testo non vuoto (valore trovato: ${descrivi(valore)})`);
      return undefined;
    }
    return valore;
  }

  lista(oggetto: Oggetto, chiave: string, base: string, obbligatorio = true): unknown[] | undefined {
    const valore = oggetto[chiave];
    const dove = unisci(base, chiave);
    if (valore === undefined) {
      if (obbligatorio) this.segnala("CAMPO_MANCANTE", dove, `manca il campo obbligatorio "${chiave}"`);
      return undefined;
    }
    if (!Array.isArray(valore)) {
      this.segnala("VALORE_NON_VALIDO", dove, `deve essere un elenco (valore trovato: ${descrivi(valore)})`);
      return undefined;
    }
    return valore;
  }

  coordinate(oggetto: Oggetto, chiave: string, base: string): Coordinate | undefined {
    const valore = oggetto[chiave];
    const dove = unisci(base, chiave);
    if (valore === undefined) {
      this.segnala("CAMPO_MANCANTE", dove, `manca il campo obbligatorio "${chiave}"`);
      return undefined;
    }
    const lat = eOggetto(valore) ? valore["lat"] : undefined;
    const lon = eOggetto(valore) ? valore["lon"] : undefined;
    if (typeof lat !== "number" || typeof lon !== "number" || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      this.segnala(
        "VALORE_NON_VALIDO",
        dove,
        `deve essere { "lat": -90…90, "lon": -180…180 } (valore trovato: ${descrivi(valore)})`,
      );
      return undefined;
    }
    return { lat, lon };
  }
}

/**
 * Legge un'istantanea dal JSON (testo o valore già decodificato) e la valida. Restituisce l'istantanea con gli
 * avvisi dei minimi, oppure tutti i problemi trovati. Non solleva eccezioni.
 */
export function leggiIstantanea(json: unknown, opzioni: OpzioniLettura = {}): RisultatoLetturaIstantanea {
  let dati = json;
  if (typeof json === "string") {
    try {
      dati = JSON.parse(json) as unknown;
    } catch (errore) {
      return {
        ok: false,
        errori: [{ codice: "JSON_NON_VALIDO", percorso: "", messaggio: `il testo non è JSON valido (${(errore as Error).message})` }],
      };
    }
  }
  if (!eOggetto(dati)) {
    return {
      ok: false,
      errori: [{ codice: "JSON_NON_VALIDO", percorso: "", messaggio: `l'istantanea deve essere un oggetto JSON (valore trovato: ${descrivi(dati)})` }],
    };
  }

  const problemi = new Problemi();
  const intestazione = leggiIntestazione(dati, problemi);

  // Il catalogo con le regole del motore: i suoi errori si riportano così come sono.
  const catalogo = caricaCatalogoEsteso({ zone: dati["zone"], luoghi: dati["luoghi"], attivita: dati["attivita"] });
  if (!catalogo.ok) {
    for (const errore of catalogo.errori) {
      problemi.elenco.push({ codice: "CATALOGO_NON_VALIDO", percorso: errore.percorso, messaggio: errore.messaggio });
    }
  }

  controllaOrigini(dati, intestazione.fonti, problemi);
  const immagini = leggiImmagini(dati, problemi);
  const tempi = leggiTempi(dati, problemi);

  if (problemi.elenco.length > 0 || !catalogo.ok || !intestazione.completa) return { ok: false, errori: problemi.elenco };

  const istantanea = componi(intestazione, catalogo.valore, immagini, tempi);
  if (opzioni.minimi === false) return { ok: true, istantanea, avvisi: [] };
  const minimi = controllaMinimi(istantanea);
  if (!minimi.rispettati) {
    return {
      ok: false,
      errori: minimi.mancanze.map((mancanza) => ({
        codice: "MINIMI_NON_RISPETTATI",
        percorso: "",
        messaggio: `minimi della §8.1 non rispettati: ${mancanza.messaggio}`,
        minimo: mancanza,
      })),
    };
  }
  return { ok: true, istantanea, avvisi: minimi.avvisi };
}

/** Come `leggiIstantanea`, ma solleva `ErroreIstantanea` con tutti i problemi. Comodo per i dati del repository. */
export function leggiIstantaneaOppureErrore(json: unknown, opzioni: OpzioniLettura = {}): IstantaneaDestinazione {
  const letta = leggiIstantanea(json, opzioni);
  if (!letta.ok) throw new ErroreIstantanea(letta.errori);
  return letta.istantanea;
}

/** Istantanea non valida: il messaggio elenca tutti i problemi. */
export class ErroreIstantanea extends Error {
  override readonly name = "ErroreIstantanea";
  readonly problemi: readonly ProblemaIstantanea[];

  constructor(problemi: readonly ProblemaIstantanea[], contesto?: string) {
    const prefisso = contesto === undefined ? "istantanea non valida" : `istantanea non valida (${contesto})`;
    super(`${prefisso}: ${problemi.map((p) => p.messaggio).join("; ")}`);
    this.problemi = problemi;
  }
}

// Campi propri dell'istantanea

interface Intestazione {
  completa: boolean;
  id?: string;
  destinazione?: string;
  area?: AreaDestinazione;
  dataCreazione?: string;
  fonti: FonteIstantaneaDestinazione[];
  stiliScarsi?: StileScarso[];
}

function leggiIntestazione(dati: Oggetto, problemi: Problemi): Intestazione {
  const prima = problemi.elenco.length;
  if (dati["formato"] === undefined) {
    problemi.segnala("CAMPO_MANCANTE", "formato", `manca il campo obbligatorio "formato" (versione del formato: ${VERSIONE_FORMATO})`);
  } else if (dati["formato"] !== VERSIONE_FORMATO) {
    problemi.segnala(
      "VALORE_NON_VALIDO",
      "formato",
      `versione del formato non riconosciuta (${descrivi(dati["formato"])}): questo lettore conosce la ${VERSIONE_FORMATO}`,
    );
  }
  const id = problemi.testo(dati, "id", "");
  if (id !== undefined && !FORMATO_ID_ISTANTANEA.test(id)) {
    problemi.segnala("VALORE_NON_VALIDO", "id", `l'identificativo "${id}" ammette solo lettere minuscole, cifre e trattini`);
  }
  const destinazione = problemi.testo(dati, "destinazione", "");
  const area = leggiArea(dati["area"], "area", problemi);
  const dataCreazione = dati["dataCreazione"];
  if (dataCreazione === undefined) {
    problemi.segnala("CAMPO_MANCANTE", "dataCreazione", `manca il campo obbligatorio "dataCreazione"`);
  } else if (!eData(dataCreazione)) {
    problemi.segnala("VALORE_NON_VALIDO", "dataCreazione", `deve essere una data AAAA-MM-GG (valore trovato: ${descrivi(dataCreazione)})`);
  }
  const fonti = leggiFonti(dati, problemi);
  const stiliScarsi = leggiStiliScarsi(dati, problemi);
  return {
    completa: problemi.elenco.length === prima,
    ...(id !== undefined ? { id } : {}),
    ...(destinazione !== undefined ? { destinazione } : {}),
    ...(area !== undefined ? { area } : {}),
    ...(eData(dataCreazione) ? { dataCreazione } : {}),
    fonti,
    ...(stiliScarsi !== undefined ? { stiliScarsi } : {}),
  };
}

/**
 * Legge e valida un'area di destinazione (per esempio un risultato di ricerca registrato). Restituisce l'area
 * oppure i problemi trovati; non solleva eccezioni.
 */
export function leggiAreaDestinazione(
  json: unknown,
  percorso = "area",
): { ok: true; area: AreaDestinazione } | { ok: false; errori: ProblemaIstantanea[] } {
  const problemi = new Problemi();
  const area = leggiArea(json, percorso, problemi);
  return area === undefined ? { ok: false, errori: problemi.elenco } : { ok: true, area };
}

function leggiArea(valore: unknown, base: string, problemi: Problemi): AreaDestinazione | undefined {
  if (valore === undefined) {
    problemi.segnala("CAMPO_MANCANTE", base, `manca il campo obbligatorio "area" (l'area della destinazione trovata dalla ricerca)`);
    return undefined;
  }
  if (!eOggetto(valore)) {
    problemi.segnala("VALORE_NON_VALIDO", base, `deve essere un oggetto con id, nome, descrizione e centro (valore trovato: ${descrivi(valore)})`);
    return undefined;
  }
  const prima = problemi.elenco.length;
  const id = problemi.testo(valore, "id", base);
  const nome = problemi.testo(valore, "nome", base);
  const descrizione = problemi.testo(valore, "descrizione", base);
  const centro = problemi.coordinate(valore, "centro", base);
  const osmId = problemi.testo(valore, "osmId", base, false);
  if (osmId !== undefined && !FORMATO_OSM_ID.test(osmId)) {
    problemi.segnala("VALORE_NON_VALIDO", unisci(base, "osmId"), `l'identificativo OpenStreetMap "${osmId}" non è nel formato node/<numero>, way/<numero> o relation/<numero>`);
  }
  if (problemi.elenco.length > prima || id === undefined || nome === undefined || descrizione === undefined || centro === undefined) {
    return undefined;
  }
  return { id, nome, descrizione, centro, ...(osmId !== undefined ? { osmId } : {}) };
}

function leggiFonti(dati: Oggetto, problemi: Problemi): FonteIstantaneaDestinazione[] {
  const voci = problemi.lista(dati, "fonti", "");
  if (voci === undefined) return [];
  if (voci.length === 0) problemi.segnala("VALORE_NON_VALIDO", "fonti", "serve almeno una fonte con la sua attribuzione");
  const fonti: FonteIstantaneaDestinazione[] = [];
  const nomi = new Set<string>();
  voci.forEach((voce, i) => {
    const dove = unisci("fonti", i);
    if (!eOggetto(voce)) {
      problemi.segnala("VALORE_NON_VALIDO", dove, `la fonte deve essere un oggetto con nome e attribuzione (valore trovato: ${descrivi(voce)})`);
      return;
    }
    const nome = problemi.testo(voce, "nome", dove);
    const attribuzione = problemi.testo(voce, "attribuzione", dove);
    const licenza = problemi.testo(voce, "licenza", dove, false);
    if (nome !== undefined && nomi.has(nome)) problemi.segnala("VALORE_NON_VALIDO", unisci(dove, "nome"), `la fonte "${nome}" è ripetuta`);
    if (nome === undefined || attribuzione === undefined) return;
    nomi.add(nome);
    fonti.push({ nome, attribuzione, ...(licenza !== undefined ? { licenza } : {}) });
  });
  return fonti;
}

function leggiStiliScarsi(dati: Oggetto, problemi: Problemi): StileScarso[] | undefined {
  const voci = problemi.lista(dati, "stiliScarsi", "", false);
  if (voci === undefined) return undefined;
  const scarsi: StileScarso[] = [];
  voci.forEach((voce, i) => {
    const dove = unisci("stiliScarsi", i);
    if (!eOggetto(voce)) {
      problemi.segnala("VALORE_NON_VALIDO", dove, `deve essere un oggetto con stile e motivo (valore trovato: ${descrivi(voce)})`);
      return;
    }
    const stile = STILI.find((s) => s === voce["stile"]);
    if (stile === undefined) {
      problemi.segnala("VALORE_NON_VALIDO", unisci(dove, "stile"), `stile non ammesso ${descrivi(voce["stile"])} (valori ammessi: ${STILI.join(", ")})`);
    } else if (scarsi.some((s) => s.stile === stile)) {
      problemi.segnala("VALORE_NON_VALIDO", unisci(dove, "stile"), `lo stile "${stile}" è dichiarato due volte`);
      return;
    }
    const motivo = problemi.testo(voce, "motivo", dove);
    if (stile !== undefined && motivo !== undefined) scarsi.push({ stile, motivo });
  });
  return scarsi;
}

// Origine dei dati (CA-6)

function controllaOrigini(dati: Oggetto, fonti: readonly FonteIstantaneaDestinazione[], problemi: Problemi): void {
  const luoghi = Array.isArray(dati["luoghi"]) ? dati["luoghi"] : [];
  luoghi.forEach((luogo, i) => {
    if (!eOggetto(luogo)) return; // già segnalato dal motore
    if (luogo["origine"] !== "osm") {
      const nome = typeof luogo["id"] === "string" ? `il luogo "${luogo["id"]}"` : "il luogo";
      problemi.segnala(
        "ORIGINE_NON_OSM",
        unisci(unisci("luoghi", i), "origine"),
        `${nome} deve avere origine "osm" con il suo identificativo OpenStreetMap (valore trovato: ${descrivi(luogo["origine"])})`,
      );
    }
  });
  const conOsm = fonti.some((f) => f.attribuzione.includes(ATTRIBUZIONE_OSM));
  if (luoghi.length > 0 && !conOsm && Array.isArray(dati["fonti"])) {
    problemi.segnala("ATTRIBUZIONE_OSM_MANCANTE", "fonti", `tra le fonti manca l'attribuzione "${ATTRIBUZIONE_OSM}" dei dati OpenStreetMap`);
  }
}

type ExtraImmagine = Pick<ImmagineIstantanea, "autore" | "licenza" | "urlLicenza" | "urlFonte">;

/** Autore e licenza di ogni immagine (CA-6), per id dell'attività. Percorso e attribuzione li controlla il motore. */
function leggiImmagini(dati: Oggetto, problemi: Problemi): Map<string, ExtraImmagine> {
  const trovate = new Map<string, ExtraImmagine>();
  const attivita = Array.isArray(dati["attivita"]) ? dati["attivita"] : [];
  attivita.forEach((voce, i) => {
    if (!eOggetto(voce) || !eOggetto(voce["immagine"])) return;
    const immagine = voce["immagine"];
    const dove = unisci(unisci("attivita", i), "immagine");
    const chi = typeof voce["id"] === "string" ? `l'immagine dell'attività "${voce["id"]}"` : "l'immagine";
    const autore = immagine["autore"];
    const licenza = immagine["licenza"];
    if (!eTesto(autore)) {
      problemi.segnala("IMMAGINE_SENZA_ATTRIBUZIONE", unisci(dove, "autore"), `${chi} deve avere l'autore (valore trovato: ${descrivi(autore)})`);
    }
    if (!eTesto(licenza)) {
      problemi.segnala("IMMAGINE_SENZA_ATTRIBUZIONE", unisci(dove, "licenza"), `${chi} deve avere la licenza (valore trovato: ${descrivi(licenza)})`);
    }
    const urlLicenza = problemi.testo(immagine, "urlLicenza", dove, false);
    const urlFonte = problemi.testo(immagine, "urlFonte", dove, false);
    if (eTesto(autore) && eTesto(licenza) && typeof voce["id"] === "string") {
      trovate.set(voce["id"], {
        autore,
        licenza,
        ...(urlLicenza !== undefined ? { urlLicenza } : {}),
        ...(urlFonte !== undefined ? { urlFonte } : {}),
      });
    }
  });
  return trovate;
}

// Tempi di percorrenza

function leggiTempi(dati: Oggetto, problemi: Problemi): TempoPercorrenzaIstantanea[] {
  const voci = problemi.lista(dati, "tempiPercorrenza", "");
  if (voci === undefined) return [];
  const luoghi = new Set(
    (Array.isArray(dati["luoghi"]) ? dati["luoghi"] : [])
      .map((l) => (eOggetto(l) ? l["id"] : undefined))
      .filter((id): id is string => typeof id === "string"),
  );
  const visti = new Set<string>();
  const tempi: TempoPercorrenzaIstantanea[] = [];
  voci.forEach((voce, i) => {
    const dove = unisci("tempiPercorrenza", i);
    if (!eOggetto(voce)) {
      problemi.segnala("TEMPO_NON_VALIDO", dove, `deve essere un oggetto con da, a, mezzo e minuti (valore trovato: ${descrivi(voce)})`);
      return;
    }
    const prima = problemi.elenco.length;
    const { da, a, mezzo, minuti, stima } = voce;
    for (const [chiave, valore] of [["da", da], ["a", a]] as const) {
      if (!eTesto(valore)) problemi.segnala("TEMPO_NON_VALIDO", unisci(dove, chiave), `manca il luogo (valore trovato: ${descrivi(valore)})`);
      else if (!luoghi.has(valore)) problemi.segnala("TEMPO_NON_VALIDO", unisci(dove, chiave), `il luogo "${valore}" non esiste nel catalogo`);
    }
    if (eTesto(da) && da === a) problemi.segnala("TEMPO_NON_VALIDO", dove, `partenza e arrivo sono lo stesso luogo ("${da}")`);
    const mezzoLetto = MEZZI.find((m) => m === mezzo);
    if (mezzoLetto === undefined) {
      problemi.segnala("TEMPO_NON_VALIDO", unisci(dove, "mezzo"), `mezzo non ammesso ${descrivi(mezzo)} (valori ammessi: ${MEZZI.join(", ")})`);
    }
    if (typeof minuti !== "number" || !Number.isInteger(minuti) || minuti < 0) {
      problemi.segnala("TEMPO_NON_VALIDO", unisci(dove, "minuti"), `i minuti devono essere un intero maggiore o uguale a zero (valore trovato: ${descrivi(minuti)})`);
    }
    if (stima !== undefined && stima !== true) {
      problemi.segnala("TEMPO_NON_VALIDO", unisci(dove, "stima"), `"stima" ammette solo true (valore trovato: ${descrivi(stima)})`);
    }
    if (mezzoLetto === "mezzi_pubblici" && stima !== true) {
      problemi.segnala(
        "TEMPO_NON_VALIDO",
        unisci(dove, "stima"),
        `un tempo con i mezzi pubblici è sempre una stima dichiarata: serve "stima": true`,
      );
    }
    if (problemi.elenco.length > prima || !eTesto(da) || !eTesto(a) || mezzoLetto === undefined || typeof minuti !== "number") return;
    // I tempi valgono nei due sensi: la stessa coppia con lo stesso mezzo compare una volta sola.
    const chiave = JSON.stringify([...[da, a].sort(), mezzoLetto]);
    if (visti.has(chiave)) {
      problemi.segnala("TEMPO_NON_VALIDO", dove, `il tempo tra "${da}" e "${a}" con il mezzo ${mezzoLetto} è ripetuto`);
      return;
    }
    visti.add(chiave);
    tempi.push({ da, a, mezzo: mezzoLetto, minuti, ...(stima === true ? { stima } : {}) });
  });
  return tempi;
}

// Composizione

function componi(
  intestazione: Intestazione,
  catalogo: CatalogoEsteso,
  immagini: ReadonlyMap<string, ExtraImmagine>,
  tempi: TempoPercorrenzaIstantanea[],
): IstantaneaDestinazione {
  const { id, destinazione, area, dataCreazione, fonti, stiliScarsi } = intestazione;
  if (id === undefined || destinazione === undefined || area === undefined || dataCreazione === undefined) {
    throw new Error("intestazione incompleta: non dovrebbe succedere dopo la validazione");
  }
  const attivita: AttivitaIstantanea[] = catalogo.attivita.map((voce) => {
    const { immagine, ...resto } = voce;
    if (immagine === undefined) return resto;
    const extra = immagini.get(voce.id);
    if (extra === undefined) throw new Error(`immagine di ${voce.id} senza autore: non dovrebbe succedere dopo la validazione`);
    return { ...resto, immagine: { ...immagine, ...extra } };
  });
  return {
    formato: VERSIONE_FORMATO,
    id,
    destinazione,
    area,
    dataCreazione,
    fonti,
    ...(stiliScarsi !== undefined ? { stiliScarsi } : {}),
    zone: catalogo.zone,
    luoghi: catalogo.luoghi,
    attivita,
    tempiPercorrenza: tempi,
  };
}
