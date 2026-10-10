# ST-UX-003B Criteri e aree

## Criteri e impatto
| Criterio | Area | Effetto |
|---|---|---|
| CB-1 riepilogo compatto, bozza senza scroll a 1280x800 | A | /pianifica: chip modificabili, layout affiancato su desktop |
| CB-2 destinazioni pronte con proporzioni e testo leggibili | A | card con rapporto fisso e testo sul token base |
| CB-3 menu azioni, niente pannello tecnico, spostamenti compatti | B | /bozza: menu "..." per attivita' e per giorno; spostamenti <=15 min in linea |
| CB-4 titoli puliti, immagine per ogni viaggio/luogo | A | componente IllustrazioneLuogo (asset locali o CSS/SVG, configurabile) |
| CB-5 un solo controllo di chiusura festa | B | conferma: un'unica azione |
| CB-6 gerarchia Demo e Oggi | A | titolo, momento attuale in evidenza, immagini dei luoghi |
| CB-7 micro-interazioni e stati, accessibilita' | A+B | stati vuoto/caricamento/errore; contrasto verificato |
| CB-8 test e screenshot | A+B | e2e `ux003b-*` a 375 e 1280px |

## Parallelismo
- Area A: /pianifica, home, destinazioni, Oggi, Demo, IllustrazioneLuogo (CB-1, 2, 4, 6).
- Area B: menu azioni /bozza, connettori spostamenti, festa di conferma (CB-3, 5).
- CB-7 e CB-8 trasversali: ogni area porta i propri stati e test.
- Unico punto condiviso: IllustrazioneLuogo, posseduto da A; B lo consuma solo se serve, senza modificarlo.

## Assunzioni
- Le illustrazioni sono generate da CSS/SVG a partire da una configurazione (tipo luogo, tinta), senza rete.
- La soglia "spostamento breve" (15 min) e' un valore di configurazione, non hardcoded.
