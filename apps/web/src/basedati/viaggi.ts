/**
 * Viaggi e ciò che appartiene a un viaggio (REQ-DATA-001): profilo delle preferenze, revisioni della bozza,
 * storico delle versioni e proposte.
 *
 * Il database salva il JSON del motore così come il motore lo produce (`esportaViaggio`, `esportaStorico`) e lo
 * rilegge con le funzioni del motore (`caricaViaggio`, `importaStorico`), che lo validano: nessuna regola del
 * motore è ripetuta qui. Le proposte sono quelle del motore, salvate così come sono.
 */
import {
  caricaViaggio,
  esportaStorico,
  esportaViaggio,
  importaStorico,
  type EsitoStorico,
  type Storico,
  type Viaggio,
} from "@travelops/engine";
import { inTransazione, type BaseDati, type Riga } from "./connessione";

export const STATI_VIAGGIO = ["bozza", "confermato", "in_corso", "concluso"] as const;
export type StatoViaggio = (typeof STATI_VIAGGIO)[number];

/** I dati di un viaggio nell'elenco dei viaggi. */
export interface ViaggioSalvato {
  /** Identificativo nella web app (per i viaggi demo, la chiave usata negli indirizzi). */
  id: string;
  titolo: string;
  stato: StatoViaggio;
  /** Vero per i viaggi demo, che "Ripristina i viaggi demo" ricarica. */
  demo: boolean;
  /** Posizione nell'elenco dei viaggi. */
  ordine: number;
  destinazione: string | null;
  /** L'istantanea del catalogo su cui il viaggio è costruito (i viaggi dell'ondata 1 non ce l'hanno). */
  istantanea: string | null;
}

/** Una proposta del motore salvata per un viaggio, con la decisione e l'ultimo esito mostrato. */
export interface PropostaRegistrata {
  /** Numero progressivo della proposta. */
  id: number;
  /** Da dove nasce (per esempio lo scenario della modalità presentazione); `null` se non è indicato. */
  origine: string | null;
  /** La proposta del motore, così come è stata restituita. */
  proposta: unknown;
  decisione: unknown;
  esito: unknown;
}

export interface RevisioneBozza {
  /** B1, B2, … come numero: 1, 2, … */
  numero: number;
  causa: string;
  viaggio: Viaggio;
}

export type EsitoRevisioni = { ok: true; revisioni: RevisioneBozza[] } | { ok: false; motivo: string };

function decodifica(testo: unknown, cosa: string): unknown {
  try {
    return JSON.parse(String(testo)) as unknown;
  } catch {
    throw new Error(`${cosa}: il database non contiene JSON valido`);
  }
}

function comeViaggioSalvato(riga: Record<string, unknown>): ViaggioSalvato {
  return {
    id: String(riga.id),
    titolo: String(riga.titolo),
    stato: String(riga.stato) as StatoViaggio,
    demo: Number(riga.demo) === 1,
    ordine: Number(riga.ordine),
    destinazione: riga.destinazione === null ? null : String(riga.destinazione),
    istantanea: riga.istantanea_id === null ? null : String(riga.istantanea_id),
  };
}

const COLONNE_VIAGGIO = "id, titolo, stato, demo, ordine, destinazione, istantanea_id";

/** Tutti i viaggi, nell'ordine dell'elenco. */
export function elencaViaggi(db: BaseDati): ViaggioSalvato[] {
  return db.prepare<unknown[], Riga>(`SELECT ${COLONNE_VIAGGIO} FROM viaggi ORDER BY ordine, id`).all().map(comeViaggioSalvato);
}

export function trovaViaggio(db: BaseDati, id: string): ViaggioSalvato | null {
  const riga = db.prepare<unknown[], Riga>(`SELECT ${COLONNE_VIAGGIO} FROM viaggi WHERE id = ?`).get(id);
  return riga === undefined ? null : comeViaggioSalvato(riga);
}

/** Crea il viaggio o ne aggiorna i dati (profilo, revisioni, storico e proposte restano). */
export function salvaViaggio(db: BaseDati, viaggio: ViaggioSalvato): void {
  if (viaggio.id.trim() === "") throw new Error("il viaggio deve avere un identificativo");
  if (!STATI_VIAGGIO.includes(viaggio.stato)) throw new Error(`stato del viaggio sconosciuto: ${String(viaggio.stato)}`);
  db.prepare<unknown[], Riga>(
    `INSERT INTO viaggi (${COLONNE_VIAGGIO}) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET titolo = excluded.titolo, stato = excluded.stato, demo = excluded.demo,
       ordine = excluded.ordine, destinazione = excluded.destinazione, istantanea_id = excluded.istantanea_id`,
  ).run(viaggio.id, viaggio.titolo, viaggio.stato, viaggio.demo ? 1 : 0, viaggio.ordine, viaggio.destinazione, viaggio.istantanea);
}

/** Elimina il viaggio con tutto ciò che gli appartiene (profilo, revisioni, storico, proposte, conversazioni). */
export function eliminaViaggio(db: BaseDati, id: string): boolean {
  return Number(db.prepare<unknown[], Riga>("DELETE FROM viaggi WHERE id = ?").run(id).changes) > 0;
}

/** Il profilo delle preferenze del viaggio (il JSON definito da REQ-PREF-001), oppure `null`. */
export function leggiProfilo(db: BaseDati, viaggioId: string): unknown {
  const riga = db.prepare<unknown[], Riga>("SELECT json FROM profili WHERE viaggio_id = ?").get(viaggioId);
  return riga === undefined ? null : decodifica(riga.json, `profilo del viaggio ${viaggioId}`);
}

/** Salva il profilo del viaggio; `null` lo toglie. */
export function salvaProfilo(db: BaseDati, viaggioId: string, profilo: unknown): void {
  if (profilo === null) {
    db.prepare<unknown[], Riga>("DELETE FROM profili WHERE viaggio_id = ?").run(viaggioId);
    return;
  }
  db.prepare<unknown[], Riga>("INSERT INTO profili (viaggio_id, json) VALUES (?, ?) ON CONFLICT (viaggio_id) DO UPDATE SET json = excluded.json").run(
    viaggioId,
    JSON.stringify(profilo),
  );
}

/** Aggiunge la revisione successiva della bozza (B1, B2, …) e ne restituisce il numero. */
export function aggiungiRevisioneBozza(db: BaseDati, viaggioId: string, causa: string, viaggio: Viaggio): number {
  return inTransazione(db, () => {
    const ultima = db.prepare<unknown[], Riga>("SELECT MAX(numero) AS ultima FROM revisioni_bozza WHERE viaggio_id = ?").get(viaggioId);
    const numero = Number(ultima?.ultima ?? 0) + 1;
    db.prepare<unknown[], Riga>("INSERT INTO revisioni_bozza (viaggio_id, numero, causa, viaggio_json) VALUES (?, ?, ?, ?)").run(
      viaggioId,
      numero,
      causa,
      esportaViaggio(viaggio),
    );
    return numero;
  });
}

/** Le revisioni della bozza, in ordine, con il viaggio riletto e validato dal motore (`caricaViaggio`). */
export function elencaRevisioniBozza(db: BaseDati, viaggioId: string): EsitoRevisioni {
  const revisioni: RevisioneBozza[] = [];
  const righe = db.prepare<unknown[], Riga>("SELECT numero, causa, viaggio_json FROM revisioni_bozza WHERE viaggio_id = ? ORDER BY numero").all(viaggioId);
  for (const riga of righe) {
    const caricato = caricaViaggio(decodifica(riga.viaggio_json, `revisione B${String(riga.numero)}`));
    if (!caricato.ok) {
      return { ok: false, motivo: `revisione B${String(riga.numero)}: ${caricato.errori.map((e) => e.messaggio).join("; ")}` };
    }
    revisioni.push({ numero: Number(riga.numero), causa: String(riga.causa), viaggio: caricato.valore });
  }
  return { ok: true, revisioni };
}

/** Il testo dello storico salvato (quello di `esportaStorico`), oppure `null` se il viaggio non ha storico. */
export function testoStoricoDelViaggio(db: BaseDati, viaggioId: string): string | null {
  const riga = db.prepare<unknown[], Riga>("SELECT json FROM storici WHERE viaggio_id = ?").get(viaggioId);
  return riga === undefined ? null : String(riga.json);
}

/**
 * Lo storico del viaggio riletto dal motore (`importaStorico`, che lo valida), oppure `null` se il viaggio non ha
 * ancora uno storico (per esempio una bozza: lo storico parte alla conferma).
 */
export function leggiStoricoDelViaggio(db: BaseDati, viaggioId: string): EsitoStorico | null {
  const testo = testoStoricoDelViaggio(db, viaggioId);
  return testo === null ? null : importaStorico(testo);
}

/** Salva lo storico del viaggio con il JSON del motore (`esportaStorico`). */
export function salvaStoricoDelViaggio(db: BaseDati, viaggioId: string, storico: Storico): void {
  db.prepare<unknown[], Riga>("INSERT INTO storici (viaggio_id, json) VALUES (?, ?) ON CONFLICT (viaggio_id) DO UPDATE SET json = excluded.json").run(
    viaggioId,
    esportaStorico(storico),
  );
}

/** Le proposte salvate per il viaggio, in ordine di numero. */
export function elencaProposteDelViaggio(db: BaseDati, viaggioId: string): PropostaRegistrata[] {
  return db
    .prepare<unknown[], Riga>("SELECT id, origine, proposta_json, decisione_json, esito_json FROM proposte WHERE viaggio_id = ? ORDER BY id")
    .all(viaggioId)
    .map((riga) => {
      const dove = `proposta ${String(riga.id)}`;
      return {
        id: Number(riga.id),
        origine: riga.origine === null ? null : String(riga.origine),
        proposta: decodifica(riga.proposta_json, dove),
        decisione: riga.decisione_json === null ? null : decodifica(riga.decisione_json, dove),
        esito: riga.esito_json === null ? null : decodifica(riga.esito_json, dove),
      };
    });
}

/** Sostituisce le proposte salvate per il viaggio con quelle indicate. */
export function sostituisciProposteDelViaggio(db: BaseDati, viaggioId: string, proposte: readonly PropostaRegistrata[]): void {
  inTransazione(db, () => {
    db.prepare<unknown[], Riga>("DELETE FROM proposte WHERE viaggio_id = ?").run(viaggioId);
    const inserisci = db.prepare<unknown[], Riga>(
      "INSERT INTO proposte (viaggio_id, id, origine, proposta_json, decisione_json, esito_json) VALUES (?, ?, ?, ?, ?, ?)",
    );
    for (const p of proposte) {
      inserisci.run(
        viaggioId,
        p.id,
        p.origine,
        JSON.stringify(p.proposta),
        p.decisione === null ? null : JSON.stringify(p.decisione),
        p.esito === null ? null : JSON.stringify(p.esito),
      );
    }
  });
}
