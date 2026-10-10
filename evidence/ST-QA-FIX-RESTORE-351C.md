# Prove di consegna: ST-QA-FIX-RESTORE-351C

## Cosa è stato chiesto

Ripristino su main dei file annullati per errore dal commit 351c495c (record pubblicati con publish-records): codice, prove ed evidenza tornano alla versione di main prima di quel commit (85aae966).

## Cosa è stato fatto

| Punto | Dove | Come |
|---|---|---|
| Codice | `apps/web/src/preferenze/percorso.ts` | Riportato alla versione di 85aae966 |
| Prove | `apps/web/test` (7 file), `apps/web/e2e` (4 file) | Riportate alla versione di 85aae966; `pref001a-fix-pref006-mese-criterio.test.tsx` ricreata |
| Evidenza | `evidence/ST-PREF-001A-FIX-TB-PREF-006`, `...-006B` (cartelle e file .md) | Ricreate come in 85aae966 |
| Evidenza SUITE-MAIN-2 | `evidence/ST-QA-FIX-SUITE-MAIN-2*` | Già identica a 85aae966 su main, nessuna modifica |

Nessun file è cambiato dopo 85aae966 tra quelli ripristinati. Nessuna nuova dipendenza.

## Verifica

| Prova | Comando | Esito |
|---|---|---|
| Prove mirate | `cd apps/web && npx vitest run` sui 7 file ripristinati (ca1, plan003, pref006, ux001, ux002, web003, chat001b) | 39 test passati (log in `ST-QA-FIX-RESTORE-351C/test-fix.log`) |
| Tipi | `cd apps/web && npx tsc --noEmit -p tsconfig.json` | codice di uscita 0 (log in `ST-QA-FIX-RESTORE-351C/tsc.log`) |
| App compilata | build dalla radice, avvio, `curl` su `/` e `/pianifica` | 200 e 200 (log in `ST-QA-FIX-RESTORE-351C/http.log`) |

## Limiti

Suite completa ed e2e non rieseguite in questa story: si lanciano su main dopo il merge.
