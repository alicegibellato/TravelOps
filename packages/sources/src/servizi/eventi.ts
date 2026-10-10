/**
 * Porta Eventi (REQ-INTEG-001, CA-1): eventi locali (mostre, concerti, mercati) vicino a un punto in un intervallo di date.
 *
 * - `ServizioEventi`: la porta. `ProviderEventi`: l'interfaccia per un fornitore reale, ancora da scegliere.
 * - `creaEventiFinto`: eventi di esempio deterministici, marcati come tali.
 */
import type { Coordinate } from "@travelops/engine";
import { hashTesto } from "./meteo.js";
import { conLimiteDiTempo, nonDisponibile, type RisultatoServizio } from "./risultato.js";

export interface RichiestaEventi {
  coordinate: Coordinate;
  /** `AAAA-MM-GG`, inclusa. */
  dataInizio: string;
  dataFine: string;
  /** Raggio di ricerca in chilometri (predefinito 20). */
  raggioKm?: number;
  segnale?: AbortSignal;
}

export type CategoriaEvento = "musica" | "arte" | "cibo" | "sport" | "famiglia" | "altro";

export interface Evento {
  id: string;
  titolo: string;
  data: string;
  inizio: string | null;
  fine: string | null;
  luogo: string;
  categoria: CategoriaEvento;
  url?: string;
}

export interface EsitoEventi {
  eventi: Evento[];
  esempio: boolean;
}

export interface ProviderEventi {
  cerca(richiesta: RichiestaEventi & { segnale: AbortSignal }): Promise<Evento[]>;
}

export interface ServizioEventi {
  readonly modalita: "finto" | "reale";
  cerca(richiesta: RichiestaEventi): Promise<RisultatoServizio<EsitoEventi>>;
}

const MODELLI: readonly { titolo: string; categoria: CategoriaEvento; inizio: string; fine: string }[] = [
  { titolo: "Mercato locale (esempio)", categoria: "cibo", inizio: "08:00", fine: "13:00" },
  { titolo: "Concerto in piazza (esempio)", categoria: "musica", inizio: "21:00", fine: "23:00" },
  { titolo: "Mostra temporanea (esempio)", categoria: "arte", inizio: "10:00", fine: "18:00" },
];

function giorniDa(inizio: string, fine: string): string[] {
  const data = new Date(`${inizio}T00:00:00Z`);
  const ultima = new Date(`${fine}T00:00:00Z`);
  const elenco: string[] = [];
  while (data <= ultima && elenco.length < 60) {
    elenco.push(data.toISOString().slice(0, 10));
    data.setUTCDate(data.getUTCDate() + 1);
  }
  return elenco;
}

export function creaEventiFinto(opzioni: { timeoutMs: number }): ServizioEventi {
  return {
    modalita: "finto",
    cerca(richiesta) {
      return conLimiteDiTempo({ origine: "finto", soggetto: "Servizio eventi", timeoutMs: opzioni.timeoutMs, segnale: richiesta.segnale }, async () => {
        const punto = `${richiesta.coordinate.lat.toFixed(1)},${richiesta.coordinate.lon.toFixed(1)}`;
        const eventi = giorniDa(richiesta.dataInizio, richiesta.dataFine).flatMap((data): Evento[] => {
          const modello = MODELLI[hashTesto(`${punto}|${data}`) % (MODELLI.length + 2)];
          if (modello === undefined) return [];
          return [{ id: `esempio-${data}`, titolo: modello.titolo, data, inizio: modello.inizio, fine: modello.fine, luogo: "Centro storico", categoria: modello.categoria }];
        });
        return { eventi, esempio: true };
      });
    },
  };
}

export function creaEventiReale(opzioni: { provider?: ProviderEventi | undefined; timeoutMs: number }): ServizioEventi {
  return {
    modalita: "reale",
    async cerca(richiesta) {
      if (opzioni.provider === undefined) return nonDisponibile("reale", "non_configurato", "Eventi non disponibili: nessun fornitore di eventi è configurato");
      const provider = opzioni.provider;
      return conLimiteDiTempo({ origine: "reale", soggetto: "Servizio eventi", timeoutMs: opzioni.timeoutMs, segnale: richiesta.segnale }, async (segnale) => ({
        eventi: await provider.cerca({ ...richiesta, segnale }),
        esempio: false,
      }));
    },
  };
}
