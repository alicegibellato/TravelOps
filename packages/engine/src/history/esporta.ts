/**
 * Esportazione e importazione dello storico in JSON (REQ-ITIN-002, operazione "Esporta / importa"; CA-5).
 * L'importazione è difensiva: legge il dato come `unknown`, raccoglie tutti i problemi e non solleva eccezioni.
 */
import { caricaViaggio } from "../itinerary/index.js";
import { CONDIZIONI_AVVERSE, type OrigineProposta, type Problema, type Viaggio } from "../model/index.js";
import { confrontaItinerari } from "./confronto.js";
import { copiaProblema } from "./storico.js";
import { congela, copia, copiaMomento, descrivi, eDataValida, problemaMomento, segnalazione, uguali } from "./supporto.js";
import { CAUSA_ITINERARIO_INIZIALE, type EsitoStorico, type Momento, type Storico, type Versione } from "./tipi.js";

/** Lo storico in JSON, con rientro di due spazi; a parità di storico il testo è identico. */
export function esportaStorico(storico: Storico): string {
  return JSON.stringify({ versioni: storico.versioni }, null, 2);
}

/**
 * Importa uno storico dal JSON (testo o valore già decodificato) prodotto da `esportaStorico`.
 * Controlla numeri consecutivi da 1, i campi di ogni versione, la validità di ogni viaggio (REQ-ITIN-001)
 * e che le modifiche registrate corrispondano alle differenze tra versioni consecutive.
 * Restituisce lo storico congelato, oppure `STORICO_NON_VALIDO` con tutti i problemi trovati.
 */
export function importaStorico(json: unknown): EsitoStorico {
  let dati: unknown = json;
  if (typeof json === "string") {
    try {
      dati = JSON.parse(json);
    } catch {
      return nonValido(["il testo non è JSON valido"]);
    }
  }
  try {
    return leggiStorico(dati);
  } catch {
    return nonValido(["il dato non si riesce a leggere"]);
  }
}

function nonValido(dettagli: string[]): EsitoStorico {
  return { ok: false, errore: segnalazione("STORICO_NON_VALIDO", "lo storico da importare non è valido", dettagli) };
}

type Oggetto = Record<string, unknown>;

function eOggetto(valore: unknown): valore is Oggetto {
  return typeof valore === "object" && valore !== null && !Array.isArray(valore);
}

function eTesto(valore: unknown): valore is string {
  return typeof valore === "string" && valore.trim() !== "";
}

function leggiStorico(dati: unknown): EsitoStorico {
  if (!eOggetto(dati) || !Array.isArray(dati["versioni"])) {
    return nonValido([`versioni: manca l'elenco delle versioni (valore trovato: ${descrivi(dati)})`]);
  }
  const grezze: unknown[] = dati["versioni"];
  if (grezze.length === 0) return nonValido(["versioni: lo storico deve avere almeno la versione 1"]);

  const problemi: string[] = [];
  const versioni: Versione[] = [];
  let precedente: Viaggio | undefined;
  grezze.forEach((grezza, i) => {
    const letta = leggiVersione(grezza, i, precedente, problemi);
    // Se il viaggio è valido, la versione successiva si confronta con questo anche quando la versione ha altri problemi.
    precedente = letta.viaggio;
    if (letta.versione !== undefined) versioni.push(letta.versione);
  });
  if (problemi.length > 0) return nonValido(problemi);
  return { ok: true, storico: congela({ versioni }) };
}

interface VersioneLetta {
  /** La versione, se non ha problemi. */
  versione?: Versione;
  /** Il viaggio della versione, se è valido. */
  viaggio?: Viaggio;
}

/** Legge la versione in posizione `i`, registrando in `problemi` quelli trovati. */
function leggiVersione(grezza: unknown, i: number, precedente: Viaggio | undefined, problemi: string[]): VersioneLetta {
  const dove = `versioni[${i}]`;
  if (!eOggetto(grezza)) {
    problemi.push(`${dove}: la versione deve essere un oggetto (valore trovato: ${descrivi(grezza)})`);
    return {};
  }
  const inizio = problemi.length;
  const segnala = (campo: string, motivo: string): void => {
    problemi.push(`${dove}.${campo}: ${motivo}`);
  };
  const prima = i === 0;
  const numeroAtteso = i + 1;

  if (grezza["numero"] !== numeroAtteso) {
    segnala("numero", `atteso ${numeroAtteso} (le versioni sono numerate da 1 senza salti), trovato ${descrivi(grezza["numero"])}`);
  }
  const causa = grezza["causa"];
  if (!eTesto(causa)) segnala("causa", `manca la causa (valore trovato: ${descrivi(causa)})`);
  else if (prima && causa !== CAUSA_ITINERARIO_INIZIALE) {
    segnala("causa", `la versione 1 ha causa "${CAUSA_ITINERARIO_INIZIALE}", trovato ${descrivi(causa)}`);
  }

  const momento = grezza["momento"];
  const autore = grezza["autore"];
  const origine = grezza["origine"];
  const fattibile = grezza["propostaFattibile"];
  if (prima) {
    for (const campo of ["momento", "autore", "origine", "propostaFattibile"] as const) {
      if (grezza[campo] !== null) segnala(campo, `nella versione 1 vale null (valore trovato: ${descrivi(grezza[campo])})`);
    }
  } else {
    const problemaM = problemaMomento(momento);
    if (problemaM !== null) segnala("momento", problemaM);
    if (!eTesto(autore)) segnala("autore", `manca chi ha accettato la proposta (valore trovato: ${descrivi(autore)})`);
    const problemaO = problemaOrigine(origine);
    if (problemaO !== null) segnala("origine", problemaO);
    if (typeof fattibile !== "boolean") segnala("propostaFattibile", `deve essere true o false (valore trovato: ${descrivi(fattibile)})`);
  }

  const problemiGrezzi = grezza["problemi"];
  if (!Array.isArray(problemiGrezzi)) {
    segnala("problemi", `manca l'elenco dei problemi (valore trovato: ${descrivi(problemiGrezzi)})`);
  } else {
    if (prima && problemiGrezzi.length > 0) segnala("problemi", "la versione 1 non ha problemi di una proposta");
    problemiGrezzi.forEach((p, j) => {
      if (!eProblema(p)) segnala(`problemi[${j}]`, `problema non valido (valore trovato: ${descrivi(p)})`);
    });
  }

  const caricato = caricaViaggio(grezza["viaggio"]);
  if (!caricato.ok) {
    for (const e of caricato.errori) segnala("viaggio", e.messaggio);
  } else {
    const viaggio = caricato.valore;
    const base = precedente ?? viaggio;
    if (precedente !== undefined) {
      if (viaggio.id !== precedente.id) {
        segnala("viaggio.id", `tutte le versioni sono dello stesso viaggio (${precedente.id}), trovato ${descrivi(viaggio.id)}`);
      }
      if (viaggio.prossimoNumeroId < precedente.prossimoNumeroId) {
        segnala(
          "viaggio.prossimoNumeroId",
          `il prossimo numero per gli id nuovi non torna indietro (versione precedente: ${precedente.prossimoNumeroId}, ` +
            `trovato ${viaggio.prossimoNumeroId})`,
        );
      }
    }
    const modifiche = confrontaItinerari(base, viaggio);
    if (!uguali(grezza["modifiche"], modifiche)) {
      segnala("modifiche", "le modifiche registrate non corrispondono alle differenze con la versione precedente");
    }
    if (problemi.length > inizio) return { viaggio };
    return {
      viaggio,
      versione: {
        numero: numeroAtteso,
        momento: prima ? null : copiaMomento(momento as Momento),
        causa: causa as string,
        origine: prima ? null : (copia(origine) as OrigineProposta),
        autore: prima ? null : (autore as string),
        propostaFattibile: prima ? null : (fattibile as boolean),
        problemi: (problemiGrezzi as Problema[]).map(copiaProblema),
        modifiche,
        viaggio,
      },
    };
  }
  return {};
}

function eProblema(valore: unknown): valore is Problema {
  return (
    eOggetto(valore) &&
    eTesto(valore["codice"]) &&
    (valore["gravita"] === "bloccante" || valore["gravita"] === "avviso") &&
    Array.isArray(valore["elementi"]) &&
    valore["elementi"].every((id) => typeof id === "string") &&
    typeof valore["messaggio"] === "string"
  );
}

const OPERAZIONI = ["aggiungi", "rimuovi", "sposta", "cambia_priorita", "imposta_orario_fisso"];
const PRIORITA = ["irrinunciabile", "desiderata", "opzionale"];

/** Il motivo per cui l'origine non è valida, oppure `null`. Controlla tipo e campi dell'imprevisto o della modifica. */
function problemaOrigine(origine: unknown): string | null {
  if (!eOggetto(origine)) return `l'origine deve essere un imprevisto o una modifica richiesta (valore trovato: ${descrivi(origine)})`;
  if (origine["tipo"] === "imprevisto") {
    const imp = origine["imprevisto"];
    if (!eOggetto(imp)) return "manca l'imprevisto";
    const testi = (...campi: string[]): boolean => campi.every((c) => eTesto(imp[c]));
    switch (imp["tipo"]) {
      case "METEO_AVVERSO":
        return testi("zonaId", "inizio", "fine") && eDataValida(imp["data"]) && CONDIZIONI_AVVERSE.some((c) => c === imp["condizione"])
          ? null
          : "imprevisto METEO_AVVERSO incompleto";
      case "RITARDO":
        return testi("momento", "motivo") && eDataValida(imp["data"]) && Number.isInteger(imp["minuti"])
          ? null
          : "imprevisto RITARDO incompleto";
      case "CHIUSURA_LUOGO":
        return testi("luogoId", "inizio", "fine") && eDataValida(imp["data"]) ? null : "imprevisto CHIUSURA_LUOGO incompleto";
      case "CANCELLAZIONE_SPOSTAMENTO":
        return testi("elementoId") ? null : "imprevisto CANCELLAZIONE_SPOSTAMENTO incompleto";
      default:
        return `tipo di imprevisto sconosciuto: ${descrivi(imp["tipo"])}`;
    }
  }
  if (origine["tipo"] === "modifica") {
    const mod = origine["modifica"];
    if (!eOggetto(mod) || !OPERAZIONI.includes(mod["operazione"] as string)) {
      return `modifica richiesta sconosciuta (valore trovato: ${descrivi(mod)})`;
    }
    const descrizione = origine["descrizione"];
    if (descrizione !== undefined && typeof descrizione !== "string") return "la descrizione della modifica deve essere un testo";
    const ok =
      mod["operazione"] === "aggiungi"
        ? eTesto(mod["attivitaId"]) && eDataValida(mod["data"]) && eTesto(mod["inizio"])
        : eTesto(mod["elementoId"]) &&
          (mod["operazione"] !== "sposta" || (eDataValida(mod["data"]) && eTesto(mod["inizio"]))) &&
          (mod["operazione"] !== "cambia_priorita" || PRIORITA.includes(mod["priorita"] as string)) &&
          (mod["operazione"] !== "imposta_orario_fisso" || typeof mod["orarioFisso"] === "boolean");
    return ok ? null : `modifica richiesta "${String(mod["operazione"])}" incompleta`;
  }
  return `tipo di origine sconosciuto: ${descrivi(origine["tipo"])}`;
}
