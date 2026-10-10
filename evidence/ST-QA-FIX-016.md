# Prove di consegna: ST-QA-FIX-016 (viaggio con dati non validi)

## Cosa è stato chiesto

Correzione dal testbook (ST-QA-001C, TB-TRIP-006): aprendo dalla home un viaggio salvato con dati non validi si otteneva «Pagina non trovata» invece di una spiegazione.

## Perimetro ed esclusioni

- **Comprende:** `apps/web/src/esistenza.ts` (il controllo usato da `proxy.ts` considera esistente anche un viaggio salvato ma non leggibile, solo per l'indirizzo principale); `apps/web/app/bozza/[viaggio]/page.tsx` e `apps/web/app/viaggi/[viaggio]/page.tsx` mostrano «I dati del viaggio non sono validi» con il motivo; il caso tolto da `apps/web/e2e/qa001c-difetti.ts`.
- **Esclude:** giorni ed elementi di un viaggio non leggibile (restano «Pagina non trovata»); un id inesistente resta 404.
- **Deviazioni:** nessuna.

## Prove

- `npm run build -w apps/web` senza errori.
- e2e TB-TRIP-006 (`qa001c-viaggi-versioni`) superato.
