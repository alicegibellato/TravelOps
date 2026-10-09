/**
 * Costruisce con la sorgente reale (rete) le 3 destinazioni precaricate della §8.1 e le salva in `snapshots/`,
 * insieme alle risposte delle fonti ridotte a ciò che serve (`registrazioni/precaricate.json`): con quelle la
 * stessa costruzione, senza rete, dà esattamente le istantanee del repository (CA-1).
 *
 *   npm run istantanee --workspace @travelops/sources            # le 3 precaricate
 *   npm run istantanee --workspace @travelops/sources -- --prova Lisbona   # solo una prova, nulla su disco
 *
 * Regole d'uso: 1 richiesta al secondo per servizio (Nominatim compreso), User-Agent di TravelOps, cache su disco in
 * `packages/sources/.cache/` (ignorata da git), così rilanciare lo script non torna in rete.
 */
import { isDeepStrictEqual } from "node:util";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  controllaMinimi,
  creaClienteHttp,
  creaClienteRegistrato,
  creaClienteRegistratore,
  creaSorgenteReale,
  DATA_ISTANTANEE_PRECARICATE,
  DESTINAZIONI_PRECARICATE,
  TAG_USATI,
  type AreaDestinazione,
  type ClienteFonti,
  type DestinazionePrecaricata,
  type IstantaneaDestinazione,
  type Orologio,
  type RicercaRegistrata,
  type RispostaRegistrata,
} from "../src/index.js";

const PACCHETTO = fileURLToPath(new URL("..", import.meta.url));
export const USER_AGENT = "TravelOps/0.1 (assistente di viaggio dimostrativo; https://github.com/alicegibellato/TravelOps)";

const orologioVero: Orologio = {
  adesso: () => performance.now(),
  attendi: (ms) => new Promise((r) => setTimeout(r, ms)),
};

type Oggetto = Record<string, unknown>;
const eOggetto = (v: unknown): v is Oggetto => typeof v === "object" && v !== null && !Array.isArray(v);

/** Il testo del file di un'istantanea: JSON con rientro, un tempo di percorrenza per riga. */
export function testoIstantanea(istantanea: IstantaneaDestinazione): string {
  const { tempiPercorrenza, ...resto } = istantanea;
  const testa = JSON.stringify({ ...resto, tempiPercorrenza: "__TEMPI__" }, null, 2);
  const tempi = tempiPercorrenza.map((t) => `    ${JSON.stringify(t)}`).join(",\n");
  return `${testa.replace('"__TEMPI__"', tempiPercorrenza.length === 0 ? "[]" : `[\n${tempi}\n  ]`)}\n`;
}

/** Riduce le risposte registrate a ciò che la costruzione legge, per i luoghi delle istantanee costruite. */
function riduci(r: RispostaRegistrata, osmIds: ReadonlySet<string>): RispostaRegistrata {
  const { richiesta, risposta } = r;
  let corpo = risposta.corpo;
  if (typeof corpo === "string") corpo = corpo.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
  else if (richiesta.servizio === "overpass" && eOggetto(corpo) && Array.isArray(corpo["elements"])) {
    corpo = {
      elements: corpo["elements"].filter(eOggetto).flatMap((e) => {
        if (!osmIds.has(`${String(e["type"])}/${String(e["id"])}`)) return [];
        const tags = eOggetto(e["tags"]) ? Object.fromEntries(Object.entries(e["tags"]).filter(([k]) => TAG_USATI.has(k))) : {};
        const { type, id, lat, lon, center } = e;
        return [{ type, id, ...(lat !== undefined ? { lat, lon } : {}), ...(center !== undefined ? { center } : {}), tags }];
      }),
    };
  } else if (richiesta.servizio === "osrm" && eOggetto(corpo)) {
    corpo = { code: corpo["code"], durations: corpo["durations"] };
  } else if (richiesta.servizio === "nominatim" && Array.isArray(corpo)) {
    corpo = corpo.filter(eOggetto).map(({ osm_type, osm_id, lat, lon, name, display_name }) => ({ osm_type, osm_id, lat, lon, name, display_name }));
  } else if ((richiesta.servizio === "wikipedia" || richiesta.servizio === "wikivoyage" || richiesta.servizio === "commons") && eOggetto(corpo)) {
    const query = eOggetto(corpo["query"]) ? corpo["query"] : {};
    const pagine = (Array.isArray(query["pages"]) ? query["pages"] : []).filter(eOggetto).map((p) => {
      const tenuti: Oggetto = {};
      for (const k of ["title", "missing", "invalid", "extract", "pageimage", "langlinks"]) if (p[k] !== undefined) tenuti[k] = p[k];
      if (Array.isArray(p["imageinfo"])) {
        tenuti["imageinfo"] = p["imageinfo"].filter(eOggetto).map((i) => ({
          url: i["url"],
          thumburl: i["thumburl"],
          descriptionurl: i["descriptionurl"],
          extmetadata: i["extmetadata"],
        }));
      }
      return tenuti;
    });
    corpo = {
      query: {
        ...(query["normalized"] !== undefined ? { normalized: query["normalized"] } : {}),
        ...(query["redirects"] !== undefined ? { redirects: query["redirects"] } : {}),
        pages: pagine,
      },
    };
  }
  return { richiesta, risposta: { stato: risposta.stato, corpo: JSON.parse(JSON.stringify(corpo ?? null)) as unknown } };
}

async function prova(testo: string): Promise<void> {
  const cliente = creaClienteHttp({ userAgent: USER_AGENT, cartellaCache: join(PACCHETTO, ".cache") });
  const sorgente = creaSorgenteReale({ cliente, userAgent: USER_AGENT, orologio: orologioVero, dataCreazione: () => DATA_ISTANTANEE_PRECARICATE });
  const inizio = performance.now();
  const [area] = await sorgente.cercaDestinazioni(testo);
  if (area === undefined) throw new Error(`nessun risultato per ${testo}`);
  const esito = await sorgente.costruisciIstantanea(area, { avanzamento: (a) => console.log(`  ${a.numero}/${a.totale} ${a.messaggio}`) });
  const secondi = ((performance.now() - inizio) / 1000).toFixed(1);
  if (!esito.ok) {
    console.log(`${testo}: ${esito.motivo} in ${secondi} s: ${esito.messaggio}`);
    return;
  }
  console.log(`${testo} (${area.id}): istantanea ${esito.istantanea.id} in ${secondi} s`, controllaMinimi(esito.istantanea).conteggi);
}

/**
 * Costruisce una destinazione precaricata con la rete, annotando le risposte. Se Overpass è occupato (le risposte
 * non riuscite non vanno in cache) riprova dopo una pausa, con un registratore nuovo.
 */
async function costruisciPrecaricata(
  d: DestinazionePrecaricata,
  cliente: ClienteFonti,
): Promise<{ istantanea: IstantaneaDestinazione; aree: AreaDestinazione[]; registrazioni: RispostaRegistrata[] }> {
  for (let tentativo = 1; ; tentativo++) {
    const registratore = creaClienteRegistratore(cliente);
    const sorgente = creaSorgenteReale({ cliente: registratore, userAgent: USER_AGENT, orologio: orologioVero, dataCreazione: () => DATA_ISTANTANEE_PRECARICATE });
    const inizio = performance.now();
    const aree = await sorgente.cercaDestinazioni(d.ricerca);
    const area = aree.find((a) => a.id === d.areaId);
    if (area === undefined) throw new Error(`${d.ricerca}: l'area ${d.areaId} non è tra i risultati (${aree.map((a) => a.id).join(", ")})`);
    const esito = await sorgente.costruisciIstantanea(area, { avanzamento: (a) => console.log(`  ${d.idBase} ${a.numero}/${a.totale} ${a.messaggio}`) });
    if (!esito.ok && esito.motivo === "non_disponibile" && tentativo < 5) {
      console.log(`  ${d.idBase}: Overpass non risponde, riprovo tra 30 s`);
      await orologioVero.attendi(30_000);
      continue;
    }
    if (!esito.ok) throw new Error(`${d.ricerca}: ${esito.motivo}: ${esito.messaggio} ${"mancanze" in esito ? JSON.stringify(esito.mancanze) : ""}`);
    const secondi = ((performance.now() - inizio) / 1000).toFixed(1);
    console.log(`${esito.istantanea.id}: ${secondi} s`, controllaMinimi(esito.istantanea).conteggi, esito.istantanea.stiliScarsi ?? []);
    return { istantanea: esito.istantanea, aree, registrazioni: registratore.registrazioni() };
  }
}

async function principale(): Promise<void> {
  const i = process.argv.indexOf("--prova");
  if (i >= 0) return prova(process.argv[i + 1] ?? "Lisbona");

  const cliente = creaClienteHttp({ userAgent: USER_AGENT, cartellaCache: join(PACCHETTO, ".cache") });
  const istantanee: IstantaneaDestinazione[] = [];
  const ricerche: RicercaRegistrata[] = [];
  const risposte = new Map<string, RispostaRegistrata>();
  for (const d of DESTINAZIONI_PRECARICATE) {
    const { istantanea, aree, registrazioni } = await costruisciPrecaricata(d, cliente);
    ricerche.push({ testo: d.ricerca, risultati: aree });
    istantanee.push(istantanea);
    for (const r of registrazioni) {
      const k = JSON.stringify(r.richiesta);
      const prima = risposte.get(k);
      if (prima !== undefined && !isDeepStrictEqual(prima.risposta, r.risposta)) throw new Error(`risposte diverse per ${k}`);
      risposte.set(k, r);
    }
  }

  const osmIds = new Set(istantanee.flatMap((i) => i.luoghi.map((l) => l.osmId ?? "")));
  const ridotte = [...risposte.values()].map((r) => riduci(r, osmIds));
  // Verifica: con le sole risposte ridotte, senza rete, la costruzione dà le stesse istantanee.
  const registrato = creaClienteRegistrato(ridotte);
  const finto = { t: 0 };
  const orologioFinto: Orologio = { adesso: () => finto.t, attendi: async (ms) => void (finto.t += ms) };
  for (const istantanea of istantanee) {
    const sorgente = creaSorgenteReale({ cliente: registrato, userAgent: USER_AGENT, orologio: orologioFinto, dataCreazione: () => DATA_ISTANTANEE_PRECARICATE });
    const esito = await sorgente.costruisciIstantanea(istantanea.area);
    if (!esito.ok || !isDeepStrictEqual(JSON.parse(JSON.stringify(esito.istantanea)), JSON.parse(JSON.stringify(istantanea)))) {
      throw new Error(`${istantanea.id}: la costruzione dalle risposte ridotte non dà la stessa istantanea`);
    }
  }

  const cartella = join(PACCHETTO, "snapshots");
  for (const istantanea of istantanee) writeFileSync(join(cartella, `${istantanea.id}.json`), testoIstantanea(istantanea));
  mkdirSync(join(PACCHETTO, "registrazioni"), { recursive: true });
  const righe = ridotte.map((r) => `    ${JSON.stringify(r)}`).join(",\n");
  const ric = JSON.stringify(ricerche, null, 2).replace(/\n/g, "\n  ");
  writeFileSync(join(PACCHETTO, "registrazioni", "precaricate.json"), `{\n  "formato": 1,\n  "ricerche": ${ric},\n  "risposte": [\n${righe}\n  ]\n}\n`);
  console.log(`scritte ${istantanee.length} istantanee e ${ridotte.length} risposte registrate`);
}

await principale();
