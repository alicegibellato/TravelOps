/**
 * Validazione del profilo delle preferenze (§7.2, REQ-PREF-001 CA-2): campi obbligatori, valori ammessi, valori
 * predefiniti e normalizzazione. Non solleva mai eccezioni sui dati ricevuti: o restituisce il profilo completo,
 * o l'elenco di cosa manca e cosa non va, in parole semplici e senza codici tecnici nel testo.
 */
import type { AttivitaCatalogoEstesa, CatalogoEsteso, CategoriaEstesa, StileViaggio } from "../model/index.js";
import { CATEGORIE_ESTESE, numeroDaData, STILI_VIAGGIO } from "../itinerary/valori.js";
import {
  BUDGET,
  CAMPI_PROFILO,
  DURATA_MASSIMA,
  DURATA_MINIMA,
  ESIGENZE,
  ETA_MASSIMA_BAMBINO,
  ETICHETTE_PROFILO,
  FORME_FISICHE,
  gruppoDaViaggiatori,
  MEZZI_PROFILO,
  ORARI_PROFILO,
  PASSO_DEL_CAMPO,
  PROFILO_PREDEFINITO,
  RITMI,
  TIPI_GRUPPO,
  type CampoProfilo,
  type DaEvitare,
  type DateProfilo,
  type DestinazioneProfilo,
  type Irrinunciabili,
  type PastiNelPiano,
  type ProfiloPreferenze,
  type Viaggiatori,
} from "./tipi.js";

/** Un campo che manca o che ha un valore non ammesso. */
export interface ProblemaProfilo {
  campo: CampoProfilo;
  /** `mancante`: un campo obbligatorio senza valore; `non_valido`: un valore presente ma non ammesso. */
  tipo: "mancante" | "non_valido";
  /** Il passo del percorso guidato in cui si corregge (`PASSO_DEL_CAMPO`). */
  passo: 1 | 2 | 3 | 4 | 5;
  /** Cosa manca o cosa non va, in italiano semplice, da mostrare così com'è al viaggiatore. */
  testo: string;
}

/** Esito della validazione: il profilo completo, oppure tutti i problemi nell'ordine dei campi della §7.2. */
export type EsitoProfilo = { ok: true; profilo: ProfiloPreferenze } | { ok: false; problemi: ProblemaProfilo[] };

export interface OpzioniValidazione {
  /**
   * Il catalogo (o l'istantanea) della destinazione. Se c'è, le attività irrinunciabili e da evitare devono
   * esistere nel catalogo e un'irrinunciabile non può rientrare in ciò che è da evitare.
   */
  catalogo?: CatalogoEsteso;
}

type Grezzo = Record<string, unknown>;

const oggetto = (valore: unknown): Grezzo | null =>
  typeof valore === "object" && valore !== null && !Array.isArray(valore) ? (valore as Grezzo) : null;

const assente = (valore: unknown): boolean =>
  valore === undefined || valore === null || (typeof valore === "string" && valore.trim() === "");

const intero = (valore: unknown): valore is number => typeof valore === "number" && Number.isSafeInteger(valore);

/** Elenco in parole: `a, b e c`. */
function elencoInParole(voci: readonly string[]): string {
  if (voci.length <= 1) return voci.join("");
  return `${voci.slice(0, -1).join(", ")} e ${voci[voci.length - 1]}`;
}

/** Raccoglie i problemi e li restituisce nell'ordine dei campi della §7.2. */
class Problemi {
  private readonly voci: ProblemaProfilo[] = [];

  manca(campo: CampoProfilo, testo: string): void {
    this.voci.push({ campo, tipo: "mancante", passo: PASSO_DEL_CAMPO[campo], testo });
  }

  nonValido(campo: CampoProfilo, testo: string): void {
    this.voci.push({ campo, tipo: "non_valido", passo: PASSO_DEL_CAMPO[campo], testo });
  }

  elenco(): ProblemaProfilo[] {
    const posizione = (campo: CampoProfilo): number => CAMPI_PROFILO.indexOf(campo);
    return this.voci
      .map((voce, indice) => ({ voce, indice }))
      .sort((a, b) => posizione(a.voce.campo) - posizione(b.voce.campo) || a.indice - b.indice)
      .map(({ voce }) => voce);
  }
}

// --- Campi obbligatori -----------------------------------------------------------------------------

function leggiDestinazione(valore: unknown, problemi: Problemi): DestinazioneProfilo | null {
  const manca = "Manca la destinazione: scegli dove vuoi andare, oppure lasciati sorprendere.";
  if (assente(valore)) {
    problemi.manca("destinazione", manca);
    return null;
  }
  const grezzo = oggetto(valore);
  if (grezzo?.["tipo"] === "sorprendimi") return { tipo: "sorprendimi" };
  if (grezzo?.["tipo"] === "luogo") {
    const nome = grezzo["nome"];
    if (assente(nome) || typeof nome !== "string") {
      problemi.manca("destinazione", manca);
      return null;
    }
    const riferimento = grezzo["riferimento"];
    if (riferimento === undefined) return { tipo: "luogo", nome: nome.trim() };
    if (typeof riferimento === "string" && riferimento.trim() !== "") {
      return { tipo: "luogo", nome: nome.trim(), riferimento: riferimento.trim() };
    }
  }
  problemi.nonValido("destinazione", "La destinazione scelta non è valida: cercala di nuovo, oppure lasciati sorprendere.");
  return null;
}

const FORMATO_MESE = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Le date e, per le date precise, i giorni da inizio a fine compresi. */
function leggiDate(valore: unknown, problemi: Problemi): { date: DateProfilo; giorni: number | null } | null {
  if (assente(valore)) {
    problemi.manca("date", "Mancano le date: scegli i giorni precisi, oppure il mese e quanti giorni.");
    return null;
  }
  const grezzo = oggetto(valore);
  if (grezzo?.["tipo"] === "precise") {
    const inizio = grezzo["inizio"];
    const fine = grezzo["fine"];
    if (assente(inizio) || assente(fine)) {
      problemi.manca("date", "Mancano le date: indica il giorno di partenza e quello di ritorno.");
      return null;
    }
    const numeroInizio = typeof inizio === "string" ? numeroDaData(inizio) : null;
    const numeroFine = typeof fine === "string" ? numeroDaData(fine) : null;
    if (numeroInizio === null || numeroFine === null) {
      problemi.nonValido("date", "Le date non sono valide: scegli di nuovo il giorno di partenza e quello di ritorno.");
      return null;
    }
    if (numeroFine < numeroInizio) {
      problemi.nonValido("date", "Il giorno di ritorno viene prima di quello di partenza.");
      return null;
    }
    const giorni = numeroFine - numeroInizio + 1;
    if (giorni < DURATA_MINIMA || giorni > DURATA_MASSIMA) {
      problemi.nonValido(
        "date",
        `Tra le date scelte ${giorni === 1 ? "c'è 1 giorno" : `ci sono ${giorni} giorni`}: il viaggio può durare da ${DURATA_MINIMA} a ${DURATA_MASSIMA} giorni.`,
      );
      return null;
    }
    return { date: { tipo: "precise", inizio: inizio as string, fine: fine as string }, giorni };
  }
  if (grezzo?.["tipo"] === "mese") {
    const mese = grezzo["mese"];
    if (assente(mese)) {
      problemi.manca("date", "Manca il mese del viaggio.");
      return null;
    }
    if (typeof mese === "string" && FORMATO_MESE.test(mese)) return { date: { tipo: "mese", mese }, giorni: null };
  }
  problemi.nonValido("date", "Le date non sono valide: scegli i giorni precisi, oppure il mese e quanti giorni.");
  return null;
}

function leggiDurata(valore: unknown, date: { giorni: number | null } | null, problemi: Problemi): number | null {
  const giorniDalleDate = date?.giorni ?? null;
  if (assente(valore)) {
    if (giorniDalleDate !== null) return giorniDalleDate;
    // Senza date basta il problema delle date, che chiede già anche quanti giorni.
    if (date !== null) {
      problemi.manca("durata", `Manca la durata: indica quanti giorni vuoi stare via, da ${DURATA_MINIMA} a ${DURATA_MASSIMA}.`);
    }
    return null;
  }
  if (!intero(valore) || valore < DURATA_MINIMA || valore > DURATA_MASSIMA) {
    problemi.nonValido("durata", `La durata deve essere un numero di giorni da ${DURATA_MINIMA} a ${DURATA_MASSIMA}.`);
    return null;
  }
  if (giorniDalleDate !== null && valore !== giorniDalleDate) {
    problemi.nonValido(
      "durata",
      `La durata di ${valore} giorni non coincide con le date scelte, che ne comprendono ${giorniDalleDate}.`,
    );
    return null;
  }
  return valore;
}

function leggiViaggiatori(valore: unknown, problemi: Problemi): Viaggiatori | null {
  const predefinito = PROFILO_PREDEFINITO.viaggiatori;
  if (assente(valore)) return { adulti: predefinito.adulti, bambini: [] };
  const grezzo = oggetto(valore);
  if (grezzo === null) {
    problemi.nonValido("viaggiatori", "Indica di nuovo quanti adulti e quanti bambini partono.");
    return null;
  }
  let valido = true;
  const adulti = grezzo["adulti"] ?? predefinito.adulti;
  if (!intero(adulti) || adulti < 1) {
    problemi.nonValido("viaggiatori", "Serve almeno un adulto: il numero di adulti deve essere un numero intero, da 1 in su.");
    valido = false;
  }
  const bambini = grezzo["bambini"] ?? [];
  const etaValide =
    Array.isArray(bambini) && bambini.every((eta) => intero(eta) && eta >= 0 && eta <= ETA_MASSIMA_BAMBINO);
  if (!etaValide) {
    problemi.nonValido(
      "viaggiatori",
      `Indica l'età di ogni bambino con un numero intero da 0 a ${ETA_MASSIMA_BAMBINO} anni.`,
    );
    valido = false;
  }
  if (!valido) return null;
  return { adulti: adulti as number, bambini: [...(bambini as number[])].sort((a, b) => a - b) };
}

// --- Campi a scelta --------------------------------------------------------------------------------

/** Un valore tra quelli ammessi; assente vale il predefinito. */
function scelta<T extends string>(
  valore: unknown,
  ammessi: readonly T[],
  predefinito: T,
  campo: CampoProfilo,
  etichette: Readonly<Record<T, string>>,
  problemi: Problemi,
): T | null {
  if (assente(valore)) return predefinito;
  if (typeof valore === "string" && (ammessi as readonly string[]).includes(valore)) return valore as T;
  const nomeCampo = ETICHETTE_PROFILO.campo[campo].toLowerCase();
  problemi.nonValido(
    campo,
    `La scelta per ${nomeCampo} non è tra quelle disponibili: scegli tra ${elencoInParole(ammessi.map((v) => etichette[v]))}.`,
  );
  return null;
}

/**
 * Più valori tra quelli ammessi, senza ripetizioni e nell'ordine canonico. `null` se l'elenco non è valido;
 * `undefined` se è assente (vale il predefinito).
 */
function piuScelte<T extends string>(
  valore: unknown,
  ammessi: readonly T[],
  nonValido: string,
  campo: CampoProfilo,
  problemi: Problemi,
): T[] | null | undefined {
  if (valore === undefined || valore === null) return undefined;
  if (!Array.isArray(valore) || !valore.every((v) => typeof v === "string" && (ammessi as readonly string[]).includes(v))) {
    problemi.nonValido(campo, nonValido);
    return null;
  }
  return ammessi.filter((v) => (valore as unknown[]).includes(v));
}

/** `id` di attività del catalogo: testi non vuoti, senza ripetizioni, in ordine alfabetico (per codice). */
function idAttivita(valore: unknown, nonValido: string, campo: CampoProfilo, problemi: Problemi): string[] | null {
  if (valore === undefined || valore === null) return [];
  if (!Array.isArray(valore) || !valore.every((v) => typeof v === "string" && v.trim() !== "")) {
    problemi.nonValido(campo, nonValido);
    return null;
  }
  const unici = [...new Set((valore as string[]).map((v) => v.trim()))];
  return unici.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

const etichetteStili = (stili: readonly StileViaggio[]): string =>
  elencoInParole(stili.map((s) => ETICHETTE_PROFILO.stile[s]));

const testoStiliNonValidi = `Uno degli stili scelti non è tra quelli disponibili: scegli tra ${etichetteStili(STILI_VIAGGIO)}.`;

function leggiPasti(valore: unknown, problemi: Problemi): PastiNelPiano | null {
  const predefinito = PROFILO_PREDEFINITO.pasti;
  if (assente(valore)) return { ...predefinito };
  const grezzo = oggetto(valore);
  const pranzo = grezzo?.["pranzo"] ?? predefinito.pranzo;
  const cena = grezzo?.["cena"] ?? predefinito.cena;
  if (grezzo === null || typeof pranzo !== "boolean" || typeof cena !== "boolean") {
    problemi.nonValido("pasti", "Indica di nuovo se vuoi il pranzo e la cena nel piano.");
    return null;
  }
  return { pranzo, cena };
}

function leggiIrrinunciabili(valore: unknown, problemi: Problemi): Irrinunciabili | null {
  if (assente(valore)) return { attivita: [], stili: [] };
  const grezzo = oggetto(valore);
  if (grezzo === null) {
    problemi.nonValido("irrinunciabili", "Scegli di nuovo le cose irrinunciabili.");
    return null;
  }
  const attivita = idAttivita(
    grezzo["attivita"],
    "Una delle attività irrinunciabili non è valida: sceglila di nuovo.",
    "irrinunciabili",
    problemi,
  );
  const stili = piuScelte(grezzo["stili"], STILI_VIAGGIO, testoStiliNonValidi, "irrinunciabili", problemi);
  if (attivita === null || stili === null) return null;
  return { attivita, stili: stili ?? [] };
}

function leggiDaEvitare(valore: unknown, problemi: Problemi): DaEvitare | null {
  if (assente(valore)) return { attivita: [], categorie: [], stili: [] };
  const grezzo = oggetto(valore);
  if (grezzo === null) {
    problemi.nonValido("daEvitare", "Scegli di nuovo le cose da evitare.");
    return null;
  }
  const attivita = idAttivita(
    grezzo["attivita"],
    "Una delle attività da evitare non è valida: sceglila di nuovo.",
    "daEvitare",
    problemi,
  );
  const categorie = piuScelte<CategoriaEstesa>(
    grezzo["categorie"],
    CATEGORIE_ESTESE,
    `Una delle categorie da evitare non è tra quelle disponibili: scegli tra ${elencoInParole(
      CATEGORIE_ESTESE.map((c) => ETICHETTE_PROFILO.categoria[c]),
    )}.`,
    "daEvitare",
    problemi,
  );
  const stili = piuScelte(grezzo["stili"], STILI_VIAGGIO, testoStiliNonValidi, "daEvitare", problemi);
  if (attivita === null || categorie === null || stili === null) return null;
  return { attivita, categorie: categorie ?? [], stili: stili ?? [] };
}

// --- Coerenza tra i campi --------------------------------------------------------------------------

/** L'attività rientra in ciò che il profilo chiede di evitare (per `id`, categoria o stile). */
export function daEvitareComprende(daEvitare: DaEvitare, attivita: AttivitaCatalogoEstesa): boolean {
  return (
    daEvitare.attivita.includes(attivita.id) ||
    daEvitare.categorie.includes(attivita.categoria) ||
    (attivita.stili ?? []).some((s) => daEvitare.stili.includes(s))
  );
}

function controllaCoerenza(
  stiliScelti: StileViaggio[] | undefined,
  irrinunciabili: Irrinunciabili,
  daEvitare: DaEvitare,
  catalogo: CatalogoEsteso | undefined,
  problemi: Problemi,
): void {
  for (const stile of stiliScelti ?? []) {
    if (daEvitare.stili.includes(stile)) {
      problemi.nonValido(
        "daEvitare",
        `Lo stile ${ETICHETTE_PROFILO.stile[stile]} è tra quelli che ti piacciono ma anche tra quelli da evitare: scegli dove tenerlo.`,
      );
    }
  }
  for (const stile of irrinunciabili.stili) {
    if (daEvitare.stili.includes(stile)) {
      problemi.nonValido(
        "daEvitare",
        `Lo stile ${ETICHETTE_PROFILO.stile[stile]} è sia tra gli irrinunciabili sia tra quelli da evitare: scegli dove tenerlo.`,
      );
    }
  }
  const nomi = new Map((catalogo?.attivita ?? []).map((a) => [a.id, a] as const));
  const nomeAttivita = (id: string): string => {
    const nome = nomi.get(id)?.nome;
    return nome === undefined ? "Un'attività" : `«${nome}»`;
  };
  for (const id of irrinunciabili.attivita) {
    if (daEvitare.attivita.includes(id)) {
      problemi.nonValido(
        "daEvitare",
        `${nomeAttivita(id)} è sia tra le cose irrinunciabili sia tra quelle da evitare: scegli dove tenerla.`,
      );
    }
  }
  if (catalogo === undefined) return;
  for (const [campo, elenco] of [
    ["irrinunciabili", irrinunciabili.attivita],
    ["daEvitare", daEvitare.attivita],
  ] as const) {
    const sconosciute = elenco.filter((id) => !nomi.has(id)).length;
    if (sconosciute > 0) {
      const dove = campo === "irrinunciabili" ? "irrinunciabili" : "da evitare";
      problemi.nonValido(
        campo,
        sconosciute === 1
          ? `Una delle attività ${dove} non si trova tra quelle della destinazione: sceglila di nuovo.`
          : `${sconosciute} attività ${dove} non si trovano tra quelle della destinazione: sceglile di nuovo.`,
      );
    }
  }
  for (const id of irrinunciabili.attivita) {
    const attivita = nomi.get(id);
    if (attivita !== undefined && !daEvitare.attivita.includes(id) && daEvitareComprende(daEvitare, attivita)) {
      problemi.nonValido(
        "daEvitare",
        `${nomeAttivita(id)} è tra le cose irrinunciabili ma rientra in ciò che vuoi evitare: togli una delle due scelte.`,
      );
    }
  }
}

// --- Validazione completa --------------------------------------------------------------------------

/**
 * Valida una bozza di profilo (`BozzaProfilo`, anche JSON grezzo) e la completa con i predefiniti della §7.2.
 *
 * - Campi obbligatori: destinazione, date e durata (con date precise la durata si ricava dalle date). I
 *   viaggiatori sono obbligatori ma hanno un predefinito (2 adulti), quindi non mancano mai.
 * - Valori ammessi: quelli di `tipi.ts`; un valore non ammesso è un problema, mai sostituito in silenzio.
 * - Normalizzazione: elenchi senza ripetizioni e in ordine canonico, testi senza spazi ai lati, tipo di gruppo
 *   ricavato dai viaggiatori se manca, stili predefiniti senza quelli da evitare.
 * - Coerenza: uno stile o un'attività non può essere insieme scelto (o irrinunciabile) e da evitare; con il
 *   catalogo, le attività indicate devono esistere.
 *
 * @param bozza il profilo raccolto finora; qualsiasi valore (anche `null`) è accettato senza eccezioni.
 * @param opzioni il catalogo della destinazione, se già noto.
 * @returns il profilo completo, oppure tutti i problemi nell'ordine dei campi della §7.2, ognuno con il passo
 *   del percorso guidato e un testo in italiano semplice da mostrare al viaggiatore.
 */
export function validaProfilo(bozza: unknown, opzioni: OpzioniValidazione = {}): EsitoProfilo {
  const grezzo = oggetto(bozza) ?? {};
  const problemi = new Problemi();

  const destinazione = leggiDestinazione(grezzo["destinazione"], problemi);
  const date = leggiDate(grezzo["date"], problemi);
  const durata = leggiDurata(grezzo["durata"], date, problemi);
  const viaggiatori = leggiViaggiatori(grezzo["viaggiatori"], problemi);
  const tipoGruppoScelto = scelta(
    grezzo["tipoGruppo"],
    TIPI_GRUPPO,
    TIPI_GRUPPO[0],
    "tipoGruppo",
    ETICHETTE_PROFILO.tipoGruppo,
    problemi,
  );
  const stiliScelti = piuScelte(grezzo["stili"], STILI_VIAGGIO, testoStiliNonValidi, "stili", problemi);
  if (stiliScelti !== undefined && stiliScelti !== null && stiliScelti.length === 0) {
    problemi.nonValido("stili", "Scegli almeno uno stile di viaggio.");
  }
  const ritmo = scelta(grezzo["ritmo"], RITMI, PROFILO_PREDEFINITO.ritmo, "ritmo", ETICHETTE_PROFILO.ritmo, problemi);
  const formaFisica = scelta(
    grezzo["formaFisica"],
    FORME_FISICHE,
    PROFILO_PREDEFINITO.formaFisica,
    "formaFisica",
    ETICHETTE_PROFILO.formaFisica,
    problemi,
  );
  const budget = scelta(grezzo["budget"], BUDGET, PROFILO_PREDEFINITO.budget, "budget", ETICHETTE_PROFILO.budget, problemi);
  const orari = scelta(grezzo["orari"], ORARI_PROFILO, PROFILO_PREDEFINITO.orari, "orari", ETICHETTE_PROFILO.orari, problemi);
  const pasti = leggiPasti(grezzo["pasti"], problemi);
  const mezzi = piuScelte(
    grezzo["mezzi"],
    MEZZI_PROFILO,
    `Uno dei mezzi scelti non è tra quelli disponibili: scegli tra ${elencoInParole(
      MEZZI_PROFILO.map((m) => ETICHETTE_PROFILO.mezzo[m]),
    )}.`,
    "mezzi",
    problemi,
  );
  if (mezzi !== undefined && mezzi !== null && mezzi.length === 0) {
    problemi.nonValido("mezzi", "Scegli almeno un mezzo per spostarti.");
  }
  const irrinunciabili = leggiIrrinunciabili(grezzo["irrinunciabili"], problemi);
  const daEvitare = leggiDaEvitare(grezzo["daEvitare"], problemi);
  const esigenze = piuScelte(
    grezzo["esigenze"],
    ESIGENZE,
    `Una delle esigenze scelte non è tra quelle disponibili: scegli tra ${elencoInParole(
      ESIGENZE.map((e) => ETICHETTE_PROFILO.esigenza[e]),
    )}.`,
    "esigenze",
    problemi,
  );

  let stili: StileViaggio[] | null = stiliScelti === undefined ? null : stiliScelti;
  if (irrinunciabili !== null && daEvitare !== null) {
    controllaCoerenza(stiliScelti ?? undefined, irrinunciabili, daEvitare, opzioni.catalogo, problemi);
    if (stiliScelti === undefined) {
      stili = PROFILO_PREDEFINITO.stili.filter((s) => !daEvitare.stili.includes(s));
      if (stili.length === 0) {
        problemi.nonValido(
          "stili",
          `Gli stili proposti (${etichetteStili(PROFILO_PREDEFINITO.stili)}) sono tutti tra quelli da evitare: scegli almeno uno stile di viaggio.`,
        );
      }
    }
  }

  const elenco = problemi.elenco();
  if (
    elenco.length > 0 ||
    destinazione === null ||
    date === null ||
    durata === null ||
    viaggiatori === null ||
    tipoGruppoScelto === null ||
    stili === null ||
    ritmo === null ||
    formaFisica === null ||
    budget === null ||
    orari === null ||
    pasti === null ||
    mezzi === null ||
    irrinunciabili === null ||
    daEvitare === null ||
    esigenze === null
  ) {
    return { ok: false, problemi: elenco };
  }
  return {
    ok: true,
    profilo: {
      destinazione,
      date: date.date,
      durata,
      viaggiatori,
      tipoGruppo: assente(grezzo["tipoGruppo"]) ? gruppoDaViaggiatori(viaggiatori) : tipoGruppoScelto,
      stili,
      ritmo,
      formaFisica,
      budget,
      orari,
      pasti,
      mezzi: mezzi ?? [...PROFILO_PREDEFINITO.mezzi],
      irrinunciabili,
      daEvitare,
      esigenze: esigenze ?? [],
    },
  };
}

/**
 * Cosa manca o non va in una bozza di profilo, in parole semplici: i testi di `validaProfilo`, vuoto se il
 * profilo è completo e valido. Comodo per il riepilogo e per la chat.
 */
export function cosaManca(bozza: unknown, opzioni: OpzioniValidazione = {}): string[] {
  const esito = validaProfilo(bozza, opzioni);
  return esito.ok ? [] : esito.problemi.map((p) => p.testo);
}
