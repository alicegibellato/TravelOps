/**
 * Il cliente HTTP della sorgente reale (REQ-CAT-002 §5.3): l'unico punto del pacchetto che usa la rete.
 *
 * - manda sempre lo User-Agent che identifica TravelOps (obbligatorio per Nominatim);
 * - tiene in cache ogni risposta riuscita, in memoria e, se si indica una cartella, su disco: la stessa richiesta
 *   non torna mai in rete (regole d'uso di Nominatim, Overpass e OSRM);
 * - interrompe le richieste troppo lente (`timeoutMs`), così una fonte che non risponde non blocca la costruzione.
 *
 * Il ritmo delle richieste (1 al secondo verso Nominatim) non è qui ma nella sorgente reale, che ha l'orologio.
 * Nei test al suo posto c'è `creaClienteRegistrato` (CA-7); per preparare le registrazioni c'è
 * `creaClienteRegistratore`, che avvolge un cliente e annota richieste e risposte.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { RispostaRegistrata } from "./registrata.js";
import type { ClienteFonti, RichiestaFonte, RispostaFonte } from "./sorgente.js";

export interface OpzioniClienteHttp {
  /** User-Agent che identifica TravelOps, per esempio `TravelOps/0.1 (+https://…)`. */
  userAgent: string;
  /** Cartella della cache su disco; senza, la cache è solo in memoria. */
  cartellaCache?: string;
  /** Tempo massimo di una richiesta, in millisecondi (predefinito 60 000). */
  timeoutMs?: number;
}

const chiave = (r: RichiestaFonte): string => JSON.stringify([r.servizio, r.metodo ?? "GET", r.url, r.corpo ?? null]);

/** Corpo di una risposta: JSON decodificato, oppure il testo così com'è se non è JSON (per esempio un errore HTML). */
function decodifica(testo: string): unknown {
  try {
    return JSON.parse(testo) as unknown;
  } catch {
    return testo;
  }
}

/**
 * Crea il cliente HTTP reale. Una risposta con stato diverso da 200 non va in cache (la fonte potrebbe essere solo
 * occupata); un errore di rete o un tempo scaduto solleva un'eccezione, che la sorgente tratta come fonte che non
 * risponde.
 */
export function creaClienteHttp(opzioni: OpzioniClienteHttp): ClienteFonti {
  if (!/travelops/i.test(opzioni.userAgent)) throw new Error("lo User-Agent deve identificare TravelOps");
  const memoria = new Map<string, RispostaFonte>();
  const timeoutMs = opzioni.timeoutMs ?? 60_000;
  const fileCache = (k: string): string | undefined =>
    opzioni.cartellaCache === undefined ? undefined : join(opzioni.cartellaCache, `${createHash("sha256").update(k).digest("hex")}.json`);

  return {
    async richiedi(richiesta: RichiestaFonte, extra: { segnale?: AbortSignal } = {}): Promise<RispostaFonte> {
      const k = chiave(richiesta);
      const inMemoria = memoria.get(k);
      if (inMemoria !== undefined) return structuredClone(inMemoria);
      const file = fileCache(k);
      if (file !== undefined && existsSync(file)) {
        const salvata = JSON.parse(readFileSync(file, "utf8")) as RispostaFonte;
        memoria.set(k, salvata);
        return structuredClone(salvata);
      }
      // Overpass: la query dei luoghi di una città grande (per esempio Amsterdam) dichiara fino a 90 s lato server;
      // con il limite generale delle chiamate (8 s) veniva interrotta su tutti i server e la destinazione risultava
      // "non raggiungibile".
      const limite = richiesta.servizio === "overpass" ? Math.max(timeoutMs, 90_000) : timeoutMs;
      const segnali = [AbortSignal.timeout(limite), ...(extra.segnale !== undefined ? [extra.segnale] : [])];
      const metodo = richiesta.metodo ?? "GET";
      const intestazioni: Record<string, string> = { "User-Agent": opzioni.userAgent, Accept: "application/json" };
      let corpo: string | undefined;
      if (metodo === "POST" && richiesta.corpo !== undefined) {
        // Overpass: la query viaggia come modulo `data=…`; nelle registrazioni resta la query in chiaro.
        corpo = richiesta.servizio === "overpass" ? new URLSearchParams({ data: richiesta.corpo }).toString() : richiesta.corpo;
        intestazioni["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
      }
      const risposta = await fetch(richiesta.url, {
        method: metodo,
        headers: intestazioni,
        ...(corpo !== undefined ? { body: corpo } : {}),
        signal: AbortSignal.any(segnali),
      });
      const esito: RispostaFonte = { stato: risposta.status, corpo: decodifica(await risposta.text()) };
      const parziale = typeof esito.corpo === "object" && esito.corpo !== null && /error/i.test(String((esito.corpo as Record<string, unknown>)["remark"] ?? ""));
      if (esito.stato === 200 && typeof esito.corpo !== "string" && !parziale) {
        memoria.set(k, esito);
        if (file !== undefined && opzioni.cartellaCache !== undefined) {
          mkdirSync(opzioni.cartellaCache, { recursive: true });
          writeFileSync(file, JSON.stringify(esito));
        }
      }
      return structuredClone(esito);
    },
  };
}

/** Un cliente che registra: passa le richieste a `cliente` e annota ogni richiesta con la sua risposta. */
export interface ClienteRegistratore extends ClienteFonti {
  /** Le richieste fatte finora, una volta sola ciascuna, nell'ordine; le eccezioni non vengono annotate. */
  registrazioni(): RispostaRegistrata[];
}

export function creaClienteRegistratore(cliente: ClienteFonti): ClienteRegistratore {
  const annotate = new Map<string, RispostaRegistrata>();
  return {
    async richiedi(richiesta, extra) {
      const risposta = await cliente.richiedi(richiesta, extra);
      const k = chiave(richiesta);
      if (!annotate.has(k)) annotate.set(k, { richiesta: structuredClone(richiesta), risposta: structuredClone(risposta) });
      return risposta;
    },
    registrazioni: () => [...annotate.values()].map((r) => structuredClone(r)),
  };
}
