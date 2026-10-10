/**
 * Gli imprevisti strutturati per chi non passa dal modello (REQ-IMPR-001): la web app costruisce dai moduli di
 * "Ho un imprevisto" lo stesso imprevisto che costruisce lo strumento `proponi_ripianificazione`, con gli stessi
 * controlli, e legge l'elemento in corso. Così codici dei tipi e calcoli sugli orari restano fuori dalla web app.
 */
import type { ImprevistoEsteso, IstantaneaCatalogo, Viaggio } from "@travelops/engine";
import { costruisciImprevisto, type ArgomentiImprevisto } from "./strumenti.js";

/** I tipi di imprevisto, per nome. */
export const TIPO_IMPREVISTO = {
  meteo: "METEO_AVVERSO",
  ritardo: "RITARDO",
  chiusura: "CHIUSURA_LUOGO",
  cancellazione: "CANCELLAZIONE_SPOSTAMENTO",
  voloPerso: "VOLO_PERSO",
  salute: "SALUTE",
  sciopero: "SCIOPERO",
  bagaglio: "BAGAGLIO_SMARRITO",
  documenti: "DOCUMENTI_SMARRITI",
  stanchezza: "STANCHEZZA",
} as const satisfies Record<string, ImprevistoEsteso["tipo"]>;

export type NomeTipoImprevisto = keyof typeof TIPO_IMPREVISTO;

/** Minuti dalla mezzanotte di un orario `HH:mm`. */
export function minutiDelGiorno(orario: string): number {
  const [ore, minuti] = orario.split(":").map(Number);
  return (ore ?? 0) * 60 + (minuti ?? 0);
}

/** L'orario `HH:mm` dopo `minuti` minuti, senza passare la mezzanotte (al massimo 23:59). */
export function orarioDopo(orario: string, minuti: number): string {
  const totale = Math.max(0, Math.min(minutiDelGiorno(orario) + minuti, 23 * 60 + 59));
  return `${String(Math.floor(totale / 60)).padStart(2, "0")}:${String(totale % 60).padStart(2, "0")}`;
}

/** L'elemento in corso a quell'ora del giorno, oppure il prossimo; `null` se il giorno è finito o non c'è. */
export function elementoInCorso(viaggio: Viaggio, data: string, orario: string): Viaggio["giorni"][number]["elementi"][number] | null {
  const elementi = viaggio.giorni.find((g) => g.data === data)?.elementi ?? [];
  const adesso = minutiDelGiorno(orario);
  return (
    elementi.find((e) => minutiDelGiorno(e.inizio) <= adesso && adesso < minutiDelGiorno(e.fine)) ??
    elementi.find((e) => minutiDelGiorno(e.inizio) >= adesso) ??
    null
  );
}

/** Vero se `fine` viene dopo `inizio` nello stesso giorno. */
export function fineDopoInizio(inizio: string, fine: string): boolean {
  return minutiDelGiorno(fine) > minutiDelGiorno(inizio);
}

export type EsitoImprevisto = { ok: true; imprevisto: ImprevistoEsteso } | { ok: false; messaggio: string };

/**
 * L'imprevisto strutturato dai campi di un modulo (gli stessi argomenti dello strumento, quelli assenti valgono
 * `null`), con gli stessi controlli dello strumento sul viaggio e sulla destinazione (zone e luoghi).
 */
export function imprevistoDaCampi(
  tipo: NomeTipoImprevisto,
  campi: Partial<Omit<ArgomentiImprevisto, "tipo">>,
  viaggio: Viaggio,
  destinazione: Pick<IstantaneaCatalogo, "zone" | "luoghi">,
): EsitoImprevisto {
  const argomenti: ArgomentiImprevisto = {
    tipo: TIPO_IMPREVISTO[tipo],
    data: null,
    inizio: null,
    fine: null,
    zonaId: null,
    condizione: null,
    momento: null,
    minuti: null,
    motivo: null,
    luogoId: null,
    elementoId: null,
    arrivoData: null,
    arrivoOrario: null,
    giorni: null,
    intensitaMassima: null,
    mobilitaRidotta: null,
    descrizione: null,
    mezzo: null,
    ...campi,
  };
  try {
    return { ok: true, imprevisto: costruisciImprevisto(argomenti, viaggio, destinazione as IstantaneaCatalogo) };
  } catch (errore) {
    return { ok: false, messaggio: (errore as Error).message };
  }
}
