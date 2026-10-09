/**
 * La sorgente di destinazioni **registrata** (REQ-CAT-002): legge istantanee e risposte salvate nel repository,
 * senza mai usare la rete (CA-7). Serve ai test e per lavorare senza rete.
 *
 * - `creaSorgenteRegistrata`: la sorgente, da istantanee già lette e ricerche registrate;
 * - `creaSorgenteRegistrataDaFile`: la stessa, dalla cartella delle istantanee e da un file di registrazioni;
 * - `creaClienteRegistrato`: un `ClienteFonti` che risponde con le risposte HTTP salvate, per far girare la
 *   costruzione reale (ST-CAT-002) senza rete.
 */
import { readFileSync } from "node:fs";
import { riepilogoIstantanea, type AreaDestinazione, type IstantaneaDestinazione, type RiepilogoIstantanea } from "./formato.js";
import { leggiCartellaIstantanee } from "./cartella.js";
import { leggiAreaDestinazione } from "./lettore.js";
import { controllaMinimi } from "./minimi.js";
import {
  LIMITE_RICERCA_PREDEFINITO,
  MESSAGGI_AVANZAMENTO,
  PASSI_COSTRUZIONE,
  SERVIZI_FONTE,
  type ClienteFonti,
  type EsitoCostruzione,
  type OpzioniCostruzione,
  type OpzioniRicerca,
  type RichiestaFonte,
  type RispostaFonte,
  type SorgenteDestinazioni,
} from "./sorgente.js";

/** La versione del formato del file di registrazioni. */
export const VERSIONE_REGISTRAZIONI = 1 as const;

/** Una ricerca registrata: il testo cercato e i risultati che la ricerca ha dato. */
export interface RicercaRegistrata {
  testo: string;
  risultati: AreaDestinazione[];
}

/** Una risposta HTTP registrata: la richiesta e la risposta del servizio. */
export interface RispostaRegistrata {
  richiesta: RichiestaFonte;
  risposta: RispostaFonte;
}

/** Il contenuto di un file di registrazioni (`{ "formato": 1, "ricerche": [...], "risposte": [...] }`). */
export interface Registrazioni {
  ricerche: RicercaRegistrata[];
  risposte: RispostaRegistrata[];
}

/** File di registrazioni non valido, oppure una richiesta che non è stata registrata. */
export class ErroreRegistrazioni extends Error {
  override readonly name = "ErroreRegistrazioni";
  readonly errori: readonly string[];

  constructor(errori: readonly string[]) {
    super(`registrazioni non valide: ${errori.join("; ")}`);
    this.errori = errori;
  }
}

/** Richiesta senza risposta registrata: la sorgente registrata non va mai in rete al suo posto. */
export class ErroreRispostaNonRegistrata extends Error {
  override readonly name = "ErroreRispostaNonRegistrata";
  readonly richiesta: RichiestaFonte;

  constructor(richiesta: RichiestaFonte) {
    super(`nessuna risposta registrata per ${richiesta.metodo ?? "GET"} ${richiesta.url} (${richiesta.servizio}): la sorgente registrata non usa la rete`);
    this.richiesta = richiesta;
  }
}

/**
 * Testo di ricerca normalizzato: minuscole, senza accenti, spazi singoli. Così "Città" e "citta " sono la stessa
 * ricerca, in modo deterministico e indipendente dalla lingua del sistema.
 */
export function normalizzaRicerca(testo: string): string {
  return testo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Lunghezza minima del testo (normalizzato) perché una ricerca dia risultati. */
export const LUNGHEZZA_MINIMA_RICERCA = 2;

export interface OpzioniSorgenteRegistrata {
  /** Le istantanee, già lette e validate (per esempio con `leggiCartellaIstantanee`). */
  istantanee: readonly IstantaneaDestinazione[];
  /** Le ricerche registrate; senza una registrazione si cerca tra le aree delle istantanee. */
  ricerche?: readonly RicercaRegistrata[];
}

const rifiutaSeAnnullato = (segnale: AbortSignal | undefined): void => segnale?.throwIfAborted();

/** Distanza approssimata in chilometri tra due punti (formula dell'emisenoverso). */
function distanzaKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** La più recente tra le istantanee di un'area: data di creazione più alta, a parità l'identificativo più alto. */
function piuRecente(istantanee: readonly IstantaneaDestinazione[]): IstantaneaDestinazione | undefined {
  return [...istantanee].sort((x, y) =>
    x.dataCreazione === y.dataCreazione ? (x.id < y.id ? 1 : -1) : x.dataCreazione < y.dataCreazione ? 1 : -1,
  )[0];
}

/** Quante destinazioni alternative propone la sorgente registrata per un'area troppo piccola. */
const ALTERNATIVE_MASSIME = 3;

/**
 * Crea la sorgente registrata. Non usa la rete e non legge l'orologio: stesso input, stesso risultato.
 * Restituisce sempre copie, così chi le riceve non può cambiare le istantanee della sorgente.
 * @throws Error se due istantanee hanno lo stesso identificativo.
 */
export function creaSorgenteRegistrata(opzioni: OpzioniSorgenteRegistrata): SorgenteDestinazioni {
  const istantanee = opzioni.istantanee.map((i) => structuredClone(i));
  const perId = new Map<string, IstantaneaDestinazione>();
  for (const istantanea of istantanee) {
    if (perId.has(istantanea.id)) throw new Error(`istantanea registrata ripetuta: "${istantanea.id}"`);
    perId.set(istantanea.id, istantanea);
  }
  const ricerche = new Map<string, AreaDestinazione[]>();
  for (const ricerca of opzioni.ricerche ?? []) ricerche.set(normalizzaRicerca(ricerca.testo), structuredClone(ricerca.risultati));

  // Le aree note, una per identificativo, prese dall'istantanea più recente.
  const perArea = new Map<string, IstantaneaDestinazione[]>();
  for (const istantanea of istantanee) perArea.set(istantanea.area.id, [...(perArea.get(istantanea.area.id) ?? []), istantanea]);
  const aree = [...perArea.values()]
    .map((elenco) => piuRecente(elenco))
    .filter((i): i is IstantaneaDestinazione => i !== undefined)
    .map((i) => ({ area: i.area, testo: normalizzaRicerca(`${i.area.nome} ${i.area.descrizione} ${i.destinazione}`) }));

  return {
    tipo: "registrata",

    async cercaDestinazioni(testo: string, opzioniRicerca: OpzioniRicerca = {}): Promise<AreaDestinazione[]> {
      rifiutaSeAnnullato(opzioniRicerca.segnale);
      const limite = opzioniRicerca.limite ?? LIMITE_RICERCA_PREDEFINITO;
      const cercato = normalizzaRicerca(testo);
      if (cercato.length < LUNGHEZZA_MINIMA_RICERCA || limite <= 0) return [];
      const registrata = ricerche.get(cercato);
      if (registrata !== undefined) return structuredClone(registrata.slice(0, limite));
      const nome = (a: AreaDestinazione): string => normalizzaRicerca(a.nome);
      return aree
        .filter((voce) => voce.testo.includes(cercato))
        .map((voce) => voce.area)
        .sort((x, y) => {
          const inizioX = nome(x).startsWith(cercato) ? 0 : 1;
          const inizioY = nome(y).startsWith(cercato) ? 0 : 1;
          if (inizioX !== inizioY) return inizioX - inizioY;
          if (nome(x) !== nome(y)) return nome(x) < nome(y) ? -1 : 1;
          return x.id < y.id ? -1 : x.id > y.id ? 1 : 0;
        })
        .slice(0, limite)
        .map((area) => structuredClone(area));
    },

    async costruisciIstantanea(area: AreaDestinazione, opzioniCostruzione: OpzioniCostruzione = {}): Promise<EsitoCostruzione> {
      const { segnale, avanzamento } = opzioniCostruzione;
      rifiutaSeAnnullato(segnale);
      const trovata = piuRecente(perArea.get(area.id) ?? []);
      if (trovata === undefined) {
        const note = [...new Set(istantanee.map((i) => i.destinazione))].sort();
        const elenco = note.length === 0 ? "nessuna" : note.join(", ");
        return {
          ok: false,
          motivo: "non_disponibile",
          messaggio: `${area.nome} non è tra le destinazioni registrate: senza rete posso preparare solo ${elenco}.`,
        };
      }
      PASSI_COSTRUZIONE.forEach((passo, i) => {
        rifiutaSeAnnullato(segnale);
        avanzamento?.({ passo, messaggio: MESSAGGI_AVANZAMENTO[passo], numero: i + 1, totale: PASSI_COSTRUZIONE.length });
      });
      const minimi = controllaMinimi(trovata);
      if (!minimi.rispettati) {
        const alternative = istantanee
          .filter((i) => i.area.id !== area.id && controllaMinimi(i).rispettati)
          .map((i) => ({ area: i.area, km: distanzaKm(area.centro, i.area.centro) }))
          .sort((x, y) => x.km - y.km || (x.area.id < y.area.id ? -1 : 1))
          .filter((voce, i, tutte) => tutte.findIndex((altra) => altra.area.id === voce.area.id) === i)
          .slice(0, ALTERNATIVE_MASSIME)
          .map((voce) => structuredClone(voce.area));
        return {
          ok: false,
          motivo: "minimi_non_rispettati",
          messaggio: `Mi dispiace, ${area.nome} non ha abbastanza luoghi per un itinerario completo.`,
          mancanze: minimi.mancanze,
          alternative,
        };
      }
      return { ok: true, istantanea: structuredClone(trovata) };
    },

    async leggiIstantanea(id: string): Promise<IstantaneaDestinazione | null> {
      const trovata = perId.get(id);
      return trovata === undefined ? null : structuredClone(trovata);
    },

    async elencaIstantanee(): Promise<RiepilogoIstantanea[]> {
      return [...perId.values()]
        .map((i) => structuredClone(riepilogoIstantanea(i)))
        .sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
    },
  };
}

/**
 * Crea la sorgente registrata dai file del repository: le istantanee della cartella (validate, minimi compresi) e,
 * se indicato, il file di registrazioni con le ricerche.
 * @throws ErroreCartellaIstantanee o ErroreRegistrazioni se i file non sono validi.
 */
export function creaSorgenteRegistrataDaFile(cartellaIstantanee: string, fileRegistrazioni?: string): SorgenteDestinazioni {
  const istantanee = leggiCartellaIstantanee(cartellaIstantanee).map((voce) => voce.istantanea);
  const ricerche = fileRegistrazioni === undefined ? [] : leggiFileRegistrazioni(fileRegistrazioni).ricerche;
  return creaSorgenteRegistrata({ istantanee, ricerche });
}

/** Legge un file di registrazioni dal disco. @throws ErroreRegistrazioni */
export function leggiFileRegistrazioni(file: string): Registrazioni {
  let testo: string;
  try {
    testo = readFileSync(file, "utf8");
  } catch (errore) {
    throw new ErroreRegistrazioni([`il file ${file} non si può leggere (${(errore as Error).message})`]);
  }
  return leggiRegistrazioni(testo);
}

type Oggetto = Record<string, unknown>;
const eOggetto = (v: unknown): v is Oggetto => typeof v === "object" && v !== null && !Array.isArray(v);
const eTesto = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";

/**
 * Legge e valida il contenuto di un file di registrazioni (testo JSON o valore già decodificato).
 * @throws ErroreRegistrazioni con tutti i problemi trovati.
 */
export function leggiRegistrazioni(json: unknown): Registrazioni {
  let dati = json;
  if (typeof json === "string") {
    try {
      dati = JSON.parse(json) as unknown;
    } catch (errore) {
      throw new ErroreRegistrazioni([`il testo non è JSON valido (${(errore as Error).message})`]);
    }
  }
  if (!eOggetto(dati)) throw new ErroreRegistrazioni(["il contenuto deve essere un oggetto con formato, ricerche e risposte"]);
  const errori: string[] = [];
  if (dati["formato"] !== VERSIONE_REGISTRAZIONI) {
    errori.push(`formato: deve essere ${VERSIONE_REGISTRAZIONI} (valore trovato: ${JSON.stringify(dati["formato"]) ?? "assente"})`);
  }
  const elenco = (chiave: string): unknown[] => {
    const valore = dati[chiave];
    if (valore === undefined) return [];
    if (Array.isArray(valore)) return valore;
    errori.push(`${chiave}: deve essere un elenco`);
    return [];
  };

  const ricerche: RicercaRegistrata[] = [];
  const testiVisti = new Set<string>();
  elenco("ricerche").forEach((voce, i) => {
    const dove = `ricerche[${i}]`;
    if (!eOggetto(voce) || !eTesto(voce["testo"]) || !Array.isArray(voce["risultati"])) {
      errori.push(`${dove}: deve essere un oggetto con "testo" (non vuoto) e "risultati" (elenco di aree)`);
      return;
    }
    const chiave = normalizzaRicerca(voce["testo"]);
    if (testiVisti.has(chiave)) errori.push(`${dove}: la ricerca "${voce["testo"]}" è già registrata`);
    testiVisti.add(chiave);
    const risultati: AreaDestinazione[] = [];
    voce["risultati"].forEach((risultato, j) => {
      const letta = leggiAreaDestinazione(risultato, `${dove}.risultati[${j}]`);
      if (letta.ok) risultati.push(letta.area);
      else errori.push(...letta.errori.map((e) => e.messaggio));
    });
    ricerche.push({ testo: voce["testo"], risultati });
  });

  const risposte: RispostaRegistrata[] = [];
  elenco("risposte").forEach((voce, i) => {
    const dove = `risposte[${i}]`;
    const richiesta = eOggetto(voce) ? voce["richiesta"] : undefined;
    const risposta = eOggetto(voce) ? voce["risposta"] : undefined;
    if (!eOggetto(richiesta) || !eOggetto(risposta)) {
      errori.push(`${dove}: deve essere un oggetto con "richiesta" e "risposta"`);
      return;
    }
    const servizio = SERVIZI_FONTE.find((s) => s === richiesta["servizio"]);
    const { url, metodo, corpo } = richiesta;
    const prima = errori.length;
    if (servizio === undefined) errori.push(`${dove}.richiesta.servizio: valori ammessi ${SERVIZI_FONTE.join(", ")}`);
    if (!eTesto(url)) errori.push(`${dove}.richiesta.url: deve essere un testo non vuoto`);
    if (metodo !== undefined && metodo !== "GET" && metodo !== "POST") errori.push(`${dove}.richiesta.metodo: valori ammessi GET, POST`);
    if (corpo !== undefined && typeof corpo !== "string") errori.push(`${dove}.richiesta.corpo: deve essere un testo`);
    const stato = risposta["stato"];
    if (typeof stato !== "number" || !Number.isInteger(stato) || stato < 100 || stato > 599) {
      errori.push(`${dove}.risposta.stato: deve essere un codice HTTP (100–599)`);
    }
    if (errori.length > prima || servizio === undefined || !eTesto(url) || typeof stato !== "number") return;
    risposte.push({
      richiesta: {
        servizio,
        url,
        ...(metodo === "GET" || metodo === "POST" ? { metodo } : {}),
        ...(typeof corpo === "string" ? { corpo } : {}),
      },
      risposta: { stato, corpo: risposta["corpo"] ?? null },
    });
  });

  if (errori.length > 0) throw new ErroreRegistrazioni(errori);
  return { ricerche, risposte };
}

const chiaveRichiesta = (r: RichiestaFonte): string => JSON.stringify([r.servizio, r.metodo ?? "GET", r.url, r.corpo ?? null]);

/**
 * Un `ClienteFonti` che risponde con le risposte registrate: stessa richiesta (servizio, metodo, indirizzo, corpo),
 * stessa risposta. Una richiesta non registrata è un errore (`ErroreRispostaNonRegistrata`): non si va mai in rete.
 * @throws ErroreRegistrazioni se la stessa richiesta è registrata due volte con risposte diverse.
 */
export function creaClienteRegistrato(risposte: readonly RispostaRegistrata[]): ClienteFonti {
  const perRichiesta = new Map<string, RispostaFonte>();
  for (const { richiesta, risposta } of risposte) {
    const chiave = chiaveRichiesta(richiesta);
    const precedente = perRichiesta.get(chiave);
    if (precedente !== undefined && JSON.stringify(precedente) !== JSON.stringify(risposta)) {
      throw new ErroreRegistrazioni([`la richiesta ${richiesta.metodo ?? "GET"} ${richiesta.url} è registrata due volte con risposte diverse`]);
    }
    perRichiesta.set(chiave, structuredClone(risposta));
  }
  return {
    async richiedi(richiesta: RichiestaFonte, opzioni: { segnale?: AbortSignal } = {}): Promise<RispostaFonte> {
      rifiutaSeAnnullato(opzioni.segnale);
      const risposta = perRichiesta.get(chiaveRichiesta(richiesta));
      if (risposta === undefined) throw new ErroreRispostaNonRegistrata(richiesta);
      return structuredClone(risposta);
    },
  };
}
