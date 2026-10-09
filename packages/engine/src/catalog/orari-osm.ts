/**
 * Lettura del tag `opening_hours` di OpenStreetMap nelle fasce di apertura del motore (REQ-CAT-001).
 *
 * Il motore conosce solo orari settimanali (fasce per giorno della settimana, oppure sempre aperto), quindi
 * qui si legge la parte del formato che si traduce senza perdere informazioni:
 *
 * - `24/7`;
 * - giorni (`Mo`…`Su`), intervalli di giorni anche a cavallo della domenica (`Fr-Mo`) ed elenchi (`Mo,We-Fr`);
 * - una o più fasce orarie (`10:00-12:30,15:00-19:00`), anche oltre la mezzanotte (`18:00-02:00`: la parte dopo
 *   la mezzanotte va al giorno dopo);
 * - `off` e `closed` per i giorni chiusi, `open` per tutto il giorno;
 * - più regole separate da `;` (una regola successiva sostituisce, per i giorni che indica, quelle precedenti) e
 *   regole aggiuntive separate da `,` (si sommano);
 * - le regole dei festivi (`PH`, `SH`) si ignorano: il motore non ha un calendario dei festivi.
 *
 * Tutto il resto (mesi, settimane, date, alba e tramonto, commenti, `||`, …) rende l'orario non leggibile:
 * la funzione restituisce `null` e chi la usa ricorre a un orario predefinito non verificato. Non solleva mai
 * eccezioni e non legge l'orologio.
 */
import type { FasciaOraria, GiornoSettimana, OrariApertura } from "../model/index.js";
import { GIORNI_SETTIMANA } from "../itinerary/valori.js";

const FINE_GIORNO = 24 * 60;

/** Indice dei giorni come in `GIORNI_SETTIMANA` (0 = lunedì). */
const GIORNI_OSM: Readonly<Record<string, number>> = { mo: 0, tu: 1, we: 2, th: 3, fr: 4, sa: 5, su: 6 };

type Token =
  | { tipo: "sempre" }
  | { tipo: "giorno"; indice: number }
  | { tipo: "festivo" }
  | { tipo: "chiuso" }
  | { tipo: "aperto" }
  | { tipo: "orario"; minuti: number }
  | { tipo: "trattino" }
  | { tipo: "virgola" };

const TOKEN =
  /\s*(?:(24\/7)|(mo|tu|we|th|fr|sa|su)(?![a-z])|(ph|sh)(?![a-z])|(off|closed)(?![a-z])|(open)(?![a-z])|(\d{1,2}):(\d{2})|(-)|(,))\s*/iy;

/** I token di una regola, oppure `null` se contiene qualcosa che il motore non sa leggere. */
function tokenizza(regola: string): Token[] | null {
  const token: Token[] = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < regola.length) {
    const inizio = TOKEN.lastIndex;
    const t = TOKEN.exec(regola);
    if (t === null || TOKEN.lastIndex === inizio) return null;
    if (t[1] !== undefined) token.push({ tipo: "sempre" });
    else if (t[2] !== undefined) token.push({ tipo: "giorno", indice: GIORNI_OSM[t[2].toLowerCase()] ?? 0 });
    else if (t[3] !== undefined) token.push({ tipo: "festivo" });
    else if (t[4] !== undefined) token.push({ tipo: "chiuso" });
    else if (t[5] !== undefined) token.push({ tipo: "aperto" });
    else if (t[6] !== undefined && t[7] !== undefined) {
      const ore = Number(t[6]);
      const minuti = Number(t[7]);
      if (minuti > 59 || ore > 48) return null;
      token.push({ tipo: "orario", minuti: ore * 60 + minuti });
    } else if (t[8] !== undefined) token.push({ tipo: "trattino" });
    else token.push({ tipo: "virgola" });
  }
  return token;
}

interface Intervallo {
  inizio: number;
  fine: number;
}

/** Effetto di una regola: i giorni che sostituisce e le fasce che aggiunge, giorno per giorno. */
interface EffettoRegola {
  giorni: Set<number>;
  fasce: Intervallo[][];
}

const nuoveFasce = (): Intervallo[][] => Array.from({ length: 7 }, () => []);

/** Legge una regola (il testo tra due `;`). `null` se non è leggibile. */
function leggiRegola(token: readonly Token[]): EffettoRegola | null {
  const effetto: EffettoRegola = { giorni: new Set(), fasce: nuoveFasce() };
  if (token.length === 1 && token[0]?.tipo === "sempre") {
    for (let g = 0; g < 7; g++) {
      effetto.giorni.add(g);
      effetto.fasce[g]?.push({ inizio: 0, fine: FINE_GIORNO });
    }
    return effetto;
  }
  let i = 0;
  const prossimo = (): Token | undefined => token[i];
  let primoGruppo = true;
  while (i < token.length) {
    // Selettore dei giorni: assente solo nel primo gruppo della regola (vale tutti i giorni).
    const giorni = new Set<number>();
    let soloFestivi = false;
    let selettore = false;
    for (;;) {
      const t = prossimo();
      if (t?.tipo === "giorno") {
        i++;
        let fine = t.indice;
        if (prossimo()?.tipo === "trattino") {
          const ultimo = token[i + 1];
          if (ultimo?.tipo !== "giorno") return null;
          fine = ultimo.indice;
          i += 2;
        }
        for (let g = t.indice; ; g = (g + 1) % 7) {
          giorni.add(g);
          if (g === fine) break;
        }
      } else if (t?.tipo === "festivo") {
        i++;
      } else {
        break;
      }
      selettore = true;
      if (prossimo()?.tipo === "virgola" && ["giorno", "festivo"].includes(token[i + 1]?.tipo ?? "")) i++;
      else break;
    }
    if (!selettore) {
      if (!primoGruppo) return null;
      for (let g = 0; g < 7; g++) giorni.add(g);
    } else if (giorni.size === 0) {
      soloFestivi = true;
    }
    // Orari del gruppo.
    const intervalli: Intervallo[] = [];
    const t = prossimo();
    if (t?.tipo === "chiuso") {
      i++;
    } else if (t?.tipo === "aperto") {
      i++;
      intervalli.push({ inizio: 0, fine: FINE_GIORNO });
    } else if (t?.tipo === "orario") {
      for (;;) {
        const da = token[i];
        const trattino = token[i + 1];
        const a = token[i + 2];
        if (da?.tipo !== "orario" || trattino?.tipo !== "trattino" || a?.tipo !== "orario") return null;
        intervalli.push({ inizio: da.minuti, fine: a.minuti });
        i += 3;
        if (prossimo()?.tipo === "virgola" && token[i + 1]?.tipo === "orario") i++;
        else break;
      }
    } else {
      return null;
    }
    if (!soloFestivi && !applicaGruppo(effetto, giorni, intervalli)) return null;
    primoGruppo = false;
    // Dopo un gruppo: fine della regola, oppure una regola aggiuntiva che inizia con dei giorni.
    if (i < token.length) {
      if (prossimo()?.tipo !== "virgola" || !["giorno", "festivo"].includes(token[i + 1]?.tipo ?? "")) return null;
      i++;
    }
  }
  return effetto;
}

/** Aggiunge le fasce di un gruppo ai suoi giorni; la parte dopo la mezzanotte va al giorno dopo. */
function applicaGruppo(effetto: EffettoRegola, giorni: ReadonlySet<number>, intervalli: readonly Intervallo[]): boolean {
  for (const g of giorni) {
    effetto.giorni.add(g);
    for (const { inizio, fine: fineLetta } of intervalli) {
      if (inizio >= FINE_GIORNO) return false;
      const fine = fineLetta === 0 ? FINE_GIORNO : fineLetta;
      if (fine === inizio) return false;
      if (fine > inizio && fine <= FINE_GIORNO) {
        effetto.fasce[g]?.push({ inizio, fine });
        continue;
      }
      // Oltre la mezzanotte: `18:00-02:00` oppure `18:00-26:00`.
      const dopoMezzanotte = fine > FINE_GIORNO ? fine - FINE_GIORNO : fine;
      if (dopoMezzanotte > FINE_GIORNO || (fine > FINE_GIORNO && dopoMezzanotte > inizio)) return false;
      effetto.fasce[g]?.push({ inizio, fine: FINE_GIORNO });
      if (dopoMezzanotte > 0) effetto.fasce[(g + 1) % 7]?.push({ inizio: 0, fine: dopoMezzanotte });
    }
  }
  return true;
}

/** Fasce in ordine, con quelle sovrapposte o che si toccano unite in una sola. */
function unisci(fasce: readonly Intervallo[]): Intervallo[] {
  const ordinate = [...fasce].sort((x, y) => x.inizio - y.inizio || x.fine - y.fine);
  const unite: Intervallo[] = [];
  for (const f of ordinate) {
    const ultima = unite.at(-1);
    if (ultima !== undefined && f.inizio <= ultima.fine) ultima.fine = Math.max(ultima.fine, f.fine);
    else unite.push({ ...f });
  }
  return unite;
}

const due = (n: number): string => String(n).padStart(2, "0");
const orario = (minuti: number): string => `${due(Math.floor(minuti / 60))}:${due(minuti % 60)}`;

/**
 * Converte un valore del tag `opening_hours` negli orari di apertura del motore.
 * Restituisce `null` se il valore non è leggibile (vedi l'intestazione del file): mai un'eccezione.
 * Un orario aperto tutto il giorno ogni giorno diventa `{ sempre: true }`.
 */
export function leggiOrariOsm(testo: string): OrariApertura | null {
  if (typeof testo !== "string" || testo.trim() === "") return null;
  let settimana: Intervallo[][] = nuoveFasce();
  let almenoUnGiorno = false;
  for (const parte of testo.split(";")) {
    if (parte.trim() === "") continue;
    const token = tokenizza(parte);
    if (token === null || token.length === 0) return null;
    const effetto = leggiRegola(token);
    if (effetto === null) return null;
    if (effetto.giorni.size > 0) almenoUnGiorno = true;
    settimana = settimana.map((fasce, g) => [...(effetto.giorni.has(g) ? [] : fasce), ...(effetto.fasce[g] ?? [])]);
  }
  if (!almenoUnGiorno) return null;
  const unite = settimana.map(unisci);
  if (unite.every((fasce) => fasce.length === 1 && fasce[0]?.inizio === 0 && fasce[0]?.fine === FINE_GIORNO)) {
    return { sempre: true };
  }
  const voci = GIORNI_SETTIMANA.map((giorno, g): [GiornoSettimana, FasciaOraria[]] => [
    giorno,
    (unite[g] ?? []).map((f) => ({ apertura: orario(f.inizio), chiusura: orario(f.fine) })),
  ]);
  return { settimana: Object.fromEntries(voci) as Record<GiornoSettimana, FasciaOraria[]> };
}
