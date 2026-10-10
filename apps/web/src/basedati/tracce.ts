/**
 * Le tracce degli agenti (REQ-ORCH-002 CA-4): che cosa ha fatto l'orchestratore a ogni risposta della chat (a quale
 * agente ha delegato e perché) e ogni chiamata a strumento, con input riassunto, esito e durata. Le legge la pagina
 * "Cosa hanno fatto gli agenti" (REQ-OBS-001), per conversazione o per viaggio.
 */
import { inTransazione, type BaseDati, type Riga } from "./connessione";

export interface VoceTracciaAgenti {
  tipo: "delega" | "strumento";
  agente: string;
  strumento?: string;
  input: string;
  esito: "ok" | "errore";
  dettaglio?: string;
  durataMs: number;
  inizio: string;
}

/** Le tracce di una risposta della chat. */
export interface RispostaTracciata {
  conversazioneId: number;
  /** 1, 2, … nell'ordine delle risposte della conversazione. */
  risposta: number;
  /** Il messaggio del viaggiatore, in breve. */
  domanda: string;
  voci: VoceTracciaAgenti[];
}

/** Salva le tracce di una risposta in fondo alla conversazione e ne restituisce il numero (nulla se non ci sono voci). */
export function salvaTracceAgenti(db: BaseDati, conversazioneId: number, domanda: string, voci: readonly VoceTracciaAgenti[]): number | null {
  if (voci.length === 0) return null;
  return inTransazione(db, () => {
    const ultima = db.prepare<unknown[], Riga>("SELECT MAX(risposta) AS ultima FROM tracce_agenti WHERE conversazione_id = ?").get(conversazioneId);
    const risposta = Number(ultima?.ultima ?? 0) + 1;
    const inserisci = db.prepare<unknown[], Riga>(
      "INSERT INTO tracce_agenti (conversazione_id, risposta, numero, domanda, tipo, agente, strumento, input, esito, dettaglio, durata_ms, inizio) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    );
    voci.forEach((voce, i) =>
      inserisci.run(
        conversazioneId,
        risposta,
        i + 1,
        domanda,
        voce.tipo,
        voce.agente,
        voce.strumento ?? null,
        voce.input,
        voce.esito,
        voce.dettaglio ?? null,
        Math.max(0, Math.round(voce.durataMs)),
        voce.inizio,
      ),
    );
    return risposta;
  });
}

function raggruppa(righe: readonly Riga[]): RispostaTracciata[] {
  const risposte: RispostaTracciata[] = [];
  for (const riga of righe) {
    const conversazioneId = Number(riga.conversazione_id);
    const numero = Number(riga.risposta);
    let corrente = risposte.at(-1);
    if (corrente === undefined || corrente.conversazioneId !== conversazioneId || corrente.risposta !== numero) {
      corrente = { conversazioneId, risposta: numero, domanda: String(riga.domanda), voci: [] };
      risposte.push(corrente);
    }
    corrente.voci.push({
      tipo: String(riga.tipo) as VoceTracciaAgenti["tipo"],
      agente: String(riga.agente),
      ...(riga.strumento === null ? {} : { strumento: String(riga.strumento) }),
      input: String(riga.input),
      esito: String(riga.esito) as VoceTracciaAgenti["esito"],
      ...(riga.dettaglio === null ? {} : { dettaglio: String(riga.dettaglio) }),
      durataMs: Number(riga.durata_ms),
      inizio: String(riga.inizio),
    });
  }
  return risposte;
}

const COLONNE = "t.conversazione_id, t.risposta, t.numero, t.domanda, t.tipo, t.agente, t.strumento, t.input, t.esito, t.dettaglio, t.durata_ms, t.inizio";

/** Le tracce di una conversazione, risposta per risposta. */
export function tracceDellaConversazione(db: BaseDati, conversazioneId: number): RispostaTracciata[] {
  return raggruppa(
    db.prepare<unknown[], Riga>(`SELECT ${COLONNE} FROM tracce_agenti t WHERE t.conversazione_id = ? ORDER BY t.risposta, t.numero`).all(conversazioneId),
  );
}

/** Le tracce di tutte le conversazioni del viaggio, conversazione per conversazione. */
export function tracceDelViaggio(db: BaseDati, viaggioId: string): RispostaTracciata[] {
  return raggruppa(
    db
      .prepare<unknown[], Riga>(
        `SELECT ${COLONNE} FROM tracce_agenti t JOIN conversazioni c ON c.id = t.conversazione_id ` +
          "WHERE c.viaggio_id = ? ORDER BY t.conversazione_id, t.risposta, t.numero",
      )
      .all(viaggioId),
  );
}
