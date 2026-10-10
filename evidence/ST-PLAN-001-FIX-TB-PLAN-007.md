# Prove di consegna: ST-PLAN-001-FIX-TB-PLAN-007

## Cosa è stato chiesto

REQ-PLAN-001, fix di `ST-PLAN-001`. Caso di collaudo TB-PLAN-007: il ritmo dei pasti nella bozza di giornata generata dal motore di pianificazione.

## Cosa è stato fatto

| Punto | Dove | Come |
|---|---|---|
| Ritmo dei pasti | `packages/engine/src/planning/giornata.ts`, `generatore.ts` | Correzione della composizione della giornata. |
| Riferimenti | `packages/engine/test/planning/riferimento/bozza-PR-1-*.json` (2 file) | Bozze di riferimento aggiornate al nuovo ritmo. |
| Prova automatica | `packages/engine/test/planning/ritmo-pasti.test.ts` | Verifica il ritmo dei pasti (rosso senza la correzione). |

Modifica solo al motore: nessun cambio al codice dell'app web, nessuna nuova dipendenza.

## Verifica

| Prova | Comando | Esito |
|---|---|---|
| Prove di pianificazione | `cd packages/engine && npx vitest run test/planning` | 125 test verdi (log in `ST-PLAN-001-FIX-TB-PLAN-007/test-fix.log`) |
| Compilazione | `npm run build` dalla radice | riuscita |
| App compilata | `node scripts/next.mjs start -p 3254`, poi `curl` su `/` e `/pianifica` | entrambe 200; `/pianifica` contiene «Le tue preferenze» (log in `http.log`) |
| Tipi | `cd apps/web && npx tsc --noEmit -p tsconfig.json` | nessun errore |

## Limiti

Suite completa ed e2e non rieseguite (verifica minima concordata). Il caso TB-PLAN-007 va rieseguito nel collaudo.
