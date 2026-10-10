# Prove di consegna: ST-QA-FIX-005

«Scambia con…»: non perde attività né cambia ristoranti. Fix di ST-PLAN-002 dal collaudo (TB-PLAN-005, segnalazioni TO-008/TO-033).

## Cosa è stato chiesto

Nel collaudo di Alice (PC1), «Modifica giorno» → «Scambia con…» perdeva un'attività e cambiava i ristoranti dei due giorni. Atteso (TB-PLAN-005): i due giorni si scambiano il programma, il totale delle attività resta identico e i ristoranti sono quelli di prima, solo spostati di giorno.

## Perimetro ed esclusioni

- Dentro: motore, `packages/engine/src/planning/` (`revisioni.ts`, `generatore.ts`, `giornata.ts`), il test `packages/engine/test/planning/scambia-giorni.test.ts` e questo file.
- Fuori: interfaccia della bozza (TB-PLAN-006, sottomenu col mouse), stesso ristorante a pranzo e cena (TB-PLAN-007), le altre operazioni della bozza.

## Causa

`scambia_giorni` ricostruiva ogni giorno con `ricostruisciGiornata`: i pasti prendevano di nuovo il ristorante più vicino e le attività che non entravano nel nuovo giorno (arrivo, orari di apertura del giorno della settimana) finivano in `fuori` ed erano tolte.

## Cosa è cambiato

| Punto | Modifica |
|---|---|
| `giornata.ts` | `RichiestaGiornata.ristorantiPreferiti` (facoltativo): per ogni pasto si prova prima il ristorante preferito; `collocaGiornata` preferisce i piani che lo rispettano. Senza preferiti il comportamento è quello di prima. |
| `generatore.ts` | `RichiestaGiornataBozza.ristoranti` passa i preferiti alla ricostruzione della giornata. |
| `revisioni.ts` | `scambia_giorni` passa a ogni giorno i ristoranti del programma che riceve; un'attività che non entra nel nuovo giorno resta nel suo con l'avviso «"X" resta il … : il … non entra nella giornata.»; un ristorante chiuso nel nuovo giorno è sostituito con l'avviso «… non è disponibile a pranzo/cena: al suo posto …»; se un'attività non entrerebbe in nessuno dei due giorni lo scambio è rifiutato, senza revisione nuova. |

## Verifica

### Criteri di accettazione

| Criterio | Esito | Prova |
|---|---|---|
| Scambio tra due giorni qualsiasi (anche il primo, con l'arrivo): totale delle attività identico, altri giorni invariati | superato | `scambia-giorni.test.ts`: giorni 1-2, 2-3, 1-3 per ogni profilo e istantanea di riferimento (PR-1…PR-4 di prova, Garda, Dolomiti, Roma) |
| Ogni pasto presente in entrambi i giorni mantiene il ristorante del programma spostato, salvo chiusura spiegata da un avviso | superato | stesso test; sul Garda (PR-1) giorno 1 ↔ 2 attività e ristoranti scambiati esattamente |
| Attività che non entra nel nuovo giorno: resta nel suo con avviso; se non entra in nessuno dei due, scambio rifiutato con messaggio chiaro e nessuna revisione | superato | stesso test (avvisi e messaggio verificati) |

### Prove eseguite

| Prova | Esito |
|---|---|
| `scambia-giorni.test.ts` sul codice di `origin/main` (senza la fix) | 17 falliti su 22 (riproduce il difetto) |
| `scambia-giorni.test.ts` con la fix | 22 superati |
| `npm test` engine / agents / sources / web | 782 / 150 / 138 (+1 saltato) / 685 superati |
| `tsc --noEmit` engine, agents, web | nessun errore |
| e2e mirati `ux003b-bozza-menu`, `ca2-bozza` (menu «Modifica giorno» con «Scambia con…») | 4 superati |
