/**
 * Testo della demo a terminale (REQ-REPLAN-002 CA-14): per ciascuno degli scenari S1–S8 mostra
 * imprevisto, impatto, modifiche proposte, spiegazione, esito, elementi a rischio e alternative;
 * per S1 anche la versione 2 creata dopo l'accettazione. Dopo gli imprevisti aggiunge le modifiche richieste
 * M1–M6 (REQ-EDIT-001 CA-11, `modifiche.ts`). Legge solo i dati simulati di riferimento.
 */
import { creaSorgenteDaFile } from "../context/index.js";
import { applicaProposta, confrontaVersioni, creaStorico, elencaVersioni } from "../history/index.js";
import type { Catalogo, Imprevisto, Viaggio } from "../model/index.js";
import { descriviImprevisto, proponiRipianificazione, type PropostaRipianificazione } from "../replanning/index.js";
import {
  ACCETTAZIONE_DEMO,
  CARTELLA_DATI_RIFERIMENTO,
  RIENTRO,
  compatto,
  leggiItinerario,
  lettore,
} from "./comune.js";
import { testoModifiche } from "./modifiche.js";

export { ACCETTAZIONE_DEMO, CARTELLA_DATI_RIFERIMENTO } from "./comune.js";

interface ScenarioImprevisto {
  id: string;
  titolo: string;
  itinerario: string;
  imprevisto: Imprevisto;
}

/** Il testo di uno scenario. */
function testoScenario(s: ScenarioImprevisto, viaggio: Viaggio, catalogo: Catalogo, p: PropostaRipianificazione): string[] {
  const righe: string[] = [];
  righe.push(`=== ${s.id} — ${s.titolo} (itinerario ${s.itinerario}) ===`);
  righe.push(`Imprevisto: ${descriviImprevisto(s.imprevisto, viaggio, catalogo)}`);

  righe.push("Impatto:");
  if (p.impatto.elementiColpiti.length === 0) righe.push(`${RIENTRO}nessun elemento colpito`);
  for (const c of p.impatto.elementiColpiti) righe.push(`${RIENTRO}${c.elementoId}: ${c.motivo}`);

  const { aggiunti, rimossi, modificati } = p.modifiche;
  righe.push("Modifiche proposte:");
  if (aggiunti.length + rimossi.length + modificati.length === 0) righe.push(`${RIENTRO}nessuna: l'itinerario resta com'è`);
  for (const e of rimossi) righe.push(`${RIENTRO}- rimosso    ${compatto(e)}`);
  for (const e of aggiunti) righe.push(`${RIENTRO}+ aggiunto   ${compatto(e)}`);
  for (const m of modificati) righe.push(`${RIENTRO}~ modificato ${compatto(m.prima)}  =>  ${compatto(m.dopo)}`);

  righe.push("Spiegazione:");
  for (const riga of p.spiegazione.split("\n")) righe.push(`${RIENTRO}${riga}`);

  righe.push(`Esito: ${p.fattibile ? "fattibile" : "non fattibile"}`);
  if (p.problemi.length > 0) {
    righe.push("Problemi:");
    for (const pr of p.problemi) righe.push(`${RIENTRO}${pr.codice} (${pr.gravita}) su ${pr.elementi.join(", ")}`);
  }
  righe.push(`Elementi a rischio: ${p.elementiARischio.length === 0 ? "nessuno" : p.elementiARischio.join(", ")}`);
  righe.push("Alternative:");
  if (p.alternative.length === 0) righe.push(`${RIENTRO}nessuna`);
  for (const a of p.alternative) righe.push(`${RIENTRO}[${a.tipo}] ${a.elementoId}: ${a.etichetta} -> ${a.indirizzo}`);
  return righe;
}

/** Accettazione della proposta di S1: crea la versione 2 e la confronta con la 1. */
function testoAccettazione(viaggio: Viaggio, proposta: PropostaRipianificazione): string[] {
  const righe: string[] = ["Accettazione della proposta di S1:"];
  const creato = creaStorico(viaggio);
  if (!creato.ok) return [...righe, `${RIENTRO}${creato.errore.messaggio}`];
  const esito = applicaProposta(creato.storico, proposta, ACCETTAZIONE_DEMO.autore, ACCETTAZIONE_DEMO.momento);
  if (esito.esito !== "versione_creata") {
    const s = esito.esito === "avviso" ? esito.avviso : esito.errore;
    return [...righe, `${RIENTRO}${s.messaggio}`];
  }
  const v = esito.versione;
  righe.push(
    `${RIENTRO}Creata la versione ${v.numero}: causa "${v.causa}", accettata da ${v.autore ?? "?"} ` +
      `il ${v.momento?.data ?? "?"} alle ${v.momento?.ora ?? "?"}; prossimo numero per gli id nuovi: ${v.viaggio.prossimoNumeroId}.`,
  );
  righe.push(`${RIENTRO}Versioni:`);
  for (const voce of elencaVersioni(esito.storico)) {
    const quando = voce.momento ? ` (${voce.momento.data} ${voce.momento.ora}, ${voce.autore ?? "?"})` : "";
    righe.push(`${RIENTRO}  ${voce.numero}. ${voce.causa}${quando}`);
  }
  const confronto = confrontaVersioni(esito.storico, 1, v.numero);
  if (confronto.ok) {
    const c = confronto.confronto;
    righe.push(`${RIENTRO}Confronto 1 -> ${v.numero}:`);
    for (const r of c.rimossi) righe.push(`${RIENTRO}  - rimosso    ${compatto(r.elemento)}`);
    for (const a of c.aggiunti) righe.push(`${RIENTRO}  + aggiunto   ${compatto(a.elemento)}`);
    for (const m of c.modificati) righe.push(`${RIENTRO}  ~ modificato ${m.id}: ${m.campi.map((x) => x.campo).join(", ")}`);
  }
  righe.push(`${RIENTRO}Giorno ${v.viaggio.giorni[1]?.data ?? ""} nella versione ${v.numero}:`);
  for (const e of v.viaggio.giorni[1]?.elementi ?? []) righe.push(`${RIENTRO}  ${compatto(e)}`);
  return righe;
}

/** Il testo completo della demo: scenari S1–S8, nell'ordine dei dati di riferimento, poi le modifiche richieste M1–M6. */
export function testoDemo(cartella: string = CARTELLA_DATI_RIFERIMENTO): string {
  const leggi = lettore(cartella);
  const catalogo = leggi<Catalogo>("catalogo.json");
  const sorgente = creaSorgenteDaFile(cartella);
  const scenari = leggi<ScenarioImprevisto[]>("scenari-imprevisti.json");

  const righe: string[] = [
    "TravelOps — demo del motore: ripianificazione degli scenari S1–S8 (REQ-REPLAN-002) e modifiche richieste M1–M6 (REQ-EDIT-001).",
    "Dati simulati di riferimento; nessuna rete; nessuna azione sulle prenotazioni.",
    "",
  ];
  for (const s of scenari) {
    const viaggio = leggiItinerario(leggi, s.itinerario, s.id);
    const proposta = proponiRipianificazione(viaggio, 1, catalogo, sorgente, s.imprevisto);
    righe.push(...testoScenario(s, viaggio, catalogo, proposta));
    if (s.id === "S1") righe.push(...testoAccettazione(viaggio, proposta));
    righe.push("");
  }
  righe.push(testoModifiche(cartella));
  return righe.join("\n");
}
