# ST-UX-004A Design

## Componenti
- Vincoli di varieta' del generatore: `maxAttivitaStessoTipo` (default 2) e `tragittoMassimoMinuti` (default 45) letti da configurazione; ripiego che rilassa la soglia se il giorno resterebbe vuoto.
- Raggruppamento note: funzione pura che unisce note uguali con l'elenco dei luoghi.
- Etichette revisioni: funzione pura che deriva l'etichetta dal confronto tra revisioni (es. "Piu' leggera lunedi'", "Sostituita <attivita'>"); la cronologia mostra etichetta e data, l'identificativo tecnico resta interno.
- Spiegazione ripianificazione: riepilogo di al massimo 3 frasi + dettagli espandibili, senza codici interni.
- Ritardo senza effetto: esito "informativo" senza azione "Accetta".

## Aree e file
packages/engine (generazione, revisioni, ripianificazione) e testi/soglie in configurazione; apps/web/src/bozza solo per mostrare avviso e cronologia. Nessuna sovrapposizione con ST-UX-004B oltre ai punti di mostra della bozza, da coordinare in aggiunta.

## Test
Unit sul motore per CA-1..CA-5; integrazione sulla bozza; ux002 resta verde.

## Rollback
Revert del PR; nessun dato persistente cambia schema.
