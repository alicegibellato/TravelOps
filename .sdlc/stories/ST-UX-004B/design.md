# ST-UX-004B Design

## Componenti
- Meteo: riuso di PrevisioneGiorno nella bozza (per giorno) e in Oggi, tramite le porte di ST-INTEG-001; stessa modalita' finto/reale.
- Header: menu compatto sotto soglia di larghezza configurabile, selettore tema dentro il menu; a 1280 px nessun a capo.
- Card viaggio: titolo con luogo e date; illustrazione scelta per tipo di luogo e stagione da configurazione.
- Sorprendimi: dopo la scelta si riassume (idea scelta + azione per riaprire).
- Demo: copione consultabile in pagina; etichette senza doppia punteggiatura.
- Bozza: stato "pannello aperto" unico; menu giorno rinominato "Proponi una modifica" dopo la conferma.

## Layout
375 px: colonna singola, header a una riga; 1280 px: header senza a capo.

## Test
e2e a 375 e 1280 px per CB-1..CB-6; screenshot in evidence/ST-UX-004B/screenshots; ux002 verde.

## Rollback
Solo presentazione; revert del PR.
