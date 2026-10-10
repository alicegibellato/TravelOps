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
    for (const p of dati.problemi) righe.push(`- ${p.gravita === "bloccante" ? "Bloccante" : "Avviso"}: ${p.messaggio}`);
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
      righe.push(`- ${a.etichetta}: ${a.indirizzo}`);
    }
  }

  const informativa = eNotaInformativa(dati.imprevisto, dati.differenza);
  if (dati.domande.length > 0 && !informativa) {
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
  righe.push(
    informativa
      ? "È solo un'informazione: non c'è nessuna modifica da accettare e l'itinerario resta com'è."
      : "La proposta diventa una nuova versione dell'itinerario solo se la accetti.",
  );
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
        `Modificato ${indice.descrivi(m.dopo.elemento)}, il ${m.dopo.data}: ${dettaglio(m.prima)} → ${dettaglio(m.dopo)}: ` +
        conPunto(motivo(m.id)),
    })),
  ];
  return voci
    .sort((a, b) => confronta(a.data, b.data) || a.inizio - b.inizio || confronta(a.id, b.id))
    .map((v) => v.testo);
}

/** Gli imprevisti che, se non cambiano nulla, sono solo da sapere (ST-UX-004A CA-5; TB-IMPR-008, ST-QA-FIX-013). */
const SOLO_INFORMATIVI_SE_NULLA_CAMBIA: ReadonlySet<string> = new Set(["RITARDO", "SCIOPERO", "BAGAGLIO_SMARRITO", "DOCUMENTI_SMARRITI"]);

/**
 * Quando una proposta è solo una nota informativa: un ritardo, uno sciopero, un bagaglio o dei documenti persi che non
 * cambiano nessun elemento del viaggio. Uno sciopero che colpisce uno spostamento resta una proposta.
 */
export function eNotaInformativa(imprevisto: ImprevistoEsteso, differenza: DifferenzaItinerari): boolean {
  return (
    SOLO_INFORMATIVI_SE_NULLA_CAMBIA.has(imprevisto.tipo) &&
    differenza.aggiunti.length === 0 &&
    differenza.rimossi.length === 0 &&
    differenza.modificati.length === 0
  );
}

/**
 * Il riepilogo in evidenza (ST-UX-004A CA-4): al massimo tre frasi, nei termini del viaggiatore, senza codici. Il
 * resto della spiegazione (`scriviSpiegazione`) sta nei dettagli espandibili.
 */
export function scriviRiepilogo(dati: DatiSpiegazione, indice: IndiceCatalogo): string {
  // Gli identificativi degli elementi ("D3-E1 ") non servono a chi legge: restano i nomi.
  const senzaId = (testo: string): string => testo.replace(/\b(?:D\d+-E\d+|N\d+) /g, "");
  const frasi: string[] = [conPunto(primaLettera(senzaId(descriviImprevisto(dati.imprevisto, dati.originale, indice))))];
  // Solo i nomi delle attività, senza gli identificativi interni.
  const nome = (e: Elemento): string => (e.tipo === "attivita" ? `«${indice.attivita.get(e.attivitaId)?.nome ?? e.attivitaId}»` : "");
  const nomi = (elementi: readonly ElementoDatato[]): string[] =>
    elementi.filter((v) => v.elemento.tipo === "attivita").map((v) => nome(v.elemento));
  const tolte = nomi(dati.differenza.rimossi);
  const nuove = nomi(dati.differenza.aggiunti);
  const spostate = dati.differenza.modificati.filter((m) => m.dopo.elemento.tipo === "attivita").map((m) => nome(m.dopo.elemento));

  if (eNotaInformativa(dati.imprevisto, dati.differenza)) {
    frasi.push("Nessuna attività cambia: non c'è nessuna modifica da accettare.");
    return frasi.join(" ");
  }
  const azioni = [
    ...(tolte.length > 0 ? [`toglie ${elenca(tolte)}`] : []),
    ...(nuove.length > 0 ? [`aggiunge ${elenca(nuove)}`] : []),
    ...(spostate.length > 0 ? [`sposta gli orari di ${elenca(spostate)}`] : []),
  ];
  frasi.push(
    azioni.length > 0
      ? conPunto(primaLettera(`la proposta ${azioni.join(", ")}`))
      : dati.differenza.modificati.length + dati.differenza.rimossi.length + dati.differenza.aggiunti.length === 0
        ? "Nessuna modifica all'itinerario."
        : "La proposta cambia solo gli spostamenti.",
  );
  frasi.push(
    dati.fattibile
      ? "È fattibile e diventa una nuova versione solo se la accetti."
      : "Così com'è non è fattibile: guarda i dettagli prima di decidere.",
  );
  return frasi.join(" ");
}
