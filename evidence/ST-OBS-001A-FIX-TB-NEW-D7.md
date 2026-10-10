# Prove di consegna: ST-OBS-001A-FIX-TB-NEW-D7

## Cosa è stato chiesto

REQ-OBS-001, fix di `ST-OBS-001A`. Caso di collaudo TB-NEW-D7: la suite end-to-end si chiamava «E2E web (375 e 1280 px)», ma il prodotto è solo desktop a 1280 px.

## Cosa è stato fatto

| Punto | Dove | Come |
|---|---|---|
| Nome della suite | `scripts/suite-test.json` | «E2E web (1280 px)»: è il nome che compare nella pagina `/qualita`. |
| Dati di prova | `apps/web/test/supporto-qualita.ts` | Stesso nome nel report di prova usato dalle prove della pagina. |
| Prova automatica | `apps/web/test/obs001a-nome-suite.test.ts` | Controlla il nome della suite E2E e che nessun nome citi 375 (rosso prima della fix). |

Nessuna nuova dipendenza, nessun cambio al codice dell'app.

## Verifica

| Prova | Comando | Esito |
|---|---|---|
| Prove mirate (inclusa la scansione axe della pagina) | `cd apps/web && npx vitest run test/obs001a-nome-suite.test.ts test/obs001a-pagina.test.tsx test/obs001a-script-test.test.ts` | 21 test verdi (1 rosso senza la fix) |
| App compilata | `cd apps/web && npm run build && TRAVELOPS_RAPPORTO_TEST=<report di prova> npm run start -- -p 3417`, poi `curl http://localhost:3417/qualita` | 200, compare «E2E web (1280 px)», nessun «375» |
| Tipi | `cd apps/web && npx tsc --noEmit -p .` | nessun errore |

## Limiti

Suite web completa ed e2e non rieseguite (verifica minima concordata). I report già generati con il vecchio nome lo conservano finché non si rilanciano i test. Il caso TB-NEW-D7 va rieseguito nel collaudo di gruppo D.
