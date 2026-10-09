/**
 * Ripianificazione minima con spiegazione (REQ-REPLAN-002).
 *
 * Dato un imprevisto, propone una nuova versione dell'itinerario che cambia solo ciò che serve e
 * spiega perché. La proposta non cambia l'itinerario: diventa una versione solo se accettata
 * (`applicaProposta`, REQ-ITIN-002). Riusa l'impatto (REQ-REPLAN-001), il controllo di fattibilità
 * (REQ-FEAS-001) e il confronto tra itinerari (REQ-ITIN-002). Deterministica: nessun orologio,
 * nessuna casualità, nessuna rete; il viaggio ricevuto non viene modificato.
 */
import { confrontaItinerari } from "../history/index.js";
import type {
  Catalogo,
  Elemento,
  Imprevisto,
  Modifiche,
  Proposta,
  SorgenteDatiContesto,
  Viaggio,
} from "../model/index.js";
import { costruisciAlternative } from "./alternative.js";
import { ripianificaCancellazione } from "./cancellazione.js";
import { arricchisciSorgente, problemiProposta, propostaFattibile } from "./contesto.js";
import { calcolaImpatto, type ImpattoDettagliato } from "./impatto.js";
import { creaLavoro } from "./lavoro.js";
import { ripianificaRitardo } from "./ritardo.js";
import { ripianificaSostituzione } from "./sostituzione.js";
import { scriviSpiegazione } from "./spiegazione.js";
import { confronta, copiaDati, eFisso, minuti, minutiTesto, trovaElemento } from "./supporto.js";

/** Proposta di ripianificazione: una `Proposta` del modello con l'impatto dettagliato di REQ-REPLAN-001. */
export interface PropostaRipianificazione extends Proposta {
  impatto: ImpattoDettagliato;
}

/**
 * Propone la ripianificazione di un imprevisto (operazione "Proponi ripianificazione").
 *
 * @param viaggio il viaggio della versione corrente (non viene modificato).
 * @param versioneBase il numero della versione corrente, su cui la proposta è costruita.
 * @param catalogo zone, luoghi e attività.
 * @param sorgente dati di contesto: tempi di percorrenza, meteo, chiusure.
 * @param imprevisto l'imprevisto da gestire.
 */
export function proponiRipianificazione(
  viaggio: Viaggio,
  versioneBase: number,
  catalogo: Catalogo,
  sorgente: SorgenteDatiContesto,
  imprevisto: Imprevisto,
): PropostaRipianificazione {
  const originale = copiaDati(viaggio);
  const impatto = calcolaImpatto(originale, catalogo, imprevisto);
  const lavoro = creaLavoro(originale, copiaDati(originale), catalogo, arricchisciSorgente(sorgente, imprevisto));

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
  }

  const itinerario = lavoro.viaggio;
  const differenza = confrontaItinerari(originale, itinerario);
  const modifiche: Modifiche = {
    aggiunti: differenza.aggiunti.map((v) => v.elemento),
    rimossi: differenza.rimossi.map((v) => v.elemento),
    modificati: differenza.modificati.map((m) => ({ id: m.id, prima: m.prima.elemento, dopo: m.dopo.elemento })),
  };

  // R-3: fattibilità con i dati di contesto arricchiti dall'imprevisto.
  const problemi = problemiProposta(itinerario, catalogo, lavoro.sorgente);
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

  // R-ALT-1: lo spostamento cancellato (com'era) e ogni elemento a rischio.
  const cancellato =
    imprevisto.tipo === "CANCELLAZIONE_SPOSTAMENTO" ? trovaElemento(originale, imprevisto.elementoId) : undefined;
  const vociAlternative = [
    ...(cancellato && cancellato.elemento.tipo === "spostamento"
      ? [{ data: cancellato.giorno.data, elemento: cancellato.elemento, prima: 0 }]
      : []),
    ...aRischio.map((r) => ({ data: r.data, elemento: r.elemento, prima: 1 })),
  ].sort((a, b) => perPosizione(a, b) || a.prima - b.prima);
  const alternative = costruisciAlternative(vociAlternative, lavoro.indice);

  const spiegazione = scriviSpiegazione(
    {
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
    },
    lavoro.indice,
  );

  return {
    versioneBase,
    origine: { tipo: "imprevisto", imprevisto: copiaDati(imprevisto) },
    impatto,
    modifiche,
    itinerario,
    spiegazione,
    fattibile,
    problemi,
    elementiARischio: aRischio.map((r) => r.elemento.id),
    alternative,
  };
}

/** Ordine nell'itinerario: data, inizio, `id`. */
function perPosizione(a: { data: string; elemento: Elemento }, b: { data: string; elemento: Elemento }): number {
  return (
    confronta(a.data, b.data) ||
    minuti(a.elemento.inizio) - minuti(b.elemento.inizio) ||
    confronta(a.elemento.id, b.elemento.id)
  );
}
