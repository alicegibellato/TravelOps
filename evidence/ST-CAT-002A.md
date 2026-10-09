# Prove di consegna: ST-CAT-002A

## Cosa è stato chiesto

La prima parte di REQ-CAT-002 "Destinazioni reali e istantanee" (ondata 2, CR-001 §9.5b): l'interfaccia su cui si appoggiano la costruzione reale delle destinazioni (ST-CAT-002) e la parte web (ST-CAT-002C). Story `ST-CAT-002A` "Istantanee delle destinazioni: formato, minimi, sorgente registrata", con questi criteri:

1. pacchetto `packages/sources` (`@travelops/sources`, nuovo workspace npm) con l'interfaccia unica "sorgente di destinazioni" e la realizzazione **registrata**, che legge istantanee e risposte salvate dal repository; della realizzazione reale solo il contratto;
2. formato dell'istantanea (`modello-dominio-estensioni.md` §7.8) con lettore validato e controllo dei minimi di `dati-di-riferimento-estensioni.md` §8.1 (CA-2), con messaggi chiari quando mancano;
3. ogni luogo con origine `osm` e identificativo OpenStreetMap, ogni immagine con licenza e autore, verificati dal lettore (CA-6);
4. il primo avvio della web app carica nel database le istantanee presenti nel repository, con lo strato di REQ-DATA-001; senza istantanee non succede niente;
5. nessuna chiamata di rete nei test (CA-7).

## Perimetro ed esclusioni

- **Comprende:**
  - il formato dell'istantanea, versione 1, come estensione dichiarata di `IstantaneaCatalogo` del motore (area della ricerca, stili dichiarati scarsi, autore e licenza delle immagini, tempi marcati come stima);
  - il lettore validato `leggiIstantanea`, che usa `caricaCatalogoEsteso` del motore per il catalogo e aggiunge i controlli propri, di CA-6 e dei tempi;
  - il controllo dei minimi `controllaMinimi`, con un codice e un messaggio in italiano per ogni mancanza;
  - l'interfaccia `SorgenteDestinazioni`, la realizzazione registrata (ricerca, costruzione con avanzamento, lettura ed elenco delle istantanee) e il cliente registrato delle risposte HTTP salvate;
  - il contratto della realizzazione reale: `CreaSorgenteReale`, `OpzioniSorgenteReale`, `ClienteFonti`, `Orologio`, `RichiestaFonte`, `RispostaFonte`;
  - la cartella `packages/sources/snapshots/` (oggi senza istantanee) e la sua lettura validata;
  - il caricamento delle istantanee del repository al primo avvio della web app;
  - un'istantanea di prova piccola ma valida, marcata come dato di test, e i test di tutti i criteri.
- **Esclude** (di altre storie):
  - la realizzazione reale con Nominatim, Overpass, Wikipedia e Wikivoyage, Wikimedia Commons e OSRM, il limite di 1 richiesta al secondo (CA-4), il messaggio con le destinazioni vicine reali (CA-5), le 3 istantanee precaricate (CA-1, CA-3), `candidates.json` e Sorprendimi, il collaudo di Lisbona (CA-8): ST-CAT-002;
  - ricerca con suggerimenti, avanzamento, attribuzioni e Sorprendimi nella web app: ST-CAT-002C.
- **Lasciato fuori di proposito:**
  - nessun file in `packages/engine`: i tipi in più (area, immagine con autore e licenza, tempo stimato, stili scarsi) sono definiti in `packages/sources/src/formato.ts` come estensioni dei tipi del motore;
  - nessuna dipendenza esterna nuova (`npm audit`: 0 vulnerabilità).
- **Deviazioni:**
  - `@travelops/sources` **non è dichiarato** tra le dipendenze di `apps/web/package.json`, anche se la web app lo usa: il test CA-9 di REQ-WEB-002 (`apps/web/test/web002-ca9-motore.test.ts`) elenca le sole dipendenze ammesse e fallisce con una voce in più, e i test di altri moduli non sono di questa storia. La web app lo risolve dal collegamento del workspace nella radice (npm workspaces), quindi build e test funzionano; il punto è annotato nel codice (`apps/web/src/stato/istantanee.ts`). Da fare quando si aggiorna quel test: aggiungere `"@travelops/sources": "0.1.0"` alle dipendenze della web app e alla lista del test.
  - il caricamento avviene, come chiesto, solo al **primo avvio**: un database locale creato prima di ST-CAT-002 non riceverà le 3 istantanee precaricate finché non si ricrea (`apps/web/.data`). Se serve, ST-CAT-002 può caricarle anche agli avvii successivi con la stessa funzione, che è idempotente.

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Nuovo workspace `@travelops/sources` (dipende solo da `@travelops/engine`; punti d'ingresso `.` e `./pacchetto`) | `packages/sources/package.json`, `packages/sources/tsconfig.json`, `packages/sources/vitest.config.ts` |
| Formato dell'istantanea (tipi, versione, attribuzione OSM, riepilogo) | `packages/sources/src/formato.ts` |
| Lettore validato, errori `ProblemaIstantanea` / `ErroreIstantanea`, validazione di un'area | `packages/sources/src/lettore.ts` |
| Controllo dei minimi della §8.1 e coppie usabili | `packages/sources/src/minimi.ts` |
| Interfaccia `SorgenteDestinazioni`, passi e messaggi di avanzamento, contratto della sorgente reale | `packages/sources/src/sorgente.ts` |
| Realizzazione registrata, file di registrazioni, cliente registrato | `packages/sources/src/registrata.ts` |
| Lettura validata di una cartella di istantanee | `packages/sources/src/cartella.ts` |
| Posizione di `snapshots/` nel pacchetto, solo Node.js (fuori dal punto d'ingresso principale per Turbopack) | `packages/sources/src/pacchetto.ts` |
| Punto d'ingresso | `packages/sources/src/index.ts` |
| Documentazione del pacchetto (formato, minimi, interfaccia, contratto) | `packages/sources/README.md` |
| Cartella delle istantanee precaricate (vuota, con le regole) | `packages/sources/snapshots/README.md` |
| Istantanea di prova (dato di test) e registrazioni di prova | `packages/sources/test/dati/prova-dato-di-test.json`, `packages/sources/test/dati/registrazioni-di-prova.json` |
| Test del pacchetto | `packages/sources/test/*.test.ts`, `packages/sources/test/supporto.ts` |
| Caricamento delle istantanee del repository nel database | `apps/web/src/stato/istantanee.ts` (nuovo) |
| Il primo avvio lo esegue (una riga e un parametro facoltativo) | `apps/web/src/stato/avvio.ts` |
| Alias dei test verso i sorgenti di `@travelops/sources` | `apps/web/vitest.config.ts` |
| Test del primo avvio con le istantanee | `apps/web/test/cat002a-istantanee-primo-avvio.test.ts` |
| Workspace nel lockfile | `package-lock.json` |
| Prove di consegna | `evidence/ST-CAT-002A.md` |

Il `package.json` della radice non è cambiato: il glob `packages/*` include già il nuovo workspace, e `npm run build` lo compila dopo il motore e prima della web app.

## Perché

- **Il formato estende il motore senza cambiarlo.** `IstantaneaDestinazione` è assegnabile a `IstantaneaCatalogo` (lo verifica `comeIstantaneaCatalogo` a tempo di compilazione) e il suo catalogo si carica con `caricaCatalogoEsteso`: il motore la usa come un catalogo normale (§7.8). Le regole del catalogo restano nel motore; il lettore riporta i suoi errori così come sono e aggiunge solo i controlli dell'istantanea.
- **Autore e licenza separati.** Il motore ha per l'immagine solo `attribuzione`; CA-6 chiede licenza e autore verificabili, quindi sono due campi obbligatori in più, accanto all'attribuzione completa.
- **Mezzi pubblici sempre "stima".** REQ-CAT-002 vuole i tempi dei mezzi pubblici stimati e dichiarati come tali (orari reali fuori perimetro): il lettore rifiuta un tempo con i mezzi pubblici senza `"stima": true`.
- **Interpretazioni dei minimi (§8.1),** scritte nel codice e nel README:
  - "attività" = categoria diversa da `pasto` e `servizio` (quelle che il generatore sceglie);
  - "ristoranti adatti a pranzo e cena" = almeno 3 aperti a pranzo e almeno 3 aperti a cena (fascia di almeno 60 minuti dentro 12:00–15:00 o 19:00–22:30 in almeno un giorno, o sempre aperti);
  - "senza glutine, se esiste nei dati" = solo un avviso, perché l'istantanea non può sapere che cosa c'era nelle fonti;
  - "alloggi di fascia diversa" = almeno due valori diversi di `costoIndicativo` tra gli alloggi;
  - "coppie che il generatore può usare" = tutte le coppie tra luoghi con attività non di servizio (ristoranti compresi) e alloggi, più ogni alloggio con stazioni e aeroporti; basta un tempo con un mezzo qualsiasi. Se REQ-PLAN-001 userà meno coppie, la regola sta in una sola funzione (`coppieUsabili`).
- **`area` nell'istantanea.** La sorgente costruisce un'istantanea a partire da un'area della ricerca: salvarla permette alla sorgente registrata di ritrovare l'istantanea dall'area (e una destinazione già vista è immediata).
- **Errori raccolti, mai eccezioni nel lettore.** Come i caricatori del motore, `leggiIstantanea` restituisce tutti i problemi in una volta; per i file del repository `leggiCartellaIstantanee` solleva un errore unico con i problemi file per file, e il nome del file deve essere `<id>.json` (niente doppioni).
- **Primo avvio in transazione.** Il caricamento usa `salvaIstantanea` di DATA-001 dentro la transazione del primo avvio: un'istantanea non valida nel repository blocca il primo avvio con un messaggio chiaro e non lascia nulla a metà. Il contenuto salvato è l'istantanea letta e validata da `@travelops/sources`.
- **Cartella del repository nella web app.** La web app calcola `packages/sources/snapshots` dalla sua cartella di lavoro, come fa già per `.data`: Turbopack prova a risolvere `new URL(…, import.meta.url)` come file (la build falliva), quindi la posizione ricavata dal modulo sta in un punto d'ingresso a parte (`@travelops/sources/pacchetto`) usato solo da Node.js. Un test verifica che le due strade danno la stessa cartella.
- **Istantanea di prova.** "Borgo di Prova" è inventato, marcato come dato di test nel nome della destinazione, nell'area e nei nomi dei luoghi; sta in `packages/sources/test/dati/`, non in `snapshots/`, quindi la web app non lo carica mai. È la più piccola istantanea che rispetta tutti i minimi (15 luoghi, 15 attività più 3 pasti, 68 coppie usabili, 124 tempi).

## Verifica

Comandi eseguiti dalla radice della copia di lavoro (`C:\Users\a.gibellato\TravelOps-wt\ST-CAT-002A`, Node.js 22.22.2, npm 10.9.7): `npm ci`, `npm install` (solo per collegare il nuovo workspace nel lockfile), `npm run build`, `npm test`, `npm run typecheck --workspace @travelops/web`, `npm audit`.

| Comando | Esito |
| --- | --- |
| `npm run build` | verde: motore, `@travelops/sources` (tsc) e web app (Next.js, 81 pagine) |
| `npm test` | verde: motore 26 file / 508 test, `@travelops/sources` 6 file / 56 test, web app 22 file / 156 test (7 nuovi) |
| `npm run typecheck --workspace @travelops/web` | verde |
| `npm audit` | 0 vulnerabilità |

| Criterio | Test | Esito |
| --- | --- | --- |
| 1. Pacchetto `@travelops/sources` con interfaccia unica e realizzazione registrata (istantanee e risposte salvate); contratto della reale | `packages/sources/test/sorgente-registrata.test.ts` (16 test: ricerca registrata e per area, annullamento, costruzione con avanzamento uguale all'istantanea del repository, `non_disponibile`, più recente tra più istantanee, `minimi_non_rispettati` con alternative, copie, file di registrazioni, cliente registrato, contratto `CreaSorgenteReale` con orologio finto) | passato |
| 2. Formato §7.8 con lettore validato | `packages/sources/test/formato.test.ts` (12 test), `packages/sources/test/cartella.test.ts` (5 test) | passato |
| 2. Minimi §8.1 (CA-2) con messaggi chiari | `packages/sources/test/ca2-minimi.test.ts` (13 test, uno per ogni minimo più conteggi, stile dichiarato, coppie usabili, rifiuto del lettore, determinismo); in `cartella.test.ts` ogni istantanea di `snapshots/` deve rispettarli | passato |
| 3. Origine `osm` e identificativo OSM di ogni luogo, licenza e autore di ogni immagine (CA-6) | `packages/sources/test/ca6-origine-attribuzioni.test.ts` (7 test) | passato |
| 4. Primo avvio carica le istantanee del repository con lo strato di DATA-001; senza istantanee niente | `apps/web/test/cat002a-istantanee-primo-avvio.test.ts` (7 test: cartella del repository, caricamento dell'istantanea di prova, cartella vuota o assente, primo avvio vero su `packages/sources/snapshots`, solo al primo avvio, idempotenza, istantanea non valida in transazione) | passato |
| 5. Nessuna chiamata di rete nei test (CA-7) | `packages/sources/test/ca7-rete.test.ts` (3 test: `fetch`, socket, `http`/`https`, DNS bloccati durante lettura, minimi, cartella e sorgente registrata; nessun modulo di rete nel codice del pacchetto) | passato |
| Nessuna regressione (motore, DATA-001, WEB-001/002) | suite esistenti invariate | passato |

## Collegamenti

- Requisito: [REQ-CAT-002](../docs/requirements/REQ-CAT-002-destinazioni-reali.md)
- Story: `ST-CAT-002A`
- Contratto: `contract-ST-CAT-002A-implementation`
- Profilo di esecuzione: `AUT-PR-CAT-002A`
- Branch: `feature/ST-CAT-002A`
