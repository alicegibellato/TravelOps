/**
 * Ripianificazione minima con spiegazione (REQ-REPLAN-002), estesa agli imprevisti della §7.4 con le preferenze del
 * viaggio e il livello di ripianificazione dichiarato (REQ-REPLAN-004).
 *
 * Dato un imprevisto, propone una nuova versione dell'itinerario che cambia solo ciò che serve e
 * spiega perché. La proposta non cambia l'itinerario: diventa una versione solo se accettata
 * (`applicaProposta`, REQ-ITIN-002). Riusa l'impatto (REQ-REPLAN-001, REQ-REPLAN-003), il controllo di fattibilità
 * (REQ-FEAS-001) e il confronto tra itinerari (REQ-ITIN-002). Deterministica: nessun orologio,
 * nessuna casualità, nessuna rete; il viaggio ricevuto non viene modificato.
 */
import { confrontaItinerari } from "../history/index.js";
import type {
  AlternativaEstesa,
  Catalogo,
  CatalogoEsteso,
  Data,
  Elemento,
  Imprevisto,
  ImprevistoEsteso,
  LivelloRipianificazione,
  Modifiche,
  Proposta,
  SorgenteDatiContesto,
  Viaggio,
} from "../model/index.js";
import type { ProfiloPreferenze } from "../preferences/tipi.js";
import { costruisciAlternative } from "./alternative.js";
import { ripianificaCancellazione } from "./cancellazione.js";
import { arricchisciSorgente, problemiProposta, propostaFattibile } from "./contesto.js";
import { calcolaImpatto, type ImpattoDettagliato } from "./impatto.js";
import { creaLavoro } from "./lavoro.js";
import {
  ripianificaSalute,
  ripianificaSciopero,
  ripianificaServizio,
  ripianificaStanchezza,
  ripianificaVoloPerso,
} from "./ondata2.js";
import { ripianificaRitardo } from "./ritardo.js";
import { ripianificaSostituzione } from "./sostituzione.js";
import { eNotaInformativa, scriviRiepilogo, scriviSpiegazione, type DatiSpiegazione } from "./spiegazione.js";
import { confronta, copiaDati, eFisso, minuti, minutiTesto, trovaElemento } from "./supporto.js";

/** Proposta di ripianificazione: una `Proposta` del modello con l'impatto dettagliato di REQ-REPLAN-001. */
export interface PropostaRipianificazione extends Proposta {
  impatto: ImpattoDettagliato;
  /** Livello di ripianificazione (§7.6, R2-LIV): le proposte per un imprevisto sono di livello `minimo`. */
  livello: LivelloRipianificazione;
}

/**
 * Proposta per un imprevisto qualsiasi, compresi quelli della §7.4 (REQ-REPLAN-004). Origine e alternative usano i
 * tipi estesi: `Proposta` resta quella dell'ondata 1, che storico e web app conoscono.
 */
export interface PropostaRipianificazioneEstesa extends Omit<PropostaRipianificazione, "origine" | "alternative"> {
  origine: { tipo: "imprevisto"; imprevisto: ImprevistoEsteso };
  alternative: AlternativaEstesa[];
}

/** Opzioni facoltative della ripianificazione. */
export interface OpzioniRipianificazione {
  /**
   * Profilo delle preferenze del viaggio (REQ-PREF-001, §7.2), se c'è: nella scelta dei sostituti il punteggio della
   * §7.7 viene prima della categoria e le attività escluse dal profilo non sono candidate (R2-PREF). Senza profilo i
   * risultati di REQ-REPLAN-002 non cambiano.
   */
  profilo?: ProfiloPreferenze;
}

/**
 * Propone la ripianificazione di un imprevisto (operazione "Proponi ripianificazione").
 *
 * @param viaggio il viaggio della versione corrente (non viene modificato).
 * @param versioneBase il numero della versione corrente, su cui la proposta è costruita.
 * @param catalogo zone, luoghi e attività (per gli imprevisti della §7.4 anche un catalogo esteso).
 * @param sorgente dati di contesto: tempi di percorrenza, meteo, chiusure.
 * @param imprevisto l'imprevisto da gestire.
 * @param opzioni il profilo del viaggio, se c'è.
 */
export function proponiRipianificazione(
  viaggio: Viaggio,
  versioneBase: number,
  catalogo: Catalogo,
  sorgente: SorgenteDatiContesto,
  imprevisto: Imprevisto,
  opzioni?: OpzioniRipianificazione,
): PropostaRipianificazione;
export function proponiRipianificazione(
  viaggio: Viaggio,
  versioneBase: number,
  catalogo: Catalogo | CatalogoEsteso,
  sorgente: SorgenteDatiContesto,
  imprevisto: ImprevistoEsteso,
  opzioni?: OpzioniRipianificazione,
): PropostaRipianificazioneEstesa;
export function proponiRipianificazione(
  viaggio: Viaggio,
  versioneBase: number,
  catalogo: Catalogo | CatalogoEsteso,
  sorgente: SorgenteDatiContesto,
  imprevisto: ImprevistoEsteso,
  opzioni: OpzioniRipianificazione = {},
): PropostaRipianificazione | PropostaRipianificazioneEstesa {
  // Il catalogo esteso si usa come catalogo: le regole distinguono da sé i valori nuovi (categoria `servizio`).
  const base = catalogo as Catalogo;
  const originale = copiaDati(viaggio);
  const impatto = calcolaImpatto(originale, base, imprevisto);
  const lavoro = creaLavoro(originale, copiaDati(originale), base, arricchisciSorgente(sorgente, imprevisto), opzioni.profilo);

  switch (imprevisto.tipo) {
    case "METEO_AVVERSO":
    case "CHIUSURA_LUOGO":
      ripianificaSostituzione(lavoro, imprevisto, impatto);
      break;
    case "RITARDO": {
      const motivo = imprevisto.motivo.trim();
      ripianificaRitardo(
        lavoro,
        imprevisto,
        impatto,
        `il ritardo di ${minutiTesto(imprevisto.minuti)}${motivo === "" ? "" : ` (${motivo})`}`,
      );
      break;
    }
    case "CANCELLAZIONE_SPOSTAMENTO":
      ripianificaCancellazione(lavoro, imprevisto);
      break;
    case "SALUTE":
      ripianificaSalute(lavoro, imprevisto, impatto);
      break;
    case "VOLO_PERSO":
      ripianificaVoloPerso(lavoro, imprevisto, impatto);
      break;
    case "SCIOPERO":
      ripianificaSciopero(lavoro, impatto, imprevisto);
      break;
    case "BAGAGLIO_SMARRITO":
    case "DOCUMENTI_SMARRITI":
      ripianificaServizio(lavoro, imprevisto);
      break;
    case "STANCHEZZA":
      ripianificaStanchezza(lavoro, imprevisto, impatto);
      break;
  }

  const itinerario = lavoro.viaggio;
  const differenza = confrontaItinerari(originale, itinerario);
  const modifiche: Modifiche = {
    aggiunti: differenza.aggiunti.map((v) => v.elemento),
    rimossi: differenza.rimossi.map((v) => v.elemento),
    modificati: differenza.modificati.map((m) => ({ id: m.id, prima: m.prima.elemento, dopo: m.dopo.elemento })),
  };

  // R-3: fattibilità con i dati di contesto arricchiti dall'imprevisto, più i problemi delle regole dei singoli casi
  // (R2-BAG, R2-DOC: il tempo necessario non si trova).
  const problemi = [...problemiProposta(itinerario, base, lavoro.sorgente), ...lavoro.problemiExtra];
  const cambiati = new Set([...modifiche.aggiunti.map((e) => e.id), ...modifiche.modificati.map((m) => m.id)]);
  const fattibile = propostaFattibile(problemi, cambiati);

  // Elementi a rischio (modello-dominio.md §2.6): (a) a orario fisso colpiti, (b) nei problemi
  // bloccanti di una proposta non fattibile, (c) quelli indicati dalle regole dei singoli casi.
  const perche = new Map<string, string[]>();
  const aggiungi = (id: string, motivo: string): void => {
    const elenco = perche.get(id) ?? [];
    if (!elenco.includes(motivo)) elenco.push(motivo);
    perche.set(id, elenco);
  };
  for (const [id, motivo] of lavoro.aRischio) aggiungi(id, motivo);
  for (const colpito of [impatto, ...lavoro.impattiDerivati].flatMap((i) => i.elementiColpiti)) {
    const elemento = trovaElemento(originale, colpito.elementoId)?.elemento;
    if (elemento && eFisso(elemento) && !lavoro.aRischio.has(elemento.id)) {
      aggiungi(elemento.id, "è a orario fisso ed è colpito dall'imprevisto: TravelOps non lo sposta");
    }
  }
  if (!fattibile) {
    for (const problema of problemi) {
      if (problema.gravita !== "bloccante") continue;
      for (const id of problema.elementi) aggiungi(id, `${problema.codice}: ${problema.messaggio.replace(/\.$/, "")}`);
    }
  }
  const aRischio = [...perche.entries()]
    .flatMap(([id, motivi]) => {
      const trovato = trovaElemento(itinerario, id);
      return trovato ? [{ data: trovato.giorno.data, elemento: trovato.elemento, perche: motivi }] : [];
    })
    .sort(perPosizione);

  // R-ALT-1: gli spostamenti cancellati (com'erano) e ogni elemento a rischio; poi le alternative della §7.4.
  const vociAlternative = [
    ...lavoro.cancellati.map((c) => ({ data: c.data, elemento: c.elemento, prima: 0 })),
    ...aRischio.map((r) => ({ data: r.data, elemento: r.elemento, prima: 1 })),
  ].sort((a, b) => perPosizione(a, b) || a.prima - b.prima);
  const alternative: AlternativaEstesa[] = [...costruisciAlternative(vociAlternative, lavoro.indice)];
  for (const extra of lavoro.alternativeExtra) {
    if (!alternative.some((a) => a.tipo === extra.tipo && a.elementoId === extra.elementoId)) alternative.push(extra);
  }

  // R2-LIV: livello minimo; se non è fattibile la spiegazione offre di rigenerare le giornate coinvolte.
  const giornateDaRigenerare = fattibile ? [] : giornateCoinvolte(imprevisto, impatto, aRischio, originale);
  const datiSpiegazione: DatiSpiegazione = {
    imprevisto,
    originale,
    impatto,
    differenza,
    motivi: lavoro.motivi,
    note: lavoro.note,
    fattibile,
    problemi,
    aRischio,
    alternative,
    domande: [
      ...lavoro.domande,
      ...(!fattibile && lavoro.domande.length === 0
        ? ["la proposta non è fattibile: vuoi accettarla comunque, rifiutarla o cambiare tu l'itinerario?"]
        : []),
    ],
    giornateDaRigenerare,
  };
  const spiegazione = scriviSpiegazione(datiSpiegazione, lavoro.indice);
  const riepilogo = scriviRiepilogo(datiSpiegazione, lavoro.indice);
  const informativa = eNotaInformativa(imprevisto, differenza);

  return {
    versioneBase,
    origine: { tipo: "imprevisto", imprevisto: copiaDati(imprevisto) },
    livello: "minimo",
    impatto,
    modifiche,
    itinerario,
    spiegazione,
    riepilogo,
    ...(informativa ? { informativa } : {}),
    fattibile,
    problemi,
    elementiARischio: aRischio.map((r) => r.elemento.id),
    alternative,
  };
}

/** Le giornate da rigenerare: quelle degli elementi a rischio e dei colpiti o, se non ce ne sono, quella dell'imprevisto. */
function giornateCoinvolte(
  imprevisto: ImprevistoEsteso,
  impatto: ImpattoDettagliato,
  aRischio: readonly { data: Data }[],
  viaggio: Viaggio,
): Data[] {
  const date = new Set<Data>([...aRischio.map((r) => r.data), ...impatto.elementiColpiti.map((c) => c.data)]);
  if (date.size === 0) {
    if ("data" in imprevisto) date.add(imprevisto.data);
    else if (imprevisto.tipo === "SALUTE") date.add(imprevisto.dataInizio);
    else {
      const trovato = trovaElemento(viaggio, imprevisto.elementoId);
      if (trovato) date.add(trovato.giorno.data);
    }
  }
  return [...date].sort(confronta);
}

/** Ordine nell'itinerario: data, inizio, `id`. */
function perPosizione(a: { data: string; elemento: Elemento }, b: { data: string; elemento: Elemento }): number {
  return (
    confronta(a.data, b.data) ||
    minuti(a.elemento.inizio) - minuti(b.elemento.inizio) ||
    confronta(a.elemento.id, b.elemento.id)
  );
}
