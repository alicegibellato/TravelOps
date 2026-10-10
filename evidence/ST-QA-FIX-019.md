# Prove di consegna: ST-QA-FIX-019 (modulo imprevisti)

## Cosa è stato chiesto

Correzione dal testbook (ST-QA-001C, TB-IMPR-009; sostituisce ST-QA-FIX-014): con un modulo incompleto il browser bloccava l'invio senza «Controlla il modulo», e inviando comunque i dati scritti si perdevano.

## Perimetro ed esclusioni

- **Comprende:** `apps/web/src/componenti/PaginaImprevisti.tsx` (il modulo ha `noValidate`: controlla il server e mostra «Controlla il modulo»); `apps/web/app/imprevisti/azioni.ts` (con errori la scheda si riapre con i dati già scritti); `apps/web/app/imprevisti/page.tsx` (rilegge quei dati e li ripropone); tolte da `apps/web/e2e/qa001c-difetti.ts` le righe di TB-IMPR-008 (corretto da ST-QA-FIX-013) e TB-IMPR-009.
- **Esclude:** il motore.
- **Deviazioni:** nessuna.

## Prove

- Build della web app senza errori.
- e2e TB-IMPR-008 e TB-IMPR-009 (`qa001c-imprevisti`) superati.
