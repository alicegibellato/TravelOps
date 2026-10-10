/**
 * Le operazioni della vista Oggi sullo stato locale (REQ-TODAY-001): il momento dell'orologio simulato, l'itinerario
 * da mostrare e la proposta per un ritardo segnalato con i pulsanti rapidi.
 *
 * Come per gli scenari della modalità presentazione (`src/stato/operazioni.ts`), la proposta la costruisce il motore
 * (`proponiRipianificazione`) sulla versione corrente; accettarla o rifiutarla passa dalla stessa pagina della proposta.
 */
import { creaSorgenteDaDati, proponiRipianificazione, versioneCorrente, type Catalogo, type IstantaneaCatalogo, type Momento, type Viaggio } from "@travelops/engine";
import { elencaProposteDelViaggio, inTransazione, leggiIstantanea, leggiStoricoDelViaggio, sostituisciProposteDelViaggio, trovaViaggio } from "../basedati";
import { ORIGINE_PROPOSTA_BOZZA } from "../bozza/servizio";
import { catalogoDiRiferimento, sorgenteDiRiferimento } from "../dati/scenari";
import { caricaViaggioScelto } from "../dati/viaggi";
import { caricaViaggioDellApp, momentoSulViaggio, viaggioDiRiferimento, type OpzioniOrologio } from "../dati/viaggi-salvati";
import { percorsoBozza, percorsoProposta } from "../percorsi";
import { usaBaseDati } from "../stato/avvio";
import { leggiStato, salvaStato } from "../stato/archivio";
import type { EsitoOperazione } from "../stato/operazioni";
import { OROLOGIO_PREDEFINITO, statoIniziale, type PropostaSalvata, type StatoDemo } from "../stato/stato";
import { etichettaRitardo, imprevistoRitardo, ritardoRapido } from "./ritardi";

export interface DatiOggi {
  momento: Momento;
  viaggio: Viaggio;
  catalogo: Catalogo;
}

/**
 * Il momento dell'orologio e l'itinerario del viaggio: la versione corrente se il viaggio è quello della modalità
 * presentazione, altrimenti quello di riferimento. Per un viaggio confermato della base dati (REQ-UX-003, CA-2) la
 * versione corrente del suo storico, al momento del suo orologio (CA-3, `src/oggi/orologio.ts`). `null` se il viaggio
 * non esiste o non è valido.
 */
export function datiOggi(cartella: string, chiave: string, opzioni: OpzioniOrologio = {}): DatiOggi | null {
  const riferimento = caricaViaggioScelto(chiave);
  if (riferimento === null) return datiOggiSalvato(cartella, chiave, opzioni);
  if (!riferimento.ok) return null;
  const letto = leggiStato(cartella);
  if (!letto.ok) return { momento: OROLOGIO_PREDEFINITO, viaggio: riferimento.viaggio, catalogo: riferimento.catalogo };
  const { stato } = letto;
  return { momento: stato.orologio, viaggio: viaggioDiRiferimento(stato, chiave, riferimento.viaggio), catalogo: riferimento.catalogo };
}

/** I dati di Oggi di un viaggio confermato della base dati, al momento del suo orologio. */
function datiOggiSalvato(cartella: string, chiave: string, opzioni: OpzioniOrologio): DatiOggi | null {
  const salvato = caricaViaggioDellApp(cartella, chiave);
  if (salvato === null || !salvato.esito.ok) return null;
  try {
    const { momento } = usaBaseDati(cartella, (db) => momentoSulViaggio(db, chiave, opzioni));
    return { momento, viaggio: salvato.esito.viaggio, catalogo: salvato.esito.catalogo };
  } catch {
    return null;
  }
}

/**
 * "Sono in ritardo di N minuti" su un viaggio confermato della base dati (REQ-UX-003, CA-2 e CA-3): il motore
 * (`proponiRipianificazione`) prepara la proposta sulla versione corrente, al momento dell'orologio del viaggio, con i
 * tempi di percorrenza della sua istantanea. La proposta si salva tra quelle del viaggio e si decide nella pagina del
 * viaggio confermato (`/bozza/<id>`), con Accetta e Rifiuta.
 */
export function segnalaRitardoSulViaggio(
  cartella: string,
  chiave: string,
  minuti: number,
  opzioni: OpzioniOrologio = {},
): { ok: true; id: number } | { ok: false; messaggio: string } {
  if (!ritardoRapido(minuti)) return { ok: false, messaggio: "Scegli un ritardo di 15, 30 o 60 minuti." };
  try {
    return usaBaseDati(cartella, (db) =>
      inTransazione(db, () => {
        const salvato = trovaViaggio(db, chiave);
        const storico = leggiStoricoDelViaggio(db, chiave);
        const istantanea = salvato?.istantanea == null ? null : leggiIstantanea(db, salvato.istantanea);
        if (salvato === null || storico === null || !storico.ok || istantanea === null) {
          return { ok: false as const, messaggio: "Il viaggio non è disponibile." };
        }
        const contenuto = istantanea.contenuto as IstantaneaCatalogo;
        const corrente = versioneCorrente(storico.storico);
        const { momento } = momentoSulViaggio(db, chiave, opzioni);
        const sorgente = creaSorgenteDaDati({ tempiPercorrenza: contenuto.tempiPercorrenza, previsioni: [], chiusure: [] });
        const proposta = proponiRipianificazione(
          corrente.viaggio,
          corrente.numero,
          contenuto as unknown as Catalogo,
          sorgente,
          // Il motivo non può restare vuoto: lo storico lo richiede quando la proposta accettata diventa una versione.
          { ...imprevistoRitardo(momento, minuti), motivo: etichettaRitardo(minuti) },
        );
        const registrate = elencaProposteDelViaggio(db, chiave);
        const id = registrate.reduce((massimo, p) => Math.max(massimo, p.id), 0) + 1;
        // La descrizione è il titolo della proposta nella pagina del viaggio confermato.
        const conTitolo = { ...proposta, origine: { ...proposta.origine, descrizione: etichettaRitardo(minuti) } };
        sostituisciProposteDelViaggio(db, chiave, [...registrate, { id, origine: ORIGINE_PROPOSTA_BOZZA, proposta: conTitolo, decisione: null, esito: null }]);
        return { ok: true as const, id };
      }),
    );
  } catch {
    return { ok: false, messaggio: "Il viaggio non è disponibile." };
  }
}

/**
 * Il ritardo segnalato dalla vista Oggi di qualsiasi viaggio: per un viaggio di riferimento come prima
 * (`segnalaRitardo`, pagina della proposta), per un viaggio della base dati con `segnalaRitardoSulViaggio`.
 * Restituisce la pagina in cui decidere la proposta.
 */
export function segnalaRitardoDaOggi(cartella: string, chiave: string, minuti: number): { ok: true; indirizzo: string } | { ok: false; messaggio: string } {
  if (caricaViaggioScelto(chiave) !== null) {
    const esito = segnalaRitardo(cartella, chiave, minuti);
    return esito.ok ? { ok: true, indirizzo: percorsoProposta(esito.proposta.id) } : esito;
  }
  const esito = segnalaRitardoSulViaggio(cartella, chiave, minuti);
  return esito.ok ? { ok: true, indirizzo: percorsoBozza(chiave) } : esito;
}

/**
 * "Sono in ritardo di N minuti": chiede al motore la proposta per l'imprevisto `RITARDO` nel momento dell'orologio
 * simulato, sulla versione corrente del viaggio, e la salva tra le proposte da decidere. Se il viaggio non è quello
 * della modalità presentazione, lo diventa (con la sola versione 1, come quando si avvia uno scenario).
 */
export function segnalaRitardo(cartella: string, chiave: string, minuti: number): EsitoOperazione<{ proposta: PropostaSalvata }> {
  if (!ritardoRapido(minuti)) return { ok: false, messaggio: "Scegli un ritardo di 15, 30 o 60 minuti." };
  const riferimento = caricaViaggioScelto(chiave);
  if (riferimento === null || !riferimento.ok) return { ok: false, messaggio: "Il viaggio non è disponibile." };
  const letto = leggiStato(cartella);
  if (!letto.ok) return { ok: false, messaggio: 'Lo stato salvato non è valido: usa "Ripristina" nella modalità presentazione.' };
  const stato: StatoDemo =
    letto.stato.partenza === chiave ? letto.stato : statoIniziale(chiave, null, letto.stato.orologio, letto.stato.prossimaProposta);
  const corrente = versioneCorrente(stato.storico);
  const proposta: PropostaSalvata = {
    id: stato.prossimaProposta,
    scenario: etichettaRitardo(minuti),
    proposta: proponiRipianificazione(
      corrente.viaggio,
      corrente.numero,
      catalogoDiRiferimento(),
      sorgenteDiRiferimento(),
      imprevistoRitardo(stato.orologio, minuti),
    ),
    decisione: null,
    ultimoEsito: null,
  };
  const nuovo: StatoDemo = { ...stato, proposte: [...stato.proposte, proposta], prossimaProposta: proposta.id + 1 };
  salvaStato(cartella, nuovo);
  return { ok: true, stato: nuovo, proposta };
}
