/**
 * Tabella di classificazione da OpenStreetMap ad attività di catalogo (REQ-CAT-001).
 *
 * Qui ci sono solo dati: le regole che trasformano i tag di un luogo reale in tipo di luogo, categoria, stili,
 * all'aperto o al coperto, intensità, durata tipica e costo, più gli orari predefiniti per tipo di luogo e le
 * soglie per sentieri e prezzi. Il codice che le applica è in `classifica.ts`; per cambiare una regola si
 * cambia solo questa tabella.
 */
import type {
  CategoriaEstesa,
  Costo,
  FasciaOraria,
  GiornoSettimana,
  Intensita,
  OrariApertura,
  StileViaggio,
  TipoLuogoEsteso,
} from "../model/index.js";

/** Una condizione su un tag: la chiave con uno dei valori elencati, oppure con qualsiasi valore. */
export interface CondizioneTag {
  chiave: string;
  valori: readonly string[] | "qualsiasi";
}

/** Come si ricava l'attività di catalogo da un luogo che rispetta la regola. */
export interface RegolaAttivita {
  categoria: CategoriaEstesa;
  /** Stili nell'ordine canonico della §7.2. */
  stili: readonly StileViaggio[];
  allAperto: boolean;
  /** Valore fisso, oppure calcolato con `REGOLE_SENTIERI` da lunghezza e dislivello. */
  intensita: Intensita | "secondo_lunghezza_e_dislivello";
  /** Minuti fissi, oppure calcolati con `REGOLE_SENTIERI` dalla lunghezza. */
  durataTipica: number | "secondo_lunghezza";
  /** Valore fisso, oppure ricavato dal tag `price` con `REGOLE_PREZZO`. */
  costo: Costo | "secondo_price";
  /** Valore fisso, oppure sì solo se l'intensità calcolata non è `impegnativa`. */
  adattaAiBambini: boolean | "se_non_impegnativa";
  /** Accessibilità quando manca il tag `wheelchair` (`yes`/`designated` vale sì, `no`/`limited` vale no). */
  accessibileSenzaTag: boolean;
  /** Nome dell'attività: `{nome}` è il nome del luogo. */
  nome: string;
}

export interface RegolaClassificazione {
  /** Identificativo stabile della riga. */
  id: string;
  /** Il luogo rispetta la regola se rispetta almeno una delle condizioni. */
  quando: readonly CondizioneTag[];
  tipoLuogo: TipoLuogoEsteso;
  /** Nome del luogo quando mancano i tag `name:it` e `name`. */
  nomePredefinito: string;
  /** L'attività di catalogo, oppure `null` per i luoghi di servizio (alloggi, farmacie, …). */
  attivita: RegolaAttivita | null;
}

/**
 * Le righe della tabella, in ordine di precedenza: vale la prima che il luogo rispetta
 * (per esempio `shop=wine` è una cantina prima di essere un negozio qualsiasi).
 */
export const TABELLA_CLASSIFICAZIONE: readonly RegolaClassificazione[] = [
  {
    id: "museo",
    quando: [{ chiave: "tourism", valori: ["museum"] }],
    tipoLuogo: "museo",
    nomePredefinito: "Museo",
    attivita: {
      categoria: "cultura",
      stili: ["cultura"],
      allAperto: false,
      intensita: "facile",
      durataTipica: 120,
      costo: "€",
      adattaAiBambini: true,
      accessibileSenzaTag: true,
      nome: "Visita a {nome}",
    },
  },
  {
    id: "galleria",
    quando: [{ chiave: "tourism", valori: ["gallery"] }],
    tipoLuogo: "museo",
    nomePredefinito: "Galleria d'arte",
    attivita: {
      categoria: "cultura",
      stili: ["cultura"],
      allAperto: false,
      intensita: "facile",
      durataTipica: 90,
      costo: "€",
      adattaAiBambini: true,
      accessibileSenzaTag: true,
      nome: "Visita a {nome}",
    },
  },
  {
    id: "punto-panoramico",
    quando: [{ chiave: "tourism", valori: ["viewpoint"] }],
    tipoLuogo: "punto_panoramico",
    nomePredefinito: "Punto panoramico",
    attivita: {
      categoria: "natura",
      stili: ["natura", "romantico"],
      allAperto: true,
      intensita: "facile",
      durataTipica: 30,
      costo: "gratis",
      adattaAiBambini: true,
      accessibileSenzaTag: false,
      nome: "Panorama da {nome}",
    },
  },
  {
    id: "parco",
    quando: [{ chiave: "leisure", valori: ["park"] }],
    tipoLuogo: "parco",
    nomePredefinito: "Parco",
    attivita: {
      categoria: "natura",
      stili: ["relax", "natura", "famiglia"],
      allAperto: true,
      intensita: "facile",
      durataTipica: 60,
      costo: "gratis",
      adattaAiBambini: true,
      accessibileSenzaTag: true,
      nome: "Passeggiata: {nome}",
    },
  },
  {
    id: "spiaggia",
    quando: [{ chiave: "natural", valori: ["beach"] }],
    tipoLuogo: "spiaggia",
    nomePredefinito: "Spiaggia",
    attivita: {
      categoria: "natura",
      stili: ["relax", "famiglia"],
      allAperto: true,
      intensita: "facile",
      durataTipica: 120,
      costo: "gratis",
      adattaAiBambini: true,
      accessibileSenzaTag: false,
      nome: "Relax in spiaggia: {nome}",
    },
  },
  {
    id: "percorso-escursionistico",
    quando: [{ chiave: "route", valori: ["hiking", "foot"] }],
    tipoLuogo: "sentiero",
    nomePredefinito: "Sentiero escursionistico",
    attivita: {
      categoria: "natura",
      stili: ["natura", "avventura"],
      allAperto: true,
      intensita: "secondo_lunghezza_e_dislivello",
      durataTipica: "secondo_lunghezza",
      costo: "gratis",
      adattaAiBambini: "se_non_impegnativa",
      accessibileSenzaTag: false,
      nome: "Escursione: {nome}",
    },
  },
  {
    id: "cantina",
    quando: [
      { chiave: "craft", valori: ["winery"] },
      { chiave: "shop", valori: ["wine"] },
    ],
    tipoLuogo: "cantina",
    nomePredefinito: "Cantina",
    attivita: {
      categoria: "gastronomia",
      stili: ["gastronomia", "romantico"],
      allAperto: false,
      intensita: "facile",
      durataTipica: 90,
      costo: "€€",
      adattaAiBambini: false,
      accessibileSenzaTag: true,
      nome: "Degustazione: {nome}",
    },
  },
  {
    id: "ristorante",
    quando: [{ chiave: "amenity", valori: ["restaurant"] }],
    tipoLuogo: "ristorante",
    nomePredefinito: "Ristorante",
    attivita: {
      categoria: "pasto",
      stili: ["gastronomia"],
      allAperto: false,
      intensita: "facile",
      durataTipica: 75,
      costo: "secondo_price",
      adattaAiBambini: true,
      accessibileSenzaTag: true,
      nome: "Pasto: {nome}",
    },
  },
  {
    id: "impianto",
    quando: [{ chiave: "aerialway", valori: ["cable_car", "gondola", "chair_lift", "mixed_lift"] }],
    tipoLuogo: "impianto",
    nomePredefinito: "Impianto di risalita",
    attivita: {
      categoria: "natura",
      stili: ["natura", "avventura"],
      allAperto: true,
      intensita: "facile",
      durataTipica: 60,
      costo: "€€",
      adattaAiBambini: true,
      accessibileSenzaTag: false,
      nome: "Salita con {nome}",
    },
  },
  // Luoghi di servizio: entrano nel catalogo come luoghi, senza attività.
  {
    id: "alloggio",
    quando: [{ chiave: "tourism", valori: ["hotel", "guest_house", "hostel", "motel", "apartment"] }],
    tipoLuogo: "alloggio",
    nomePredefinito: "Alloggio",
    attivita: null,
  },
  {
    id: "farmacia",
    quando: [{ chiave: "amenity", valori: ["pharmacy"] }],
    tipoLuogo: "farmacia",
    nomePredefinito: "Farmacia",
    attivita: null,
  },
  {
    id: "ospedale",
    quando: [{ chiave: "amenity", valori: ["hospital"] }],
    tipoLuogo: "ospedale",
    nomePredefinito: "Ospedale",
    attivita: null,
  },
  {
    id: "stazione",
    quando: [{ chiave: "railway", valori: ["station"] }],
    tipoLuogo: "stazione",
    nomePredefinito: "Stazione",
    attivita: null,
  },
  {
    id: "aeroporto",
    quando: [{ chiave: "aeroway", valori: ["aerodrome"] }],
    tipoLuogo: "aeroporto",
    nomePredefinito: "Aeroporto",
    attivita: null,
  },
  {
    id: "negozio",
    quando: [{ chiave: "shop", valori: "qualsiasi" }],
    tipoLuogo: "negozio",
    nomePredefinito: "Negozio",
    attivita: null,
  },
];

/**
 * Sentieri: intensità secondo lunghezza e dislivello, durata secondo la lunghezza.
 * L'intensità è la più alta tra quella data dalla lunghezza e quella data dal dislivello: la prima soglia
 * che la misura non supera, altrimenti `impegnativa`. Una misura che manca non conta; se mancano entrambe
 * vale `intensitaSenzaMisure`. La durata è `minutiPerKm` per chilometro, arrotondata per eccesso a
 * `arrotondamento` minuti, mai sotto `durataMinima`; senza lunghezza vale `durataSenzaLunghezza`.
 */
export const REGOLE_SENTIERI = {
  soglie: [
    { intensita: "facile", kmMassimi: 6, dislivelloMassimo: 300 },
    { intensita: "moderata", kmMassimi: 12, dislivelloMassimo: 800 },
  ],
  oltreLeSoglie: "impegnativa",
  intensitaSenzaMisure: "moderata",
  minutiPerKm: 15,
  arrotondamento: 30,
  durataMinima: 60,
  durataSenzaLunghezza: 120,
} as const satisfies {
  soglie: readonly { intensita: Intensita; kmMassimi: number; dislivelloMassimo: number }[];
  oltreLeSoglie: Intensita;
  intensitaSenzaMisure: Intensita;
  minutiPerKm: number;
  arrotondamento: number;
  durataMinima: number;
  durataSenzaLunghezza: number;
};

/**
 * Costo di un ristorante dal tag `price`: simboli di valuta ripetuti (`€`, `€€`, `€€€`; anche `$`, `£`),
 * parole in inglese, oppure un importo (o un intervallo, di cui vale la media) per persona in euro.
 * Un valore assente o non riconosciuto vale `predefinito`.
 */
export const REGOLE_PREZZO = {
  predefinito: "€€",
  parole: {
    cheap: "€",
    inexpensive: "€",
    low: "€",
    moderate: "€€",
    medium: "€€",
    expensive: "€€€",
    high: "€€€",
  },
  soglieImporto: [
    { fino: 20, costo: "€" },
    { fino: 45, costo: "€€" },
  ],
  oltreLeSoglie: "€€€",
} as const satisfies {
  predefinito: Costo;
  parole: Readonly<Record<string, Costo>>;
  soglieImporto: readonly { fino: number; costo: Costo }[];
  oltreLeSoglie: Costo;
};

const fascia = (apertura: string, chiusura: string): FasciaOraria => ({ apertura, chiusura });

function ogniGiorno(fasce: readonly FasciaOraria[], chiusi: readonly GiornoSettimana[] = []): OrariApertura {
  const giorni: readonly GiornoSettimana[] = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];
  const settimana = Object.fromEntries(giorni.map((g) => [g, chiusi.includes(g) ? [] : fasce.map((f) => ({ ...f }))]));
  return { settimana: settimana as Record<GiornoSettimana, FasciaOraria[]> };
}

const SEMPRE: OrariApertura = { sempre: true };

/**
 * Orari predefiniti per tipo di luogo, usati quando manca `opening_hours` o non si riesce a leggerlo.
 * Sono sempre marcati come non verificati. I luoghi all'aperto e quelli sempre raggiungibili (alloggi,
 * stazioni, aeroporti, ospedali) sono sempre aperti.
 */
export const ORARI_PREDEFINITI: Readonly<Record<TipoLuogoEsteso, OrariApertura>> = {
  alloggio: SEMPRE,
  ristorante: ogniGiorno([fascia("12:00", "14:30"), fascia("19:00", "22:30")]),
  museo: ogniGiorno([fascia("10:00", "18:00")], ["lun"]),
  sentiero: SEMPRE,
  cantina: ogniGiorno([fascia("10:00", "19:00")]),
  aeroporto: SEMPRE,
  stazione: SEMPRE,
  altro: SEMPRE,
  spiaggia: SEMPRE,
  punto_panoramico: SEMPRE,
  parco: SEMPRE,
  impianto: ogniGiorno([fascia("08:30", "17:00")]),
  negozio: ogniGiorno([fascia("09:00", "19:30")], ["dom"]),
  farmacia: ogniGiorno([fascia("08:30", "19:30")], ["dom"]),
  ospedale: SEMPRE,
};
