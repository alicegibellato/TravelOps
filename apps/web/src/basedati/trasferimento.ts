/**
 * Esportazione e importazione di un viaggio salvato (REQ-DATA-001, CA-3): un documento JSON con i dati del viaggio,
 * l'istantanea su cui è costruito, il profilo, le revisioni della bozza, lo storico, le proposte e le conversazioni.
 *
 * Viaggi e storico sono il JSON del motore: le revisioni con `esportaViaggio`, lo storico con `esportaStorico`.
 * All'importazione il motore li rilegge e li valida (`caricaViaggio`, `importaStorico`), quindi un viaggio esportato
 * e reimportato ha lo stesso JSON del motore. Restano fuori solo i dati locali dell'elenco (viaggio demo, posizione).
 */
import { caricaViaggio, esportaStorico, importaStorico, type Storico, type Viaggio } from "@travelops/engine";
import { inTransazione, type BaseDati } from "./connessione";
import {
  aggiungiMessaggio,
  conversazioniDelViaggio,
  creaConversazione,
  RUOLI_MESSAGGIO,
  type Messaggio,
} from "./conversazioni";
import { leggiIstantanea, salvaIstantanea, type Istantanea } from "./istantanee";
import {
  aggiungiRevisioneBozza,
  elencaProposteDelViaggio,
  elencaRevisioniBozza,
  elencaViaggi,
  eliminaViaggio,
  leggiProfilo,
  leggiStoricoDelViaggio,
  salvaProfilo,
  salvaStoricoDelViaggio,
  salvaViaggio,
  sostituisciProposteDelViaggio,
  STATI_VIAGGIO,
  trovaViaggio,
  type PropostaRegistrata,
  type StatoViaggio,
} from "./viaggi";

/** Versione del formato del documento di esportazione. */
export const FORMATO_ESPORTAZIONE = 1;

export type EsitoImportazione = { ok: true; id: string } | { ok: false; motivo: string };

/**
 * Il viaggio in JSON, con rientro di due spazi; `null` se il viaggio non esiste.
 * Solleva un errore se i dati salvati non sono validi per il motore.
 */
export function esportaViaggioSalvato(db: BaseDati, id: string): string | null {
  const viaggio = trovaViaggio(db, id);
  if (viaggio === null) return null;
  const revisioni = elencaRevisioniBozza(db, id);
  if (!revisioni.ok) throw new Error(revisioni.motivo);
  const storico = leggiStoricoDelViaggio(db, id);
  if (storico !== null && !storico.ok) throw new Error([storico.errore.messaggio, ...storico.errore.dettagli].join("; "));
  const istantanea = viaggio.istantanea === null ? null : leggiIstantanea(db, viaggio.istantanea);
  const documento = {
    formato: FORMATO_ESPORTAZIONE,
    viaggio: {
      id: viaggio.id,
      titolo: viaggio.titolo,
      stato: viaggio.stato,
      destinazione: viaggio.destinazione,
      istantanea: viaggio.istantanea,
    },
    istantanea,
    profilo: leggiProfilo(db, id),
    revisioniBozza: revisioni.revisioni,
    storico: storico === null ? null : (JSON.parse(esportaStorico(storico.storico)) as unknown),
    proposte: elencaProposteDelViaggio(db, id),
    conversazioni: conversazioniDelViaggio(db, id).map((c) => ({ messaggi: c.messaggi })),
  };
  return JSON.stringify(documento, null, 2);
}

type Oggetto = Record<string, unknown>;

function oggetto(valore: unknown): valore is Oggetto {
  return typeof valore === "object" && valore !== null && !Array.isArray(valore);
}

function testoONull(valore: unknown): valore is string | null {
  return valore === null || typeof valore === "string";
}

function interoPositivo(valore: unknown): valore is number {
  return typeof valore === "number" && Number.isInteger(valore) && valore >= 1;
}

class DocumentoNonValido extends Error {}

function richiedi(condizione: boolean, motivo: string): asserts condizione {
  if (!condizione) throw new DocumentoNonValido(motivo);
}

interface DocumentoLetto {
  id: string;
  titolo: string;
  stato: StatoViaggio;
  destinazione: string | null;
  istantanea: Istantanea | null;
  idIstantanea: string | null;
  profilo: unknown;
  revisioni: { causa: string; viaggio: Viaggio }[];
  storico: Storico | null;
  proposte: PropostaRegistrata[];
  conversazioni: Omit<Messaggio, "numero">[][];
}

function leggiDocumento(testo: string): DocumentoLetto {
  let documento: unknown;
  try {
    documento = JSON.parse(testo.replace(/^﻿/, ""));
  } catch {
    throw new DocumentoNonValido("il testo non è JSON valido");
  }
  richiedi(oggetto(documento), "il documento deve essere un oggetto");
  richiedi(documento.formato === FORMATO_ESPORTAZIONE, `formato del documento non supportato: ${String(documento.formato)}`);

  const viaggio = documento.viaggio;
  richiedi(oggetto(viaggio), "mancano i dati del viaggio");
  const { id, titolo, stato, destinazione } = viaggio;
  richiedi(typeof id === "string" && id.trim() !== "", "il viaggio deve avere un identificativo");
  richiedi(typeof titolo === "string", "il viaggio deve avere un titolo");
  richiedi(STATI_VIAGGIO.some((s) => s === stato), `stato del viaggio sconosciuto: ${String(stato)}`);
  richiedi(testoONull(destinazione), "la destinazione deve essere un testo");
  richiedi(testoONull(viaggio.istantanea), "l'istantanea del viaggio deve essere un identificativo");

  let istantanea: Istantanea | null = null;
  if (documento.istantanea !== null && documento.istantanea !== undefined) {
    const i = documento.istantanea;
    richiedi(oggetto(i) && typeof i.id === "string" && typeof i.destinazione === "string" && "contenuto" in i, "istantanea non valida");
    richiedi(i.id === viaggio.istantanea, "l'istantanea allegata non è quella del viaggio");
    istantanea = { id: i.id, destinazione: i.destinazione, contenuto: i.contenuto };
  }

  richiedi(Array.isArray(documento.revisioniBozza), "manca l'elenco delle revisioni della bozza");
  const revisioni = documento.revisioniBozza.map((r: unknown, i: number) => {
    richiedi(oggetto(r) && r.numero === i + 1, `revisione ${i + 1}: le revisioni sono numerate da 1 senza salti`);
    richiedi(typeof r.causa === "string", `revisione B${i + 1}: manca la causa`);
    const caricato = caricaViaggio(r.viaggio);
    richiedi(caricato.ok, `revisione B${i + 1}: ${caricato.ok ? "" : caricato.errori.map((e) => e.messaggio).join("; ")}`);
    return { causa: r.causa, viaggio: caricato.valore };
  });

  let storico: Storico | null = null;
  if (documento.storico !== null) {
    const importato = importaStorico(documento.storico);
    richiedi(importato.ok, importato.ok ? "" : [importato.errore.messaggio, ...importato.errore.dettagli].join("; "));
    storico = importato.storico;
  }

  richiedi(Array.isArray(documento.proposte), "manca l'elenco delle proposte");
  const numeri = new Set<number>();
  const proposte = documento.proposte.map((p: unknown, i: number): PropostaRegistrata => {
    richiedi(oggetto(p) && interoPositivo(p.id) && !numeri.has(p.id), `proposta ${i + 1}: numero mancante o ripetuto`);
    richiedi(testoONull(p.origine) && oggetto(p.proposta), `proposta ${p.id}: dati non validi`);
    numeri.add(p.id);
    return { id: p.id, origine: p.origine, proposta: p.proposta, decisione: p.decisione ?? null, esito: p.esito ?? null };
  });

  richiedi(Array.isArray(documento.conversazioni), "manca l'elenco delle conversazioni");
  const conversazioni = documento.conversazioni.map((c: unknown, i: number) => {
    richiedi(oggetto(c) && Array.isArray(c.messaggi), `conversazione ${i + 1}: manca l'elenco dei messaggi`);
    return c.messaggi.map((m: unknown, j: number) => {
      richiedi(
        oggetto(m) && m.numero === j + 1 && RUOLI_MESSAGGIO.some((r) => r === m.ruolo) && typeof m.testo === "string",
        `conversazione ${i + 1}, messaggio ${j + 1}: dati non validi`,
      );
      return { ruolo: m.ruolo as Messaggio["ruolo"], testo: m.testo, dati: m.dati ?? null };
    });
  });

  return {
    id,
    titolo,
    stato: stato as StatoViaggio,
    destinazione,
    istantanea,
    idIstantanea: viaggio.istantanea,
    profilo: documento.profilo ?? null,
    revisioni,
    storico,
    proposte,
    conversazioni,
  };
}

/**
 * Importa un viaggio esportato con `esportaViaggioSalvato`. Se esiste già un viaggio con lo stesso identificativo,
 * l'importazione è rifiutata, a meno di `sostituisci`: allora il viaggio viene sostituito per intero.
 * Non solleva eccezioni per un documento non valido: restituisce il motivo e non cambia nulla.
 */
export function importaViaggioSalvato(db: BaseDati, testo: string, opzioni: { sostituisci?: boolean } = {}): EsitoImportazione {
  let letto: DocumentoLetto;
  try {
    letto = leggiDocumento(testo);
  } catch (errore) {
    if (errore instanceof DocumentoNonValido) return { ok: false, motivo: errore.message };
    throw errore;
  }
  try {
    return inTransazione(db, () => {
      const esistente = trovaViaggio(db, letto.id);
      if (esistente !== null && opzioni.sostituisci !== true) throw new DocumentoNonValido(`esiste già un viaggio con identificativo ${letto.id}`);
      if (letto.istantanea !== null) {
        try {
          salvaIstantanea(db, letto.istantanea);
        } catch (errore) {
          throw new DocumentoNonValido((errore as Error).message);
        }
      } else if (letto.idIstantanea !== null && leggiIstantanea(db, letto.idIstantanea) === null) {
        throw new DocumentoNonValido(`l'istantanea ${letto.idIstantanea} non è nel database né nel documento`);
      }
      if (esistente !== null) eliminaViaggio(db, letto.id);
      const ordine = esistente?.ordine ?? Math.max(0, ...elencaViaggi(db).map((v) => v.ordine)) + 1;
      salvaViaggio(db, {
        id: letto.id,
        titolo: letto.titolo,
        stato: letto.stato,
        demo: esistente?.demo ?? false,
        ordine,
        destinazione: letto.destinazione,
        istantanea: letto.idIstantanea,
      });
      salvaProfilo(db, letto.id, letto.profilo);
      for (const r of letto.revisioni) aggiungiRevisioneBozza(db, letto.id, r.causa, r.viaggio);
      if (letto.storico !== null) salvaStoricoDelViaggio(db, letto.id, letto.storico);
      sostituisciProposteDelViaggio(db, letto.id, letto.proposte);
      for (const messaggi of letto.conversazioni) {
        const conversazione = creaConversazione(db, letto.id);
        for (const m of messaggi) aggiungiMessaggio(db, conversazione, m);
      }
      return { ok: true, id: letto.id };
    });
  } catch (errore) {
    if (errore instanceof DocumentoNonValido) return { ok: false, motivo: errore.message };
    throw errore;
  }
}
