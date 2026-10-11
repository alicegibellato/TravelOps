/**
 * I viaggi della base dati nelle pagine della web app (REQ-UX-003, CA-2 e CA-3): la home "I miei viaggi", la pagina
 * del viaggio con giorni ed elementi, la vista Oggi e l'orologio di ciascun viaggio.
 *
 * - I viaggi di riferimento (la versione 1 e le varianti, `src/dati/viaggi.ts`) si leggono come prima dai JSON del
 *   motore: sono quelli della modalità presentazione. Il viaggio di partenza della presentazione segue la versione
 *   corrente del suo storico, come la vista Oggi: una proposta accettata si vede in tutte le pagine (TB-XPAGE-003).
 * - Gli altri viaggi (creati dalla chat o dai filtri, e i viaggi demo del prodotto) si leggono dalla base dati: la
 *   versione corrente dello storico (riletto e validato dal motore, `importaStorico`) e il catalogo dell'istantanea su
 *   cui il viaggio è costruito. Una bozza non ha storico: si apre nella sua pagina della bozza (`/bozza/<id>`).
 *
 * Nessuna regola del motore è ripetuta qui e nessuna riga di SQL: si usano le funzioni di `src/basedati`.
 */
import { versioneCorrente, type Catalogo, type Momento, type Storico, type Viaggio } from "@travelops/engine";
import {
  elencaRevisioniBozza,
  elencaViaggi,
  leggiImpostazione,
  leggiIstantanea,
  leggiStoricoDelViaggio,
  trovaViaggio,
  type BaseDati,
  type StatoViaggio,
  type ViaggioSalvato,
} from "../basedati";
import { adessoDiSistema } from "../oggi/adesso";
import { configurazioneOrologio, momentoDelViaggio, momentoReale, type ConfigurazioneOrologio, type MomentoDelViaggio } from "../oggi/orologio";
import { leggiStato } from "../stato/archivio";
import { usaBaseDati } from "../stato/avvio";
import { CHIAVE_PRESENTAZIONE } from "../stato/presentazione";
import { OROLOGIO_PREDEFINITO, PARTENZA_PREDEFINITA, formatoMomento, type StatoDemo } from "../stato/stato";
import { schedaViaggio, schedaViaggioSalvato, type SchedaViaggioHome } from "../viste/home";
import { caricaDati, type EsitoDati } from "./carica";
import { caricaViaggioScelto, trovaVoceViaggio, VIAGGI } from "./viaggi";

/** Un viaggio da mostrare nelle pagine `/viaggi/<chiave>`. */
export interface ViaggioDellApp {
  chiave: string;
  /** Il titolo per la scheda del browser. */
  titolo: string;
  /** Vero per i viaggi di riferimento della modalità presentazione. */
  riferimento: boolean;
  demo: boolean;
  stato: StatoViaggio;
  esito: EsitoDati;
}

/** Le opzioni dell'orologio: configurazione e istante reale si possono indicare (nei test). */
export interface OpzioniOrologio {
  configurazione?: ConfigurazioneOrologio;
  adesso?: () => Date;
}

const catalogoDi = (contenuto: unknown): Catalogo => contenuto as Catalogo;

/** Viaggio e catalogo di un viaggio salvato con storico; `null` se non ha storico o istantanea. */
function itinerarioSalvato(db: BaseDati, salvato: ViaggioSalvato): EsitoDati | null {
  if (salvato.istantanea === null) return null;
  const storico = leggiStoricoDelViaggio(db, salvato.id);
  if (storico === null) return null;
  if (!storico.ok) {
    const motivo = storico.errore.messaggio;
    return { ok: false, errori: [{ codice: "VALORE_NON_VALIDO", id: "viaggio", percorso: "", motivo, messaggio: motivo, origine: "viaggio" }] };
  }
  const istantanea = leggiIstantanea(db, salvato.istantanea);
  if (istantanea === null) return null;
  const viaggio = versioneCorrente(storico.storico).viaggio;
  // Il motore rilegge e valida viaggio e catalogo; se l'istantanea non si lascia leggere come catalogo dell'ondata 1
  // (per esempio per campi in più), resta valido quanto ha già validato `importaStorico`.
  const esito = caricaDati(JSON.parse(JSON.stringify(viaggio)), istantanea.contenuto);
  return esito.ok ? esito : { ok: true, viaggio, catalogo: catalogoDi(istantanea.contenuto) };
}

/**
 * Il viaggio di riferimento `chiave` da mostrare: la versione corrente dello storico se è il viaggio di partenza della
 * modalità presentazione, altrimenti l'itinerario di riferimento.
 */
export function viaggioDiRiferimento(stato: StatoDemo, chiave: string, riferimento: Viaggio): Viaggio {
  return stato.partenza === chiave ? versioneCorrente(stato.storico).viaggio : riferimento;
}

/** L'esito di un viaggio di riferimento con la versione corrente della presentazione; com'è se lo stato non si legge. */
function conVersioneCorrente(cartella: string, chiave: string, esito: EsitoDati): EsitoDati {
  if (!esito.ok) return esito;
  const letto = leggiStato(cartella);
  return letto.ok ? { ...esito, viaggio: viaggioDiRiferimento(letto.stato, chiave, esito.viaggio) } : esito;
}

/**
 * Il viaggio della pagina `/viaggi/<chiave>`: uno di riferimento, oppure un viaggio confermato della base dati.
 * `null` se non esiste, se è una bozza (si apre in `/bozza/<id>`) o se la base dati non si può leggere.
 */
export function caricaViaggioDellApp(cartella: string, chiave: string): ViaggioDellApp | null {
  const voce = trovaVoceViaggio(chiave);
  if (voce !== null) {
    const esito = caricaViaggioScelto(chiave);
    if (esito === null) return null;
    return { chiave, titolo: voce.etichetta, riferimento: true, demo: true, stato: "confermato", esito: conVersioneCorrente(cartella, chiave, esito) };
  }
  try {
    return usaBaseDati(cartella, (db) => {
      const salvato = trovaViaggio(db, chiave);
      if (salvato === null || salvato.stato === "bozza") return null;
      const esito = itinerarioSalvato(db, salvato);
      return esito === null ? null : { chiave, titolo: salvato.titolo, riferimento: false, demo: salvato.demo, stato: salvato.stato, esito };
    });
  } catch {
    return null;
  }
}

/**
 * Il viaggio salvato `chiave` che non si può leggere (dati non validi): `bozza` dice se cercarlo tra le bozze o tra i
 * viaggi confermati. La pagina ne spiega il problema invece di "Pagina non trovata" (ST-QA-FIX-016). `null` se non
 * c'è, se è dell'altro tipo o se la base dati non si apre.
 */
export function viaggioSalvatoNonLeggibile(cartella: string, chiave: string, bozza: boolean): { id: string; titolo: string; preparata: boolean } | null {
  try {
    return usaBaseDati(cartella, (db) => {
      const salvato = trovaViaggio(db, chiave);
      return salvato !== null && (salvato.stato === "bozza") === bozza ? { id: salvato.id, titolo: salvato.titolo, preparata: salvato.istantanea !== null } : null;
    });
  } catch {
    return null;
  }
}

// --- l'orologio di ciascun viaggio (CA-3) -------------------------------------------------------------------

/** L'orologio simulato della pagina Demo e il primo giorno del viaggio della modalità presentazione. */
export function orologioDellaDemo(db: BaseDati): { orologio: Momento; inizio: string } {
  const impostazioni = leggiImpostazione(db, CHIAVE_PRESENTAZIONE) as { orologio?: unknown; partenza?: unknown } | null;
  const orologio = formatoMomento(impostazioni?.orologio) ? { ...impostazioni.orologio } : { ...OROLOGIO_PREDEFINITO };
  const partenza = typeof impostazioni?.partenza === "string" ? impostazioni.partenza : PARTENZA_PREDEFINITA;
  const riferimento = caricaViaggioScelto(partenza) ?? caricaViaggioScelto(PARTENZA_PREDEFINITA);
  return { orologio, inizio: riferimento?.ok === true ? riferimento.viaggio.dataInizio : OROLOGIO_PREDEFINITO.data };
}

/** Il momento di un viaggio di cui si conoscono le date, sulla base dati aperta. */
export function momentoConDate(
  db: BaseDati,
  viaggio: Pick<Viaggio, "dataInizio" | "dataFine">,
  tipo: { presentazione: boolean; demo: boolean },
  opzioni: OpzioniOrologio = {},
): MomentoDelViaggio {
  const demo = orologioDellaDemo(db);
  return momentoDelViaggio({
    inizio: viaggio.dataInizio,
    fine: viaggio.dataFine,
    presentazione: tipo.presentazione,
    demo: tipo.demo,
    orologioDemo: demo.orologio,
    inizioDemo: demo.inizio,
    configurazione: opzioni.configurazione ?? configurazioneOrologio(),
    adesso: (opzioni.adesso ?? adessoDiSistema)(),
  });
}

/** Il viaggio (versione corrente o ultima revisione della bozza) di un viaggio salvato; `null` se non c'è. */
function viaggioCorrenteSalvato(db: BaseDati, salvato: ViaggioSalvato): Viaggio | null {
  const storico = leggiStoricoDelViaggio(db, salvato.id);
  if (storico !== null) return storico.ok ? versioneCorrente(storico.storico).viaggio : null;
  const revisioni = elencaRevisioniBozza(db, salvato.id);
  return revisioni.ok ? (revisioni.revisioni.at(-1)?.viaggio ?? null) : null;
}

/**
 * Il momento del viaggio `chiave` sulla base dati aperta. L'orologio del viaggio vale per i viaggi confermati (con
 * storico); per una bozza, un viaggio sconosciuto o nessun viaggio vale l'orologio della Demo come prima (in modo
 * `reale`, l'ora reale).
 */
export function momentoSulViaggio(db: BaseDati, chiave: string | null, opzioni: OpzioniOrologio = {}): MomentoDelViaggio {
  const riferimento = chiave === null ? null : caricaViaggioScelto(chiave);
  if (riferimento?.ok === true) return momentoConDate(db, riferimento.viaggio, { presentazione: true, demo: true }, opzioni);
  const salvato = chiave === null ? null : trovaViaggio(db, chiave);
  const viaggio = salvato === null || salvato.stato === "bozza" ? null : viaggioCorrenteSalvato(db, salvato);
  if (salvato !== null && viaggio !== null) return momentoConDate(db, viaggio, { presentazione: false, demo: salvato.demo }, opzioni);
  const configurazione = opzioni.configurazione ?? configurazioneOrologio();
  if (configurazione.modo === "reale") return { momento: momentoReale((opzioni.adesso ?? adessoDiSistema)(), configurazione.fuso), origine: "reale" };
  return { momento: orologioDellaDemo(db).orologio, origine: "presentazione" };
}

/** Il momento del viaggio `chiave` (vedi `momentoSulViaggio`), aprendo la base dati della cartella. */
export function momentoDelViaggioSalvato(cartella: string, chiave: string | null, opzioni: OpzioniOrologio = {}): Momento {
  return usaBaseDati(cartella, (db) => momentoSulViaggio(db, chiave, opzioni)).momento;
}

// --- home e Oggi (CA-2) ----------------------------------------------------------------------------------------

/** Vero se il viaggio salvato si può aprire: una bozza con almeno una revisione, oppure un viaggio con storico. */
function apribile(db: BaseDati, salvato: ViaggioSalvato): boolean {
  if (salvato.stato !== "bozza") return leggiStoricoDelViaggio(db, salvato.id) !== null;
  if (salvato.istantanea === null) return false;
  const revisioni = elencaRevisioniBozza(db, salvato.id);
  return !revisioni.ok || revisioni.revisioni.length > 0;
}

/** Le schede della home sulla base dati aperta: prima i viaggi del viaggiatore (dal più recente), poi i viaggi demo. */
export function schedeHomeSulDb(db: BaseDati): SchedaViaggioHome[] {
  const viaggi = elencaViaggi(db).filter((v) => apribile(db, v));
  const propri = viaggi.filter((v) => !v.demo).sort((a, b) => b.ordine - a.ordine);
  // Gli itinerari di riferimento (versione 1 e varianti) sono gli scenari della modalità presentazione, non viaggi
  // dell'utente: in home restano i viaggi demo del prodotto (ST-DEMO-001B, TB-NEW-D6).
  const demo = viaggi.filter((v) => v.demo && trovaVoceViaggio(v.id) === null);
  return [...propri, ...demo].map((salvato) => {
    const voce = trovaVoceViaggio(salvato.id);
    return voce !== null ? schedaViaggio(voce) : schedaViaggioSalvato(salvato, viaggioCorrenteSalvato(db, salvato));
  });
}

/**
 * Le schede di "I miei viaggi" (REQ-UX-003, CA-2): tutti i viaggi della base dati, demo e del viaggiatore. Se la base
 * dati non si può leggere, i viaggi di riferimento come prima.
 */
export function schedeHome(cartella: string): SchedaViaggioHome[] {
  try {
    return usaBaseDati(cartella, schedeHomeSulDb);
  } catch (errore) {
    console.error(`TravelOps: elenco dei viaggi non disponibile (${(errore as Error).message})`);
    return VIAGGI.map(schedaViaggio);
  }
}

/**
 * Il viaggio da aprire in "Oggi" (`/oggi`): il viaggio confermato del viaggiatore più recente che, al suo orologio, è
 * in corso; altrimenti il viaggio della modalità presentazione. `null` se la base dati non si può leggere.
 */
export function viaggioPerOggi(cartella: string, opzioni: OpzioniOrologio = {}): string | null {
  try {
    return usaBaseDati(cartella, (db) => {
      const propri = elencaViaggi(db)
        .filter((v) => !v.demo && v.stato !== "bozza" && v.stato !== "concluso")
        .sort((a, b) => b.ordine - a.ordine);
      for (const salvato of propri) {
        const viaggio = viaggioCorrenteSalvato(db, salvato);
        if (viaggio === null || itinerarioSalvato(db, salvato)?.ok !== true) continue;
        const { momento } = momentoConDate(db, viaggio, { presentazione: false, demo: false }, opzioni);
        if (momento.data >= viaggio.dataInizio && momento.data <= viaggio.dataFine) return salvato.id;
      }
      return null;
    });
  } catch {
    return null;
  }
}

// --- le versioni di un viaggio salvato (ST-QA-FIX-004) ---------------------------------------------------------

/** Storico e catalogo di un viaggio salvato confermato, per la pagina delle sue versioni; `null` se non ce l'ha. */
export function versioniDelViaggioSalvato(cartella: string, chiave: string): { titolo: string; storico: Storico; catalogo: Catalogo } | null {
  if (trovaVoceViaggio(chiave) !== null) return null;
  try {
    return usaBaseDati(cartella, (db) => {
      const salvato = trovaViaggio(db, chiave);
      if (salvato === null || salvato.istantanea === null) return null;
      const storico = leggiStoricoDelViaggio(db, salvato.id);
      const istantanea = leggiIstantanea(db, salvato.istantanea);
      if (storico === null || !storico.ok || istantanea === null) return null;
      return { titolo: salvato.titolo, storico: storico.storico, catalogo: catalogoDi(istantanea.contenuto) };
    });
  } catch {
    return null;
  }
}

/**
 * Il viaggio confermato dell'utente più recente (non demo), per le voci del menu «Versioni» e «Itinerario corrente»;
 * `null` se non ce n'è uno: allora valgono quelle della modalità presentazione.
 */
export function ultimoViaggioConfermato(cartella: string): string | null {
  try {
    return usaBaseDati(cartella, (db) => {
      const propri = elencaViaggi(db)
        .filter((v) => !v.demo && v.stato !== "bozza")
        .sort((a, b) => b.ordine - a.ordine);
      return propri.find((v) => leggiStoricoDelViaggio(db, v.id)?.ok === true)?.id ?? null;
    });
  } catch {
    return null;
  }
}
