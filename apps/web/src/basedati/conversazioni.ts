/**
 * Conversazioni della chat (REQ-DATA-001, per REQ-CHAT-001). Una conversazione può nascere prima del viaggio
 * (dalla home, "Raccontami il viaggio") e collegarsi al viaggio quando questo viene creato.
 * I dati strutturati di un messaggio (per esempio le operazioni proposte) sono JSON definiti da REQ-CHAT-001.
 */
import { inTransazione, type BaseDati, type Riga } from "./connessione";

export const RUOLI_MESSAGGIO = ["viaggiatore", "assistente"] as const;
export type RuoloMessaggio = (typeof RUOLI_MESSAGGIO)[number];

export interface Messaggio {
  /** 1, 2, … nell'ordine della conversazione. */
  numero: number;
  ruolo: RuoloMessaggio;
  testo: string;
  /** Dati strutturati del messaggio, oppure `null`. */
  dati: unknown;
}

export interface Conversazione {
  id: number;
  viaggioId: string | null;
  messaggi: Messaggio[];
}

/** Crea una conversazione vuota, collegata al viaggio (o a nessun viaggio), e ne restituisce l'identificativo. */
export function creaConversazione(db: BaseDati, viaggioId: string | null): number {
  return Number(db.prepare<unknown[], Riga>("INSERT INTO conversazioni (viaggio_id) VALUES (?)").run(viaggioId).lastInsertRowid);
}

/** Collega la conversazione a un viaggio (per esempio quando il viaggio nato in chat viene creato). */
export function collegaConversazione(db: BaseDati, id: number, viaggioId: string | null): void {
  const modificate = db.prepare<unknown[], Riga>("UPDATE conversazioni SET viaggio_id = ? WHERE id = ?").run(viaggioId, id).changes;
  if (Number(modificate) === 0) throw new Error(`conversazione inesistente: ${id}`);
}

/** Aggiunge un messaggio in fondo alla conversazione e ne restituisce il numero. */
export function aggiungiMessaggio(db: BaseDati, conversazioneId: number, messaggio: Omit<Messaggio, "numero">): number {
  if (!RUOLI_MESSAGGIO.includes(messaggio.ruolo)) throw new Error(`ruolo del messaggio sconosciuto: ${String(messaggio.ruolo)}`);
  return inTransazione(db, () => {
    const ultimo = db.prepare<unknown[], Riga>("SELECT MAX(numero) AS ultimo FROM messaggi WHERE conversazione_id = ?").get(conversazioneId);
    const numero = Number(ultimo?.ultimo ?? 0) + 1;
    db.prepare<unknown[], Riga>("INSERT INTO messaggi (conversazione_id, numero, ruolo, testo, dati_json) VALUES (?, ?, ?, ?, ?)").run(
      conversazioneId,
      numero,
      messaggio.ruolo,
      messaggio.testo,
      messaggio.dati === null || messaggio.dati === undefined ? null : JSON.stringify(messaggio.dati),
    );
    return numero;
  });
}

function messaggi(db: BaseDati, conversazioneId: number): Messaggio[] {
  return db
    .prepare<unknown[], Riga>("SELECT numero, ruolo, testo, dati_json FROM messaggi WHERE conversazione_id = ? ORDER BY numero")
    .all(conversazioneId)
    .map((riga) => {
      let dati: unknown = null;
      if (riga.dati_json !== null) {
        try {
          dati = JSON.parse(String(riga.dati_json)) as unknown;
        } catch {
          throw new Error(`messaggio ${String(riga.numero)} della conversazione ${conversazioneId}: il database non contiene JSON valido`);
        }
      }
      return { numero: Number(riga.numero), ruolo: String(riga.ruolo) as RuoloMessaggio, testo: String(riga.testo), dati };
    });
}

export function leggiConversazione(db: BaseDati, id: number): Conversazione | null {
  const riga = db.prepare<unknown[], Riga>("SELECT id, viaggio_id FROM conversazioni WHERE id = ?").get(id);
  if (riga === undefined) return null;
  return { id, viaggioId: riga.viaggio_id === null ? null : String(riga.viaggio_id), messaggi: messaggi(db, id) };
}

/** Le conversazioni del viaggio, nell'ordine in cui sono nate. */
export function conversazioniDelViaggio(db: BaseDati, viaggioId: string): Conversazione[] {
  return db
    .prepare<unknown[], Riga>("SELECT id FROM conversazioni WHERE viaggio_id = ? ORDER BY id")
    .all(viaggioId)
    .map((riga) => ({ id: Number(riga.id), viaggioId, messaggi: messaggi(db, Number(riga.id)) }));
}
