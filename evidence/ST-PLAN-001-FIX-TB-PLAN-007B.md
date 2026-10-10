# Prove di consegna: ST-PLAN-001-FIX-TB-PLAN-007B

## Cosa è stato chiesto

Fix di `ST-PLAN-001`. Caso di collaudo TB-PLAN-007: con ritmo Lento, i giorni con una sola visita non mostravano l'avviso «Da sistemare».

## Cosa è stato fatto

| Punto | Dove | Come |
|---|---|---|
| Suggerimenti di ritmo | `packages/engine/src/planning/revisioni.ts` | Corretta la valutazione del ritmo Lento: anche i giorni con una sola visita ricevono l'avviso «Da sistemare». |
| Prova automatica | `packages/engine/test/planning/ritmo-suggerimenti.test.ts` | 3 test sul comportamento dei suggerimenti di ritmo (rossi senza la correzione). |

Nessuna nuova dipendenza.

## Verifica

| Prova | Comando | Esito |
|---|---|---|
| Prova mirata | `cd packages/engine && npx vitest run test/planning/ritmo-suggerimenti.test.ts` | 3 test verdi su 3 |
| Suite del motore | `cd packages/engine && npx vitest run` | 797 test verdi su 797 |
| Tipi | `cd packages/engine && npx tsc --noEmit -p tsconfig.json` | nessun errore |
| App compilata | `npm run build` dalla radice, poi avvio sulla porta 3471 con dati vuoti e `curl -i http://127.0.0.1:3471/pianifica` | 200, testo «Ritmo» presente |

Log in `evidence/ST-PLAN-001-FIX-TB-PLAN-007B/` (`test-fix.log`, `tsc.log`, `http.log`).

## Limiti

Suite completa ed e2e non rieseguite (verifica minima concordata). Il caso TB-PLAN-007 va rieseguito nel collaudo.
