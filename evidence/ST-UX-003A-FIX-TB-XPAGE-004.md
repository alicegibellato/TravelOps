# Prove di consegna: ST-UX-003A-FIX-TB-XPAGE-004

## Cosa è stato chiesto

REQ-UX-003, fix di `ST-UX-003A`, dal caso TB-XPAGE-004 del testbook di ST-QA-001D (`evidence/ST-QA-001D/testbook-2026-10-10.md`).

- `/viaggi/TRIP-DEMO-GARDA/giorni/2000-01-01` e `/versioni/99` mostravano «Non trovato» senza «Pagina non trovata» né «Torna ai miei viaggi».
- `/viaggi/non-esiste` e `/bozza/non-esiste` rispondevano HTTP 200; solo `/pagina-a-caso` rispondeva 404.

## Cosa è stato fatto

| Punto | Dove | Come |
|---|---|---|
| Causa | `apps/web/app/loading.tsx` | Avvolge ogni pagina: la risposta parte in streaming con 200 e un `notFound()` nella pagina non può più cambiarne lo stato. |
| Controllo di esistenza | `apps/web/src/esistenza.ts` (`paginaEsiste`) | Viaggio, giorno, elemento e «Oggi» sotto `/viaggi`, bozza sotto `/bozza`, versione con giorno ed elemento sotto `/versioni`, con le stesse funzioni dati delle pagine. Dati non validi o stato non valido restano alla pagina (errori del motore, «Ripristina»). |
| Proxy | `apps/web/proxy.ts` | Prima della pagina: se il percorso non esiste lo riscrive su `/_non-trovata`, che non ha pagina, e Next.js risponde con `app/not-found.tsx` («Pagina non trovata», «Torna ai miei viaggi») e 404. Pagine e `loading.tsx` invariati. |
| Prova unitaria | `apps/web/test/ux003a-fix-xpage004-non-trovata.test.ts` | Percorsi veri ed inesistenti di viaggi di riferimento e della base dati, versioni, bozza, percorsi non controllati. |
| Prova nel browser | `apps/web/e2e/xpage004-non-trovata.e2e.ts` | I quattro percorsi del caso rispondono 404 con «Pagina non trovata» e il collegamento a `/`; viaggio, giorno e versione veri rispondono 200. Senza il Proxy falliva (`expected 200 to be 404`): `.sdlc/stories/ST-UX-003A-FIX-TB-XPAGE-004/evidence/e2e-prima-della-fix.txt`. |
| E2E mirati | `apps/web/e2e/e2e.config.json` | `proxy.ts` e `src/esistenza.ts` → `xpage004-non-trovata`; `proxy.ts` tra gli ingressi della build. |

## Verifica

| Prova | Comando | Esito |
|---|---|---|
| Prova unitaria e accessibilità | `cd apps/web && npx vitest run test/ux003a-fix-xpage004-non-trovata.test.ts test/ux001-ca5-axe.test.tsx` | 16 test verdi |
| Tipi | `cd apps/web && npm run typecheck` | nessun errore |
| Browser (e2e), caso TB-XPAGE-004 e pagine che passano dal Proxy | `cd apps/web && npx vitest run -c vitest.e2e.config.ts e2e/xpage004-non-trovata.e2e.ts e2e/ux003b-bozza-menu.e2e.ts e2e/ca4-oggi.e2e.ts` | 6 test verdi (3 flussi a 1280 px) |

## Limiti

Il Proxy rilegge i dati locali a ogni richiesta sotto `/viaggi`, `/bozza` e `/versioni`: un controllo in più, sulla stessa base dati delle pagine.
