# Prove di consegna: ST-PLAN-002-FIX-TB-PLAN-011

## Cosa è stato chiesto

REQ-PLAN-002, fix. Caso di collaudo TB-PLAN-011: aggiungendo attività oltre il ritmo scelto la bozza deve avvisare.

## Cosa è stato fatto

| Punto | Dove | Come |
|---|---|---|
| Correzione | `packages/engine/src/planning/revisioni.ts`, `leggibilita.ts` | Nuovo avviso in «Da sapere» quando un giorno supera le attività del ritmo scelto. |
| Prova automatica | file di test indicati sotto | Rossa senza la correzione, verde con la correzione. |

Nessuna nuova dipendenza.

## Verifica

| Prova | Comando | Esito |
|---|---|---|
| Prova mirata | `cd packages/engine && npx vitest run test/planning/avviso-ritmo.test.ts test/planning test/editing` | Tests  197 passed (197) (log in `ST-PLAN-002-FIX-TB-PLAN-011/test-fix.log`) |
| Tipi | `cd packages/engine && npx tsc --noEmit -p tsconfig.json` | codice di uscita 0 (log in `ST-PLAN-002-FIX-TB-PLAN-011/tsc.log`) |

## Limiti

Suite completa ed e2e non rieseguite (verifica minima concordata). Il caso TB-PLAN-011 va rieseguito nel collaudo.
