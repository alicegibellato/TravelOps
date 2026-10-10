# Prove di consegna: ST-QA-FIX-017 (testo della pausa in Oggi)

## Cosa è stato chiesto

Correzione dal testbook (ST-QA-001C, TB-TODAY-001/004): in una pausa Oggi diceva «hai 6 ore liberi», con l'accordo sbagliato.

## Perimetro ed esclusioni

- **Comprende:** la frase della pausa in `apps/web/src/componenti/PannelloOggi.tsx`, ora «hai <tempo> di tempo libero.», corretta per ore, minuti e combinazioni; aggiornati il test `today001-ca1`, l'e2e TB-TODAY-004 e il testo atteso in `docs/testbook/oggi.md`.
- **Esclude:** altri testi di Oggi.
- **Deviazioni:** nessuna.

## Prove

- `today001-ca1-adesso-dopo` superato.
- e2e TB-TODAY-004 superato.
