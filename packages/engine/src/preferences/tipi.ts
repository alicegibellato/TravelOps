/**
 * Profilo delle preferenze del viaggio (modello-dominio-estensioni.md §7.2, REQ-PREF-001): tipi, valori ammessi,
 * valori predefiniti ed etichette in italiano per il viaggiatore.
 *
 * Due forme dello stesso profilo:
 * - `BozzaProfilo`: quello che il percorso guidato e la chat hanno raccolto finora. Tutto è facoltativo e può
 *   essere incompleto o sbagliato: è l'ingresso di `validaProfilo`.
 * - `ProfiloPreferenze`: il profilo completo, validato e normalizzato (predefiniti applicati, elenchi senza
 *   ripetizioni e nell'ordine canonico). È l'ingresso del punteggio (§7.7) e del generatore (REQ-PLAN-001).
 */
import type { CategoriaEstesa, Data, Intensita, Mezzo, Orario, StileViaggio } from "../model/index.js";

// --- Campi del profilo -----------------------------------------------------------------------------

/** Dove: una città o area reale trovata dalla ricerca (REQ-CAT-002), oppure "sorprendimi". */
export type DestinazioneProfilo =
  | {
      tipo: "luogo";
      /** Nome mostrato al viaggiatore, per esempio `Roma`. */
      nome: string;
      /** Identificativo restituito dalla ricerca o dell'istantanea (§7.8), se già noto. */
      riferimento?: string;
    }
  | { tipo: "sorprendimi" };

/** Quando: date precise (inizio e fine compresi), oppure un mese (`AAAA-MM`) con la durata a parte. */
export type DateProfilo = { tipo: "precise"; inizio: Data; fine: Data } | { tipo: "mese"; mese: string };

export interface Viaggiatori {
  /** Almeno 1. */
  adulti: number;
  /** Età di ogni bambino in anni (da 0 a 17), dal più piccolo al più grande; vuoto se non ci sono bambini. */
  bambini: number[];
}

export type TipoGruppo = "da_solo" | "coppia" | "amici" | "famiglia";
/** Attività al giorno, pasti esclusi: `lento` 2, `bilanciato` 3, `intenso` 4. */
export type Ritmo = "lento" | "bilanciato" | "intenso";
/** Intensità massima accettata. */
export type FormaFisica = "facile" | "moderato" | "impegnativo";
/** Fascia indicativa per persona al giorno, attività escluso alloggio. */
export type Budget = "€" | "€€" | "€€€";
/** Finestra della giornata: `mattiniero` 08:00–20:00, `normale` 09:30–21:30, `nottambulo` 11:00–23:30. */
export type OrariProfilo = "mattiniero" | "normale" | "nottambulo";
/** Mezzi che il viaggiatore accetta di usare (il volo non è una preferenza del profilo). */
export type MezzoProfilo = Exclude<Mezzo, "volo">;
export type Esigenza = "mobilita_ridotta" | "adatto_ai_bambini" | "vegetariano" | "senza_glutine";

export interface PastiNelPiano {
  pranzo: boolean;
  cena: boolean;
}

/** Attività del catalogo (per `id`) e stili che devono esserci nel viaggio. */
export interface Irrinunciabili {
  attivita: string[];
  stili: StileViaggio[];
}

/** Attività del catalogo (per `id`), categorie e stili da non proporre mai. */
export interface DaEvitare {
  attivita: string[];
  categorie: CategoriaEstesa[];
  stili: StileViaggio[];
}

/**
 * Profilo delle preferenze completo e normalizzato (§7.2): lo restituisce solo `validaProfilo`.
 * Gli elenchi non hanno ripetizioni: stili, mezzi, categorie ed esigenze sono nell'ordine canonico dei valori
 * ammessi, gli `id` delle attività in ordine alfabetico, le età dei bambini in ordine crescente. Così due
 * bozze con le stesse scelte in ordine diverso (dai filtri o dalla chat) danno lo stesso profilo.
 */
export interface ProfiloPreferenze {
  destinazione: DestinazioneProfilo;
  date: DateProfilo;
  /** Giorni del viaggio, da 2 a 14; con date precise coincide con i giorni da inizio a fine compresi. */
  durata: number;
  viaggiatori: Viaggiatori;
  tipoGruppo: TipoGruppo;
  /** Almeno uno. */
  stili: StileViaggio[];
  ritmo: Ritmo;
  formaFisica: FormaFisica;
  budget: Budget;
  orari: OrariProfilo;
  pasti: PastiNelPiano;
  /** Almeno uno. */
  mezzi: MezzoProfilo[];
  irrinunciabili: Irrinunciabili;
  daEvitare: DaEvitare;
  esigenze: Esigenza[];
}

/**
 * Profilo in costruzione, come lo compilano il percorso guidato e la chat: ogni campo può mancare.
 * I campi facoltativi assenti prendono il valore predefinito della §7.2 (`PROFILO_PREDEFINITO`); con date precise
 * la durata si può omettere perché si ricava dalle date.
 */
export interface BozzaProfilo {
  destinazione?: DestinazioneProfilo;
  date?: DateProfilo;
  durata?: number;
  viaggiatori?: { adulti?: number; bambini?: number[] };
  tipoGruppo?: TipoGruppo;
  stili?: StileViaggio[];
  ritmo?: Ritmo;
  formaFisica?: FormaFisica;
  budget?: Budget;
  orari?: OrariProfilo;
  pasti?: Partial<PastiNelPiano>;
  mezzi?: MezzoProfilo[];
  irrinunciabili?: Partial<Irrinunciabili>;
  daEvitare?: Partial<DaEvitare>;
  esigenze?: Esigenza[];
}

/** I campi del profilo, nell'ordine della tabella della §7.2 (è anche l'ordine dei problemi di validazione). */
export type CampoProfilo = keyof ProfiloPreferenze;

export const CAMPI_PROFILO = [
  "destinazione",
  "date",
  "durata",
  "viaggiatori",
  "tipoGruppo",
  "stili",
  "ritmo",
  "formaFisica",
  "budget",
  "orari",
  "pasti",
  "mezzi",
  "irrinunciabili",
  "daEvitare",
  "esigenze",
] as const satisfies readonly CampoProfilo[];

/** Campi obbligatori della §7.2 senza valore predefinito: se mancano, il profilo è incompleto. */
export const CAMPI_OBBLIGATORI = ["destinazione", "date", "durata"] as const satisfies readonly CampoProfilo[];

/** Passo del percorso guidato (REQ-PREF-001) in cui si compila ogni campo, da 1 (Dove) a 5 (Dettagli facoltativi). */
export const PASSO_DEL_CAMPO: Readonly<Record<CampoProfilo, 1 | 2 | 3 | 4 | 5>> = {
  destinazione: 1,
  date: 2,
  durata: 2,
  viaggiatori: 3,
  tipoGruppo: 3,
  stili: 4,
  ritmo: 4,
  formaFisica: 4,
  budget: 4,
  orari: 5,
  pasti: 5,
  mezzi: 5,
  irrinunciabili: 5,
  daEvitare: 5,
  esigenze: 5,
};

// --- Valori ammessi, nell'ordine canonico ----------------------------------------------------------

export const TIPI_GRUPPO = ["da_solo", "coppia", "amici", "famiglia"] as const satisfies readonly TipoGruppo[];
export const RITMI = ["lento", "bilanciato", "intenso"] as const satisfies readonly Ritmo[];
/** Dalla più leggera alla più faticosa. */
export const FORME_FISICHE = ["facile", "moderato", "impegnativo"] as const satisfies readonly FormaFisica[];
/** Dalla più economica alla più cara. */
export const BUDGET = ["€", "€€", "€€€"] as const satisfies readonly Budget[];
export const ORARI_PROFILO = ["mattiniero", "normale", "nottambulo"] as const satisfies readonly OrariProfilo[];
export const MEZZI_PROFILO = ["piedi", "mezzi_pubblici", "treno", "auto"] as const satisfies readonly MezzoProfilo[];
export const ESIGENZE = [
  "mobilita_ridotta",
  "adatto_ai_bambini",
  "vegetariano",
  "senza_glutine",
] as const satisfies readonly Esigenza[];

/** Limiti della durata in giorni (§7.2). */
export const DURATA_MINIMA = 2;
export const DURATA_MASSIMA = 14;
/** Età massima di un bambino, in anni. */
export const ETA_MASSIMA_BAMBINO = 17;

// --- Significato dei valori ------------------------------------------------------------------------

/** Attività al giorno per ritmo, pasti esclusi (§7.2). */
export const ATTIVITA_PER_RITMO: Readonly<Record<Ritmo, number>> = { lento: 2, bilanciato: 3, intenso: 4 };

/** Intensità massima accettata per forma fisica (§7.2, §7.3). */
export const INTENSITA_MASSIMA: Readonly<Record<FormaFisica, Intensita>> = {
  facile: "facile",
  moderato: "moderata",
  impegnativo: "impegnativa",
};

/** Finestra della giornata per orari (§7.2). */
export const FINESTRA_GIORNATA: Readonly<Record<OrariProfilo, { inizio: Orario; fine: Orario }>> = {
  mattiniero: { inizio: "08:00", fine: "20:00" },
  normale: { inizio: "09:30", fine: "21:30" },
  nottambulo: { inizio: "11:00", fine: "23:30" },
};

/**
 * Valori predefiniti dei campi facoltativi (§7.2). Il tipo di gruppo non c'è perché si ricava dai viaggiatori
 * (`gruppoDaViaggiatori`). Ogni accesso restituisce gli stessi valori: non vanno modificati.
 */
export const PROFILO_PREDEFINITO: Readonly<Omit<ProfiloPreferenze, CampoObbligatorio | "tipoGruppo">> = {
  viaggiatori: { adulti: 2, bambini: [] },
  stili: ["cultura", "natura"],
  ritmo: "bilanciato",
  formaFisica: "moderato",
  budget: "€€",
  orari: "normale",
  pasti: { pranzo: true, cena: true },
  mezzi: [...MEZZI_PROFILO],
  irrinunciabili: { attivita: [], stili: [] },
  daEvitare: { attivita: [], categorie: [], stili: [] },
  esigenze: [],
};

export type CampoObbligatorio = (typeof CAMPI_OBBLIGATORI)[number];

/** Tipo di gruppo ricavato dai viaggiatori: con bambini `famiglia`, 1 adulto `da_solo`, 2 `coppia`, di più `amici`. */
export function gruppoDaViaggiatori(viaggiatori: Viaggiatori): TipoGruppo {
  if (viaggiatori.bambini.length > 0) return "famiglia";
  if (viaggiatori.adulti <= 1) return "da_solo";
  return viaggiatori.adulti === 2 ? "coppia" : "amici";
}

// --- Etichette per il viaggiatore ------------------------------------------------------------------

/**
 * Etichette in italiano dei valori, da mostrare al viaggiatore al posto dei valori tecnici
 * (chip, riepilogo, messaggi). Gli stili sono quelli di `STILI_VIAGGIO`.
 */
export const ETICHETTE_PROFILO = {
  campo: {
    destinazione: "Destinazione",
    date: "Date",
    durata: "Durata",
    viaggiatori: "Viaggiatori",
    tipoGruppo: "Tipo di gruppo",
    stili: "Stili di viaggio",
    ritmo: "Ritmo",
    formaFisica: "Forma fisica",
    budget: "Budget",
    orari: "Orari",
    pasti: "Pasti nel piano",
    mezzi: "Mezzi",
    irrinunciabili: "Irrinunciabili",
    daEvitare: "Da evitare",
    esigenze: "Esigenze",
  } satisfies Record<CampoProfilo, string>,
  tipoGruppo: { da_solo: "Da solo", coppia: "Coppia", amici: "Amici", famiglia: "Famiglia" } satisfies Record<
    TipoGruppo,
    string
  >,
  stile: {
    relax: "Relax",
    cultura: "Cultura",
    natura: "Natura",
    avventura: "Avventura",
    gastronomia: "Gastronomia",
    romantico: "Romantico",
    famiglia: "Famiglia",
  } satisfies Record<StileViaggio, string>,
  ritmo: { lento: "Lento", bilanciato: "Bilanciato", intenso: "Intenso" } satisfies Record<Ritmo, string>,
  descrizioneRitmo: {
    lento: "2 attività al giorno, pasti esclusi",
    bilanciato: "3 attività al giorno, pasti esclusi",
    intenso: "4 attività al giorno, pasti esclusi",
  } satisfies Record<Ritmo, string>,
  formaFisica: { facile: "Facile", moderato: "Moderato", impegnativo: "Impegnativo" } satisfies Record<
    FormaFisica,
    string
  >,
  budget: { "€": "Economico (€)", "€€": "Medio (€€)", "€€€": "Alto (€€€)" } satisfies Record<Budget, string>,
  orari: { mattiniero: "Mattiniero", normale: "Normale", nottambulo: "Nottambulo" } satisfies Record<
    OrariProfilo,
    string
  >,
  descrizioneOrari: {
    mattiniero: "giornata dalle 8:00 alle 20:00",
    normale: "giornata dalle 9:30 alle 21:30",
    nottambulo: "giornata dalle 11:00 alle 23:30",
  } satisfies Record<OrariProfilo, string>,
  mezzo: { piedi: "A piedi", mezzi_pubblici: "Mezzi pubblici", treno: "Treno", auto: "Auto" } satisfies Record<
    MezzoProfilo,
    string
  >,
  esigenza: {
    mobilita_ridotta: "Mobilità ridotta",
    adatto_ai_bambini: "Adatto ai bambini",
    vegetariano: "Vegetariano",
    senza_glutine: "Senza glutine",
  } satisfies Record<Esigenza, string>,
  categoria: {
    natura: "Natura",
    cultura: "Cultura",
    gastronomia: "Gastronomia",
    pasto: "Pasti",
    servizio: "Servizi",
  } satisfies Record<CategoriaEstesa, string>,
} as const;
