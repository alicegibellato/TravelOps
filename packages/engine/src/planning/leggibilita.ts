/**
 * Testi leggibili della bozza (ST-UX-004A): note "Da sapere" raggruppate ed etichette delle revisioni.
 * Funzioni pure sui dati della bozza: nessun codice interno nel testo restituito.
 */
import type { ProblemaFattibilita } from "../feasibility/index.js";
import { giornoSettimana } from "../feasibility/orari.js";
import type { GiornoSettimana, IstantaneaCatalogo, Viaggio } from "../model/index.js";
import { TESTI_NOTE } from "./configurazione.js";

const elenca = (voci: readonly string[]): string =>
  voci.length <= 1 ? voci.join("") : `${voci.slice(0, -1).join(", ")} e ${voci.at(-1)}`;

export interface DatiNoteBozza {
  /** Note dell'operazione (per esempio un pasto non collocato). */
  avvisi: readonly string[];
  /** Problemi del controllo di fattibilità: contano solo gli avvisi. */
  problemi: readonly ProblemaFattibilita[];
  viaggio: Viaggio;
  istantanea: IstantaneaCatalogo;
}

/**
 * Le note di "Da sapere" senza ripetizioni: gli orari non verificati diventano una sola nota con l'elenco dei
 * luoghi; le note uguali compaiono una volta sola. L'ordine è quello della prima comparsa.
 */
export function raggruppaNoteBozza({ avvisi, problemi, viaggio, istantanea }: DatiNoteBozza): string[] {
  const elementi = new Map<string, string>();
  for (const giorno of viaggio.giorni)
    for (const e of giorno.elementi) if (e.tipo === "attivita") elementi.set(e.id, e.attivitaId);
  const luoghiPerAttivita = new Map(istantanea.attivita.map((a) => [a.id, a.luogoId]));
  const nomiLuoghi = new Map(istantanea.luoghi.map((l) => [l.id, l.nome]));

  const note: string[] = [];
  const aggiungi = (testo: string): void => {
    if (!note.includes(testo)) note.push(testo);
  };
  for (const a of avvisi) aggiungi(a);

  const luoghiNonVerificati: string[] = [];
  let posizioneNota = -1;
  for (const p of problemi) {
    if (p.gravita !== "avviso") continue;
    if (p.codice !== "ORARI_DA_VERIFICARE") {
      aggiungi(p.messaggio);
      continue;
    }
    if (posizioneNota < 0) {
      posizioneNota = note.length;
      note.push("");
    }
    for (const id of p.elementi) {
      const luogoId = luoghiPerAttivita.get(elementi.get(id) ?? "");
      const nome = luogoId === undefined ? undefined : nomiLuoghi.get(luogoId);
      if (nome !== undefined && !luoghiNonVerificati.includes(nome)) luoghiNonVerificati.push(nome);
    }
  }
  if (posizioneNota >= 0) {
    if (luoghiNonVerificati.length > 0) note[posizioneNota] = TESTI_NOTE.orariNonVerificati(elenca(luoghiNonVerificati));
    else note.splice(posizioneNota, 1);
  }
  return note;
}

// --- Revisioni ---------------------------------------------------------------------------------------------

const GIORNI: Readonly<Record<GiornoSettimana, string>> = {
  lun: "lunedì",
  mar: "martedì",
  mer: "mercoledì",
  gio: "giovedì",
  ven: "venerdì",
  sab: "sabato",
  dom: "domenica",
};

export const giorno = (data: string): string => {
  const settimana = giornoSettimana(data);
  return settimana === null ? data : GIORNI[settimana];
};

const DATA = "(\\d{4}-\\d{2}-\\d{2})";

/** Come riscrivere la causa di una revisione in un'etichetta breve. */
const REGOLE_ETICHETTE: readonly (readonly [RegExp, (m: RegExpMatchArray) => string])[] = [
  [/^Bozza iniziale$/, () => "Bozza iniziale"],
  [/^Sostituito "(.+)" con ".+" il \d{4}-\d{2}-\d{2}$/, (m) => `Sostituita ${m[1]}`],
  [/^Tolto "(.+)" dal \d{4}-\d{2}-\d{2}$/, (m) => `Tolta ${m[1]}`],
  [/^Spostato "(.+)" al \d{4}-\d{2}-\d{2} alle \d{2}:\d{2}$/, (m) => `Spostata ${m[1]}`],
  [/^Aggiunto "(.+)" il \d{4}-\d{2}-\d{2}/, (m) => `Aggiunta ${m[1]}`],
  [/^Bloccato "(.+)"$/, (m) => `Bloccata ${m[1]}`],
  [/^Sbloccato "(.+)"$/, (m) => `Sbloccata ${m[1]}`],
  [new RegExp(`^Giornata del ${DATA} più leggera`), (m) => `Più leggera ${giorno(m[1] ?? "")}`],
  [new RegExp(`^Giornata del ${DATA} più piena`), (m) => `Più piena ${giorno(m[1] ?? "")}`],
  [new RegExp(`^Rigenerata la giornata del ${DATA}`), (m) => `Rigenerata ${giorno(m[1] ?? "")}`],
  [new RegExp(`^Scambiati i giorni ${DATA} e ${DATA}`), (m) => `Scambiati ${giorno(m[1] ?? "")} e ${giorno(m[2] ?? "")}`],
  [/^Cambiate le preferenze/, () => "Preferenze cambiate"],
  [/^Un'alternativa/, () => "Alternativa con altre attività"],
  [/^Annullata la modifica/, () => "Modifica annullata"],
  [/^Tornato alla revisione/, () => "Ripristino di una versione precedente"],
];

/** L'etichetta breve di una revisione, per esempio "Più leggera lunedì" o "Sostituita degustazione". */
export function etichettaRevisione(causa: string): string {
  for (const [modello, etichetta] of REGOLE_ETICHETTE) {
    const trovato = modello.exec(causa);
    if (trovato) return etichetta(trovato);
  }
  return causa;
}

export interface VoceCronologia {
  numero: number;
  /** Breve, per esempio "Più leggera lunedì". */
  etichetta: string;
  /** La causa per esteso, senza rimandi tecnici alle altre revisioni. */
  dettaglio: string;
}

/**
 * La cronologia comprensibile della bozza: per ogni revisione l'etichetta e la causa, dove il rimando "revisione Bn"
 * diventa l'etichetta della revisione richiamata.
 */
export function cronologiaBozza(revisioni: readonly { numero: number; causa: string }[]): VoceCronologia[] {
  const etichette = new Map(revisioni.map((r) => [r.numero, etichettaRevisione(r.causa)]));
  return revisioni.map((r) => ({
    numero: r.numero,
    etichetta: etichettaRevisione(r.causa),
    dettaglio: r.causa
      .replace(/"([^"]*)"/g, "«$1»")
      .replace(/(alla )?revisione B(\d+)/g, (_originale, alla: string | undefined, n: string) => {
      const richiamata = etichette.get(Number(n));
      if (richiamata === undefined) return alla ? "a una versione precedente" : "una versione precedente";
      return alla ? `a «${richiamata}»` : `«${richiamata}»`;
    }),
  }));
}
