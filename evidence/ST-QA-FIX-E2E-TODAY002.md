# Prove di consegna: ST-QA-FIX-E2E-TODAY002 (TB-TODAY-002 stabile con più viaggi nello stesso flusso)

## Cosa è stato chiesto

REQ-E2E-001-R2: TB-TODAY-002 (e gli altri flussi che creano più di un viaggio) fallivano a volte nella suite completa al passo «Creo e confermo il viaggio B» in attesa di «Passo 1 di 5».

## Cosa è stato fatto

| Punto | Dove | Come |
|---|---|---|
| Causa | percorso guidato (`PercorsoPreferenze`) | Passo e bozza stanno in `sessionStorage` e vengono riletti dopo l'idratazione. I test li azzeravano a pagina aperta e ricaricavano: una gara con la riscrittura, e il secondo viaggio poteva ripartire dal passo 5. Nessun difetto dell'app. |
| Correzione | `apps/web/e2e/supporto.ts` | Nuovo `apriPercorsoDaCapo`: azzera la sessione prima di aprire `/preferenze` e attende il passo 1. Usato da `creaBozzaDalPercorso`. |
| Uso nei flussi | `qa001e-oggi-imprevisti.e2e.ts`, `qa001c-oggi-monitoraggio.e2e.ts` | Sostituisce il clear+reload (qa001e) e il ciclo «Indietro» con pausa fissa di 1200 ms (qa001c). |

Nessuna nuova dipendenza, nessun codice dell'app toccato.

## Verifica

| Prova | Comando | Esito |
|---|---|---|
| File dei due flussi | `cd apps/web && npx vitest run -c vitest.e2e.config.ts e2e/qa001c-oggi-monitoraggio e2e/qa001e-oggi-imprevisti` | Tests  32 passed | 1 skipped (33) (`test-fix.log`) |
| Suite completa, giro 1 | `npm run e2e` | 27 file, 124 passati, 4 saltati, 0 falliti (`e2e-completo-1.log`) |
| Suite completa, giro 2 | `npm run e2e` | 27 file, 124 passati, 4 saltati, 0 falliti (`e2e-completo-2.log`) |
| Tipi | `cd apps/web && npx tsc --noEmit -p tsconfig.json` | nessun errore (`tsc.log`) |

## Limiti

Non toccato il corpo di TB-TODAY-003 (ST-QA-FIX-022) né obs001a (axe, visto una volta). Il caso TB-TODAY-002 va rieseguito nel collaudo.
