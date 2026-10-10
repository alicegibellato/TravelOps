/**
 * Le schede di "Ho un imprevisto" (REQ-IMPR-001 CA-2): una per ogni tipo di imprevisto di modello-dominio.md §2.4 e
 * modello-dominio-estensioni.md §7.4 e per le due richieste "restare di più" e "tornare prima" (REQ-EDIT-002). Ogni
 * scheda ha il suo modulo breve, con i soli dati necessari. Solo testi e dati semplici: nessuna regola del motore.
 */
import type { NomeTipoImprevisto } from "@travelops/agents";
import type { ModificaOndata2 } from "@travelops/engine";

export type TipoCampo = "data" | "ora" | "numero" | "testo" | "scelta" | "casella";

export interface Campo {
  nome: string;
  etichetta: string;
  tipo: TipoCampo;
  /** Facoltativo: il modulo si può inviare anche vuoto. */
  facoltativo?: boolean;
  /** Per le scelte fisse (le scelte dal viaggio, come zone e spostamenti, arrivano dalla precompilazione). */
  opzioni?: readonly { valore: string; etichetta: string }[];
  minimo?: number;
  massimo?: number;
  aiuto?: string;
}

export interface Scheda {
  id: string;
  titolo: string;
  descrizione: string;
  /** Nome dell'icona (lucide-react) da mostrare sulla scheda. */
  icona: string;
  /** Il tipo di imprevisto del motore, oppure la richiesta di modifica della durata. */
  genere: { tipo: "imprevisto"; imprevisto: NomeTipoImprevisto } | { tipo: "richiesta"; operazione: Extract<ModificaOndata2["operazione"], "prolunga" | "accorcia"> };
  campi: readonly Campo[];
}

const DATA: Campo = { nome: "data", etichetta: "Quando", tipo: "data" };
const MOMENTO: Campo = { nome: "momento", etichetta: "Da che ora", tipo: "ora" };

export const INTENSITA = [
  { valore: "nessuna", etichetta: "Solo riposo" },
  { valore: "facile", etichetta: "Solo attività facili" },
  { valore: "moderata", etichetta: "Fino ad attività moderate" },
  { valore: "impegnativa", etichetta: "Nessun limite" },
] as const;

export const SCHEDE: readonly Scheda[] = [
  {
    id: "volo-cancellato",
    titolo: "Volo cancellato",
    descrizione: "Il volo, il treno o il mezzo prenotato è stato cancellato.",
    icona: "PlaneTakeoff",
    genere: { tipo: "imprevisto", imprevisto: "cancellazione" },
    campi: [{ nome: "elementoId", etichetta: "Quale spostamento", tipo: "scelta" }],
  },
  {
    id: "volo-perso",
    titolo: "Ho perso il volo o il treno",
    descrizione: "Sei arrivato tardi e il mezzo è partito.",
    icona: "TrainFront",
    genere: { tipo: "imprevisto", imprevisto: "voloPerso" },
    campi: [
      { nome: "elementoId", etichetta: "Quale volo o treno", tipo: "scelta" },
      { nome: "arrivoData", etichetta: "Arrivo previsto con il nuovo mezzo: giorno", tipo: "data", facoltativo: true },
      { nome: "arrivoOrario", etichetta: "Arrivo previsto: ora", tipo: "ora", facoltativo: true },
    ],
  },
  {
    id: "ritardo",
    titolo: "Sono in ritardo",
    descrizione: "Un contrattempo ti fa arrivare dopo.",
    icona: "Clock",
    genere: { tipo: "imprevisto", imprevisto: "ritardo" },
    campi: [DATA, MOMENTO, { nome: "minuti", etichetta: "Quanti minuti di ritardo", tipo: "numero", minimo: 5, massimo: 720 }, { nome: "motivo", etichetta: "Che cosa è successo", tipo: "testo", facoltativo: true }],
  },
  {
    id: "maltempo",
    titolo: "Maltempo",
    descrizione: "Pioggia, temporale o neve rovinano i programmi all'aperto.",
    icona: "CloudRain",
    genere: { tipo: "imprevisto", imprevisto: "meteo" },
    campi: [
      { nome: "zonaId", etichetta: "Dove", tipo: "scelta" },
      DATA,
      { nome: "inizio", etichetta: "Dalle", tipo: "ora" },
      { nome: "fine", etichetta: "Alle", tipo: "ora" },
      {
        nome: "condizione",
        etichetta: "Che tempo fa",
        tipo: "scelta",
        opzioni: [
          { valore: "pioggia", etichetta: "Pioggia" },
          { valore: "temporale", etichetta: "Temporale" },
          { valore: "neve", etichetta: "Neve" },
        ],
      },
    ],
  },
  {
    id: "posto-chiuso",
    titolo: "Posto chiuso",
    descrizione: "Un museo, un ristorante o un luogo del programma è chiuso.",
    icona: "DoorClosed",
    genere: { tipo: "imprevisto", imprevisto: "chiusura" },
    campi: [{ nome: "luogoId", etichetta: "Quale posto", tipo: "scelta" }, DATA, { nome: "inizio", etichetta: "Chiuso dalle", tipo: "ora" }, { nome: "fine", etichetta: "Alle", tipo: "ora" }],
  },
  {
    id: "sciopero",
    titolo: "Sciopero",
    descrizione: "Treni o mezzi pubblici non circolano.",
    icona: "Ban",
    genere: { tipo: "imprevisto", imprevisto: "sciopero" },
    campi: [
      {
        nome: "mezzo",
        etichetta: "Quali mezzi",
        tipo: "scelta",
        opzioni: [
          { valore: "mezzi_pubblici", etichetta: "Mezzi pubblici" },
          { valore: "treno", etichetta: "Treni" },
        ],
      },
      DATA,
      { nome: "zonaId", etichetta: "Solo in una zona", tipo: "scelta", facoltativo: true },
    ],
  },
  {
    id: "salute",
    titolo: "Non sto bene / mi sono fatto male",
    descrizione: "Un malessere o un infortunio: alleggeriamo il programma.",
    icona: "HeartPulse",
    genere: { tipo: "imprevisto", imprevisto: "salute" },
    campi: [
      { ...DATA, etichetta: "Da quando" },
      { nome: "giorni", etichetta: "Per quanti giorni", tipo: "numero", minimo: 1, massimo: 30, facoltativo: true, aiuto: "Vuoto: fino alla fine del viaggio." },
      { nome: "intensitaMassima", etichetta: "Che cosa riesci a fare", tipo: "scelta", opzioni: INTENSITA },
      { nome: "mobilitaRidotta", etichetta: "Devo evitare scale e salite", tipo: "casella", facoltativo: true },
      { nome: "descrizione", etichetta: "Che cosa è successo", tipo: "testo", facoltativo: true },
    ],
  },
  {
    id: "bagaglio",
    titolo: "Bagaglio smarrito",
    descrizione: "Ti serve tempo per gli acquisti essenziali.",
    icona: "Luggage",
    genere: { tipo: "imprevisto", imprevisto: "bagaglio" },
    campi: [DATA, MOMENTO],
  },
  {
    id: "documenti",
    titolo: "Documenti persi o rubati",
    descrizione: "Ti serve tempo per la denuncia e i documenti nuovi.",
    icona: "IdCard",
    genere: { tipo: "imprevisto", imprevisto: "documenti" },
    campi: [DATA, MOMENTO],
  },
  {
    id: "stanchezza",
    titolo: "Sono stanco",
    descrizione: "Una giornata più leggera.",
    icona: "BatteryLow",
    genere: { tipo: "imprevisto", imprevisto: "stanchezza" },
    campi: [DATA],
  },
  {
    id: "restare",
    titolo: "Voglio restare di più",
    descrizione: "Aggiungi giorni alla fine del viaggio.",
    icona: "CalendarPlus",
    genere: { tipo: "richiesta", operazione: "prolunga" },
    campi: [
      { nome: "giorni", etichetta: "Quanti giorni in più", tipo: "numero", minimo: 1, massimo: 30 },
      { nome: "dopo", etichetta: "Dopo il giorno", tipo: "data" },
    ],
  },
  {
    id: "tornare-prima",
    titolo: "Voglio tornare prima",
    descrizione: "Togli gli ultimi giorni del viaggio.",
    icona: "CalendarMinus",
    genere: { tipo: "richiesta", operazione: "accorcia" },
    campi: [{ nome: "giorni", etichetta: "Quanti giorni in meno", tipo: "numero", minimo: 1, massimo: 30 }],
  },
];

/** La pagina "Ho un imprevisto". */
export const PERCORSO_IMPREVISTI = "/imprevisti";

/** "Ho un imprevisto" sul viaggio `viaggio` (ST-QA-FIX-018B); senza viaggio, quello della presentazione. */
export function percorsoImprevisti(viaggio?: string): string {
  return viaggio === undefined ? PERCORSO_IMPREVISTI : `${PERCORSO_IMPREVISTI}?viaggio=${encodeURIComponent(viaggio)}`;
}

/** La pagina con il modulo di una scheda, sul viaggio `viaggio` se indicato. */
export function percorsoScheda(id: string, viaggio?: string): string {
  const scheda = `${PERCORSO_IMPREVISTI}?scheda=${encodeURIComponent(id)}`;
  return viaggio === undefined ? scheda : `${scheda}&viaggio=${encodeURIComponent(viaggio)}`;
}

export function trovaScheda(id: string): Scheda | null {
  return SCHEDE.find((s) => s.id === id) ?? null;
}
