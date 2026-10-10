# Prove di consegna: ST-PLAN-001-FIX-TB-PREF-001

## Cosa è stato chiesto

REQ-PLAN-001, fix. Caso di collaudo TB-PREF-001: con il ritmo Bilanciato la bozza deve avere tre attività al giorno.

## Cosa è stato fatto

| Punto | Dove | Come |
|---|---|---|
| Correzione | `packages/engine/src/planning/generatore.ts` | La giornata sotto ritmo viene rifatta con un'altra prima scelta. |
| Prova automatica | file di test indicati sotto | Rossa senza la correzione, verde con la correzione. |

Nessuna nuova dipendenza.

## Verifica

| Prova | Comando | Esito |
|---|---|---|
| Prova mirata | `cd packages/engine && npx vitest run test/planning test/editing` | Tests  194 passed (194) (log in `ST-PLAN-001-FIX-TB-PREF-001/test-fix.log`) |
| Tipi | `cd packages/engine && npx tsc --noEmit -p tsconfig.json` | codice di uscita 0 (log in `ST-PLAN-001-FIX-TB-PREF-001/tsc.log`) |

## Limiti

Suite completa ed e2e non rieseguite (verifica minima concordata). Il caso TB-PREF-001 va rieseguito nel collaudo.
