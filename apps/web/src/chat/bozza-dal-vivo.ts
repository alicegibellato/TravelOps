/**
 * La bozza "dal vivo" della pagina Pianifica (REQ-CHAT-001, ST-CHAT-001C): il viaggio nato in chat come lo vede il
 * viaggiatore accanto alla conversazione, con le parti cambiate dall'ultima azione evidenziate.
 *
 * Il viaggio mostrato è la versione corrente dello storico (viaggio confermato) oppure l'ultima revisione della bozza.
 * Le parti cambiate sono le attività che non c'erano, alla stessa ora dello stesso giorno, nella versione o
 * revisione precedente. Solo lettura: nessuna regola del motore, i nomi vengono dall'istantanea del viaggio.
 */
import { giorniDi, nomiDi, type GiornoRiassunto } from "@travelops/agents";
import { versioneCorrente, type Viaggio } from "@travelops/engine";
import { elencaRevisioniBozza, leggiProfilo, leggiStoricoDelViaggio, trovaViaggio, type BaseDati } from "../basedati";
import { usaBaseDati } from "../stato/avvio";
import { istantaneaCatalogo } from "./server/archivio-viaggio";
import { giornoInParole, vociPreferenze } from "./parole";
import type { VocePreferenze } from "./tipi";

export interface VoceDalVivo {
  id: string;
  orario: string;
  testo: string;
  /** Vero se è cambiata con l'ultima azione (nuova o spostata). */
  cambiata: boolean;
  spostamento: boolean;
}

export interface GiornoDalVivo {
  data: string;
  titolo: string;
  perche?: string | undefined;
  voci: VoceDalVivo[];
}

export interface BozzaDalVivo {
  viaggioId: string;
  titolo: string;
  destinazione: string | null;
  /** "Bozza 2" o "Versione 1". */
  etichetta: string;
  confermato: boolean;
  preferenze: VocePreferenze[];
  giorni: GiornoDalVivo[];
  /** Quante attività sono cambiate con l'ultima azione. */
  cambiate: number;
}

function chiave(giorno: string, voce: GiornoRiassunto["programma"][number]): string {
  return `${giorno}|${voce.dalle}|${"attivita" in voce ? voce.attivita : voce.spostamento}`;
}

function chiaviDi(giorni: readonly GiornoRiassunto[]): Set<string> {
  return new Set(giorni.flatMap((g) => g.programma.map((v) => chiave(g.data, v))));
}

/** Il viaggio mostrato e quello di prima (per le parti cambiate), con l'etichetta. */
function viaggiDaMostrare(db: BaseDati, viaggioId: string): { attuale: Viaggio; prima: Viaggio | null; etichetta: string; confermato: boolean } | null {
  const storico = leggiStoricoDelViaggio(db, viaggioId);
  if (storico?.ok === true) {
    const corrente = versioneCorrente(storico.storico);
    const precedente = storico.storico.versioni.find((v) => v.numero === corrente.numero - 1);
    return { attuale: corrente.viaggio, prima: precedente?.viaggio ?? null, etichetta: `Versione ${corrente.numero}`, confermato: true };
  }
  const revisioni = elencaRevisioniBozza(db, viaggioId);
  if (!revisioni.ok || revisioni.revisioni.length === 0) return null;
  const ultima = revisioni.revisioni.at(-1);
  if (ultima === undefined) return null;
  const precedente = revisioni.revisioni.at(-2);
  return { attuale: ultima.viaggio, prima: precedente?.viaggio ?? null, etichetta: `Bozza ${ultima.numero}`, confermato: false };
}

/** La bozza del viaggio, pronta da mostrare; `null` se il viaggio non esiste o non ha ancora una bozza. */
export function leggiBozzaDalVivo(cartella: string, viaggioId: string): BozzaDalVivo | null {
  return usaBaseDati(cartella, (db) => {
    const viaggio = trovaViaggio(db, viaggioId);
    if (viaggio === null) return null;
    const profilo = leggiProfilo(db, viaggioId);
    const preferenze = typeof profilo === "object" && profilo !== null ? vociPreferenze(profilo) : [];
    const base = { viaggioId, titolo: viaggio.titolo, destinazione: viaggio.destinazione, preferenze };
    const istantanea = viaggio.istantanea === null ? null : istantaneaCatalogo(db, viaggio.istantanea);
    const mostrati = viaggiDaMostrare(db, viaggioId);
    if (mostrati === null || istantanea === null) {
      return { ...base, etichetta: "Bozza in preparazione", confermato: false, giorni: [], cambiate: 0 };
    }
    const nomi = nomiDi(istantanea);
    const giorni = giorniDi(mostrati.attuale, nomi);
    const prima = mostrati.prima === null ? null : chiaviDi(giorniDi(mostrati.prima, nomi));
    let cambiate = 0;
    const vista = giorni.map((g): GiornoDalVivo => ({
      data: g.data,
      titolo: giornoInParole(g.data),
      perche: g.perche,
      voci: g.programma.map((v) => {
        const cambiata = prima !== null && !prima.has(chiave(g.data, v));
        if (cambiata && "attivita" in v) cambiate += 1;
        return {
          id: v.id,
          orario: `${v.dalle}–${v.alle}`,
          testo: "attivita" in v ? v.attivita : `${v.spostamento} (${v.mezzo})`,
          cambiata,
          spostamento: !("attivita" in v),
        };
      }),
    }));
    return { ...base, etichetta: mostrati.etichetta, confermato: mostrati.confermato, giorni: vista, cambiate };
  });
}
