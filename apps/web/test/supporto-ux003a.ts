/**
 * Supporto ai test di ST-UX-003A (REQ-UX-003, CA-2 e CA-3): viaggi del viaggiatore nella base dati di una cartella
 * temporanea, costruiti copiando il viaggio demo TRIP-DEMO-GARDA (istantanea, profilo, revisioni, storico), con le date
 * spostate se serve. Nessuna chiamata di rete.
 */
import { creaStorico, caricaViaggio, versioneCorrente, type Viaggio } from "@travelops/engine";
import {
  aggiungiRevisioneBozza,
  leggiImpostazione,
  leggiProfilo,
  leggiStoricoDelViaggio,
  salvaProfilo,
  salvaStoricoDelViaggio,
  salvaViaggio,
  scriviImpostazione,
  trovaViaggio,
  type BaseDati,
} from "../src/basedati";
import { CHIAVE_DATI_BOZZA } from "../src/bozza/chiavi";
import { aggiungiGiorni } from "../src/oggi/orologio";
import { usaBaseDati } from "../src/stato/avvio";

export const DEMO_GARDA = "TRIP-DEMO-GARDA";

/** Il viaggio demo del Garda (versione corrente), con le date spostate di `giorni` giorni. */
export function viaggioGardaSpostato(db: BaseDati, giorni: number): Viaggio {
  const storico = leggiStoricoDelViaggio(db, DEMO_GARDA);
  if (storico === null || !storico.ok) throw new Error("manca lo storico di TRIP-DEMO-GARDA");
  const viaggio = versioneCorrente(storico.storico).viaggio;
  const spostato = {
    ...viaggio,
    dataInizio: aggiungiGiorni(viaggio.dataInizio, giorni),
    dataFine: aggiungiGiorni(viaggio.dataFine, giorni),
    giorni: viaggio.giorni.map((g) => ({ ...g, data: aggiungiGiorni(g.data, giorni) })),
  };
  const caricato = caricaViaggio(JSON.parse(JSON.stringify(spostato)));
  if (!caricato.ok) throw new Error(caricato.errori.map((e) => e.messaggio).join("; "));
  return caricato.valore;
}

export interface OpzioniViaggioUtente {
  id: string;
  titolo?: string;
  stato?: "bozza" | "confermato";
  /** Di quanti giorni spostare le date rispetto a TRIP-DEMO-GARDA (12–15 giugno 2026). */
  spostamento?: number;
  ordine?: number;
}

/** Salva un viaggio del viaggiatore (non demo) sulla base dati aperta, come lo salverebbero chat o filtri. */
export function salvaViaggioUtente(db: BaseDati, opzioni: OpzioniViaggioUtente): Viaggio {
  const garda = trovaViaggio(db, DEMO_GARDA);
  if (garda === null) throw new Error("manca TRIP-DEMO-GARDA (istantanee del repository non caricate?)");
  const stato = opzioni.stato ?? "confermato";
  const viaggio = viaggioGardaSpostato(db, opzioni.spostamento ?? 0);
  salvaViaggio(db, {
    ...garda,
    id: opzioni.id,
    titolo: opzioni.titolo ?? "Viaggio a Lago di Garda",
    stato,
    demo: false,
    ordine: opzioni.ordine ?? 100,
  });
  salvaProfilo(db, opzioni.id, leggiProfilo(db, DEMO_GARDA));
  aggiungiRevisioneBozza(db, opzioni.id, "Prima bozza", viaggio);
  const dati = leggiImpostazione(db, CHIAVE_DATI_BOZZA(DEMO_GARDA)) as { revisioni: unknown };
  scriviImpostazione(db, CHIAVE_DATI_BOZZA(opzioni.id), { revisioni: dati.revisioni, confermata: stato === "confermato" ? 1 : null });
  if (stato === "confermato") {
    const creato = creaStorico(viaggio);
    if (!creato.ok) throw new Error(creato.errore.messaggio);
    salvaStoricoDelViaggio(db, opzioni.id, creato.storico);
  }
  return viaggio;
}

/** Come `salvaViaggioUtente`, aprendo la base dati della cartella (con il primo avvio, se serve). */
export function conViaggioUtente(cartella: string, opzioni: OpzioniViaggioUtente): Viaggio {
  return usaBaseDati(cartella, (db) => salvaViaggioUtente(db, opzioni));
}
