/**
 * Il disegno delle illustrazioni dei luoghi (ST-UX-003B, CB-4): forme piatte e sovrapposte, generate in modo
 * deterministico dal tipo di luogo e da un seme (il nome): stesso luogo, stesso disegno; luoghi diversi dello stesso tipo
 * hanno montagne, case e alberi in posti diversi. Nessun colore qui: ogni forma ha solo uno strato, e i colori li
 * danno i token (`--colore-luogo-<tipo>`) dal foglio di stile.
 */
import type { TipoLuogo } from "./luoghi-config";

/** Lo strato di una forma: dal più lontano e chiaro (`f1`) al più vicino e scuro (`f3`), più il chiaro (`neve`) e il sole. */
export type StratoForma = "f1" | "f2" | "f3" | "neve" | "sole";

export interface Forma {
  d: string;
  strato: StratoForma;
}

/** Il disegno è su un riquadro 160 × 90; l'immagine lo ritaglia (`slice`) su qualunque proporzione. */
export const LARGHEZZA_DISEGNO = 160;
export const ALTEZZA_DISEGNO = 90;

/** Hash FNV-1a a 32 bit: dal testo al seme. */
export function semeDa(testo: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < testo.length; i++) {
    h ^= testo.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Generatore pseudo-casuale mulberry32: stessi semi, stesse sequenze. */
export function generatore(seme: number): () => number {
  let a = seme >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Casuale = () => number;
const tra = (r: Casuale, min: number, max: number): number => min + r() * (max - min);
const n = (v: number): string => String(Math.round(v * 10) / 10);

function cerchio(cx: number, cy: number, r: number): string {
  return `M${n(cx - r)} ${n(cy)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0Z`;
}

function rettangolo(x: number, y: number, w: number, h: number): string {
  return `M${n(x)} ${n(y)}h${n(w)}v${n(h)}h${n(-w)}Z`;
}

function poligono(punti: readonly (readonly [number, number])[]): string {
  return `M${punti.map(([x, y]) => `${n(x)} ${n(y)}`).join("L")}Z`;
}

/** Una linea di colline morbide che arriva al bordo inferiore: `base` è l'altezza media, `ampiezza` la variazione. */
function colline(r: Casuale, base: number, ampiezza: number, punti: number): string {
  const passo = LARGHEZZA_DISEGNO / punti;
  const ys = Array.from({ length: punti + 1 }, () => base + tra(r, -ampiezza, ampiezza));
  let d = `M0 ${ALTEZZA_DISEGNO}V${n(ys[0] ?? base)}`;
  for (let i = 1; i <= punti; i++) {
    const x0 = (i - 1) * passo;
    const x1 = i * passo;
    const y0 = ys[i - 1] ?? base;
    const y1 = ys[i] ?? base;
    d += `C${n(x0 + passo / 2)} ${n(y0)} ${n(x1 - passo / 2)} ${n(y1)} ${n(x1)} ${n(y1)}`;
  }
  return `${d}V${ALTEZZA_DISEGNO}Z`;
}

/** Il sole (o la luna): un cerchio in alto, a sinistra o a destra secondo il seme. */
function sole(r: Casuale, y: number): Forma {
  const aDestra = r() > 0.5;
  return { d: cerchio(aDestra ? tra(r, 108, 140) : tra(r, 20, 52), y + tra(r, -4, 6), tra(r, 7, 11)), strato: "sole" };
}

function vette(r: Casuale, quante: number, base: number, altezzaMin: number, altezzaMax: number, conNeve: boolean): Forma[] {
  const forme: Forma[] = [];
  const passo = LARGHEZZA_DISEGNO / quante;
  for (let i = 0; i < quante; i++) {
    const x = passo * (i + 0.5) + tra(r, -passo / 4, passo / 4);
    const alt = tra(r, altezzaMin, altezzaMax);
    const metà = alt * tra(r, 0.7, 0.95);
    forme.push({ d: poligono([[x - metà, base], [x, base - alt], [x + metà, base]]), strato: i % 2 === 0 ? "f2" : "f3" });
    if (conNeve) {
      const k = 0.28;
      forme.push({ d: poligono([[x - metà * k, base - alt * (1 - k)], [x, base - alt], [x + metà * k, base - alt * (1 - k)], [x + metà * k * 0.3, base - alt * (1 - k) + 2]]), strato: "neve" });
    }
  }
  return forme;
}

function abeti(r: Casuale, quanti: number, yMin: number, yMax: number): Forma[] {
  return Array.from({ length: quanti }, () => {
    const x = tra(r, 4, LARGHEZZA_DISEGNO - 4);
    const y = tra(r, yMin, yMax);
    const h = tra(r, 7, 13);
    return { d: poligono([[x - h * 0.28, y], [x, y - h], [x + h * 0.28, y]]), strato: "f3" as const };
  });
}

function disegnaLago(r: Casuale): Forma[] {
  const forme: Forma[] = [sole(r, 18), ...vette(r, 4, 54, 16, 30, false).map((f) => ({ ...f, strato: "f1" as const }))];
  forme.push({ d: colline(r, 52, 4, 5), strato: "f2" });
  // Il lago: una fascia chiara con i riflessi.
  forme.push({ d: rettangolo(0, 58, LARGHEZZA_DISEGNO, ALTEZZA_DISEGNO - 58), strato: "f1" });
  for (let i = 0; i < 6; i++) forme.push({ d: rettangolo(tra(r, 6, 130), 62 + i * 4.4, tra(r, 14, 30), 1), strato: "neve" });
  forme.push({ d: colline(r, 84, 3, 4), strato: "f3" });
  return forme;
}

function disegnaMontagna(r: Casuale): Forma[] {
  const forme: Forma[] = [sole(r, 16)];
  forme.push(...vette(r, 3, 66, 30, 46, true));
  forme.push({ d: colline(r, 74, 4, 5), strato: "f2" });
  forme.push(...abeti(r, 9, 78, 88));
  return forme;
}

function disegnaMare(r: Casuale): Forma[] {
  const orizzonte = tra(r, 48, 54);
  const forme: Forma[] = [sole(r, orizzonte - 14)];
  forme.push({ d: rettangolo(0, orizzonte, LARGHEZZA_DISEGNO, ALTEZZA_DISEGNO - orizzonte), strato: "f2" });
  for (let i = 0; i < 5; i++) {
    const y = orizzonte + 8 + i * 7;
    forme.push({ d: rettangolo(tra(r, 0, 120), y, tra(r, 16, 40), 1.2), strato: "neve" });
  }
  // La barca: scafo e due vele.
  const x = tra(r, 50, 110);
  const y = orizzonte + 14;
  forme.push({ d: poligono([[x - 12, y], [x + 12, y], [x + 8, y + 5], [x - 8, y + 5]]), strato: "f3" });
  forme.push({ d: poligono([[x, y - 22], [x, y - 1], [x + 11, y - 1]]), strato: "neve" });
  forme.push({ d: poligono([[x - 1.5, y - 17], [x - 1.5, y - 1], [x - 9, y - 1]]), strato: "f3" });
  forme.push({ d: colline(r, 86, 2, 4), strato: "f3" });
  return forme;
}

function disegnaCitta(r: Casuale): Forma[] {
  const forme: Forma[] = [sole(r, 16)];
  const base = 78;
  forme.push({ d: rettangolo(0, base, LARGHEZZA_DISEGNO, ALTEZZA_DISEGNO - base), strato: "f3" });
  let x = tra(r, 2, 8);
  const cupola = Math.floor(tra(r, 2, 5));
  let indice = 0;
  while (x < LARGHEZZA_DISEGNO - 8) {
    const larghezza = tra(r, 11, 20);
    const altezza = tra(r, 14, 34);
    const strato: StratoForma = indice % 2 === 0 ? "f2" : "f3";
    forme.push({ d: rettangolo(x, base - altezza, larghezza, altezza), strato });
    if (indice === cupola) {
      // La cupola con la lanterna.
      const cx = x + larghezza / 2;
      forme.push({ d: `M${n(cx - larghezza * 0.45)} ${n(base - altezza)}a${n(larghezza * 0.45)} ${n(larghezza * 0.5)} 0 0 1 ${n(larghezza * 0.9)} 0Z`, strato });
      forme.push({ d: rettangolo(cx - 0.8, base - altezza - larghezza * 0.5 - 6, 1.6, 6), strato });
    } else if (indice % 3 === 1) {
      // Il campanile: tetto a punta.
      forme.push({ d: poligono([[x, base - altezza], [x + larghezza / 2, base - altezza - 9], [x + larghezza, base - altezza]]), strato });
    }
    for (let f = 0; f < 3; f++) {
      const wy = base - altezza + 4 + f * 6;
      if (wy < base - 4) forme.push({ d: rettangolo(x + 2.5, wy, 2, 2.5), strato: "neve" });
      if (wy < base - 4 && larghezza > 14) forme.push({ d: rettangolo(x + larghezza - 4.5, wy, 2, 2.5), strato: "neve" });
    }
    x += larghezza + tra(r, 0, 2);
    indice += 1;
  }
  return forme;
}

function disegnaBorgo(r: Casuale): Forma[] {
  const forme: Forma[] = [sole(r, 14)];
  forme.push({ d: colline(r, 50, 6, 4), strato: "f1" });
  forme.push({ d: colline(r, 66, 5, 5), strato: "f2" });
  // Le case sulla collina, con il tetto a falde, e la torre.
  const torre = Math.floor(tra(r, 2, 5));
  for (let i = 0; i < 7; i++) {
    const x = 12 + i * 20 + tra(r, -4, 4);
    const y = 64 + (i % 2) * 6 + tra(r, -2, 2);
    const w = tra(r, 12, 17);
    const h = tra(r, 9, 14);
    forme.push({ d: rettangolo(x, y, w, h), strato: "f3" });
    forme.push({ d: poligono([[x - 1.5, y], [x + w / 2, y - 6], [x + w + 1.5, y]]), strato: "f2" });
    forme.push({ d: rettangolo(x + w / 2 - 1.2, y + h - 5, 2.4, 5), strato: "neve" });
    if (i === torre) {
      forme.push({ d: rettangolo(x + w / 2 - 3, y - 22, 6, 22), strato: "f3" });
      forme.push({ d: poligono([[x + w / 2 - 4, y - 22], [x + w / 2, y - 29], [x + w / 2 + 4, y - 22]]), strato: "f2" });
    }
  }
  forme.push({ d: colline(r, 88, 2, 4), strato: "f3" });
  // I cipressi.
  for (let i = 0; i < 4; i++) {
    const x = tra(r, 6, 154);
    forme.push({ d: `M${n(x)} ${n(86)}c-3 -8 -2.5 -16 0 -24c2.5 8 3 16 0 24Z`, strato: "f3" });
  }
  return forme;
}

function disegnaParco(r: Casuale): Forma[] {
  const forme: Forma[] = [sole(r, 16)];
  forme.push({ d: colline(r, 52, 6, 4), strato: "f1" });
  forme.push({ d: colline(r, 64, 5, 5), strato: "f2" });
  const alberi = 8;
  for (let i = 0; i < alberi; i++) {
    const x = (LARGHEZZA_DISEGNO / alberi) * (i + 0.5) + tra(r, -6, 6);
    const y = 70 + tra(r, -4, 10);
    const raggio = tra(r, 6, 10);
    forme.push({ d: rettangolo(x - 1, y, 2, raggio * 0.9), strato: "f3" });
    forme.push({ d: cerchio(x, y - raggio * 0.4, raggio), strato: i % 2 === 0 ? "f3" : "f2" });
  }
  forme.push({ d: colline(r, 88, 2, 4), strato: "f3" });
  // Il sentiero che sale.
  forme.push({ d: `M${n(tra(r, 60, 100))} 90c8 -8 -10 -12 -2 -20c4 -4 6 -6 4 -8l-2 0c2 3 0 5 -4 9c-8 8 8 12 -2 19Z`, strato: "neve" });
  return forme;
}

function disegnaGenerico(r: Casuale): Forma[] {
  return [sole(r, 18), { d: colline(r, 50, 8, 4), strato: "f1" }, { d: colline(r, 64, 7, 5), strato: "f2" }, { d: colline(r, 78, 5, 5), strato: "f3" }];
}

const DISEGNATORI: Readonly<Record<TipoLuogo, (r: Casuale) => Forma[]>> = {
  lago: disegnaLago,
  montagna: disegnaMontagna,
  mare: disegnaMare,
  citta: disegnaCitta,
  borgo: disegnaBorgo,
  parco: disegnaParco,
  generico: disegnaGenerico,
};

/** Le forme dell'illustrazione, dal fondo in primo piano. Deterministiche: stesso tipo e stesso seme, stesso disegno. */
export function formeLuogo(tipo: TipoLuogo, seme: string): Forma[] {
  return DISEGNATORI[tipo](generatore(semeDa(`${tipo}:${seme}`)));
}
