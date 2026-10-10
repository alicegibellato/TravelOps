/**
 * Spiegazione della proposta (REQ-REPLAN-002 R-4, CA-12): cosa cambia (prima → dopo) e perché,
 * citando l'imprevisto, in linguaggio semplice; perché un elemento è a rischio; le alternative.
 * Il testo dipende solo dai dati ricevuti: a parità di input è identico (CA-13).
 */
import type { DifferenzaItinerari, ElementoDatato } from "../history/index.js";
import type { AlternativaEstesa, Catalogo, CatalogoEsteso, Elemento, ImprevistoEsteso, Problema, Viaggio } from "../model/index.js";
import type { ImpattoDettagliato } from "./impatto.js";
import { IndiceCatalogo, confronta, elenca, minuti, orariDi, trovaElemento } from "./supporto.js";

/** L'imprevisto in parole semplici, con i nomi di zone e luoghi (anche gli imprevisti della §7.4). */
export function descriviImprevisto(
  imprevisto: ImprevistoEsteso,
  viaggio: Viaggio,
  catalogo: Catalogo | CatalogoEsteso | IndiceCatalogo,
): string {
  // Il catalogo esteso si legge come un catalogo: qui servono solo i nomi di zone, luoghi e attività.
  const indice = catalogo instanceof IndiceCatalogo ? catalogo : new IndiceCatalogo(catalogo as Catalogo);
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
    case "VOLO_PERSO": {
      const trovato = trovaElemento(viaggio, imprevisto.elementoId);
      const cosa = trovato
        ? `${indice.descrivi(trovato.elemento)} del ${trovato.giorno.data} (${orariDi(trovato.elemento)})`
        : imprevisto.elementoId;
      const arrivo = imprevisto.arrivoPrevisto;
      return (
        `volo o treno perso: ${cosa}` +
        (arrivo ? `, arrivo previsto con il nuovo mezzo il ${arrivo.data} alle ${arrivo.orario}` : ", nessun arrivo previsto indicato")
      );
    }
    case "SALUTE": {
      const descrizione = imprevisto.descrizione.trim();
      const periodo =
        imprevisto.giorni === undefined
          ? `dal ${imprevisto.dataInizio} fino alla fine del viaggio`
          : `dal ${imprevisto.dataInizio} per ${imprevisto.giorni === 1 ? "1 giorno" : `${imprevisto.giorni} giorni`}`;
      const limite =
        imprevisto.intensitaMassima === "nessuna" ? "serve riposo" : `intensità massima ${imprevisto.intensitaMassima}`;
      return (
        `salute${descrizione === "" ? "" : ` (${descrizione})`} ${periodo}: ${limite}` +
        (imprevisto.mobilitaRidotta ? ", mobilità ridotta" : "")
      );
    }
    case "SCIOPERO":
      return (
        `sciopero ${imprevisto.mezzo === "treno" ? "dei treni" : "dei mezzi pubblici"} il ${imprevisto.data}` +
        (imprevisto.zonaId === undefined ? "" : ` in zona ${indice.nomeZona(imprevisto.zonaId)}`)
      );
    case "BAGAGLIO_SMARRITO":
      return `bagaglio smarrito il ${imprevisto.data} alle ${imprevisto.momento}`;
    case "DOCUMENTI_SMARRITI":
      return `documenti smarriti o rubati il ${imprevisto.data} alle ${imprevisto.momento}`;
    case "STANCHEZZA":
      return `stanchezza il ${imprevisto.data}`;
  }
}

export interface DatiSpiegazione {
  imprevisto: ImprevistoEsteso;
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
  alternative: readonly AlternativaEstesa[];
  domande: readonly string[];
  /** Le giornate per cui offrire "Rigenera questa giornata" quando il livello minimo non è fattibile (R2-LIV). */
  giornateDaRigenerare?: readonly string[];
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
    for (const a of dati.alternative) {
      righe.push(`- ${a.etichetta}${a.elementoId === undefined ? "" : ` (${a.elementoId})`}: ${a.indirizzo}`);
    }
  }

  if (dati.domande.length > 0) {
    righe.push(`Come vuoi procedere? ${dati.domande.map((d) => conPunto(primaLettera(d))).join(" ")}`);
  }
  // R2-LIV: il livello minimo non è fattibile, si offre di rigenerare la giornata (§7.6).
  const giornate = dati.giornateDaRigenerare ?? [];
  if (!dati.fattibile && giornate.length > 0) {
    righe.push(
      `Il livello minimo di ripianificazione non basta: puoi chiedere «Rigenera questa giornata» per il ${elenca([...giornate])}. ` +
        "Ricostruisco solo quella giornata, mantenendo gli elementi a orario fisso, gli irrinunciabili e le prenotazioni.",
    );
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
