# Prove di consegna: ST-QA-FIX-010 ([P1] imprevisti raggiungibili da Oggi)

## Cosa è stato chiesto

Correzione dal testbook (ST-QA-001C): in Oggi «Ho un imprevisto» e «Oggi sono stanco» portavano alla pagina Demo invece che agli imprevisti (TB-TODAY-006, TB-TODAY-007, TB-IMPR-001).

## Perimetro ed esclusioni

- **Comprende:** i due link del pannello Oggi (`apps/web/src/componenti/PannelloOggi.tsx`), usato anche nella pagina del viaggio: «Ho un imprevisto» → `/imprevisti`, «Oggi sono stanco» → `/imprevisti?scheda=stanchezza`; i casi tolti da `apps/web/e2e/qa001c-difetti.ts`.
- **Esclude:** TB-IMPR-013 (gli imprevisti sul viaggio dell'utente), spostato in ST-QA-FIX-018 perché dipende dal viaggio scelto introdotto da ST-QA-FIX-004.
- **Deviazioni:** nessuna.

## Prove

- Typecheck della web app pulito.
- Test unitari di Oggi e Imprevisti (`today001-ca1`, `today001-ca2`, `impr001-schede`) superati.
- e2e mirati TB-TODAY-006 e TB-IMPR-001 superati; TB-TODAY-007 arriva ora alla scheda «Sono stanco» ma le sue quattro opzioni mancano per il difetto di TB-IMPR-006: resta tra i difetti aperti di ST-QA-FIX-011.
