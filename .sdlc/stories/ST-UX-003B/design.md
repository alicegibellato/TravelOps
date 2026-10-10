# ST-UX-003B Design

## Componenti
- `IllustrazioneLuogo`: input = tipo luogo/tema da config; output = SVG/CSS con rapporto fisso e attributo accessibile (titolo, o `aria-hidden` se decorativa). Fallback neutro per tipi sconosciuti. Nessuna richiesta di rete.
- Chip preferenze (A): riepilogo compatto, ogni chip apre la modifica della preferenza.
- Menu azioni (B): un pulsante "..." per attivita' e uno per giorno; tastiera (frecce, Esc), `aria-haspopup`, area di tocco >= 44px.
- Connettore spostamento (B): riga singola compatta per tratte <= soglia da config; sopra soglia resta il dettaglio.
- Conferma (B): un solo pulsante di chiusura della festa.

## Layout
- 1280x800: /pianifica a due colonne (riepilogo | bozza), bozza visibile senza scroll.
- 375px: colonna singola, chip a capo, menu a tutta larghezza.
- Token OKLCH UX-002; testo su immagini col token base, verificato con `contrasto.ts`.

## Aree e file
- A: pagine /pianifica, home, destinazioni, Oggi, Demo e IllustrazioneLuogo.
- B: pagina /bozza (menu, connettori) e conferma.
- Nessuna sovrapposizione di file tra A e B; modifiche condivise solo ai token, solo in aggiunta.

## Test
- e2e `ux003b-*` a 375 e 1280px per CB-1..CB-6; ux002 resta verde per CB-7.
- Screenshot in `evidence/ST-UX-003B/screenshots`.
- Stati vuoto/caricamento/errore verificati per le schermate toccate.

## Rollback
Solo presentazione; il revert del PR ripristina lo stato precedente.
