/**
 * Controllo di fattibilità dell'itinerario (REQ-FEAS-001, regole R-1…R-8).
 *
 * Tempi di percorrenza, previsioni meteo e chiusure straordinarie arrivano solo dalla
 * `SorgenteDatiContesto` ricevuta (`modello-dominio.md` §2.3): il controllo non legge file,
 * rete od orologio, e a parità di input restituisce gli stessi problemi nello stesso ordine.
 */
import {
  CONDIZIONI_AVVERSE,
  type AttivitaCatalogo,
  type Catalogo,
  type CondizioneMeteo,
  type Elemento,
  type FasciaOraria,
  type Giorno,
  type GiornoSettimana,
  type Gravita,
  type Luogo,
  type Mezzo,
  type Problema,
  type SorgenteDatiContesto,
  type Viaggio,
  type Zona,
} from "../model/index.js";
import {
  GIORNO_CON_ARTICOLO,
  eDentro,
  giornoSettimana,
  minutiDaOrario,
  siSovrappongono,
  type Intervallo,
} from "./orari.js";

/** Codici dei problemi di fattibilità, nell'ordine delle regole R-1…R-8. */
export const CODICI_PROBLEMA_FATTIBILITA = [
  "MANCA_SPOSTAMENTO",
  "PERCORSO_SCONOSCIUTO",
  "SPOSTAMENTO_TROPPO_BREVE",
  "SOVRAPPOSIZIONE",
  "FUORI_ORARIO",
  "DURATA_INSUFFICIENTE",
  "METEO_AVVERSO",
  "LUOGO_CHIUSO",
] as const;

export type CodiceProblemaFattibilita = (typeof CODICI_PROBLEMA_FATTIBILITA)[number];

/** Gravità di ogni codice: tutti bloccanti tranne `METEO_AVVERSO`, che è un avviso. */
export const GRAVITA_PROBLEMI_FATTIBILITA: Readonly<Record<CodiceProblemaFattibilita, Gravita>> = {
  MANCA_SPOSTAMENTO: "bloccante",
  PERCORSO_SCONOSCIUTO: "bloccante",
  SPOSTAMENTO_TROPPO_BREVE: "bloccante",
  SOVRAPPOSIZIONE: "bloccante",
  FUORI_ORARIO: "bloccante",
  DURATA_INSUFFICIENTE: "bloccante",
  METEO_AVVERSO: "avviso",
  LUOGO_CHIUSO: "bloccante",
};

/** Problema di fattibilità: un `Problema` del modello con un codice di questo modulo. */
export interface ProblemaFattibilita extends Problema {
  codice: CodiceProblemaFattibilita;
}

/**
 * I dati ricevuti non rispettano il modello (attività o luogo assenti dal catalogo, orario o data
 * non validi). Il controllo presuppone un itinerario già valido secondo REQ-ITIN-001.
 */
export class ErroreDatiNonValidi extends Error {
  override readonly name = "ErroreDatiNonValidi";
}

/** Un itinerario è fattibile se non ha problemi bloccanti; gli avvisi non contano. */
export const eFattibile = (problemi: readonly Problema[]): boolean =>
  !problemi.some((problema) => problema.gravita === "bloccante");

// --- Struttura interna ---------------------------------------------------------------------------

interface Indice {
  attivita: ReadonlyMap<string, AttivitaCatalogo>;
  luoghi: ReadonlyMap<string, Luogo>;
  zone: ReadonlyMap<string, Zona>;
}

/** Un elemento del giorno con orari in minuti e luoghi di inizio e fine già risolti. */
interface Voce {
  elemento: Elemento;
  /** Posizione nell'elenco del giorno, per un ordine stabile a parità di inizio. */
  posizione: number;
  intervallo: Intervallo;
  luogoInizio: string;
  luogoFine: string;
  /** Solo per le attività: l'attività di catalogo e il suo luogo. */
  attivita: { catalogo: AttivitaCatalogo; luogo: Luogo } | null;
}

interface Rilevato {
  data: string;
  /** Inizio, in minuti, del primo elemento coinvolto. */
  inizio: number;
  problema: ProblemaFattibilita;
}

interface Giornata {
  giorno: Giorno;
  voci: readonly Voce[];
  indice: Indice;
  sorgente: SorgenteDatiContesto;
  segnala(codice: CodiceProblemaFattibilita, coinvolte: readonly Voce[], messaggio: string): void;
}

const COME: Readonly<Record<Mezzo, string>> = {
  piedi: "a piedi",
  mezzi_pubblici: "con i mezzi pubblici",
  treno: "in treno",
  auto: "in auto",
  volo: "in aereo",
};

const CONDIZIONI_AVVERSE_TESTO: readonly string[] = CONDIZIONI_AVVERSE;
const eAvversa = (condizione: CondizioneMeteo): boolean => CONDIZIONI_AVVERSE_TESTO.includes(condizione);

/** Mappa per `id`; a parità di `id` vale la prima voce, così il risultato non dipende da altro. */
function perId<T extends { id: string }>(voci: readonly T[]): ReadonlyMap<string, T> {
  const mappa = new Map<string, T>();
  for (const voce of voci) if (!mappa.has(voce.id)) mappa.set(voce.id, voce);
  return mappa;
}

function minuti(orario: string, dove: string): number {
  const valore = minutiDaOrario(orario);
  if (valore === null) throw new ErroreDatiNonValidi(`Orario non valido "${orario}" in ${dove}.`);
  return valore;
}

const intervalloDi = (da: { inizio: string; fine: string }, dove: string): Intervallo => ({
  inizio: minuti(da.inizio, dove),
  fine: minuti(da.fine, dove),
});

/** "a", "a e b", "a, b e c". */
function elenca(voci: readonly string[]): string {
  if (voci.length <= 1) return voci.join("");
  return `${voci.slice(0, -1).join(", ")} e ${voci.at(-1)}`;
}

const descriviLuogo = (indice: Indice, id: string): string => {
  const luogo = indice.luoghi.get(id);
  return luogo ? `"${luogo.nome}"` : id;
};

const descriviElemento = (voce: Voce): string => {
  const { id, inizio, fine } = voce.elemento;
  return voce.attivita ? `${id} "${voce.attivita.catalogo.nome}" (${inizio}–${fine})` : `${id} (${inizio}–${fine})`;
};

const confronta = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Ordine di previsioni e chiusure nei messaggi, qualunque sia l'ordine dato dalla sorgente. */
const perIntervallo = (
  x: { inizio: string; fine: string; condizione?: string },
  y: { inizio: string; fine: string; condizione?: string },
): number =>
  minuti(x.inizio, "intervallo") - minuti(y.inizio, "intervallo") ||
  minuti(x.fine, "intervallo") - minuti(y.fine, "intervallo") ||
  confronta(x.condizione ?? "", y.condizione ?? "");

function confrontaElenchi(a: readonly string[], b: readonly string[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const esito = confronta(a[i] ?? "", b[i] ?? "");
    if (esito !== 0) return esito;
  }
  return a.length - b.length;
}

/**
 * Ordine dei problemi: data, inizio del primo elemento coinvolto, codice; poi, per le parità
 * residue, `id` degli elementi in ordine alfabetico e messaggio (`modello-dominio.md` §3).
 */
const confrontaRilevati = (x: Rilevato, y: Rilevato): number =>
  confronta(x.data, y.data) ||
  x.inizio - y.inizio ||
  confronta(x.problema.codice, y.problema.codice) ||
  confrontaElenchi(x.problema.elementi, y.problema.elementi) ||
  confronta(x.problema.messaggio, y.problema.messaggio);

function preparaVoci(giorno: Giorno, indice: Indice): Voce[] {
  const voci = giorno.elementi.map((elemento, posizione): Voce => {
    const intervallo = intervalloDi(elemento, `${elemento.id} (${giorno.data})`);
    if (elemento.tipo === "spostamento") {
      return { elemento, posizione, intervallo, luogoInizio: elemento.da, luogoFine: elemento.a, attivita: null };
    }
    const catalogo = indice.attivita.get(elemento.attivitaId);
    if (!catalogo) {
      throw new ErroreDatiNonValidi(
        `L'elemento ${elemento.id} del ${giorno.data} usa l'attività ${elemento.attivitaId}, che non è nel catalogo.`,
      );
    }
    const luogo = indice.luoghi.get(catalogo.luogoId);
    if (!luogo) {
      throw new ErroreDatiNonValidi(`Il luogo ${catalogo.luogoId} dell'attività ${catalogo.id} non è nel catalogo.`);
    }
    return { elemento, posizione, intervallo, luogoInizio: luogo.id, luogoFine: luogo.id, attivita: { catalogo, luogo } };
  });
  return voci.sort((x, y) => x.intervallo.inizio - y.intervallo.inizio || x.posizione - y.posizione);
}

// --- Regole ----------------------------------------------------------------------------------------

/** R-1 `MANCA_SPOSTAMENTO`: il viaggiatore cambierebbe luogo senza uno spostamento. */
function controllaContinuita({ giorno, voci, indice, segnala }: Giornata): void {
  const luogo = (id: string): string => descriviLuogo(indice, id);
  const { luogoPartenza, alloggio } = giorno;
  const prima = voci[0];
  const ultima = voci.at(-1);
  if (!prima || !ultima) {
    if (alloggio !== undefined && alloggio !== luogoPartenza) {
      segnala(
        "MANCA_SPOSTAMENTO",
        [],
        `Manca uno spostamento il ${giorno.data}: la giornata parte da ${luogo(luogoPartenza)}, l'alloggio della notte è ${luogo(alloggio)}.`,
      );
    }
    return;
  }
  if (prima.luogoInizio !== luogoPartenza) {
    segnala(
      "MANCA_SPOSTAMENTO",
      [prima],
      `Manca uno spostamento prima di ${prima.elemento.id}: la giornata parte da ${luogo(luogoPartenza)}, ${prima.elemento.id} inizia a ${luogo(prima.luogoInizio)}.`,
    );
  }
  voci.forEach((voce, i) => {
    const precedente = voci[i - 1];
    if (precedente && precedente.luogoFine !== voce.luogoInizio) {
      segnala(
        "MANCA_SPOSTAMENTO",
        [precedente, voce],
        `Manca uno spostamento tra ${precedente.elemento.id} e ${voce.elemento.id}: ${precedente.elemento.id} finisce a ${luogo(precedente.luogoFine)}, ${voce.elemento.id} inizia a ${luogo(voce.luogoInizio)}.`,
      );
    }
  });
  if (alloggio !== undefined && ultima.luogoFine !== alloggio) {
    segnala(
      "MANCA_SPOSTAMENTO",
      [ultima],
      `Manca uno spostamento dopo ${ultima.elemento.id}: ${ultima.elemento.id} finisce a ${luogo(ultima.luogoFine)}, l'alloggio della notte è ${luogo(alloggio)}.`,
    );
  }
}

/** R-2 `PERCORSO_SCONOSCIUTO` e R-3 `SPOSTAMENTO_TROPPO_BREVE`, con il mezzo dello spostamento. */
function controllaSpostamenti({ voci, indice, sorgente, segnala }: Giornata): void {
  for (const voce of voci) {
    const { elemento } = voce;
    if (elemento.tipo !== "spostamento") continue;
    const tratta = `da ${descriviLuogo(indice, elemento.da)} a ${descriviLuogo(indice, elemento.a)} ${COME[elemento.mezzo]}`;
    const tempo = sorgente.tempoPercorrenza(elemento.da, elemento.a, elemento.mezzo);
    if (tempo === null) {
      segnala("PERCORSO_SCONOSCIUTO", [voce], `Tempo di percorrenza sconosciuto per ${elemento.id}: nessun dato ${tratta}.`);
      continue;
    }
    const durata = voce.intervallo.fine - voce.intervallo.inizio;
    if (durata < tempo) {
      segnala(
        "SPOSTAMENTO_TROPPO_BREVE",
        [voce],
        `Lo spostamento ${elemento.id} ${tratta} dura ${durata} minuti, ma ne servono ${tempo}.`,
      );
    }
  }
}

/** R-4 `SOVRAPPOSIZIONE`: ogni coppia di elementi dello stesso giorno che si sovrappongono. */
function controllaSovrapposizioni({ voci, segnala }: Giornata): void {
  voci.forEach((prima, i) => {
    for (const seconda of voci.slice(i + 1)) {
      if (siSovrappongono(prima.intervallo, seconda.intervallo)) {
        segnala(
          "SOVRAPPOSIZIONE",
          [prima, seconda],
          `${descriviElemento(prima)} e ${descriviElemento(seconda)} si sovrappongono.`,
        );
      }
    }
  });
}

function fasceDelGiorno(luogo: Luogo, giorno: GiornoSettimana): readonly FasciaOraria[] | "sempre" {
  return "sempre" in luogo.apertura ? "sempre" : luogo.apertura.settimana[giorno];
}

/** R-5 `FUORI_ORARIO`, R-6 `DURATA_INSUFFICIENTE`, R-7 `METEO_AVVERSO`, R-8 `LUOGO_CHIUSO`. */
function controllaAttivita({ giorno, voci, indice, sorgente, segnala }: Giornata): void {
  const settimana = giornoSettimana(giorno.data);
  if (settimana === null) throw new ErroreDatiNonValidi(`Data del giorno non valida "${giorno.data}".`);
  for (const voce of voci) {
    if (!voce.attivita) continue;
    const { catalogo: attivita, luogo } = voce.attivita;
    const chi = descriviElemento(voce);

    const fasce = fasceDelGiorno(luogo, settimana);
    if (fasce !== "sempre") {
      const dove = `orari di apertura di ${luogo.id}`;
      const dentro = fasce.some((f) => eDentro(voce.intervallo, { inizio: minuti(f.apertura, dove), fine: minuti(f.chiusura, dove) }));
      if (!dentro) {
        const orari = fasce.length === 0 ? "chiuso" : elenca(fasce.map((f) => `${f.apertura}–${f.chiusura}`));
        segnala(
          "FUORI_ORARIO",
          [voce],
          `${chi} non rientra negli orari di apertura di "${luogo.nome}" ${GIORNO_CON_ARTICOLO[settimana]}: ${orari}.`,
        );
      }
    }

    const durata = voce.intervallo.fine - voce.intervallo.inizio;
    if (durata < attivita.durataTipica) {
      segnala(
        "DURATA_INSUFFICIENTE",
        [voce],
        `${chi} dura ${durata} minuti, meno della durata tipica di ${attivita.durataTipica} minuti.`,
      );
    }

    if (attivita.allAperto) {
      const avverse = sorgente
        .previsioni(luogo.zonaId, giorno.data)
        .filter((p) => eAvversa(p.condizione) && siSovrappongono(voce.intervallo, intervalloDi(p, "previsione meteo")))
        .sort(perIntervallo);
      if (avverse.length > 0) {
        const zona = indice.zone.get(luogo.zonaId);
        segnala(
          "METEO_AVVERSO",
          [voce],
          `Meteo avverso in zona "${zona?.nome ?? luogo.zonaId}" durante ${chi}, che è all'aperto: ${elenca(avverse.map((p) => `${p.condizione} ${p.inizio}–${p.fine}`))}.`,
        );
      }
    }

    const chiusure = sorgente
      .chiusure(luogo.id, giorno.data)
      .filter((c) => siSovrappongono(voce.intervallo, intervalloDi(c, "chiusura straordinaria")))
      .sort(perIntervallo);
    if (chiusure.length > 0) {
      segnala(
        "LUOGO_CHIUSO",
        [voce],
        `"${luogo.nome}" è chiuso in via straordinaria durante ${chi}: chiusura ${elenca(chiusure.map((c) => `${c.inizio}–${c.fine}`))}.`,
      );
    }
  }
}

// --- Operazione ------------------------------------------------------------------------------------

/**
 * Controlla la fattibilità di un viaggio con le regole R-1…R-8 di REQ-FEAS-001.
 *
 * @param viaggio itinerario già valido secondo REQ-ITIN-001.
 * @param catalogo zone, luoghi e attività.
 * @param sorgente unica via d'accesso a tempi di percorrenza, meteo e chiusure.
 * @returns i problemi in ordine di data, inizio del primo elemento coinvolto e codice; vuoto se non ce ne sono.
 * @throws ErroreDatiNonValidi se un'attività o il suo luogo mancano dal catalogo o un orario non è valido.
 */
export function controllaFattibilita(
  viaggio: Viaggio,
  catalogo: Catalogo,
  sorgente: SorgenteDatiContesto,
): ProblemaFattibilita[] {
  const indice: Indice = {
    attivita: perId(catalogo.attivita),
    luoghi: perId(catalogo.luoghi),
    zone: perId(catalogo.zone),
  };
  const rilevati: Rilevato[] = [];
  for (const giorno of viaggio.giorni) {
    const giornata: Giornata = {
      giorno,
      voci: preparaVoci(giorno, indice),
      indice,
      sorgente,
      segnala(codice, coinvolte, messaggio) {
        rilevati.push({
          data: giorno.data,
          inizio: coinvolte[0]?.intervallo.inizio ?? 0,
          problema: {
            codice,
            gravita: GRAVITA_PROBLEMI_FATTIBILITA[codice],
            elementi: coinvolte.map((voce) => voce.elemento.id),
            messaggio,
          },
        });
      },
    };
    controllaContinuita(giornata);
    controllaSpostamenti(giornata);
    controllaSovrapposizioni(giornata);
    controllaAttivita(giornata);
  }
  return rilevati.sort(confrontaRilevati).map((rilevato) => rilevato.problema);
}
