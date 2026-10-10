# Prove di consegna: ST-QA-FIX-015 (TB-MON-002, monitoraggio spento)

## Cosa è stato chiesto

Il caso TB-MON-002 del testbook falliva: con `MONITOR_ATTIVO=false` aprendo Oggi compariva la notifica di monitoraggio.

## Perimetro ed esclusioni

- **Comprende:** il caso `docs/testbook/monitoraggio.md` (TB-MON-002) e il suo e2e in `apps/web/e2e/qa001c-oggi-monitoraggio.e2e.ts`, riattivato in `qa001c-difetti.ts`.
- **Esclude:** il codice dell'app, che fa già quello che chiede il requisito.
- **Deviazioni:** triage cambiato da «correggibile» a «per scelta»: REQ-MONITOR-001 CA-1 chiede sia il controllo periodico sia quello all'apertura di Oggi, e `MONITOR_ATTIVO=false` spegne solo il periodico (`apps/web/src/monitoraggio/avvio.ts`). Annunciato sul canale.

## Prove

- e2e TB-MON-002 (`qa001c-oggi-monitoraggio`, filtro sul caso): superato con l'atteso corretto.
