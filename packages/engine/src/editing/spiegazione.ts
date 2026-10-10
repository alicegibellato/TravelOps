/**
 * Spiegazione di una proposta nata da una modifica richiesta (REQ-EDIT-001 R-ED-7, come R-4 di REQ-REPLAN-002;
 * CA-9): la richiesta, ogni elemento cambiato con l'orario prima e dopo e il perché, l'esito con i problemi,
 * gli elementi a rischio e le eventuali alternative. Il testo dipende solo dai dati ricevuti: a parità di input
 * è identico.
 */
import type { DifferenzaItinerari, ElementoDatato } from "../history/index.js";
import type {
  Alternativa,
  Elemento,
  LivelloRipianificazione,
  ModificaOndata2,
  ModificaRichiesta,
  Problema,
  Viaggio,
} from "../model/index.js";
import { IndiceCatalogo, confronta, minuti, minutiTesto, orariDi, prioritaDi, trovaElemento } from "../replanning/supporto.js";
import { giorniTesto, piuGiorni } from "./date.js";

export interface DatiSpiegazioneModifica {
  modifica: ModificaRichiesta | ModificaOndata2;
  /** Livello di ripianificazione (§7.6): solo per le modifiche di REQ-EDIT-002, così il testo di M1…M6 non cambia. */
  livello?: LivelloRipianificazione;
  /** Descrizione della modifica, la stessa della causa della versione. */
  descrizione: string;
  /** Il viaggio su cui è costruita la proposta. */
  originale: Viaggio;
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

/** Il livello di ripianificazione in parole semplici, come nella web app. */
export const TESTI_LIVELLO: Readonly<Record<LivelloRipianificazione, string>> = {
  minimo: "cambia solo il necessario",
  giornata: "rifà la giornata",
  resto: "rivede il resto del viaggio",
};

const primaLettera = (testo: string): string => testo.charAt(0).toUpperCase() + testo.slice(1);
const conPunto = (testo: string): string => (/[.?!]$/.test(testo) ? testo : `${testo}.`);

/** Il testo della spiegazione, una riga per voce. */
export function scriviSpiegazioneModifica(dati: DatiSpiegazioneModifica, indice: IndiceCatalogo): string {
  const righe: string[] = [];
  righe.push(`Richiesta del viaggiatore: ${conPunto(dati.descrizione)}`);
  righe.push(conPunto(dettaglioRichiesta(dati.modifica, dati.originale, indice)));
  if (dati.livello !== undefined) righe.push(`Livello di ripianificazione: ${TESTI_LIVELLO[dati.livello]}.`);
  for (const nota of dati.note) righe.push(conPunto(nota));

  const voci = vociModifiche(dati, indice);
  if (voci.length === 0) {
    righe.push("Nessuna modifica all'itinerario: è già come richiesto.");
  } else {
    righe.push("Modifiche proposte:");
    for (const voce of voci) righe.push(`- ${voce}`);
  }

  righe.push(
    dati.fattibile
      ? "Esito: la proposta è fattibile."
      : "Esito: la proposta non è fattibile. TravelOps non sposta altri elementi per far posto alla modifica: decidi tu.",
  );
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

/** La richiesta con i nomi di attività e luoghi. */
function dettaglioRichiesta(modifica: ModificaRichiesta | ModificaOndata2, originale: Viaggio, indice: IndiceCatalogo): string {
  switch (modifica.operazione) {
    case "prolunga":
      return `Il viaggio dura ${giorniTesto(modifica.giorni)} in più: dal ${originale.dataInizio} al ${piuGiorni(originale.dataFine, modifica.giorni)} invece che al ${originale.dataFine}`;
    case "accorcia":
      return `Il viaggio dura ${giorniTesto(modifica.giorni)} in meno: finisce ${giorniTesto(modifica.giorni)} prima del ${originale.dataFine}`;
    case "cambia_ritmo":
      return modifica.ritmo === "piu_leggero"
        ? `Giornata del ${modifica.data} più leggera: un'attività in meno`
        : `Giornata del ${modifica.data} più piena: un'attività in più`;
    case "rigenera_giorno":
      return `Giornata del ${modifica.data} ricostruita: restano gli elementi a orario fisso, le attività irrinunciabili e le prenotazioni`;
    default:
      return dettaglioModificaElemento(modifica, originale, indice);
  }
}

/** La richiesta di una modifica di REQ-EDIT-001 (testo invariato). */
function dettaglioModificaElemento(modifica: ModificaRichiesta, originale: Viaggio, indice: IndiceCatalogo): string {
  if (modifica.operazione === "aggiungi") {
    const attivita = indice.attivita.get(modifica.attivitaId);
    return attivita
      ? `Attività richiesta: «${attivita.nome}» a «${indice.nomeLuogo(attivita.luogoId)}», ` +
          `durata tipica ${minutiTesto(attivita.durataTipica)}, priorità ${modifica.priorita ?? "desiderata (valore predefinito)"}`
      : `Attività richiesta: ${modifica.attivitaId}`;
  }
  const trovato = trovaElemento(originale, modifica.elementoId);
  if (!trovato) return `Elemento interessato: ${modifica.elementoId}`;
  const { giorno, elemento } = trovato;
  const stato =
    elemento.tipo === "attivita"
      ? `, priorità ${prioritaDi(elemento)}${elemento.orarioFisso === true ? ", a orario fisso" : ""}`
      : elemento.orarioFisso === true
        ? ", a orario fisso"
        : "";
  return `Elemento interessato: ${indice.descrivi(elemento)}, il ${giorno.data} ${orariDi(elemento)}${stato}`;
}

/** Le modifiche in ordine di data e di orario: rimossi, aggiunti e modificati, con prima → dopo e il perché. */
function vociModifiche(dati: DatiSpiegazioneModifica, indice: IndiceCatalogo): string[] {
  const motivo = (id: string): string => dati.motivi.get(id) ?? "cambia per la modifica richiesta";
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
      data: m.dopo.data,
      inizio: minuti(m.dopo.elemento.inizio),
      id: m.id,
      testo:
        `Modificato ${m.prima.elemento.tipo === "attivita" ? indice.descrivi(m.prima.elemento) : m.id}: ${dettaglio(m.prima, m.dopo, indice)} → ` +
        `${dettaglio(m.dopo, m.prima, indice)}: ${conPunto(motivo(m.id))}`,
    })),
  ];
  return voci
    .sort((a, b) => confronta(a.data, b.data) || a.inizio - b.inizio || confronta(a.id, b.id))
    .map((v) => v.testo);
}

/**
 * Data e orario di una versione dell'elemento, con la tratta per gli spostamenti; priorità e orario fisso
 * compaiono solo se sono diversi nell'`altra` versione.
 */
function dettaglio(v: ElementoDatato, altra: ElementoDatato, indice: IndiceCatalogo): string {
  const e = v.elemento;
  const parti = [`il ${v.data} ${orariDi(e)}`];
  if (e.tipo === "spostamento") parti.push(indice.tratta(e.da, e.a, e.mezzo));
  if (e.tipo === "attivita" && altra.elemento.tipo === "attivita" && prioritaDi(e) !== prioritaDi(altra.elemento)) {
    parti.push(`priorità ${prioritaDi(e)}`);
  }
  if ((e.orarioFisso === true) !== (altra.elemento.orarioFisso === true)) {
    parti.push(e.orarioFisso === true ? "a orario fisso" : "non a orario fisso");
  }
  return parti.join(", ");
}
