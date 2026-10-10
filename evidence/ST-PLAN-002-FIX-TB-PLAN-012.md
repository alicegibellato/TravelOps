# Prove di consegna: ST-PLAN-002-FIX-TB-PLAN-012

## Cosa è stato chiesto

REQ-PLAN-002, fix. Caso di collaudo TB-PLAN-012: «Confronta» deve contare solo gli spostamenti che cambiano.

## Cosa è stato fatto

| Punto | Dove | Come |
|---|---|---|
| Correzione | `apps/web/src/bozza/servizio.ts` | Gli spostamenti identici (stessa tratta, orari e mezzo) non entrano più nel conteggio. |
| Prova automatica | file di test indicati sotto | Rossa senza la correzione, verde con la correzione. |

Nessuna nuova dipendenza.

## Verifica

| Prova | Comando | Esito |
|---|---|---|
| Prova mirata | `cd apps/web && npx vitest run test/plan002-confronto-spostamenti.test.ts test/plan002 test/bozza` | Tests  15 passed (15) (log in `ST-PLAN-002-FIX-TB-PLAN-012/test-fix.log`) |
| Tipi | `cd apps/web && npx tsc --noEmit -p tsconfig.json` | codice di uscita 0 (log in `ST-PLAN-002-FIX-TB-PLAN-012/tsc.log`) |

## Limiti

Suite completa ed e2e non rieseguite (verifica minima concordata). Il caso TB-PLAN-012 va rieseguito nel collaudo.
