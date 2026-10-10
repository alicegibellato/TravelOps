/**
 * Logica pura del percorso guidato (REQ-PREF-001): i 5 passi, le modifiche alla bozza e il riepilogo vivo.
 * Nessuna regola di validazione qui: valori ammessi e problemi vengono dal motore, sul server.
 */
import { dataBreve, periodo } from "../viste/etichette";
import { TESTI_STILI } from "../ui/stili";
import type { StileViaggio } from "../testi";
import type { BozzaProfilo, OpzioneScelta, OpzioniPercorso } from "./tipi";

export type NumeroPasso = 1 | 2 | 3 | 4 | 5;

export interface PassoPercorso {
  numero: NumeroPasso;
  titolo: string;
  /** Si può saltare: ha valori predefiniti. */
  saltabile: boolean;
}

export const PASSI: readonly PassoPercorso[] = [
  { numero: 1, titolo: "Dove", saltabile: false },
  { numero: 2, titolo: "Quando e quanto", saltabile: false },
  { numero: 3, titolo: "Chi", saltabile: true },
  { numero: 4, titolo: "Che viaggio", saltabile: true },
  { numero: 5, titolo: "Dettagli facoltativi", saltabile: true },
];

export const ULTIMO_PASSO: NumeroPasso = 5;

/** Durata proposta quando si sceglie «mese e durata». */
export const DURATA_INIZIALE = 3;
export const MASSIMO_ADULTI = 9;
export const MASSIMO_BAMBINI = 6;
export const ETA_INIZIALE_BAMBINO = 5;

type Campo = keyof BozzaProfilo;

/** I campi che si compilano in ciascun passo facoltativo (per «Salta»). */
const CAMPI_DEL_PASSO: Readonly<Record<NumeroPasso, readonly Campo[]>> = {
  1: ["destinazione"],
  2: ["date", "durata"],
  3: ["viaggiatori", "tipoGruppo"],
  4: ["stili", "ritmo", "formaFisica", "budget"],
  5: ["orari", "pasti", "mezzi", "irrinunciabili", "daEvitare", "esigenze"],
};

export function alterna<T>(elenco: readonly T[], valore: T, attivo: boolean): T[] {
  const senza = elenco.filter((v) => v !== valore);
  return attivo ? [...senza, valore] : senza;
}

/** La bozza senza ciò che si compila in quel passo: tornano i valori predefiniti. */
export function senzaPasso(bozza: BozzaProfilo, passo: NumeroPasso): BozzaProfilo {
  const copia: BozzaProfilo = { ...bozza };
  for (const campo of CAMPI_DEL_PASSO[passo]) delete copia[campo];
  return copia;
}

/**
 * Il passo ha già una scelta nella bozza (REQ-CHAT-003 CA-4): il percorso lo segna come compilato. Le date contano solo
 * se sono complete (date precise con inizio e fine, oppure il mese).
 */
export function passoCompilato(bozza: BozzaProfilo, passo: NumeroPasso): boolean {
  if (passo === 2) {
    const date = bozza.date;
    return date !== undefined && (date.tipo === "mese" ? date.mese !== "" : date.inizio !== "" && date.fine !== "");
  }
  return CAMPI_DEL_PASSO[passo].some((campo) => bozza[campo] !== undefined);
}

/** Il primo passo ancora da compilare; l'ultimo se sono tutti compilati (REQ-CHAT-003 CA-4). */
export function primoPassoMancante(bozza: BozzaProfilo): NumeroPasso {
  return PASSI.find((p) => !passoCompilato(bozza, p.numero))?.numero ?? ULTIMO_PASSO;
}

/** Vero se le due bozze hanno le stesse scelte, a prescindere dall'ordine dei campi. */
export function stesseScelte(prima: BozzaProfilo, dopo: BozzaProfilo): boolean {
  const ordinato = (valore: unknown): unknown => {
    if (Array.isArray(valore)) return valore.map(ordinato);
    if (typeof valore !== "object" || valore === null) return valore;
    return Object.fromEntries(
      Object.entries(valore)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, ordinato(v)]),
    );
  };
  return JSON.stringify(ordinato(prima)) === JSON.stringify(ordinato(dopo));
}

export type ModoDate = "precise" | "mese";

export function modoDelleDate(bozza: BozzaProfilo): ModoDate {
  return bozza.date?.tipo === "mese" ? "mese" : "precise";
}

/** Cambia il modo di indicare le date: con il mese serve la durata, con le date precise la ricava il motore. */
export function conModoDate(bozza: BozzaProfilo, modo: ModoDate): BozzaProfilo {
  const { date: _date, durata: _durata, ...resto } = bozza;
  return modo === "mese" ? { ...resto, durata: DURATA_INIZIALE } : resto;
}

export function conDatePrecise(bozza: BozzaProfilo, inizio: string, fine: string): BozzaProfilo {
  const { durata: _durata, ...resto } = bozza;
  return { ...resto, date: { tipo: "precise", inizio, fine } };
}

export function conMese(bozza: BozzaProfilo, mese: string): BozzaProfilo {
  const { date: _date, ...resto } = bozza;
  const base = { ...resto, durata: bozza.durata ?? DURATA_INIZIALE };
  return mese === "" ? base : { ...base, date: { tipo: "mese", mese } };
}

export function conAdulti(bozza: BozzaProfilo, adulti: number): BozzaProfilo {
  return { ...bozza, viaggiatori: { bambini: [], ...bozza.viaggiatori, adulti } };
}

/** Porta i bambini a quel numero, tenendo le età già scelte. */
export function conNumeroBambini(bozza: BozzaProfilo, numero: number, adulti: number): BozzaProfilo {
  const eta = bozza.viaggiatori?.bambini ?? [];
  const bambini = Array.from({ length: numero }, (_, i) => eta[i] ?? ETA_INIZIALE_BAMBINO);
  return { ...bozza, viaggiatori: { adulti, ...bozza.viaggiatori, bambini } };
}

export function conEtaBambino(bozza: BozzaProfilo, indice: number, eta: number, adulti: number): BozzaProfilo {
  const bambini = [...(bozza.viaggiatori?.bambini ?? [])];
  bambini[indice] = eta;
  return { ...bozza, viaggiatori: { adulti, ...bozza.viaggiatori, bambini } };
}

// --- Riepilogo vivo --------------------------------------------------------------------------------

export interface VoceRiepilogo {
  campo: keyof BozzaProfilo;
  passo: NumeroPasso;
  etichetta: string;
  valore: string;
  /** Manca un dato obbligatorio. */
  mancante: boolean;
  /** Il valore non è stato scelto: è quello predefinito o «nessuno» (il riepilogo compatto lo tiene da parte). */
  predefinita: boolean;
}

/** I valori che dicono «non scelto» senza essere il predefinito di un elenco. */
const VALORI_NON_SCELTI: ReadonlySet<string> = new Set(["Lo ricavo da chi viaggia", "Nessuno", "Niente", "Nessuna"]);

const nomiDi = <T extends string>(valori: readonly T[], opzioni: readonly OpzioneScelta<T>[]): string =>
  valori.map((v) => opzioni.find((o) => o.valore === v)?.etichetta ?? v).join(", ");

const nomiStili = (stili: readonly string[]): string => stili.map((s) => TESTI_STILI[s as StileViaggio] ?? s).join(", ");

function etichettaMese(mese: string, mesi: readonly { valore: string; etichetta: string }[]): string {
  return mesi.find((m) => m.valore === mese)?.etichetta ?? mese;
}

function giorni(n: number): string {
  return `${n} ${n === 1 ? "giorno" : "giorni"}`;
}

/** Le preferenze in parole, nell'ordine dei passi, per il riepilogo a lato. */
export function riepilogo(
  bozza: BozzaProfilo,
  opzioni: OpzioniPercorso,
  mesi: readonly { valore: string; etichetta: string }[],
): VoceRiepilogo[] {
  const p = opzioni.predefiniti;
  const e = opzioni.etichetteCampo;
  const predefinito = (testo: string): string => `${testo} (predefinito)`;
  const voce = (campo: keyof BozzaProfilo, passo: NumeroPasso, valore: string | null, obbligatorio = false): VoceRiepilogo => ({
    campo,
    passo,
    etichetta: e[campo],
    valore: valore ?? (obbligatorio ? "Da scegliere" : ""),
    mancante: valore === null && obbligatorio,
    predefinita: valore !== null && (valore.endsWith("(predefinito)") || VALORI_NON_SCELTI.has(valore)),
  });

  const dest = bozza.destinazione;
  const destinazione = dest === undefined ? null : dest.tipo === "sorprendimi" ? "La scelgo più tardi con Sorprendimi" : dest.nome;

  const date = bozza.date;
  let testoDate: string | null = null;
  if (date?.tipo === "precise" && date.inizio !== "" && date.fine !== "") testoDate = periodo(date.inizio, date.fine);
  else if (date?.tipo === "precise" && date.inizio !== "") testoDate = `Dal ${dataBreve(date.inizio)}`;
  else if (date?.tipo === "mese") testoDate = etichettaMese(date.mese, mesi);

  const adulti = bozza.viaggiatori?.adulti ?? p.adulti;
  const bambini = bozza.viaggiatori?.bambini ?? [];
  const persone = [`${adulti} ${adulti === 1 ? "adulto" : "adulti"}`];
  if (bambini.length > 0) persone.push(`${bambini.length} ${bambini.length === 1 ? "bambino" : "bambini"} (età: ${bambini.join(", ")})`);
  const viaggiatori = persone.join(", ");

  const pasti = { ...p.pasti, ...bozza.pasti };
  const elencoPasti = [pasti.pranzo ? "pranzo" : "", pasti.cena ? "cena" : ""].filter((x) => x !== "").join(" e ");
  const nessunoStile = (stili: readonly string[] | undefined): string | null => (stili === undefined || stili.length === 0 ? null : nomiStili(stili));

  const stili = bozza.stili;
  const mezzi = bozza.mezzi;
  const durata = bozza.durata;
  const ritmo = bozza.ritmo;
  const forma = bozza.formaFisica;
  const budget = bozza.budget;
  const orari = bozza.orari;
  const trova = <T extends string>(valore: T, elenco: readonly OpzioneScelta<T>[]): string => nomiDi([valore], elenco);

  return [
    voce("destinazione", 1, destinazione, true),
    voce("date", 2, testoDate, true),
    voce("durata", 2, durata === undefined ? (date?.tipo === "precise" ? "In base alle date" : null) : giorni(durata), true),
    voce("viaggiatori", 3, bozza.viaggiatori === undefined ? predefinito(viaggiatori) : viaggiatori),
    voce("tipoGruppo", 3, bozza.tipoGruppo === undefined ? "Lo ricavo da chi viaggia" : trova(bozza.tipoGruppo, opzioni.tipiGruppo)),
    voce("stili", 4, stili === undefined ? predefinito(nomiStili(p.stili)) : nomiStili(stili)),
    voce("ritmo", 4, ritmo === undefined ? predefinito(trova(p.ritmo, opzioni.ritmi)) : trova(ritmo, opzioni.ritmi)),
    voce("formaFisica", 4, forma === undefined ? predefinito(trova(p.formaFisica, opzioni.formeFisiche)) : trova(forma, opzioni.formeFisiche)),
    voce("budget", 4, budget === undefined ? predefinito(trova(p.budget, opzioni.budget)) : trova(budget, opzioni.budget)),
    voce("orari", 5, orari === undefined ? predefinito(trova(p.orari, opzioni.orari)) : trova(orari, opzioni.orari)),
    voce("pasti", 5, bozza.pasti === undefined ? predefinito(elencoPasti) : elencoPasti === "" ? "Nessun pasto nel piano" : elencoPasti),
    voce("mezzi", 5, mezzi === undefined ? predefinito("tutti") : nomiDi(mezzi, opzioni.mezzi)),
    voce("irrinunciabili", 5, nessunoStile(bozza.irrinunciabili?.stili) ?? "Nessuno"),
    voce("daEvitare", 5, nessunoStile(bozza.daEvitare?.stili) ?? "Niente"),
    voce("esigenze", 5, bozza.esigenze === undefined || bozza.esigenze.length === 0 ? "Nessuna" : nomiDi(bozza.esigenze, opzioni.esigenze)),
  ];
}
