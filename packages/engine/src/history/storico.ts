/**
 * Storico delle versioni dell'itinerario (REQ-ITIN-002): creazione, accettazione o rifiuto di una proposta,
 * elenco, lettura e confronto delle versioni. Lo storico e le sue versioni sono congelati (R-2): ogni operazione
 * restituisce un nuovo storico e non modifica mai quello ricevuto.
 */
import { caricaViaggio } from "../itinerary/index.js";
import type { Problema, Proposta, Viaggio } from "../model/index.js";
import { causaVersione, type OrigineConDescrizione } from "./causa.js";
import { confrontaItinerari, stessoItinerario } from "./confronto.js";
import { congela, copia, copiaMomento, problemaMomento, segnalazione } from "./supporto.js";
import {
  CAUSA_ITINERARIO_INIZIALE,
  type EsitoApplicazione,
  type EsitoConfronto,
  type EsitoLettura,
  type EsitoRifiuto,
  type EsitoStorico,
  type Momento,
  type SegnalazioneStorico,
  type Storico,
  type Versione,
  type VoceStorico,
} from "./tipi.js";

/**
 * Crea lo storico con la versione 1 del viaggio, causa "Itinerario iniziale" (R-1).
 * Il viaggio viene validato (REQ-ITIN-001) e copiato in forma canonica: modificare dopo l'oggetto passato
 * non cambia lo storico.
 */
export function creaStorico(viaggio: Viaggio): EsitoStorico {
  const caricato = caricaViaggio(viaggio);
  if (!caricato.ok) {
    return {
      ok: false,
      errore: segnalazione(
        "VIAGGIO_NON_VALIDO",
        "il viaggio non è valido: non si può creare lo storico",
        caricato.errori.map((e) => e.messaggio),
      ),
    };
  }
  const versione: Versione = {
    numero: 1,
    momento: null,
    causa: CAUSA_ITINERARIO_INIZIALE,
    origine: null,
    autore: null,
    propostaFattibile: null,
    problemi: [],
    modifiche: { aggiunti: [], rimossi: [], modificati: [] },
    viaggio: copia(caricato.valore),
  };
  return { ok: true, storico: congela({ versioni: [versione] }) };
}

/** La versione corrente (l'ultima). L'oggetto è congelato. */
export function versioneCorrente(storico: Storico): Versione {
  const ultima = storico.versioni[storico.versioni.length - 1];
  if (ultima === undefined) throw new Error("storico senza versioni: va creato con creaStorico o importaStorico");
  return ultima;
}

/** Copia modificabile del viaggio della versione corrente. */
export function viaggioCorrente(storico: Storico): Viaggio {
  return copia(versioneCorrente(storico).viaggio);
}

/**
 * Applica una proposta accettata da `autore` nel `momento` indicato e crea una nuova versione.
 *
 * Nessuna versione si crea, e lo storico restituito è quello ricevuto, se:
 * - manca il nome di chi accetta o il momento non è valido: `ACCETTAZIONE_NON_VALIDA` (R-6, la proposta non è accettata);
 * - la proposta non è costruita sulla versione corrente: `PROPOSTA_SUPERATA` (R-5);
 * - l'itinerario della proposta non è valido o è di un altro viaggio: `PROPOSTA_NON_VALIDA`;
 * - l'itinerario della proposta è identico a quello corrente: avviso `NESSUNA_MODIFICA` (R-7).
 *
 * Una proposta non fattibile si può accettare: la versione lo registra (R-8).
 */
export function applicaProposta(storico: Storico, proposta: Proposta, autore: string, momento: Momento): EsitoApplicazione {
  const errore = (s: SegnalazioneStorico): EsitoApplicazione => ({ esito: "errore", storico, errore: s });

  const nome = typeof autore === "string" ? autore.trim() : "";
  if (nome === "") {
    return errore(
      segnalazione("ACCETTAZIONE_NON_VALIDA", "manca il nome di chi accetta la proposta: una proposta non accettata non crea versioni"),
    );
  }
  const problema = problemaMomento(momento);
  if (problema !== null) {
    return errore(segnalazione("ACCETTAZIONE_NON_VALIDA", `il momento dell'accettazione non è valido: ${problema}`));
  }

  const corrente = versioneCorrente(storico);
  if (proposta.versioneBase !== corrente.numero) {
    return errore(
      segnalazione(
        "PROPOSTA_SUPERATA",
        `la proposta è costruita sulla versione ${proposta.versioneBase}, ma la versione corrente è la ${corrente.numero}: ` +
          "va ricostruita sulla versione corrente",
      ),
    );
  }

  const caricato = caricaViaggio(proposta.itinerario);
  if (!caricato.ok) {
    return errore(
      segnalazione(
        "PROPOSTA_NON_VALIDA",
        "l'itinerario della proposta non è valido",
        caricato.errori.map((e) => e.messaggio),
      ),
    );
  }
  const nuovo = copia(caricato.valore);
  if (nuovo.id !== corrente.viaggio.id) {
    return errore(
      segnalazione(
        "PROPOSTA_NON_VALIDA",
        `la proposta riguarda il viaggio ${nuovo.id}, ma lo storico è del viaggio ${corrente.viaggio.id}`,
      ),
    );
  }

  if (stessoItinerario(corrente.viaggio, nuovo)) {
    return {
      esito: "avviso",
      storico,
      avviso: segnalazione(
        "NESSUNA_MODIFICA",
        `l'itinerario della proposta è identico a quello della versione corrente (${corrente.numero}): nessuna nuova versione`,
      ),
    };
  }

  // Un id non viene mai riutilizzato (modello-dominio.md §2.1): il prossimo numero non torna mai indietro.
  nuovo.prossimoNumeroId = Math.max(nuovo.prossimoNumeroId, prossimoNumeroMinimo(storico, nuovo));

  const versione: Versione = {
    numero: corrente.numero + 1,
    momento: copiaMomento(momento),
    causa: causaVersione(proposta.origine as OrigineConDescrizione, corrente.viaggio),
    origine: copia(proposta.origine),
    autore: nome,
    propostaFattibile: proposta.fattibile,
    problemi: proposta.problemi.map(copiaProblema),
    modifiche: confrontaItinerari(corrente.viaggio, nuovo),
    viaggio: nuovo,
  };
  congela(versione);
  return { esito: "versione_creata", storico: congela({ versioni: [...storico.versioni, versione] }), versione };
}

/** Rifiuta una proposta: nessuna versione, lo storico resta quello ricevuto (R-6). */
export function rifiutaProposta(storico: Storico, _proposta: Proposta): EsitoRifiuto {
  return { esito: "rifiutata", storico };
}

/** Numero, momento, causa e autore di ogni versione, dalla 1 alla corrente. */
export function elencaVersioni(storico: Storico): VoceStorico[] {
  return storico.versioni.map((v) => ({
    numero: v.numero,
    momento: v.momento === null ? null : copiaMomento(v.momento),
    causa: v.causa,
    autore: v.autore,
  }));
}

/** Copia modificabile del viaggio della versione `numero`, oppure `VERSIONE_INESISTENTE`. */
export function leggiVersione(storico: Storico, numero: number): EsitoLettura {
  const versione = trovaVersione(storico, numero);
  if (versione === undefined) return { ok: false, errore: versioneInesistente(storico, numero) };
  return { ok: true, viaggio: copia(versione.viaggio) };
}

/**
 * Confronta la versione A con la versione B per `id` degli elementi (R-4): aggiunti (solo in B),
 * rimossi (solo in A), modificati (stesso `id`, campi diversi, con i valori prima e dopo).
 */
export function confrontaVersioni(storico: Storico, versioneA: number, versioneB: number): EsitoConfronto {
  const a = trovaVersione(storico, versioneA);
  if (a === undefined) return { ok: false, errore: versioneInesistente(storico, versioneA) };
  const b = trovaVersione(storico, versioneB);
  if (b === undefined) return { ok: false, errore: versioneInesistente(storico, versioneB) };
  return { ok: true, confronto: { versioneA, versioneB, ...confrontaItinerari(a.viaggio, b.viaggio) } };
}

function trovaVersione(storico: Storico, numero: number): Versione | undefined {
  return Number.isInteger(numero) ? storico.versioni[numero - 1] : undefined;
}

function versioneInesistente(storico: Storico, numero: number): SegnalazioneStorico {
  return segnalazione(
    "VERSIONE_INESISTENTE",
    `la versione ${numero} non esiste: lo storico ha le versioni da 1 a ${storico.versioni.length}`,
  );
}

const ID_NUOVO = /^N(\d+)$/;

/** Il più piccolo prossimo numero che non riusa id `N<numero>` già comparsi nello storico o nel nuovo itinerario. */
function prossimoNumeroMinimo(storico: Storico, nuovo: Viaggio): number {
  let minimo = versioneCorrente(storico).viaggio.prossimoNumeroId;
  for (const viaggio of [...storico.versioni.map((v) => v.viaggio), nuovo]) {
    for (const giorno of viaggio.giorni) {
      for (const elemento of giorno.elementi) {
        const numero = ID_NUOVO.exec(elemento.id)?.[1];
        if (numero !== undefined) minimo = Math.max(minimo, Number(numero) + 1);
      }
    }
  }
  return minimo;
}

export function copiaProblema(problema: Problema): Problema {
  return {
    codice: problema.codice,
    gravita: problema.gravita,
    elementi: [...problema.elementi],
    messaggio: problema.messaggio,
  };
}
