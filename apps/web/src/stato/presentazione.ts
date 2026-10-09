/**
 * Lo stato della pagina Demo (modalità presentazione) nella base dati (REQ-DATA-001, al posto del file JSON di
 * REQ-WEB-002):
 * - l'impostazione `presentazione`: viaggio di partenza, scenario in corso, orologio simulato, numero della prossima
 *   proposta;
 * - lo storico del viaggio di partenza (il JSON di `esportaStorico`) e le sue proposte, nelle tabelle dei viaggi.
 *
 * Rileggendo, lo storico passa dal motore (`importaStorico`, che lo valida) e i campi dagli stessi controlli di prima
 * (`verificaStato`).
 */
import {
  elencaProposteDelViaggio,
  inTransazione,
  leggiImpostazione,
  salvaStoricoDelViaggio,
  scriviImpostazione,
  sostituisciProposteDelViaggio,
  testoStoricoDelViaggio,
  trovaViaggio,
  type BaseDati,
} from "../basedati";
import { OROLOGIO_PREDEFINITO, PARTENZA_PREDEFINITA, verificaStato, type EsitoLetturaStato, type StatoDemo } from "./stato";
import { caricaViaggioDemo } from "./viaggi-demo";

/** La chiave dell'impostazione con lo stato della modalità presentazione. */
export const CHIAVE_PRESENTAZIONE = "presentazione";

interface ImpostazioniPresentazione {
  partenza: string;
  scenario: string | null;
  orologio: StatoDemo["orologio"];
  prossimaProposta: number;
}

const PREDEFINITE: ImpostazioniPresentazione = {
  partenza: PARTENZA_PREDEFINITA,
  scenario: null,
  orologio: OROLOGIO_PREDEFINITO,
  prossimaProposta: 1,
};

function oggetto(valore: unknown): valore is Record<string, unknown> {
  return typeof valore === "object" && valore !== null && !Array.isArray(valore);
}

/** Lo stato della pagina Demo salvato nella base dati. Non solleva eccezioni per dati non validi: dà il motivo. */
export function leggiStatoDemo(db: BaseDati): EsitoLetturaStato {
  const salvate = leggiImpostazione(db, CHIAVE_PRESENTAZIONE) ?? PREDEFINITE;
  if (!oggetto(salvate)) return { ok: false, motivo: "impostazioni della modalità presentazione non valide" };
  const { partenza } = salvate;
  if (typeof partenza !== "string") return { ok: false, motivo: "viaggio di partenza sconosciuto" };
  const storico = testoStoricoDelViaggio(db, partenza);
  if (storico === null) return { ok: false, motivo: `il viaggio di partenza ${partenza} non è nella base dati` };
  const proposte = elencaProposteDelViaggio(db, partenza).map((p) => ({
    id: p.id,
    scenario: p.origine,
    proposta: p.proposta,
    decisione: p.decisione,
    ultimoEsito: p.esito,
  }));
  return verificaStato({ ...salvate, storico, proposte });
}

/** Salva lo stato della pagina Demo, tutto insieme (una transazione). */
export function salvaStatoDemo(db: BaseDati, stato: StatoDemo): void {
  inTransazione(db, () => {
    // Il viaggio di partenza è un viaggio demo: se non c'è più (per esempio cancellato), si ricarica.
    if (trovaViaggio(db, stato.partenza) === null) caricaViaggioDemo(db, stato.partenza);
    salvaStoricoDelViaggio(db, stato.partenza, stato.storico);
    sostituisciProposteDelViaggio(
      db,
      stato.partenza,
      stato.proposte.map((p) => ({ id: p.id, origine: p.scenario, proposta: p.proposta, decisione: p.decisione, esito: p.ultimoEsito })),
    );
    const impostazioni: ImpostazioniPresentazione = {
      partenza: stato.partenza,
      scenario: stato.scenario,
      orologio: stato.orologio,
      prossimaProposta: stato.prossimaProposta,
    };
    scriviImpostazione(db, CHIAVE_PRESENTAZIONE, impostazioni);
  });
}
