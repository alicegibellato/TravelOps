# Prove di consegna: ST-MAP-FIX-001

## Cosa è stato chiesto

REQ-WEB-001 (CA-3 mappa del giorno, CA-6 unica integrazione esterna: tessere OSM), fix di `ST-WEB-001`.

`apps/web/next.config.mjs` manda `Referrer-Policy: no-referrer` su tutte le pagine: le tessere della mappa partivano verso `tile.openstreetmap.org` senza Referer e OSM rispondeva 403 (tile usage policy). La mappa del giorno restava grigia.

## Cosa è stato fatto

| Punto | Dove | Come |
|---|---|---|
| Politica del referrer delle tessere | `apps/web/src/rete.ts` (`POLITICA_REFERRER_TESSERE_OSM`) | `strict-origin-when-cross-origin`: OSM riceve solo l'origine della web app, mai il percorso della pagina. |
| Mappa del giorno | `apps/web/src/componenti/MappaGiorno.tsx` | `L.tileLayer(..., { referrerPolicy: POLITICA_REFERRER_TESSERE_OSM })`: Leaflet mette l'attributo `referrerpolicy` su ogni tessera. |
| Politica globale | `apps/web/next.config.mjs` | Invariata: `Referrer-Policy: no-referrer` e CSP restano come prima. |
| Prova unitaria | `apps/web/test/mapfix001-referrer-tessere.test.tsx` | La mappa montata in jsdom passa la politica al livello delle tessere; la tessera creata da Leaflet ha la politica; l'intestazione globale resta `no-referrer`. |
| Prova nel browser | `apps/web/e2e/mapfix001-tessere.e2e.ts`, mappatura in `apps/web/e2e/e2e.config.json` | Su `/oggi` ogni `.leaflet-tile` ha `referrerpolicy="strict-origin-when-cross-origin"` e ogni richiesta di tessera porta come Referer l'origine della web app. Le tessere sono servite in locale: nessuna chiamata esce verso OSM. |

## Verifica

| Prova | Comando | Esito |
|---|---|---|
| Prova unitaria della fix | `cd apps/web && npx vitest run test/mapfix001-referrer-tessere.test.tsx` | 4 test verdi |
| Suite web completa | `cd apps/web && npx vitest run` | 702 test verdi (101 file) sulla base aggiornata a main |
| Tipi | `cd apps/web && npm run typecheck` | nessun errore |
| Browser (e2e) | `cd apps/web && npx vitest run -c vitest.e2e.config.ts e2e/mapfix001-tessere.e2e.ts e2e/ca4-oggi.e2e.ts` | 4 test verdi (2 flussi a 1280 px) |
| Accessibilità | `ux001-ca5-axe.test.tsx` nella suite web | verde; la fix non cambia DOM visibile né etichette |

## Limiti

Il 403 di OSM non è riprodotto contro il server vero (le prove non escono in rete): la prova verifica nel browser il Referer che OSM richiede.
