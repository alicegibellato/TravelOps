# Prove di consegna: ST-CAT-002

## Cosa è stato chiesto

REQ-CAT-002 "Destinazioni reali e istantanee" (ondata 2, CR-001 §9.5b), story `ST-CAT-002` "Costruzione reale delle destinazioni e destinazioni precaricate", sopra l'interfaccia già su main (ST-CAT-002A, `@travelops/sources`):

1. la realizzazione **reale** della sorgente di destinazioni secondo il contratto `CreaSorgenteReale`: ricerca con Nominatim (al massimo 1 richiesta al secondo, User-Agent identificativo, cache), luoghi con Overpass entro circa 60 minuti dal centro (query limitata all'area), classificazione con REQ-CAT-001, selezione per stile (prima Wikipedia/Wikidata, poi orari verificati, poi più vicine) fino a 120 attività, descrizioni da Wikipedia/Wikivoyage (it, altrimenti en), immagini da Wikimedia Commons con licenza e autore, tempi a piedi e in auto con OSRM, mezzi pubblici come stima dichiarata (auto × 1,5 + 10 minuti), controllo dei minimi, istantanea; per una destinazione troppo piccola un messaggio gentile con 2–3 destinazioni vicine più grandi;
2. le **3 istantanee precaricate** della §8.1 (Lago di Garda – Riva del Garda e dintorni, Roma, Dolomiti – Val di Fassa) costruite con la sorgente reale, con le **risposte registrate** delle fonti che le ricostruiscono identiche senza rete;
3. test automatici di CA-1, CA-2, CA-4, CA-5, CA-6, CA-7, senza rete.

## Perimetro ed esclusioni

- **Comprende:**
  - `creaSorgenteReale` (ricerca, costruzione con avanzamento, destinazioni già costruite immediate, `istantaneeNote`), la costruzione in 7 passi (`costruisciDaFonti`), il ritmo per servizio con l'orologio ricevuto (`Ritmo`);
  - il cliente HTTP reale `creaClienteHttp` (`fetch` di Node.js 22, User-Agent, cache in memoria e su disco, tempo massimo) e il registratore `creaClienteRegistratore`;
  - la tabella delle 3 destinazioni precaricate (`DESTINAZIONI_PRECARICATE`) e lo script `npm run istantanee --workspace @travelops/sources` che le costruisce con la rete, riduce le risposte a ciò che serve e verifica la ricostruzione senza rete prima di scrivere;
  - le 3 istantanee in `packages/sources/snapshots/` e le registrazioni in `packages/sources/registrazioni/precaricate.json`;
  - i test dei criteri e delle regole della costruzione; README del pacchetto aggiornato.
- **Esclude** (di altre storie o del collaudo):
  - CA-3 (bozze del generatore sulle 3 istantanee): ST-PLAN-001;
  - CA-8 (Lisbona in meno di 60 secondi): collaudo; qui solo una prova manuale, vedi sotto;
  - Sorprendimi e `candidates.json`, la riscrittura AI della descrizione breve, ricerca con suggerimenti e attribuzioni nella web app (ST-CAT-002C).
- **Lasciato fuori di proposito:**
  - nessun file in `packages/engine` e in `apps/web`: la web app carica già le istantanee della cartella al primo avvio (ST-CAT-002A) e i suoi test restano verdi con le 3 nuove;
  - nessuna dipendenza nuova (`npm audit`: 0 vulnerabilità); il `package.json` della radice non cambia (lo script sta nel pacchetto).
- **Deviazioni e interpretazioni:**
  - **60 attività per istantanea, entro il massimo di 120.** Con 120 attività le coppie usabili erano circa 9 200 e i tempi 19 000–23 000 (2–2,4 MB per istantanea): il primo avvio della web app rallentava al punto da far scadere un test esistente di REQ-UX-001 (`apps/web/test/ux001-ca6-codici.test.tsx`, 5,8 s su 5 s; senza le istantanee passa). Con 60 (`ATTIVITA_SCELTE`) le istantanee sono di 0,7–0,9 MB, circa 2 850 coppie, e servono metà delle richieste a OSRM. Il massimo di 120 resta (`MASSIMO_ATTIVITA`); alzare la soglia è una riga.
  - **Fascia degli alloggi calcolata in `packages/sources`.** La classificazione del motore (`classificaLuogoOsm`) mette `costoIndicativo` solo ai luoghi con regola di prezzo (i ristoranti), mai agli alloggi; senza fascia il minimo "2 alloggi di fascia diversa" non si può rispettare. `fasciaAlloggio` la ricava dai tag (`hostel`/`motel` e fino a 2 stelle `€`, 3 stelle `€€`, 4–5 stelle `€€€`, `guest_house` `€`, albergo senza stelle `€€`). Da valutare se spostarla nella tabella del motore (ST-CAT-001).
  - **"Circa 60 minuti" = 25 km** dal centro per le attività (riquadro Overpass, più veloce di `around`), 4 km per ristoranti, alloggi e farmacie (ristoranti vegetariani e senza glutine nei 25 km), 50 km per stazione, aeroporto e località vicine (CA-5).
  - **Zone:** due per destinazione, `<ID>_CENTRO` (entro 4 km) e `<ID>_DINTORNI`.
  - **Wikidata non è interrogato:** le descrizioni vengono dal tag `wikipedia`/`wikivoyage` del luogo (con i collegamenti tra lingue per arrivare all'italiano o all'inglese). Wikidata conta solo nella preferenza della scelta; per risolvere un luogo con il solo `wikidata` servirebbe un servizio in più, fuori dall'elenco `SERVIZI_FONTE`. Wikivoyage ha voci per destinazioni, raramente per singoli luoghi: in pratica le descrizioni sono di Wikipedia.
  - **Tempi a piedi solo fino a 90 minuti** (oltre non sono un'opzione sensata); in auto sempre; senza percorso OSRM, stima in linea d'aria marcata `stima` (nelle 3 istantanee non è mai servita).
  - **Stili scarsi dichiarati in automatico:** uno stile con meno di 2 attività finisce in `stiliScarsi` con il motivo; gli altri minimi mancanti danno `minimi_non_rispettati` (CA-5), controllati già dopo la scelta dei luoghi così una destinazione piccola non consuma Wikipedia, Commons e OSRM.
  - **Ospedale:** il luogo `amenity=hospital` più vicino, che può essere una casa di cura o un posto di soccorso (Garda: "Casa di cura Eremo"; Val di Fassa: "Posto di Soccorso").
  - Nel test CA-7 di ST-CAT-002A il controllo "nessun `fetch` nel codice" ora ammette un solo file, `src/cliente-http.ts`, il cliente reale dietro `ClienteFonti`.

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Sorgente reale: ricerca Nominatim con ritmo e cache, costruzione, destinazioni note | `packages/sources/src/reale.ts` (nuovo) |
| Costruzione in 7 passi (Overpass, classificazione e scelta, ristoranti e servizi, descrizioni, immagini, OSRM, minimi e alternative), `Ritmo` | `packages/sources/src/costruzione.ts` (nuovo) |
| Cliente HTTP reale e registratore | `packages/sources/src/cliente-http.ts` (nuovo) |
| Le 3 destinazioni precaricate | `packages/sources/src/precaricate.ts` (nuovo) |
| Esportazioni; `adattoAlPasto` esportata dai minimi | `packages/sources/src/index.ts`, `packages/sources/src/minimi.ts` |
| Script che costruisce le istantanee e le registrazioni | `packages/sources/scripts/costruisci-precaricate.ts` (nuovo), `packages/sources/package.json` (script `istantanee`) |
| Istantanee precaricate | `packages/sources/snapshots/garda-2026-10-09.json`, `roma-2026-10-09.json`, `dolomiti-val-di-fassa-2026-10-09.json` |
| Risposte registrate delle fonti (ridotte) e ricerche | `packages/sources/registrazioni/precaricate.json` |
| Test | `packages/sources/test/ca1-precaricate.test.ts`, `ca2-ca6-precaricate.test.ts`, `ca4-nominatim-ritmo.test.ts`, `ca5-destinazione-piccola.test.ts`, `costruzione.test.ts` (nuovi); `ca7-rete.test.ts`, `cartella.test.ts` (aggiornati) |
| Documentazione | `packages/sources/README.md`, `packages/sources/snapshots/README.md` |
| Cache locale delle fonti ignorata da git | `.gitignore` |
| Prove di consegna | `evidence/ST-CAT-002.md` |

## Perché

- **Una sola query Overpass per destinazione**, con un riquadro e un massimo di risultati per gruppo (musei con Wikidata, panorami, parchi, spiagge, cantine, impianti, sentieri, ristoranti, alloggi, farmacie, ospedali, stazioni, aeroporti): uso moderato e risposta limitata anche per Roma. Un server occupato (errore o `remark` di tempo scaduto, cioè risultati parziali) fa passare al successivo di `SERVER_OVERPASS`, mai due volte lo stesso: così ogni richiesta ha una sola risposta e la registrazione resta deterministica.
- **Scelta a turno tra i 7 stili**, ciascuno con la sua preferita non ancora scelta: nessuno stile resta senza attività se le fonti ne hanno, e l'ordine di preferenza della richiesta (Wikipedia/Wikidata, orari verificati, vicinanza, poi id) decide dentro ogni stile.
- **Ritmo con l'orologio ricevuto** (`Ritmo`): le richieste a Nominatim sono servite una alla volta, ad almeno 1000 ms l'una dall'altra; lo stesso ritmo (1 al secondo) vale per Overpass, Wikipedia, Wikivoyage, Commons e OSRM (uso leggero). Con l'orologio finto il test lo misura senza aspettare.
- **Registrazioni piccole e sufficienti:** lo script tiene di Overpass solo i luoghi finiti nelle istantanee e solo i tag letti (`TAG_USATI`, scartati anche dalla costruzione), di OSRM solo le durate, di Wikipedia e Commons solo titoli, estratti, immagini e metadati di licenza. La scelta è "il migliore che rispetta la condizione" a ogni passo, quindi dai soli luoghi scelti esce la stessa scelta; lo script lo verifica ricostruendo senza rete prima di scrivere, e CA-1 lo verifica in ogni esecuzione dei test. 36 risposte, 332 KB.
- **Immagini solo con autore e licenza:** dai metadati di Commons (`Artist`, `LicenseShortName`, `LicenseUrl`, escluse quelle non libere); il percorso è la miniatura di 800 px senza parametri di tracciamento; l'attribuzione completa va anche nel luogo.
- **Descrizioni con la fonte:** la prima frase dell'estratto (o le prime due se la prima è corta), senza parentesi, al massimo 300 caratteri; `fonteDescrizione` del luogo cita servizio, lingua, voce, licenza e indirizzo.

### Le 3 istantanee (data di creazione 2026-10-09)

| Istantanea | Area | Attività (non pasti) | Per stile (relax, cultura, natura, avventura, gastronomia, romantico, famiglia) | Ristoranti (pranzo / cena / vegetariani / senza glutine) | Alloggi (fasce) | Servizi | Coppie / tempi | Stili scarsi |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `garda-2026-10-09` | `osm:relation/46276` Riva del Garda | 60 | 15, 10, 36, 13, 11, 22, 15 | 12 (11 / 12 / 4 / 1) | 4 (3) | farmacia, ospedale, stazione di Mori | 2 854 / 6 383 | nessuno |
| `roma-2026-10-09` | `osm:relation/41485` Roma | 60 | 25, 9, 39, 9, 12, 17, 25 | 12 (9 / 12 / 2 / 3) | 4 (3) | farmacia, ospedale, Roma Termini, Ciampino | 2 858 / 7 608 | nessuno |
| `dolomiti-val-di-fassa-2026-10-09` | `osm:way/338438408` Val di Fassa | 60 | 0, 10, 40, 25, 10, 25, 0 | 12 (10 / 11 / 3 / 1) | 4 (3) | farmacia, ospedale, stazione di Ponte Gardena, aeroporto di Bolzano | 2 858 / 5 892 | `relax`, `famiglia` (nessun parco con nome o spiaggia nei dati OSM entro 25 km) |

Descrizioni e immagini: Garda 5 e 5, Roma 38 e 38, Val di Fassa 6 e 6 (poche voci Wikipedia nei tag dei luoghi di montagna e del lago). Tempi a piedi: 675, 1 892, 176; nessun tempo in auto stimato.

### Fonti durante la costruzione

- **Overpass:** `overpass-api.de` ha risposto più volte "server occupato" (timeout del dispatcher) e una volta con risultati parziali ("Query timed out" sulla riga delle stazioni, query poi resa più leggera: solo nodi per le stazioni, `timeout:90`); le istantanee vengono da `overpass.private.coffee` (dati OSM del 28-07-2026) e, per un tentativo, tutti e tre i server non hanno risposto (lo script riprova dopo 30 s).
- **Nominatim, Wikipedia, Commons, OSRM** (`router.project-osrm.org` in auto, `routing.openstreetmap.de` a piedi): nessun problema. Commons ora restituisce le miniature da `thumb.wikimedia.org` con parametri `utm_…`, tolti.

## Verifica

Comandi eseguiti dalla radice della copia di lavoro (`C:\Users\a.gibellato\TravelOps-wt\ST-CAT-002`, Node.js 22.22.2) con `CI=true`: `npm ci`, `npm run build` (verde), `npm test` (verde: motore 573 test in 30 file, `@travelops/sources` 87 test in 11 file, web 314 test in 43 file), `npm audit` (0 vulnerabilità). Le istantanee: `npm run istantanee --workspace @travelops/sources` (con la rete, verifica interna della ricostruzione senza rete superata).

| Criterio | Test | Esito |
| --- | --- | --- |
| CA-1 costruzione dalle risposte registrate = istantanee del repository | `packages/sources/test/ca1-precaricate.test.ts`: per Garda, Roma e Val di Fassa ricerca + costruzione con `creaSorgenteReale` e `creaClienteRegistrato(registrazioni/precaricate.json)`, orologio finto, `fetch` bloccato → uguale al file; la cartella ha esattamente le 3 istantanee; la sorgente registrata dai file le ritrova; seconda costruzione e `istantaneeNote` immediate | superato (6 test) |
| CA-2 minimi §8.1 | `test/ca2-ca6-precaricate.test.ts` (minimi senza mancanze, conteggi, stili scarsi solo se dichiarati, tempo in auto e mezzi pubblici stimati per ogni coppia usabile); `test/cartella.test.ts` (ogni file valido con i minimi) | superato |
| CA-3 bozze del generatore | fuori da questa storia (ST-PLAN-001) | non applicabile |
| CA-4 1 richiesta al secondo verso Nominatim, orologio finto | `test/ca4-nominatim-ritmo.test.ts`: 5 ricerche (3 in parallelo) a 1000 ms l'una dall'altra, nessuna attesa dopo una pausa, cache per testo normalizzato, richiesta canonica, User-Agent obbligatorio e inviato dal cliente HTTP (con `fetch` sostituito) | superato (5 test) |
| CA-5 destinazione piccola: messaggio gentile e 2–3 vicine più grandi | `test/ca5-destinazione-piccola.test.ts`: borgo inventato → `minimi_non_rispettati`, messaggio "Mi dispiace, per Borgo Piccolo ho trovato troppo pochi luoghi…", 3 località più grandi dalla più vicina, solo 2 richieste (Overpass); Overpass muto → `non_disponibile` | superato (2 test) |
| CA-6 origine osm e id OSM, immagini con licenza e autore | `test/ca2-ca6-precaricate.test.ts` sulle 3 istantanee (luoghi `osm` con `osmId` e id coerente, attribuzione OSM tra le fonti, immagini con autore, licenza e percorso Wikimedia, fonte di ogni descrizione); il lettore lo controlla anche al caricamento | superato |
| CA-7 nessuna rete nei test | `test/ca7-rete.test.ts`: con `fetch`, socket, HTTP e DNS bloccati la sorgente reale costruisce Garda dalle registrazioni senza tentativi di rete; l'unico `fetch` del codice è in `src/cliente-http.ts`; CA-1 e CA-4 girano con `fetch` sostituito | superato |
| CA-8 Lisbona < 60 s con la rete | collaudo. Prova manuale (`npm run istantanee --workspace @travelops/sources -- --prova Lisbona`, area `osm:relation/5400890`): con 60 attività e cache vuota **67,9 s**, minimi rispettati (60 attività, 2 858 coppie, nessuna senza tempo); con le risposte di Nominatim e Overpass già in cache 29,2 s; la prima prova con 120 attività 100,7 s. Il tempo dipende soprattutto da Overpass (20–50 s, di più quando il primo server è occupato) e dal ritmo di 1 richiesta al secondo verso OSRM, Wikipedia e Commons | **non ancora rispettato** nella prova (67,9 s > 60 s): da verificare nel collaudo |

## Collegamenti

- Requisito: `docs/requirements/REQ-CAT-002-destinazioni-reali.md` (REQ-CAT-002)
- Story: ST-CAT-002
- Contratto: contract-ST-CAT-002-implementation-r2
- Autorizzazione: AUT-PR-CAT-002-R2
- Branch: feature/ST-CAT-002
