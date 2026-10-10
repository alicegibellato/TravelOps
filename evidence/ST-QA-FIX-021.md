# Prove di consegna: ST-QA-FIX-021 (giorni aggiunti o tolti in «Cosa cambia»)

## Cosa è stato chiesto

Correzione dal testbook (ST-QA-001C, TB-IMPR-007; sostituisce ST-QA-FIX-012): con «Voglio restare di più» la sezione «Cosa cambia» era vuota, e nessuna delle due proposte («restare» e «tornare prima») diceva della notte e dell'alloggio.

## Perimetro ed esclusioni

- **Comprende:** `apps/web/src/viste/proposta.ts`: «Cosa cambia» elenca anche i giorni aggiunti o tolti in fondo al viaggio, con la notte e il suo alloggio (il motore aggiunge i giorni liberi senza elementi, quindi il confronto per elementi non li vedeva); riga tolta da `apps/web/e2e/qa001c-difetti.ts`.
- **Esclude:** il motore.
- **Deviazioni:** nessuna.

## Prove

- e2e TB-IMPR-007 (`qa001c-imprevisti`) superato.
