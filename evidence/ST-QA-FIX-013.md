# Prove di consegna: ST-QA-FIX-013 (imprevisti solo informativi)

## Cosa è stato chiesto

Correzione dal testbook (ST-QA-001C, TB-IMPR-008): «Bagaglio smarrito», «Documenti persi o rubati» e «Sciopero» che non cambiano nulla offrivano «Accetta» invece di dire che sono solo un'informazione.

## Perimetro ed esclusioni

- **Comprende:** `packages/engine/src/replanning/spiegazione.ts`: `eNotaInformativa` considera note informative, oltre al ritardo, anche sciopero, bagaglio smarrito e documenti smarriti quando non cambia nessun elemento; la pagina della proposta già nasconde «Accetta» per le note informative. Caso tolto da `apps/web/e2e/qa001c-difetti.ts`.
- **Esclude:** lo sciopero che colpisce uno spostamento, che resta una proposta.
- **Deviazioni:** nessuna.

## Prove

- Test di ripianificazione del motore (`riepilogo`) superati.
- e2e TB-IMPR-008 superato.
