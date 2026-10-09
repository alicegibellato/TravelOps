/**
 * Testo della demo a terminale (REQ-REPLAN-002 CA-14): per ciascuno degli scenari S1–S8 mostra
 * imprevisto, impatto, modifiche proposte, spiegazione, esito, elementi a rischio e alternative;
 * per S1 anche la versione 2 creata dopo l'accettazione. Legge solo i dati simulati di riferimento.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { creaSorgenteDaFile } from "../context/index.js";
import { applicaProposta, confrontaVersioni, creaStorico, elencaVersioni } from "../history/index.js";
import type { Catalogo, Elemento, Imprevisto, Viaggio } from "../model/index.js";
import { descriviImprevisto, proponiRipianificazione, type PropostaRipianificazione } from "../replanning/index.js";

/** Cartella dei dati di riferimento del pacchetto (`packages/engine/data/reference`). */
export const CARTELLA_DATI_RIFERIMENTO = fileURLToPath(new URL("../../data/reference/", import.meta.url));

/** File di ogni itinerario usato dagli scenari. */
const FILE_ITINERARIO: Readonly<Record<string, string>> = {
  "versione-1": "versione-1.json",
  "V-IRR": "variante-v-irr.json",
  "V-FISSO": "variante-v-fisso.json",
  "V-VOLO": "variante-v-volo.json",
};

/** Accettazione della proposta di S1 nella demo (come REQ-ITIN-002 CA-2). */
export const ACCETTAZIONE_DEMO = { autore: "Alice", momento: { data: "2026-06-13", ora: "07:30" } } as const;

interface ScenarioImprevisto {
  id: string;
  titolo: string;
  itinerario: string;
  imprevisto: Imprevisto;
}

const RIENTRO = "    ";

/** Una riga compatta per un elemento: `D2-E1 08:40–09:00 piedi HOTEL → PONALE` o `N1 10:00–12:00 A-MAG`. */
function compatto(e: Elemento): string {
  const base = `${e.id} ${e.inizio}–${e.fine}`;
  const extra = [e.orarioFisso === true ? "orario fisso" : "", e.prenotazione ? `prenotazione ${e.prenotazione.codice}` : ""]
    .filter((x) => x !== "")
    .join(", ");
  const corpo = e.tipo === "attivita" ? `${base} ${e.attivitaId} (${e.priorita ?? "desiderata"})` : `${base} ${e.mezzo} ${e.da} → ${e.a}`;
  return extra === "" ? corpo : `${corpo} [${extra}]`;
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

/** Il testo completo della demo: scenari S1–S8, nell'ordine dei dati di riferimento. */
export function testoDemo(cartella: string = CARTELLA_DATI_RIFERIMENTO): string {
  const leggi = <T>(file: string): T => JSON.parse(readFileSync(join(cartella, file), "utf8").replace(/^﻿/, "")) as T;
  const catalogo = leggi<Catalogo>("catalogo.json");
  const sorgente = creaSorgenteDaFile(cartella);
  const scenari = leggi<ScenarioImprevisto[]>("scenari-imprevisti.json");

  const righe: string[] = [
    "TravelOps — demo del motore: ripianificazione degli scenari S1–S8 (REQ-REPLAN-002).",
    "Dati simulati di riferimento; nessuna rete; nessuna azione sulle prenotazioni.",
    "",
  ];
  for (const s of scenari) {
    const file = FILE_ITINERARIO[s.itinerario];
    if (!file) throw new Error(`Itinerario sconosciuto nello scenario ${s.id}: ${s.itinerario}`);
    const viaggio = leggi<Viaggio>(file);
    const proposta = proponiRipianificazione(viaggio, 1, catalogo, sorgente, s.imprevisto);
    righe.push(...testoScenario(s, viaggio, catalogo, proposta));
    if (s.id === "S1") righe.push(...testoAccettazione(viaggio, proposta));
    righe.push("");
  }
  righe.push("Gli scenari di modifica richiesta (M1–M6) arriveranno con REQ-EDIT-001.");
  return righe.join("\n");
}
