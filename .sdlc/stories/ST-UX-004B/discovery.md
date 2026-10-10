# ST-UX-004B Discovery

## Problema
Dal collaudo da utente del 10/10 (PC3, su main): manca il meteo per giorno nella bozza e in Oggi; a 375 px l'intestazione va su piu' righe e il selettore tema occupa spazio; le card dei viaggi sono quasi identiche; "Sorprendimi" resta aperto dopo la scelta; in Demo il copione non e' consultabile e le etichette hanno punteggiatura ridondante; in bozza si aprono piu' pannelli azione insieme e dopo la conferma il menu "Modifica giorno" resta incoerente.

## Vincoli
- Meteo: riusare PrevisioneGiorno e le porte di ST-INTEG-001; modalita' finto/reale invariata.
- Nessuna nuova dipendenza, nessun servizio esterno per le immagini; testi in italiano; file LF.
- Fuori ambito: ciclo viaggio utente (ST-UX-003A), chat di Alice, motore e testi della bozza (ST-UX-004A).

## Rischi
- Sovrapposizione di PaginaBozza con ST-UX-004A: modifiche in aggiunta e coordinate.
- Header compatto: raggiungibilita' e accessibilita' da tastiera del menu.
