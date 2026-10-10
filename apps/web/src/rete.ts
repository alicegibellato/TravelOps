/**
 * Unica integrazione esterna della web app: le tessere della mappa di OpenStreetMap (REQ-WEB-001, CA-6).
 * Tutto il resto (dati, script, stili) arriva dalla web app stessa. La politica di sicurezza dei
 * contenuti (CSP) lo fa rispettare anche al browser: qualunque altra chiamata di rete viene bloccata.
 */

/** Origine delle tessere di OpenStreetMap. */
export const ORIGINE_TESSERE_OSM = "https://tile.openstreetmap.org";

/** Modello dell'indirizzo delle tessere, nel formato di Leaflet. */
export const URL_TESSERE_OSM = `${ORIGINE_TESSERE_OSM}/{z}/{x}/{y}.png`;

/** Attribuzione richiesta dalla licenza dei dati di OpenStreetMap (è un link, non una chiamata). */
export const ATTRIBUZIONE_OSM =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">contributori di OpenStreetMap</a>';

/** Livello di ingrandimento massimo offerto dalle tessere di OpenStreetMap. */
export const ZOOM_MASSIMO_OSM = 19;

/**
 * La politica di sicurezza dei contenuti della web app.
 * - `connect-src 'self'`: il codice della pagina non può chiamare altri siti; in sviluppo resta
 *   ammessa la connessione alla dev server per il ricaricamento a caldo, che è sulla stessa origine.
 * - `img-src`: oltre alle immagini della web app, solo le tessere di OpenStreetMap.
 * - In sviluppo React e Next.js hanno bisogno di `eval` per gli strumenti di debug.
 */
export function politicaSicurezzaContenuti(sviluppo: boolean): string {
  const direttive: [string, string[]][] = [
    ["default-src", ["'self'"]],
    ["script-src", ["'self'", "'unsafe-inline'", ...(sviluppo ? ["'unsafe-eval'"] : [])]],
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", ["'self'", "data:", "blob:", ORIGINE_TESSERE_OSM]],
    ["font-src", ["'self'"]],
    ["connect-src", ["'self'"]],
    ["frame-src", ["'none'"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["frame-ancestors", ["'none'"]],
  ];
  return direttive.map(([nome, valori]) => `${nome} ${valori.join(" ")}`).join("; ");
}

/** Attribuzione dei dati e della mappa di OpenStreetMap da mostrare nel testo della pagina (REQ-CAT-002). */
export const TESTO_ATTRIBUZIONE_OSM = "© OpenStreetMap contributors";

/** Pagina dei diritti di OpenStreetMap: un link per chi legge, non una chiamata. */
export const URL_DIRITTI_OSM = "https://www.openstreetmap.org/copyright";
