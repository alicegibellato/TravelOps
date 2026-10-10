/**
 * Il meteo di un viaggio per il controllo di fattibilità e per le viste (REQ-INTEG-001, CA-4).
 *
 * Il controllo di fattibilità del motore è sincrono e puro: qui, prima di chiamarlo, si chiede la previsione alla porta
 * Meteo (una richiesta per zona su tutto il periodo) e la si trasforma in `PrevisioneMeteo` da dare al motore con
 * `conPrevisioni`. Se il meteo non è disponibile, il controllo gira senza previsioni e il viaggiatore ne è avvisato.
 */
import type { CatalogoEsteso, Coordinate, PrevisioneMeteo, Viaggio, Zona } from "@travelops/engine";
import { previsioniDelMotore, type PrevisioneGiorno, type ServizioMeteo } from "./meteo.js";

/** La previsione di un giorno per le viste, oppure il motivo per cui manca. */
export type MeteoGiornoVista =
  | { disponibile: true; data: string; zonaId: string; zonaNome: string; origine: "finto" | "reale"; previsione: PrevisioneGiorno }
  | { disponibile: false; data: string; messaggio: string };

export interface MeteoViaggio {
  /** Previsioni nel formato del motore, per `conPrevisioni` e `controllaFattibilita`. */
  previsioni: PrevisioneMeteo[];
  perGiorno: Record<string, MeteoGiornoVista>;
  /** Frase unica per il viaggiatore se almeno una zona non ha il meteo; `null` se è tutto disponibile. */
  avviso: string | null;
}

const FRASE_PREDEFINITA = "Meteo non disponibile";

/** Le coordinate della zona; se mancano, il centro dei suoi luoghi che le hanno. */
export function coordinateZona(zona: Zona | undefined, catalogo: Pick<CatalogoEsteso, "luoghi">): Coordinate | undefined {
  if (zona === undefined) return undefined;
  if (zona.coordinate !== undefined) return zona.coordinate;
  const punti = catalogo.luoghi.flatMap((l) => (l.zonaId === zona.id && l.coordinate !== undefined ? [l.coordinate] : []));
  if (punti.length === 0) return undefined;
  const media = (k: "lat" | "lon"): number => punti.reduce((somma, p) => somma + p[k], 0) / punti.length;
  return { lat: Number(media("lat").toFixed(5)), lon: Number(media("lon").toFixed(5)) };
}

/** Le zone toccate da ogni giorno, la prima è quella "principale" (prima attività, altrimenti luogo di partenza). */
function zoneDelGiorno(viaggio: Viaggio, catalogo: CatalogoEsteso): Map<string, string[]> {
  const luoghi = new Map(catalogo.luoghi.map((l) => [l.id, l]));
  const attivita = new Map(catalogo.attivita.map((a) => [a.id, a]));
  const perGiorno = new Map<string, string[]>();
  for (const giorno of viaggio.giorni) {
    const zone: string[] = [];
    const aggiungi = (luogoId: string | undefined): void => {
      const zona = luogoId === undefined ? undefined : luoghi.get(luogoId)?.zonaId;
      if (zona !== undefined && !zone.includes(zona)) zone.push(zona);
    };
    for (const e of giorno.elementi) if (e.tipo !== "spostamento") aggiungi(attivita.get(e.attivitaId)?.luogoId);
    aggiungi(giorno.luogoPartenza);
    aggiungi(giorno.alloggio);
    perGiorno.set(giorno.data, zone);
  }
  return perGiorno;
}

export async function leggiMeteoViaggio(
  meteo: ServizioMeteo,
  viaggio: Viaggio,
  catalogo: CatalogoEsteso,
  opzioni: { segnale?: AbortSignal } = {},
): Promise<MeteoViaggio> {
  const zone = new Map<string, Zona>(catalogo.zone.map((z) => [z.id, z]));
  const delGiorno = zoneDelGiorno(viaggio, catalogo);
  const usate = [...new Set([...delGiorno.values()].flat())];
  const date = viaggio.giorni.map((g) => g.data).sort();
  const primo = date[0];
  const ultimo = date.at(-1);
  const risposte = new Map<string, { giorni: PrevisioneGiorno[] } | { messaggio: string }>();
  if (primo !== undefined && ultimo !== undefined) {
    await Promise.all(
      usate.map(async (zonaId) => {
        const coordinate = coordinateZona(zone.get(zonaId), catalogo);
        if (coordinate === undefined) {
          risposte.set(zonaId, { messaggio: `${FRASE_PREDEFINITA}: mancano le coordinate della zona` });
          return;
        }
        const r = await meteo.previsione({ coordinate, dataInizio: primo, dataFine: ultimo, ...(opzioni.segnale === undefined ? {} : { segnale: opzioni.segnale }) });
        risposte.set(zonaId, r.disponibile ? { giorni: r.dati } : { messaggio: r.messaggio });
      }),
    );
  }

  const previsioni: PrevisioneMeteo[] = [];
  const perGiorno: Record<string, MeteoGiornoVista> = {};
  const mancanti = new Set<string>();
  for (const zonaId of usate) {
    const r = risposte.get(zonaId);
    if (r !== undefined && "giorni" in r) {
      const doViaggio = r.giorni.filter((g) => delGiorno.get(g.data)?.includes(zonaId));
      previsioni.push(...previsioniDelMotore(zonaId, doViaggio));
    } else if (r !== undefined) mancanti.add(r.messaggio);
  }
  for (const giorno of viaggio.giorni) {
    const principale = delGiorno.get(giorno.data)?.[0];
    const r = principale === undefined ? undefined : risposte.get(principale);
    const trovata = r !== undefined && "giorni" in r ? r.giorni.find((g) => g.data === giorno.data) : undefined;
    if (principale !== undefined && trovata !== undefined) {
      perGiorno[giorno.data] = {
        disponibile: true,
        data: giorno.data,
        zonaId: principale,
        zonaNome: zone.get(principale)?.nome ?? principale,
        origine: meteo.modalita,
        previsione: trovata,
      };
    } else {
      const motivo = r !== undefined && "messaggio" in r ? r.messaggio : `${FRASE_PREDEFINITA} per questo giorno`;
      perGiorno[giorno.data] = { disponibile: false, data: giorno.data, messaggio: motivo };
    }
  }
  const mancanze = Object.values(perGiorno).filter((g) => !g.disponibile);
  const avviso = mancanti.size > 0 ? [...mancanti][0]! : mancanze.length > 0 ? `${FRASE_PREDEFINITA} per ${mancanze.length === 1 ? "un giorno" : `${mancanze.length} giorni`}` : null;
  return { previsioni, perGiorno, avviso };
}
