# Prove di consegna: ST-PLAN-002-FIX-TB-PLAN-004

## Cosa è stato chiesto

Fix di `ST-PLAN-002`. Caso di collaudo TB-PLAN-004: spostare un'attività senza creare il tratto di ponte (spostamento senza ponte).

## Cosa è stato fatto

| Punto | Dove | Come |
|---|---|---|
| Correzione | `packages/engine/src/editing/operazioni.ts` | Ritocco alla logica di spostamento delle attività, così lo spostamento non genera il tratto di ponte. |
| Prova automatica | `packages/engine/test/editing/sposta-senza-ponte.test.ts` | Verifica lo spostamento senza ponte (rosso senza la correzione). |

Modifica solo al motore (engine): nessun cambio all'app web, nessuna nuova dipendenza.

## Verifica

| Prova | Comando | Esito |
|---|---|---|
| Prova mirata | `cd packages/engine && npx vitest run test/editing/sposta-senza-ponte.test.ts` | 1 test verde |
| Moduli vicini | `cd packages/engine && npx vitest run test/editing` | 66 test verdi (5 file) |
| Compilazione | `npm run build` dalla radice | ok |
| App compilata | `node scripts/next.mjs start -p 3253`, poi `curl` su `/` e `/pianifica` | 200 su entrambe; «Le tue preferenze» presente in `/pianifica` |
| Tipi | `cd apps/web && npx tsc --noEmit -p tsconfig.json` | nessun errore |

Log in `evidence/ST-PLAN-002-FIX-TB-PLAN-004/` (`test-fix.log`, `tsc.log`, `http.log`).

## Limiti

Suite completa ed e2e non rieseguite (verifica minima concordata). Il caso TB-PLAN-004 va rieseguito nel collaudo.
