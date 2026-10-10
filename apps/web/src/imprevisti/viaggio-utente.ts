/**
 * "Ho un imprevisto" sul viaggio dell'utente (ST-QA-FIX-018B, TB-IMPR-013): dal viaggio scelto la scheda e la proposta
 * lavorano sul suo storico e sul catalogo della sua istantanea, non sullo stato della presentazione.
 *
 * Come per la presentazione (`./operazione`), la proposta la costruisce il motore (`proponiRipianificazione`,
 * `proponiModificaOndata2`) e il viaggio cambia solo quando la si accetta: qui la proposta si registra tra quelle del
 * viaggio, le stesse che la pagina del viaggio mostra con «Accetta» e «Rifiuta».
 */
import { contestoDaIstantanea } from "@travelops/agents";
import {
  proponiModificaOndata2,
  proponiRipianificazione,
  versioneCorrente,
  type Catalogo,
  type IstantaneaCatalogo,
  type Momento,
  type Proposta,
  type SorgenteDatiContesto,
  type Storico,
} from "@travelops/engine";
import { elencaProposteDelViaggio, inTransazione, leggiIstantanea, leggiStoricoDelViaggio, sostituisciProposteDelViaggio, trovaViaggio } from "../basedati";
import { trovaVoceViaggio } from "../dati/viaggi";
import { momentoDelViaggioSalvato } from "../dati/viaggi-salvati";
import { usaBaseDati } from "../stato/avvio";
import { leggiModulo } from "./modulo";
import { scenarioDellaScheda } from "./operazione";
import type { Scheda } from "./schede";

/** Il viaggio dell'utente su cui lavora la pagina: titolo, storico, catalogo, dati di contesto e momento. */
export interface ViaggioUtente {
  chiave: string;
  titolo: string;
  storico: Storico;
  catalogo: Catalogo;
  contesto: SorgenteDatiContesto;
  momento: Momento;
}

/**
 * Il viaggio confermato dell'utente `chiave`, se c'è. `null` per i viaggi di riferimento (sono quelli della
 * presentazione), per le bozze e per i viaggi senza storico o senza istantanea: allora vale la presentazione.
 */
export function viaggioUtente(cartella: string, chiave: string | undefined): ViaggioUtente | null {
  if (chiave === undefined || chiave === "" || trovaVoceViaggio(chiave) !== null) return null;
  try {
    const letto = usaBaseDati(cartella, (db) => {
      const salvato = trovaViaggio(db, chiave);
      if (salvato === null || salvato.demo || salvato.istantanea === null) return null;
      const storico = leggiStoricoDelViaggio(db, salvato.id);
      const istantanea = leggiIstantanea(db, salvato.istantanea);
      if (storico === null || !storico.ok || istantanea === null) return null;
      const contenuto = istantanea.contenuto as IstantaneaCatalogo;
      return { titolo: salvato.titolo, storico: storico.storico, catalogo: contenuto as unknown as Catalogo, contesto: contestoDaIstantanea(contenuto) };
    });
    return letto === null ? null : { chiave, ...letto, momento: momentoDelViaggioSalvato(cartella, chiave) };
  } catch {
    return null;
  }
}

/**
 * Dal modulo inviato alla proposta sul viaggio dell'utente: legge i campi sulla sua versione corrente (errori in
 * parole semplici), chiede la proposta al motore e la registra tra le proposte del viaggio.
 */
export function segnalaImprevistoSulViaggio(
  cartella: string,
  viaggio: ViaggioUtente,
  scheda: Scheda,
  campi: Record<string, string | undefined>,
): { ok: true; proposta: number } | { ok: false; errori: string[] } {
  const corrente = versioneCorrente(viaggio.storico);
  const modulo = leggiModulo(scheda, campi, corrente.viaggio, viaggio.catalogo);
  if (!modulo.ok) return modulo;
  let proposta: Proposta;
  try {
    if (modulo.scelta.tipo === "imprevisto") {
      proposta = proponiRipianificazione(corrente.viaggio, corrente.numero, viaggio.catalogo, viaggio.contesto, modulo.scelta.imprevisto) as unknown as Proposta;
    } else {
      const esito = proponiModificaOndata2(corrente.viaggio, corrente.numero, viaggio.catalogo, viaggio.contesto, modulo.scelta.modifica);
      if (!esito.ok) return { ok: false, errori: [`Non si può: ${esito.errore.motivo}.`] };
      proposta = esito.proposta as unknown as Proposta;
    }
  } catch (errore) {
    return { ok: false, errori: [`Non riesco a preparare la proposta: ${(errore as Error).message}`] };
  }
  const numero = usaBaseDati(cartella, (db) =>
    inTransazione(db, () => {
      const proposte = elencaProposteDelViaggio(db, viaggio.chiave);
      const id = proposte.reduce((massimo, p) => Math.max(massimo, p.id), 0) + 1;
      sostituisciProposteDelViaggio(db, viaggio.chiave, [...proposte, { id, origine: scenarioDellaScheda(scheda), proposta, decisione: null, esito: null }]);
      return id;
    }),
  );
  return { ok: true, proposta: numero };
}
