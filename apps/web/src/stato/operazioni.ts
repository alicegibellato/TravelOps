/**
 * Le operazioni della pagina Demo sullo stato locale (REQ-WEB-002): avviare uno scenario, impostare l'orologio
 * simulato, accettare o rifiutare una proposta, ripristinare l'itinerario di partenza.
 *
 * Nessuna regola di ripianificazione, fattibilità o versioni qui (CA-9): la proposta la costruisce
 * `proponiRipianificazione`, la versione la crea (o la rifiuta) `applicaProposta`, il rifiuto è `rifiutaProposta`.
 * Queste funzioni leggono lo stato dalla base dati (REQ-DATA-001), chiamano il motore e salvano il risultato. Le azioni di Next.js
 * (`app/demo/azioni.ts`) le chiamano con la cartella dei dati.
 */
import { applicaProposta, proponiRipianificazione, rifiutaProposta, versioneCorrente } from "@travelops/engine";
import { catalogoDiRiferimento, sorgenteDiRiferimento, trovaScenario } from "../dati/scenari";
import { leggiStato, salvaStato } from "./archivio";
import { usaBaseDati } from "./avvio";
import { formatoMomento, statoIniziale, type EsitoAzione, type PropostaSalvata, type StatoDemo } from "./stato";
import { ricaricaViaggiDemo } from "./viaggi-demo";

export type EsitoOperazione<T = object> = ({ ok: true; stato: StatoDemo } & T) | { ok: false; messaggio: string };

function statoValido(cartella: string): EsitoOperazione {
  const letto = leggiStato(cartella);
  if (!letto.ok) return { ok: false, messaggio: `Lo stato salvato non è valido (${letto.motivo}): usa "Ripristina".` };
  return { ok: true, stato: letto.stato };
}

/**
 * Avvia uno scenario: carica il suo itinerario di partenza (versione 1 o variante) come versione 1 di un nuovo
 * storico e chiede al motore la proposta per il suo imprevisto, costruita sulla versione corrente.
 * L'orologio simulato resta quello impostato; le proposte precedenti sono scartate.
 */
export function avviaScenario(cartella: string, idScenario: string): EsitoOperazione<{ proposta: PropostaSalvata }> {
  const scenario = trovaScenario(idScenario);
  if (scenario === null) return { ok: false, messaggio: `Scenario sconosciuto: ${idScenario}` };
  const letto = leggiStato(cartella);
  const precedente = letto.ok ? letto.stato : null;
  const stato = statoIniziale(scenario.chiaveViaggio, scenario.id, precedente?.orologio, precedente?.prossimaProposta);
  const corrente = versioneCorrente(stato.storico);
  const proposta: PropostaSalvata = {
    id: stato.prossimaProposta,
    scenario: scenario.id,
    proposta: proponiRipianificazione(corrente.viaggio, corrente.numero, catalogoDiRiferimento(), sorgenteDiRiferimento(), scenario.imprevisto),
    decisione: null,
    ultimoEsito: null,
  };
  const nuovo: StatoDemo = { ...stato, proposte: [proposta], prossimaProposta: proposta.id + 1 };
  salvaStato(cartella, nuovo);
  return { ok: true, stato: nuovo, proposta };
}

/** Imposta l'orologio simulato: data `AAAA-MM-GG` e ora `HH:mm`. */
export function impostaOrologio(cartella: string, data: string, ora: string): EsitoOperazione {
  const momento = { data: data.trim(), ora: ora.trim() };
  if (!formatoMomento(momento)) return { ok: false, messaggio: "Indica la data come AAAA-MM-GG e l'ora come HH:mm." };
  const letto = statoValido(cartella);
  if (!letto.ok) return letto;
  const stato: StatoDemo = { ...letto.stato, orologio: momento };
  salvaStato(cartella, stato);
  return { ok: true, stato };
}

/** La proposta salvata con quell'id, oppure `null`. */
export function trovaProposta(stato: StatoDemo, id: number): PropostaSalvata | null {
  return stato.proposte.find((p) => p.id === id) ?? null;
}

function aggiornaProposta(stato: StatoDemo, aggiornata: PropostaSalvata): StatoDemo {
  return { ...stato, proposte: stato.proposte.map((p) => (p.id === aggiornata.id ? aggiornata : p)) };
}

const MESSAGGIO_SOLO_INFORMAZIONE = "È solo un'informazione: non c'è nessuna modifica da accettare.";
const PROPOSTA_NON_DISPONIBILE = "La proposta non è più disponibile: avvia di nuovo lo scenario dalla pagina Demo.";

/**
 * Accetta una proposta a nome di `nome`, con il momento dell'orologio simulato. Decide il motore
 * (`applicaProposta`): nuova versione, avviso `NESSUNA_MODIFICA`, oppure errore (per esempio `PROPOSTA_SUPERATA`,
 * se la proposta è costruita su una versione che non è più la corrente). Senza nuova versione lo storico non cambia.
 */
export function accettaProposta(cartella: string, idProposta: number, nome: string): EsitoOperazione<{ esito: EsitoAzione }> {
  const letto = statoValido(cartella);
  if (!letto.ok) return letto;
  const stato = letto.stato;
  const salvata = trovaProposta(stato, idProposta);
  if (salvata === null) return { ok: false, messaggio: PROPOSTA_NON_DISPONIBILE };
  if (salvata.proposta.informativa === true) return { ok: false, messaggio: MESSAGGIO_SOLO_INFORMAZIONE };

  // Lo storico salvato è sempre quello restituito dal motore: se non nasce una versione, è quello di prima.
  const risultato = applicaProposta(stato.storico, salvata.proposta, nome, stato.orologio);
  let esito: EsitoAzione;
  let decisione = salvata.decisione;
  switch (risultato.esito) {
    case "versione_creata": {
      const { versione } = risultato;
      const autore = versione.autore ?? nome;
      decisione = { tipo: "accettata", versione: versione.numero, autore, momento: stato.orologio };
      esito = {
        livello: "successo",
        messaggio: `Proposta accettata da ${autore} il ${stato.orologio.data} alle ${stato.orologio.ora}: creata la versione ${versione.numero}.`,
      };
      break;
    }
    case "avviso":
      decisione ??= { tipo: "accettata", versione: null, autore: nome.trim(), momento: stato.orologio };
      esito = { livello: "avviso", messaggio: risultato.avviso.messaggio };
      break;
    case "errore":
      esito = { livello: "errore", messaggio: risultato.errore.messaggio };
      break;
  }
  const nuovo = { ...aggiornaProposta(stato, { ...salvata, decisione, ultimoEsito: esito }), storico: risultato.storico };
  salvaStato(cartella, nuovo);
  return { ok: true, stato: nuovo, esito };
}

/** Rifiuta una proposta: il motore (`rifiutaProposta`) non crea versioni e lo storico resta quello di prima. */
export function rifiutaPropostaSalvata(cartella: string, idProposta: number): EsitoOperazione<{ esito: EsitoAzione }> {
  const letto = statoValido(cartella);
  if (!letto.ok) return letto;
  const stato = letto.stato;
  const salvata = trovaProposta(stato, idProposta);
  if (salvata === null) return { ok: false, messaggio: PROPOSTA_NON_DISPONIBILE };
  const risultato = rifiutaProposta(stato.storico, salvata.proposta);
  const esito: EsitoAzione = {
    livello: "successo",
    messaggio: `Proposta rifiutata: nessuna nuova versione, l'itinerario resta alla versione ${versioneCorrente(risultato.storico).numero}.`,
  };
  const aggiornata: PropostaSalvata = { ...salvata, decisione: salvata.decisione ?? { tipo: "rifiutata" }, ultimoEsito: esito };
  const nuovo = { ...aggiornaProposta(stato, aggiornata), storico: risultato.storico };
  salvaStato(cartella, nuovo);
  return { ok: true, stato: nuovo, esito };
}

/**
 * Ripristina: torna all'itinerario di partenza (il viaggio dello scenario avviato, o la versione 1 di riferimento),
 * con la sola versione 1, e scarta le proposte. Lo scenario in corso e l'orologio simulato restano.
 * Se lo stato salvato non è valido, torna allo stato iniziale.
 */
export function ripristina(cartella: string): EsitoOperazione {
  const letto = leggiStato(cartella);
  const stato = letto.ok
    ? statoIniziale(letto.stato.partenza, letto.stato.scenario, letto.stato.orologio, letto.stato.prossimaProposta)
    : statoIniziale();
  salvaStato(cartella, stato);
  return { ok: true, stato };
}

/**
 * "Ripristina i viaggi demo" (REQ-DATA-001): ricarica tutti i viaggi demo nello stato iniziale, senza toccare gli
 * altri viaggi. Le proposte dei viaggi demo sono scartate e anche lo scenario in corso si azzera (REQ-UX-003 CA-6):
 * la Demo torna all'itinerario di partenza senza scenario; l'orologio simulato e il contatore delle proposte restano.
 */
export function ripristinaViaggiDemo(cartella: string): EsitoOperazione<{ ricaricati: string[] }> {
  const ricaricati = usaBaseDati(cartella, ricaricaViaggiDemo);
  const letto = leggiStato(cartella);
  const stato = letto.ok ? statoIniziale(undefined, null, letto.stato.orologio, letto.stato.prossimaProposta) : statoIniziale();
  salvaStato(cartella, stato);
  return { ok: true, stato, ricaricati };
}
