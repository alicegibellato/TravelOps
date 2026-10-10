# Prove di consegna: ST-QA-001C (REQ-QA-001, esecuzione del gruppo C)

## Cosa è stato chiesto

REQ-QA-001, story `ST-QA-001C`: eseguire i casi del gruppo C del testbook (I miei viaggi, Oggi, Versioni, Imprevisti, monitoraggio: 35 casi), con esito e prova per ogni caso, triage dei falliti e una story di correzione per ogni caso correggibile; i casi automatizzabili come e2e.

## Perimetro ed esclusioni

- **Comprende:** report `evidence/ST-QA-001C/testbook-2026-10-10.md`; e2e `apps/web/e2e/qa001c-*.e2e.ts` con l'elenco dei difetti aperti `qa001c-difetti.ts`; correzione di quattro casi difettosi del testbook (`docs/testbook/oggi.md`, `docs/testbook/imprevisti.md`); story ST-QA-FIX-010…017.
- **Esclude:** correzioni all'app (sono nelle story ST-QA-FIX); telefono (solo 1280 px).
- **Deviazioni:** alcuni esiti vengono da Alice (PC1) e PC3, come concordato sul canale; sono indicati caso per caso.

## Prove

- `npm ci && npm run build`: riuscito (CI del progetto disattivata).
- e2e del gruppo C in `npm run e2e` (difetti aperti esclusi): 24 test superati, 0 falliti.
- e2e del gruppo C con `TRAVELOPS_E2E_DIFETTI=1`: superati tutti tranne i 10 casi con difetto aperto (TB-TRIP-006, TB-TODAY-006, TB-TODAY-007, TB-VER-004, TB-IMPR-001, 006, 007, 008, 009, TB-MON-002), come atteso.
- Screenshot di due difetti a 1280 px: `evidence/ST-QA-001C/screenshots/tb-today-006--1280px.png`, `tb-mon-002--1280px.png`.
- Report completo per caso: `evidence/ST-QA-001C/testbook-2026-10-10.md` (21 superati, 14 falliti).
