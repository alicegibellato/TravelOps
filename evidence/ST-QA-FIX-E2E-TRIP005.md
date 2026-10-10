# Prove di consegna: ST-QA-FIX-E2E-TRIP005 (TB-TRIP-005 stabile nella suite completa)

## Cosa è stato chiesto

REQ-E2E-001-R2: il caso TB-TRIP-005 «Ripristina i viaggi demo non tocca i viaggi dell'utente» passa da solo (8/8) ma nella suite completa `npm run e2e` falliva al passo «I viaggi dell'utente sono identici a prima». Trovare la causa e correggerla nell'infrastruttura di prova, senza riprovare alla cieca.

## Cosa è stato fatto

| Punto | Dove | Come |
|---|---|---|
| Causa | `riproduzione.log` | Non c'è stato condiviso: ogni flusso avvia la sua app, su una porta libera e con una cartella dati nuova, e i file girano in sequenza. Il testo di `/viaggi/<id>` letto «prima» non aveva i controlli della mappa (zoom, attribuzione di Leaflet), quello letto «dopo» sì. La mappa carica Leaflet con un import dinamico dopo l'idratazione, quindi sotto il carico della suite completa la lettura cade prima che la mappa sia disegnata. Il ripristino dei viaggi demo non tocca i viaggi dell'utente: nessun difetto dell'app. |
| Correzione | `apps/web/e2e/supporto.ts`, `apps/web/e2e/qa001c-viaggi-versioni.e2e.ts` | Nuovo `attendiMappe(pagina)`: attende che ogni sezione mappa sia disegnata (o dichiarata vuota); il caso lo usa prima di leggere la bozza e il viaggio confermato. |
| Rafforzamento | `apps/web/e2e/supporto.ts` | L'attesa di avvio dell'app usa una richiesta con limite di 3 s (prima poteva restare appesa fino al timeout del test) e l'arresto dell'app passa a SIGKILL dopo 10 s se non si ferma da solo. |

Nessuna nuova dipendenza, nessun codice dell'app toccato.

## Verifica

| Prova | Comando | Esito |
|---|---|---|
| Riproduzione su main | `npm run e2e` | 2 falliti su 122: TB-TRIP-005 (come segnalato) e obs001a (axe, una volta sola); log in `ST-QA-FIX-E2E-TRIP005/riproduzione.log` |
| File del caso | `cd apps/web && npx vitest run -c vitest.e2e.config.ts e2e/qa001c-viaggi-versioni` | 8 passati su 8 (`test-fix.log`) |
| Suite completa, giro 1 | `npm run e2e` su copia con la correzione | 27 file, 122 passati, 4 saltati, 0 falliti (`e2e-completo-1.log`) |
| Suite completa, giro 2 | `npm run e2e` su copia con la correzione | 27 file, 122 passati, 4 saltati, 0 falliti (`e2e-completo-2.log`) |
| Tipi | `cd apps/web && npx tsc --noEmit -p tsconfig.json` | nessun errore (`tsc.log`) |

## Limiti

Negli altri giri completi, prima della correzione finale, sono comparsi flaky con cause diverse e in altri file: TB-TODAY-002 (`qa001e-oggi-imprevisti`: il percorso guidato ripristina il passo salvato in sessione dopo l'idratazione), TB-TODAY-003 (`qa001c-oggi-monitoraggio`: timeout di 120 s) e obs001a (axe `document-title`, comparso una volta). Non sono nel perimetro di questa story. Il caso TB-TRIP-005 va rieseguito nel collaudo.
