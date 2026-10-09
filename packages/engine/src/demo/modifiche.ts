/**
 * Testo della demo per le modifiche richieste (REQ-EDIT-001 CA-11): per ciascuno degli scenari M1–M6 mostra
 * la richiesta, le modifiche proposte, la spiegazione, l'esito con i problemi e gli elementi a rischio; per M1
 * anche la versione 2 creata dopo l'accettazione (CA-8). Chiude con gli errori di CA-7, che non producono
 * proposte. Legge solo i dati simulati di riferimento.
 */
import { creaSorgenteDaFile } from "../context/index.js";
import { proponiModifica, type PropostaModifica } from "../editing/index.js";
import { applicaProposta, creaStorico, descriviModifica, elencaVersioni } from "../history/index.js";
import type { Catalogo, ModificaRichiesta, Viaggio } from "../model/index.js";
import {
  ACCETTAZIONE_DEMO,
  CARTELLA_DATI_RIFERIMENTO,
  RIENTRO,
  compatto,
  leggiItinerario,
  lettore,
} from "./comune.js";

interface ScenarioModifica {
  id: string;
  titolo: string;
  itinerario: string;
  modifica: ModificaRichiesta;
}

/** Le richieste che non producono una proposta (REQ-EDIT-001 CA-7), con l'itinerario su cui si fanno. */
export const RICHIESTE_CON_ERRORE: readonly { itinerario: string; modifica: ModificaRichiesta }[] = [
  { itinerario: "versione-1", modifica: { operazione: "rimuovi", elementoId: "D2-E3" } },
  { itinerario: "versione-1", modifica: { operazione: "aggiungi", data: "2026-06-13", attivitaId: "A-MAG", inizio: "11:00" } },
  { itinerario: "versione-1", modifica: { operazione: "aggiungi", data: "2026-06-15", attivitaId: "A-MAG", inizio: "10:00" } },
  { itinerario: "V-FISSO", modifica: { operazione: "rimuovi", elementoId: "D2-E4" } },
  { itinerario: "versione-1", modifica: { operazione: "aggiungi", data: "2026-06-13", attivitaId: "A-INESISTENTE", inizio: "16:00" } },
  { itinerario: "versione-1", modifica: { operazione: "rimuovi", elementoId: "X-99" } },
  { itinerario: "versione-1", modifica: { operazione: "aggiungi", data: "2026-06-12", attivitaId: "A-LUNGOLAGO", inizio: "23:00" } },
];

/** Il testo di uno scenario di modifica. */
function testoScenario(s: ScenarioModifica, p: PropostaModifica): string[] {
  const righe: string[] = [];
  righe.push(`--- ${s.id} — ${s.titolo} (itinerario ${s.itinerario}) ---`);
  righe.push(`Modifica richiesta: ${p.origine.descrizione}`);

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
  return righe;
}

/** Accettazione della proposta di uno scenario: la versione creata, con la causa, e l'elenco delle versioni. */
function testoAccettazione(s: ScenarioModifica, viaggio: Viaggio, proposta: PropostaModifica): string[] {
  const righe: string[] = [`Accettazione della proposta di ${s.id}:`];
  const creato = creaStorico(viaggio);
  if (!creato.ok) return [...righe, `${RIENTRO}${creato.errore.messaggio}`];
  const esito = applicaProposta(creato.storico, proposta, ACCETTAZIONE_DEMO.autore, ACCETTAZIONE_DEMO.momento);
  if (esito.esito !== "versione_creata") {
    const segnalazione = esito.esito === "avviso" ? esito.avviso : esito.errore;
    return [...righe, `${RIENTRO}${segnalazione.messaggio}`];
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
  return righe;
}

/** Il testo delle modifiche richieste: scenari M1–M6 nell'ordine dei dati di riferimento, poi gli errori di CA-7. */
export function testoModifiche(cartella: string = CARTELLA_DATI_RIFERIMENTO): string {
  const leggi = lettore(cartella);
  const catalogo = leggi<Catalogo>("catalogo.json");
  const sorgente = creaSorgenteDaFile(cartella);
  const scenari = leggi<ScenarioModifica[]>("scenari-modifiche.json");

  const righe: string[] = [
    "Modifiche richieste dal viaggiatore: scenari M1–M6 (REQ-EDIT-001).",
    "",
  ];
  for (const s of scenari) {
    const viaggio = leggiItinerario(leggi, s.itinerario, s.id);
    const esito = proponiModifica(viaggio, 1, catalogo, sorgente, s.modifica);
    if (!esito.ok) {
      righe.push(`--- ${s.id} — ${s.titolo} (itinerario ${s.itinerario}) ---`, `Errore: ${esito.errore.messaggio}`, "");
      continue;
    }
    righe.push(...testoScenario(s, esito.proposta));
    if (s.id === "M1") righe.push(...testoAccettazione(s, viaggio, esito.proposta));
    righe.push("");
  }

  righe.push("--- Richieste che non producono una proposta (REQ-EDIT-001 CA-7) ---");
  for (const r of RICHIESTE_CON_ERRORE) {
    const viaggio = leggiItinerario(leggi, r.itinerario, "CA-7");
    const esito = proponiModifica(viaggio, 1, catalogo, sorgente, r.modifica);
    const richiesta = descriviModifica(r.modifica, viaggio);
    righe.push(
      esito.ok
        ? `${RIENTRO}${richiesta} (${r.itinerario}): nessun errore, proposta ${esito.proposta.fattibile ? "fattibile" : "non fattibile"}`
        : `${RIENTRO}${richiesta} (${r.itinerario}): ${esito.errore.messaggio}`,
    );
  }
  return righe.join("\n");
}
