# ST-UX-003B Discovery

## Problema
Dopo UX-002 (token OKLCH) l'interfaccia resta densa e poco visiva: /pianifica occupa troppo spazio, /bozza espone pannelli tecnici e azioni ripetute, home e card viaggi hanno titoli con punteggiatura orfana e nessuna immagine, la festa di conferma ha piu' controlli per la stessa azione.

## Requisito
REQ-UX-003, criteri CB-1..CB-8 (vedi story.json). Contratto di implementazione approvato; profilo AUT-PR-UX-003B.

## Fonti da leggere
- Pagine: /pianifica, home, destinazioni pronte, /bozza, Oggi, Demo, conferma.
- Token e contrasto: UX-002 (`contrasto.ts`, test `ux002`).
- Test e2e esistenti e cartella `evidence/` per le convenzioni degli screenshot.

## Vincoli
- Nessun servizio esterno per le immagini: asset locali o CSS/SVG, configurabili.
- Nessun nuovo pannello tecnico visibile all'utente.
- Compatibilita' con i test esistenti (ux002) e con le viste a 375 e 1280px.

## Rischi
- Due aree toccano file vicini (pianificazione e bozza): confini espliciti in design.
- Regressioni di contrasto con le nuove superfici su immagini.
