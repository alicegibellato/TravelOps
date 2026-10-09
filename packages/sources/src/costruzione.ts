/**
 * La costruzione reale di una destinazione (REQ-CAT-002): dall'area trovata dalla ricerca all'istantanea.
 *
 * 1. **luoghi**: una sola query Overpass, limitata all'area (riquadri attorno al centro: circa 60 minuti per le
 *    attività, pochi chilometri per ristoranti, alloggi e farmacie, più largo per stazione e aeroporto);
 * 2. **classificazione**: le regole di REQ-CAT-001 del motore (`classificaLuogoOsm`), poi la scelta delle attività
 *    per stile, a turno tra i 7 stili, fino a 60 (entro il massimo di 120): prima quelle con Wikipedia o Wikidata, poi con orari verificati,
 *    poi le più vicine al centro;
 * 3. **ristoranti**: ristoranti per pranzo e cena (uno vegetariano e, se c'è, uno senza glutine), alloggi di fasce
 *    diverse, farmacia, ospedale, stazione e aeroporto più vicini;
 * 4. **descrizioni**: Wikipedia o Wikivoyage, in italiano se c'è, altrimenti in inglese, con la fonte;
 * 5. **immagini**: Wikimedia Commons, solo con autore e licenza (CA-6);
 * 6. **percorsi**: OSRM a piedi e in auto tra le coppie usabili; mezzi pubblici come stima dichiarata
 *    (auto × 1,5 + 10 minuti);
 * 7. **minimi**: §8.1; gli stili con meno di 2 attività sono dichiarati in `stiliScarsi`; se mancano altri minimi la
 *    destinazione è troppo piccola e si propongono 2–3 destinazioni vicine più grandi (CA-5).
 *
 * Tutto è deterministico: stesse risposte delle fonti, stessa istantanea (CA-1). Nessun orologio di sistema.
 */
import {
  classificaLuogoOsm,
  TABELLA_CLASSIFICAZIONE,
  VALORI_AMMESSI,
  type AttivitaCatalogoEstesa,
  type Coordinate,
  type Costo,
  type ElementoOsm,
  type LuogoEsteso,
  type StileViaggio,
  type Zona,
} from "@travelops/engine";
import {
  ATTRIBUZIONE_OSM,
  VERSIONE_FORMATO,
  type AreaDestinazione,
  type AttivitaIstantanea,
  type FonteIstantaneaDestinazione,
  type ImmagineIstantanea,
  type IstantaneaDestinazione,
  type StileScarso,
  type TempoPercorrenzaIstantanea,
} from "./formato.js";
import { leggiIstantanea } from "./lettore.js";
import { adattoAlPasto, controllaMinimi, coppieUsabili, type MancanzaMinimo } from "./minimi.js";
import { destinazionePrecaricata } from "./precaricate.js";
import {
  MESSAGGI_AVANZAMENTO,
  PASSI_COSTRUZIONE,
  type ClienteFonti,
  type EsitoCostruzione,
  type OpzioniCostruzione,
  type Orologio,
  type PassoCostruzione,
  type RichiestaFonte,
  type RispostaFonte,
  type ServizioFonte,
} from "./sorgente.js";

// --- Parametri ------------------------------------------------------------------------------------------

/** Raggio delle attività: circa 60 minuti dal centro (strade miste, città e montagna). */
export const RAGGIO_KM = 25;
/** Raggio di ristoranti, alloggi e farmacie: il "centro" della destinazione. */
export const RAGGIO_VICINO_KM = 4;
/** Raggio in cui cercare la stazione o l'aeroporto di arrivo e le destinazioni più grandi (CA-5). */
export const RAGGIO_ARRIVO_KM = 50;
/** Il massimo di attività di REQ-CAT-002. */
export const MASSIMO_ATTIVITA = 120;
/**
 * Quante attività sceglie davvero la costruzione: 60, entro il massimo di 120. Bastano per ogni stile e per viaggi di
 * più giorni, e tengono l'istantanea leggera: le coppie con un tempo crescono col quadrato dei luoghi (con 120
 * attività sono circa 9 200 coppie e 20 000 tempi, oltre 2 MB per destinazione) e così le richieste a OSRM.
 */
export const ATTIVITA_SCELTE = 60;
export const MASSIMO_RISTORANTI = 12;
export const MASSIMO_ALLOGGI = 4;
/** Un tempo a piedi si salva solo fino a questa durata: oltre non è un'opzione sensata. */
export const MASSIMO_MINUTI_A_PIEDI = 90;
/** Quanti luoghi per richiesta a OSRM (il server dimostrativo accetta fino a 100 coordinate). */
export const BLOCCO_OSRM = 50;
/** Pausa minima tra due richieste allo stesso servizio "leggero" (OSRM, Wikipedia, Commons). */
export const INTERVALLO_FONTI_MS = 1000;

/** I server Overpass, nell'ordine: se uno è occupato si prova il successivo (mai due volte lo stesso). */
export const SERVER_OVERPASS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
] as const;
export const OSRM_AUTO = "https://router.project-osrm.org/table/v1/driving/";
export const OSRM_PIEDI = "https://routing.openstreetmap.de/routed-foot/table/v1/driving/";
export const COMMONS_API = "https://commons.wikimedia.org/w/api.php";

const STILI: readonly StileViaggio[] = VALORI_AMMESSI.stile;

/**
 * I tag OpenStreetMap che la costruzione legge: quelli della tabella di classificazione del motore più quelli usati
 * qui. Gli altri si scartano subito, così le risposte registrate possono tenere solo questi (CA-1).
 */
export const TAG_USATI: ReadonlySet<string> = new Set([
  ...TABELLA_CLASSIFICAZIONE.flatMap((r) => r.quando.map((c) => c.chiave)),
  "name",
  "name:it",
  "opening_hours",
  "distance",
  "ascent",
  "price",
  "wheelchair",
  "diet:vegetarian",
  "diet:gluten_free",
  "wikipedia",
  "wikidata",
  "wikivoyage",
  "wikimedia_commons",
  "image",
  "stars",
  "iata",
  "place",
  "population",
]);

// --- Strumenti -----------------------------------------------------------------------------------------

/** Distanza approssimata in chilometri (emisenoverso). */
export function distanzaKm(a: Coordinate, b: Coordinate): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

const arrotonda = (n: number, cifre = 5): number => Number(n.toFixed(cifre));

/** Il riquadro `sud,ovest,nord,est` attorno a un punto, per Overpass. */
function riquadro(c: Coordinate, km: number): string {
  const dLat = km / 111.32;
  const dLon = km / (111.32 * Math.cos((c.lat * Math.PI) / 180));
  return [c.lat - dLat, c.lon - dLon, c.lat + dLat, c.lon + dLon].map((n) => n.toFixed(4)).join(",");
}

/** Indirizzo con i parametri in ordine alfabetico: la forma canonica che cache e registrazioni ritrovano. */
export function indirizzo(base: string, parametri: Record<string, string>): string {
  const ordinati = Object.keys(parametri)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(parametri[k] ?? "")}`);
  return `${base}?${ordinati.join("&")}`;
}

/** Identificativo in minuscolo con trattini (per gli id delle istantanee). */
export function inTrattini(testo: string): string {
  return testo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const confronta = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Ritmo delle richieste verso un servizio: almeno `intervalloMs` tra l'inizio di una richiesta e la successiva. */
export class Ritmo {
  private ultimo = Number.NEGATIVE_INFINITY;
  private coda: Promise<void> = Promise.resolve();

  constructor(
    private readonly orologio: Orologio,
    private readonly intervalloMs: number,
  ) {}

  /** Attende il proprio turno. Le chiamate sono servite una alla volta, nell'ordine. */
  turno(): Promise<void> {
    const mio = this.coda.then(async () => {
      const attesa = this.ultimo + this.intervalloMs - this.orologio.adesso();
      if (attesa > 0) await this.orologio.attendi(attesa);
      this.ultimo = this.orologio.adesso();
    });
    this.coda = mio.catch(() => undefined);
    return mio;
  }
}

/** Ciò che serve alla costruzione: il cliente delle fonti, i ritmi per servizio, la data e le istantanee note. */
export interface ContestoCostruzione {
  cliente: ClienteFonti;
  ritmo: (servizio: ServizioFonte) => Ritmo;
  dataCreazione: () => string;
}

class FonteNonDisponibile extends Error {
  override readonly name = "FonteNonDisponibile";
}

async function chiedi(ctx: ContestoCostruzione, richiesta: RichiestaFonte, segnale: AbortSignal | undefined): Promise<RispostaFonte | null> {
  segnale?.throwIfAborted();
  await ctx.ritmo(richiesta.servizio).turno();
  try {
    const risposta = await ctx.cliente.richiedi(richiesta, segnale !== undefined ? { segnale } : {});
    return risposta.stato === 200 && typeof risposta.corpo === "object" && risposta.corpo !== null ? risposta : null;
  } catch (errore) {
    if (segnale?.aborted === true) throw errore;
    return null;
  }
}

type Oggetto = Record<string, unknown>;
const eOggetto = (v: unknown): v is Oggetto => typeof v === "object" && v !== null && !Array.isArray(v);

// --- 1. Luoghi (Overpass) --------------------------------------------------------------------------------

/** La query Overpass della destinazione: ogni gruppo ha il suo riquadro e il suo massimo di risultati. */
export function queryOverpass(centro: Coordinate): string {
  const B = riquadro(centro, RAGGIO_KM);
  const V = riquadro(centro, RAGGIO_VICINO_KM);
  const A = riquadro(centro, RAGGIO_ARRIVO_KM);
  const righe: [string, string, number][] = [
    ['nwr["tourism"~"^(museum|gallery)$"]["name"]["wikidata"]', B, 60],
    ['nwr["tourism"~"^(museum|gallery)$"]["name"][!"wikidata"]', V, 25],
    ['nwr["tourism"="viewpoint"]["name"]', B, 40],
    ['nwr["leisure"="park"]["name"]["wikidata"]', B, 30],
    ['nwr["leisure"="park"]["name"][!"wikidata"]', V, 20],
    ['nwr["natural"="beach"]["name"]', B, 25],
    ['nwr["craft"="winery"]["name"]', B, 20],
    ['nwr["shop"="wine"]["name"]', B, 20],
    ['nwr["aerialway"~"^(cable_car|gondola|chair_lift|mixed_lift)$"]', B, 30],
    ['relation["route"~"^(hiking|foot)$"]["name"]', B, 40],
    ['nwr["amenity"="restaurant"]["name"]["diet:vegetarian"~"^(yes|only)$"]', B, 15],
    ['nwr["amenity"="restaurant"]["name"]["diet:gluten_free"~"^(yes|only)$"]', B, 10],
    ['nwr["amenity"="restaurant"]["name"]["opening_hours"]', V, 40],
    ['nwr["amenity"="restaurant"]["name"][!"opening_hours"]', V, 15],
    ['nwr["tourism"="hotel"]["name"]', V, 40],
    ['nwr["tourism"~"^(guest_house|hostel|motel|apartment)$"]["name"]', V, 20],
    ['nwr["amenity"="pharmacy"]', V, 10],
    ['nwr["amenity"="hospital"]["name"]', B, 15],
    ['node["railway"="station"]["name"]["station"!~"^(subway|light_rail|monorail|funicular)$"]', A, 40],
    ['nwr["aeroway"="aerodrome"]["iata"]', A, 10],
  ];
  return ["[out:json][timeout:90];", ...righe.map(([filtro, r, n]) => `${filtro}(${r});out tags center ${n};`)].join("\n");
}

/** Query delle località più grandi vicine (CA-5). */
export function queryLocalitaVicine(centro: Coordinate): string {
  return `[out:json][timeout:25];\nnode["place"~"^(city|town)$"]["name"]["population"](${riquadro(centro, RAGGIO_ARRIVO_KM)});out 60;`;
}

async function overpass(ctx: ContestoCostruzione, query: string, segnale: AbortSignal | undefined): Promise<Oggetto[] | null> {
  for (const url of SERVER_OVERPASS) {
    const risposta = await chiedi(ctx, { servizio: "overpass", url, metodo: "POST", corpo: query }, segnale);
    const corpo = risposta !== null && eOggetto(risposta.corpo) ? risposta.corpo : {};
    // Un "remark" con un errore (per esempio il tempo scaduto) vuol dire risultati parziali: si prova il server successivo.
    if (typeof corpo["remark"] === "string" && /error/i.test(corpo["remark"])) continue;
    if (Array.isArray(corpo["elements"])) return corpo["elements"].filter(eOggetto);
  }
  return null;
}

/** Un elemento Overpass come `ElementoOsm`, con i soli tag usati; `null` se non è utilizzabile. */
function comeElemento(grezzo: Oggetto): ElementoOsm | null {
  const tipo = grezzo["type"];
  const id = grezzo["id"];
  if ((tipo !== "node" && tipo !== "way" && tipo !== "relation") || typeof id !== "number") return null;
  const tag: Record<string, string> = {};
  if (eOggetto(grezzo["tags"])) {
    for (const [k, v] of Object.entries(grezzo["tags"])) if (TAG_USATI.has(k) && typeof v === "string") tag[k] = v;
  }
  const centro = eOggetto(grezzo["center"]) ? grezzo["center"] : grezzo;
  const lat = centro["lat"];
  const lon = centro["lon"];
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  return { type: tipo, id, tags: tag, lat, lon };
}

// --- 2. Classificazione e scelta ---------------------------------------------------------------------

interface Candidato {
  elemento: ElementoOsm;
  luogo: LuogoEsteso;
  attivita: AttivitaCatalogoEstesa | null;
  regola: string;
  km: number;
  conWiki: boolean;
}

const tag = (c: Candidato, k: string): string | undefined => c.elemento.tags?.[k];

/** Ordine di preferenza: con Wikipedia o Wikidata, poi orari verificati, poi più vicino, poi id. */
function preferenza(a: Candidato, b: Candidato): number {
  return (
    Number(b.conWiki) - Number(a.conWiki) ||
    Number(b.luogo.orariVerificati === true) - Number(a.luogo.orariVerificati === true) ||
    a.km - b.km ||
    confronta(a.luogo.id, b.luogo.id)
  );
}

const nomeNormalizzato = (s: string): string => inTrattini(s);

/** Toglie i doppioni (stesso tipo e stesso nome), tenendo il preferito. */
function senzaDoppioni(candidati: Candidato[]): Candidato[] {
  const visti = new Set<string>();
  return [...candidati].sort(preferenza).filter((c) => {
    const k = `${c.luogo.tipo}|${nomeNormalizzato(c.luogo.nome)}`;
    if (visti.has(k)) return false;
    visti.add(k);
    return true;
  });
}

/** Le attività, a turno tra i 7 stili (ciascuno prende la sua preferita non ancora scelta), fino a `massimo`. */
export function scegliPerStile<T extends { stili: readonly StileViaggio[]; id: string }>(ordinati: readonly T[], massimo: number): T[] {
  const scelte: T[] = [];
  const prese = new Set<string>();
  let progresso = true;
  while (scelte.length < massimo && progresso) {
    progresso = false;
    for (const stile of STILI) {
      if (scelte.length >= massimo) break;
      const prossima = ordinati.find((c) => !prese.has(c.id) && c.stili.includes(stile));
      if (prossima === undefined) continue;
      prese.add(prossima.id);
      scelte.push(prossima);
      progresso = true;
    }
  }
  return scelte;
}

/** Fascia di prezzo di un alloggio dai tag `tourism` e `stars` (la classificazione del motore non la ricava per gli alloggi). */
export function fasciaAlloggio(tags: Readonly<Record<string, string>>): Costo {
  const tipo = tags["tourism"];
  if (tipo === "hostel" || tipo === "motel") return "€";
  const stelle = Number.parseInt(tags["stars"] ?? "", 10);
  if (Number.isFinite(stelle)) return stelle <= 2 ? "€" : stelle === 3 ? "€€" : "€€€";
  return tipo === "guest_house" ? "€" : "€€";
}

function scegliRistoranti(ordinati: readonly Candidato[]): Candidato[] {
  const scelti: Candidato[] = [];
  const prendi = (condizione: (c: Candidato) => boolean, quanti: number): void => {
    for (let i = 0; i < quanti && scelti.length < MASSIMO_RISTORANTI; i++) {
      const c = ordinati.find((x) => !scelti.includes(x) && condizione(x));
      if (c === undefined) return;
      scelti.push(c);
    }
  };
  const offre = (opzione: "vegetariano" | "senza_glutine") => (c: Candidato) => c.luogo.opzioniAlimentari?.includes(opzione) === true;
  prendi(offre("vegetariano"), 2);
  if (!scelti.some(offre("senza_glutine"))) prendi(offre("senza_glutine"), 1);
  const conta = (pasto: "pranzo" | "cena"): number => scelti.filter((c) => adattoAlPasto(c.luogo.apertura, pasto)).length;
  prendi((c) => adattoAlPasto(c.luogo.apertura, "pranzo"), Math.max(0, 3 - conta("pranzo")));
  prendi((c) => adattoAlPasto(c.luogo.apertura, "cena"), Math.max(0, 3 - conta("cena")));
  prendi(() => true, MASSIMO_RISTORANTI);
  return scelti;
}

function scegliAlloggi(ordinati: readonly Candidato[]): Candidato[] {
  const scelti: Candidato[] = [];
  for (const fascia of ["€", "€€", "€€€"] as const) {
    const c = ordinati.find((x) => !scelti.includes(x) && x.luogo.costoIndicativo === fascia);
    if (c !== undefined) scelti.push(c);
  }
  for (const c of ordinati) if (scelti.length < MASSIMO_ALLOGGI && !scelti.includes(c)) scelti.push(c);
  return scelti;
}

const piuVicino = (candidati: readonly Candidato[]): Candidato[] =>
  [...candidati].sort((a, b) => a.km - b.km || confronta(a.luogo.id, b.luogo.id)).slice(0, 1);

// --- 4–5. Descrizioni e immagini ---------------------------------------------------------------------

interface Voce {
  fonte: "wikipedia" | "wikivoyage";
  lingua: string;
  titolo: string;
}

/** Legge un tag `wikipedia`/`wikivoyage` nella forma `lingua:Titolo`. */
function leggiVoce(valore: string | undefined, fonte: Voce["fonte"]): Voce | null {
  const parti = valore === undefined ? null : /^([a-z]{2,3}):(.+)$/.exec(valore.trim());
  if (parti === null || parti[1] === undefined || parti[2] === undefined) return null;
  return { fonte, lingua: parti[1], titolo: parti[2].replace(/_/g, " ").trim() };
}

const apiWiki = (v: Pick<Voce, "fonte" | "lingua">): string => `https://${v.lingua}.${v.fonte}.org/w/api.php`;

function aBlocchi<T>(elenco: readonly T[], dimensione: number): T[][] {
  const blocchi: T[][] = [];
  for (let i = 0; i < elenco.length; i += dimensione) blocchi.push(elenco.slice(i, i + dimensione));
  return blocchi;
}

/** Le pagine di una risposta MediaWiki (formatversion 2) per titolo richiesto, seguendo normalizzazioni e rinvii. */
function paginePerTitolo(corpo: unknown, richiesti: readonly string[]): Map<string, Oggetto> {
  const risultato = new Map<string, Oggetto>();
  const query = eOggetto(corpo) && eOggetto(corpo["query"]) ? corpo["query"] : {};
  const mappa = (chiave: string): Map<string, string> =>
    new Map(
      (Array.isArray(query[chiave]) ? query[chiave] : [])
        .filter(eOggetto)
        .map((r) => [String(r["from"]), String(r["to"])] as [string, string]),
    );
  const normalizzati = mappa("normalized");
  const rinvii = mappa("redirects");
  const pagine = new Map(
    (Array.isArray(query["pages"]) ? query["pages"] : [])
      .filter(eOggetto)
      .map((p) => [String(p["title"]), p] as [string, Oggetto]),
  );
  for (const titolo of richiesti) {
    let t = normalizzati.get(titolo) ?? titolo;
    t = rinvii.get(t) ?? t;
    const pagina = pagine.get(t);
    if (pagina !== undefined && pagina["missing"] !== true && pagina["invalid"] !== true) risultato.set(titolo, pagina);
  }
  return risultato;
}

/** La prima frase (o le prime due, se la prima è corta) di un estratto, senza parentesi. */
export function fraseBreve(estratto: string): string | null {
  const pulito = estratto
    .replace(/\s*\([^()]*\)/g, "")
    .replace(/\s*\[[^\]]*\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (pulito.length < 20) return null;
  const frasi = pulito.match(/[^.!?]+[.!?]+(\s|$)/g)?.map((f) => f.trim()) ?? [pulito];
  let testo = frasi[0] ?? pulito;
  if (testo.length < 60 && frasi[1] !== undefined) testo = `${testo} ${frasi[1]}`;
  return testo.length > 300 ? `${testo.slice(0, 297).replace(/\s+\S*$/, "")}…` : testo;
}

interface Descrizione {
  testo: string;
  fonte: string;
  immagine: string | null;
}

async function descrizioni(
  ctx: ContestoCostruzione,
  voci: ReadonlyMap<string, Voce>,
  segnale: AbortSignal | undefined,
): Promise<Map<string, Descrizione>> {
  // Prima si porta ogni voce in italiano (o, se non c'è, in inglese) con i collegamenti tra lingue.
  const finali = new Map<string, Voce>();
  for (const lingua of ["it", "en"] as const) {
    const daTradurre = [...voci.entries()].filter(([id, v]) => !finali.has(id) && v.lingua !== "it" && v.lingua !== lingua);
    const perApi = new Map<string, [string, Voce][]>();
    for (const voce of daTradurre) perApi.set(apiWiki(voce[1]), [...(perApi.get(apiWiki(voce[1])) ?? []), voce]);
    for (const [api, elenco] of [...perApi.entries()].sort(([a], [b]) => confronta(a, b))) {
      for (const blocco of aBlocchi(elenco, 50)) {
        const titoli = [...new Set(blocco.map(([, v]) => v.titolo))].sort(confronta);
        const risposta = await chiedi(
          ctx,
          {
            servizio: blocco[0]?.[1].fonte ?? "wikipedia",
            url: indirizzo(api, { action: "query", format: "json", formatversion: "2", lllang: lingua, prop: "langlinks", redirects: "1", titles: titoli.join("|") }),
          },
          segnale,
        );
        const pagine = paginePerTitolo(risposta?.corpo, titoli);
        for (const [id, v] of blocco) {
          const collegamenti = pagine.get(v.titolo)?.["langlinks"];
          const primo = Array.isArray(collegamenti) ? collegamenti.find(eOggetto) : undefined;
          const titolo = primo?.["title"];
          if (typeof titolo === "string" && titolo !== "") finali.set(id, { fonte: v.fonte, lingua, titolo });
        }
      }
    }
  }
  for (const [id, v] of voci) if (!finali.has(id) && (v.lingua === "it" || v.lingua === "en")) finali.set(id, v);

  const risultato = new Map<string, Descrizione>();
  const perApi = new Map<string, [string, Voce][]>();
  for (const voce of finali.entries()) perApi.set(apiWiki(voce[1]), [...(perApi.get(apiWiki(voce[1])) ?? []), voce]);
  for (const [api, elenco] of [...perApi.entries()].sort(([a], [b]) => confronta(a, b))) {
    // TextExtracts dà al massimo 20 estratti per richiesta.
    for (const blocco of aBlocchi([...elenco].sort(([a], [b]) => confronta(a, b)), 20)) {
      const titoli = [...new Set(blocco.map(([, v]) => v.titolo))].sort(confronta);
      const risposta = await chiedi(
        ctx,
        {
          servizio: blocco[0]?.[1].fonte ?? "wikipedia",
          url: indirizzo(api, {
            action: "query",
            exintro: "1",
            exlimit: "20",
            explaintext: "1",
            exsentences: "2",
            format: "json",
            formatversion: "2",
            piprop: "name",
            prop: "extracts|pageimages",
            redirects: "1",
            titles: titoli.join("|"),
          }),
        },
        segnale,
      );
      const pagine = paginePerTitolo(risposta?.corpo, titoli);
      for (const [id, v] of blocco) {
        const pagina = pagine.get(v.titolo);
        const estratto = pagina?.["extract"];
        const testo = typeof estratto === "string" ? fraseBreve(estratto) : null;
        if (pagina === undefined || testo === null) continue;
        const titolo = typeof pagina["title"] === "string" ? pagina["title"] : v.titolo;
        const nomeFonte = v.fonte === "wikipedia" ? "Wikipedia" : "Wikivoyage";
        const immagine = typeof pagina["pageimage"] === "string" ? pagina["pageimage"] : null;
        risultato.set(id, {
          testo,
          fonte: `${nomeFonte} (${v.lingua}), voce "${titolo}", CC BY-SA 4.0: https://${v.lingua}.${v.fonte}.org/wiki/${encodeURIComponent(titolo.replace(/ /g, "_"))}`,
          immagine: v.fonte === "wikipedia" ? immagine : null,
        });
      }
    }
  }
  return risultato;
}

/** Il nome di un file di Commons dai tag `wikimedia_commons` o `image`, senza il prefisso `File:`. */
function fileDaTag(tags: Readonly<Record<string, string>>): string | null {
  const commons = tags["wikimedia_commons"];
  if (commons !== undefined && /^File:/i.test(commons)) return commons.replace(/^File:/i, "").replace(/_/g, " ").trim();
  const immagine = tags["image"];
  const parti = immagine === undefined ? null : /commons\.wikimedia\.org\/wiki\/File:([^?#]+)/i.exec(immagine);
  if (parti?.[1] !== undefined) {
    try {
      return decodeURIComponent(parti[1]).replace(/_/g, " ").trim();
    } catch {
      return null;
    }
  }
  return null;
}

/** Testo semplice da un campo HTML di Commons (per esempio l'autore). */
function testoSemplice(html: unknown): string {
  if (typeof html !== "string") return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function immagini(
  ctx: ContestoCostruzione,
  file: ReadonlyMap<string, string>,
  segnale: AbortSignal | undefined,
): Promise<Map<string, ImmagineIstantanea>> {
  const risultato = new Map<string, ImmagineIstantanea>();
  const titoli = [...new Set(file.values())].sort(confronta);
  const trovate = new Map<string, ImmagineIstantanea>();
  for (const blocco of aBlocchi(titoli, 50)) {
    const richiesti = blocco.map((t) => `File:${t}`);
    const risposta = await chiedi(
      ctx,
      {
        servizio: "commons",
        url: indirizzo(COMMONS_API, {
          action: "query",
          format: "json",
          formatversion: "2",
          iiextmetadatafilter: "Artist|LicenseShortName|LicenseUrl|NonFree",
          iiprop: "url|extmetadata",
          iiurlwidth: "800",
          prop: "imageinfo",
          redirects: "1",
          titles: richiesti.join("|"),
        }),
      },
      segnale,
    );
    const pagine = paginePerTitolo(risposta?.corpo, richiesti);
    for (const titolo of blocco) {
      const info = pagine.get(`File:${titolo}`)?.["imageinfo"];
      const primo = Array.isArray(info) ? info.find(eOggetto) : undefined;
      if (primo === undefined) continue;
      const meta = eOggetto(primo["extmetadata"]) ? primo["extmetadata"] : {};
      const valore = (k: string): string => testoSemplice(eOggetto(meta[k]) ? meta[k]["value"] : undefined);
      const autore = valore("Artist");
      const licenza = valore("LicenseShortName");
      const grezzo = typeof primo["thumburl"] === "string" ? primo["thumburl"] : primo["url"];
      // Senza i parametri di tracciamento (`utm_…`) che Commons aggiunge alle miniature.
      const percorso = typeof grezzo === "string" ? grezzo.replace(/\?utm_[^#]*$/, "") : undefined;
      if (autore === "" || licenza === "" || typeof percorso !== "string" || valore("NonFree") === "true") continue;
      const urlLicenza = valore("LicenseUrl");
      const urlFonte = typeof primo["descriptionurl"] === "string" ? primo["descriptionurl"] : "";
      trovate.set(titolo, {
        percorso,
        attribuzione: `${autore}, ${licenza}, via Wikimedia Commons`,
        autore,
        licenza,
        ...(urlLicenza !== "" ? { urlLicenza } : {}),
        ...(urlFonte !== "" ? { urlFonte } : {}),
      });
    }
  }
  for (const [id, titolo] of file) {
    const immagine = trovate.get(titolo);
    if (immagine !== undefined) risultato.set(id, structuredClone(immagine));
  }
  return risultato;
}

// --- 6. Percorsi (OSRM) ------------------------------------------------------------------------------

type Matrice = Map<string, number | null>;
const chiaveCoppia = (a: string, b: string): string => `${a}\u0000${b}`;

async function matrice(
  ctx: ContestoCostruzione,
  base: string,
  luoghi: readonly LuogoEsteso[],
  segnale: AbortSignal | undefined,
): Promise<Matrice> {
  const valori: Matrice = new Map();
  const blocchi = aBlocchi(luoghi, BLOCCO_OSRM);
  for (let i = 0; i < blocchi.length; i++) {
    for (let j = i; j < blocchi.length; j++) {
      const da = blocchi[i] ?? [];
      const a = blocchi[j] ?? [];
      const tutti = i === j ? da : [...da, ...a];
      const coordinate = tutti.map((l) => `${l.coordinate?.lon.toFixed(5)},${l.coordinate?.lat.toFixed(5)}`).join(";");
      const parametri: Record<string, string> = { annotations: "duration" };
      if (i !== j) {
        parametri["sources"] = da.map((_, k) => String(k)).join(";");
        parametri["destinations"] = a.map((_, k) => String(da.length + k)).join(";");
      }
      const risposta = await chiedi(ctx, { servizio: "osrm", url: indirizzo(`${base}${coordinate}`, parametri) }, segnale);
      const durate = risposta !== null && eOggetto(risposta.corpo) && risposta.corpo["code"] === "Ok" ? risposta.corpo["durations"] : undefined;
      if (!Array.isArray(durate)) continue;
      da.forEach((x, r) => {
        const riga = durate[r];
        if (!Array.isArray(riga)) return;
        a.forEach((y, c) => {
          const v = riga[c];
          valori.set(chiaveCoppia(x.id, y.id), typeof v === "number" && Number.isFinite(v) ? v : null);
        });
      });
    }
  }
  return valori;
}

/** Minuti da secondi OSRM: interi, almeno 1 tra due luoghi diversi. */
const minutiDa = (secondi: number): number => Math.max(1, Math.round(secondi / 60));

/** Stima in auto quando OSRM non ha un percorso: distanza in linea d'aria × 1,4 a 40 km/h, più 5 minuti. */
const stimaAuto = (km: number): number => Math.max(1, Math.round(((km * 1.4) / 40) * 60 + 5));

/** Tempo con i mezzi pubblici: stima dichiarata, auto × 1,5 + 10 minuti (REQ-CAT-002). */
export const stimaMezziPubblici = (minutiAuto: number): number => Math.round(minutiAuto * 1.5 + 10);

// --- 7. Minimi e alternative (CA-5) ------------------------------------------------------------------

const ETICHETTE_STILE: Readonly<Record<StileViaggio, string>> = {
  relax: "relax",
  cultura: "cultura",
  natura: "natura",
  avventura: "avventura",
  gastronomia: "gastronomia",
  romantico: "romantico",
  famiglia: "famiglia",
};

/** Le mancanze in parole semplici per il viaggiatore. */
function inParole(mancanze: readonly MancanzaMinimo[]): string {
  const frasi = new Set<string>();
  for (const m of mancanze) {
    if (m.codice === "ATTIVITA_INSUFFICIENTI") frasi.add("poche cose da fare");
    else if (m.codice.startsWith("RISTORANTI") || m.codice === "RISTORANTE_VEGETARIANO_MANCANTE") frasi.add("pochi ristoranti");
    else if (m.codice === "ALLOGGI_INSUFFICIENTI") frasi.add("pochi alloggi");
    else if (m.codice === "FARMACIA_MANCANTE" || m.codice === "OSPEDALE_MANCANTE") frasi.add("servizi essenziali lontani");
    else if (m.codice === "ARRIVO_MANCANTE") frasi.add("nessuna stazione o aeroporto vicino");
    else if (m.codice === "TEMPI_MANCANTI") frasi.add("percorsi non calcolabili");
  }
  return [...frasi].join(", ");
}

async function alternative(ctx: ContestoCostruzione, area: AreaDestinazione, segnale: AbortSignal | undefined): Promise<AreaDestinazione[]> {
  const elementi = (await overpass(ctx, queryLocalitaVicine(area.centro), segnale)) ?? [];
  const proprio = nomeNormalizzato(area.nome);
  return elementi
    .map((e) => {
      const el = comeElemento(e);
      const nome = el?.tags?.["name:it"] ?? el?.tags?.["name"];
      const abitanti = Number.parseInt((el?.tags?.["population"] ?? "").replace(/[.\s]/g, ""), 10);
      if (el === null || nome === undefined || !Number.isFinite(abitanti) || el.lat === undefined || el.lon === undefined) return null;
      const centro = { lat: arrotonda(el.lat), lon: arrotonda(el.lon) };
      return { nome, abitanti, km: distanzaKm(area.centro, centro), area: { id: `osm:${el.type}/${el.id}`, nome, descrizione: `${nome} (${el.tags?.["place"] === "city" ? "città" : "cittadina"}, circa ${abitanti.toLocaleString("it-IT")} abitanti, a ${Math.round(distanzaKm(area.centro, centro))} km)`, centro, osmId: `${el.type}/${el.id}` } };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null && nomeNormalizzato(x.nome) !== proprio && x.km > 2)
    .sort((a, b) => b.abitanti - a.abitanti || a.km - b.km || confronta(a.area.id, b.area.id))
    .slice(0, 3)
    .sort((a, b) => a.km - b.km || confronta(a.area.id, b.area.id))
    .map((x) => x.area);
}

// --- La costruzione --------------------------------------------------------------------------------------

/** Il nome della zona: centro e dintorni della destinazione. */
function zone(area: AreaDestinazione, base: string): [Zona, Zona] {
  const id = base.toUpperCase().replace(/-/g, "_");
  return [
    { id: `${id}_CENTRO`, nome: `${area.nome}, centro`, coordinate: { ...area.centro } },
    { id: `${id}_DINTORNI`, nome: `${area.nome}, dintorni` },
  ];
}

const avanza = (opzioni: OpzioniCostruzione, passo: PassoCostruzione): void => {
  opzioni.segnale?.throwIfAborted();
  opzioni.avanzamento?.({
    passo,
    messaggio: MESSAGGI_AVANZAMENTO[passo],
    numero: PASSI_COSTRUZIONE.indexOf(passo) + 1,
    totale: PASSI_COSTRUZIONE.length,
  });
};

const ordinaPerId = <T extends { id: string }>(elenco: T[]): T[] => elenco.sort((a, b) => confronta(a.id, b.id));

/** Costruisce l'istantanea di un'area con le fonti reali (vedi l'intestazione del modulo). */
export async function costruisciDaFonti(
  ctx: ContestoCostruzione,
  area: AreaDestinazione,
  opzioni: OpzioniCostruzione = {},
): Promise<EsitoCostruzione> {
  const { segnale } = opzioni;
  const precaricata = destinazionePrecaricata(area.id);
  const dataCreazione = ctx.dataCreazione();
  const base = precaricata?.idBase ?? (inTrattini(area.nome) || "destinazione");
  const destinazione = precaricata?.destinazione ?? area.nome;

  try {
    // 1. Luoghi
    avanza(opzioni, "luoghi");
    const grezzi = await overpass(ctx, queryOverpass(area.centro), segnale);
    if (grezzi === null) throw new FonteNonDisponibile("Overpass");
    const visti = new Set<string>();
    const elementi = grezzi
      .map(comeElemento)
      .filter((e): e is ElementoOsm => e !== null)
      .filter((e) => {
        const k = `${e.type}/${e.id}`;
        if (visti.has(k)) return false;
        visti.add(k);
        return true;
      });

    // 2. Classificazione e scelta delle attività
    avanza(opzioni, "classificazione");
    const [centro, dintorni] = zone(area, base);
    const candidati: Candidato[] = [];
    for (const elemento of elementi) {
      const km = distanzaKm(area.centro, { lat: elemento.lat ?? 0, lon: elemento.lon ?? 0 });
      const classificato = classificaLuogoOsm(
        { ...elemento, lat: arrotonda(elemento.lat ?? 0), lon: arrotonda(elemento.lon ?? 0) },
        km <= RAGGIO_VICINO_KM ? centro.id : dintorni.id,
      );
      if (classificato === null || classificato.luogo.tipo === "negozio") continue;
      const tags = elemento.tags ?? {};
      const luogo = classificato.luogo;
      if (luogo.tipo === "alloggio") luogo.costoIndicativo = fasciaAlloggio(tags);
      const lontano = luogo.tipo === "stazione" || luogo.tipo === "aeroporto" ? RAGGIO_ARRIVO_KM : RAGGIO_KM;
      if (km > lontano) continue;
      candidati.push({
        elemento,
        luogo,
        attivita: classificato.attivita,
        regola: classificato.regola,
        km,
        conWiki: tags["wikipedia"] !== undefined || tags["wikidata"] !== undefined,
      });
    }
    const conAttivita = senzaDoppioni(candidati.filter((c) => c.attivita !== null && c.attivita.categoria !== "pasto"));
    const scelteAttivita = scegliPerStile(
      conAttivita.map((c) => ({ id: c.luogo.id, stili: c.attivita?.stili ?? [], c })),
      Math.min(ATTIVITA_SCELTE, MASSIMO_ATTIVITA),
    ).map((x) => x.c);

    // 3. Ristoranti, alloggi e servizi
    avanza(opzioni, "ristoranti");
    const di = (tipo: LuogoEsteso["tipo"]): Candidato[] => senzaDoppioni(candidati.filter((c) => c.luogo.tipo === tipo));
    const ristoranti = scegliRistoranti(di("ristorante"));
    const alloggi = scegliAlloggi(di("alloggio"));
    const servizi = [...piuVicino(di("farmacia")), ...piuVicino(di("ospedale")), ...piuVicino(di("stazione")), ...piuVicino(di("aeroporto"))];
    const scelti = [...scelteAttivita, ...ristoranti, ...alloggi, ...servizi];

    const luoghi: LuogoEsteso[] = ordinaPerId(scelti.map((c) => structuredClone(c.luogo)));
    let attivita: AttivitaIstantanea[] = ordinaPerId(
      scelti.flatMap((c) => (c.attivita === null ? [] : [structuredClone(c.attivita) as AttivitaIstantanea])),
    );
    const zoneUsate = [centro, dintorni].filter((z) => luoghi.some((l) => l.zonaId === z.id));

    const stiliScarsi: StileScarso[] = STILI.flatMap((stile) => {
      const quante = attivita.filter((a) => a.categoria !== "pasto" && a.stili?.includes(stile) === true).length;
      return quante >= 2
        ? []
        : [{ stile, motivo: `nei dati di OpenStreetMap entro circa 60 minuti da ${area.nome} ci sono solo ${quante} luoghi adatti allo stile "${ETICHETTE_STILE[stile]}"` }];
    });

    const fonti: FonteIstantaneaDestinazione[] = [{ nome: "OpenStreetMap", attribuzione: ATTRIBUZIONE_OSM, licenza: "ODbL 1.0" }];
    const componi = (tempi: TempoPercorrenzaIstantanea[]): IstantaneaDestinazione => ({
      formato: VERSIONE_FORMATO,
      id: `${base}-${dataCreazione}`,
      destinazione,
      area: structuredClone(area),
      dataCreazione,
      fonti,
      ...(stiliScarsi.length > 0 ? { stiliScarsi } : {}),
      zone: zoneUsate,
      luoghi,
      attivita,
      tempiPercorrenza: tempi,
    });

    // Prima di chiedere descrizioni, immagini e percorsi: se mancano già altri minimi la destinazione è troppo piccola.
    const provvisoria = controllaMinimi(componi([])).mancanze.filter((m) => m.codice !== "TEMPI_MANCANTI");
    if (provvisoria.length > 0) {
      avanza(opzioni, "minimi");
      return await troppoPiccola(ctx, area, provvisoria, segnale);
    }

    // 4. Descrizioni
    avanza(opzioni, "descrizioni");
    const voci = new Map<string, Voce>();
    const fileImmagini = new Map<string, string>();
    for (const c of scelti) {
      if (c.attivita === null) continue;
      const tags = c.elemento.tags ?? {};
      const voce = leggiVoce(tags["wikipedia"], "wikipedia") ?? leggiVoce(tags["wikivoyage"], "wikivoyage");
      if (voce !== null) voci.set(c.attivita.id, voce);
      const file = fileDaTag(tags);
      if (file !== null) fileImmagini.set(c.attivita.id, file);
    }
    const testi = await descrizioni(ctx, voci, segnale);
    const fontiDescrizioni = new Set<string>();
    attivita = attivita.map((a) => {
      const d = testi.get(a.id);
      if (d === undefined) return a;
      fontiDescrizioni.add(d.fonte.startsWith("Wikipedia") ? "Wikipedia" : "Wikivoyage");
      const luogo = luoghi.find((l) => l.id === a.luogoId);
      if (luogo !== undefined) luogo.fonteDescrizione = d.fonte;
      if (d.immagine !== null && !fileImmagini.has(a.id)) fileImmagini.set(a.id, d.immagine.replace(/_/g, " "));
      return { ...a, descrizioneBreve: d.testo };
    });
    for (const nome of ["Wikipedia", "Wikivoyage"]) {
      if (fontiDescrizioni.has(nome)) {
        fonti.push({ nome, attribuzione: `Descrizioni da ${nome}, con la voce citata in ogni luogo`, licenza: "CC BY-SA 4.0" });
      }
    }

    // 5. Immagini
    avanza(opzioni, "immagini");
    const foto = await immagini(ctx, fileImmagini, segnale);
    attivita = attivita.map((a) => {
      const immagine = foto.get(a.id);
      if (immagine === undefined) return a;
      const luogo = luoghi.find((l) => l.id === a.luogoId);
      if (luogo !== undefined) luogo.attribuzioneImmagine = immagine.attribuzione;
      return { ...a, immagine };
    });
    if (foto.size > 0) fonti.push({ nome: "Wikimedia Commons", attribuzione: "Immagini da Wikimedia Commons, con autore e licenza su ogni immagine" });

    // 6. Percorsi
    avanza(opzioni, "percorsi");
    const coppie = coppieUsabili({ luoghi, attivita });
    const nelleCoppie = new Set(coppie.flat());
    const perPercorsi = luoghi.filter((l) => nelleCoppie.has(l.id) && l.coordinate !== undefined);
    const auto = await matrice(ctx, OSRM_AUTO, perPercorsi, segnale);
    const piedi = await matrice(ctx, OSRM_PIEDI, perPercorsi, segnale);
    const perId = new Map(luoghi.map((l) => [l.id, l]));
    const tempi: TempoPercorrenzaIstantanea[] = [];
    let stimeAuto = 0;
    for (const [a, b] of coppie) {
      const secondiAuto = auto.get(chiaveCoppia(a, b)) ?? auto.get(chiaveCoppia(b, a)) ?? null;
      let minutiAuto: number;
      if (secondiAuto !== null) {
        minutiAuto = minutiDa(secondiAuto);
        tempi.push({ da: a, a: b, mezzo: "auto", minuti: minutiAuto });
      } else {
        const ca = perId.get(a)?.coordinate;
        const cb = perId.get(b)?.coordinate;
        minutiAuto = stimaAuto(ca !== undefined && cb !== undefined ? distanzaKm(ca, cb) : RAGGIO_KM);
        tempi.push({ da: a, a: b, mezzo: "auto", minuti: minutiAuto, stima: true });
        stimeAuto++;
      }
      const secondiPiedi = piedi.get(chiaveCoppia(a, b)) ?? piedi.get(chiaveCoppia(b, a)) ?? null;
      if (secondiPiedi !== null && minutiDa(secondiPiedi) <= MASSIMO_MINUTI_A_PIEDI) {
        tempi.push({ da: a, a: b, mezzo: "piedi", minuti: minutiDa(secondiPiedi) });
      }
      tempi.push({ da: a, a: b, mezzo: "mezzi_pubblici", minuti: stimaMezziPubblici(minutiAuto), stima: true });
    }
    if (auto.size > 0 || piedi.size > 0) {
      fonti.push({ nome: "OSRM", attribuzione: `Tempi a piedi e in auto calcolati con OSRM su dati ${ATTRIBUZIONE_OSM}${stimeAuto > 0 ? `; ${stimeAuto} tempi in auto stimati in linea d'aria` : ""}; tempi con i mezzi pubblici stimati (auto × 1,5 + 10 minuti)` });
    } else {
      fonti.push({ nome: "Stima dei tempi", attribuzione: "OSRM non ha risposto: tempi stimati dalla distanza in linea d'aria; mezzi pubblici auto × 1,5 + 10 minuti" });
    }

    // 7. Minimi
    avanza(opzioni, "minimi");
    const istantanea = componi(tempi);
    const minimi = controllaMinimi(istantanea);
    if (!minimi.rispettati) return await troppoPiccola(ctx, area, minimi.mancanze, segnale);
    const letta = leggiIstantanea(JSON.parse(JSON.stringify(istantanea)) as unknown);
    if (!letta.ok) throw new Error(`istantanea costruita non valida: ${letta.errori.map((e) => e.messaggio).join("; ")}`);
    return { ok: true, istantanea: letta.istantanea };
  } catch (errore) {
    if (errore instanceof FonteNonDisponibile) {
      return {
        ok: false,
        motivo: "non_disponibile",
        messaggio: `Non riesco a raggiungere OpenStreetMap in questo momento, quindi non posso preparare ${area.nome}. Riprova tra qualche minuto.`,
      };
    }
    throw errore;
  }
}

async function troppoPiccola(
  ctx: ContestoCostruzione,
  area: AreaDestinazione,
  mancanze: MancanzaMinimo[],
  segnale: AbortSignal | undefined,
): Promise<EsitoCostruzione> {
  const vicine = await alternative(ctx, area, segnale);
  const elenco = vicine.map((v) => v.nome);
  const proposta =
    elenco.length === 0
      ? "Prova con una città più grande qui vicino."
      : `Ti propongo ${elenco.length === 1 ? elenco[0] : `${elenco.slice(0, -1).join(", ")} o ${elenco[elenco.length - 1]}`}: ${elenco.length === 1 ? "è vicina e ha" : "sono vicine e hanno"} più cose da fare.`;
  return {
    ok: false,
    motivo: "minimi_non_rispettati",
    messaggio: `Mi dispiace, per ${area.nome} ho trovato troppo pochi luoghi per un itinerario completo (${inParole(mancanze)}). ${proposta}`,
    mancanze,
    alternative: vicine,
  };
}
