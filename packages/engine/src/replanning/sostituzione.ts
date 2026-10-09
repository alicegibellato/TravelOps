/**
 * Sostituzione di un'attività colpita da `METEO_AVVERSO` o `CHIUSURA_LUOGO`
 * (REQ-REPLAN-002 R-SOS-1…R-SOS-6, con R-2 e R-7).
 */
import type {
  AttivitaCatalogo,
  Elemento,
  ElementoAttivita,
  ElementoSpostamento,
  ImprevistoChiusuraLuogo,
  ImprevistoMeteoAvverso,
  Percorso,
} from "../model/index.js";
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

type ImprevistoSostituzione = ImprevistoMeteoAvverso | ImprevistoChiusuraLuogo;

/** Una candidata collocata nella finestra (R-SOS-3). */
interface Collocata {
  attivita: AttivitaCatalogo;
  inizio: number;
  fine: number;
  andata: Percorso;
  ritorno: Percorso;
}

const NESSUNO_SPOSTAMENTO: Percorso = { mezzo: "piedi", minuti: 0 };

/** Applica la sostituzione (o la rimozione) a ogni attività colpita, in ordine di inizio. */
export function ripianificaSostituzione(
  lavoro: Lavoro,
  imprevisto: ImprevistoSostituzione,
  impatto: ImpattoDettagliato,
): void {
  for (const colpito of impatto.elementiColpiti) sostituisciAttivita(lavoro, imprevisto, colpito.elementoId);
}

/** Perché l'attività è colpita, in linguaggio semplice. */
function perche(lavoro: Lavoro, imprevisto: ImprevistoSostituzione, x: ElementoAttivita): string {
  const { indice } = lavoro;
  const intervallo =
    imprevisto.inizio === "00:00" && imprevisto.fine === "24:00"
      ? "per tutta la giornata"
      : `dalle ${imprevisto.inizio} alle ${imprevisto.fine}`;
  if (imprevisto.tipo === "METEO_AVVERSO") {
    return `è all'aperto e il ${imprevisto.data} è prevista ${imprevisto.condizione} in zona ${indice.nomeZona(imprevisto.zonaId)} ${intervallo}`;
  }
  return `il luogo «${indice.nomeLuogo(imprevisto.luogoId)}» è chiuso il ${imprevisto.data} ${intervallo}`;
}

function sostituisciAttivita(lavoro: Lavoro, imprevisto: ImprevistoSostituzione, id: string): void {
  const { indice, sorgente } = lavoro;
  const data = imprevisto.data;
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
  // Senza spostamento di ritorno non c'è un luogo di uscita: chi segue (o l'alloggio) aspetta il
  // viaggiatore dove si trova, quindi la sostituta deve stare lì (vale lo stesso, senza andata, per l'ingresso).
  const vincoloSenzaRitorno = ritorno ? undefined : successivo ? indice.luogoInizio(successivo) : giorno.alloggio;

  // R-SOS-2: candidate.
  const zona = indice.luoghi.get(attivitaX.luogoId)?.zonaId;
  const presenti = new Set(
    lavoro.viaggio.giorni.flatMap((g) => g.elementi.flatMap((e) => (e.tipo === "attivita" ? [e.attivitaId] : []))),
  );
  const esclusioni: string[] = [];
  const candidate = [...lavoro.catalogo.attivita]
    .sort((a, b) => confronta(a.id, b.id))
    .filter((a) => {
      if (indice.luoghi.get(a.luogoId)?.zonaId !== zona) return false;
      const motivo = a.categoria === "pasto"
        ? "è un pasto"
        : presenti.has(a.id)
          ? "è già nell'itinerario"
          : imprevisto.tipo === "METEO_AVVERSO" && a.allAperto
            ? "è all'aperto"
            : imprevisto.tipo === "CHIUSURA_LUOGO" && a.luogoId === imprevisto.luogoId
              ? "è nel luogo chiuso"
              : null;
      if (motivo !== null && a.id !== attivitaX.id) esclusioni.push(`«${a.nome}» ${motivo}`);
      return motivo === null;
    });

  // R-SOS-3: collocazione nella finestra, con i tempi del mezzo più veloce.
  const colloca = (a: AttivitaCatalogo): Collocata | null => {
    const tAndata = andata ? percorso(sorgente, ingresso, a.luogoId) : a.luogoId === ingresso ? NESSUNO_SPOSTAMENTO : null;
    const tRitorno =
      ritorno && uscita !== undefined
        ? percorso(sorgente, a.luogoId, uscita)
        : vincoloSenzaRitorno === undefined || vincoloSenzaRitorno === a.luogoId
          ? NESSUNO_SPOSTAMENTO
          : null;
    if (!tAndata || !tRitorno) return null;
    for (const fascia of indice.fasceApertura(a.luogoId, data)) {
      const inizio = Math.max(inizioFinestra + tAndata.minuti, fascia.apertura);
      const fine = inizio + a.durataTipica;
      if (fine <= fascia.chiusura && fine + tRitorno.minuti <= fineFinestra) {
        return { attivita: a, inizio, fine, andata: tAndata, ritorno: tRitorno };
      }
    }
    return null;
  };
  const collocate = candidate.flatMap((a) => {
    const c = colloca(a);
    return c ? [c] : [];
  });

  // R-SOS-4: stessa categoria, poi meno spostamento, poi inizio più vicino all'originale, poi id.
  const inizioX = minuti(x.inizio);
  const stessa = (c: Collocata): number => (c.attivita.categoria === attivitaX.categoria ? 0 : 1);
  const viaggioTot = (c: Collocata): number => c.andata.minuti + c.ritorno.minuti;
  const distanza = (c: Collocata): number => Math.abs(c.inizio - inizioX);
  collocate.sort(
    (a, b) =>
      stessa(a) - stessa(b) ||
      viaggioTot(a) - viaggioTot(b) ||
      distanza(a) - distanza(b) ||
      confronta(a.attivita.id, b.attivita.id),
  );

  const finestra =
    `tra le ${orario(inizioFinestra)} e le ${orario(fineFinestra)}, partendo da «${indice.nomeLuogo(ingresso)}»` +
    (uscita !== undefined ? ` e arrivando a «${indice.nomeLuogo(uscita)}»` : "");
  const tipoCandidate = imprevisto.tipo === "METEO_AVVERSO" ? "attività al coperto" : "attività in un altro luogo";
  const descriviCollocata = (c: Collocata): string =>
    `«${c.attivita.nome}» (${orario(c.inizio)}–${orario(c.fine)}, spostamenti ${c.andata.minuti} + ${c.ritorno.minuti} minuti)`;

  const scelta = collocate[0];
  if (scelta) {
    applicaSostituta(lavoro, {
      data,
      elementi,
      x,
      andata,
      ritorno,
      ingresso,
      uscita,
      scelta,
      motivoX,
    });
    const ragione = ragioneScelta(scelta, collocate[1], attivitaX);
    lavoro.note.push(
      `Per sostituire ${nomeX} si cercano ${tipoCandidate} in zona ${indice.nomeZona(zona ?? "")} ${finestra}. ` +
        `Candidate: ${elenca(collocate.map(descriviCollocata))}. Scelta «${scelta.attivita.nome}»: ${ragione}.`,
    );
    return;
  }

  // R-SOS-5: nessuna candidata collocabile, l'attività viene rimossa.
  const perche5 =
    candidate.length === 0
      ? `nessuna attività adatta in zona ${indice.nomeZona(zona ?? "")}` +
        (esclusioni.length > 0 ? ` (${elenca(esclusioni)})` : "")
      : `nessuna delle ${tipoCandidate} in zona ${indice.nomeZona(zona ?? "")} (${elenca(candidate.map((c) => `«${c.nome}»`))}) sta ${finestra}`;
  lavoro.note.push(`Per ${nomeX} non c'è una sostituta: ${perche5}. L'attività viene rimossa.`);
  rimuoviSenzaSostituta(lavoro, { data, elementi, x, andata, ritorno, ingresso, uscita, successivo, motivoX });
}

/** Perché la prima candidata vince sulla seconda, secondo l'ordine di R-SOS-4. */
function ragioneScelta(scelta: Collocata, seconda: Collocata | undefined, attivitaX: AttivitaCatalogo): string {
  const categoria = attivitaX.categoria;
  if (!seconda) {
    return scelta.attivita.categoria === categoria
      ? `è l'unica che sta nella finestra ed è della stessa categoria (${categoria})`
      : "è l'unica che sta nella finestra";
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

interface Contesto {
  data: string;
  elementi: Elemento[];
  x: ElementoAttivita;
  andata: ElementoSpostamento | undefined;
  ritorno: ElementoSpostamento | undefined;
  ingresso: string;
  uscita: string | undefined;
  motivoX: string;
}

/** R-SOS-3, R-SOS-6, R-8: la sostituta prende un id nuovo, gli spostamenti ricalcolati tengono il loro. */
function applicaSostituta(lavoro: Lavoro, c: Contesto & { scelta: Collocata }): void {
  const { indice } = lavoro;
  const { scelta, x } = c;
  const id = `N${lavoro.viaggio.prossimoNumeroId}`;
  lavoro.viaggio.prossimoNumeroId += 1;
  const nuova: ElementoAttivita = {
    id,
    tipo: "attivita",
    inizio: orario(scelta.inizio),
    fine: orario(scelta.fine),
    orarioFisso: false,
    attivitaId: scelta.attivita.id,
    priorita: prioritaDi(x),
  };
  const luogo = scelta.attivita.luogoId;
  const nomeNuova = `${id} «${scelta.attivita.nome}»`;
  lavoro.motivi.set(x.id, `${c.motivoX}: al suo posto ${nomeNuova}`);
  lavoro.motivi.set(
    id,
    `sostituisce ${indice.descrivi(x)}: è ${scelta.attivita.allAperto ? "all'aperto" : "al coperto"}, ` +
      `in zona ${indice.nomeZona(indice.luoghi.get(luogo)?.zonaId ?? "")} e dura ${scelta.attivita.durataTipica} minuti come di consueto`,
  );

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

/** R-SOS-5: rimozione dell'attività e unione dei due spostamenti attorno (regola condivisa in `rimozione.ts`). */
function rimuoviSenzaSostituta(
  lavoro: Lavoro,
  c: Contesto & { successivo: Elemento | undefined },
): void {
  lavoro.motivi.set(c.x.id, `${c.motivoX} e non c'è un'attività adatta per sostituirla`);
  rimuoviAttivitaConSpostamenti(lavoro, c.data, c.elementi, c.x, c);
}
