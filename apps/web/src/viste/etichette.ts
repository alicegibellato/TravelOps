/**
 * Etichette in italiano per i valori del modello e formattazione delle date.
 * Solo presentazione: nessuna regola del motore.
 */
import type { Categoria, Costo, Elemento, FasciaOraria, GiornoSettimana, Mezzo, Priorita, StileViaggio, TipoLuogo } from "@travelops/engine";

export const ETICHETTE_TIPO: Record<Elemento["tipo"], string> = {
  attivita: "Attività",
  spostamento: "Spostamento",
};

export const ETICHETTE_MEZZO: Record<Mezzo, string> = {
  piedi: "A piedi",
  mezzi_pubblici: "Mezzi pubblici",
  treno: "Treno",
  auto: "Auto",
  volo: "Volo",
};

export const ETICHETTE_PRIORITA: Record<Priorita, string> = {
  irrinunciabile: "Irrinunciabile",
  desiderata: "Desiderata",
  opzionale: "Opzionale",
};

export const ETICHETTE_CATEGORIA: Record<Categoria, string> = {
  natura: "Natura",
  cultura: "Cultura",
  gastronomia: "Gastronomia",
  pasto: "Pasto",
};

export const ETICHETTE_TIPO_LUOGO: Record<TipoLuogo, string> = {
  alloggio: "Alloggio",
  ristorante: "Ristorante",
  museo: "Museo",
  sentiero: "Sentiero",
  cantina: "Cantina",
  aeroporto: "Aeroporto",
  stazione: "Stazione",
  altro: "Altro",
};

/** I giorni della settimana nell'ordine italiano, da lunedì. */
export const GIORNI_SETTIMANA: readonly { chiave: GiornoSettimana; nome: string }[] = [
  { chiave: "lun", nome: "lunedì" },
  { chiave: "mar", nome: "martedì" },
  { chiave: "mer", nome: "mercoledì" },
  { chiave: "gio", nome: "giovedì" },
  { chiave: "ven", nome: "venerdì" },
  { chiave: "sab", nome: "sabato" },
  { chiave: "dom", nome: "domenica" },
];

const MESI = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
];

/**
 * I 12 mesi che partono da quello della data `AAAA-MM-GG`, per scegliere il mese di partenza: il valore è `AAAA-MM`,
 * l'etichetta per esempio "ottobre 2026".
 */
export function opzioniMesi(data: string): { valore: string; etichetta: string }[] {
  const anno = Number(data.slice(0, 4));
  const mese = Number(data.slice(5, 7));
  return Array.from({ length: 12 }, (_, indice) => {
    const posizione = mese - 1 + indice;
    const annoMese = anno + Math.floor(posizione / 12);
    const numero = (posizione % 12) + 1;
    return { valore: `${annoMese}-${String(numero).padStart(2, "0")}`, etichetta: `${MESI[numero - 1]} ${annoMese}` };
  });
}

/** Nomi dei giorni come li restituisce `getUTCDay()` (0 = domenica). */
const NOMI_GIORNO_UTC = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];

/**
 * Una data `AAAA-MM-GG` in forma estesa, per esempio "sabato 13 giugno 2026".
 * Il giorno della settimana si ricava dal calendario in UTC: non dipende dal fuso né dalla lingua del sistema.
 */
export function dataEstesa(data: string): string {
  const parti = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  if (parti === null) return data;
  const anno = Number(parti[1]);
  const mese = Number(parti[2]);
  const giorno = Number(parti[3]);
  const nomeGiorno = NOMI_GIORNO_UTC[new Date(Date.UTC(anno, mese - 1, giorno)).getUTCDay()];
  return `${nomeGiorno} ${giorno} ${MESI[mese - 1]} ${anno}`;
}

/** Una data `AAAA-MM-GG` senza il giorno della settimana, per esempio "13 giugno 2026". */
export function dataBreve(data: string): string {
  const parti = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  if (parti === null) return data;
  return `${Number(parti[3])} ${MESI[Number(parti[2]) - 1] ?? parti[2]} ${parti[1]}`;
}

/**
 * Un periodo tra due date `AAAA-MM-GG` in forma breve: "12–14 giugno 2026", "30 giugno – 2 luglio 2026",
 * "30 dicembre 2026 – 2 gennaio 2027".
 */
export function periodo(inizio: string, fine: string): string {
  const a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(inizio);
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fine);
  if (a === null || b === null) return `${inizio} – ${fine}`;
  if (inizio === fine) return dataBreve(inizio);
  if (a[1] !== b[1]) return `${dataBreve(inizio)} – ${dataBreve(fine)}`;
  if (a[2] !== b[2]) return `${Number(a[3])} ${MESI[Number(a[2]) - 1] ?? a[2]} – ${dataBreve(fine)}`;
  return `${Number(a[3])}–${dataBreve(fine)}`;
}

/** Un intervallo orario, per esempio "08:40–09:00". */
export function intervallo(inizio: string, fine: string): string {
  return `${inizio}–${fine}`;
}

/** Una durata in minuti, per esempio "150 minuti (2 h 30 min)". */
export function durata(minuti: number): string {
  const ore = Math.floor(minuti / 60);
  const resto = minuti % 60;
  if (ore === 0) return `${minuti} minuti`;
  const leggibile = resto === 0 ? `${ore} h` : `${ore} h ${resto} min`;
  return `${minuti} minuti (${leggibile})`;
}

/** Una durata breve, per esempio "10 min", "2 h" o "1 h 10 min". */
export function durataBreve(minuti: number): string {
  const ore = Math.floor(minuti / 60);
  const resto = minuti % 60;
  if (ore === 0) return `${minuti} min`;
  return resto === 0 ? `${ore} h` : `${ore} h ${resto} min`;
}

/** Lo stile con cui si colora un'attività che nel catalogo non ne indica uno: segue la categoria. */
export const STILE_DA_CATEGORIA: Record<Categoria, StileViaggio> = {
  natura: "natura",
  cultura: "cultura",
  gastronomia: "gastronomia",
  pasto: "gastronomia",
};

/** Una frase semplice per le attività che nel catalogo non hanno una descrizione. */
export const DESCRIZIONE_DA_CATEGORIA: Record<Categoria, string> = {
  natura: "Un momento all'aria aperta, nella natura del posto.",
  cultura: "Una visita per scoprire la storia e la cultura del posto.",
  gastronomia: "Un'occasione per assaggiare i sapori del posto.",
  pasto: "Una pausa per mangiare con calma.",
};

/** Il costo indicativo di un'attività: "Gratis" oppure da "€" a "€€€". */
export function costoInParole(costo: Costo): string {
  return costo === "gratis" ? "Gratis" : costo;
}

/** Un orario `HH:MM` come si dice: "9" per le 09:00, "9:30" per le 09:30; "dall'una" e "all'una" per l'una. */
function oraInParole(ora: string, preposizione: "dalle" | "alle"): string {
  const parti = /^(\d{2}):(\d{2})$/.exec(ora);
  if (parti === null) return `${preposizione} ${ora}`;
  const numero = Number(parti[1]);
  const intera = parti[2] === "00";
  if (numero === 1 && intera) return preposizione === "dalle" ? "dall'una" : "all'una";
  return `${preposizione} ${intera ? numero : `${numero}:${parti[2]}`}`;
}

function fasceInParole(fasce: readonly FasciaOraria[]): string {
  return fasce.map((fascia) => `${oraInParole(fascia.apertura, "dalle")} ${oraInParole(fascia.chiusura, "alle")}`).join(" e ");
}

function nomiGiorni(indici: readonly number[]): string {
  const articolo = (i: number): string => (i === 6 ? "la" : "il");
  const nome = (i: number): string => GIORNI_SETTIMANA[i]?.nome ?? "";
  // Tre o più giorni di fila: "da martedì a sabato"; gli altri, ciascuno con il suo articolo.
  const parti: string[] = [];
  let inizio = 0;
  while (inizio < indici.length) {
    let fine = inizio;
    while (fine + 1 < indici.length && (indici[fine + 1] ?? 0) === (indici[fine] ?? 0) + 1) fine += 1;
    if (fine - inizio >= 2) {
      parti.push(`da ${nome(indici[inizio] ?? 0)} a ${nome(indici[fine] ?? 0)}`);
    } else {
      for (let k = inizio; k <= fine; k += 1) parti.push(`${articolo(indici[k] ?? 0)} ${nome(indici[k] ?? 0)}`);
    }
    inizio = fine + 1;
  }
  return parti.length <= 1 ? (parti[0] ?? "") : `${parti.slice(0, -1).join(", ")} e ${parti[parti.length - 1]}`;
}

/**
 * Gli orari settimanali di un luogo in una frase, per esempio "Aperto da martedì a sabato dalle 9:30 alle 17 e la
 * domenica dalle 9:30 alle 13, chiuso il lunedì." I giorni con gli stessi orari si raggruppano.
 */
export function orariSettimanaInParole(settimana: Readonly<Record<GiornoSettimana, readonly FasciaOraria[]>>): string {
  const gruppi = new Map<string, { fasce: readonly FasciaOraria[]; giorni: number[] }>();
  const chiusi: number[] = [];
  GIORNI_SETTIMANA.forEach(({ chiave }, indice) => {
    const fasce = settimana[chiave] ?? [];
    if (fasce.length === 0) {
      chiusi.push(indice);
      return;
    }
    const chiaveGruppo = fasceInParole(fasce);
    const gruppo = gruppi.get(chiaveGruppo) ?? { fasce, giorni: [] };
    gruppo.giorni.push(indice);
    gruppi.set(chiaveGruppo, gruppo);
  });
  if (gruppi.size === 0) return "Chiuso tutti i giorni.";
  const aperti = [...gruppi.values()].map(({ fasce, giorni }) => {
    const quando = giorni.length === 7 ? "tutti i giorni" : nomiGiorni(giorni);
    return `${quando} ${fasceInParole(fasce)}`;
  });
  const apertura = `Aperto ${aperti.length === 1 ? (aperti[0] ?? "") : `${aperti.slice(0, -1).join(", ")} e ${aperti[aperti.length - 1]}`}`;
  return chiusi.length === 0 ? `${apertura}.` : `${apertura}, chiuso ${nomiGiorni(chiusi)}.`;
}
