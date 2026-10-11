# Prove di consegna: ST-QA-FIX-022 (e2e stabile: TB-TODAY-003)

## Cosa è stato chiesto

Nei giri della suite e2e completa su main, TB-TODAY-003 (`apps/web/e2e/qa001c-oggi-monitoraggio.e2e.ts`) andava in timeout a 120 s: dentro il flusso avviava altre due app per i valori «simulato» e «boh» di `TRAVELOPS_OROLOGIO`.

## Perimetro ed esclusioni

- **Comprende:** TB-TODAY-003 diviso in tre flussi («reale», «simulato», «boh»), ognuno con `TRAVELOPS_OROLOGIO` e la sua cartella dati passati come ambiente del flusso, senza avvii di app interni; stessi attesi di prima.
- **Esclude:** il codice dell'app e gli altri flussi del file.
- **Deviazioni:** nessuna.

## Prove

- Typecheck della web app pulito.
- e2e TB-TODAY-003: 6 test superati (tre flussi) in circa 50 s.
