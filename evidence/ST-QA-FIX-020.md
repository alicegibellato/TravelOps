# Prove di consegna: ST-QA-FIX-020 («Sono stanco» secondo REQ-REPLAN-004)

## Cosa è stato chiesto

TB-IMPR-006 e TB-TODAY-007 fallivano perché chiedevano per «Sono stanco» la scelta «Solo attività facili» (e le quattro opzioni d'intensità). REQ-REPLAN-004 R2-STA definisce la stanchezza così: si tolgono attività fino al numero del ritmo lento, partendo dalle opzionali e dalle più intense; la scelta d'intensità è di «Non sto bene».

## Perimetro ed esclusioni

- **Comprende:** casi `docs/testbook/imprevisti.md` (TB-IMPR-006) e `docs/testbook/oggi.md` (TB-TODAY-007) allineati a R2-STA; e2e `apps/web/e2e/qa001c-imprevisti.e2e.ts` e `qa001c-oggi-monitoraggio.e2e.ts` di conseguenza (anche «Spiegazione» al posto di «Perché questa proposta»); righe tolte da `apps/web/e2e/qa001c-difetti.ts`.
- **Esclude:** il codice dell'app; sostituisce ST-QA-FIX-011.
- **Deviazioni:** triage di TB-IMPR-006 e TB-TODAY-007 da «correggibile» a «per scelta» (difetto del caso).

## Prove

- e2e TB-IMPR-006 e TB-TODAY-007 superati.
