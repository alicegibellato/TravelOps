# Prove di consegna: ST-PLAN-002-FIX-TB-PLAN-016

## Cosa è stato chiesto

REQ-PLAN-002, fix. Caso di collaudo TB-PLAN-016: i testi della bozza devono essere coerenti: durate, virgolette ed errore oltre la mezzanotte.

## Cosa è stato fatto

| Punto | Dove | Come |
|---|---|---|
| Correzione | `apps/web/src/componenti/PaginaBozza.tsx`, `packages/engine/src/editing/operazioni.ts`, `packages/engine/src/planning/leggibilita.ts` | Un solo formato per le durate, virgolette «…» nella cronologia, errore di «Sposta» con l'ora del giorno dopo e cosa fare. Prove del motore in `ST-PLAN-002-FIX-TB-PLAN-016/test-motore.log`. |
| Prova automatica | file di test indicati sotto | Rossa senza la correzione, verde con la correzione. |

Nessuna nuova dipendenza.

## Verifica

| Prova | Comando | Esito |
|---|---|---|
| Prova mirata | `cd apps/web && npx vitest run test/plan016-durate-spostamenti.test.tsx test/plan002 test/ux004a` | Tests  24 passed (24) (log in `ST-PLAN-002-FIX-TB-PLAN-016/test-fix.log`) |
| Tipi | `cd apps/web && npx tsc --noEmit -p tsconfig.json` | codice di uscita 0 (log in `ST-PLAN-002-FIX-TB-PLAN-016/tsc.log`) |

## Limiti

Suite completa ed e2e non rieseguite (verifica minima concordata). Il caso TB-PLAN-016 va rieseguito nel collaudo.
