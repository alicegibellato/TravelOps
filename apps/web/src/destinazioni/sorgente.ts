/**
 * La sorgente delle destinazioni della web app. Di predefinito è la realizzazione registrata (nessuna rete), sulle
 * istantanee salvate nel database locale (quelle del repository, caricate al primo avvio). Con `TRAVELOPS_GEOCODING=reale`
 * (o `TRAVELOPS_PERCORSI=reale`, da cui il geocoding dipende se non è indicato) è la sorgente reale di ST-CAT-002: ricerca
 * con Nominatim e costruzione con Overpass, Wikipedia, Commons e OSRM (REQ-INTEG-001). Azioni e componenti parlano con
 * l'interfaccia `SorgenteDestinazioni`.
 */
import {
  creaSorgenteDestinazioniReale,
  creaSorgenteRegistrata,
  leggiConfigurazioneServizi,
  leggiIstantaneaOppureErrore,
  type Ambiente,
  type EsitoCostruzione,
  type IstantaneaDestinazione,
  type SorgenteDestinazioni,
} from "@travelops/sources";
import { elencaIstantanee, leggiIstantanea as leggiIstantaneaSalvata } from "../basedati";
import { cartellaDati } from "../stato/archivio";
import { usaBaseDati } from "../stato/avvio";
import { SUFFISSO_ISTANTANEA_DEMO } from "../stato/viaggi-demo-bozza";

function istantaneeSalvate(cartella: string): IstantaneaDestinazione[] {
  return usaBaseDati(cartella, (db) =>
    elencaIstantanee(db)
      .filter(({ id }) => !id.endsWith(SUFFISSO_ISTANTANEA_DEMO))
      .flatMap(({ id }) => {
        const salvata = leggiIstantaneaSalvata(db, id);
        return salvata === null ? [] : [leggiIstantaneaOppureErrore(salvata.contenuto)];
      }),
  );
}

/** La sorgente reale è una per processo: tiene il ritmo di 1 richiesta al secondo verso Nominatim e le sue cache. */
let reale: SorgenteDestinazioni | null = null;

function sorgenteReale(cartella: string, userAgent: string): SorgenteDestinazioni {
  reale ??= creaSorgenteDestinazioniReale({
    userAgent,
    istantaneeNote: (areaId) => istantaneeSalvate(cartella).find((i) => i.area.id === areaId) ?? null,
  });
  return reale;
}

/**
 * ST-QA-FIX-002: le destinazioni reali sono quelle di serie della web app. Restano finte solo se lo si chiede
 * (`TRAVELOPS_GEOCODING=finto`, o `TRAVELOPS_PERCORSI=finto` senza geocoding indicato) e nei test, che non escono
 * mai in rete.
 */
export function destinazioniReali(ambiente: Ambiente = process.env): boolean {
  const scelta = ambiente.TRAVELOPS_GEOCODING?.trim() || ambiente.TRAVELOPS_PERCORSI?.trim();
  if (scelta !== undefined && scelta !== "") return leggiConfigurazioneServizi(ambiente).modalita.geocoding === "reale";
  return ambiente.VITEST === undefined && ambiente.NODE_ENV !== "test";
}

const nomeNormalizzato = (nome: string): string =>
  nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .trim();

/**
 * ST-QA-FIX-002 (collaudo TO-021): la sorgente reale affiancata dalle destinazioni già pronte. Le pronte vengono prima
 * nella ricerca e non si ricostruiscono; se la costruzione reale fallisce (per esempio Overpass non risponde) e c'è
 * una destinazione pronta con lo stesso nome, si usa quella; altrimenti l'esito dice che il servizio non risponde.
 */
export function sorgenteConPronte(reale: SorgenteDestinazioni, pronte: SorgenteDestinazioni): SorgenteDestinazioni {
  const prontaPerNome = async (nome: string) => {
    const cercato = nomeNormalizzato(nome);
    return (await pronte.elencaIstantanee()).find((r) =>
      [r.area.nome, r.destinazione].map(nomeNormalizzato).some((n) => n === cercato || n.startsWith(cercato) || cercato.startsWith(n)),
    );
  };
  return {
    tipo: "reale",
    async cercaDestinazioni(testo, opzioni) {
      const locali = await pronte.cercaDestinazioni(testo, opzioni);
      const remoti = await reale.cercaDestinazioni(testo, opzioni).catch(() => []);
      const visti = new Set(locali.map((a) => nomeNormalizzato(a.nome)));
      const uniti = [...locali, ...remoti.filter((a) => !visti.has(nomeNormalizzato(a.nome)))];
      return opzioni?.limite === undefined ? uniti : uniti.slice(0, opzioni.limite);
    },
    async costruisciIstantanea(area, opzioni) {
      if ((await pronte.elencaIstantanee()).some((r) => r.area.id === area.id)) return pronte.costruisciIstantanea(area, opzioni);
      const esito = await reale.costruisciIstantanea(area, opzioni).catch(
        (): EsitoCostruzione => ({ ok: false, motivo: "non_disponibile", messaggio: "Il servizio delle mappe non risponde in questo momento." }),
      );
      if (esito.ok || esito.motivo !== "non_disponibile") return esito;
      const pronta = await prontaPerNome(area.nome);
      return pronta === undefined ? esito : pronte.costruisciIstantanea(pronta.area, opzioni);
    },
    async leggiIstantanea(id) {
      return (await pronte.leggiIstantanea(id)) ?? reale.leggiIstantanea(id);
    },
    async elencaIstantanee() {
      const tutte = [...(await pronte.elencaIstantanee()), ...(await reale.elencaIstantanee().catch(() => []))];
      return [...new Map(tutte.map((r) => [r.id, r])).values()].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
    },
  };
}

export function sorgenteDestinazioniLocale(cartella: string = cartellaDati(), ambiente: Ambiente = process.env): SorgenteDestinazioni {
  const pronte = creaSorgenteRegistrata({ istantanee: istantaneeSalvate(cartella) });
  if (!destinazioniReali(ambiente)) return pronte;
  return sorgenteConPronte(sorgenteReale(cartella, leggiConfigurazioneServizi(ambiente).userAgent), pronte);
}
