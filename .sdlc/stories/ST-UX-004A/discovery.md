# ST-UX-004A Discovery

## Problema
Dal collaudo da utente del 10/10 (PC3, su main): le bozze mettono in fila attivita' dello stesso tipo ("Panorama da...") e propongono tragitti lunghi tra attivita' di valore simile; l'avviso "Da sapere" ripete note uguali; le revisioni compaiono come B1...Bn tecnici; le spiegazioni delle ripianificazioni sono lunghe e con codici interni; un ritardo senza effetto genera comunque una proposta con "Accetta".

## Vincoli
- Soglie (max attivita' dello stesso tipo, tragitto massimo) e testi in configurazione, non nel codice.
- Nessuna nuova dipendenza; testi in italiano; file LF.
- Fuori ambito: ciclo viaggio utente (ST-UX-003A), chat di Alice, interfaccia (ST-UX-004B).

## Rischi
- Un vincolo di varieta' troppo rigido puo' lasciare giorni scoperti: serve un ripiego che rilassa la soglia.
- Le etichette delle revisioni devono restare stabili per i test e le proposte gia' salvate.
