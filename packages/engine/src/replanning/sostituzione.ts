/**
 * Sostituzione di un'attività colpita da `METEO_AVVERSO`, `CHIUSURA_LUOGO` (REQ-REPLAN-002 R-SOS-1…R-SOS-6,
 * con R-2 e R-7) o `SALUTE` (REQ-REPLAN-004 R2-SAL: filtro di intensità e accessibilità al posto di "al coperto"),
 * con la scelta secondo il profilo del viaggio quando c'è (R2-PREF).
 */
import type {
  AttivitaCatalogo,
  CategoriaEstesa,
  Elemento,
  ElementoAttivita,
  ElementoSpostamento,
  ImprevistoChiusuraLuogo,
  ImprevistoMeteoAvverso,
  ImprevistoSalute,
  Intensita,
  Percorso,
  Priorita,
} from "../model/index.js";
import { valutaAttivita } from "../preferences/punteggio.js";
import type { ImpattoDettagliato } from "./impatto.js";
import { chiedi, elementiDel, impostaElementi, type Lavoro } from "./lavoro.js";
import { contornoAttivita, rimuoviAttivitaConSpostamenti } from "./rimozione.js";
import {
  FINE_GIORNATA,
  confronta,
  eFisso,
  elenca,
  giornoDi,
  minuti,
  minutiTesto,
  orario,
  percorso,
  prioritaDi,
} from "./supporto.js";

type ImprevistoSostituzione = ImprevistoMeteoAvverso | ImprevistoChiusuraLuogo | ImprevistoSalute;

/** Una candidata collocata nella finestra (R-SOS-3). */
export interface Collocata {
  attivita: AttivitaCatalogo;
  inizio: number;
  fine: number;
  andata: Percorso;
  ritorno: Percorso;
}

const NESSUNO_SPOSTAMENTO: Percorso = { mezzo: "piedi", minuti: 0 };

const GRADO_INTENSITA: Readonly<Record<Intensita, number>> = { facile: 1, moderata: 2, impegnativa: 3 };

/** La categoria di un'attività, compresi i valori dell'ondata 2 (`servizio`). */
export const categoriaDi = (a: AttivitaCatalogo): CategoriaEstesa => a.categoria as CategoriaEstesa;

/** Applica la sostituzione (o la rimozione) a ogni attività colpita, in ordine di data e di inizio. */
export function ripianificaSostituzione(
  lavoro: Lavoro,
  imprevisto: ImprevistoSostituzione,
  impatto: ImpattoDettagliato,
): void {
  for (const colpito of impatto.elementiColpiti) sostituisciAttivita(lavoro, imprevisto, colpito.elementoId, colpito.data);
}

/** La data dell'imprevisto in parole, per le spiegazioni della salute. */
function descrizioneSalute(imprevisto: ImprevistoSalute): string {
  const descrizione = imprevisto.descrizione.trim();
  return descrizione === "" ? "per il problema di salute indicato" : `per «${descrizione}»`;
}

/** Perché l'attività è colpita, in linguaggio semplice. */
function perche(lavoro: Lavoro, imprevisto: ImprevistoSostituzione, x: ElementoAttivita): string {
  const { indice } = lavoro;
  if (imprevisto.tipo === "SALUTE") {
    const attivita = indice.attivitaDi(x);
    const cause: string[] = [];
    if (imprevisto.intensitaMassima !== "nessuna" && attivita.intensita !== undefined) {
      cause.push(`l'intensità massima consentita è ${imprevisto.intensitaMassima} e l'attività è ${attivita.intensita}`);
    }
    if (imprevisto.mobilitaRidotta && attivita.accessibile === false) cause.push("l'attività non è accessibile con mobilità ridotta");
    return `${descrizioneSalute(imprevisto)} ${cause.length === 0 ? "l'attività non è adatta" : cause.join(" e ")}`;
  }
  const intervallo =
    imprevisto.inizio === "00:00" && imprevisto.fine === "24:00"
      ? "per tutta la giornata"
      : `dalle ${imprevisto.inizio} alle ${imprevisto.fine}`;
  if (imprevisto.tipo === "METEO_AVVERSO") {
    return `è all'aperto e il ${imprevisto.data} è prevista ${imprevisto.condizione} in zona ${indice.nomeZona(imprevisto.zonaId)} ${intervallo}`;
  }
  return `il luogo «${indice.nomeLuogo(imprevisto.luogoId)}» è chiuso il ${imprevisto.data} ${intervallo}`;
}

/** Perché una candidata non va bene per questo imprevisto (R-SOS-2, R2-SAL), o `null` se va bene. */
function motivoImprevisto(imprevisto: ImprevistoSostituzione, a: AttivitaCatalogo): string | null {
  switch (imprevisto.tipo) {
    case "METEO_AVVERSO":
      return a.allAperto ? "è all'aperto" : null;
    case "CHIUSURA_LUOGO":
      return a.luogoId === imprevisto.luogoId ? "è nel luogo chiuso" : null;
    case "SALUTE": {
      // Un dato assente non si presume favorevole: senza intensità (o accessibilità, se serve) non è candidata.
      const massima = imprevisto.intensitaMassima === "nessuna" ? 0 : GRADO_INTENSITA[imprevisto.intensitaMassima];
      if (a.intensita === undefined || GRADO_INTENSITA[a.intensita] > massima) return "è troppo impegnativa";
      if (imprevisto.mobilitaRidotta && a.accessibile !== true) return "non è accessibile";
      return null;
    }
  }
}

/** Il tipo di candidate in parole, per le spiegazioni. */
function tipoCandidate(imprevisto: ImprevistoSostituzione): string {
  switch (imprevisto.tipo) {
    case "METEO_AVVERSO":
      return "attività al coperto";
    case "CHIUSURA_LUOGO":
      return "attività in un altro luogo";
    case "SALUTE":
      return (
        `attività di intensità al massimo ${imprevisto.intensitaMassima}` +
        (imprevisto.mobilitaRidotta ? " e accessibili con mobilità ridotta" : "")
      );
  }
}

function sostituisciAttivita(lavoro: Lavoro, imprevisto: ImprevistoSostituzione, id: string, data: string): void {
  const { indice, profilo } = lavoro;
  const giorno = giornoDi(lavoro.viaggio, data);
  const elementi = elementiDel(lavoro, data);
  const i = elementi.findIndex((e) => e.id === id);
  const x = elementi[i];
  if (!giorno || !x || x.tipo !== "attivita") return;
  const attivitaX = indice.attivitaDi(x);
  const nomeX = indice.descrivi(x);
  const motivoX = perche(lavoro, imprevisto, x);

  // R-2: un elemento a orario fisso non si sposta né si rimuove: è a rischio.
  if (eFisso(x)) {
    lavoro.aRischio.set(x.id, `${motivoX}; è a orario fisso, quindi TravelOps non la sposta né la rimuove`);
    chiedi(lavoro, `${nomeX} è a orario fisso ma ${motivoX}: vuoi tenerla così o cambiarla tu?`);
    return;
  }
  // R-7: un'attività irrinunciabile resta al suo posto ed è a rischio.
  if (prioritaDi(x) === "irrinunciabile") {
    lavoro.aRischio.set(x.id, `${motivoX}; è irrinunciabile, quindi resta al suo posto`);
    chiedi(lavoro, `${nomeX} è irrinunciabile ma ${motivoX}: vuoi tenerla comunque, spostarla in un altro momento o rinunciarci?`);
    return;
  }

  // R-SOS-1: spostamenti di andata e ritorno, finestra, luogo di ingresso e di uscita.
  const { andata, ritorno, precedente, successivo, ingresso, uscita } = contornoAttivita(indice, giorno, elementi, i);
  const inizioFinestra = precedente ? minuti(precedente.fine) : minuti((andata ?? x).inizio);
  const fineFinestra = successivo ? minuti(successivo.inizio) : FINE_GIORNATA;

  // R-SOS-2: candidate (mai pasti né servizi, §8.5); con il profilo, mai quelle che il profilo esclude (R2-PREF).
  const zona = indice.luoghi.get(attivitaX.luogoId)?.zonaId;
  const presenti = new Set(
    lavoro.viaggio.giorni.flatMap((g) => g.elementi.flatMap((e) => (e.tipo === "attivita" ? [e.attivitaId] : []))),
  );
  const punteggi = new Map<string, number>();
  const esclusioni: string[] = [];
  const candidate = [...lavoro.catalogo.attivita]
    .sort((a, b) => confronta(a.id, b.id))
    .filter((a) => {
      if (indice.luoghi.get(a.luogoId)?.zonaId !== zona) return false;
      let motivo = categoriaDi(a) === "pasto"
        ? "è un pasto"
        : categoriaDi(a) === "servizio"
          ? "è un servizio"
          : presenti.has(a.id)
            ? "è già nell'itinerario"
            : motivoImprevisto(imprevisto, a);
      if (motivo === null && profilo) {
        const valutazione = valutaAttivita(a, profilo);
        if (valutazione.punteggio === null) motivo = "è esclusa dal profilo del viaggio";
        else punteggi.set(a.id, valutazione.punteggio);
      }
      if (motivo !== null && a.id !== attivitaX.id) esclusioni.push(`«${a.nome}» ${motivo}`);
      return motivo === null;
    });

  const collocate = candidate.flatMap((a) => {
    const c = collocaNellaFinestra(lavoro, a, data, {
      andata: andata !== undefined,
      ritorno: ritorno !== undefined,
      ingresso,
      uscita,
      vincoloSenzaRitorno: ritorno ? undefined : successivo ? indice.luogoInizio(successivo) : giorno.alloggio,
      inizioFinestra,
      fineFinestra,
    });
    return c ? [c] : [];
  });

  // R2-PREF: con il profilo prima il punteggio più alto (§7.7); poi R-SOS-4: stessa categoria, meno spostamento,
  // inizio più vicino all'originale, id.
  const inizioX = minuti(x.inizio);
  const punteggio = (c: Collocata): number => (profilo ? (punteggi.get(c.attivita.id) ?? 0) : 0);
  const stessa = (c: Collocata): number => (c.attivita.categoria === attivitaX.categoria ? 0 : 1);
  const viaggioTot = (c: Collocata): number => c.andata.minuti + c.ritorno.minuti;
  const distanza = (c: Collocata): number => Math.abs(c.inizio - inizioX);
  collocate.sort(
    (a, b) =>
      punteggio(b) - punteggio(a) ||
      stessa(a) - stessa(b) ||
      viaggioTot(a) - viaggioTot(b) ||
      distanza(a) - distanza(b) ||
      confronta(a.attivita.id, b.attivita.id),
  );

  const finestra =
    `tra le ${orario(inizioFinestra)} e le ${orario(fineFinestra)}, partendo da «${indice.nomeLuogo(ingresso)}»` +
    (uscita !== undefined ? ` e arrivando a «${indice.nomeLuogo(uscita)}»` : "");
  const tipo = tipoCandidate(imprevisto);
  const descriviCollocata = (c: Collocata): string =>
    `«${c.attivita.nome}» (${orario(c.inizio)}–${orario(c.fine)}, spostamenti ${c.andata.minuti} + ${c.ritorno.minuti} minuti` +
    (profilo ? `, punteggio ${punteggio(c)}` : "") +
    ")";

  const scelta = collocate[0];
  if (scelta) {
    applicaSostituta(lavoro, { data, elementi, x, andata, ritorno, ingresso, uscita, motivoX }, scelta, {
      priorita: prioritaDi(x),
      motivoNuova:
        `sostituisce ${indice.descrivi(x)}: ` +
        (imprevisto.tipo === "SALUTE"
          ? `ha intensità ${scelta.attivita.intensita ?? "non indicata"}, `
          : `è ${scelta.attivita.allAperto ? "all'aperto" : "al coperto"}, `) +
        `in zona ${indice.nomeZona(indice.luoghi.get(scelta.attivita.luogoId)?.zonaId ?? "")} e dura ${scelta.attivita.durataTipica} minuti come di consueto`,
    });
    const ragione = ragioneScelta(scelta, collocate[1], attivitaX, punteggio);
    lavoro.note.push(
      `Per sostituire ${nomeX} si cercano ${tipo} in zona ${indice.nomeZona(zona ?? "")} ${finestra}. ` +
        `Candidate: ${elenca(collocate.map(descriviCollocata))}. Scelta «${scelta.attivita.nome}»: ${ragione}.`,
    );
    return;
  }

  // R-SOS-5: nessuna candidata collocabile, l'attività viene rimossa.
  const perche5 =
    candidate.length === 0
      ? `nessuna attività adatta in zona ${indice.nomeZona(zona ?? "")}` +
        (esclusioni.length > 0 ? ` (${elenca(esclusioni)})` : "")
      : `nessuna delle ${tipo} in zona ${indice.nomeZona(zona ?? "")} (${elenca(candidate.map((c) => `«${c.nome}»`))}) sta ${finestra}`;
  lavoro.note.push(`Per ${nomeX} non c'è una sostituta: ${perche5}. L'attività viene rimossa.`);
  lavoro.motivi.set(x.id, `${motivoX} e non c'è un'attività adatta per sostituirla`);
  rimuoviAttivitaConSpostamenti(lavoro, data, elementi, x, { andata, ritorno, ingresso, uscita, successivo });
}

/** Dove e quando può stare un'attività nella finestra di R-SOS-1. */
export interface FinestraSostituzione {
  /** C'è uno spostamento di andata (che si può riusare). */
  andata: boolean;
  /** C'è uno spostamento di ritorno (che si può riusare). */
  ritorno: boolean;
  ingresso: string;
  uscita: string | undefined;
  /**
   * Senza spostamento di ritorno non c'è un luogo di uscita: chi segue (o l'alloggio) aspetta il viaggiatore dove si
   * trova, quindi l'attività deve stare lì (vale lo stesso, senza andata, per l'ingresso).
   */
  vincoloSenzaRitorno: string | undefined;
  inizioFinestra: number;
  fineFinestra: number;
  /** Ora entro cui l'attività deve finire (R2-BAG, R2-DOC); senza limite, la chiusura del luogo. */
  fineEntro?: number;
  /** Durata da usare se maggiore della durata tipica (R-6: mai meno della durata tipica). */
  durataMinima?: number;
}

/** R-SOS-3: collocazione nella finestra, con i tempi del mezzo più veloce; `null` se non ci sta. */
export function collocaNellaFinestra(
  lavoro: Lavoro,
  a: AttivitaCatalogo,
  data: string,
  f: FinestraSostituzione,
): Collocata | null {
  const { indice, sorgente } = lavoro;
  const tAndata = f.andata ? percorso(sorgente, f.ingresso, a.luogoId) : a.luogoId === f.ingresso ? NESSUNO_SPOSTAMENTO : null;
  const tRitorno =
    f.ritorno && f.uscita !== undefined
      ? percorso(sorgente, a.luogoId, f.uscita)
      : f.vincoloSenzaRitorno === undefined || f.vincoloSenzaRitorno === a.luogoId
        ? NESSUNO_SPOSTAMENTO
        : null;
  if (!tAndata || !tRitorno) return null;
  const durata = Math.max(a.durataTipica, f.durataMinima ?? 0);
  for (const fascia of indice.fasceApertura(a.luogoId, data)) {
    const inizio = Math.max(f.inizioFinestra + tAndata.minuti, fascia.apertura);
    const fine = inizio + durata;
    if (fine <= fascia.chiusura && fine + tRitorno.minuti <= f.fineFinestra && (f.fineEntro === undefined || fine <= f.fineEntro)) {
      return { attivita: a, inizio, fine, andata: tAndata, ritorno: tRitorno };
    }
  }
  return null;
}

/** Perché la prima candidata vince sulla seconda, secondo l'ordine di R2-PREF e R-SOS-4. */
function ragioneScelta(
  scelta: Collocata,
  seconda: Collocata | undefined,
  attivitaX: AttivitaCatalogo,
  punteggio: (c: Collocata) => number,
): string {
  const categoria = attivitaX.categoria;
  if (!seconda) {
    return scelta.attivita.categoria === categoria
      ? `è l'unica che sta nella finestra ed è della stessa categoria (${categoria})`
      : "è l'unica che sta nella finestra";
  }
  if (punteggio(scelta) > punteggio(seconda)) {
    return `ha il punteggio più alto per le preferenze del viaggio (${punteggio(scelta)} contro ${punteggio(seconda)})`;
  }
  if (scelta.attivita.categoria === categoria && seconda.attivita.categoria !== categoria) {
    return `è della stessa categoria dell'attività originale (${categoria})`;
  }
  const premessa =
    scelta.attivita.categoria === categoria
      ? `più candidate sono della stessa categoria (${categoria}); `
      : `nessuna candidata è della stessa categoria (${categoria}); `;
  const tScelta = scelta.andata.minuti + scelta.ritorno.minuti;
  const tSeconda = seconda.andata.minuti + seconda.ritorno.minuti;
  if (tScelta < tSeconda) {
    return `${premessa}ha il minor tempo di spostamento (${minutiTesto(tScelta)} contro ${minutiTesto(tSeconda)})`;
  }
  return `${premessa}a parità di spostamenti inizia più vicino all'orario originale o viene prima per id`;
}

export interface ContestoSostituzione {
  data: string;
  elementi: Elemento[];
  x: ElementoAttivita;
  andata: ElementoSpostamento | undefined;
  ritorno: ElementoSpostamento | undefined;
  ingresso: string;
  uscita: string | undefined;
  motivoX: string;
}

/**
 * R-SOS-3, R-SOS-6, R-8: l'attività `x` lascia il posto a quella scelta, che prende un id nuovo; gli spostamenti
 * ricalcolati tengono il loro. Lo usano anche bagaglio e documenti smarriti (R2-BAG, R2-DOC).
 */
export function applicaSostituta(
  lavoro: Lavoro,
  c: ContestoSostituzione,
  scelta: Collocata,
  nuovaAttivita: { priorita: Priorita; motivoNuova: string; motivoX?: string },
): void {
  const { indice } = lavoro;
  const { x } = c;
  const id = `N${lavoro.viaggio.prossimoNumeroId}`;
  lavoro.viaggio.prossimoNumeroId += 1;
  const nuova: ElementoAttivita = {
    id,
    tipo: "attivita",
    inizio: orario(scelta.inizio),
    fine: orario(scelta.fine),
    orarioFisso: false,
    attivitaId: scelta.attivita.id,
    priorita: nuovaAttivita.priorita,
  };
  const luogo = scelta.attivita.luogoId;
  const nomeNuova = `${id} «${scelta.attivita.nome}»`;
  lavoro.motivi.set(x.id, nuovaAttivita.motivoX ?? `${c.motivoX}: al suo posto ${nomeNuova}`);
  lavoro.motivi.set(id, nuovaAttivita.motivoNuova);

  const risultato: Elemento[] = [];
  for (const e of c.elementi) {
    if (e.id === x.id) {
      risultato.push(nuova);
    } else if (c.andata && e.id === c.andata.id) {
      if (c.ingresso === luogo) {
        lavoro.motivi.set(e.id, `non serve più: ${nomeNuova} è dove il viaggiatore si trova già`);
      } else {
        risultato.push({
          ...c.andata,
          a: luogo,
          mezzo: scelta.andata.mezzo,
          inizio: orario(scelta.inizio - scelta.andata.minuti),
          fine: nuova.inizio,
        });
        lavoro.motivi.set(e.id, `ora porta a «${indice.nomeLuogo(luogo)}» e arriva all'inizio di ${nomeNuova}`);
      }
    } else if (c.ritorno && e.id === c.ritorno.id && c.uscita !== undefined) {
      if (luogo === c.uscita) {
        lavoro.motivi.set(e.id, `non serve più: ${nomeNuova} è già nel luogo dell'elemento successivo`);
      } else {
        risultato.push({
          ...c.ritorno,
          da: luogo,
          a: c.uscita,
          mezzo: scelta.ritorno.mezzo,
          inizio: nuova.fine,
          fine: orario(scelta.fine + scelta.ritorno.minuti),
        });
        lavoro.motivi.set(e.id, `ora parte da «${indice.nomeLuogo(luogo)}» alla fine di ${nomeNuova}`);
      }
    } else {
      risultato.push(e);
    }
  }
  impostaElementi(lavoro, c.data, risultato);
}
