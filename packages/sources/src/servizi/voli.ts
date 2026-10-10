/**
 * Porta Voli (REQ-INTEG-001, CA-1). TravelOps non prenota mai: offre orari indicativi e un link di ricerca.
 *
 * - `ServizioVoli`: la porta. `cerca` restituisce sempre il link di ricerca; gli orari ci sono solo se il fornitore li dà.
 * - `ProviderVoli`: l'interfaccia che un fornitore reale (una GDS, un'API di tariffe) dovrà realizzare. Non ce n'è ancora uno:
 *   con `TRAVELOPS_VOLI=reale` e nessun provider iniettato il risultato è "non disponibile" ma il link di ricerca resta.
 * - `creaVoliFinto`: orari plausibili e deterministici, marcati come esempio.
 */
import { INDIRIZZO_RICERCA_VOLI } from "@travelops/engine";
import { hashTesto } from "./meteo.js";
import { conLimiteDiTempo, disponibile, nonDisponibile, type RisultatoServizio } from "./risultato.js";

export interface RichiestaVoli {
  /** Città o codice IATA di partenza, per esempio `MXP`. */
  origine: string;
  destinazione: string;
  /** `AAAA-MM-GG`. */
  data: string;
  passeggeri?: number;
  segnale?: AbortSignal;
}

export interface Volo {
  compagnia: string;
  numero: string;
  /** Orari locali `HH:MM`. */
  partenza: string;
  arrivo: string;
  durataMinuti: number;
  /** Prezzo indicativo a persona, se il fornitore lo dà. */
  prezzoIndicativo?: { importo: number; valuta: string };
}

export interface EsitoVoli {
  voli: Volo[];
  /** Ricerca sul sito di confronto: l'unico modo, per ora, di vedere disponibilità e prezzi veri. */
  linkRicerca: string;
  /** Vero se gli orari sono un esempio e non vengono da un fornitore. */
  esempio: boolean;
}

/** Quello che un fornitore reale deve saper fare. */
export interface ProviderVoli {
  cerca(richiesta: RichiestaVoli & { segnale: AbortSignal }): Promise<Volo[]>;
}

export interface ServizioVoli {
  readonly modalita: "finto" | "reale";
  cerca(richiesta: RichiestaVoli): Promise<RisultatoServizio<EsitoVoli>>;
}

/** Il link di ricerca voli, costruito dal motore (`INDIRIZZO_RICERCA_VOLI`), senza dati personali. */
export function linkRicercaVoli(r: Pick<RichiestaVoli, "origine" | "destinazione" | "data">): string {
  return `${INDIRIZZO_RICERCA_VOLI}${encodeURIComponent(`Voli da ${r.origine} a ${r.destinazione} il ${r.data}`)}`;
}

const COMPAGNIE: readonly { nome: string; sigla: string }[] = [
  { nome: "Compagnia di esempio A", sigla: "TA" },
  { nome: "Compagnia di esempio B", sigla: "TB" },
  { nome: "Compagnia di esempio C", sigla: "TC" },
];
const FASCE_PARTENZA = [7 * 60 + 15, 11 * 60 + 40, 15 * 60 + 5, 19 * 60 + 30] as const;
const hhmm = (minuti: number): string => `${String(Math.floor(minuti / 60) % 24).padStart(2, "0")}:${String(minuti % 60).padStart(2, "0")}`;

export function creaVoliFinto(opzioni: { timeoutMs: number }): ServizioVoli {
  return {
    modalita: "finto",
    cerca(richiesta) {
      return conLimiteDiTempo({ origine: "finto", soggetto: "Servizio voli", timeoutMs: opzioni.timeoutMs, segnale: richiesta.segnale }, async () => {
        const seme = hashTesto(`${richiesta.origine}|${richiesta.destinazione}|${richiesta.data}`);
        const durata = 70 + (seme % 8) * 15;
        const voli = FASCE_PARTENZA.map((partenza, i): Volo => {
          const compagnia = COMPAGNIE[(seme + i) % COMPAGNIE.length] ?? COMPAGNIE[0]!;
          return {
            compagnia: compagnia.nome,
            numero: `${compagnia.sigla}${100 + ((seme >> i) % 900)}`,
            partenza: hhmm(partenza),
            arrivo: hhmm(partenza + durata),
            durataMinuti: durata,
            prezzoIndicativo: { importo: 59 + ((seme >> (i + 3)) % 140), valuta: "EUR" },
          };
        });
        return { voli, linkRicerca: linkRicercaVoli(richiesta), esempio: true };
      });
    },
  };
}

export function creaVoliReale(opzioni: { provider?: ProviderVoli | undefined; timeoutMs: number }): ServizioVoli {
  return {
    modalita: "reale",
    async cerca(richiesta) {
      if (opzioni.provider === undefined) {
        return nonDisponibile("reale", "non_configurato", "Voli non disponibili: nessun fornitore di orari è configurato (resta il link di ricerca)");
      }
      const provider = opzioni.provider;
      return conLimiteDiTempo({ origine: "reale", soggetto: "Servizio voli", timeoutMs: opzioni.timeoutMs, segnale: richiesta.segnale }, async (segnale) => ({
        voli: await provider.cerca({ ...richiesta, segnale }),
        linkRicerca: linkRicercaVoli(richiesta),
        esempio: false,
      }));
    },
  };
}
