/**
 * Contrasto dei colori del design system (REQ-UX-001, CA-2): le coppie testo/sfondo che l'interfaccia usa davvero e
 * il calcolo del rapporto di contrasto WCAG 2.2. Il test legge i valori dai token (`token.css`), in tema chiaro e
 * scuro, e controlla ogni coppia.
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
  { primoPiano: "--colore-su-secondario", sfondo: "--colore-secondario" },
  { primoPiano: "--colore-su-secondario", sfondo: "--colore-secondario-forte" },
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

function canale(valore: number): number {
  const s = valore / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Luminanza relativa di un colore `#rrggbb` o `#rgb` (WCAG 2.2). */
export function luminanza(esadecimale: string): number {
  let cifre = esadecimale.replace(/^#/, "");
  if (cifre.length === 3) cifre = [...cifre].map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(cifre)) throw new Error(`Colore non valido: ${esadecimale}`);
  const [r, g, b] = [0, 2, 4].map((i) => canale(Number.parseInt(cifre.slice(i, i + 2), 16)));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

/** Rapporto di contrasto tra due colori, da 1 a 21. */
export function rapportoContrasto(a: string, b: string): number {
  const [chiaro, scuro] = [luminanza(a), luminanza(b)].sort((x, y) => y - x);
  return ((chiaro ?? 0) + 0.05) / ((scuro ?? 0) + 0.05);
}
