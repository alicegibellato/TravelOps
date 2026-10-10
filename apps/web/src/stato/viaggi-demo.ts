/**
 * I viaggi demo (REQ-DATA-001): caricati nella base dati al primo avvio e ricaricati da "Ripristina i viaggi demo",
 * che non tocca gli altri viaggi.
 *
 * Oggi sono i viaggi di riferimento dell'ondata 1 (la versione 1 e le varianti V-IRR, V-FISSO, V-VOLO), ognuno con lo
 * storico creato dal motore (`creaStorico`): sono quelli che la modalità presentazione usa per gli scenari S1–S8.
 * I viaggi demo della CR-001 §8.3 (TRIP-DEMO-GARDA, TRIP-DEMO-DOLOMITI, TRIP-DEMO-ROMA, REQ-DEMO-001) si costruiscono
 * dalle istantanee precaricate e dai profili di riferimento (`viaggi-demo-bozza.ts`) e si ricaricano insieme a questi.
 */
import { creaStorico } from "@travelops/engine";
import { elencaViaggi, eliminaViaggio, inTransazione, salvaStoricoDelViaggio, salvaViaggio, trovaViaggio, type BaseDati } from "../basedati";
import { caricaViaggioScelto, VIAGGI } from "../dati/viaggi";
import { caricaViaggioDemoBozza, leggiSpecificheDemo } from "./viaggi-demo-bozza";

export interface ViaggioDemo {
  /** Identificativo nella base dati: la chiave del viaggio negli indirizzi della web app. */
  id: string;
  titolo: string;
  destinazione: string;
}

/** Titoli in parole semplici, senza codici del motore (REQ-UX-001 CA-6), per chiave del viaggio. */
const TITOLI: Readonly<Record<string, string>> = {
  "versione-1": "Weekend sul Garda",
  "v-irr": "Weekend sul Garda, con il castello irrinunciabile",
  "v-fisso": "Weekend sul Garda, con il pranzo sul lago a orario fisso",
  "v-volo": "Weekend sul Garda, con il volo di ritorno",
};

export const VIAGGI_DEMO: readonly ViaggioDemo[] = VIAGGI.map((voce) => ({
  id: voce.chiave,
  titolo: TITOLI[voce.chiave] ?? voce.etichetta,
  destinazione: "Lago di Garda",
}));

/** Gli identificativi dei viaggi demo della CR-001 §8.3 (TRIP-DEMO-GARDA, -DOLOMITI, -ROMA), dopo quelli dell'ondata 1. */
export const VIAGGI_DEMO_PRODOTTO: readonly string[] = ["TRIP-DEMO-GARDA", "TRIP-DEMO-DOLOMITI", "TRIP-DEMO-ROMA"];

export function trovaViaggioDemo(id: string): ViaggioDemo | null {
  return VIAGGI_DEMO.find((v) => v.id === id) ?? null;
}

/**
 * Carica il viaggio demo nel suo stato iniziale: confermato, con la sola versione 1 creata dal motore, senza profilo,
 * revisioni, proposte né conversazioni. Se il viaggio c'era già, lo sostituisce per intero.
 */
export function caricaViaggioDemo(db: BaseDati, id: string): void {
  const specifica = leggiSpecificheDemo().find((s) => s.id === id);
  if (specifica !== undefined) {
    caricaViaggioDemoBozza(db, specifica, VIAGGI_DEMO.length + VIAGGI_DEMO_PRODOTTO.indexOf(id) + 1);
    return;
  }
  const demo = trovaViaggioDemo(id);
  if (demo === null) throw new Error(`Viaggio demo sconosciuto: ${id}`);
  const dati = caricaViaggioScelto(id);
  if (dati === null || !dati.ok) throw new Error(`Il viaggio demo ${id} non è valido`);
  const creato = creaStorico(dati.viaggio);
  if (!creato.ok) throw new Error(creato.errore.messaggio);
  inTransazione(db, () => {
    eliminaViaggio(db, id);
    salvaViaggio(db, {
      id,
      titolo: demo.titolo,
      stato: "confermato",
      demo: true,
      ordine: VIAGGI_DEMO.indexOf(demo) + 1,
      destinazione: demo.destinazione,
      istantanea: null,
    });
    salvaStoricoDelViaggio(db, id, creato.storico);
  });
}

/**
 * "Ripristina i viaggi demo": toglie i viaggi demo salvati e li ricarica tutti nello stato iniziale.
 * Gli altri viaggi (creati dal viaggiatore o importati) restano come sono. Restituisce gli identificativi ricaricati.
 */
export function ricaricaViaggiDemo(db: BaseDati): string[] {
  return inTransazione(db, () => {
    for (const viaggio of elencaViaggi(db)) if (viaggio.demo) eliminaViaggio(db, viaggio.id);
    for (const demo of VIAGGI_DEMO) caricaViaggioDemo(db, demo.id);
    for (const id of VIAGGI_DEMO_PRODOTTO) caricaViaggioDemo(db, id);
    return [...VIAGGI_DEMO.map((v) => v.id), ...VIAGGI_DEMO_PRODOTTO.filter((id) => trovaViaggio(db, id) !== null)];
  });
}
