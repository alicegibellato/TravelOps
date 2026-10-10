# Prove di consegna: ST-PREF-001A-FIX-TB-PREF-006B

## Cosa è stato chiesto

REQ-PREF-001, fix. Caso di collaudo TB-PREF-006: con «Mese e durata» il riepilogo deve dichiarare da quando parte la bozza.

## Cosa è stato fatto

| Punto | Dove | Come |
|---|---|---|
| Correzione | `apps/web/src/preferenze/percorso.ts` | Il riepilogo dichiara «dal primo del mese», il giorno da cui parte il generatore. |
| Prova automatica | file di test indicati sotto | Rossa senza la correzione, verde con la correzione. |

Nessuna nuova dipendenza.

## Verifica

| Prova | Comando | Esito |
|---|---|---|
| Prova mirata | `cd apps/web && npx vitest run test/pref001a-fix-pref006-mese-criterio.test.tsx test/pref001a test/pref001b` | Tests  36 passed (36) (log in `ST-PREF-001A-FIX-TB-PREF-006B/test-fix.log`) |
| Tipi | `cd apps/web && npx tsc --noEmit -p tsconfig.json` | codice di uscita 0 (log in `ST-PREF-001A-FIX-TB-PREF-006B/tsc.log`) |

## Limiti

Suite completa ed e2e non rieseguite (verifica minima concordata). Il caso TB-PREF-006 va rieseguito nel collaudo.
