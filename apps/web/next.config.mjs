// @ts-check
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const cartellaApp = dirname(fileURLToPath(import.meta.url));
/** Radice del monorepo: le dipendenze sono installate lì (npm workspaces). */
const radiceRepository = resolve(cartellaApp, "../..");

const sviluppo = process.env.NODE_ENV !== "production";

/**
 * Politica di sicurezza dei contenuti: la stessa di `src/rete.ts` (verificata dai test di CA-6).
 * È ripetuta qui perché la configurazione di Next.js è un modulo JavaScript caricato prima della compilazione.
 */
const politica = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${sviluppo ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://tile.openstreetmap.org",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

/** @type {import("next").NextConfig} */
const configurazione = {
  poweredByHeader: false,
  reactStrictMode: true,
  // `next dev` non scrive file nel repository (per esempio AGENTS.md): la dev server non deve lasciare modifiche.
  agentRules: false,
  outputFileTracingRoot: radiceRepository,
  turbopack: {
    root: radiceRepository,
    ignoreIssue: [
      {
        // La sorgente dei dati di contesto da file del motore (`creaSorgenteDaFile`) legge un percorso scelto da chi
        // la usa: Turbopack lo segnala perché, in un pacchetto per il deploy, includerebbe tutto il progetto.
        // La web app non usa quella funzione e non produce un pacchetto per il deploy: l'avviso non la riguarda.
        path: /packages[\\/]engine[\\/]dist[\\/]context[\\/]sorgente-file\.js$/,
        title: /Dynamic filesystem access/,
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:percorso*",
        headers: [
          { key: "Content-Security-Policy", value: politica },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default configurazione;
