/**
 * Contrasto dei colori del design system (REQ-UX-001, CA-2): le coppie testo/sfondo che l'interfaccia usa davvero e
 * il calcolo del rapporto di contrasto WCAG 2.2. I colori dei token sono in OKLCH (`oklch(L C H)`), anche
 * mescolati con `color-mix(in oklch, …)`; si leggono anche gli esadecimali. Il test legge i valori dai token
 * (`token.css`), in tema chiaro e scuro, e controlla ogni coppia.
 */

/** Una coppia di token: il colore in primo piano e quello dello sfondo su cui compare. */
export interface CoppiaColori {
  primoPiano: string;
  sfondo: string;
}

/** Gli sfondi su cui compare il testo normale. */
export const SFONDI_TESTO = ["--colore-sfondo", "--colore-superficie", "--colore-superficie-2"] as const;

/** I colori del testo che compaiono su tutti gli sfondi. */
const TESTI_SU_SFONDI = [
  "--colore-testo",
  "--colore-testo-tenue",
  "--colore-primario-testo",
  "--colore-primario-forte",
  "--colore-secondario-testo",
  "--colore-successo",
  "--colore-attenzione",
  "--colore-errore",
] as const;

/** Testo su un colore pieno (pulsanti, badge, indicatori della mappa). */
const SU_COLORE_PIENO: CoppiaColori[] = [
  { primoPiano: "--colore-su-primario", sfondo: "--colore-primario" },
  { primoPiano: "--colore-su-primario", sfondo: "--colore-primario-forte" },
  { primoPiano: "--colore-su-primario", sfondo: "--colore-primario-attivo" },
  { primoPiano: "--colore-su-secondario", sfondo: "--colore-secondario" },
  { primoPiano: "--colore-su-secondario", sfondo: "--colore-secondario-forte" },
  { primoPiano: "--colore-su-secondario", sfondo: "--colore-secondario-attivo" },
  { primoPiano: "--colore-su-accento", sfondo: "--colore-accento" },
];

/** Testo colorato sulla sua tinta (badge, avvisi, chip, segnalazioni). */
const SU_TINTA: CoppiaColori[] = [
  { primoPiano: "--colore-primario-testo", sfondo: "--colore-primario-tenue" },
  { primoPiano: "--colore-secondario-testo", sfondo: "--colore-secondario-tenue" },
  { primoPiano: "--colore-accento-testo", sfondo: "--colore-accento-tenue" },
  { primoPiano: "--colore-successo", sfondo: "--colore-successo-tenue" },
  { primoPiano: "--colore-attenzione", sfondo: "--colore-attenzione-tenue" },
  { primoPiano: "--colore-errore", sfondo: "--colore-errore-tenue" },
  { primoPiano: "--colore-testo", sfondo: "--colore-primario-tenue" },
  { primoPiano: "--colore-testo", sfondo: "--colore-successo-tenue" },
  { primoPiano: "--colore-testo", sfondo: "--colore-attenzione-tenue" },
  { primoPiano: "--colore-testo", sfondo: "--colore-errore-tenue" },
  { primoPiano: "--colore-testo", sfondo: "--colore-accento-tenue" },
];

/** Gli stili di viaggio: ognuno ha un colore pieno e una tinta (REQ-UX-001 §6.1). */
export const STILI_COLORE = ["relax", "cultura", "natura", "avventura", "gastronomia", "romantico", "famiglia"] as const;

/** Tutte le coppie di testo da verificare: almeno 4.5:1. */
export const COPPIE_TESTO: readonly CoppiaColori[] = [
  ...TESTI_SU_SFONDI.flatMap((primoPiano) => SFONDI_TESTO.map((sfondo) => ({ primoPiano, sfondo }))),
  ...SU_COLORE_PIENO,
  ...SU_TINTA,
  ...STILI_COLORE.flatMap((stile) => [
    { primoPiano: `--colore-stile-${stile}`, sfondo: `--colore-stile-${stile}-tenue` },
    ...SFONDI_TESTO.map((sfondo) => ({ primoPiano: `--colore-stile-${stile}`, sfondo })),
  ]),
];

/** Elementi grafici che non sono testo (bordo dei campi, anello del focus): almeno 3:1 (WCAG 1.4.11). */
export const COPPIE_GRAFICHE: readonly CoppiaColori[] = [
  ...SFONDI_TESTO.map((sfondo) => ({ primoPiano: "--colore-bordo-forte", sfondo })),
  ...SFONDI_TESTO.map((sfondo) => ({ primoPiano: "--colore-focus", sfondo })),
];

/** Contrasto minimo per il testo (WCAG 2.2 AA, 1.4.3) e per gli elementi grafici (1.4.11). */
export const CONTRASTO_MINIMO_TESTO = 4.5;
export const CONTRASTO_MINIMO_GRAFICA = 3;

/** Un colore in OKLCH con trasparenza; la tinta è `null` quando non è definita (colori senza croma). */
interface ColoreOklch {
  l: number;
  c: number;
  h: number | null;
  alfa: number;
}

/** Sotto questa soglia di croma la tinta non conta (grigi, bianco, nero), come nei CSS Color 4. */
const CROMA_ASSENTE = 1e-4;

function canale(valore: number): number {
  const s = valore / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function canaleInverso(lineare: number): number {
  const v = Math.min(1, Math.max(0, lineare));
  return 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
}

/** Divide `a, b, c` alle virgole di primo livello (quelle fuori dalle parentesi). */
export function dividiArgomenti(testo: string): string[] {
  const parti: string[] = [];
  let profondita = 0;
  let inizio = 0;
  for (let i = 0; i < testo.length; i += 1) {
    const c = testo[i];
    if (c === "(") profondita += 1;
    else if (c === ")") profondita -= 1;
    else if (c === "," && profondita === 0) {
      parti.push(testo.slice(inizio, i).trim());
      inizio = i + 1;
    }
  }
  parti.push(testo.slice(inizio).trim());
  return parti;
}

/** Il contenuto delle parentesi di `nome(…)` se `testo` è esattamente quella funzione, altrimenti `null`. */
function argomentiDi(testo: string, nome: string): string | null {
  const t = testo.trim();
  if (!t.toLowerCase().startsWith(`${nome}(`) || !t.endsWith(")")) return null;
  return t.slice(nome.length + 1, -1);
}

function numero(testo: string, scala = 1): number {
  const t = testo.trim();
  if (t === "none") return 0;
  const percentuale = t.endsWith("%");
  const n = Number.parseFloat(percentuale ? t.slice(0, -1) : t);
  if (Number.isNaN(n)) throw new Error(`Numero non valido: ${testo}`);
  return percentuale ? (n / 100) * scala : n;
}

/** Legge `oklch(L C H)` o `oklch(L C H / A)`: L in 0–1 o in percentuale, H in gradi. */
function leggiOklch(argomenti: string): ColoreOklch {
  const [componenti = "", alfa] = argomenti.split("/");
  const [l = "", c = "", h = ""] = componenti.trim().split(/\s+/);
  if (l === "" || c === "" || h === "") throw new Error(`Colore OKLCH non valido: oklch(${argomenti})`);
  const croma = numero(c, 0.4);
  return {
    l: numero(l),
    c: croma,
    h: croma < CROMA_ASSENTE ? null : ((numero(h.replace(/deg$/, "")) % 360) + 360) % 360,
    alfa: alfa === undefined ? 1 : Math.min(1, Math.max(0, numero(alfa))),
  };
}

/** Converte un esadecimale `#rgb` o `#rrggbb` in OKLCH. */
function daEsadecimale(esadecimale: string): ColoreOklch {
  let cifre = esadecimale.replace(/^#/, "");
  if (cifre.length === 3) cifre = [...cifre].map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(cifre)) throw new Error(`Colore non valido: ${esadecimale}`);
  const [r = 0, g = 0, b = 0] = [0, 2, 4].map((i) => canale(Number.parseInt(cifre.slice(i, i + 2), 16)));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const croma = Math.hypot(a, bb);
  return { l: L, c: croma, h: croma < CROMA_ASSENTE ? null : ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360, alfa: 1 };
}

/** Mescola due colori in OKLCH come `color-mix(in oklch, …)`: L e C con la trasparenza premoltiplicata, la tinta lungo l'arco più corto. */
function mescola(primo: ColoreOklch, secondo: ColoreOklch, quotaPrimo: number): ColoreOklch {
  const w1 = quotaPrimo;
  const w2 = 1 - quotaPrimo;
  const alfa = primo.alfa * w1 + secondo.alfa * w2;
  const pesa = (a: number, b: number) => (alfa === 0 ? 0 : (a * primo.alfa * w1 + b * secondo.alfa * w2) / alfa);
  let h: number | null;
  if (primo.h === null || primo.alfa === 0) h = secondo.h;
  else if (secondo.h === null || secondo.alfa === 0) h = primo.h;
  else {
    let delta = secondo.h - primo.h;
    if (delta > 180) delta -= 360;
    else if (delta < -180) delta += 360;
    h = (((primo.h + delta * w2) % 360) + 360) % 360;
  }
  return { l: pesa(primo.l, secondo.l), c: pesa(primo.c, secondo.c), h, alfa };
}

/** `color-mix(in oklch, A p%, B q%)`: le quote mancanti si completano a 100%. */
function leggiMescola(argomenti: string): ColoreOklch {
  const [spazio, ...colori] = dividiArgomenti(argomenti);
  if (spazio?.replace(/\s+/g, " ") !== "in oklch" || colori.length !== 2) throw new Error(`color-mix non supportato: ${argomenti}`);
  const [a = "", b = ""] = colori;
  const separa = (testo: string): { colore: string; quota: number | null } => {
    const trovato = /^(.*?)\s+(\d+(?:\.\d+)?)%$/.exec(testo.trim()) ?? /^(\d+(?:\.\d+)?)%\s+(.*)$/.exec(testo.trim());
    if (trovato === null) return { colore: testo.trim(), quota: null };
    const prima = /^\d/.test(testo.trim());
    return prima ? { colore: trovato[2] ?? "", quota: Number(trovato[1]) / 100 } : { colore: trovato[1] ?? "", quota: Number(trovato[2]) / 100 };
  };
  const [pa, pb] = [separa(a), separa(b)];
  const quotaA = pa.quota ?? (pb.quota === null ? 0.5 : 1 - pb.quota);
  const quotaB = pb.quota ?? 1 - quotaA;
  const somma = quotaA + quotaB;
  return mescola(leggiColore(pa.colore), leggiColore(pb.colore), quotaA / somma);
}

/** Legge un colore: `#rrggbb`, `#rgb`, `oklch(…)`, `color-mix(in oklch, …)` o `transparent`. */
export function leggiColore(testo: string): ColoreOklch {
  const t = testo.trim();
  if (t.startsWith("#")) return daEsadecimale(t);
  if (t.toLowerCase() === "transparent") return { l: 0, c: 0, h: null, alfa: 0 };
  const oklch = argomentiDi(t, "oklch");
  if (oklch !== null) return leggiOklch(oklch);
  const miscela = argomentiDi(t, "color-mix");
  if (miscela !== null) return leggiMescola(miscela);
  throw new Error(`Colore non valido: ${testo}`);
}

/** I canali sRGB lineari (0–1) di un colore OKLCH, senza ritagliare quelli fuori gamma. */
function oklchALineare({ l, c, h }: ColoreOklch): [number, number, number] {
  const a = h === null ? 0 : c * Math.cos((h * Math.PI) / 180);
  const b = h === null ? 0 : c * Math.sin((h * Math.PI) / 180);
  const l1 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m1 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s1 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l1 - 3.3077115913 * m1 + 0.2309699292 * s1,
    -1.2684380046 * l1 + 2.6097574011 * m1 - 0.3413193965 * s1,
    -0.0041960863 * l1 - 0.7034186147 * m1 + 1.7076147010 * s1,
  ];
}

/** `true` se il colore sta dentro la gamma sRGB (nessun canale fuori da 0–1 oltre una tolleranza minima). */
export function inGammaSrgb(colore: string): boolean {
  return oklchALineare(leggiColore(colore)).every((v) => v >= -0.0005 && v <= 1.0005);
}

/** Il colore come `#rrggbb` (gamma ritagliata), utile per i messaggi dei test. */
export function inEsadecimale(colore: string): string {
  const [r, g, b] = oklchALineare(leggiColore(colore)).map((v) => Math.round(canaleInverso(v)));
  return `#${[r, g, b].map((v) => (v ?? 0).toString(16).padStart(2, "0")).join("")}`;
}

/** Luminanza relativa (WCAG 2.2) di un colore opaco: `#rrggbb`, `#rgb`, `oklch(…)` o `color-mix(in oklch, …)`. */
export function luminanza(colore: string): number {
  if (colore.trim().startsWith("#")) {
    // Gli esadecimali si leggono direttamente, senza passare da OKLCH.
    let cifre = colore.trim().replace(/^#/, "");
    if (cifre.length === 3) cifre = [...cifre].map((c) => c + c).join("");
    if (!/^[0-9a-fA-F]{6}$/.test(cifre)) throw new Error(`Colore non valido: ${colore}`);
    const [r, g, b] = [0, 2, 4].map((i) => canale(Number.parseInt(cifre.slice(i, i + 2), 16)));
    return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
  }
  const letto = leggiColore(colore);
  if (letto.alfa < 1) throw new Error(`Colore non opaco: ${colore}`);
  const [r, g, b] = oklchALineare(letto).map((v) => Math.min(1, Math.max(0, v)));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

/** Rapporto di contrasto tra due colori, da 1 a 21. */
export function rapportoContrasto(a: string, b: string): number {
  const [chiaro, scuro] = [luminanza(a), luminanza(b)].sort((x, y) => y - x);
  return ((chiaro ?? 0) + 0.05) / ((scuro ?? 0) + 0.05);
}
