# Prove di consegna: ST-WEB-001-FIX-MAPPA-DETTAGLI (pannello «Dettagli» sopra la mappa)

## Cosa è stato chiesto

Segnalazione di Valerio (2026-10-11): nella pagina del giorno, aprendo «Dettagli» di un elemento, la mappa copriva il pannello laterale.

## Perimetro ed esclusioni

- **Comprende:** `apps/web/app/globals.css`: il contenitore `.mappa` ha `isolation: isolate`, così i livelli di Leaflet (z-index 400 e oltre) restano dentro la mappa e il pannello «Dettagli» resta sopra.
- **Esclude:** il resto della pagina del giorno.
- **Deviazioni:** solo test minimi (axe e guscio dell'app), per richiesta di Valerio.

## Prove

- Test minimi superati: controllo axe delle pagine e guscio dell'app.
- Schermata della pagina del giorno con la segnalazione.
