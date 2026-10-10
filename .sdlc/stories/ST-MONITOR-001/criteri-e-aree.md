# ST-MONITOR-001 Criteri e aree

## Criteri e impatto
| Criterio | Area | Effetto |
|---|---|---|
| CA-1 controllo periodico configurabile e all'apertura di Oggi su meteo ed eventi | Monitor | funzione `eseguiControllo` pura con orologio e porte iniettate; scheduler con intervallo da config e `stop()`; trigger su apertura di Oggi |
| CA-2 imprevisto con proposta minima se una condizione impatta un'attivita' | Dominio | confronto condizioni vs attivita' dei viaggi confermati; riuso di `calcolaImpatto` e `proposta.ts` |
| CA-3 notifica in UI con imprevisto e proposta | UI | elenco notifiche nella pagina Oggi con link alla proposta |
| CA-4 nessun duplicato | Dominio | registro di idempotenza con chiave (viaggio, attivita', condizione, data) |
| CA-5 test con orologio e adattatori finti | Test | periodico, apertura di Oggi, impatto, nessun impatto, idempotenza |

## Aree e file
- Monitor: nuovo modulo in `packages/engine/src/monitoring` (logica) con scheduler sottile lato `apps/web`.
- Riuso: `packages/engine/src/replanning/impatto.ts`, `proposta.ts`; porte da `packages/sources`.
- UI: pagina Oggi, solo notifica e collegamento alla proposta.
- Nessuna dipendenza nuova.
