/**
 * Porte Geocoding e Percorsi (REQ-INTEG-001, CA-1).
 *
 * - `ServizioGeocoding`: da un testo alle aree di destinazione. Adattatore reale: Nominatim, tramite la sorgente reale
 *   già presente in questo pacchetto (stesso ritmo di 1 richiesta al secondo e stessa cache). Adattatore finto: le
 *   istantanee registrate.
 * - `ServizioPercorsi`: minuti (e chilometri) tra due punti a piedi o in auto. Adattatore reale: OSRM, con lo stesso
 *   cliente HTTP (`ClienteFonti`) della costruzione delle destinazioni. Adattatore finto: i tempi delle istantanee
 *   quando i due punti sono luoghi noti, altrimenti la stessa stima in linea d'aria della costruzione.
 */
import type { Coordinate } from "@travelops/engine";
import { distanzaKm, indirizzo } from "../costruzione.js";
import type { AreaDestinazione, IstantaneaDestinazione } from "../formato.js";
import { creaSorgenteReale } from "../reale.js";
import { creaSorgenteRegistrata } from "../registrata.js";
import type { ClienteFonti, Orologio, SorgenteDestinazioni } from "../sorgente.js";
import { ErroreServizio, conLimiteDiTempo, disponibile, type RisultatoServizio } from "./risultato.js";

// --- Geocoding -----------------------------------------------------------------------------------------

export interface OpzioniGeocoding {
  limite?: number;
  segnale?: AbortSignal;
}

export interface ServizioGeocoding {
  readonly modalita: "finto" | "reale";
  cerca(testo: string, opzioni?: OpzioniGeocoding): Promise<RisultatoServizio<AreaDestinazione[]>>;
}

/** Geocoding su una `SorgenteDestinazioni` (registrata o reale): la ricerca è quella della sorgente. */
function geocodingSu(sorgente: SorgenteDestinazioni, modalita: "finto" | "reale", timeoutMs: number): ServizioGeocoding {
  return {
    modalita,
    cerca: (testo, opzioni = {}) =>
      conLimiteDiTempo({ origine: modalita, soggetto: "Ricerca luoghi", timeoutMs, segnale: opzioni.segnale }, (segnale) =>
        sorgente.cercaDestinazioni(testo, { ...(opzioni.limite === undefined ? {} : { limite: opzioni.limite }), segnale }),
      ),
  };
}

export function creaGeocodingFinto(opzioni: { istantanee: readonly IstantaneaDestinazione[]; timeoutMs: number }): ServizioGeocoding {
  return geocodingSu(creaSorgenteRegistrata({ istantanee: opzioni.istantanee }), "finto", opzioni.timeoutMs);
}

export function creaGeocodingNominatim(opzioni: { cliente: ClienteFonti; userAgent: string; orologio: Orologio; timeoutMs: number }): ServizioGeocoding {
  const sorgente = creaSorgenteReale({
    cliente: opzioni.cliente,
    userAgent: opzioni.userAgent,
    orologio: opzioni.orologio,
    dataCreazione: () => new Date().toISOString().slice(0, 10),
  });
  return geocodingSu(sorgente, "reale", opzioni.timeoutMs);
}

// --- Percorsi ------------------------------------------------------------------------------------------

export type MezzoPercorso = "piedi" | "auto";

export interface RichiestaPercorso {
  da: Coordinate;
  a: Coordinate;
  mezzo: MezzoPercorso;
  segnale?: AbortSignal;
}

export interface StimaPercorso {
  minuti: number;
  /** Distanza in chilometri (in linea d'aria quando il servizio non la dà). */
  km: number;
  /** Vero se il tempo è una stima e non il risultato di un servizio di percorsi. */
  stimato: boolean;
}

export interface ServizioPercorsi {
  readonly modalita: "finto" | "reale";
  calcola(richiesta: RichiestaPercorso): Promise<RisultatoServizio<StimaPercorso>>;
}

const minutiDa = (secondi: number): number => Math.max(1, Math.round(secondi / 60));
const arrotondaKm = (km: number): number => Number(km.toFixed(2));

/** Velocità e fattore di tortuosità della stima in linea d'aria. */
const PIEDI_KM_ORA = 5;
const FATTORE_STRADA = 1.3;

/** Stima in linea d'aria: a piedi 5 km/h; in auto la stessa regola della costruzione (×1,4 a 40 km/h più 5 minuti). */
export function stimaInLineaDAria(da: Coordinate, a: Coordinate, mezzo: MezzoPercorso): StimaPercorso {
  const km = distanzaKm(da, a);
  const minuti =
    mezzo === "piedi" ? Math.max(1, Math.round(((km * FATTORE_STRADA) / PIEDI_KM_ORA) * 60)) : Math.max(1, Math.round(((km * 1.4) / 40) * 60 + 5));
  return { minuti, km: arrotondaKm(km), stimato: true };
}

/** Distanza massima, in chilometri, entro cui un punto coincide con un luogo dell'istantanea (100 m). */
const RAGGIO_LUOGO_KM = 0.1;

export function creaPercorsiFinto(opzioni: { istantanee?: readonly IstantaneaDestinazione[] } = {}): ServizioPercorsi {
  const luoghiNoti = (opzioni.istantanee ?? []).flatMap((i) =>
    i.luoghi.flatMap((l) => (l.coordinate === undefined ? [] : [{ istantanea: i, id: l.id, coordinate: l.coordinate }])),
  );
  const luogoVicino = (punto: Coordinate) => luoghiNoti.find((l) => distanzaKm(l.coordinate, punto) <= RAGGIO_LUOGO_KM);
  return {
    modalita: "finto",
    async calcola({ da, a, mezzo, segnale }) {
      if (segnale?.aborted) return { disponibile: false, origine: "finto", motivo: "annullato", messaggio: "Percorsi non disponibili: richiesta annullata" };
      const x = luogoVicino(da);
      const y = luogoVicino(a);
      if (x !== undefined && y !== undefined && x.istantanea === y.istantanea) {
        const tempo = x.istantanea.tempiPercorrenza.find(
          (t) => t.mezzo === (mezzo === "piedi" ? "piedi" : "auto") && ((t.da === x.id && t.a === y.id) || (t.da === y.id && t.a === x.id)),
        );
        if (tempo !== undefined) return disponibile({ minuti: tempo.minuti, km: arrotondaKm(distanzaKm(da, a)), stimato: false }, "finto");
      }
      return disponibile(stimaInLineaDAria(da, a, mezzo), "finto");
    },
  };
}

const eOggetto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const coppia = (c: Coordinate): string => `${c.lon.toFixed(5)},${c.lat.toFixed(5)}`;

export function creaPercorsiOsrm(opzioni: { cliente: ClienteFonti; urlAuto: string; urlPiedi: string; timeoutMs: number }): ServizioPercorsi {
  return {
    modalita: "reale",
    calcola({ da, a, mezzo, segnale }) {
      const base = mezzo === "piedi" ? opzioni.urlPiedi : opzioni.urlAuto;
      const url = indirizzo(`${base}${coppia(da)};${coppia(a)}`, { annotations: "duration", destinations: "1", sources: "0" });
      return conLimiteDiTempo({ origine: "reale", soggetto: "Servizio percorsi", timeoutMs: opzioni.timeoutMs, segnale }, async (limite) => {
        const risposta = await opzioni.cliente.richiedi({ servizio: "osrm", url }, { segnale: limite });
        if (risposta.stato >= 500) throw new ErroreServizio("rete", "il servizio non risponde");
        const corpo = risposta.corpo;
        if (risposta.stato !== 200 || !eOggetto(corpo)) throw new ErroreServizio("richiesta_rifiutata", "percorso non disponibile");
        const durate = corpo["durations"];
        const secondi = corpo["code"] === "Ok" && Array.isArray(durate) && Array.isArray(durate[0]) ? (durate[0] as unknown[])[0] : undefined;
        if (typeof secondi !== "number" || !Number.isFinite(secondi)) throw new ErroreServizio("richiesta_rifiutata", "nessun percorso tra i due luoghi");
        return { minuti: minutiDa(secondi), km: arrotondaKm(distanzaKm(da, a)), stimato: false };
      });
    },
  };
}
