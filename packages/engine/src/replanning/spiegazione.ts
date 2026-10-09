/**
 * Spiegazione della proposta (REQ-REPLAN-002 R-4, CA-12): cosa cambia (prima → dopo) e perché,
 * citando l'imprevisto, in linguaggio semplice; perché un elemento è a rischio; le alternative.
 * Il testo dipende solo dai dati ricevuti: a parità di input è identico (CA-13).
 */
import type { DifferenzaItinerari, ElementoDatato } from "../history/index.js";
import type { Alternativa, Catalogo, Elemento, Imprevisto, Problema, Viaggio } from "../model/index.js";
import type { ImpattoDettagliato } from "./impatto.js";
import { IndiceCatalogo, confronta, minuti, orariDi, trovaElemento } from "./supporto.js";

/** L'imprevisto in parole semplici, con i nomi di zone e luoghi. */
export function descriviImprevisto(imprevisto: Imprevisto, viaggio: Viaggio, catalogo: Catalogo | IndiceCatalogo): string {
  const indice = catalogo instanceof IndiceCatalogo ? catalogo : new IndiceCatalogo(catalogo);
  const intervallo = (inizio: string, fine: string): string =>
    inizio === "00:00" && fine === "24:00" ? "per tutta la giornata" : `dalle ${inizio} alle ${fine}`;
  switch (imprevisto.tipo) {
    case "METEO_AVVERSO":
      return (
        `meteo avverso: ${imprevisto.condizione} in zona ${indice.nomeZona(imprevisto.zonaId)} ` +
        `il ${imprevisto.data} ${intervallo(imprevisto.inizio, imprevisto.fine)}`
      );
    case "RITARDO": {
      const motivo = imprevisto.motivo.trim();
      return (
        `ritardo di ${imprevisto.minuti === 1 ? "1 minuto" : `${imprevisto.minuti} minuti`} ` +
        `il ${imprevisto.data} alle ${imprevisto.momento}${motivo === "" ? "" : ` (${motivo})`}`
      );
    }
    case "CHIUSURA_LUOGO":
      return (
        `chiusura straordinaria di «${indice.nomeLuogo(imprevisto.luogoId)}» ` +
        `il ${imprevisto.data} ${intervallo(imprevisto.inizio, imprevisto.fine)}`
      );
    case "CANCELLAZIONE_SPOSTAMENTO": {
      const trovato = trovaElemento(viaggio, imprevisto.elementoId);
      return trovato
        ? `cancellazione dello spostamento ${indice.descrivi(trovato.elemento)} del ${trovato.giorno.data} (${orariDi(trovato.elemento)})`
        : `cancellazione dello spostamento ${imprevisto.elementoId}`;
    }
  }
}

export interface DatiSpiegazione {
  imprevisto: Imprevisto;
  /** Il viaggio su cui è costruita la proposta. */
  originale: Viaggio;
  impatto: ImpattoDettagliato;
  differenza: DifferenzaItinerari;
  motivi: ReadonlyMap<string, string>;
  note: readonly string[];
  fattibile: boolean;
  problemi: readonly Problema[];
  /** Elementi a rischio in ordine, ciascuno con i suoi perché. */
  aRischio: readonly { data: string; elemento: Elemento; perche: string[] }[];
  alternative: readonly Alternativa[];
  domande: readonly string[];
}

const primaLettera = (testo: string): string => testo.charAt(0).toUpperCase() + testo.slice(1);
const conPunto = (testo: string): string => (/[.?!]$/.test(testo) ? testo : `${testo}.`);

/** Il testo della spiegazione, una riga per voce. */
export function scriviSpiegazione(dati: DatiSpiegazione, indice: IndiceCatalogo): string {
  const righe: string[] = [];
  righe.push(`Imprevisto: ${conPunto(descriviImprevisto(dati.imprevisto, dati.originale, indice))}`);

  const colpiti = dati.impatto.elementiColpiti.flatMap((c) => {
    const e = trovaElemento(dati.originale, c.elementoId)?.elemento;
    return e ? [`${indice.descrivi(e)} (${orariDi(e)})`] : [];
  });
  righe.push(colpiti.length === 0 ? "Nessun elemento dell'itinerario è colpito." : `Elementi colpiti: ${colpiti.join("; ")}.`);
  for (const nota of dati.note) righe.push(conPunto(nota));

  const voci = vociModifiche(dati, indice);
  if (voci.length === 0) {
    righe.push("Nessuna modifica all'itinerario.");
  } else {
    righe.push("Modifiche proposte:");
    for (const voce of voci) righe.push(`- ${voce}`);
  }

  if (dati.fattibile) {
    righe.push("Esito: la proposta è fattibile.");
  } else {
    righe.push("Esito: la proposta non è fattibile.");
  }
  if (dati.problemi.length > 0) {
    righe.push("Problemi:");
    for (const p of dati.problemi) righe.push(`- ${p.codice} (${p.gravita}): ${p.messaggio}`);
  }

  if (dati.aRischio.length === 0) {
    righe.push("Nessun elemento a rischio.");
  } else {
    righe.push("Elementi a rischio:");
    for (const r of dati.aRischio) {
      righe.push(`- ${indice.descrivi(r.elemento)}, il ${r.data} ${orariDi(r.elemento)}: ${conPunto(r.perche.join("; "))}`);
    }
  }

  if (dati.alternative.length > 0) {
    righe.push("Alternative (link da aprire tu: TravelOps non prenota, non cancella e non modifica nulla):");
    for (const a of dati.alternative) righe.push(`- ${a.etichetta} (${a.elementoId}): ${a.indirizzo}`);
  }

  if (dati.domande.length > 0) {
    righe.push(`Come vuoi procedere? ${dati.domande.map((d) => conPunto(primaLettera(d))).join(" ")}`);
  }
  righe.push("La proposta diventa una nuova versione dell'itinerario solo se la accetti.");
  return righe.join("\n");
}

/** Le modifiche in ordine di data e di orario: rimossi, aggiunti e modificati, ciascuno col suo perché. */
function vociModifiche(dati: DatiSpiegazione, indice: IndiceCatalogo): string[] {
  const motivo = (id: string): string => dati.motivi.get(id) ?? "cambia a causa dell'imprevisto";
  const dettaglio = (v: ElementoDatato): string =>
    v.elemento.tipo === "spostamento"
      ? `${orariDi(v.elemento)} ${indice.tratta(v.elemento.da, v.elemento.a, v.elemento.mezzo)}`
      : orariDi(v.elemento);
  const voci: { data: string; inizio: number; id: string; testo: string }[] = [
    ...dati.differenza.rimossi.map((v) => ({
      data: v.data,
      inizio: minuti(v.elemento.inizio),
      id: v.elemento.id,
      testo: `Rimosso ${indice.descrivi(v.elemento)}, il ${v.data} ${orariDi(v.elemento)}: ${conPunto(motivo(v.elemento.id))}`,
    })),
    ...dati.differenza.aggiunti.map((v) => ({
      data: v.data,
      inizio: minuti(v.elemento.inizio),
      id: v.elemento.id,
      testo: `Aggiunto ${indice.descrivi(v.elemento)}, il ${v.data} ${orariDi(v.elemento)}: ${conPunto(motivo(v.elemento.id))}`,
    })),
    ...dati.differenza.modificati.map((m) => ({
      data: m.prima.data,
      inizio: Math.min(minuti(m.prima.elemento.inizio), minuti(m.dopo.elemento.inizio)),
      id: m.id,
      testo:
        `Modificato ${m.id}, il ${m.dopo.data}: ${dettaglio(m.prima)} → ${dettaglio(m.dopo)}: ` +
        conPunto(motivo(m.id)),
    })),
  ];
  return voci
    .sort((a, b) => confronta(a.data, b.data) || a.inizio - b.inizio || confronta(a.id, b.id))
    .map((v) => v.testo);
}
